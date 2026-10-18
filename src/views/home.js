import { el, card } from '../ui.js';
import { getState, update, today, level, dueReviews } from '../store.js';
import { currentDay, startProgramDay } from './program.js';
import { PROGRAM, PROGRAM_DAYS, dayInfo } from '../data/program.js';
import { buildSession, genreOfDay, WARMUPS, rng, pick } from '../core/daily.js';
import { dayKey, titleFor, SKILLS } from '../core/progress.js';
import { missionById } from '../data/missions.js';
import { genreById } from '../data/genres.js';
import { screenById } from '../catalog.js';

const HABITS = [
  'Termine avant de perfectionner : une boucle finie vaut 10 idées en cours.',
  'Change UNE variable à la fois (son, rythme ou note) et écoute ce que ça change.',
  'Vole un ingrédient, jamais une recette entière.',
  'Le silence est un instrument : enlève avant d’ajouter.',
  'Si tu bloques, change d’outil : passe du clavier aux pads, ou d’Ableton au MPC.',
  'Une idée de mélodie ? Chante-la dans ton téléphone avant de l’oublier.',
  'Écoute ta boucle en faisant autre chose : les défauts sautent aux oreilles.',
  'Réécoute tes idées de la semaine le dimanche : garde-en une, développe-la.',
  'Un bon hook = un rythme fort + peu de notes + une répétition.',
  'Fais des sessions courtes mais fréquentes : la régularité bat l’intensité.',
  'Nomme tes presets avec ce qu’ils t’ont appris, pas « bass 4 final ».',
  'Pas d’inspiration ? Une contrainte ! (3 pistes, 1 synthé, 10 minutes)',
];

export function newSession() {
  const s = getState();
  const d = dayKey();
  const count = (s.sessionCount[d] || 0) + 1;
  const sess = buildSession(`${d}#${count}`, { skills: s.skills, genres: s.genres, missions: s.missions, level: level(), due: dueReviews().length });
  update((st) => {
    st.sessionCount = { [d]: count };
    st.session = { ...sess, day: d, idx: 0, done: sess.steps.map(() => false), finished: false };
  });
  return getState().session;
}

export function render(root, params) {
  const s = getState();
  const d = dayKey();
  let sess = s.session && s.session.day === d ? s.session : null;
  if (params.start) {
    if (!sess || sess.finished) sess = newSession();
    location.hash = sess.steps[sess.idx].route;
    return;
  }

  const t = today();
  const lv = level();
  const hour = new Date().getHours();
  const hello = hour < 6 ? 'Session nocturne' : hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir';
  const goal = s.settings.dailyGoal;

  // ---------- 1. Session du jour (avec les quêtes en résumé) ----------
  const sessCard = card();
  const renderSession = () => {
    sessCard.replaceChildren();
    const cur = getState().session && getState().session.day === d ? getState().session : null;
    const active = cur && !cur.finished ? cur : null;
    sessCard.classList.add('glow');
    sessCard.append(el('div.row.between',
      el('div', el('h2', active ? 'Ta session en cours' : 'Session express'), el('p.sub', active ? `Focus : ${SKILLS[active.focus]?.name || ''}` : '3 étapes · 5 à 10 minutes')),
      el('div.small.muted', `${t.sessions} aujourd’hui`)));
    if (active) {
      sessCard.append(el('ol.session-steps', active.steps.map((st, i) => el('li' + (active.done[i] ? '.done' : i === active.idx ? '.current' : ''),
        el('span.step-num', active.done[i] ? '✓' : String(i + 1)),
        el('span.step-info', el('b', `${['👂', '🧪', '🎛️'][i]} ${st.title}`), el('span', `${st.desc} · ~${st.min} min`))))));
      sessCard.append(el('div.row.gap',
        el('a.btn.primary.big', { href: active.steps[active.idx].route, style: { flex: 1 } }, active.idx === 0 ? '▶ Démarrer' : '▶ Continuer'),
        el('button.btn', { title: 'Autre session', onclick: () => { newSession(); renderSession(); } }, '🎲')));
    } else {
      if (cur && cur.finished) sessCard.append(el('p', '✅ Session terminée. Encore 5 minutes ? Chaque session est une nouvelle combinaison.'));
      sessCard.append(el('p.small.muted', '👂 Échauffement de l’oreille → 🧪 Création dans un style → 🎛️ Mission Live / MPC / Serum'));
      sessCard.append(el('button.btn.primary.big.wide', { onclick: () => { const ns = newSession(); location.hash = ns.steps[0].route; } }, '⚡ Lancer une session'));
    }
    const quests = [
      { label: `${Math.min(t.xp, goal)}/${goal} XP`, ok: t.xp >= goal },
      { label: '1 session', ok: t.sessions >= 1 },
      { label: `${Math.min(t.exercises, 5)}/5 exercices`, ok: t.exercises >= 5 },
    ];
    sessCard.append(el('div.quest-chips', el('span.small.muted', '🎯 Quêtes :'), quests.map((q) => el('span.qchip' + (q.ok ? '.ok' : ''), (q.ok ? '✓ ' : '') + q.label))));
  };
  renderSession();

  // ---------- 2. Une seule carte de suivi (la plus pertinente maintenant) ----------
  const cur = currentDay(s);
  const info = cur < PROGRAM_DAYS ? dayInfo(cur) : null;
  const doneToday = Object.values(s.program.done).includes(d);
  const due = dueReviews().length;
  const later = (s.later || []).map(missionById).filter(Boolean);
  const dow = new Date().getDay();
  const items = [];
  if ([0, 1, 6].includes(dow)) items.push({ emoji: '📈', title: 'Ton bilan de la semaine est prêt', text: 'Tes progrès, tes idées à réécouter et le plan du coach.', action: el('a.btn.small.primary', { href: '#/bilan' }, 'Voir le bilan'), chip: '📈 Bilan', href: '#/bilan' });
  if (info && !doneToday && s.program.startedAt) items.push({ emoji: info.w.emoji, title: `Programme : semaine ${info.week + 1} · ${info.isProject ? 'mini-projet' : `jour ${info.day + 1}`}`, text: `Thème « ${info.w.theme} ».`, action: el('button.btn.small.primary', { onclick: () => startProgramDay(cur) }, '▶ Jour du programme'), chip: '📅 Programme', href: '#/program' });
  if (due) items.push({ emoji: '🔁', title: `${due} révision(s) à faire`, text: 'Les notions ratées reviennent au bon moment pour s’ancrer.', action: el('a.btn.small.primary', { href: '#/ear?mode=review' }, 'Réviser'), chip: `🔁 ${due} révision(s)`, href: '#/ear?mode=review' });
  if (later.length) items.push({ emoji: '🎛️', title: `${later.length} mission(s) studio en attente`, text: later.slice(0, 2).map((m) => m.title).join(' · '), action: el('a.btn.small.primary', { href: '#/studio' }, 'Voir'), chip: `🎛️ ${later.length} mission(s)`, href: '#/studio' });
  if (info && !s.program.startedAt) items.push({ emoji: '📅', title: 'Programme 4 semaines', text: 'Un thème par semaine, une session par jour, un mini-projet le 7e jour.', action: el('a.btn.small.primary', { href: '#/program' }, 'Découvrir'), chip: '📅 Programme', href: '#/program' });
  const main = items[0];
  const followCard = main ? card(
    el('div.row.between', el('h3', `${main.emoji} ${main.title}`), main.action),
    el('p.small.muted', main.text),
    items.length > 1 ? el('div.row.gap.wrap', items.slice(1).map((x) => el('a.qchip', { href: x.href }, x.chip))) : null,
  ) : null;

  // ---------- 3. Reprendre ----------
  const p = s.project;
  const g = genreOfDay(d);
  const recent = (s.recent || []).map(screenById).filter(Boolean).slice(0, 3);
  const resume = el('div',
    el('h3.fam-title', '⏱️ Reprendre'),
    el('div.recent-row',
      el('a.chip-tile.idea', { href: '#/melody' }, el('span', '💡'), el('div', el('b', 'Mon idée '), el('small.muted', `${genreById(p.genre).name} · ${p.bpm} BPM`))),
      recent.map((x) => el('a.chip-tile', { href: x.href }, el('span', x.emoji), x.name))));

  // ---------- 4. Style du jour + habitude (compact) ----------
  const tried = s.genres[g.id];
  const habit = HABITS[Math.floor(Date.now() / 86400000) % HABITS.length];
  const dayCard = card(
    el('div.row.gap', el('div', { style: { fontSize: '30px' } }, g.emoji),
      el('div', { style: { flex: 1 } }, el('p.small.muted', `Style du jour${tried ? ' · déjà exploré ✓' : ' · nouveau !'}`), el('b', `${g.name} · ${g.bpm} BPM`)),
      el('a.btn.small', { href: `#/atlas?g=${g.id}` }, 'Essayer →')),
    el('p.small.muted', { style: { marginTop: '8px' } }, `🧭 ${habit}`));

  // ---------- 5. Accès rapide (6) ----------
  const quick = pick(rng(d + Date.now()), WARMUPS);
  const shortcuts = el('div.grid3.quick',
    el('a.tile', { href: quick.route }, el('div.tile-emoji', '⏱️'), el('b', 'Défi 2 min'), el('span', quick.title)),
    el('a.tile', { href: '#/studio?dice=1' }, el('div.tile-emoji', '🎲'), el('b', 'Dé à idées'), el('span', 'Une contrainte')),
    el('a.tile', { href: '#/hum' }, el('div.tile-emoji', '🎤'), el('b', 'Fredonne'), el('span', 'Idée à la voix')),
    el('a.tile', { href: '#/remix' }, el('div.tile-emoji', '🧬'), el('b', 'Remix'), el('span', 'Développer')),
    el('a.tile', { href: '#/studio' }, el('div.tile-emoji', '🎛️'), el('b', 'Studio'), el('span', 'Missions')),
    el('a.tile', { href: '#/labs' }, el('div.tile-emoji', '🧪'), el('b', 'Tous les Labs'), el('span', '13 ateliers')),
  );

  root.append(
    el('div.hero', el('h1', `${hello} 👋`), el('p.sub', `Niveau ${lv} · ${titleFor(lv)} — série de ${s.streak.count || 0} jour(s)`)),
    el('div.cols', el('div', sessCard, followCard), el('div', resume, dayCard)),
    el('h3.fam-title', 'Accès rapide'),
    shortcuts,
  );
}
