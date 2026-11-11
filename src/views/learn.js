// 🎓 Apprendre : le parcours principal, façon Duolingo. Un chemin sinueux d'unités, chacune faite de leçons,
// d'ateliers de l'app, d'une mission studio et d'un contrôle ; la suite se débloque au fur et à mesure.
import { el, modal, toast, plural, showBadges } from '../ui.js';
import { getState, update, recordExercise, today, dueReviews } from '../store.js';
import { UNITS, PARTS } from '../data/course.js';
import { NODES, nodeStates, unitStatus, courseProgress, courseOf, unitIndex, nodeById, isRequired, completeNode, bonusDone, xpFor, buildLesson, dueLessons } from '../core/course.js';
import { mascot } from '../learn/kit.js';
import { dayKey } from '../core/progress.js';
import { streakAtRisk } from '../core/reminder.js';
import { sceneFor } from '../learn/scenes.js';

const ROW = 112;          // espacement vertical des nœuds
const W = 300;            // largeur du chemin
const AMP = 78;           // amplitude des virages
const SWING = [0, 0.55, 1, 0.55, 0, -0.55, -1, -0.55];
const TOOL = { ableton: { name: 'Ableton Live 12', emoji: '🎛️' }, serum: { name: 'Serum 2 ou Drift', emoji: '🌊' }, midi: { name: 'Clavier MIDI + Live', emoji: '🎹' }, mpc: { name: 'MPC', emoji: '🔲' } };
const STATE_LABEL = { perfect: 'terminé sans faute', done: 'terminé', current: 'à faire maintenant', open: 'bonus disponible', locked: 'verrouillé' };

/** Ateliers lancés puis faits dans l'app : validés automatiquement au retour sur le parcours. */
function autoBonus() {
  const s = getState();
  const { states } = nodeStates(courseOf(s));
  const done = [];
  // Ateliers ouverts : validés par le journal depuis leur lancement, ou par les étoiles déjà gagnées dans les jeux
  for (const n of NODES) {
    if (n.type !== 'lab' || states[n.id] !== 'open') continue;
    if (bonusDone(s, n)) done.push(n);
  }
  done.forEach((n) => completeBonus(n, true));
}

function completeBonus(n, auto = false) {
  const first = !getState().course?.done?.[n.id];
  update((s) => { s.course = completeNode(courseOf(s), n.id, { acc: 100, perfect: true, day: dayKey() }); });
  const xp = first ? xpFor(n) : 0;
  const unit = UNITS.find((u) => u.id === n.unit);
  if (xp) {
    const res = recordExercise({ key: 'course:bonus', title: n.title, xp, skill: unit?.skill || 'autonomie', success: true });
    showBadges(res.badges);
  }
  toast(`${n.type === 'studio' ? '🎛️ Mission accomplie' : '🎁 Atelier validé'} : ${n.title}${xp ? ` · +${xp} XP` : ''}`, 'good', 3500);
  if (auto) return;
}

function startBonus(n) {
  update((s) => { const c = courseOf(s); s.course = { ...c, started: { ...(c.started || {}), [n.id]: { ...(c.started?.[n.id] || {}), at: c.started?.[n.id]?.at || Date.now(), exports0: s.stats.exports || 0 } } }; });
}

/** Anneau d'objectif (SVG) : pct de 0 à 100, avec un texte au centre. */
function ring(pct, label, size = 92) {
  const r = 30, c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  n.setAttribute('viewBox', '0 0 72 72'); n.setAttribute('width', size); n.setAttribute('height', size); n.setAttribute('class', 'lring' + (p >= 100 ? ' full' : ''));
  n.innerHTML = `<circle cx="36" cy="36" r="${r}" class="lring-bg"/><circle cx="36" cy="36" r="${r}" class="lring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 36 36)"/><text x="36" y="${label.length > 3 ? 40 : 42}" text-anchor="middle" class="${label.length > 3 ? 'sm' : ''}">${label}</text>`;
  // L'anneau se remplit à l'affichage
  requestAnimationFrame(() => requestAnimationFrame(() => n.querySelector('.lring-fg')?.setAttribute('stroke-dashoffset', String(c * (1 - p / 100)))));
  return n;
}

let detach = null; // écouteurs de défilement de l'affichage en cours

export function render(root, params = {}) {
  autoBonus();
  const s = getState();
  const course = courseOf(s);
  const { states, current } = nodeStates(course);
  const prog = courseProgress(course);
  const unitsDone = UNITS.filter((u) => unitStatus(course, u.id).complete).length;
  const cur = current ? nodeById(current) : null;
  const curUnit = cur ? UNITS[cur.ui] : null;
  let pop = null;
  const closePop = () => { pop?.remove(); pop = null; document.querySelectorAll('.pnode.active').forEach((x) => x.classList.remove('active')); };

  // ---------- En-tête : aujourd'hui (objectif, série, révisions) et la prochaine leçon ----------
  const hasDone = NODES.some((n) => n.type === 'lesson' && course.done?.[n.id]);
  const t = today();
  const goal = s.settings.dailyGoal || 150;
  const goalPct = Math.round((100 * Math.min(t.xp, goal)) / goal);
  const streak = s.streak.count || 0;
  const lit = s.streak.last === dayKey();
  const risk = streakAtRisk(s);
  const dueCourse = dueLessons(course, dayKey()).length;
  const dueOther = dueReviews().length;
  const due = dueCourse + dueOther;
  // Bip réagit à ta journée
  const mood = goalPct >= 100 ? 'party' : risk ? 'sleepy' : !prog.done ? 'wow' : 'happy';
  const say = goalPct >= 100 ? 'Objectif du jour atteint ! 🎉'
    : risk ? `Ta série de ${streak} jours t’attend : une leçon et elle continue.`
      : !prog.done ? 'Salut, moi c’est Bip ! Ta première leçon dure 3 minutes.'
        : t.xp ? `Encore ${goal - t.xp} XP pour ton objectif du jour.`
          : due ? `${plural(due, 'révision')} t’attend${due > 1 ? 'ent' : ''}, et la suite du chemin aussi.` : 'Une leçon aujourd’hui ? 3 minutes suffisent.';
  const reviewHref = dueCourse ? '#/lesson?practice=1' : dueOther ? '#/review' : hasDone ? '#/lesson?practice=1' : null;
  const hero = el('section.learn-hero', { 'aria-label': 'Aujourd’hui' },
    el('div.lh-top',
      el('div.lh-mascot', mascot(mood, 72, { anim: mood === 'party' ? 'jump' : '' })),
      el('div.lh-say', el('p', say), el('small', cur ? `Unité ${cur.ui + 1} · ${curUnit.title}` : 'Tout le parcours est terminé : bravo ! 🎓'))),
    el('div.lh-today',
      el('a.lh-tile.goal' + (goalPct >= 100 ? '.ok' : ''), { href: '#/profile', title: 'Objectif du jour (réglable dans le Profil)' },
        ring(goalPct, goalPct >= 100 ? '✓' : `${goalPct}%`, 64),
        el('div', el('small', 'Objectif du jour'), el('b', `${Math.min(t.xp, goal)} / ${goal} XP`))),
      el('a.lh-tile.streak' + (lit ? '.lit' : '') + (risk ? '.risk' : ''), { href: '#/profile', title: lit ? 'Série de jours : c’est fait pour aujourd’hui' : 'Série de jours : fais une leçon pour la continuer' },
        el('span.lh-ico', { 'aria-hidden': 'true' }, '🔥'),
        el('div', el('small', lit ? 'Série · fait aujourd’hui' : risk ? 'Série · à sauver ce soir' : 'Série en cours'), el('b', plural(streak, 'jour')))),
      el(reviewHref ? 'a.lh-tile.review' + (due ? '.due' : '') : 'div.lh-tile.review.off', { href: reviewHref, title: due ? 'Les notions où tu as hésité reviennent au bon moment' : hasDone ? 'Rien à réviser aujourd’hui : tu peux quand même t’entraîner' : 'Termine une leçon pour débloquer les révisions' },
        el('span.lh-ico', { 'aria-hidden': 'true' }, due ? '🔁' : '🏋️'),
        el('div', el('small', due ? 'Révisions dues' : 'Révisions'), el('b', due ? plural(due, 'notion') : hasDone ? 'S’entraîner' : 'Bientôt')))),
    cur
      ? el('a.btn3d.primary.big.wide', { href: `#/lesson?id=${cur.id}`, style: { '--uc': curUnit.color } }, `▶ ${prog.done ? 'Continuer' : 'Commencer'} : ${cur.title}`)
      : el('a.btn3d.primary.big.wide', { href: '#/lesson?practice=1' }, '🏋️ S’entraîner'),
    el('div.lh-course', { title: 'Ta progression dans le parcours' },
      el('div.lh-bar', el('i', { style: { width: `${prog.pct}%` } })),
      el('span', `Parcours : ${prog.pct} %`), el('span', `⭐ ${prog.done}/${prog.total}`), el('span', `🏆 ${unitsDone}/${UNITS.length} unités`), prog.bonus ? el('span', `🎁 ${prog.bonus}`) : null));

  // ---------- Animation de déblocage : au retour d'une leçon réussie pour la première fois ----------
  const fresh = new Map(); // nœud qui vient de s'ouvrir → rang (pour décaler les animations)
  if (params.new && params.done && course.done?.[params.done]) {
    const i0 = NODES.findIndex((n) => n.id === params.done);
    for (let i = i0 + 1, k = 0; i0 >= 0 && i < NODES.length; i++) {
      if (states[NODES[i].id] === 'locked') break;
      fresh.set(NODES[i].id, k++);
      if (NODES[i].id === current) break;
    }
  }

  // ---------- Le chemin : un univers par partie ----------
  const sticky = el('div.unit-sticky', { 'aria-hidden': 'true' });
  const sections = [el('div.unit-sticky-slot', sticky)];
  const blocks = []; // { u, k, st, sec } pour l'en-tête collant
  for (const part of PARTS) {
    const sc = sceneFor(part.id);
    sections.push(el('section.part.part-' + part.id, { style: { '--pc': sc.color }, 'aria-label': `Partie ${part.id} : ${part.name}` },
      el('div.part-bg.near', { 'aria-hidden': 'true', style: { backgroundImage: sc.near } }),
      el('div.part-head', el('span.part-emoji', part.emoji), el('div', el('small', `PARTIE ${part.id} · ${sc.name.toUpperCase()}`), el('h2', part.name), el('p.small.muted', part.desc))),
      UNITS.filter((x) => x.part === part.id).map((u) => unitBlock(u))));
  }

  function unitBlock(u) {
    const k = unitIndex(u.id);
    const st = unitStatus(course, u.id);
    const justOpen = fresh.has(u.nodes[0].id) && fresh.get(u.nodes[0].id) === 0;
    const banner = el('div.unit-banner' + (st.open ? '' : '.locked') + (st.complete ? '.complete' : '') + (justOpen ? '.unlocked' : ''), { id: `unit-${u.id}`, style: { '--uc': u.color } },
      el('div.ub-main',
        el('small', `UNITÉ ${k + 1}${st.complete ? ' · ✓ TERMINÉE' : ''}`),
        el('h2', `${u.emoji} ${u.title}`),
        el('p', u.goal)),
      el('div.ub-side',
        el('button.ub-btn', { type: 'button', onclick: () => guide(u) }, '📖 Guide'),
        !st.open && k > 0 ? el('button.ub-btn.jump', { type: 'button', onclick: () => jump(u) }, '⏩ Sauter ici') : null),
      el('div.ub-bar', el('i', { style: { width: `${Math.round((100 * st.done) / st.total)}%` } })));
    const nodes = u.nodes.map((n) => nodeById(n.id));
    // Un peu plus d'air avant le contrôle (gros nœud + bulle « Commencer »)
    const ys = [];
    nodes.forEach((n, i) => ys.push(i ? ys[i - 1] + ROW + (n.type === 'checkpoint' ? 22 : 0) : 84));
    const H = ys[ys.length - 1] + 80;
    const pts = nodes.map((n, i) => [W / 2 + SWING[i % SWING.length] * AMP, ys[i]]);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'upath-svg'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = pts.slice(1).map(([x, y], i) => {
      const [x0, y0] = pts[i];
      const lit = ['done', 'perfect'].includes(states[nodes[i].id]) && states[nodes[i + 1].id] !== 'locked';
      // Le trait se trace depuis la leçon qu'on vient de réussir
      const trace = lit && fresh.size && nodes[i].id === params.done;
      return `<path d="M${x0},${y0} C${x0},${(y0 + y) / 2} ${x},${(y0 + y) / 2} ${x},${y}" class="${lit ? 'lit' : ''}${trace ? ' trace' : ''}"${trace ? ' pathLength="1"' : ''}/>`;
    }).join('');
    const path = el('div.upath', { style: { height: `${H}px`, '--uc': u.color } }, svg);
    nodes.forEach((n, i) => {
      const state = states[n.id];
      const [x, y] = pts[i];
      const isCur = n.id === current;
      const rank = fresh.get(n.id);
      const b = el('button.pnode.' + state + '.t-' + n.type + (rank != null ? '.unlocking' : params.done && prevOf(n.id) === params.done ? '.pop' : ''), {
        type: 'button', 'aria-label': `${n.title} : ${STATE_LABEL[state]}`, 'data-node': n.id,
        onclick: (e) => { e.stopPropagation(); openPop(n, state, b, path, x, y); },
      }, el('span.pn-ico', state === 'locked' && isRequired(n) ? '🔒' : n.icon), state === 'perfect' ? el('span.pn-crown', '👑') : state === 'done' ? el('span.pn-check', '✓') : null,
        !isRequired(n) && state !== 'locked' && !['done', 'perfect'].includes(state) ? el('span.pn-gift', { 'aria-hidden': 'true' }, '🎁') : null,
        rank != null ? el('span.pn-lock', { 'aria-hidden': 'true' }, '🔒') : null);
      if (rank != null) b.style.setProperty('--ud', `${0.95 + rank * 0.28}s`);
      // Étiquette à côté du nœud, du côté où il y a de la place
      const side = SWING[i % SWING.length] > 0 ? 'l' : 'r';
      path.append(el('div.pnode-wrap' + (isCur ? '.current' : '') + '.t-' + n.type + (rank != null ? '.fresh' : ''), { style: { left: `${x}px`, top: `${y}px`, ...(rank != null ? { '--ud': `${0.95 + rank * 0.28}s` } : {}) } },
        isCur ? el('div.pn-bubble', prog.done ? 'CONTINUER' : 'COMMENCER') : null,
        b, el('span.pn-label.' + side, !isRequired(n) ? el('small', n.type === 'studio' ? 'Mission studio' : 'Atelier bonus') : null, n.title)));
    });
    // La mascotte accompagne chaque unité, du côté opposé au virage
    const mi = Math.min(2, nodes.length - 1);
    const side = SWING[mi % SWING.length] > 0 ? 'left' : 'right';
    path.append(el('div.path-mascot.' + side, { style: { top: `${pts[mi][1] - 30}px` } }, mascot(st.complete ? 'cool' : st.open ? 'happy' : 'wow', 64), el('span.pm-tip', u.guide[0][0])));
    const sec = el('section.unit', { 'aria-label': `Unité ${k + 1} : ${u.title}` }, banner, path);
    blocks.push({ u, k, st, sec, banner });
    return sec;
  }

  function prevOf(id) {
    const i = NODES.findIndex((n) => n.id === id);
    return i > 0 ? NODES[i - 1].id : null;
  }

  function openPop(n, state, btn, path, x, y) {
    if (pop && pop.dataset.node === n.id) { closePop(); return; }
    closePop();
    btn.classList.add('active');
    const unit = UNITS[n.ui];
    const done = course.done?.[n.id];
    const kids = [el('b.pp-title', n.title)];
    const actions = [];
    if (n.type === 'lesson') {
      let count = 0;
      try { count = buildLesson(n.id, 1).items.filter((it) => it.t !== 'card').length; } catch (e) { /* noop */ }
      kids.push(el('p.pp-meta', state === 'locked' ? 'Termine les étapes précédentes pour débloquer cette leçon.' : `${plural(count, 'exercice')} · +${xpFor(n, { first: !done })} XP${done ? ` · meilleur score ${done.best} %` : ''}`));
      if (state !== 'locked') actions.push(el('a.btn3d.primary.wide', { href: `#/lesson?id=${n.id}` }, done ? '↻ Rejouer' : 'Commencer'));
    } else if (n.type === 'checkpoint') {
      kids.push(el('p.pp-meta', state === 'locked' ? 'Le contrôle s’ouvre quand toutes les leçons de l’unité sont faites.' : `${n.desc}${done ? ` · réussi (${done.best} %)` : ''}`));
      if (state !== 'locked') actions.push(el('a.btn3d.primary.wide', { href: `#/lesson?id=${n.id}` }, done ? '↻ Repasser le contrôle' : '🏆 Passer le contrôle'));
    } else if (n.type === 'lab') {
      kids.push(el('p.pp-meta', n.desc));
      if (state === 'locked') kids.push(el('p.pp-meta.small', 'Disponible quand tu arrives à cette étape.'));
      else {
        const started = course.started?.[n.id];
        actions.push(el('a.btn3d.primary.wide', { href: n.href, onclick: () => startBonus(n) }, done ? '↻ Refaire l’atelier' : '🎁 Ouvrir l’atelier'));
        if (started && !done) actions.push(el('button.btn3d.ghost.wide', { type: 'button', onclick: () => { completeBonus(n); rerender(); } }, '✓ J’ai terminé'));
        kids.push(el('p.pp-meta.small', done ? 'Atelier validé ✓' : 'Il se valide tout seul quand tu réussis l’exercice dans l’atelier.'));
      }
    } else if (n.type === 'studio') {
      const tool = TOOL[n.tool] || TOOL.ableton;
      kids.push(el('p.pp-meta', `${tool.emoji} À faire dans ${tool.name} · ${plural(n.steps.length, 'étape')}`));
      if (state === 'locked') kids.push(el('p.pp-meta.small', 'Disponible quand tu arrives à cette étape.'));
      else actions.push(el('button.btn3d.primary.wide', { type: 'button', onclick: () => { closePop(); mission(n); } }, done ? '↻ Revoir la mission' : '🎛️ Voir la mission'));
    }
    pop = el('div.ppop', { 'data-node': n.id, style: { top: `${y + 46}px`, '--ax': `${x - 20}px`, '--uc': unit.color }, onclick: (e) => e.stopPropagation() }, kids, actions);
    path.append(pop);
    pop.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  function guide(u) {
    const k = unitIndex(u.id);
    const lessons = u.nodes.map((n) => nodeById(n.id)).filter((n) => n.type === 'lesson');
    const close = modal(el('div.guide', { style: { '--uc': u.color } },
      el('small.guide-k', `UNITÉ ${k + 1} · GUIDE`),
      el('h2', `${u.emoji} ${u.title}`),
      el('p.muted', u.goal),
      el('div.guide-list', u.guide.map(([t, d]) => el('div.guide-item', el('b', t), el('p', d)))),
      el('h3', 'Les leçons'),
      el('div.guide-lessons', lessons.map((n) => {
        const st = states[n.id];
        return el('div.guide-lesson', el('span', `${['done', 'perfect'].includes(st) ? '✅' : st === 'current' ? '▶️' : '🔒'} ${n.icon} ${n.title}`),
          ['done', 'perfect'].includes(st) ? el('a.btn.small', { href: `#/lesson?id=${n.id}`, onclick: () => close() }, 'Réviser') : null);
      })),
      el('button.btn3d.primary.wide', { type: 'button', onclick: () => close() }, 'Fermer')));
  }

  function jump(u) {
    const k = unitIndex(u.id);
    const close = modal(el('div.center',
      mascot('wow', 84),
      el('h2', `Sauter à l’unité ${k + 1} ?`),
      el('p', `« ${u.title} ». Un test sur ce que tu sauterais, avec 3 cœurs.`),
      el('p.muted.small', 'Réussis-le et toutes les leçons précédentes sont validées. Tu pourras toujours revenir les faire.'),
      el('div.row.gap.wrap.center',
        el('button.btn3d.ghost', { type: 'button', onclick: () => close() }, 'Annuler'),
        el('a.btn3d.primary', { href: `#/lesson?jump=${u.id}`, onclick: () => close() }, '⏩ Passer le test'))));
  }

  function mission(n) {
    const tool = TOOL[n.tool] || TOOL.ableton;
    const checks = [...(getState().course?.started?.[n.id]?.checks || n.steps.map(() => false))];
    const done = !!getState().course?.done?.[n.id];
    const go = el('button.btn3d.primary.wide', { type: 'button', onclick: () => { close(); completeBonus(n); rerender(); } }, done ? '✅ Mission déjà accomplie' : '✅ Mission accomplie');
    const paint = () => { go.disabled = done || !checks.every(Boolean); };
    const save = () => update((s) => { const c = courseOf(s); s.course = { ...c, started: { ...(c.started || {}), [n.id]: { ...(c.started?.[n.id] || { at: Date.now() }), checks } } }; });
    const close = modal(el('div.mission3d', { style: { '--uc': UNITS[n.ui].color } },
      el('small.guide-k', `${tool.emoji} MISSION STUDIO · ${tool.name.toUpperCase()}`),
      el('h2', `${n.icon} ${n.title}`),
      el('ol.mission-steps', n.steps.map((t, i) => el('li', el('label', el('input', { type: 'checkbox', checked: checks[i], onchange: (e) => { checks[i] = e.target.checked; save(); paint(); } }), el('span', t))))),
      el('div.lesson-note', el('b', '🧠 Pourquoi'), el('p', n.why)),
      el('p.small.muted', 'Ouvre Live à côté, coche chaque étape quand elle est faite. Ta progression est gardée.'),
      go,
      el('button.btn3d.ghost.wide', { type: 'button', onclick: () => close() }, 'Plus tard')));
    paint();
  }

  const rerender = () => { root.replaceChildren(); render(root, {}); };

  root.append(el('div.learn', { onclick: () => closePop() }, hero, el('div.learn-path', sections),
    el('div.learn-end', mascot('cool', 90), el('h2', 'Au bout du chemin'), el('p.muted', 'Un morceau fini, exporté depuis Ableton Live, avec tes propres sons.'),
      el('a.learn-extras', { href: '#/home' }, el('span', { 'aria-hidden': 'true' }, '🧩'), el('div', el('b', 'Les extras'), el('small', 'Jeux, ateliers libres et carnet d’idées : en plus du parcours, quand tu veux.')), el('span', { 'aria-hidden': 'true' }, '›')))));

  // ---------- En-tête d'unité collant + profondeur des décors au défilement ----------
  detach?.();
  let shown = null, raf = 0;
  const stickTop = () => (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--status-h')) || 52) + 8;
  const paintSticky = () => {
    raf = 0;
    const top = stickTop();
    // L'unité dont le bandeau est déjà passé au-dessus, et dont le chemin est encore à l'écran
    let on = null;
    for (const b of blocks) {
      const r = b.sec.getBoundingClientRect();
      if (b.banner.getBoundingClientRect().bottom < top + 6 && r.bottom > top + 120) on = b;
    }
    if (on !== shown) {
      shown = on;
      sticky.classList.toggle('show', !!on);
      sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (on) {
        sticky.style.setProperty('--uc', on.u.color);
        sticky.classList.toggle('locked', !on.st.open);
        sticky.replaceChildren(
          el('button.us-main', { type: 'button', title: 'Remonter au début de l’unité', onclick: (e) => { e.stopPropagation(); on.banner.scrollIntoView({ block: 'start', behavior: 'smooth' }); } },
            el('small', `UNITÉ ${on.k + 1}${on.st.complete ? ' · ✓' : ` · ${on.st.done}/${on.st.total}`}`), el('b', `${on.u.emoji} ${on.u.title}`)),
          el('button.ub-btn', { type: 'button', onclick: (e) => { e.stopPropagation(); guide(on.u); } }, '📖 Guide'),
          el('div.ub-bar', el('i', { style: { width: `${Math.round((100 * on.st.done) / on.st.total)}%` } })));
      }
    }
    // Décors : le plan lointain glisse plus lentement que le chemin
    const sy = window.scrollY || document.documentElement.scrollTop || 0;
    root.firstElementChild?.style.setProperty('--sy', String(Math.round(sy)));
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(paintSticky); };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  detach = () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf); detach = null; };

  // Défilement : vers l'unité demandée, la leçon qui vient de se débloquer, ou la leçon en cours
  requestAnimationFrame(() => {
    if (params.u) { document.getElementById(`unit-${params.u}`)?.scrollIntoView({ block: 'start' }); return; }
    const target = params.done ? root.querySelector('.pnode.unlocking') || root.querySelector('.pnode.pop') || root.querySelector('.pnode-wrap.current') : root.querySelector('.pnode-wrap.current');
    if (target && (params.done || prog.done)) target.scrollIntoView({ block: 'center' });
    onScroll();
  });
  return () => detach?.();
}
