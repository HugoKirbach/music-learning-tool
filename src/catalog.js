// Catalogue des écrans : onglets de la navigation, rubriques des pages Jouer et Créer, libellés,
// bouton retour de chaque écran et historique « Reprendre où j'en étais ».

/** Onglets de la barre de navigation. `also` : écrans rattachés (onglet allumé + bouton retour vers l'onglet). */
export const TABS = [
  { id: 'home', icon: '🏠', label: 'Accueil', also: ['program', 'review', 'listen'] },
  { id: 'play', icon: '🎮', label: 'Jouer', also: ['rush', 'pads', 'club', 'ear', 'callresponse'] },
  { id: 'create', icon: '🎛️', label: 'Créer', also: ['labs', 'beat', 'chords', 'melody', 'basslab', 'hum', 'synth', 'mixdown', 'arrange', 'remix', 'critique', 'atlas', 'studio', 'path', 'project', 'challenge', 'tools'] },
  { id: 'notebook', icon: '📓', label: 'Carnet' },
  { id: 'profile', icon: '👤', label: 'Profil', also: ['progress', 'skills', 'bilan', 'collection', 'friends', 'placement', 'settings', 'latency'] },
];

/** Onglet auquel appartient un écran. */
export const tabOf = (id) => TABS.find((t) => t.id === id || t.also?.includes(id))?.id || 'home';

/** Rubriques des pages Jouer et Créer. */
export const SECTIONS = [
  { id: 'rhythm', tab: 'play', name: 'Jouer en rythme', emoji: '🎹', desc: 'Clavier, pads ou écran : les notes tombent, tu joues.' },
  { id: 'ear', tab: 'play', name: 'Oreille', emoji: '👂', desc: 'Reconnaître intervalles, accords, styles et sons.' },
  { id: 'write', tab: 'create', name: 'Écrire', emoji: '✍️', desc: 'Rythmes, accords, mélodies et basses.' },
  { id: 'sound', tab: 'create', name: 'Son & mix', emoji: '🔊', desc: 'Sound design décodé pour Serum 2, et mixage.' },
  { id: 'develop', tab: 'create', name: 'Développer', emoji: '🧱', desc: 'De la boucle au morceau.' },
  { id: 'studio', tab: 'create', name: 'Dans ton studio', emoji: '🎛️', desc: 'Missions et projets à finir dans Live, Serum ou sur le MPC.' },
];

export const SCREENS = [
  { id: 'rush', sec: 'rhythm', href: '#/rush', emoji: '🎹', name: 'Piano Rush', desc: 'Les notes tombent, joue-les en rythme : de la ronde au jazz.', keys: 'piano tiles clavier notes niveaux' },
  { id: 'pads', sec: 'rhythm', href: '#/pads', emoji: '🔲', name: 'Pad Rush', desc: 'Finger drumming sur tes pads : grooves, vélocité, roulements.', keys: 'mpc batterie finger drumming pads' },
  { id: 'callresponse', minLevel: 2, sec: 'rhythm', href: '#/callresponse', emoji: '🔁', name: 'Call & Response', desc: 'L’app joue une phrase, tu réponds en rythme.', keys: 'question réponse improvisation' },
  { id: 'ear', sec: 'ear', href: '#/ear', emoji: '👂', name: 'Quiz d’oreille', desc: 'Intervalles, accords, progressions, styles, paramètres.', keys: 'intervalles accords oreille quiz' },
  { id: 'club', sec: null, href: '#/club', emoji: '🪩', name: 'Nuit au club', desc: 'Mini-jeux express, salles, vinyles.', keys: 'jeu mini-jeux warioware vinyles sans le son silencieux' },
  { id: 'beat', sec: 'write', href: '#/beat', emoji: '🥁', name: 'Lab Beat', desc: 'Boîte à rythmes 16 pas, euclidien, défis.', keys: 'batterie drums séquenceur rythme' },
  { id: 'chords', sec: 'write', href: '#/chords', emoji: '🎼', name: 'Lab Accords', desc: 'Degrés, modes, emprunts, voicings.', keys: 'harmonie progression accords' },
  { id: 'melody', sec: 'write', href: '#/melody', emoji: '🎵', name: 'Lab Mélodie', desc: 'Piano roll en gamme, variations, Catchy-mètre.', keys: 'hook mélodie piano roll catchy' },
  { id: 'basslab', minLevel: 2, sec: 'write', href: '#/basslab', emoji: '🎸', name: 'Labo de basse', desc: 'Ta basse critiquée comme par un prof.', keys: 'basse bassline' },
  { id: 'hum', minLevel: 2, sec: 'write', href: '#/hum', emoji: '🎤', name: 'Fredonne → MIDI', desc: 'Chante une idée : elle devient des notes.', keys: 'voix chanter siffler micro' },
  { id: 'synth', sec: 'sound', href: '#/synth', emoji: '🔊', name: 'Lab Synthé', desc: 'Synthé décodé pour Serum 2, son mystère.', keys: 'serum preset sound design filtre enveloppe' },
  { id: 'mixdown', minLevel: 4, sec: 'sound', href: '#/mixdown', emoji: '🎚️', name: 'Mixdown express', desc: 'Une boucle mal mixée à corriger.', keys: 'mix eq volume sidechain' },
  { id: 'arrange', minLevel: 3, sec: 'develop', href: '#/arrange', emoji: '🧱', name: 'Lab Arrangement', desc: 'De la boucle au morceau de 64 mesures.', keys: 'structure intro drop break' },
  { id: 'remix', minLevel: 3, sec: 'develop', href: '#/remix', emoji: '🧬', name: 'Remix ton idée', desc: 'Style, mode, réharmonisation, half-time…', keys: 'variation transformer' },
  { id: 'critique', minLevel: 4, sec: 'develop', href: '#/critique', emoji: '🩺', name: 'Critique de ma prod', desc: 'Ton export Live analysé : 3 actions.', keys: 'analyse mix export wav' },
  { id: 'studio', sec: 'studio', href: '#/studio', emoji: '🎯', name: 'Missions studio', desc: 'Des gestes concrets sur Live, MPC et Serum.', keys: 'ableton live mpc serum missions' },
  { id: 'project', sec: 'studio', href: '#/project', emoji: '🏁', name: 'Projet de la semaine', desc: 'Un morceau en 7 étapes, exporté vers Live.', keys: 'projet morceau export' },
  { id: 'challenge', sec: 'studio', href: '#/challenge', emoji: '🏆', name: 'Défi de la semaine', desc: 'Une contrainte pour tout le monde.', keys: 'défi communauté contrainte' },
  { id: 'tools', sec: 'studio', href: '#/tools', emoji: '🧰', name: 'Boîte à outils', desc: 'Tap tempo, delays en ms, roue Camelot, accordage du kick.', keys: 'bpm delay ms camelot tonalité fréquence hz kick accorder calcul' },
  { id: 'atlas', sec: 'studio', href: '#/atlas', emoji: '🗺️', name: 'Atlas des styles', desc: 'Ingrédients, maquettes, références.', keys: 'styles genres house techno trance' },
  // Écrans hors rubriques (recherche et « Reprendre »)
  { id: 'program', href: '#/program', emoji: '📅', name: 'Programme 4 semaines', keys: 'programme parcours débutant' },
  { id: 'placement', href: '#/placement', emoji: '🧪', name: 'Test de la semaine', keys: 'test niveau lundi' },
  { id: 'skills', href: '#/skills', emoji: '🌳', name: 'Arbre de compétences', keys: 'compétences' },
  { id: 'bilan', href: '#/bilan', emoji: '📈', name: 'Bilan & coach', keys: 'bilan semaine coach' },
  { id: 'progress', href: '#/progress', emoji: '📊', name: 'Mes progrès', keys: 'courbes statistiques objectifs certificats' },
  { id: 'review', href: '#/review', emoji: '🔁', name: 'Révisions', keys: 'révisions répétition espacée' },
  { id: 'collection', href: '#/collection', emoji: '🏅', name: 'Ma collection', keys: 'succès badges cartes vinyles' },
  { id: 'friends', href: '#/friends', emoji: '👥', name: 'Amis', keys: 'amis classement pseudo' },
  { id: 'notebook', href: '#/notebook', emoji: '📓', name: 'Carnet d’idées', keys: 'idées sauvegarde midi' },
  { id: 'settings', href: '#/settings', emoji: '⚙️', name: 'Réglages', keys: 'compte synchro thème midi audio sauvegarde rappels' },
  { id: 'latency', href: '#/latency', emoji: '⏱️', name: 'Calibrer la latence', keys: 'latence retard bluetooth' },
];

export const screenById = (id) => SCREENS.find((s) => s.id === id);

/** Écran visible avec ce niveau (navigation progressive, ou « Tout afficher » dans les Réglages). */
export const isOpen = (x, lv, all = false) => all || !x.minLevel || lv >= x.minLevel;

/** Écrans qu'on reprend (ateliers et jeux), pas les pages de réglages ou de suivi. */
export const resumable = (x) => !!x && (!!x.sec || ['club', 'program'].includes(x.id));

/** Ajoute un écran à l'historique (plus récent en tête, sans doublon, 6 max). */
export function pushRecent(list = [], id) {
  if (!resumable(screenById(id))) return list;
  return [id, ...list.filter((x) => x !== id)].slice(0, 6);
}
