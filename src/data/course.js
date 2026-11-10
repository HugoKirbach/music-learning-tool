// Le parcours « Apprendre » : 5 parties, 18 unités, des bases du rythme jusqu'au morceau exporté depuis Ableton Live.
// Chaque unité : des leçons courtes (fiches + exercices), des ateliers de l'app, une mission studio et un contrôle.
import { U1, U2, U3, U4, U5, U6 } from './course-p1.js';
import { U7, U8, U9 } from './course-p2.js';
import { U10, U11, U12, U13, U14 } from './course-p3.js';
import { U15, U16, U17, U18 } from './course-p4.js';
import { MORE } from './course-more.js';

export const PARTS = [
  { id: 1, name: 'Les fondations', emoji: '🧱', desc: 'Rythme, clavier et MIDI : ce qu’il faut avant d’ouvrir Live.' },
  { id: 2, name: 'Ableton Live : premiers pas', emoji: '🖥️', desc: 'L’interface, ton premier beat, jouer et enregistrer.' },
  { id: 3, name: 'Composer', emoji: '🎼', desc: 'Gammes, accords, mélodies et basses.' },
  { id: 4, name: 'Le synthé à la main', emoji: '🔊', desc: 'Oscillateurs, filtres, enveloppes, modulation, recettes de sons.' },
  { id: 5, name: 'Produire un morceau', emoji: '🚀', desc: 'Effets, arrangement, mixage, export et workflow de pro.' },
];

/** Les exercices de pratique (course-more.js) s'ajoutent à la fin des leçons concernées. */
const withMore = (u) => ({ ...u, nodes: u.nodes.map((n) => (MORE[n.id] ? { ...n, ex: [...n.ex, ...MORE[n.id]] } : n)) });

export const UNITS = [U1, U2, U3, U4, U5, U6, U7, U8, U9, U10, U11, U12, U13, U14, U15, U16, U17, U18].map(withMore);
