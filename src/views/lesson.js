// Lecteur de leçon (façon Duolingo) : une consigne à la fois, « Vérifier », retour vert / rouge avec l'explication,
// les erreurs reviennent en fin de leçon, cœurs pour les contrôles et les tests de saut, écran de fin avec XP.
import { el, modal, confetti, showBadges, toast } from '../ui.js';
import { getState, update, recordExercise } from '../store.js';
import { buildLesson, buildCheckpoint, buildJump, buildPractice, checkAnswer, completeNode, applyJump, addMisses, xpFor, courseOf, nodeStates, unitById, unitIndex, nodeById } from '../core/course.js';
import { UNITS } from '../data/course.js';
import { renderItem, typeLabel } from '../learn/exercises.js';
import { sfx, stopSpec, mascot } from '../learn/kit.js';
import { viewKeys } from '../shortcuts.js';
import { dayKey } from '../core/progress.js';
import { transport } from '../core/audio.js';

const PRAISE = ['Excellent !', 'Bravo !', 'Parfait !', 'Bien joué !', 'Exactement !', 'Super !', 'Tu gères !'];
const OOPS = ['Pas tout à fait…', 'Presque !', 'Pas encore…'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
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
  let cur = null, phase = 'answer';

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
    hearts != null ? heartsEl : comboEl);
  const body = el('div.lesson-body');
  const msg = el('div.lf-msg');
  const skip = el('button.btn3d.ghost.lf-skip', { type: 'button', onclick: () => skipItem() }, 'Passer');
  const btn = el('button.btn3d.primary.lf-btn', { type: 'button', 'data-key': 'enter', onclick: () => (phase === 'answer' ? check() : next()) }, 'Vérifier');
  const foot = el('div.lesson-foot', el('div.lf-inner', msg, el('div.lf-btns', skip, btn)));
  const title = run.kind === 'lesson' ? run.node.title : run.kind === 'checkpoint' ? `Contrôle · ${unit.title}` : run.kind === 'jump' ? `Test pour sauter à : ${unit.title}` : 'Entraînement';
  const shell = el('div.lsn', { style: unit ? { '--uc': unit.color } : null }, top, el('div.lsn-title', title), body, foot);
  root.append(shell);

  const SELF = ['pairs', 'tap', 'velocity'];
  // « Passer » seulement quand il faut du son, un clavier MIDI ou jouer en rythme (pas maintenant, dans le métro…)
  const canSkip = (it) => ['tap', 'velocity', 'knob', 'synth'].includes(it.t) || (it.t === 'grid' && it.ear)
    || (it.t === 'mcq' && !!(it.play || it.plays || it.choices.some((c) => c?.play)));
  function show() {
    cur?.destroy();
    stopSpec();
    transport.stop();
    if (pos >= queue.length) { finish(); return; }
    const { it } = queue[pos];
    phase = 'answer';
    foot.className = 'lesson-foot';
    msg.replaceChildren();
    const api = { setReady: (b) => { if (phase === 'answer') btn.disabled = !b; }, submit: () => { if (phase === 'answer') check(); }, enter: () => { if (!btn.disabled) btn.click(); } };
    try { cur = renderItem(it, api); } catch (e) { console.error(e); pos++; settled++; show(); return; }
    body.replaceChildren(el('div.ex' + (queue[pos].retry ? '.retry' : ''),
      el('div.ex-head', el('div.ex-headrow', el('span.ex-type', queue[pos].retry ? '🔁 On y revient' : typeLabel(it)),
        el('button.ex-report', { type: 'button', title: 'Signaler une erreur dans cet exercice', onclick: () => report(it) }, '⚑ Signaler')),
      it.t !== 'card' ? el('h2.ex-q', it.q) : null),
      el('div.ex-content', cur.node)));
    btn.textContent = it.t === 'card' ? 'Continuer' : 'Vérifier';
    btn.disabled = it.t !== 'card' && cur.ready !== true;
    btn.hidden = SELF.includes(it.t);
    skip.hidden = !canSkip(it);
    skip.textContent = it.t === 'tap' || it.t === 'velocity' || it.t === 'knob' ? 'Pas maintenant' : 'Je ne peux pas écouter';
    body.classList.remove('enter'); void body.offsetWidth; body.classList.add('enter');
    window.scrollTo(0, 0);
    paintTop();
  }

  function check() {
    if (phase !== 'answer') return;
    const entry = queue[pos];
    const { it } = entry;
    if (it.t === 'card') { settled++; pos++; show(); return; }
    phase = 'feedback';
    answered++;
    let res;
    try { res = checkAnswer(it, cur.value()); } catch (e) { console.error(e); res = { ok: false }; }
    cur.reveal(res);
    if (!entry.retry) { graded++; if (res.ok) correctFirst++; }
    if (res.ok) {
      combo++; bestCombo = Math.max(bestCombo, combo); settled++;
      sfx('ok');
    } else {
      mistakes++; combo = 0;
      if (it.src) misses[it.src] = (misses[it.src] || 0) + 1;
      sfx('bad');
      if (hearts != null) { hearts--; settled++; }
      else if (!entry.retry) queue.push({ it, retry: true });
      else settled++;
    }
    const answer = res.ok ? null : cur.answerText?.();
    const explain = res.why || it.explain || cur.explain?.() || null;
    msg.replaceChildren(
      el('div.lf-icon', res.ok ? '✓' : '✕'),
      el('div',
        el('b.lf-title', res.ok ? `${pick(PRAISE)}${combo >= 3 ? ` 🔥 ${combo} d’affilée` : ''}` : pick(OOPS)),
        answer ? el('p.lf-answer', 'Bonne réponse : ', el('b', answer)) : null,
        explain ? el('p.lf-text', explain) : null,
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
      nextHref = `#/learn?done=${node.id}`;
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
      headline = 'Entraînement terminé !';
      sub = 'Les notions où tu hésitais ont été révisées.';
    }
    recordMisses();
    const res = recordExercise({ key: `course:${run.kind}`, title: title, xp, skill: unit?.skill || 'autonomie', score: acc, success: true });
    sfx('end');
    if (perfect || run.kind !== 'lesson' || res.levelUp) confetti();
    shell.classList.add('done');
    shell.replaceChildren(el('div.lesson-end',
      el('div.le-mascot', mascot(mood, 110)),
      el('h1', headline),
      sub ? el('p.le-sub', sub) : null,
      el('div.le-tiles',
        el('div.le-tile.xp', el('small', 'XP gagnés'), el('b', `+${res.xp}`)),
        el('div.le-tile.acc', el('small', 'Précision'), el('b', `${acc} %`)),
        el('div.le-tile.time', el('small', 'Temps'), el('b', mmss(Date.now() - t0)))),
      perfect ? el('p.le-badge', '✨ Sans faute') : bestCombo >= 5 ? el('p.le-badge', `🔥 Meilleure série : ${bestCombo}`) : null,
      res.levelUp ? el('p.le-badge', `🎉 Niveau ${res.level} !`) : null,
      el('div.row.gap.wrap.center',
        run.kind === 'practice' ? el('a.btn3d', { href: `#/lesson?practice=1&r=${Date.now()}` }, '🏋️ Encore') : null,
        el('a.btn3d.primary', { href: nextHref, 'data-key': 'enter' }, 'Continuer'))));
    showBadges(res.badges);
  }

  function incomplete() {
    recordMisses();
    shell.classList.add('done');
    shell.replaceChildren(el('div.lesson-end',
      el('div.le-mascot', mascot('wow', 110)),
      el('h1', 'Presque !'),
      el('p.le-sub', `Tu as passé ${skipped} exercice${skipped > 1 ? 's' : ''} sur ${graded + skipped} : refais la leçon quand tu pourras écouter ou jouer, pour la valider.`),
      el('div.row.gap.wrap.center',
        el('a.btn3d', { href: `#/lesson?${new URLSearchParams(params).toString()}&r=${Date.now()}` }, '↻ Recommencer'),
        el('a.btn3d.primary', { href: '#/learn', 'data-key': 'enter' }, 'Retour au parcours'))));
  }

  function fail() {
    cur?.destroy(); cur = null;
    stopSpec();
    recordMisses();
    shell.classList.add('done');
    shell.replaceChildren(el('div.lesson-end',
      el('div.le-mascot', mascot('sad', 110)),
      el('h1', 'Plus de cœurs 💔'),
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
  return () => { cur?.destroy(); stopSpec(); transport.stop(); };
}
