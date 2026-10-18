import { el, header } from '../ui.js';

const LABS = [
  { href: '#/beat', emoji: '🥁', name: 'Lab Beat', desc: 'Boîte à rythmes 16 pas, euclidien, défis à l’oreille et sous contrainte.' },
  { href: '#/chords', emoji: '🎼', name: 'Lab Accords', desc: 'Degrés, modes, emprunts, voicings. Détection d’accords au clavier MIDI.' },
  { href: '#/melody', emoji: '🎵', name: 'Lab Mélodie', desc: 'Piano roll en gamme, outils de variation et Catchy-mètre.' },
  { href: '#/synth', emoji: '🔊', name: 'Lab Synthé', desc: 'Synthé soustractif, presets décodés pour Serum 2, défis de reproduction.' },
  { href: '#/hum', emoji: '🎤', name: 'Fredonne → MIDI', desc: 'Chante ou siffle une idée sur ta boucle : elle devient des notes. Ou chante la réponse à une phrase.' },
  { href: '#/basslab', emoji: '🎸', name: 'Labo de basse', desc: 'Écris ta ligne de basse : critique façon prof et 3 variantes (groovy, mélodique, minimale).' },
  { href: '#/mixdown', emoji: '🎚️', name: 'Mixdown express', desc: 'Une boucle mal mixée à corriger à l’oreille : volume, passe-haut, pan, réverbe, sidechain.' },
  { href: '#/remix', emoji: '🧬', name: 'Remix ton idée', desc: 'Change de style, de mode, réharmonise, half-time, inverse les rôles : développe au lieu de recommencer.' },
  { href: '#/callresponse', emoji: '🔁', name: 'Call & Response', desc: 'L’app joue une phrase, tu réponds en rythme : répète ou improvise (clavier, pads, MPC).' },
  { href: '#/arrange', emoji: '🧱', name: 'Lab Arrangement', desc: 'Ta boucle devient un morceau de 64 mesures : sections, filtre, risers, roulements.' },
  { href: '#/analyze', emoji: '🎧', name: 'Analyse de référence', desc: 'Importe un morceau : BPM, tonalité, structure, hook et 3 ingrédients.' },
  { href: '#/ear', emoji: '👂', name: 'Oreille', desc: 'Intervalles, accords, progressions, styles, paramètres de son.' },
  { href: '#/atlas', emoji: '🗺️', name: 'Atlas des styles', desc: '20 styles électro et hors électro : ingrédients, références, astuces.' },
];

export function render(root) {
  root.append(
    header('Labs', 'Des ateliers courts pour chaque compétence. Tout ce que tu crées s’exporte en MIDI.', null),
    el('div.grid2', LABS.map((l) => el('a.tile', { href: l.href }, el('div.tile-emoji', l.emoji), el('b', l.name), el('span', l.desc)))),
  );
}
