// Tableau de bord de progrès : tendances sur 12 semaines, compétences qui stagnent, objectifs personnels et certificats.
// Les chiffres du moment (série, XP total, sessions) restent sur le Profil ; ici, on regarde l'évolution.
import { el, card, header, modal, segmented, toast, plural } from '../ui.js';
import { getState, update } from '../store.js';
import { SKILLS, dayKey, levelFromXp, xpForLevel, titleFor, CERT_LEVELS, earnedCerts } from '../core/progress.js';
import { weeklySeries, stagnating, bestTempo, trend } from '../core/stats.js';
import { SKILL_ROUTES } from '../core/weekly.js';
import { addDays } from '../core/srs.js';
import { mistakesCard } from './mistakescard.js';
import { GOAL_KINDS, makeGoal, goalPlan } from '../core/goals.js';

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  kids.forEach((k) => n.append(k));
  return n;
};
const shortDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/**
 * Petit graphique sur 12 semaines : barres (bars) ou courbe avec points. Les semaines sans donnée sont laissées vides.
 * Sans aucune donnée : un encart compact qui dit comment lancer la courbe, plutôt qu'un cadre vide.
 */
function chart(series, key, { color = 'var(--accent)', bars = false, unit = '', min = null, empty = 'Pas encore de données.' } = {}) {
  const W = 320, H = 110, P = 18;
  const vals = series.map((w) => w[key]);
  const known = vals.filter((v) => v != null && (!bars || v > 0));
  if (!known.length) return el('p.pchart-empty.small.muted', empty);
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
  svg.append(svgEl('text', { x: W - P, y: 12, 'text-anchor': 'end', class: 'pchart-label' }, `max ${Math.max(...known)} ${unit}`));
  return svg;
}

/** Tendance : 4 dernières semaines contre les 4 d'avant. */
const trendEl = (t, unit) => (t == null ? null
  : el('span.trend' + (t > 0 ? '.up' : t < 0 ? '.down' : ''), t > 0 ? `▲ +${t}${unit}` : t < 0 ? `▼ ${t}${unit}` : '= stable'));
/** Moyenne des semaines récentes qui ont une valeur (null si aucune). */
const recentAvg = (series, key, n = 4) => {
  const v = series.slice(-n).map((w) => w[key]).filter((x) => x != null);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
};
const STATUS = { done: ['🏁', 'Atteint !', 'good'], ahead: ['🚀', 'En avance', 'good'], ok: ['👍', 'Dans les temps', 'ok'], late: ['⏳', 'En retard', 'warn'], expired: ['⌛', 'Échéance passée', 'warn'] };

export function render(root) {
  const s = getState();
  const today = dayKey();
  const series = weeklySeries(s, 12, today);
  const cur = series.at(-1);
  const avgMin = Math.round(series.slice(-5, -1).reduce((a, w) => a + w.minutes, 0) / 4);
  const best = bestTempo(s);
  // Une courbe d'un seul jour ne dit rien : il faut au moins 2 jours de pratique sur la période.
  const activeDays = series.reduce((a, w) => a + w.activeDays, 0);
  const hasData = activeDays >= 2;

  root.append(header('📊 Mes progrès', '12 dernières semaines : temps de pratique, précision, tempo, oreille.'));

  if (!hasData) {
    // ---------- Pas encore assez de données : une seule carte au lieu de 4 graphiques vides ----------
    root.append(card(el('div.progress-empty',
      el('div.pe-art', { 'aria-hidden': 'true' }, [18, 30, 24, 44, 38, 56, 50, 72].map((h) => el('i', { style: { '--h': `${h}%` } }))),
      el('h3', 'Joue 2 ou 3 jours pour voir tes courbes'),
      el('p.small', activeDays
        ? 'Encore un jour de pratique (même 5 minutes) et tes premières courbes apparaissent : temps de pratique, score moyen, tempo et oreille, semaine après semaine.'
        : 'Même 5 minutes par jour : ton temps de pratique, ton score moyen, ton tempo et ton oreille s’afficheront ici, semaine après semaine.'),
      el('div.row.gap.wrap.center',
        el('a.btn.primary', { href: '#/home?start=1' }, '⚡ Session express'),
        el('a.btn', { href: '#/play' }, '🎮 Jouer')))));
  } else {
    // ---------- Tendances (4 dernières semaines) ----------
    const acc = recentAvg(series, 'acc'), ear = recentAvg(series, 'ear');
    root.append(card(el('div.stat-grid.four',
      el('div', el('b', `${cur.minutes} min`), el('span', `cette semaine · moy. ${avgMin}`)),
      el('div', el('b', acc != null ? `${acc}%` : '—'), el('span', 'score moyen'), trendEl(trend(series, 'acc'), ' pts')),
      el('div', el('b', best ? `${best} BPM` : '—'), el('span', 'tempo maîtrisé'), trendEl(trend(series, 'tempo'), ' BPM')),
      el('div', el('b', ear != null ? `${ear}%` : '—'), el('span', 'oreille'), trendEl(trend(series, 'ear'), ' pts'))),
    el('p.small.muted.stat-note', 'Flèches : tes 4 dernières semaines comparées aux 4 précédentes.')));

    // ---------- Courbes ----------
    const graph = (title, key, opts, note) => el('div.pgraph', el('b', title), chart(series, key, opts), note ? el('p.small.muted', note) : null);
    root.append(card(el('h3', '📈 Courbes'),
      el('div.pgrid',
        graph('🕐 Temps de pratique (min / semaine)', 'minutes', { bars: true, unit: 'min', min: 0, color: 'var(--accent)', empty: 'Le temps est mesuré quand l’app est ouverte et que tu joues : il apparaîtra ici.' }, 'Mesuré quand l’app est ouverte et que tu joues.'),
        graph('🎯 Score moyen (%)', 'acc', { unit: '%', color: 'var(--good)', empty: 'Termine un exercice noté (jeu, quiz, défi) pour lancer cette courbe.' }, 'Moyenne des exercices notés : jeux, quiz, défis.'),
        graph('⏱️ Tempo maîtrisé (BPM)', 'tempo', { unit: 'BPM', color: 'var(--warn)', empty: 'Réussis un niveau de Piano Rush ou Pad Rush à 80 % pour lancer cette courbe.' }, 'Le niveau le plus rapide réussi à 80 % ou plus dans Piano Rush / Pad Rush.'),
        graph('👂 Oreille (% de bonnes réponses)', 'ear', { unit: '%', color: 'var(--accent2)', empty: 'Fais un quiz d’oreille pour lancer cette courbe.' }))));
  }

  // ---------- Compétences ----------
  const stag = stagnating(s, today);
  // Même seuil que stagnating() : sans assez d'XP récente, on ne félicite pas pour une absence de délaissement.
  const recentSkillXp = Array.from({ length: 14 }, (_, i) => Object.values(s.days[addDays(today, -i)]?.skills || {}).reduce((a, b) => a + b, 0)).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...series.flatMap((w) => Object.values(w.skills)));
  const skillRows = () => Object.entries(SKILLS).map(([k, sk]) => el('div.skill-spark',
    el('span', `${sk.emoji} ${sk.name}`),
    el('div.spark', series.map((w) => w.skills[k]).map((v, i) => el('i', { title: `Semaine du ${shortDate(series[i].start)} : ${v} XP`, style: { height: `${Math.max(v ? 8 : 2, Math.round((100 * v) / max))}%`, background: v ? sk.color : 'var(--line)' } })))));
  if (hasData) root.append(card(el('h3', '🧩 Compétences semaine par semaine'), skillRows(),
    stag.length
      ? el('div.stagnant', el('p', el('b', '⚠️ Ça stagne : '), 'ces compétences ont presque disparu de tes séances ces 2 dernières semaines.'),
        stag.slice(0, 3).map((x) => el('div.row.between.review-row',
          el('div', el('b', `${SKILLS[x.skill].emoji} ${SKILLS[x.skill].name}`), el('div.small.muted', x.days >= 99 ? 'pas travaillée depuis longtemps' : `dernière fois il y a ${plural(x.days, 'jour')}`)),
          el('a.btn.small.primary', { href: SKILL_ROUTES[x.skill][0].route }, SKILL_ROUTES[x.skill][0].title))),
        el('button.btn.small', { onclick: () => { update((st) => { st.settings.focusOverride = { skill: stag[0].skill, until: addDays(today, 6) }; }); toast(`Tes prochaines sessions cibleront ${SKILLS[stag[0].skill].name} 🎯`, 'good'); } }, '🎯 Cibler ça dans mes sessions (7 jours)'))
      : el('p.small.muted', recentSkillXp >= 30 ? 'Aucune compétence délaissée ces 2 dernières semaines 👍' : 'Joue quelques jours de plus : l’app repérera ici les compétences que tu laisses de côté.')));

  root.append(mistakesCard(s));

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
        return el('div.goal-item',
          el('div.row.between', el('b', `${K.emoji} ${K.label(g.target)}`), el('span.goal-status.' + cls, `${emo} ${txt}`)),
          el('div.bar', el('div.bar-fill', { style: { width: `${p.pct}%` } })),
          el('p.small', K.weekly ? `Cette semaine : ${p.current} / ${p.milestone} ${K.unit}` : `Actuel : ${p.current} ${K.unit} · palier de la semaine ${p.week}/${g.weeks} : ${p.milestone} ${K.unit}`,
            p.status === 'done' || p.status === 'expired' ? '' : ` · ${plural(p.daysLeft, 'jour restant', 'jours restants')}`),
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
  // Même calcul que la Collection (earnedCerts) : jamais deux chiffres différents.
  const got = earnedCerts(s);
  const lv = levelFromXp(s.xp).level;
  const nextL = CERT_LEVELS.find((L) => L > lv && !got.includes(L));
  const base = xpForLevel(Math.max(1, ...got.filter((L) => L <= lv)));
  const fmtDay = (d) => new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  root.append(card(el('h3', `🎓 Certificats · ${got.length}/${CERT_LEVELS.length}`),
    el('p.small.muted', got.length ? 'Un certificat à chaque nouveau titre : partage-le ou garde l’image.' : `Ton premier certificat arrive au niveau ${CERT_LEVELS[0]}, avec le titre « ${titleFor(CERT_LEVELS[0])} ».`),
    el('div.certs', [...got].reverse().map((L, i) => el('div.cert',
      el('div.cert-head', el('span.cert-medal', { 'aria-hidden': 'true' }, '🎓'),
        el('div', el('b', `Niveau ${L} · ${titleFor(L)}`), el('span.small.muted', s.certs?.[L] ? `Obtenu le ${fmtDay(s.certs[L])}` : 'Certificat débloqué'))),
      el('div.cert-actions',
        el('button.btn.small' + (i === 0 ? '.primary' : ''), { onclick: () => import('../cert.js').then((m) => m.shareCert(L)) }, '📤 Partager'),
        el('button.btn.small', { title: 'Télécharger', 'aria-label': `Télécharger le certificat niveau ${L}`, onclick: () => import('../cert.js').then((m) => m.downloadCert(L)) }, '⬇ Image')))),
    nextL ? el('div.cert.locked',
      el('div.cert-head', el('span.cert-medal', { 'aria-hidden': 'true' }, '🔒'),
        el('div', el('b', `Niveau ${nextL} · ${titleFor(nextL)}`), el('span.small.muted', `encore ${xpForLevel(nextL) - s.xp} XP`))),
      el('div.bar', el('div.bar-fill', { style: { width: `${Math.round((100 * (s.xp - base)) / (xpForLevel(nextL) - base))}%` } }))) : null)));
}
