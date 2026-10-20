// Succès (badges) par catégorie et cartes « Machines de légende » à collectionner. Module pur.
// Chaque nouveau succès fait gagner une carte (tirée au hasard, de façon reproductible, parmi celles qui manquent).
import { BADGES, levelFromXp, SKILLS, CERT_LEVELS } from './progress.js';
import { LEVELS, CHAPTERS } from '../data/rush.js';
import { PAD_LEVELS, PAD_CHAPTERS } from '../data/pads.js';
import { VENUES, totalStars, MAX_STARS } from './club.js';
import { rng } from './daily.js';

export const CATEGORIES = [
  { id: 'start', name: 'Premiers pas', emoji: '👣' },
  { id: 'rush', name: 'Piano Rush', emoji: '🎹' },
  { id: 'pads', name: 'Pad Rush', emoji: '🔲' },
  { id: 'club', name: 'Nuit au club', emoji: '🪩' },
  { id: 'ear', name: 'Oreille', emoji: '👂' },
  { id: 'studio', name: 'Studio & création', emoji: '🎛️' },
  { id: 'regular', name: 'Régularité', emoji: '🔥' },
  { id: 'growth', name: 'Progression', emoji: '📈' },
];

// Catégorie et palier des succès d'origine
const BASE_META = {
  first: ['start', 'bronze'], session1: ['start', 'bronze'], session10: ['regular', 'silver'], session50: ['regular', 'gold'],
  streak3: ['regular', 'bronze'], streak7: ['regular', 'silver'], streak30: ['regular', 'gold'],
  genres5: ['studio', 'bronze'], genres12: ['studio', 'silver'], genresAll: ['studio', 'gold'],
  ear20: ['ear', 'bronze'], ear200: ['ear', 'gold'], beatPerfect: ['ear', 'silver'], catchy85: ['studio', 'silver'],
  soundMatch: ['ear', 'silver'], missions5: ['studio', 'bronze'], missions25: ['studio', 'gold'], export: ['start', 'bronze'],
  notebook10: ['studio', 'silver'], nohint10: ['growth', 'silver'], midi: ['start', 'bronze'], level10: ['growth', 'gold'],
};

const cleared = (best = {}, levels) => levels.filter((l) => (best[l.id]?.stars || 0) >= 1).length;
const threeStars = (best = {}, levels) => levels.filter((l) => (best[l.id]?.stars || 0) >= 3).length;
const chapterDone = (best = {}, levels, ch) => levels.filter((l) => l.ch === ch).every((l) => (best[l.id]?.stars || 0) >= 1);
const minutes = (s) => Math.round(Object.values(s.days || {}).reduce((a, d) => a + (d.sec || 0), 0) / 60);
const A = (id, cat, tier, emoji, name, desc, test) => ({ id, cat, tier, emoji, name, desc, test });

const EXTRA = [
  // Piano Rush
  A('rush1', 'rush', 'bronze', '🎹', 'Premières touches', 'Réussis un niveau de Piano Rush', (s) => cleared(s.rush?.best, LEVELS) >= 1),
  A('rushCh1', 'rush', 'bronze', '💓', 'Dans le temps', `Termine le chapitre « ${CHAPTERS[0].name} » de Piano Rush`, (s) => chapterDone(s.rush?.best, LEVELS, 1)),
  A('rushChords', 'rush', 'silver', '🎼', 'Main d’accords', `Termine le chapitre « ${CHAPTERS[2].name} »`, (s) => chapterDone(s.rush?.best, LEVELS, 3)),
  A('rush15', 'rush', 'silver', '🎶', 'Pianiste en herbe', 'Réussis 15 niveaux de Piano Rush', (s) => cleared(s.rush?.best, LEVELS) >= 15),
  A('rushAll', 'rush', 'gold', '🏆', 'Grand final', `Réussis les ${LEVELS.length} niveaux de Piano Rush`, (s) => cleared(s.rush?.best, LEVELS) >= LEVELS.length),
  A('rush3x10', 'rush', 'gold', '⭐', 'Perfectionniste', '10 niveaux de Piano Rush à 3 étoiles', (s) => threeStars(s.rush?.best, LEVELS) >= 10),
  A('rushExpert', 'rush', 'gold', '🔥', 'Mode expert', 'Réussis un niveau de Piano Rush en Expert', (s) => Object.entries(s.rush?.best || {}).some(([k, v]) => k.endsWith('@expert') && v.stars >= 1)),
  // Pad Rush
  A('pads1', 'pads', 'bronze', '🔲', 'Premier groove', 'Réussis un niveau de Pad Rush', (s) => cleared(s.pads?.best, PAD_LEVELS) >= 1),
  A('padsCh1', 'pads', 'bronze', '🦶', 'Le squelette', `Termine le chapitre « ${PAD_CHAPTERS[0].name} » de Pad Rush`, (s) => chapterDone(s.pads?.best, PAD_LEVELS, 1)),
  A('padsDyn', 'pads', 'silver', '🎚️', 'Toucher de velours', `Termine le chapitre « ${PAD_CHAPTERS[2].name} »`, (s) => chapterDone(s.pads?.best, PAD_LEVELS, 3)),
  A('pads15', 'pads', 'silver', '🖐️', 'Finger drummer', 'Réussis 15 niveaux de Pad Rush', (s) => cleared(s.pads?.best, PAD_LEVELS) >= 15),
  A('padsAll', 'pads', 'gold', '🥇', 'Maître des pads', `Réussis les ${PAD_LEVELS.length} niveaux de Pad Rush`, (s) => cleared(s.pads?.best, PAD_LEVELS) >= PAD_LEVELS.length),
  A('padsEar5', 'pads', 'silver', '🎧', 'Oreille de batteur', 'Réussis 5 défis à l’oreille de Pad Rush', (s) => Object.entries(s.pads?.best || {}).filter(([k, v]) => k.endsWith('@ear') && v.stars >= 1).length >= 5),
  A('pads3x10', 'pads', 'gold', '💎', 'Groove parfait', '10 niveaux de Pad Rush à 3 étoiles', (s) => threeStars(s.pads?.best, PAD_LEVELS) >= 10),
  // Nuit au club
  A('club1', 'club', 'bronze', '🪩', 'Première soirée', 'Termine une soirée de Nuit au club', (s) => (s.club?.nights || 0) >= 1),
  A('club10', 'club', 'silver', '🌙', 'Noctambule', '10 soirées au club', (s) => (s.club?.nights || 0) >= 10),
  A('club50', 'club', 'gold', '🦉', 'Résident·e', '50 soirées au club', (s) => (s.club?.nights || 0) >= 50),
  A('clubGold', 'club', 'silver', '📀', 'Disque d’or', 'Gagne un disque d’or (soirée à 3 étoiles)', (s) => Object.values(s.club?.crate || {}).some((v) => v.kind === 'gold')),
  A('crate10', 'club', 'silver', '🎚️', 'Digger', '10 styles dans ta caisse de vinyles', (s) => Object.keys(s.club?.crate || {}).length >= 10),
  A('crateAll', 'club', 'gold', '🗄️', 'Collection complète', 'Les 20 styles dans ta caisse de vinyles', (s) => Object.keys(s.club?.crate || {}).length >= 20),
  A('venuesAll', 'club', 'gold', '🛸', 'Tournée mondiale', `Ouvre les ${VENUES.length} salles`, (s) => totalStars(s.club?.best) >= VENUES.at(-1).need),
  A('clubStars', 'club', 'gold', '🌟', 'Tête d’affiche', `${MAX_STARS} étoiles au club`, (s) => totalStars(s.club?.best) >= MAX_STARS),
  A('daily7', 'club', 'silver', '📅', 'Fidèle du set', '7 sets du jour joués', (s) => (s.club?.dailyCount || 0) >= 7),
  // Oreille
  A('ear50', 'ear', 'bronze', '👂', 'À l’écoute', '50 bonnes réponses à l’oreille', (s) => s.stats.earCorrect >= 50),
  A('ear500', 'ear', 'gold', '🦇', 'Oreille de chauve-souris', '500 bonnes réponses à l’oreille', (s) => s.stats.earCorrect >= 500),
  A('mastered10', 'ear', 'silver', '🧠', 'Ancré pour de bon', '10 révisions maîtrisées (fiches terminées)', (s) => (s.stats.mastered || 0) >= 10),
  A('placement4', 'ear', 'silver', '🧪', 'Testeur assidu', '4 tests de la semaine passés', (s) => Object.keys(s.placement || {}).length >= 4),
  // Studio
  A('export10', 'studio', 'silver', '📦', 'Livraison express', '10 exports MIDI vers Live', (s) => s.stats.exports >= 10),
  A('project1', 'studio', 'silver', '🏁', 'Morceau fini', 'Termine un projet de la semaine', (s) => Object.values(s.weekProjects || {}).some((p) => p.finished)),
  A('project4', 'studio', 'gold', '💽', 'EP en vue', 'Termine 4 projets de la semaine', (s) => Object.values(s.weekProjects || {}).filter((p) => p.finished).length >= 4),
  A('latency', 'studio', 'bronze', '⏱️', 'Réglé au poil', 'Calibre la latence de ton appareil', (s) => Object.keys(s.settings?.latency || {}).length >= 1),
  // Régularité
  A('streak14', 'regular', 'silver', '🗓️', 'Deux semaines', '14 jours d’affilée', (s) => (s.streak?.best || 0) >= 14),
  A('streak100', 'regular', 'gold', '💯', 'Centurion', '100 jours d’affilée', (s) => (s.streak?.best || 0) >= 100),
  A('hours10', 'regular', 'silver', '🕐', '10 heures de musique', '10 heures de pratique dans l’app', (s) => minutes(s) >= 600),
  A('hours50', 'regular', 'gold', '⌛', '50 heures de musique', '50 heures de pratique dans l’app', (s) => minutes(s) >= 3000),
  // Progression
  A('level5', 'growth', 'bronze', '🌱', 'Niveau 5', 'Atteins le niveau 5', (s) => levelFromXp(s.xp).level >= 5),
  A('level20', 'growth', 'gold', '🚀', 'Niveau 20', 'Atteins le niveau 20', (s) => levelFromXp(s.xp).level >= 20),
  A('certs3', 'growth', 'silver', '🎓', 'Diplômé·e', `${Math.min(3, CERT_LEVELS.length)} certificats de niveau`, (s) => Object.keys(s.certs || {}).length >= 3),
  A('allround', 'growth', 'gold', '🧩', 'Touche-à-tout', `Au moins 300 XP dans chacune des ${Object.keys(SKILLS).length} compétences`, (s) => Object.keys(SKILLS).every((k) => (s.skills?.[k] || 0) >= 300)),
];

export const ACHIEVEMENTS = [
  ...BADGES.map((b) => ({ ...b, cat: BASE_META[b.id]?.[0] || 'start', tier: BASE_META[b.id]?.[1] || 'bronze' })),
  ...EXTRA,
];

/** Succès pas encore obtenus mais remplis par l'état. */
export function newAchievements(state) {
  return ACHIEVEMENTS.filter((b) => !state.badges?.[b.id] && safe(b, state));
}
function safe(b, s) { try { return !!b.test(s); } catch (e) { return false; } }

/** Avancement d'une catégorie. */
export function categoryProgress(state, cat) {
  const list = ACHIEVEMENTS.filter((b) => b.cat === cat);
  return { got: list.filter((b) => state.badges?.[b.id]).length, total: list.length };
}

// ---------- Cartes « Machines de légende » ----------
export const RARITY = {
  common: { name: 'Commune', weight: 3 },
  rare: { name: 'Rare', weight: 2 },
  legendary: { name: 'Légendaire', weight: 1 },
};
const C = (id, emoji, name, year, rarity, fact) => ({ id, emoji, name, year, rarity, fact });
export const CARDS = [
  C('tr808', '🥁', 'Roland TR-808', 1980, 'rare', 'Un échec commercial à sa sortie… puis son kick grave et long est devenu la base du hip-hop et de la trap.'),
  C('tr909', '🥁', 'Roland TR-909', 1983, 'rare', 'Hats et cymbales échantillonnés, kick synthétique : le son de la house de Chicago et de la techno de Detroit.'),
  C('tb303', '🧪', 'Roland TB-303', 1981, 'legendary', 'Prévue pour accompagner des guitaristes, détournée à Chicago : son filtre résonant a inventé l’acid house.'),
  C('mpc60', '🎛️', 'Akai MPC60', 1988, 'legendary', 'Pads sensibles et swing légendaire, conçue avec Roger Linn : l’instrument du hip-hop.'),
  C('sl1200', '💿', 'Technics SL-1200', 1972, 'rare', 'La platine des DJ : moteur à entraînement direct et pitch réglable, quasi inusable.'),
  C('minimoog', '🎹', 'Minimoog', 1970, 'legendary', 'Le premier synthé portable : son filtre 24 dB a défini la basse et le lead synthétiques.'),
  C('rhodes', '🎹', 'Fender Rhodes', 1965, 'common', 'Piano électrique à lames métalliques : le son chaud de la soul, du jazz fusion et du lo-fi.'),
  C('hammond', '🎹', 'Orgue Hammond B-3', 1955, 'common', 'Roues phoniques et tirettes : le gospel, le rock et les orgues de la deep house.'),
  C('dx7', '🎹', 'Yamaha DX7', 1983, 'rare', 'La synthèse FM : basses claquantes, cloches et pianos électriques des années 80.'),
  C('juno106', '🎹', 'Roland Juno-106', 1984, 'common', 'Polyphonique abordable au chorus magique : les nappes de la house et de la synthwave.'),
  C('prophet5', '🎹', 'Sequential Prophet-5', 1978, 'rare', 'Premier synthé polyphonique à mémoires : on pouvait enfin sauvegarder ses sons.'),
  C('sh101', '🎹', 'Roland SH-101', 1982, 'common', 'Petit monophonique à porter en bandoulière : basses acid et leads techno.'),
  C('sp1200', '🎚️', 'E-mu SP-1200', 1987, 'rare', 'Échantillonneur 12 bits au son granuleux : le grain du boom bap new-yorkais.'),
  C('linndrum', '🥁', 'LinnDrum', 1982, 'common', 'Une des premières boîtes à rythmes à sons échantillonnés : la pop des années 80.'),
  C('mellotron', '🎻', 'Mellotron', 1963, 'common', 'Une bande magnétique par touche : les flûtes et les cordes des Beatles et du rock progressif.'),
  C('theremin', '📻', 'Thérémine', 1920, 'rare', 'Il se joue sans le toucher : les mains dans un champ électrique règlent hauteur et volume.'),
  C('fairlight', '🖥️', 'Fairlight CMI', 1979, 'legendary', 'Premier grand échantillonneur numérique : on « dessinait » le son avec un stylet sur l’écran.'),
  C('amen', '🌪️', 'Le break « Amen »', 1969, 'legendary', '6 secondes de batterie des Winstons, découpées et rejouées dans toute la jungle et la drum & bass.'),
  C('live', '🎛️', 'Ableton Live', 2001, 'rare', 'Pensé pour la scène : la vue Session et ses clips ont changé la façon de produire.'),
  C('serum', '🎛️', 'Serum', 2014, 'common', 'Synthé à tables d’ondes visuel : on voit enfin ce que fait chaque réglage sur le son.'),
  C('vocoder', '🤖', 'Vocoder', 1939, 'common', 'Inventé pour compresser la voix au téléphone, il fait « parler » les synthés de Kraftwerk et Daft Punk.'),
  C('autotune', '🎤', 'Auto-Tune', 1997, 'common', 'Un correcteur de justesse poussé à fond devient un effet : de Cher à la trap.'),
  C('re201', '🔊', 'Roland Space Echo', 1974, 'rare', 'Un écho à bande magnétique : la signature du dub jamaïcain.'),
  C('modular', '🔌', 'Moog modulaire', 1964, 'legendary', 'Des modules reliés par des câbles : l’ancêtre de tous les synthés.'),
];
export const cardById = (id) => CARDS.find((c) => c.id === id);

/** Tire une carte parmi celles qui manquent (les légendaires sont plus rares). Reproductible pour une même graine. */
export function drawCard(owned = {}, seed) {
  const left = CARDS.filter((c) => !owned[c.id]);
  if (!left.length) return null;
  const r = rng('card-' + seed);
  const total = left.reduce((a, c) => a + RARITY[c.rarity].weight, 0);
  let x = r() * total;
  for (const c of left) { x -= RARITY[c.rarity].weight; if (x < 0) return c; }
  return left.at(-1);
}

/** Une carte par succès obtenu : rattrape les cartes manquantes (succès gagnés avant l'arrivée des cartes). */
export function cardsOwed(state) {
  const owned = { ...(state.cards || {}) };
  const out = [];
  const nBadges = Object.keys(state.badges || {}).length;
  const ids = Object.keys(state.badges || {}).sort();
  for (let i = Object.keys(owned).length; i < Math.min(nBadges, CARDS.length); i++) {
    const c = drawCard(owned, ids[i] || i);
    if (!c) break;
    owned[c.id] = true;
    out.push(c);
  }
  return out;
}
