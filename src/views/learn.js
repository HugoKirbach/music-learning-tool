// 🎓 Apprendre : le parcours principal, façon Duolingo. Un chemin sinueux d'unités, chacune faite de leçons,
// d'ateliers de l'app, d'une mission studio et d'un contrôle ; la suite se débloque au fur et à mesure.
import { el, modal, toast, plural, showBadges } from '../ui.js';
import { getState, update, recordExercise } from '../store.js';
import { UNITS, PARTS } from '../data/course.js';
import { NODES, nodeStates, unitStatus, courseProgress, courseOf, unitIndex, nodeById, isRequired, completeNode, bonusDone, xpFor, buildLesson } from '../core/course.js';
import { mascot } from '../learn/kit.js';
import { dayKey } from '../core/progress.js';

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

/** Anneau de progression (SVG). */
function ring(pct, size = 74) {
  const r = 30, c = 2 * Math.PI * r;
  const n = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  n.setAttribute('viewBox', '0 0 72 72'); n.setAttribute('width', size); n.setAttribute('height', size); n.setAttribute('class', 'lring');
  n.innerHTML = `<circle cx="36" cy="36" r="${r}" class="lring-bg"/><circle cx="36" cy="36" r="${r}" class="lring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - pct / 100)}" transform="rotate(-90 36 36)"/><text x="36" y="41" text-anchor="middle">${pct}%</text>`;
  return n;
}

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

  // ---------- En-tête ----------
  const hasDone = NODES.some((n) => n.type === 'lesson' && course.done?.[n.id]);
  const hero = el('section.learn-hero',
    el('div.lh-top',
      el('div.lh-mascot', mascot(prog.done ? 'happy' : 'wow', 78)),
      el('div.lh-text',
        el('h1', prog.done ? 'Ton parcours' : 'Bienvenue dans ton parcours'),
        el('p.sub', cur ? `Unité ${cur.ui + 1} · ${curUnit.title}` : 'Tout le parcours est terminé : bravo ! 🎓')),
      ring(prog.pct)),
    el('div.lh-stats',
      el('span.stat3d', { title: 'Série de jours' }, '🔥 ', el('b', String(s.streak.count || 0))),
      el('span.stat3d', { title: 'Leçons et contrôles réussis' }, '⭐ ', el('b', `${prog.done}/${prog.total}`)),
      el('span.stat3d', { title: 'Unités terminées' }, '🏆 ', el('b', `${unitsDone}/${UNITS.length}`)),
      el('span.stat3d', { title: 'Ateliers et missions bonus' }, '🎁 ', el('b', String(prog.bonus)))),
    cur
      ? el('a.btn3d.primary.big.wide', { href: `#/lesson?id=${cur.id}`, style: { '--uc': curUnit.color } }, `▶ ${prog.done ? 'Continuer' : 'Commencer'} : ${cur.title}`)
      : el('a.btn3d.primary.big.wide', { href: '#/lesson?practice=1' }, '🏋️ S’entraîner'),
    el('div.lh-more',
      el('a.mini3d' + (hasDone ? '' : '.off'), { href: hasDone ? '#/lesson?practice=1' : null, 'aria-disabled': hasDone ? null : 'true', title: hasDone ? 'Exercices des leçons déjà faites, en priorité celles où tu as hésité' : 'Termine une leçon pour débloquer l’entraînement' }, el('span', '🏋️'), 'S’entraîner'),
      el('a.mini3d', { href: '#/home' }, el('span', '⚡'), 'Entraînement libre'),
      el('a.mini3d', { href: '#/play' }, el('span', '🎮'), 'Jeux'),
      el('a.mini3d', { href: '#/create' }, el('span', '🎛️'), 'Ateliers')));

  // ---------- Le chemin ----------
  const sections = [];
  for (const part of PARTS) {
    sections.push(el('div.part-head', el('span.part-emoji', part.emoji), el('div', el('small', `PARTIE ${part.id}`), el('h2', part.name), el('p.small.muted', part.desc))));
    for (const u of UNITS.filter((x) => x.part === part.id)) sections.push(unitBlock(u));
  }

  function unitBlock(u) {
    const k = unitIndex(u.id);
    const st = unitStatus(course, u.id);
    const banner = el('div.unit-banner' + (st.open ? '' : '.locked') + (st.complete ? '.complete' : ''), { id: `unit-${u.id}`, style: { '--uc': u.color } },
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
      return `<path d="M${x0},${y0} C${x0},${(y0 + y) / 2} ${x},${(y0 + y) / 2} ${x},${y}" class="${lit ? 'lit' : ''}"/>`;
    }).join('');
    const path = el('div.upath', { style: { height: `${H}px`, '--uc': u.color } }, svg);
    nodes.forEach((n, i) => {
      const state = states[n.id];
      const [x, y] = pts[i];
      const isCur = n.id === current;
      const b = el('button.pnode.' + state + '.t-' + n.type + (params.done && prevOf(n.id) === params.done ? '.pop' : ''), {
        type: 'button', 'aria-label': `${n.title} : ${STATE_LABEL[state]}`, 'data-node': n.id,
        onclick: (e) => { e.stopPropagation(); openPop(n, state, b, path, x, y); },
      }, el('span.pn-ico', state === 'locked' && isRequired(n) ? '🔒' : n.icon), state === 'perfect' ? el('span.pn-crown', '👑') : state === 'done' ? el('span.pn-check', '✓') : null,
        !isRequired(n) && state !== 'locked' && !['done', 'perfect'].includes(state) ? el('span.pn-gift', { 'aria-hidden': 'true' }, '🎁') : null);
      // Étiquette à côté du nœud, du côté où il y a de la place
      const side = SWING[i % SWING.length] > 0 ? 'l' : 'r';
      path.append(el('div.pnode-wrap' + (isCur ? '.current' : '') + '.t-' + n.type, { style: { left: `${x}px`, top: `${y}px` } },
        isCur ? el('div.pn-bubble', prog.done ? 'CONTINUER' : 'COMMENCER') : null,
        b, el('span.pn-label.' + side, !isRequired(n) ? el('small', n.type === 'studio' ? 'Mission studio' : 'Atelier bonus') : null, n.title)));
    });
    // La mascotte accompagne chaque unité, du côté opposé au virage
    const mi = Math.min(2, nodes.length - 1);
    const side = SWING[mi % SWING.length] > 0 ? 'left' : 'right';
    path.append(el('div.path-mascot.' + side, { style: { top: `${pts[mi][1] - 30}px` } }, mascot(st.complete ? 'cool' : st.open ? 'happy' : 'wow', 64), el('span.pm-tip', u.guide[0][0])));
    return el('section.unit', { 'aria-label': `Unité ${k + 1} : ${u.title}` }, banner, path);
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
    el('div.learn-end', mascot('cool', 90), el('h2', 'Au bout du chemin'), el('p.muted', 'Un morceau fini, exporté depuis Ableton Live, avec tes propres sons. Le reste de l’app (jeux, ateliers, carnet) t’accompagne à chaque étape.'))));

  // Défilement : vers l'unité demandée, ou vers la leçon en cours
  requestAnimationFrame(() => {
    if (params.u) { document.getElementById(`unit-${params.u}`)?.scrollIntoView({ block: 'start' }); return; }
    const target = params.done ? root.querySelector('.pnode.pop') || root.querySelector('.pnode-wrap.current') : root.querySelector('.pnode-wrap.current');
    if (target && (params.done || prog.done)) target.scrollIntoView({ block: 'center' });
  });
}
