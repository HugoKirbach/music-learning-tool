import { el, card, htile, sectionHead, plural } from '../ui.js';
import { getState, update, today, level, dueReviews, dueEarReviews } from '../store.js';
import { LEVELS } from '../data/rush.js';
import { PAD_LEVELS } from '../data/pads.js';
import { totalStars, silentStars, MAX_STARS } from '../core/club.js';
import { levelProgress } from './play.js';
import { currentDay, startProgramDay } from './program.js';
import { PROGRAM, PROGRAM_DAYS, dayInfo } from '../data/program.js';
import { buildSession, genreOfDay } from '../core/daily.js';
import { dayKey, titleFor, SKILLS } from '../core/progress.js';
import { missionById } from '../data/missions.js';
import { genreById } from '../data/genres.js';
import { screenById } from '../catalog.js';
import { placementDue, weekFocus, weekId, projectProgress, PROJECT_STEPS, weekday } from '../core/pedagogy.js';
import { streakAtRisk } from '../core/reminder.js';
import { topError, describeError } from './mistakescard.js';
import { itemMidi, openItem, markDone } from './notebook.js';
import { cloudStatus } from '../cloud.js';
import { PATHS, pathProgress } from '../data/paths.js';
import { openSearch } from '../search.js';
import { courseProgress, courseOf } from '../core/course.js';
import { UNITS } from '../data/course.js';

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
  const phone = isPhone();
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
  if (streakAtRisk(s)) items.push({ emoji: '🔥', title: s.streak.freezes ? `Ta série de ${s.streak.count} jours t’attend` : `Ta série de ${s.streak.count} jours s’arrête ce soir`, text: s.streak.freezes ? `Un joker 🧊 la sauvera si tu ne peux pas jouer, mais garde-le pour un vrai jour sans : 5 minutes suffisent.` : '5 minutes suffisent : lance une session express et elle continue.', action: el('button.btn.small.primary', { onclick: () => { const ns = newSession(); location.hash = ns.steps[0].route; } }, '⚡ Session'), chip: '🔥 Série', href: '#/home?start=1' });
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
  if (due) items.push({ emoji: '🔁', title: `${plural(due, 'révision')} à faire`, text: 'Notions d’oreille et niveaux de jeu ratés reviennent au bon moment (1, 3 puis 7 jours) pour s’ancrer.', action: el('a.btn.small.primary', { href: '#/review' }, 'Réviser'), chip: `🔁 ${plural(due, 'révision')}`, href: '#/review' });
  if (later.length) items.push({ emoji: '🎛️', title: `${plural(later.length, 'mission')} studio en attente`, text: later.slice(0, 2).map((m) => m.title).join(' · '), action: el('a.btn.small.primary', { href: '#/studio' }, 'Voir'), chip: `🎛️ ${plural(later.length, 'mission')}`, href: '#/studio' });
  if (info && !s.program.startedAt) items.push({ emoji: '📅', title: 'Programme 4 semaines', text: 'Un thème par semaine, une session par jour, un mini-projet le 7e jour.', action: el('a.btn.small.primary', { href: '#/program' }, 'Découvrir'), chip: '📅 Programme', href: '#/program' });
  const main = items[0];
  const followCard = main ? card(
    el('div.row.between', el('h3', `${main.emoji} ${main.title}`), main.action),
    el('p.small.muted', main.text),
    items.length > 1 ? el('div.row.gap.wrap', items.slice(1).map((x) => el('a.qchip', { href: x.href }, x.chip))) : null,
  ) : null;

  // ---------- Jouer : les jeux en accès direct (en premier sur téléphone) ----------
  const nb = (x) => String(x).replace(/ /g, '\u00a0');
  const rp = levelProgress(s.rush?.best, LEVELS);
  const pp = levelProgress(s.pads?.best, PAD_LEVELS);
  const club = s.club || {};
  const dailyDone = club.daily?.day === d;
  const playSection = section('play', '🎮 Jouer', { href: '#/play', label: 'Tous les jeux →' },
    el('div.home-tiles',
      htile('#/club', '🪩', 'Nuit au club', `${dailyDone ? `Set du jour fait (${club.daily.score} pts)` : 'Set du jour à jouer · XP ×2'} · ${totalStars(club.best)}/${MAX_STARS} ★ · ${plural(Object.keys(club.crate || {}).length, 'vinyle')}`, '.feature'),
      htile('#/rush', '🎹', 'Piano Rush', nb(`${rp.done}/${rp.total} niveaux`) + ' · ' + nb(`${rp.stars} ★`)),
      htile('#/pads', '🔲', 'Pad Rush', nb(`${pp.done}/${pp.total} niveaux`) + ' · ' + nb(`${pp.stars} ★`)),
      htile('#/club?silent=1', '🔇', 'Sans le son', `Jeux visuels · ${nb(`${silentStars(club).stars}/${MAX_STARS} ★`)}`),
      htile(dueEarReviews().length ? '#/ear?mode=review' : '#/ear', '👂', 'Quiz d’oreille', dueEarReviews().length ? `${plural(dueEarReviews().length, 'révision')} à faire` : 'Intervalles, accords, styles')));

  // ---------- Créer : l'idée en cours, le projet, le studio (en premier sur PC) ----------
  const p = s.project;
  const g = genreOfDay(d, s.settings.favGenres || []);
  const wpStatus = wp ? (wp.finished ? `${wp.title} · terminé ✓` : `${wp.title} · ${projectProgress(s, wp).count}/${projectProgress(s, wp).total} étapes`) : 'Un morceau en 7 étapes, export vers Live';
  const midiOut = s.settings.midiOut?.enabled;
  const habit = HABITS[Math.floor(Date.now() / 86400000) % HABITS.length];
  const paths = Object.keys(PATHS).filter((id) => s.paths?.[id] || (s.settings.favGenres || []).includes(id)).map((id) => {
    const pr = pathProgress(s, id);
    return htile(`#/path?g=${id}`, '🎓', `Parcours ${PATHS[id].name}`, pr.started ? `${pr.count}/${pr.total} étapes${pr.next ? ` · ${pr.next.title}` : ' · terminé ✓'}` : `${pr.total} étapes, du beat à Live`);
  });
  // Boîte à idées : ce qui est noté sur le téléphone se finit sur le PC
  const inbox = (s.notebook || []).filter((n) => n.inbox);
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
  const createSection = section('create', '🎛️ Créer', { href: '#/create', label: 'Tous les ateliers →' },
    inboxCard,
    el('div.home-tiles',
      htile('#/create', '💡', 'Mon idée', `${genreById(p.genre).emoji} ${genreById(p.genre).name} · ${p.bpm} BPM · beat, accords, basse, mélodie`, '.feature'),
      htile('#/project', '🏁', 'Projet de la semaine', wpStatus),
      htile('#/studio', '🎯', 'Missions studio', later.length ? `${plural(later.length, 'mise', 'mises')} de côté` : 'Des gestes concrets dans Live, MPC, Serum'),
      ...paths,
      htile('#/challenge', '🏆', 'Défi de la semaine', 'Une contrainte pour tout le monde')),
    phone ? null : el('div.home-live', el('p.small', midiOut ? '🟢 Sortie MIDI vers Live active : tes exercices jouent dans tes propres sons.' : '🎛️ Joue tes exercices avec les sons de Live, Serum ou du MPC.'),
      el('a.btn.small', { href: '#/settings?sec=live' }, midiOut ? 'Réglages' : 'Brancher la sortie MIDI')));

  // ---------- Garder une idée au vol (téléphone) ----------
  const captureCard = el('div.home-capture',
    el('b', '💡 Une idée qui passe ? Garde-la, finis-la sur ton PC'),
    el('div.row.gap.wrap',
      el('a.btn.small', { href: '#/hum' }, '🎤 Fredonner'),
      el('a.btn.small', { href: '#/beat' }, '🥁 Un beat'),
      el('a.btn.small', { href: '#/chords' }, '🎼 Des accords'),
      el('a.btn.small', { href: '#/notebook?new=1' }, '📝 Une note')),
    el('p.small.muted', inbox.length ? `📲 ${plural(inbox.length, 'idée')} en attente pour ton PC.` : 'Tout ce que tu sauves au Carnet depuis le téléphone t’attendra sur le PC.',
      cloudStatus().user ? '' : ' Connecte-toi (Réglages › Compte) pour les retrouver sur l’autre appareil.'));

  const recent = (s.recent || []).map(screenById).filter((x) => x && !['rush', 'pads', 'club'].includes(x.id)).slice(0, 4);
  const resume = recent.length ? el('div.recent-row', { 'aria-label': 'Reprendre' }, el('span.small.muted', '⏱️ Reprendre :'),
    recent.map((x) => el('a.chip-tile', { href: x.href }, el('span', { 'aria-hidden': 'true' }, x.emoji), x.name))) : null;
  const day = el('div.home-day', el('span', { 'aria-hidden': 'true' }, g.emoji),
    el('div', el('b', `Style du jour : ${g.name} · ${g.bpm} BPM`), el('p.small.muted', `🧭 ${habit}`)),
    el('a.btn.small', { href: `#/atlas?g=${g.id}`, 'aria-label': `Essayer le style ${g.name}` }, 'Essayer'));
  const todaySection = section('today', '☀️ Aujourd’hui', null, sessCard, followCard);

  const cp = courseProgress(courseOf(s));
  const cu = cp.current ? UNITS[cp.current.ui] : null;
  const courseBanner = el('div.home-course', { style: cu ? { '--uc': cu.color } : null },
    el('span', { style: { fontSize: '30px' }, 'aria-hidden': 'true' }, '🎓'),
    el('div', el('b', cp.current ? `Parcours : unité ${cp.current.ui + 1} · ${cu.title}` : 'Parcours terminé 🎉'), el('p.small.muted', `${cp.done}/${cp.total} leçons et contrôles · ${cp.pct} %`)),
    el('a.btn3d.primary', { href: cp.current ? `#/lesson?id=${cp.current.id}` : '#/learn' }, cp.current ? '▶ Leçon' : 'Voir'));
  root.append(
    el('div.hero.home-hero',
      el('div', el('h1', `${hello} 👋`), el('p.sub', `Entraînement libre · niveau ${lv} · ${titleFor(lv)} — série de ${plural(s.streak.count || 0, 'jour')}`)),
      el('button.btn.hub-search', { type: 'button', onclick: () => openSearch(), 'aria-label': 'Rechercher un jeu, un atelier, un style…' }, '🔍')),
    courseBanner,
    // Téléphone : les jeux d'abord (accessibles sans défiler) ; PC : la session et le studio d'abord
    ...(phone
      ? [playSection, todaySection, captureCard, createSection, resume, day]
      : [el('div.cols', el('div', todaySection), el('div', createSection)), playSection, resume, day]),
  );
}

/** Téléphone ou tablette tactile : l'accueil met les jeux en avant. */
export const isPhone = () => matchMedia('(pointer: coarse)').matches && innerWidth < 1024;

/** Section titrée et annoncée aux lecteurs d'écran, avec un lien « Tout voir » facultatif. */
function section(id, title, more, ...content) {
  return el('section.home-section', { 'aria-labelledby': `home-${id}` }, sectionHead(`home-${id}`, title, null, more), ...content);
}
