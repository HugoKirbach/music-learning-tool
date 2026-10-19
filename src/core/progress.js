// Règles de progression (XP, niveaux, séries, badges). Module pur, testable.

export const SKILLS = {
  rythme: { name: 'Rythme', emoji: '🥁', color: '#ff5d73' },
  harmonie: { name: 'Harmonie', emoji: '🎼', color: '#ffb84d' },
  melodie: { name: 'Mélodie', emoji: '🎵', color: '#ffe066' },
  sound: { name: 'Sound design', emoji: '🔊', color: '#5ce1e6' },
  oreille: { name: 'Oreille', emoji: '👂', color: '#7c9cff' },
  autonomie: { name: 'Autonomie studio', emoji: '🧭', color: '#c77dff' },
};

/** XP total nécessaire pour atteindre le niveau L (L1 = 0, L2 = 100, L3 = 300, L4 = 600…). */
export function xpForLevel(L) {
  return 50 * (L - 1) * L;
}

export function levelFromXp(xp) {
  let L = 1;
  while (xpForLevel(L + 1) <= xp) L++;
  const cur = xpForLevel(L), next = xpForLevel(L + 1);
  return { level: L, into: xp - cur, needed: next - cur, progress: (xp - cur) / (next - cur) };
}

const TITLES = [
  [1, 'Bidouilleur·se'], [3, 'Beatmaker'], [5, 'Chercheur·se de sons'], [8, 'Producteur·rice'],
  [12, 'Architecte sonore'], [16, 'Digger émérite'], [20, 'Maestro du groove'], [30, 'Légende du club'],
];

/** Niveaux qui donnent un nouveau titre, et donc un certificat. */
export const CERT_LEVELS = TITLES.map(([l]) => l).filter((l) => l > 1);

export function titleFor(level) {
  let t = TITLES[0][1];
  for (const [l, name] of TITLES) if (level >= l) t = name;
  return t;
}

export function dayKey(d = new Date()) {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function daysBetween(a, b) {
  const pa = new Date(a + 'T12:00:00'), pb = new Date(b + 'T12:00:00');
  return Math.round((pb - pa) / 86400000);
}

/** Met à jour la série de jours consécutifs. */
export function updateStreak(streak, today) {
  if (!streak.last) return { count: 1, last: today, best: Math.max(1, streak.best || 0) };
  const gap = daysBetween(streak.last, today);
  if (gap === 0) return streak;
  const count = gap === 1 ? streak.count + 1 : 1;
  return { count, last: today, best: Math.max(count, streak.best || 0) };
}

/** Indices visibles par défaut tant que l'utilisateur est débutant : on retire les « petites roues » avec le niveau. */
export function hintsByDefault(level, setting = 'auto') {
  if (setting === 'on') return true;
  if (setting === 'off') return false;
  return level < 6;
}

export const BADGES = [
  { id: 'first', name: 'Premier pas', emoji: '👣', desc: 'Termine ton premier exercice', test: (s) => s.stats.exercises >= 1 },
  { id: 'session1', name: 'Session !', emoji: '⏱️', desc: 'Termine une session complète', test: (s) => s.stats.sessions >= 1 },
  { id: 'session10', name: 'Habitué·e', emoji: '🔁', desc: '10 sessions complètes', test: (s) => s.stats.sessions >= 10 },
  { id: 'session50', name: 'Rituel', emoji: '🕯️', desc: '50 sessions complètes', test: (s) => s.stats.sessions >= 50 },
  { id: 'streak3', name: 'En feu', emoji: '🔥', desc: '3 jours d’affilée', test: (s) => (s.streak.best || 0) >= 3 },
  { id: 'streak7', name: 'Semaine parfaite', emoji: '📅', desc: '7 jours d’affilée', test: (s) => (s.streak.best || 0) >= 7 },
  { id: 'streak30', name: 'Inarrêtable', emoji: '🚀', desc: '30 jours d’affilée', test: (s) => (s.streak.best || 0) >= 30 },
  { id: 'genres5', name: 'Touriste', emoji: '🧳', desc: 'Explore 5 styles', test: (s) => Object.keys(s.genres).length >= 5 },
  { id: 'genres12', name: 'Globe-trotter', emoji: '🌍', desc: 'Explore 12 styles', test: (s) => Object.keys(s.genres).length >= 12 },
  { id: 'genresAll', name: 'Encyclopédie', emoji: '📚', desc: 'Explore les 20 styles', test: (s) => Object.keys(s.genres).length >= 20 },
  { id: 'ear20', name: 'Oreille fine', emoji: '👂', desc: '20 bonnes réponses à l’oreille', test: (s) => s.stats.earCorrect >= 20 },
  { id: 'ear200', name: 'Oreille absolue ?', emoji: '🦻', desc: '200 bonnes réponses à l’oreille', test: (s) => s.stats.earCorrect >= 200 },
  { id: 'beatPerfect', name: 'Transcripteur', emoji: '🎯', desc: 'Recrée un beat à 100 % à l’oreille', test: (s) => s.stats.beatPerfect >= 1 },
  { id: 'catchy85', name: 'Ver d’oreille', emoji: '🐛', desc: 'Mélodie notée 85+ au Catchy-mètre', test: (s) => s.stats.bestCatchy >= 85 },
  { id: 'soundMatch', name: 'Oreille de sound designer', emoji: '🎚️', desc: 'Reproduis un son à 90 %+', test: (s) => s.stats.bestMatch >= 90 },
  { id: 'missions5', name: 'En studio', emoji: '🎛️', desc: '5 missions studio réalisées', test: (s) => Object.values(s.missions).reduce((a, b) => a + b, 0) >= 5 },
  { id: 'missions25', name: 'Rat de studio', emoji: '🐀', desc: '25 missions studio réalisées', test: (s) => Object.values(s.missions).reduce((a, b) => a + b, 0) >= 25 },
  { id: 'export', name: 'Vers Ableton', emoji: '📤', desc: 'Exporte un fichier MIDI', test: (s) => s.stats.exports >= 1 },
  { id: 'notebook10', name: 'Carnet bien rempli', emoji: '📓', desc: '10 idées dans le Carnet', test: (s) => s.notebook.length >= 10 },
  { id: 'nohint10', name: 'Sans les mains', emoji: '🧭', desc: '10 exercices réussis sans indice', test: (s) => s.stats.noHintWins >= 10 },
  { id: 'midi', name: 'Branché', emoji: '🔌', desc: 'Joue avec un clavier MIDI connecté', test: (s) => s.stats.midiNotes >= 20 },
  { id: 'level10', name: 'Niveau 10', emoji: '🏆', desc: 'Atteins le niveau 10', test: (s) => levelFromXp(s.xp).level >= 10 },
];

export function newBadges(state) {
  return BADGES.filter((b) => !state.badges[b.id] && b.test(state));
}
