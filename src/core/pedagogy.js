// Pédagogie : arbre de compétences unifié, test de positionnement hebdomadaire, projet de la semaine.
// Tout est calculé à partir de la progression enregistrée (journal, scores des jeux, XP…), sans état en double.
import { dayKey } from './progress.js';

// ---------- Semaine (lundi → dimanche) ----------
/** Identifiant de la semaine = date du lundi (AAAA-MM-JJ). */
export function weekId(d = new Date()) {
  const m = new Date(d);
  m.setHours(12, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return dayKey(m);
}
export const weekday = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = lundi

// ---------- Preuves tirées de la progression ----------
const log = (s) => s.log || [];
/** Nombre d'exercices dont la clé commence par prefix (score minimum facultatif). */
export function logCount(s, prefix, minScore = null) {
  return log(s).filter((e) => e.key && e.key.startsWith(prefix) && (minScore == null || (e.score ?? 0) >= minScore)).length;
}
const stars = (s, game, id) => s[game]?.best?.[id]?.stars || 0;
const anyStars = (s, game, ids, n = 1) => ids.some((id) => stars(s, game, id) >= n);
const lastPlacement = (s) => {
  const weeks = Object.keys(s.placement || {}).sort();
  return weeks.length ? s.placement[weeks[weeks.length - 1]] : null;
};
const placed = (s, dom, min) => (lastPlacement(s)?.scores?.[dom] ?? 0) >= min;

const P = (label, test, route) => ({ label, test, route });

export const BRANCHES = [
  { id: 'rythme', name: 'Rythme', emoji: '🥁', color: '#ff5d73' },
  { id: 'harmonie', name: 'Harmonie', emoji: '🎼', color: '#ffb84d' },
  { id: 'melodie', name: 'Mélodie & oreille', emoji: '🎵', color: '#ffe066' },
  { id: 'son', name: 'Son & production', emoji: '🔊', color: '#5ce1e6' },
  { id: 'autonomie', name: 'Autonomie', emoji: '🧭', color: '#c77dff' },
];

/** Chaque compétence s'acquiert avec `need` preuves parmi plusieurs activités de l'app (par défaut 2). */
export const SKILL_TREE = [
  // Rythme
  { id: 'pulse', branch: 'rythme', name: 'Pulsation', emoji: '💓', desc: 'Sentir le temps : rondes, blanches, noires, four on the floor.', requires: [], proofs: [
    P('Piano Rush : « Rondes et blanches » ou « Au clair de la lune »', (s) => anyStars(s, 'rush', ['pulse', 'lune']), '#/rush'),
    P('Pad Rush : « Four on the floor »', (s) => stars(s, 'pads', 'otf') >= 1, '#/pads?level=otf'),
    P('3 beats validés au Lab Beat', (s) => logCount(s, 'beat') >= 3, '#/beat'),
  ] },
  { id: 'eighths', branch: 'rythme', name: 'Croches & silences', emoji: '✂️', desc: 'Diviser le temps, faire groover les silences.', requires: ['pulse'], proofs: [
    P('Piano Rush : chapitre 2 (Frère Jacques, Riff à trous…)', (s) => anyStars(s, 'rush', ['jacques', 'etoile', 'silences']), '#/rush'),
    P('Pad Rush : « Les hats en croches »', (s) => stars(s, 'pads', 'hats8') >= 1, '#/pads?level=hats8'),
    P('2 beats recréés à l’oreille (70 %+)', (s) => logCount(s, 'beat:ear', 70) >= 2, '#/beat?mode=ear'),
  ] },
  { id: 'syncope', branch: 'rythme', name: 'Syncope & clave', emoji: '⚡', desc: 'Jouer à côté du temps : tresillo, dembow, clave.', requires: ['eighths'], proofs: [
    P('Piano Rush : chapitre Syncopes', (s) => anyStars(s, 'rush', ['tresillo', 'house', 'clave']), '#/rush'),
    P('Pad Rush : dembow, boom bap ou afro', (s) => anyStars(s, 'pads', ['dembow', 'boombap', 'afro']), '#/pads'),
    P('Call & Response rythmique réussi', (s) => logCount(s, 'cr:', 70) >= 2, '#/callresponse?kind=rhythm'),
  ] },
  { id: 'groove', branch: 'rythme', name: 'Groove & dynamique', emoji: '🎚️', desc: 'Accents, ghost notes, swing : un beat qui respire.', requires: ['syncope'], proofs: [
    P('Pad Rush : « Accents » ou « Ghost notes »', (s) => anyStars(s, 'pads', ['accents', 'ghosts']), '#/pads'),
    P('Piano Rush : « Boogie shuffle »', (s) => stars(s, 'rush', 'boogie') >= 1, '#/rush?level=boogie'),
    P('3 beats sous contrainte réussis', (s) => logCount(s, 'beat:constraint', 70) >= 3, '#/beat?mode=constraint'),
  ] },
  { id: 'finger', branch: 'rythme', name: 'Finger drumming', emoji: '🖐️', desc: 'Doubles croches, roulements, fills, breakbeats.', requires: ['groove'], proofs: [
    P('Pad Rush : roulements trap ou fill', (s) => anyStars(s, 'pads', ['trap', 'fill', 'hats16']), '#/pads'),
    P('Pad Rush : break Amen ou UK garage', (s) => anyStars(s, 'pads', ['amen', 'garage']), '#/pads'),
    P('Pad Rush : jam finale', (s) => stars(s, 'pads', 'final') >= 1, '#/pads?level=final'),
  ] },
  // Harmonie
  { id: 'triads', branch: 'harmonie', name: 'Triades', emoji: '🎼', desc: 'Majeur, mineur : empiler 1-3-5.', requires: [], proofs: [
    P('Piano Rush : « Do, Fa, Sol : I – IV – V »', (s) => stars(s, 'rush', 'triades') >= 1, '#/rush?level=triades'),
    P('Quiz couleurs d’accords (70 %+)', (s) => logCount(s, 'ear:chords', 70) >= 1, '#/ear?mode=chords'),
    P('Test de la semaine : harmonie ≥ 50', (s) => placed(s, 'harmonie', 50), '#/placement'),
  ] },
  { id: 'progs', branch: 'harmonie', name: 'Progressions', emoji: '🧭', desc: 'Degrés, I–V–vi–IV, fonctions tonales.', requires: ['triads'], proofs: [
    P('Piano Rush : « La progression pop »', (s) => stars(s, 'rush', 'pop') >= 1, '#/rush?level=pop'),
    P('Quiz progressions (70 %+)', (s) => logCount(s, 'ear:progressions', 70) >= 1, '#/ear?mode=progressions'),
    P('2 recettes d’accords réussies', (s) => logCount(s, 'chords:recipe', 70) >= 2, '#/chords?mode=recipe'),
  ] },
  { id: 'colors', branch: 'harmonie', name: 'Couleurs 7e & 9e', emoji: '🎨', desc: 'm7, maj7, 7, 9e : les accords de la house et du lo-fi.', requires: ['progs'], proofs: [
    P('Piano Rush : jazz, lo-fi ou bossa', (s) => anyStars(s, 'rush', ['jazz', 'lofi', 'bossa']), '#/rush'),
    P('Pad Rush : « Chops d’accords house »', (s) => stars(s, 'pads', 'chops') >= 1, '#/pads?level=chops'),
    P('Test de la semaine : harmonie ≥ 70', (s) => placed(s, 'harmonie', 70), '#/placement'),
  ] },
  { id: 'bassline', branch: 'harmonie', name: 'Lignes de basse', emoji: '🎸', desc: 'Fondamentale, notes d’approche, place du kick.', requires: ['progs'], proofs: [
    P('2 basses validées au Labo de basse', (s) => logCount(s, 'bass:critique') >= 2, '#/basslab'),
    P('Pad Rush : « Riff de basse aux pads »', (s) => stars(s, 'pads', 'bassriff') >= 1, '#/pads?level=bassriff'),
    P('Piano Rush : « Les deux mains »', (s) => stars(s, 'rush', 'deuxmains') >= 1, '#/rush?level=deuxmains'),
  ] },
  // Mélodie & oreille
  { id: 'intervals', branch: 'melodie', name: 'Intervalles', emoji: '📏', desc: 'Reconnaître les distances entre les notes.', requires: [], proofs: [
    P('Quiz intervalles (70 %+)', (s) => logCount(s, 'ear:intervals', 70) >= 1, '#/ear?mode=intervals'),
    P('Test de la semaine : mélodie ≥ 50', (s) => placed(s, 'melodie', 50), '#/placement'),
    P('Révisions espacées faites 2 fois', (s) => logCount(s, 'ear:review') >= 2, '#/ear?mode=review'),
  ] },
  { id: 'hooks', branch: 'melodie', name: 'Hooks', emoji: '🪝', desc: 'Peu de notes, répétition, question / réponse.', requires: ['intervals'], proofs: [
    P('2 hooks sous contrainte réussis', (s) => logCount(s, 'melody:challenge', 70) >= 2, '#/melody?mode=challenge'),
    P('Une idée fredonnée transcrite', (s) => logCount(s, 'hum:') >= 1, '#/hum'),
    P('Piano Rush : « Ode à la joie »', (s) => stars(s, 'rush', 'joie') >= 1, '#/rush?level=joie'),
  ] },
  { id: 'dictation', branch: 'melodie', name: 'Relevé à l’oreille', emoji: '👂', desc: 'Retrouver une mélodie ou un rythme entendu.', requires: ['intervals'], proofs: [
    P('2 dictées mélodiques (70 %+)', (s) => logCount(s, 'melody:dictation', 70) >= 2, '#/melody?mode=dictation'),
    P('Pad Rush : un défi à l’oreille réussi', (s) => Object.keys(s.pads?.best || {}).some((k) => k.endsWith('@ear') && s.pads.best[k].stars >= 1), '#/pads'),
    P('Une analyse de référence', (s) => logCount(s, 'analyze') >= 1, '#/analyze'),
  ] },
  // Son & production
  { id: 'synthesis', branch: 'son', name: 'Synthèse soustractive', emoji: '🔊', desc: 'Oscillateurs, filtre, enveloppes, LFO.', requires: [], proofs: [
    P('Quiz « Quel paramètre ? » (70 %+)', (s) => logCount(s, 'ear:sound', 70) >= 1, '#/ear?mode=sound'),
    P('Un son créé au Lab Synthé', (s) => logCount(s, 'synth:') >= 1, '#/synth'),
    P('Test de la semaine : son ≥ 50', (s) => placed(s, 'son', 50), '#/placement'),
  ] },
  { id: 'serum', branch: 'son', name: 'Sound design Serum', emoji: '🌊', desc: 'Reproduire un son, l’adapter au morceau.', requires: ['synthesis'], proofs: [
    P('2 sons mystère reproduits', (s) => logCount(s, 'synth:match', 60) >= 2, '#/synth?mode=match'),
    P('Un élément recréé depuis un morceau', (s) => logCount(s, 'recreate') >= 1, '#/analyze'),
    P('Test de la semaine : son ≥ 70', (s) => placed(s, 'son', 70), '#/placement'),
  ] },
  { id: 'mixing', branch: 'son', name: 'Mixage', emoji: '🎚️', desc: 'Volumes, EQ, panoramique, sidechain.', requires: ['synthesis'], proofs: [
    P('2 mixdowns express réussis', (s) => logCount(s, 'mix:express', 60) >= 2, '#/mixdown'),
    P('Une prod critiquée', (s) => logCount(s, 'critique') >= 1, '#/critique'),
    P('Une mission studio réalisée', (s) => logCount(s, 'mission') >= 1, '#/studio'),
  ] },
  { id: 'arrangement', branch: 'son', name: 'Arrangement', emoji: '🧱', desc: 'De la boucle au morceau : sections, tension, contraste.', requires: ['mixing'], proofs: [
    P('Un défi d’arrangement réussi', (s) => logCount(s, 'arr:challenge', 60) >= 1, '#/arrange'),
    P('Un morceau arrangé', (s) => logCount(s, 'arr:') >= 2, '#/arrange'),
    P('Un remix gardé', (s) => logCount(s, 'remix') >= 1, '#/remix'),
  ] },
  // Autonomie
  { id: 'studio', branch: 'autonomie', name: 'Dans le studio', emoji: '🎛️', desc: 'Refaire les gestes dans Live, sur le MPC et Serum.', requires: [], proofs: [
    P('3 missions studio réalisées', (s) => logCount(s, 'mission') >= 3, '#/studio'),
    P('Un dé à idées relevé', (s) => logCount(s, 'dice') >= 1, '#/studio?dice=1'),
    P('Un mini-projet du programme', (s) => logCount(s, 'program:project') >= 1, '#/program'),
  ], need: 2 },
  { id: 'weekly', branch: 'autonomie', name: 'Projet complet', emoji: '🏁', desc: 'Mener un morceau du beat à l’export en une semaine.', requires: ['studio'], proofs: [
    P('Un projet de la semaine terminé', (s) => Object.values(s.weekProjects || {}).some((p) => p.finished), '#/project'),
    P('Le défi de la semaine publié', (s) => logCount(s, 'challenge') >= 1, '#/challenge'),
  ], need: 1 },
];

/** État de chaque compétence : 'acquired' | 'available' | 'locked', avec les preuves obtenues. */
export function skillStates(s) {
  const out = {};
  for (const n of SKILL_TREE) {
    const got = n.proofs.map((p) => { try { return !!p.test(s); } catch (e) { return false; } });
    const need = Math.min(n.need || 2, n.proofs.length);
    const done = got.filter(Boolean).length >= need;
    const open = n.requires.every((r) => out[r]?.state === 'acquired');
    out[n.id] = { node: n, got, need, count: got.filter(Boolean).length, state: done && open ? 'acquired' : open ? 'available' : 'locked' };
  }
  return out;
}
/** Prochaines compétences conseillées (disponibles, les plus avancées d'abord). */
export function nextSkills(s, n = 3) {
  return Object.values(skillStates(s)).filter((x) => x.state === 'available').sort((a, b) => b.count / b.need - a.count / a.need).slice(0, n);
}

// ---------- Test de positionnement hebdomadaire ----------
export const DOMAINS = [
  { id: 'rythme', name: 'Rythme', emoji: '🥁', skill: 'rythme' },
  { id: 'harmonie', name: 'Harmonie', emoji: '🎼', skill: 'harmonie' },
  { id: 'melodie', name: 'Mélodie & oreille', emoji: '🎵', skill: 'melodie' },
  { id: 'son', name: 'Son', emoji: '🔊', skill: 'sound' },
];

/** Déroulé du test (≈ 5 min) : 15 questions d'oreille + un test de régularité en rythme. Niveau moyen fixe pour comparer d'une semaine à l'autre. */
export function placementPlan() {
  const q = (domain, mode, n) => Array.from({ length: n }, () => ({ domain, mode }));
  return [
    ...q('melodie', 'intervals', 4),
    ...q('harmonie', 'chords', 3), ...q('harmonie', 'progressions', 2),
    ...q('rythme', 'genre', 3),
    ...q('son', 'sound', 3),
    { domain: 'rythme', mode: 'tap' },
  ];
}
export const PLACEMENT_LEVEL = 5;

/** Note du test de régularité : écart moyen (ms) entre tes frappes et les clics. */
export function tapScore(offsetsMs, expected = 8) {
  if (!offsetsMs.length) return 0;
  const mean = offsetsMs.reduce((a, b) => a + Math.abs(b), 0) / offsetsMs.length;
  const coverage = Math.min(1, offsetsMs.length / expected);
  return Math.round(Math.max(0, Math.min(100, 110 - mean * 1.1)) * coverage);
}

/** answers : [{ domain, ok } | { domain, score }] → scores 0-100 par domaine + global. */
export function scorePlacement(answers) {
  const scores = {};
  for (const d of DOMAINS) {
    const a = answers.filter((x) => x.domain === d.id);
    if (!a.length) { scores[d.id] = 0; continue; }
    const pts = a.reduce((sum, x) => sum + (x.score != null ? x.score / 100 : x.ok ? 1 : 0), 0);
    scores[d.id] = Math.round((pts / a.length) * 100);
  }
  const global = Math.round(DOMAINS.reduce((a, d) => a + scores[d.id], 0) / DOMAINS.length);
  const weakest = [...DOMAINS].sort((a, b) => scores[a.id] - scores[b.id])[0].id;
  return { scores, global, weakest };
}

/** Le test est disponible chaque semaine à partir du lundi (une fois par semaine). */
export function placementDue(s, d = new Date()) {
  return !(s.placement || {})[weekId(d)];
}
/** Compétence à travailler cette semaine (issue du dernier test), pour orienter les sessions. */
export function weekFocus(s, d = new Date()) {
  // Choix explicite depuis le tableau de bord (« cibler ça »), valable 7 jours
  const o = s.settings?.focusOverride;
  if (o?.skill && o.until >= dayKey(d)) return o.skill;
  const t = (s.placement || {})[weekId(d)];
  return t ? DOMAINS.find((x) => x.id === t.weakest)?.skill || null : null;
}

// ---------- Projet de la semaine (fil rouge) ----------
export const PROJECT_STEPS = [
  { id: 'beat', day: 0, emoji: '🥁', title: 'Le beat', desc: 'Pose le groove de ton morceau.', route: '#/beat', keys: ['beat:'] },
  { id: 'chords', day: 1, emoji: '🎼', title: 'Les accords', desc: 'Choisis la progression qui donne l’émotion.', route: '#/chords', keys: ['chords'] },
  { id: 'bass', day: 2, emoji: '🎸', title: 'La basse', desc: 'Écris une basse qui dialogue avec le kick.', route: '#/basslab', keys: ['bass:'] },
  { id: 'hook', day: 3, emoji: '🪝', title: 'Le hook', desc: 'La mélodie qu’on retient (écrite ou fredonnée).', route: '#/melody', keys: ['melody:', 'hum:'] },
  { id: 'arrange', day: 4, emoji: '🧱', title: 'L’arrangement', desc: 'Transforme la boucle en morceau.', route: '#/arrange', keys: ['arr:'] },
  { id: 'sound', day: 5, emoji: '🎛️', title: 'Son & mix', desc: 'Peaufine un son et l’équilibre.', route: '#/synth', keys: ['synth:', 'mix:', 'remix'] },
  { id: 'export', day: 6, emoji: '📤', title: 'Export vers Live', desc: 'Exporte le projet (MIDI + pistes audio) et ouvre-le dans Ableton.', route: '#/project', keys: ['project:export'] },
];

/** Étapes validées depuis le début du projet (dans n'importe quel ordre). */
export function projectProgress(s, p) {
  if (!p) return { done: {}, count: 0, total: PROJECT_STEPS.length, finished: false };
  const since = p.startedDay || p.week;
  const entries = log(s).filter((e) => e.d >= since && e.d <= addDays(p.week, 6));
  const done = {};
  for (const st of PROJECT_STEPS) {
    const e = entries.find((x) => st.keys.some((k) => x.key?.startsWith(k)));
    if (e) done[st.id] = e.d;
  }
  const count = Object.keys(done).length;
  return { done, count, total: PROJECT_STEPS.length, finished: count === PROJECT_STEPS.length };
}
export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}
