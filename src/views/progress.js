// Tableau de bord de progrès : 12 semaines de courbes, compétences qui stagnent, objectifs personnels et certificats.
import { el, card, header, modal, segmented, toast } from '../ui.js';
import { getState, update } from '../store.js';
import { SKILLS, dayKey, levelFromXp, xpForLevel, titleFor, CERT_LEVELS } from '../core/progress.js';
import { weeklySeries, stagnating, bestTempo, trend } from '../core/stats.js';
import { SKILL_ROUTES } from '../core/weekly.js';
import { addDays } from '../core/srs.js';
import { GOAL_KINDS, makeGoal, goalPlan } from '../core/goals.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  kids.forEach((k) => n.append(k));
  return n;
};
const shortDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** Petit graphique sur 12 semaines : barres (bars) ou courbe avec points. Les semaines sans donnée sont laissées vides. */
function chart(series, key, { color = 'var(--accent)', bars = false, unit = '', min = null } = {}) {
  const W = 320, H = 110, P = 18;
  const vals = series.map((w) => w[key]);
  const known = vals.filter((v) => v != null);
  const lo = min ?? (known.length ? Math.max(0, Math.min(...known) - 10) : 0);
  const hi = Math.max(lo + 1, ...known);
  const x = (i) => P + (i * (W - 2 * P)) / Math.max(1, series.length - 1);
  const y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P);
  const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'pchart', role: 'img', 'aria-label': `${key} sur ${series.length} semaines` });
  svg.append(svgEl('line', { x1: P, x2: W - P, y1: H - P, y2: H - P, stroke: 'var(--line)' }));
  if (bars) {
    const bw = (W - 2 * P) / series.length - 4;
    vals.forEach((v, i) => {
      if (!v) return;
      const h = Math.max(2, ((v - lo) / (hi - lo)) * (H - 2 * P));
      svg.append(svgEl('rect', { x: x(i) - bw / 2, y: H - P - h, width: bw, height: h, rx: 3, fill: color, opacity: i === series.length - 1 ? 1 : 0.7 }, svgEl('title', {}, `Semaine du ${shortDate(series[i].start)} : ${v} ${unit}`)));
    });
  } else {
    let d = '';
    vals.forEach((v, i) => { if (v != null) d += `${d ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
    if (d) svg.append(svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
    vals.forEach((v, i) => { if (v != null) svg.append(svgEl('circle', { cx: x(i), cy: y(v), r: 3.5, fill: color }, svgEl('title', {}, `Semaine du ${shortDate(series[i].start)} : ${v} ${unit}`))); });
  }
  if (known.length) {
    svg.append(svgEl('text', { x: W - P, y: 12, 'text-anchor': 'end', class: 'pchart-label' }, `max ${Math.max(...known)} ${unit}`));
  } else {
    svg.append(svgEl('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', class: 'pchart-label' }, 'Pas encore de données'));
  }
  return svg;
}

const trendTxt = (t, unit) => (t == null ? '' : t > 0 ? ` ▲ +${t}${unit}` : t < 0 ? ` ▼ ${t}${unit}` : ' = stable');
const STATUS = { done: ['🏁', 'Atteint !', 'good'], ahead: ['🚀', 'En avance', 'good'], ok: ['👍', 'Dans les temps', 'ok'], late: ['⏳', 'En retard', 'warn'], expired: ['⌛', 'Échéance passée', 'warn'] };

export function render(root) {
  const s = getState();
  const today = dayKey();
  const series = weeklySeries(s, 12, today);
  const cur = series.at(-1);
  const avgMin = Math.round(series.slice(-5, -1).reduce((a, w) => a + w.minutes, 0) / 4);
  const best = bestTempo(s);

  root.append(header('📊 Mes progrès', '12 dernières semaines : temps de pratique, précision, tempo, oreille.', '#/profile'));
  root.append(el('div.profile-links',
    el('a.btn', { href: '#/review' }, '🔁 Révisions'),
    el('a.btn', { href: '#/bilan' }, '📈 Bilan de la semaine'),
    el('a.btn', { href: '#/skills' }, '🌳 Compétences')));

  // ---------- Chiffres clés ----------
  root.append(card(el('div.stat-grid',
    el('div', el('b', `${cur.minutes} min`), el('span', `cette semaine (moy. ${avgMin})`)),
    el('div', el('b', cur.acc != null ? `${cur.acc}%` : '—'), el('span', `score moyen${trendTxt(trend(series, 'acc'), ' pts')}`)),
    el('div', el('b', best ? `${best} BPM` : '—'), el('span', 'tempo maîtrisé')),
    el('div', el('b', cur.ear != null ? `${cur.ear}%` : '—'), el('span', `oreille${trendTxt(trend(series, 'ear'), ' pts')}`)),
    el('div', el('b', `${cur.activeDays}/7`), el('span', 'jours actifs')),
    el('div', el('b', cur.xp), el('span', 'XP cette semaine')))));

  // ---------- Courbes ----------
  const graph = (title, key, opts, note) => el('div.pgraph', el('b', title), chart(series, key, opts), note ? el('p.small.muted', note) : null);
  root.append(card(el('h3', '📈 Courbes'),
    el('div.pgrid',
      graph('🕐 Temps de pratique (min / semaine)', 'minutes', { bars: true, unit: 'min', min: 0, color: 'var(--accent)' }, 'Mesuré quand l’app est ouverte et que tu joues.'),
      graph('🎯 Score moyen (%)', 'acc', { unit: '%', color: 'var(--good)' }, 'Moyenne des exercices notés : jeux, quiz, défis.'),
      graph('⏱️ Tempo maîtrisé (BPM)', 'tempo', { unit: 'BPM', color: 'var(--warn)' }, 'Le niveau le plus rapide réussi à 80 % ou plus dans Piano Rush / Pad Rush.'),
      graph('👂 Oreille (% de bonnes réponses)', 'ear', { unit: '%', color: 'var(--accent2)' }))));

  // ---------- Compétences ----------
  const stag = stagnating(s, today);
  const skillRows = Object.entries(SKILLS).map(([k, sk]) => {
    const vals = series.map((w) => w.skills[k]);
    const max = Math.max(1, ...series.flatMap((w) => Object.values(w.skills)));
    return el('div.skill-spark',
      el('span', `${sk.emoji} ${sk.name}`),
      el('div.spark', vals.map((v, i) => el('i', { title: `Semaine du ${shortDate(series[i].start)} : ${v} XP`, style: { height: `${Math.max(v ? 8 : 2, Math.round((100 * v) / max))}%`, background: v ? sk.color : 'var(--line)' } }))));
  });
  root.append(card(el('h3', '🧩 Compétences semaine par semaine'), skillRows,
    stag.length
      ? el('div.stagnant', el('p', el('b', '⚠️ Ça stagne : '), 'ces compétences ont presque disparu de tes séances ces 2 dernières semaines.'),
        stag.slice(0, 3).map((x) => el('div.row.between.review-row',
          el('div', el('b', `${SKILLS[x.skill].emoji} ${SKILLS[x.skill].name}`), el('div.small.muted', x.days >= 99 ? 'pas travaillée depuis longtemps' : `dernière fois il y a ${x.days} jour${x.days > 1 ? 's' : ''}`)),
          el('a.btn.small.primary', { href: SKILL_ROUTES[x.skill][0].route }, SKILL_ROUTES[x.skill][0].title))),
        el('button.btn.small', { onclick: () => { update((st) => { st.settings.focusOverride = { skill: stag[0].skill, until: addDays(today, 6) }; }); toast(`Tes prochaines sessions cibleront ${SKILLS[stag[0].skill].name} 🎯`, 'good'); } }, '🎯 Cibler ça dans mes sessions (7 jours)'))
      : el('p.small.muted', 'Aucune compétence délaissée ces 2 dernières semaines 👍')));

  // ---------- Objectifs ----------
  const goalsBox = el('div');
  const paintGoals = () => {
    const st = getState();
    const goals = st.goals || [];
    goalsBox.replaceChildren(el('div',
      el('div.row.between', el('h3', '🎯 Mes objectifs'), el('button.btn.small.primary', { onclick: newGoal }, '＋ Nouvel objectif')),
      goals.length ? null : el('p.small.muted', 'Fixe-toi un but (un tempo, un niveau, une série, des morceaux finis…) avec une échéance : l’app le découpe en étapes chaque semaine.'),
      goals.map((g) => {
        const K = GOAL_KINDS[g.kind];
        const p = goalPlan(g, st, today);
        const [emo, txt, cls] = STATUS[p.status];
        return el('div.goal',
          el('div.row.between', el('b', `${K.emoji} ${K.label(g.target)}`), el('span.goal-status.' + cls, `${emo} ${txt}`)),
          el('div.bar', el('div.bar-fill', { style: { width: `${p.pct}%` } })),
          el('p.small', K.weekly ? `Cette semaine : ${p.current} / ${p.milestone} ${K.unit}` : `Actuel : ${p.current} ${K.unit} · palier de la semaine ${p.week}/${g.weeks} : ${p.milestone} ${K.unit}`,
            p.status === 'done' || p.status === 'expired' ? '' : ` · ${p.daysLeft} jour${p.daysLeft > 1 ? 's' : ''} restant${p.daysLeft > 1 ? 's' : ''}`),
          p.status !== 'done' && p.status !== 'expired' ? el('p.small.muted', `👉 ${p.advice}`) : null,
          el('div.goal-steps', p.milestones.map((m) => el('span' + (m.week < p.week ? '.past' : m.week === p.week ? '.now' : ''), { title: `Semaine ${m.week} (du ${shortDate(m.from)}) : ${m.value} ${K.unit}` }, String(m.value)))),
          el('div.row.gap', el('button.btn.small.ghost', { onclick: () => { if (confirm('Supprimer cet objectif ?')) { update((x) => { x.goals = (x.goals || []).filter((y) => y.id !== g.id); }); paintGoals(); } } }, 'Supprimer')));
      })));
  };
  function newGoal() {
    let kind = 'tempo', target = GOAL_KINDS.tempo.def, weeks = 4;
    const body = el('div');
    const paint = () => {
      const K = GOAL_KINDS[kind];
      const now = K.measure(getState(), today);
      const input = el('input.goal-target', { type: 'number', min: K.min, max: K.max, step: K.step, value: target, oninput: (e) => { target = Number(e.target.value); } });
      body.replaceChildren(el('div',
        el('div.goal-kinds', Object.entries(GOAL_KINDS).map(([id, k]) => el('button.btn.small' + (id === kind ? '.primary' : ''), { type: 'button', onclick: () => { kind = id; target = k.def; paint(); } }, `${k.emoji} ${k.name}`))),
        el('label.ctrl-row', el('span', `Cible (${K.unit})`), input),
        el('p.small.muted', `Aujourd’hui : ${now} ${K.unit}.`),
        el('div.ctrl-row', el('label', 'Échéance'), segmented([2, 4, 8, 12].map((w) => ({ value: w, label: `${w} sem.` })), weeks, (v) => { weeks = v; }))));
    };
    paint();
    const close = modal(el('div', el('h2', '🎯 Nouvel objectif'), body,
      el('div.row.gap', el('button.btn.primary', { onclick: () => {
        const K = GOAL_KINDS[kind];
        if (!(target >= K.min && target <= K.max)) { toast(`Choisis une cible entre ${K.min} et ${K.max}`, 'bad'); return; }
        const g = makeGoal(kind, target, weeks, getState(), today);
        if (!K.weekly && g.start >= g.target) { toast('Déjà atteint ! Vise un peu plus haut 😉', 'info'); return; }
        update((x) => { x.goals = [...(x.goals || []), g].slice(-6); });
        close(); paintGoals(); toast('Objectif créé : il est découpé en étapes hebdomadaires 🎯', 'good');
      } }, 'Créer'), el('button.btn.ghost', { onclick: () => close() }, 'Annuler'))));
  }
  paintGoals();
  root.append(card(goalsBox));

  // ---------- Certificats ----------
  const lv = levelFromXp(s.xp).level;
  const nextL = CERT_LEVELS.find((L) => L > lv);
  const got = CERT_LEVELS.filter((L) => s.certs?.[L] || L <= lv);
  root.append(card(el('h3', '🎓 Certificats'),
    el('p.small.muted', 'Un certificat à chaque nouveau titre : télécharge-le ou partage-le.'),
    el('div.certs', got.map((L) => el('div.cert',
      el('b', `Niveau ${L}`), el('span.small', titleFor(L)),
      el('div.row.gap',
        el('button.btn.small.primary', { onclick: () => import('../cert.js').then((m) => m.shareCert(L)) }, '📤 Partager'),
        el('button.btn.small', { title: 'Télécharger', onclick: () => import('../cert.js').then((m) => m.downloadCert(L)) }, '⬇')))),
    nextL ? el('div.cert.locked', el('b', `Niveau ${nextL}`), el('span.small', titleFor(nextL)), el('span.small.muted', `encore ${xpForLevel(nextL) - s.xp} XP`)) : null)));
}
