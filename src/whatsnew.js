// « Quoi de neuf » après chaque mise à jour + visite guidée des nouveautés (bulle flottante qui suit la navigation).
import { el, modal } from './ui.js';
import { getState, update } from './store.js';

export const APP_VERSION = '2.0';
export const CHANGELOG = [
  {
    version: '2.0', date: 'octobre 2026', items: [
      ['🎹', 'Piano Rush et 🔲 Pad Rush', 'les notes tombent / les pads s’allument : rythmes et accords, apprentissage pas à pas, défi à l’oreille.'],
      ['👥', 'Compte, pseudo et amis', 'progression synchronisée entre téléphone et PC, classement de la semaine entre amis.'],
      ['🌳', 'Arbre de compétences', 'tous les modules nourrissent les mêmes compétences.'],
      ['🧪', 'Test de la semaine', 'chaque lundi, 5 minutes pour mesurer tes progrès ; ton point faible oriente tes sessions.'],
      ['🏁', 'Projet de la semaine', 'un morceau construit chaque jour, exporté vers Live (MIDI + pistes WAV).'],
      ['🩺', 'Critique de ma prod', 'importe ton export Live : 3 actions concrètes pour ton mix.'],
      ['🏆', 'Défi de la semaine', 'une contrainte commune, écoute les idées des autres.'],
      ['🔗', 'Partage par lien', 'envoie une idée à un ami, il l’écoute sans compte.'],
      ['🎛️', 'Sortie MIDI et tempo de Live', 'joue tes exercices avec tes vrais sons dans Live, Serum ou le MPC ; Play / Stop et tempo suivent Live.'],
      ['📦', 'Pack Live', 'MIDI multipiste + pistes WAV + mode d’emploi dans un ZIP, depuis le mini-lecteur.'],
      ['☀️', 'Thème clair, mode gaucher, son stable', 'dans Profil › Réglages et Moteur audio.'],
    ],
  },
];

const TOUR = [
  { route: '#/home', title: 'Ton plan du jour', text: 'La session express, puis UNE carte de suivi : test de la semaine, étape du projet, révisions…' },
  { route: '#/skills', title: 'Arbre de compétences', text: 'Ouvre une compétence pour voir comment la valider : chaque jeu ou Lab y contribue.' },
  { route: '#/project', title: 'Projet de la semaine', text: 'Une étape par jour, puis l’export vers Live le dimanche.' },
  { route: '#/labs', title: 'Labs', text: 'Les ateliers par familles. Les plus avancés apparaissent avec ton niveau (ou « Tout afficher » dans le Profil).' },
  { route: '#/pads', title: 'Pad Rush', text: 'Finger drumming sur tes pads (2×4 ou 4×4), au clavier ou au tactile.' },
  { route: '#/challenge', title: 'Défi de la semaine', text: 'La même contrainte pour tout le monde : publie ta version et écoute celles des autres.' },
  { route: '#/profile', title: 'Profil', text: 'Compte et amis, thème clair, mode gaucher, moteur audio, sortie MIDI vers Live.' },
];

export function showWhatsNew({ force = false } = {}) {
  const s = getState();
  if (!force && (!s.settings.onboarded || s.settings.seenVersion === APP_VERSION)) return false;
  update((st) => { st.settings.seenVersion = APP_VERSION; });
  const last = CHANGELOG[0];
  const close = modal(el('div',
    el('h2', `✨ Quoi de neuf (version ${last.version})`),
    el('ul.whatsnew', last.items.map(([e, t, d]) => el('li', el('span', e), el('div', el('b', t), ' — ', d)))),
    el('div.row.gap.wrap',
      el('button.btn.primary', { onclick: () => { close(); startTour(); } }, '🧭 Visite guidée (1 min)'),
      el('button.btn.ghost', { onclick: () => close() }, 'Plus tard')),
  ));
  return true;
}

let bubble = null;
export function startTour(i = 0) {
  bubble?.remove();
  if (i >= TOUR.length) { bubble = null; return; }
  const st = TOUR[i];
  location.hash = st.route;
  bubble = el('div.tour-bubble', { role: 'dialog', 'aria-label': 'Visite guidée' },
    el('div.small.muted', `Visite guidée · ${i + 1}/${TOUR.length}`),
    el('b', st.title), el('p', st.text),
    el('div.row.gap',
      el('button.btn.small.ghost', { onclick: () => { bubble.remove(); bubble = null; } }, 'Terminer'),
      el('button.btn.small.primary', { onclick: () => startTour(i + 1) }, i + 1 < TOUR.length ? 'Suivant →' : 'C’est parti 🎧')));
  document.body.append(bubble);
}
