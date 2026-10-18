// Défi de la semaine : la même contrainte pour tout le monde, tirée de la semaine (lundi). Règles vérifiées sur l'idée.
import { rng } from './daily.js';

const notes = (p) => (p.melody || []).filter(Boolean);
const distinct = (p) => new Set(notes(p).map((x) => x.n % 12)).size;
const hits = (p, row) => (p.drums?.[row] || []).filter(Boolean).length;
const R = (label, test) => ({ label, test });

export const CHALLENGES = [
  { id: 'trois-notes', emoji: '3️⃣', title: 'Hook à 3 notes', genre: 'house', desc: 'Un hook qui reste en tête avec seulement 3 notes différentes.',
    rules: [R('Mélodie de 6 notes ou plus', (p) => notes(p).length >= 6), R('3 notes différentes maximum', (p) => distinct(p) <= 3 && distinct(p) > 0)] },
  { id: 'trap-sans-hats', emoji: '🚫', title: 'Trap sans hi-hats', genre: 'trap', desc: 'Fais groover une trap… sans aucun hi-hat : tout passe par le kick, la snare et la basse.',
    rules: [R('Aucun hi-hat (fermé ou ouvert)', (p) => hits(p, 'hat') + hits(p, 'ohat') === 0), R('Au moins 5 coups de kick', (p) => hits(p, 'kick') >= 5), R('Une mélodie', (p) => notes(p).length >= 4)] },
  { id: 'dorien', emoji: '🌆', title: 'Deep house en dorien', genre: 'deephouse', desc: 'Le mode dorien (mineur avec une sixte majeure) donne la couleur jazzy de la deep house.',
    rules: [R('Gamme : dorien', (p) => p.scale === 'dorian'), R('Accords de 7e (ou plus)', (p) => (p.ext || 3) >= 4), R('Une mélodie de 8 notes ou plus', (p) => notes(p).length >= 8)] },
  { id: 'lent', emoji: '🐢', title: 'Moins de 85 BPM', genre: 'lofi', desc: 'Prends ton temps : une idée lente, qui respire.',
    rules: [R('Tempo ≤ 85 BPM', (p) => p.bpm <= 85), R('Une mélodie', (p) => notes(p).length >= 4)] },
  { id: 'rapide', emoji: '⚡', title: 'Au-dessus de 160 BPM', genre: 'dnb', desc: 'Drum & bass ou jungle : l’énergie avant tout.',
    rules: [R('Tempo ≥ 160 BPM', (p) => p.bpm >= 160), R('Au moins 2 snares par mesure', (p) => hits(p, 'snare') >= 2)] },
  { id: 'silence', emoji: '🤫', title: 'L’art du silence', genre: 'ukg', desc: 'Une mélodie aérée : plus de silences que de notes.',
    rules: [R('Mélodie de 5 à 16 notes', (p) => notes(p).length >= 5 && notes(p).length <= 16), R('Au moins une mesure de batterie sans clap', (p) => hits(p, 'clap') <= 2)] },
  { id: 'majeur-triste', emoji: '🌧️', title: 'Majeur… mais mélancolique', genre: 'synthwave', desc: 'En majeur, trouve une progression qui sonne nostalgique (indice : commence sur le vi).',
    rules: [R('Gamme : majeur', (p) => p.scale === 'major'), R('La progression commence par le vi (6e degré)', (p) => p.chords?.[0]?.deg === 5)] },
  { id: 'kick-off', emoji: '🦶', title: 'Pas de kick sur le 1', genre: 'afrohouse', desc: 'Déplace l’appui : le kick ne tombe pas sur le premier temps.',
    rules: [R('Pas de kick sur le temps 1', (p) => !p.drums?.kick?.[0]), R('Au moins 3 coups de kick', (p) => hits(p, 'kick') >= 3), R('Une mélodie', (p) => notes(p).length >= 4)] },
  { id: 'deux-accords', emoji: '✌️', title: 'Deux accords suffisent', genre: 'techno', desc: 'Une boucle hypnotique sur seulement 2 accords différents.',
    rules: [R('2 accords différents maximum', (p) => new Set((p.chords || []).map((c) => JSON.stringify(c))).size <= 2), R('Une mélodie de 8 notes ou plus', (p) => notes(p).length >= 8)] },
  { id: 'aigu', emoji: '🎈', title: 'Tout dans l’aigu', genre: 'trance', desc: 'Un hook qui plane : toutes les notes au-dessus du Do central.',
    rules: [R('Mélodie de 6 notes ou plus', (p) => notes(p).length >= 6), R('Toutes les notes au-dessus du Do central', (p) => notes(p).length > 0 && notes(p).every((x) => x.n > 60))] },
  { id: 'bossa', emoji: '🏖️', title: 'Bossa en mineur', genre: 'bossa', desc: 'La bossa nova en mode mineur, avec des accords de 7e.',
    rules: [R('Gamme mineure (éolien ou dorien)', (p) => ['minor', 'dorian'].includes(p.scale)), R('Accords de 7e (ou plus)', (p) => (p.ext || 3) >= 4), R('Une mélodie', (p) => notes(p).length >= 4)] },
  { id: 'funk-ghost', emoji: '👻', title: 'Ghost notes obligatoires', genre: 'funk', desc: 'Un groove funk avec des ghost notes de snare (cellules douces dans le Lab Beat).',
    rules: [R('Au moins 3 ghost notes de snare', (p) => (p.drums?.snare || []).filter((v) => v === 2).length >= 3), R('Une basse ou une mélodie', (p) => notes(p).length >= 3 || !!p.bassLine)] },
];

/** Défi de la semaine (identique pour tous) à partir de l'identifiant de semaine (date du lundi). */
export function challengeOfWeek(week) {
  const r = rng('defi' + week);
  return CHALLENGES[Math.floor(r() * CHALLENGES.length)];
}

export function checkRules(ch, project) {
  return ch.rules.map((rule) => { let ok = false; try { ok = !!rule.test(project); } catch (e) { ok = false; } return { label: rule.label, ok }; });
}
