import { el, card } from '../ui.js';
import { getState, update, today, level } from '../store.js';
import { buildSession, genreOfDay, WARMUPS, rng, pick } from '../core/daily.js';
import { dayKey, titleFor, SKILLS } from '../core/progress.js';
import { missionById } from '../data/missions.js';

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
  const sess = buildSession(`${d}#${count}`, { skills: s.skills, genres: s.genres, missions: s.missions, level: level() });
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

  // ---- Session
  const sessCard = card();
  const renderSession = () => {
    sessCard.replaceChildren();
    const cur = getState().session && getState().session.day === d ? getState().session : null;
    const active = cur && !cur.finished ? cur : null;
    sessCard.classList.add('glow');
    sessCard.append(
      el('div.row.between',
        el('div', el('h2', active ? 'Ta session en cours' : 'Session express'), el('p.sub', active ? `Focus : ${SKILLS[active.focus]?.name || ''}` : '3 étapes · 5 à 10 minutes')),
        el('div.small.muted', `${t.sessions} aujourd’hui`)),
    );
    if (active) {
      sessCard.append(el('ol.session-steps', active.steps.map((st, i) => el('li' + (active.done[i] ? '.done' : i === active.idx ? '.current' : ''),
        el('span.step-num', active.done[i] ? '✓' : String(i + 1)),
        el('span.step-info', el('b', `${['👂', '🧪', '🎛️'][i]} ${st.title}`), el('span', `${st.desc} · ~${st.min} min`)),
      ))));
      sessCard.append(el('div.row.gap',
        el('a.btn.primary.big', { href: active.steps[active.idx].route, style: { flex: 1 } }, active.idx === 0 ? '▶ Démarrer' : '▶ Continuer'),
        el('button.btn', { title: 'Autre session', onclick: () => { newSession(); renderSession(); } }, '🎲'),
      ));
      if (active.idx === 2 && active.steps[2].missionId) {
        sessCard.append(el('p.small.muted', 'Pas devant ton setup ? Ouvre la mission et ajoute-la à « Plus tard » : l’étape sera validée et tu la feras au studio.'));
      }
    } else {
      if (cur && cur.finished) sessCard.append(el('p', '✅ Session terminée. Encore 5 minutes ? Chaque session te propose une nouvelle combinaison.'));
      sessCard.append(el('ul.session-steps',
        el('li', el('span.step-num', '1'), el('span.step-info', el('b', '👂 Échauffement de l’oreille'), el('span', '~2 min'))),
        el('li', el('span.step-num', '2'), el('span.step-info', el('b', '🧪 Création guidée dans un style'), el('span', '~4 min'))),
        el('li', el('span.step-num', '3'), el('span.step-info', el('b', '🎛️ Mission pour Live / MPC / Serum'), el('span', 'maintenant ou plus tard'))),
      ));
      sessCard.append(el('button.btn.primary.big.wide', {
        onclick: () => { const ns = newSession(); location.hash = ns.steps[0].route; },
      }, '⚡ Lancer une session'));
    }
  };
  renderSession();

  // ---- Style du jour
  const g = genreOfDay(d);
  const tried = s.genres[g.id];
  const genreCard = card(
    el('div.row.gap', el('div.ge', { style: { fontSize: '34px' } }, g.emoji),
      el('div', el('p.small.muted', 'Style du jour'), el('h2', g.name), el('p.small.muted', `${g.bpm} BPM · ${g.family}${tried ? ' · déjà exploré ✓' : ' · nouveau !'}`))),
    el('p', g.desc),
    el('div.row.gap.wrap',
      el('a.btn.small', { href: `#/beat?genre=${g.id}` }, '🥁 Beat'),
      el('a.btn.small', { href: `#/chords?genre=${g.id}` }, '🎼 Accords'),
      el('a.btn.small', { href: `#/melody?genre=${g.id}&load=1` }, '🎵 Mélodie'),
      el('a.btn.small.ghost', { href: `#/atlas?g=${g.id}` }, 'Fiche →')),
  );

  // ---- Quêtes
  const goal = s.settings.dailyGoal;
  const quests = [
    { label: `Gagner ${goal} XP`, ok: t.xp >= goal, prog: `${Math.min(t.xp, goal)}/${goal}` },
    { label: 'Terminer 1 session', ok: t.sessions >= 1, prog: `${Math.min(t.sessions, 1)}/1` },
    { label: 'Faire 5 exercices', ok: t.exercises >= 5, prog: `${Math.min(t.exercises, 5)}/5` },
  ];
  const questCard = card(el('h3', '🎯 Quêtes du jour'),
    el('ul.quests', quests.map((q) => el('li', el('span', (q.ok ? '✅ ' : '⬜ ') + q.label), el('span' + (q.ok ? '.ok' : '.muted'), q.prog)))));

  // ---- Raccourcis
  const r = rng(d + Date.now());
  const quick = pick(r, WARMUPS);
  const shortcuts = el('div.grid2.wide3',
    el('a.tile', { href: quick.route }, el('div.tile-emoji', '⏱️'), el('b', 'Défi 2 minutes'), el('span', quick.title), el('span.tile-xp', '+XP')),
    el('a.tile', { href: '#/studio?dice=1' }, el('div.tile-emoji', '🎲'), el('b', 'Dé à idées'), el('span', 'Une contrainte pour ton prochain son')),
    el('a.tile', { href: '#/melody' }, el('div.tile-emoji', '💡'), el('b', 'Mon idée en cours'), el('span', 'Beat + accords + mélodie')),
    el('a.tile', { href: '#/synth' }, el('div.tile-emoji', '🔊'), el('b', 'Synthé'), el('span', 'Sound design façon Serum')),
    el('a.tile', { href: '#/ear' }, el('div.tile-emoji', '👂'), el('b', 'Oreille'), el('span', '5 entraînements')),
    el('a.tile', { href: '#/atlas' }, el('div.tile-emoji', '🗺️'), el('b', 'Atlas'), el('span', '20 styles à explorer')),
  );

  const later = (s.later || []).map(missionById).filter(Boolean);
  const laterCard = later.length ? card(el('h3', `🎛️ À faire au studio (${later.length})`),
    el('ul.clean', later.slice(0, 4).map((m) => el('li', el('a', { href: `#/studio?mission=${m.id}` }, m.title), el('span.muted.small', ` · ${m.min} min`)))),
    later.length > 4 ? el('a.small', { href: '#/studio' }, 'Tout voir →') : null) : null;

  const habit = HABITS[Math.floor(Date.now() / 86400000) % HABITS.length];

  root.append(
    el('div.hero', el('h1', `${hello} 👋`), el('p.sub', `Niveau ${lv} · ${titleFor(lv)} — série de ${s.streak.count || 0} jour(s)`)),
    el('div.cols', el('div', sessCard, questCard), el('div', genreCard, laterCard, card(el('h3', '🧭 Habitude de producteur'), el('p', habit)))),
    el('h3', { style: { margin: '6px 0 8px' } }, 'Accès rapide'),
    shortcuts,
  );
}
