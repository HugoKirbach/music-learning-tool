import { el, header } from '../ui.js';

const LABS = [
  { href: '#/beat', emoji: '🥁', name: 'Lab Beat', desc: 'Boîte à rythmes 16 pas, euclidien, défis à l’oreille et sous contrainte.' },
  { href: '#/chords', emoji: '🎼', name: 'Lab Accords', desc: 'Degrés, modes, emprunts, voicings. Détection d’accords au clavier MIDI.' },
  { href: '#/melody', emoji: '🎵', name: 'Lab Mélodie', desc: 'Piano roll en gamme, outils de variation et Catchy-mètre.' },
  { href: '#/synth', emoji: '🔊', name: 'Lab Synthé', desc: 'Synthé soustractif, presets décodés pour Serum 2, défis de reproduction.' },
  { href: '#/ear', emoji: '👂', name: 'Oreille', desc: 'Intervalles, accords, progressions, styles, paramètres de son.' },
  { href: '#/atlas', emoji: '🗺️', name: 'Atlas des styles', desc: '20 styles électro et hors électro : ingrédients, références, astuces.' },
];

export function render(root) {
  root.append(
    header('Labs', 'Des ateliers courts pour chaque compétence. Tout ce que tu crées s’exporte en MIDI.', null),
    el('div.grid2', LABS.map((l) => el('a.tile', { href: l.href }, el('div.tile-emoji', l.emoji), el('b', l.name), el('span', l.desc)))),
  );
}
