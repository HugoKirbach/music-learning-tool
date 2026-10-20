import { el, card } from '../ui.js';
import { getState, update, today, level, dueReviews, dueEarReviews } from '../store.js';
import { LEVELS } from '../data/rush.js';
import { PAD_LEVELS } from '../data/pads.js';
import { totalStars, MAX_STARS } from '../core/club.js';
import { currentDay, startProgramDay } from './program.js';
import { PROGRAM, PROGRAM_DAYS, dayInfo } from '../data/program.js';
import { buildSession, genreOfDay, WARMUPS, rng, pick } from '../core/daily.js';
import { dayKey, titleFor, SKILLS } from '../core/progress.js';
import { missionById } from '../data/missions.js';
import { genreById } from '../data/genres.js';
import { screenById, SCREENS } from '../catalog.js';
import { placementDue, weekFocus, weekId, projectProgress, PROJECT_STEPS, weekday } from '../core/pedagogy.js';
import { streakAtRisk } from '../core/reminder.js';
import { topError, describeError } from './mistakescard.js';
import { itemMidi, openItem, markDone } from './notebook.js';
import { cloudStatus } from '../cloud.js';
import { PATHS, pathProgress } from '../data/paths.js';

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
  const sess = buildSession(`${d}#${count}`, { skills: s.skills, genres: s.genres, missions: s.missions, level: level(), due: dueEarReviews().length, focus: weekFocus(s) });
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
      el('div', el('h3.sess-title', active ? 'Ta session en cours' : 'Session express'), el('p.sub', active ? `Focus : ${SKILLS[active.focus]?.name || ''}` : '3 étapes · 5 à 10 minutes')),
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
  if (streakAtRisk(s)) items.push({ emoji: '🔥', title: `Ta série de ${s.streak.count} jours s’arrête ce soir`, text: '5 minutes suffisent : lance une session express et elle continue.', action: el('button.btn.small.primary', { onclick: () => { const ns = newSession(); location.hash = ns.steps[0].route; } }, '⚡ Session'), chip: '🔥 Série', href: '#/home?start=1' });
  const err = topError(s);
  if (err) { const de = describeError(err); items.push({ emoji: '🎯', title: de.title, text: de.text, action: el('a.btn.small.primary', { href: de.href }, de.cta), chip: '🎯 Erreur récurrente', href: de.href }); }
  if (placementDue(s)) items.push({ emoji: '🧪', title: 'Test de la semaine', text: '5 minutes pour mesurer tes progrès et choisir le focus de tes sessions.', action: el('a.btn.small.primary', { href: '#/placement' }, 'Passer le test'), chip: '🧪 Test de la semaine', href: '#/placement' });
  const wp = (s.weekProjects || {})[weekId()];
  if (!wp) items.push({ emoji: '🏁', title: 'Projet de la semaine', text: 'Un morceau construit un peu chaque jour, exporté vers Live dimanche.', action: el('a.btn.small.primary', { href: '#/project' }, 'Démarrer'), chip: '🏁 Projet', href: '#/project' });
  else if (!wp.finished) {
    const pr = projectProgress(s, wp);
    const step = PROJECT_STEPS.find((x) => x.day === weekday()) || PROJECT_STEPS[0];
    items.push({ emoji: '🏁', title: `Projet : ${wp.title} (${pr.count}/${pr.total})`, text: pr.done[step.id] ? 'L’étape du jour est faite : avance sur une autre si tu veux.' : `Aujourd’hui : ${step.emoji} ${step.title} — ${step.desc}`, action: el('a.btn.small.primary', { href: pr.done[step.id] ? '#/project' : step.route }, pr.done[step.id] ? 'Voir le projet' : 'Y aller'), chip: `🏁 Projet ${pr.count}/${pr.total}`, href: '#/project' });
  }
  if ([0, 1, 6].includes(dow)) items.push({ emoji: '📈', title: 'Ton bilan de la semaine est prêt', text: 'Tes progrès, tes idées à réécouter et le plan du coach.', action: el('a.btn.small.primary', { href: '#/bilan' }, 'Voir le bilan'), chip: '📈 Bilan', href: '#/bilan' });
  if (info && !doneToday && s.program.startedAt) items.push({ emoji: info.w.emoji, title: `Programme : semaine ${info.week + 1} · ${info.isProject ? 'mini-projet' : `jour ${info.day + 1}`}`, text: `Thème « ${info.w.theme} ».`, action: el('button.btn.small.primary', { onclick: () => startProgramDay(cur) }, '▶ Jour du programme'), chip: '📅 Programme', href: '#/program' });
  if (due) items.push({ emoji: '🔁', title: `${due} révision(s) à faire`, text: 'Notions d’oreille et niveaux de jeu ratés reviennent au bon moment (1, 3 puis 7 jours) pour s’ancrer.', action: el('a.btn.small.primary', { href: '#/review' }, 'Réviser'), chip: `🔁 ${due} révision(s)`, href: '#/review' });
  if (later.length) items.push({ emoji: '🎛️', title: `${later.length} mission(s) studio en attente`, text: later.slice(0, 2).map((m) => m.title).join(' · '), action: el('a.btn.small.primary', { href: '#/studio' }, 'Voir'), chip: `🎛️ ${later.length} mission(s)`, href: '#/studio' });
  if (info && !s.program.startedAt) items.push({ emoji: '📅', title: 'Programme 4 semaines', text: 'Un thème par semaine, une session par jour, un mini-projet le 7e jour.', action: el('a.btn.small.primary', { href: '#/program' }, 'Découvrir'), chip: '📅 Programme', href: '#/program' });
  const main = items[0];
  const followCard = main ? card(
    el('div.row.between', el('h3', `${main.emoji} ${main.title}`), main.action),
    el('p.small.muted', main.text),
    items.length > 1 ? el('div.row.gap.wrap', items.slice(1).map((x) => el('a.qchip', { href: x.href }, x.chip))) : null,
  ) : null;

  // ---------- Jouer : les jeux en accès direct (priorité sur téléphone) ----------
  const nb = (x) => String(x).replace(/ /g, '\u00a0');
  const prog = (best = {}, levels) => ({ done: levels.filter((l) => (best[l.id]?.stars || 0) >= 1).length, stars: levels.reduce((a, l) => a + (best[l.id]?.stars || 0), 0), total: levels.length });
  const rp = prog(s.rush?.best, LEVELS);
  const pp = prog(s.pads?.best, PAD_LEVELS);
  const club = s.club || {};
  const clubStars = totalStars(club.best);
  const dailyDone = club.daily?.day === d;
  const earDue = dueEarReviews().length;
  const quick = pick(rng(d + Date.now()), WARMUPS);
  const tile = (href, emoji, name, desc, extra = '') => el('a.htile' + extra, { href },
    el('span.htile-emoji', { 'aria-hidden': 'true' }, emoji), el('span.htile-text', el('b', name), el('span', desc)));
  // Boîte à idées : ce qui est noté sur le téléphone se finit sur le PC
  const inbox = (s.notebook || []).filter((n) => n.inbox);
  const captureCard = el('div.home-capture',
    el('b', '💡 Une idée qui passe ? Garde-la, finis-la sur ton PC'),
    el('div.row.gap.wrap',
      el('a.btn.small', { href: '#/hum' }, '🎤 Fredonner'),
      el('a.btn.small', { href: '#/beat' }, '🥁 Un beat'),
      el('a.btn.small', { href: '#/chords' }, '🎼 Des accords'),
      el('a.btn.small', { href: '#/notebook?new=1' }, '📝 Une note')),
    el('p.small.muted', inbox.length ? `📲 ${inbox.length} idée(s) en attente pour ton PC.` : 'Tout ce que tu sauves au Carnet depuis le téléphone t’attendra sur le PC.',
      cloudStatus().user ? '' : ' Connecte-toi (Profil) pour les retrouver sur l’autre appareil.'));
  const inboxCard = inbox.length ? el('div.home-inbox',
    el('div.row.between', el('b', `📲 Idées du téléphone à finir (${inbox.length})`), el('a.btn.small', { href: '#/notebook' }, 'Tout voir')),
    inbox.slice(0, 3).map((it) => {
      const midi = itemMidi(it);
      return el('div.inbox-item',
        el('div', el('b', it.title), el('div.small.muted', new Date(it.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + (it.genre ? ` · ${genreById(it.genre).name}` : ''))),
        it.type !== 'note' ? el('button.btn.small', { onclick: () => openItem(it) }, '↗ Ouvrir') : null,
        midi ? el('button.btn.small', { onclick: midi }, '⬇ MIDI') : null,
        el('button.btn.small.ghost', { onclick: () => { markDone(it.id); root.replaceChildren(); render(root, {}); } }, '✓ Fait'));
    })) : null;
  const playSection = section('play', '🎮 Jouer', 'Des jeux courts qui entraînent l’oreille et le rythme sans en avoir l’air.',
    el('div.home-tiles',
      tile('#/club', '🪩', 'Nuit au club', `${dailyDone ? `Set du jour fait (${club.daily.score} pts)` : 'Set du jour à jouer · XP ×2'} · ${clubStars}/${MAX_STARS} ★ · ${Object.keys(club.crate || {}).length} vinyle(s)`, '.feature'),
      tile('#/rush', '🎹', 'Piano Rush', nb(`${rp.done}/${rp.total} niveaux`) + ' · ' + nb(`${rp.stars} ★`)),
      tile('#/pads', '🔲', 'Pad Rush', nb(`${pp.done}/${pp.total} niveaux`) + ' · ' + nb(`${pp.stars} ★`)),
      tile(earDue ? '#/ear?mode=review' : '#/ear', '👂', 'Quiz d’oreille', earDue ? `${earDue} révision(s) à faire` : 'Intervalles, accords, styles'),
      tile(quick.route, '⏱️', 'Défi 2 min', quick.title)),
    captureCard);

  // ---------- Studio : créer et préparer le travail dans Ableton (priorité sur PC) ----------
  const p = s.project;
  const g = genreOfDay(d, s.settings.favGenres || []);
  const recent = (s.recent || []).map(screenById).filter((x) => x && !['rush', 'pads', 'club'].includes(x.id)).slice(0, 3);
  const wpStatus = wp ? (wp.finished ? `${wp.title} · terminé ✓` : `${wp.title} · ${projectProgress(s, wp).count}/${projectProgress(s, wp).total} étapes`) : 'Un morceau en 7 étapes, export vers Live';
  const midiOut = s.settings.midiOut?.enabled;
  const habit = HABITS[Math.floor(Date.now() / 86400000) % HABITS.length];
  const studioSection = section('studio', '🎛️ Studio', 'Créer, puis continuer dans Ableton Live, Serum ou sur le MPC.',
    inboxCard,
    el('div.home-tiles',
      tile('#/melody', '💡', 'Mon idée', `${genreById(p.genre).name} · ${p.bpm} BPM`, '.feature'),
      tile('#/project', '🏁', 'Projet de la semaine', wpStatus),
      tile('#/studio', '🎛️', 'Missions studio', later.length ? `${later.length} en attente` : 'Live, MPC, Serum'),
      tile('#/challenge', '🏆', 'Défi de la semaine', 'Une contrainte pour tous'),
      tile('#/studio?dice=1', '🎲', 'Dé à idées', 'Une contrainte au hasard'),
      ...Object.keys(PATHS).filter((id) => s.paths?.[id] || (s.settings.favGenres || []).includes(id)).map((id) => {
        const pr = pathProgress(s, id);
        return tile(`#/path?g=${id}`, '🎓', `Parcours ${PATHS[id].name}`, pr.started ? `${pr.count}/${pr.total} étapes${pr.next ? ` · ${pr.next.title}` : ' · terminé ✓'}` : `${pr.total} étapes, du beat à Live`);
      }),
      tile('#/hum', '🎤', 'Fredonne', 'Une idée à la voix → MIDI'),
      tile('#/labs', '🧪', 'Tous les Labs', `${SCREENS.filter((x) => x.fam).length} ateliers`)),
    recent.length ? el('div.recent-row', { 'aria-label': 'Reprendre' }, el('span.small.muted', '⏱️ Reprendre :'), recent.map((x) => el('a.chip-tile', { href: x.href }, el('span', { 'aria-hidden': 'true' }, x.emoji), x.name))) : null,
    el('div.home-live', el('p.small', midiOut ? '🟢 Sortie MIDI vers Live active : tes exercices jouent dans tes propres sons.' : '🎛️ Joue tes exercices avec les sons de Live, Serum ou du MPC.'),
      el('a.btn.small', { href: '#/profile' }, midiOut ? 'Réglages' : 'Brancher la sortie MIDI')),
    el('div.home-day', el('span', { 'aria-hidden': 'true' }, g.emoji),
      el('div', el('b', `Style du jour : ${g.name} · ${g.bpm} BPM`), el('p.small.muted', `🧭 ${habit}`)),
      el('a.btn.small', { href: `#/atlas?g=${g.id}`, 'aria-label': `Essayer le style ${g.name}` }, 'Essayer')));

  // ---------- Suivi ----------
  const followSection = section('follow', '📈 Mon suivi', null,
    el('nav.home-links', { 'aria-label': 'Suivi' },
      el('a.qchip', { href: '#/progress' }, '📊 Mes progrès'),
      el('a.qchip', { href: '#/review' }, `🔁 Révisions${due ? ` (${due})` : ''}`),
      el('a.qchip', { href: '#/skills' }, '🌳 Compétences'),
      el('a.qchip', { href: '#/bilan' }, '📈 Bilan'),
      el('a.qchip', { href: '#/collection' }, '🏅 Collection'),
      el('a.qchip', { href: '#/friends' }, '👥 Amis')));

  // ---------- Priorité : Jouer sur téléphone, Studio sur PC (modifiable) ----------
  const mode = homeMode(s);
  const modeBtn = (id, label) => el('button.home-mode-btn' + (mode === id ? '.on' : ''), { type: 'button', 'aria-pressed': String(mode === id), onclick: () => {
    update((st) => { st.settings.homeMode = id; });
    root.replaceChildren(); render(root, {});
  } }, label);
  const todaySection = section('today', '☀️ Aujourd’hui', null, sessCard, followCard);
  // Mode Jouer : les jeux d'abord (accessibles sans faire défiler sur téléphone) ; mode Studio : la session puis le studio
  const top = mode === 'play' ? el('div.cols', el('div', playSection), el('div', todaySection)) : el('div.cols', el('div', todaySection), el('div', studioSection));
  const second = mode === 'play' ? studioSection : playSection;

  root.append(
    el('div.hero.home-hero',
      el('div', el('h1', `${hello} 👋`), el('p.sub', `Niveau ${lv} · ${titleFor(lv)} — série de ${s.streak.count || 0} jour(s)`)),
      el('div.home-mode', { role: 'group', 'aria-label': 'Ce que l’accueil met en avant' }, modeBtn('play', '🎮 Jouer'), modeBtn('studio', '🎛️ Studio'))),
    top,
    second,
    followSection,
  );
}

/** Mode de l'accueil : choix enregistré, sinon Jouer sur téléphone / tablette tactile et Studio sur ordinateur. */
export function homeMode(s = getState()) {
  if (s.settings.homeMode === 'play' || s.settings.homeMode === 'studio') return s.settings.homeMode;
  return matchMedia('(pointer: coarse)').matches && innerWidth < 1024 ? 'play' : 'studio';
}

/** Section titrée et annoncée aux lecteurs d'écran. */
function section(id, title, sub, ...content) {
  return el('section.home-section', { 'aria-labelledby': `home-${id}` },
    el('h2.home-h2', { id: `home-${id}` }, title), sub ? el('p.small.muted.home-sub', sub) : null, ...content);
}
