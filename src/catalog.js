// Catalogue des écrans : familles des Labs, libellés, et historique « Reprendre où j'en étais ».

export const FAMILIES = [
  { id: 'create', name: 'Créer', emoji: '✍️', desc: 'Écrire rythmes, accords, mélodies et basses' },
  { id: 'ear', name: 'Jouer & oreille', emoji: '🎹', desc: 'Jouer en rythme et entraîner l’oreille' },
  { id: 'sound', name: 'Son & mix', emoji: '🎚️', desc: 'Sound design, Serum 2 et mixage' },
  { id: 'studio', name: 'Studio & idées', emoji: '🧱', desc: 'Arranger, développer, analyser, explorer' },
];

export const SCREENS = [
  { id: 'beat', fam: 'create', href: '#/beat', emoji: '🥁', name: 'Lab Beat', desc: 'Boîte à rythmes 16 pas, euclidien, défis à l’oreille et sous contrainte.' },
  { id: 'chords', fam: 'create', href: '#/chords', emoji: '🎼', name: 'Lab Accords', desc: 'Degrés, modes, emprunts, voicings, détection d’accords au clavier MIDI.' },
  { id: 'melody', fam: 'create', href: '#/melody', emoji: '🎵', name: 'Lab Mélodie', desc: 'Piano roll en gamme, outils de variation et Catchy-mètre.' },
  { id: 'basslab', minLevel: 2, fam: 'create', href: '#/basslab', emoji: '🎸', name: 'Labo de basse', desc: 'Ta basse critiquée comme par un prof, et 3 variantes.' },
  { id: 'hum', minLevel: 2, fam: 'create', href: '#/hum', emoji: '🎤', name: 'Fredonne → MIDI', desc: 'Chante ou siffle une idée : elle devient des notes.' },
  { id: 'rush', fam: 'ear', href: '#/rush', emoji: '🎹', name: 'Piano Rush', desc: 'Les notes tombent, joue-les en rythme : 19 niveaux de la ronde au jazz, théorie + pratique.' },
  { id: 'pads', fam: 'ear', href: '#/pads', emoji: '🔲', name: 'Pad Rush', desc: 'Finger drumming sur tes pads (2×4 ou 4×4) : grooves, vélocité, roulements, défi à l’oreille.' },
  { id: 'ear', fam: 'ear', href: '#/ear', emoji: '👂', name: 'Quiz d’oreille', desc: 'Intervalles, accords, progressions, styles, paramètres, révisions.' },
  { id: 'callresponse', minLevel: 2, fam: 'ear', href: '#/callresponse', emoji: '🔁', name: 'Call & Response', desc: 'L’app joue une phrase, tu réponds en rythme (clavier, pads, MPC).' },
  { id: 'synth', fam: 'sound', href: '#/synth', emoji: '🔊', name: 'Lab Synthé', desc: 'Synthé décodé pour Serum 2, son mystère, potards MIDI.' },
  { id: 'mixdown', minLevel: 4, fam: 'sound', href: '#/mixdown', emoji: '🎚️', name: 'Mixdown express', desc: 'Une boucle mal mixée à corriger à l’oreille.' },
  { id: 'arrange', minLevel: 3, fam: 'studio', href: '#/arrange', emoji: '🧱', name: 'Lab Arrangement', desc: 'De la boucle au morceau de 64 mesures.' },
  { id: 'remix', minLevel: 3, fam: 'studio', href: '#/remix', emoji: '🧬', name: 'Remix ton idée', desc: 'Style, mode, réharmonisation, half-time… développe ton idée.' },
  { id: 'analyze', minLevel: 4, fam: 'studio', href: '#/analyze', emoji: '🎧', name: 'Analyse de référence', desc: 'BPM, tonalité, structure, extraction basse/lead, recréation Serum.' },
  { id: 'critique', minLevel: 4, fam: 'studio', href: '#/critique', emoji: '🩺', name: 'Critique de ma prod', desc: 'Importe ton export Live : 3 actions concrètes pour ton mix et ton arrangement.' },
  { id: 'atlas', fam: 'studio', href: '#/atlas', emoji: '🗺️', name: 'Atlas des styles', desc: '20 styles : ingrédients, références, astuces.' },
  // Écrans hors Labs (utilisés par « Reprendre »)
  { id: 'studio', fam: null, href: '#/studio', emoji: '🎛️', name: 'Studio (missions)', desc: '' },
  { id: 'program', fam: null, href: '#/program', emoji: '📅', name: 'Programme 4 semaines', desc: '' },
  { id: 'project', fam: null, href: '#/project', emoji: '🏁', name: 'Projet de la semaine', desc: '' },
  { id: 'placement', fam: null, href: '#/placement', emoji: '🧪', name: 'Test de la semaine', desc: '' },
  { id: 'skills', fam: null, href: '#/skills', emoji: '🌳', name: 'Arbre de compétences', desc: '' },
  { id: 'bilan', fam: null, href: '#/bilan', emoji: '📈', name: 'Bilan de la semaine', desc: '' },
];

export const screenById = (id) => SCREENS.find((s) => s.id === id);

/** Ajoute un écran à l'historique (plus récent en tête, sans doublon, 6 max). */
export function pushRecent(list = [], id) {
  if (!screenById(id)) return list;
  return [id, ...list.filter((x) => x !== id)].slice(0, 6);
}
