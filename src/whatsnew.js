// « Quoi de neuf » après chaque mise à jour + visite guidée des nouveautés (bulle flottante qui suit la navigation).
import { el, modal } from './ui.js';
import { getState, update } from './store.js';

export const APP_VERSION = '2.3';
export const CHANGELOG = [
  {
    version: '2.3', date: 'octobre 2026', items: [
      ['🪩', 'Nuit au club', 'le jeu du téléphone : des mini-jeux de quelques secondes (oreille, rythme, notes, styles, drops), 5 salles à débloquer, un set du jour et des vinyles à collectionner. Tu apprends sans y penser.'],
      ['🏠', 'Nouvel accueil', 'rangé en sections (Aujourd’hui, Jouer, Studio, Suivi). Sur téléphone, les jeux d’abord ; sur PC, le studio d’abord. Bouton Jouer / Studio en haut pour changer.'],
      ['🎹', 'Piano Rush et Pad Rush', 'en accès direct depuis l’accueil, avec ta progression.'],
      ['♿', 'Accessibilité', 'sections titrées pour les lecteurs d’écran, boutons plus grands au doigt.'],
    ],
  },
  {
    version: '2.2', date: 'octobre 2026', items: [
      ['📊', 'Mes progrès', 'courbes sur 12 semaines (temps de pratique, score, tempo maîtrisé, oreille) et compétences qui stagnent.'],
      ['🎯', 'Objectifs personnels', 'un but avec une échéance, découpé en paliers chaque semaine.'],
      ['🎓', 'Certificats', 'une image à partager à chaque nouveau titre.'],
      ['🔁', 'Révisions pour tout', 'notions d’oreille et niveaux de Piano Rush / Pad Rush ratés reviennent après 1, 3 puis 7 jours.'],
      ['⏱️', 'Latence calibrée', 'tape avec le clic : les jeux corrigent le retard de ton écran, clavier ou MIDI.'],
      ['📴', 'Hors-ligne avec un compte', 'tu restes connecté sans réseau, la synchro repart toute seule.'],
      ['📲', 'App installable', 'bouton Installer, raccourcis sur l’icône, plein écran paysage dans les jeux.'],
    ],
  },
  {
    version: '2.1', date: 'octobre 2026', items: [
      ['🧭', 'Visite guidée réparée sur téléphone', 'boutons plus grands, et le choix du pseudo attend la fin de la visite.'],
      ['🔄', 'Mises à jour plus fiables', 'l’app télécharge toujours la dernière version de chaque fichier.'],
    ],
  },
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
  { route: '#/home', title: 'Ton accueil', text: 'Sur téléphone, les jeux d’abord ; sur PC, le studio d’abord (bouton Jouer / Studio en haut). La session express et ta carte de suivi sont toujours là.' },
  { route: '#/club', title: 'Nuit au club', text: 'Le jeu du téléphone : mini-jeux express, salles à débloquer, vinyles à collectionner… et ton oreille progresse sans que tu y penses.' },
  { route: '#/skills', title: 'Arbre de compétences', text: 'Ouvre une compétence pour voir comment la valider : chaque jeu ou Lab y contribue.' },
  { route: '#/project', title: 'Projet de la semaine', text: 'Une étape par jour, puis l’export vers Live le dimanche.' },
  { route: '#/labs', title: 'Labs', text: 'Les ateliers par familles. Les plus avancés apparaissent avec ton niveau (ou « Tout afficher » dans le Profil).' },
  { route: '#/pads', title: 'Pad Rush', text: 'Finger drumming sur tes pads (2×4 ou 4×4), au clavier ou au tactile.' },
  { route: '#/challenge', title: 'Défi de la semaine', text: 'La même contrainte pour tout le monde : publie ta version et écoute celles des autres.' },
  { route: '#/progress', title: 'Mes progrès', text: 'Tes courbes semaine après semaine, tes objectifs découpés en étapes et tes certificats.' },
  { route: '#/profile', title: 'Profil', text: 'Compte et amis, thème clair, mode gaucher, moteur audio, sortie MIDI vers Live.' },
];

const items = (list) => el('ul.whatsnew', list.map(([e, t, d]) => el('li', el('span', e), el('div', el('b', t), ' — ', d))));

export function showWhatsNew({ force = false } = {}) {
  const s = getState();
  if (!force && (!s.settings.onboarded || s.settings.seenVersion === APP_VERSION)) return false;
  update((st) => { st.settings.seenVersion = APP_VERSION; });
  const last = CHANGELOG[0];
  const close = modal(el('div',
    el('h2', `✨ Quoi de neuf (version ${last.version})`),
    items(last.items),
    CHANGELOG.slice(1, 3).map((v) => el('details', el('summary', `Version ${v.version}`), items(v.items))),
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
      el('button.btn.ghost', { onclick: () => { bubble.remove(); bubble = null; } }, 'Terminer'),
      el('button.btn.primary', { onclick: () => startTour(i + 1) }, i + 1 < TOUR.length ? 'Suivant →' : 'C’est parti 🎧')));
  document.body.append(bubble);
}
