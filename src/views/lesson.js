// Lecteur de leçon (façon Duolingo) : une consigne à la fois, « Vérifier », retour vert / rouge avec l'explication,
// les erreurs reviennent en fin de leçon, cœurs pour les contrôles et les tests de saut, écran de fin avec XP.
import { keyLabel, fmtKeys } from '../keyboard.js';
import { el, modal, confetti, showBadges, toast } from '../ui.js';
import { getState, update, recordExercise, trackLesson } from '../store.js';
import { bipReact, bipEnding } from '../learn/bip.js';
import { BOLT, CHEST_BOLTS, CHEST_XP } from '../core/challenges.js';
import { buildLesson, buildCheckpoint, buildJump, buildPractice, checkAnswer, completeNode, applyJump, addMisses, markPracticed, xpFor, courseOf, nodeStates, unitById, unitIndex, nodeById } from '../core/course.js';
import { UNITS } from '../data/course.js';
import { renderItem, typeLabel, midiBanner } from '../learn/exercises.js';
import { stopSpec, mascot, isMac } from '../learn/kit.js';
import { createJam, stopJam, sfx, JAM_LAYERS, JAM_MAX } from '../learn/jam.js';
import { viewKeys } from '../shortcuts.js';
import { dayKey } from '../core/progress.js';
import { transport } from '../core/audio.js';

const PRAISE = ['Excellent !', 'Bravo !', 'Parfait !', 'Bien joué !', 'Exactement !', 'Super !', 'Tu gères !'];
const OOPS = ['Pas tout à fait…', 'Presque !', 'Pas encore…'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Grands exercices : sur PC, la consigne et l'explication à gauche, l'exercice à droite
const WIDE = ['live', 'roll', 'grid', 'synth', 'keys', 'knob', 'velocity', 'tap'];
const twoCol = (it) => WIDE.includes(it.t) || (it.t === 'mcq' && !!(it.visual || it.play || it.plays || it.choices.some((c) => c?.visual))) || (it.t === 'number' && !!it.visual);
const HOWTO = {
  live: 'Clique la bonne zone dans la maquette de Live : elle s’allume. Puis « Vérifier ».',
  roll: 'Clique une case pour poser une note, re-clique pour l’effacer. Les touches à gauche font entendre chaque note.',
  grid: 'Clique les cases pour poser les coups. Écoute ton beat avant de vérifier.',
  synth: 'Glisse un potard vers le haut ou le bas (ou utilise la réglette), écoute, compare, recommence.',
  keys: 'Joue sur le clavier à l’écran, au clavier MIDI, ou avec les touches {KeyA} {KeyS} {KeyD} {KeyF}… de ton ordinateur ({KeyZ} / {KeyX} : octave).',
  knob: 'Glisse le potard vers le haut ou le bas, ou tourne un potard de ton contrôleur MIDI.',
  velocity: 'Plus tu touches haut sur le pad, plus c’est fort. Au clavier MIDI : la force de frappe.',
  tap: 'Lance, écoute le décompte, puis tape en rythme (pad, barre d’espace ou clavier MIDI).',
};
const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
const wideScreen = () => matchMedia('(min-width: 1000px)').matches;
const kbd = (...keys) => keys.map((k) => el('kbd', k));

/** Fait défiler un nombre de 0 à sa valeur (écran de fin). */
function countUp(node, to, fmt, { delay = 350, ms = 900 } = {}) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce' || to <= 0) { node.textContent = fmt(to); return; }
  node.textContent = fmt(0);
  const t0 = performance.now() + delay;
  const tick = (ts) => {
    if (!node.isConnected) return;
    const x = Math.max(0, Math.min(1, (ts - t0) / ms));
    node.textContent = fmt(Math.round(to * (1 - (1 - x) ** 3)));
    node.classList.toggle('counting', x > 0 && x < 1);
    if (x < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const mmss = (ms) => { const s = Math.round(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function makeRun(params) {
  const course = courseOf(getState());
  if (params.id) {
    const n = nodeById(params.id);
    if (!n) return { error: 'Leçon introuvable.' };
    const st = nodeStates(course).states[n.id];
    if (st === 'locked') return { error: 'Cette leçon est encore verrouillée : termine les étapes précédentes, ou passe le test pour sauter jusqu’à son unité.', unit: n.unit };
    return n.type === 'checkpoint' ? buildCheckpoint(n.unit) : buildLesson(n.id);
  }
  if (params.cp) return buildCheckpoint(params.cp);
  if (params.jump) return buildJump(course, params.jump);
  if (params.practice) return buildPractice(course) || { error: 'Termine au moins une leçon pour pouvoir t’entraîner.' };
  return { error: 'Leçon introuvable.' };
}

export function render(root, params = {}) {
  let run;
  try { run = makeRun(params); } catch (e) { console.error(e); run = { error: 'Leçon introuvable.' }; }
  if (run.error || !run.items?.length) {
    root.append(el('div.lesson-end',
      mascot('sad', 96), el('h1', 'Oups'), el('p', run.error || 'Rien à faire ici.'),
      el('div.row.gap.wrap.center',
        run.unit && unitIndex(run.unit) > 0 ? el('a.btn3d.primary', { href: `#/lesson?jump=${run.unit}` }, '⏩ Passer le test') : null,
        el('a.btn3d', { href: '#/learn' }, 'Retour au parcours'))));
    return;
  }

  const unit = run.unit || (run.node ? unitById(run.node.unit) : null);
  const queue = run.items.map((it) => ({ it, retry: false }));
  const total = queue.length;
  let pos = 0, settled = 0, hearts = run.hearts, graded = 0, correctFirst = 0, mistakes = 0, combo = 0, bestCombo = 0, answered = 0, skipped = 0;
  const misses = {};
  const t0 = Date.now();
  let cur = null, phase = 'answer', banner = null, wasWrong = false;

  // Le morceau de la leçon : une piste par bonne réponse
  const jamEl = el('div.lp-jam', { role: 'img' }, JAM_LAYERS.map((l) => el('i', { title: l.name }, l.emoji)));
  const paintJam = (n, dir = 0) => {
    [...jamEl.children].forEach((c, i) => { c.classList.toggle('on', i < n); c.classList.toggle('new', dir > 0 && i === n - 1); c.classList.toggle('lost', dir < 0 && i === n); });
    jamEl.setAttribute('aria-label', `Ton morceau : ${n} piste${n > 1 ? 's' : ''} sur ${JAM_MAX}`);
    jamEl.title = n ? `Ton morceau : ${JAM_LAYERS.slice(0, n).map((l) => l.name).join(' + ')}` : 'Chaque bonne réponse ajoute une piste à ton morceau';
  };
  const jam = createJam({ part: unit?.part || 1, onChange: paintJam });
  paintJam(0);

  const fill = el('div.lp-fill');
  const heartsEl = el('div.lp-hearts');
  const comboEl = el('div.lp-combo');
  const paintTop = () => {
    fill.style.width = `${Math.round((100 * settled) / total)}%`;
    if (hearts != null) heartsEl.replaceChildren(...[0, 1, 2].map((i) => el('span' + (i < hearts ? '.on' : ''), i < hearts ? '❤️' : '🖤')));
    comboEl.textContent = combo >= 3 ? `🔥 ${combo}` : '';
  };
  const top = el('div.lesson-top',
    el('button.lesson-x', { type: 'button', 'aria-label': 'Quitter la leçon', onclick: () => quit() }, '✕'),
    el('div.lp-bar', { role: 'progressbar', 'aria-label': 'Progression de la leçon' }, fill),
    jamEl,
    hearts != null ? heartsEl : comboEl);
  const body = el('div.lesson-body');
  const msg = el('div.lf-msg');
  const hint = el('div.lf-hint', { 'aria-hidden': 'true' });
  const skip = el('button.btn3d.ghost.lf-skip', { type: 'button', onclick: () => skipItem() }, 'Passer');
  const btn = el('button.btn3d.primary.lf-btn', { type: 'button', 'data-key': 'enter', onclick: () => (phase === 'answer' ? check() : next()) }, 'Vérifier');
  const foot = el('div.lesson-foot', el('div.lf-inner', msg, hint, el('div.lf-btns', skip, btn)));
  const title = run.kind === 'lesson' ? run.node.title : run.kind === 'checkpoint' ? `Contrôle · ${unit.title}` : run.kind === 'jump' ? `Test pour sauter à : ${unit.title}` : 'Entraînement';
  const shell = el('div.lsn', { style: unit ? { '--uc': unit.color } : null }, top, el('div.lsn-title', title), body, foot);
  root.append(shell);

  const SELF = ['pairs', 'tap', 'velocity'];
  // « Passer » seulement quand il faut du son, un clavier MIDI ou jouer en rythme (pas maintenant, dans le métro…)
  const canSkip = (it) => ['tap', 'velocity', 'knob', 'synth'].includes(it.t) || (it.t === 'grid' && it.ear)
    || (it.t === 'mcq' && !!(it.play || it.plays || it.choices.some((c) => c?.play)));
  function show() {
    cur?.destroy();
    banner?.destroy(); banner = null;
    stopSpec();
    stopJam();
    transport.stop();
    if (pos >= queue.length) { finish(); return; }
    const { it } = queue[pos];
    phase = 'answer';
    foot.className = 'lesson-foot';
    msg.replaceChildren();
    const api = { setReady: (b) => { if (phase === 'answer') btn.disabled = !b; }, submit: () => { if (phase === 'answer') check(); }, enter: () => { if (!btn.disabled) btn.click(); } };
    try { cur = renderItem(it, api); } catch (e) { console.error(e); pos++; settled++; show(); return; }
    const two = twoCol(it);
    banner = midiBanner(it);
    body.replaceChildren(el('div.ex.t-' + it.t + (queue[pos].retry ? '.retry' : '') + (two ? '.two' : '') + (it.t === 'card' && (it.visual || it.demo) ? '.cardsplit' : ''),
      el('div.ex-head', el('div.ex-headrow', el('span.ex-type', queue[pos].retry ? '🔁 On y revient' : typeLabel(it)),
        el('button.ex-report', { type: 'button', title: 'Signaler une erreur dans cet exercice', onclick: () => report(it) }, '⚑ Signaler')),
      it.t !== 'card' ? el('h2.ex-q', fmtKeys(it.q)) : null,
      two && HOWTO[it.t] ? el('p.ex-howto', el('span', { 'aria-hidden': 'true' }, '👉 '), fmtKeys(HOWTO[it.t])) : null,
      el('div.ex-explain', { hidden: true })),
      el('div.ex-content', banner?.node, cur.node)));
    paintHint(it);
    btn.textContent = it.t === 'card' ? 'Continuer' : 'Vérifier';
    btn.disabled = it.t !== 'card' && cur.ready !== true;
    btn.hidden = SELF.includes(it.t);
    skip.hidden = !canSkip(it);
    skip.textContent = it.t === 'tap' || it.t === 'velocity' || it.t === 'knob' ? 'Pas maintenant' : 'Je ne peux pas écouter';
    body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
    window.scrollTo(0, 0);
    paintTop();
  }

  /** Rappel des touches (PC) : visible pendant qu'on répond, à gauche du bouton. */
  function paintHint(it) {
    hint.replaceChildren();
    if (!finePointer()) return;
    const parts = [];
    const n = it.t === 'mcq' || it.t === 'shortcut' ? it.choices.length : 0;
    if (n) parts.push(el('span', kbd('1'), '–', kbd(String(Math.min(9, n))), ' choisir'));
    if (it.t === 'keys') parts.push(el('span', kbd(...['KeyA', 'KeyS', 'KeyD', 'KeyF'].map((c) => keyLabel(c))), '… jouer'), el('span', kbd(keyLabel('KeyZ'), keyLabel('KeyX')), ' octave'));
    if (it.t === 'tap') parts.push(el('span', kbd('Espace'), ' lancer, puis taper'));
    else if (it.play || it.plays || it.demo || ['grid', 'roll'].includes(it.t)) parts.push(el('span', kbd('Espace'), ' écouter'));
    if (it.t === 'shortcut' && it.capture !== false) parts.push(el('span', kbd(isMac() ? '⌘' : 'Ctrl'), '… ou tape le raccourci'));
    if (!SELF.includes(it.t)) parts.push(el('span', kbd('Entrée'), it.t === 'card' ? ' continuer' : ' vérifier'));
    if (parts.length) hint.append(el('span.lf-hint-ico', '⌨️'), ...parts);
  }

  function check() {
    if (phase !== 'answer') return;
    const entry = queue[pos];
    const { it } = entry;
    if (it.t === 'card') { settled++; pos++; show(); return; }
    phase = 'feedback';
    answered++;
    const jamBefore = jam.count();
    let res;
    try { res = checkAnswer(it, cur.value()); } catch (e) { console.error(e); res = { ok: false }; }
    cur.reveal(res);
    if (!entry.retry) { graded++; if (res.ok) correctFirst++; }
    if (res.ok) {
      combo++; bestCombo = Math.max(bestCombo, combo); settled++;
      jam.good();
      trackLesson({ good: 1, combo, jam: jam.count() });
    } else {
      mistakes++; combo = 0;
      if (it.src) misses[it.src] = (misses[it.src] || 0) + 1;
      jam.bad();
      if (hearts != null) { hearts--; settled++; }
      else if (!entry.retry) queue.push({ it, retry: true });
      else settled++;
    }
    const answer = res.ok ? null : cur.answerText?.();
    const explain = res.why || it.explain || cur.explain?.() || null;
    // Bip réagit : il fête une série, sourit à une bonne réponse, est déçu sur une erreur
    const party = res.ok && combo >= 3;
    const lastWrong = wasWrong; wasWrong = !res.ok;
    const mood = res.ok ? (party ? 'party' : 'happy') : 'sad';
    const jamN = jam.count();
    const jamTxt = res.ok
      ? (jamN >= JAM_MAX && combo > JAM_MAX ? '🎵 Ton morceau tourne à plein.' : `🎵 ${JAM_LAYERS[jamN - 1].emoji} ${JAM_LAYERS[jamN - 1].name} ${jamN === 1 ? 'lance ton morceau' : 'rejoint ton morceau'} (${jamN}/${JAM_MAX}).`)
      : (jamBefore > 0 ? `🎵 ${JAM_LAYERS[jamBefore - 1].emoji} ${JAM_LAYERS[jamBefore - 1].name} quitte ton morceau… une bonne réponse et c’est reparti.` : null);
    // Sur grand écran, l'explication se lit à gauche, à côté de l'exercice
    const side = body.querySelector('.ex.two .ex-explain');
    const explainLeft = !!(side && explain && wideScreen());
    if (explainLeft) { side.hidden = false; side.className = 'ex-explain ' + (res.ok ? 'good' : 'bad'); side.replaceChildren(el('b', res.ok ? '✓ Pourquoi' : '✕ À retenir'), el('p', explain)); }
    msg.replaceChildren(
      el('div.lf-bip', mascot(mood, 58, { anim: party ? 'jump' : res.ok ? 'hop' : 'droop' }), el('span.lf-icon', res.ok ? '✓' : '✕')),
      el('div',
        el('b.lf-title', `${bipReact({ ok: res.ok, combo, retry: entry.retry, wasWrong: res.ok && lastWrong, hearts })}${res.ok && combo >= 3 ? ` 🔥 ${combo} d’affilée` : ''}`),
        answer ? el('p.lf-answer', 'Bonne réponse : ', el('b', answer)) : null,
        explain && !explainLeft ? el('p.lf-text', explain) : null,
        jamTxt ? el('p.lf-text.small.lf-jam', jamTxt) : null,
        !res.ok && hearts == null && !entry.retry ? el('p.lf-text.small', '🔁 Cette question reviendra à la fin de la leçon.') : null));
    foot.className = 'lesson-foot ' + (res.ok ? 'good' : 'bad');
    btn.hidden = false;
    skip.hidden = true;
    btn.disabled = false;
    btn.textContent = hearts === 0 ? 'Voir le résultat' : 'Continuer';
    paintTop();
  }

  /** Signaler une erreur : rangée dans le Carnet (avec la leçon et la consigne) pour pouvoir la transmettre. */
  function report(it) {
    const txt = el('textarea', { rows: 4, placeholder: 'Ce qui ne va pas : réponse fausse, mot ambigu, son qui ne marche pas, info sur Live inexacte…', style: { width: '100%' } });
    const close = modal(el('div',
      el('h2', '⚑ Signaler une erreur'),
      el('p.small.muted', `${title} · ${it.t === 'card' ? it.title : it.q}`),
      txt,
      el('p.small.muted', 'Ton signalement est gardé dans ton Carnet (📓) : tu pourras le recopier pour le transmettre.'),
      el('div.row.gap.wrap',
        el('button.btn3d.primary', { type: 'button', onclick: () => {
          const where = `${run.node?.id || run.kind} · ${it.src || ''} · ${it.t}`;
          const what = it.t === 'card' ? it.title : it.q;
          update((s) => { s.notebook.unshift({ id: Date.now(), type: 'note', title: `⚑ Erreur signalée : ${what}`.slice(0, 120), note: `${txt.value.trim() || '(sans détail)'}\n\nLeçon : ${title}\nExercice : ${what}\nRéférence : ${where}`, date: Date.now() }); });
          close();
          toast('Merci ! Signalement gardé dans ton Carnet 📓', 'good');
        } }, 'Envoyer au Carnet'),
        el('button.btn3d.ghost', { type: 'button', onclick: () => close() }, 'Annuler'))));
    setTimeout(() => txt.focus(), 50);
  }

  function skipItem() {
    if (phase !== 'answer') return;
    skipped++;
    settled++;
    pos++;
    show();
  }

  function next() {
    if (hearts === 0) { fail(); return; }
    pos++;
    show();
  }

  const recordMisses = () => update((s) => { let c = courseOf(s); for (const [id, n] of Object.entries(misses)) c = addMisses(c, id, n); s.course = c; });

  function finish() {
    cur?.destroy(); cur = null;
    banner?.destroy(); banner = null;
    stopSpec();
    const acc = graded + skipped ? Math.round((100 * correctFirst) / (graded + skipped)) : 100;
    const perfect = mistakes === 0 && skipped === 0;
    if (run.kind !== 'practice' && skipped > graded) { incomplete(); return; }
    const day = dayKey();
    const before = courseOf(getState());
    let xp, headline, sub = null, mood = 'happy', nextHref = '#/learn';
    if (run.kind === 'lesson' || run.kind === 'checkpoint') {
      const node = run.kind === 'lesson' ? run.node : unit.nodes.find((n) => n.type === 'checkpoint');
      const first = !before.done?.[node.id];
      xp = xpFor(node, { first, perfect });
      update((s) => { s.course = completeNode(courseOf(s), node.id, { acc, perfect, day }); });
      nextHref = `#/learn?done=${node.id}${first ? '&new=1' : ''}`;
      headline = run.kind === 'checkpoint' ? '🏆 Unité terminée !' : perfect ? 'Leçon sans faute !' : 'Leçon terminée !';
      if (run.kind === 'checkpoint') { const k = unitIndex(unit.id); sub = UNITS[k + 1] ? `L’unité ${k + 2} « ${UNITS[k + 1].title} » est débloquée.` : 'Tu as terminé tout le parcours. Chapeau, producteur·rice ! 🎓'; mood = 'cool'; }
    } else if (run.kind === 'jump') {
      xp = xpFor(null, { kind: 'jump' });
      update((s) => { s.course = applyJump(courseOf(s), unit.id, day); });
      headline = '⏩ Bienvenue plus loin !';
      sub = `Les unités précédentes sont validées : tu reprends à « ${unit.title} ».`;
      nextHref = `#/learn?u=${unit.id}`;
      mood = 'cool';
    } else {
      xp = xpFor(null, { kind: 'practice', perfect });
      update((s) => { s.course = markPracticed(courseOf(s), run.lessons || [], day); });
      headline = 'Entraînement terminé !';
      sub = 'Les notions où tu hésitais ont été révisées.';
    }
    recordMisses();
    // Défis du jour : leçon finie, sans faute, rapide, pistes du morceau
    trackLesson({ lesson: run.kind === 'lesson' || run.kind === 'checkpoint' ? 1 : 0, perfect: perfect && run.kind === 'lesson' ? 1 : 0, review: run.kind === 'practice' ? 1 : 0, fast: run.kind === 'lesson' && Date.now() - t0 < 120000 ? 1 : 0, jam: jam.count(), combo: bestCombo });
    const res = recordExercise({ key: `course:${run.kind}`, title: title, xp, skill: unit?.skill || 'autonomie', score: acc, success: true });
    if (perfect || run.kind !== 'lesson' || res.levelUp) confetti();
    if (perfect && mood === 'happy') mood = 'party';
    // Le morceau gagné : il joue en entier, avec les pistes obtenues
    const layers = Math.max(1, jam.count());
    const chips = JAM_LAYERS.map((l, i) => el('span.lt-chip' + (i < layers ? '.on' : ''), { style: { '--i': i } }, el('i', { 'aria-hidden': 'true' }, l.emoji), l.name));
    const replay = el('button.btn3d.lt-play', { type: 'button', onclick: () => (track.classList.contains('playing') ? jam.stop() : playTrack(true)) }, '▶ Réécouter');
    const track = el('div.le-track', { style: unit ? { '--uc': unit.color } : null },
      el('div.lt-head', el('b', layers >= JAM_MAX ? '🎵 Ton morceau est complet !' : `🎵 Ton morceau : ${layers} piste${layers > 1 ? 's' : ''} sur ${JAM_MAX}`), replay),
      el('div.lt-chips', chips),
      layers < JAM_MAX ? el('p.small.muted', 'Chaque bonne réponse ajoute une piste, chaque erreur en retire une : refais la leçon pour l’entendre en entier.') : null);
    const playTrack = (force = false) => {
      const d = jam.finale({ force, onEnd: () => { track.classList.remove('playing'); replay.textContent = '▶ Réécouter'; } });
      if (d) { track.classList.add('playing'); replay.textContent = '■ Stop'; }
    };
    const xpEl = el('b'), accEl = el('b');
    const won = res.challenges?.won || [];
    shell.classList.add('done');
    shell.replaceChildren(el('div.lesson-end',
      el('div.le-mascot', mascot(mood, 110, { anim: mood === 'party' ? 'jump' : '' })),
      el('h1', headline),
      el('p.le-bip', bipEnding({ kind: run.kind, perfect, acc, layers: jam.count() })),
      sub ? el('p.le-sub', sub) : null,
      el('div.le-tiles',
        el('div.le-tile.xp', el('small', 'XP gagnés'), xpEl),
        el('div.le-tile.acc', el('small', 'Précision'), accEl),
        el('div.le-tile.time', el('small', 'Temps'), el('b', mmss(Date.now() - t0)))),
      track,
      won.length || res.challenges?.chest ? el('div.le-chal',
        won.map((c) => el('p', `🎯 Défi réussi : ${c.name} `, el('b', `+${c.bolts} ${BOLT}`))),
        res.challenges.chest ? el('p.chest', '🎁 Coffre du jour ouvert ! ', el('b', `+${CHEST_BOLTS} ${BOLT} · +${CHEST_XP} XP`)) : null) : null,
      perfect ? el('p.le-badge', '✨ Sans faute') : bestCombo >= 5 ? el('p.le-badge', `🔥 Meilleure série : ${bestCombo}`) : null,
      res.levelUp ? el('p.le-badge', `🎉 Niveau ${res.level} !`) : null,
      el('div.row.gap.wrap.center',
        run.kind === 'practice' ? el('a.btn3d', { href: `#/lesson?practice=1&r=${Date.now()}` }, '🏋️ Encore') : null,
        el('a.btn3d.primary', { href: nextHref, 'data-key': 'enter' }, 'Continuer'))));
    countUp(xpEl, res.xp, (v) => `+${v}`);
    countUp(accEl, acc, (v) => `${v} %`, { delay: 500 });
    playTrack();
    showBadges(res.badges);
  }

  function incomplete() {
    recordMisses();
    shell.classList.add('done');
    shell.replaceChildren(el('div.lesson-end',
      el('div.le-mascot', mascot('wow', 110)),
      el('h1', 'Presque !'),
      el('p.le-bip', bipEnding({ incomplete: true })),
      el('p.le-sub', `Tu as passé ${skipped} exercice${skipped > 1 ? 's' : ''} sur ${graded + skipped} : refais la leçon quand tu pourras écouter ou jouer, pour la valider.`),
      el('div.row.gap.wrap.center',
        el('a.btn3d', { href: `#/lesson?${new URLSearchParams(params).toString()}&r=${Date.now()}` }, '↻ Recommencer'),
        el('a.btn3d.primary', { href: '#/learn', 'data-key': 'enter' }, 'Retour au parcours'))));
  }

  function fail() {
    cur?.destroy(); cur = null;
    banner?.destroy(); banner = null;
    stopSpec();
    sfx('bad');
    recordMisses();
    shell.classList.add('done');
    shell.replaceChildren(el('div.lesson-end',
      el('div.le-mascot', mascot('sad', 110)),
      el('h1', 'Plus de cœurs 💔'),
      el('p.le-bip', bipEnding({ failed: true })),
      el('p.le-sub', run.kind === 'jump' ? 'Pas grave : le parcours depuis le début t’apprendra ce qui te manque, et tu iras vite sur ce que tu connais déjà.' : 'Révise les leçons de l’unité (elles se rejouent à volonté), puis retente le contrôle.'),
      el('div.row.gap.wrap.center',
        el('a.btn3d', { href: `#/lesson?${run.kind === 'jump' ? `jump=${unit.id}` : `cp=${unit.id}`}&r=${Date.now()}` }, '↻ Réessayer'),
        el('a.btn3d.primary', { href: '#/learn', 'data-key': 'enter' }, 'Retour au parcours'))));
  }

  function quit() {
    if (!answered || shell.classList.contains('done')) { location.hash = '#/learn'; return; }
    const close = modal(el('div.center',
      mascot('sad', 80),
      el('h2', 'Quitter la leçon ?'),
      el('p.muted', 'Ta progression dans cette leçon sera perdue.'),
      el('div.row.gap.wrap.center',
        el('button.btn3d.primary', { type: 'button', onclick: () => close() }, 'Continuer la leçon'),
        el('button.btn3d.ghost', { type: 'button', onclick: () => { close(); location.hash = '#/learn'; } }, 'Quitter'))));
  }

  viewKeys({ space: () => { if (cur?.onSpace?.()) return; body.querySelector('.bigplay, .ldemo')?.click(); } });
  // Pour les tests navigateur : l'exercice affiché
  window.__bfLesson = { item: () => (phase === 'answer' && queue[pos] ? queue[pos].it : null), retry: () => !!queue[pos]?.retry };
  show();
  return () => { cur?.destroy(); banner?.destroy(); stopSpec(); stopJam(); transport.stop(); };
}
