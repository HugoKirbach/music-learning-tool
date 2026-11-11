// « Quoi de neuf » après chaque mise à jour + visite guidée des nouveautés (bulle flottante qui suit la navigation).
import { el, modal } from './ui.js';
import { getState, update } from './store.js';

export const APP_VERSION = '4.2';
export const CHANGELOG = [
  {
    version: '4.2', date: 'novembre 2026', items: [
      ['🎯', 'Défis du jour', 'trois défis chaque jour (un facile, un moyen, un corsé), les mêmes sur tous tes appareils. Chacun rapporte des boulons ; les trois réussis ouvrent le coffre du jour (boulons et XP en plus).'],
      ['🔩', 'Les boulons', 'la monnaie de Bip. Ils se gagnent avec les défis, le coffre et chaque succès (y compris ceux que tu avais déjà).'],
      ['👕', 'La garde-robe de Bip', '6 couleurs et 9 accessoires (casque, lunettes, casquette, couronne…) à acheter avec tes boulons ou à débloquer en progressant. Ta tenue le suit partout dans l’app.'],
      ['🤖', 'Bip, ton compagnon', 'il a sa page (Profil › Bip, ou le bouton 👕 du parcours), il te parle selon ta journée, commente tes réponses, et quand tu le touches il donne une astuce de production. Sur le chemin, il résume les points clés de chaque unité.'],
      ['🏅', 'Nouveaux succès', 'une catégorie « Défis & Bip » : défis réussis, coffres ouverts, morceaux complets, garde-robe.'],
    ],
  },
  {
    version: '4.1', date: 'novembre 2026', items: [
      ['🎵', 'Tes réponses construisent un morceau', 'chaque bonne réponse ajoute une piste (kick, hats, clap, basse, accords, mélodie), une erreur en retire une. À la fin de la leçon, tu écoutes le morceau que tu as gagné. Un morceau différent par partie du parcours.'],
      ['🤖', 'Bip réagit', 'la mascotte fête tes séries, sourit ou fait la moue dans le bandeau vert ou rouge, et te parle en haut du parcours.'],
      ['🌍', 'Un univers par partie', 'le studio, l’écran de Live, la salle d’écriture, le rack de synthés puis le club : chaque partie a son décor, avec un léger effet de profondeur au défilement.'],
      ['〰️', 'Schémas animés', 'dans les fiches, l’onde oscille, le filtre s’ouvre et l’enveloppe se dessine au rythme de la note. « Voir et entendre » joue le son en même temps.'],
      ['🔓', 'Déblocage animé', 'le trait du chemin se trace jusqu’à la leçon suivante et le cadenas saute ; l’XP de fin de leçon défile.'],
      ['🎯', 'Aujourd’hui, en haut du parcours', 'anneau d’objectif du jour, série en cours et révisions dues. Les leçons où tu as hésité reviennent après 1, 3, 7 puis 14 jours.'],
      ['📌', 'En-tête d’unité collant', 'en faisant défiler le chemin, l’unité en cours reste visible en haut, avec son bouton Guide.'],
      ['🖥️', 'Leçons sur deux colonnes (PC)', 'la consigne et l’explication à gauche, le grand exercice à droite (maquette de Live, piano roll, synthé). Rappel des touches 1 à 4, Espace et Entrée.'],
      ['🎹', 'Clavier MIDI détecté', 'un bandeau te prévient quand un exercice peut se jouer sur ton clavier.'],
      ['🔊', 'Volume égalisé', 'tous les sons des exercices sont ramenés au même niveau (Réglages › Général pour le couper).'],
      ['🧩', 'Extras', 'le parcours est l’écran principal. Jeux, ateliers libres et carnet sont réunis dans l’onglet Extras : optionnels, quand tu veux.'],
    ],
  },
  {
    version: '4.0', date: 'novembre 2026', items: [
      ['🎓', 'Le Parcours, nouveau cœur de l’app', 'un chemin façon Duolingo en 18 unités et 5 parties : rythme, clavier, MIDI, Ableton Live, gammes, accords, mélodies, synthé à la main, effets, arrangement, mixage et export. Des leçons de 3 à 5 minutes, de plus en plus poussées.'],
      ['🖱️', 'Ableton Live dans l’app', 'une maquette cliquable de Live (barre de contrôle, navigateur, Session, Arrangement, vues Clip et Device) pour apprendre où cliquer, et les raccourcis à taper au clavier.'],
      ['🎛️', 'Nouveaux exercices', 'clavier 3D et clavier MIDI (notes, accords, gammes, octaves), vélocité, potards (CC), boîte à rythmes, piano roll, synthé à régler à l’oreille, taper en rythme, paires, phrases à compléter, calculs de producteur.'],
      ['🏆', 'Contrôles, cœurs et sauts', 'chaque unité se termine par un contrôle (3 cœurs) ; « ⏩ Sauter ici » pour aller plus loin si tu connais déjà, et « S’entraîner » pour réviser là où tu as hésité.'],
      ['🎁', 'Ateliers et missions', 'chaque unité t’envoie dans les ateliers de l’app (Piano Rush, Pad Rush, Labs…) et te donne une mission à faire dans Live, Serum 2 ou au clavier.'],
      ['⚡', 'Le reste de l’app', 'l’ancien accueil devient l’« Entraînement libre » : session express, jeux, ateliers et carnet restent là, à côté du parcours.'],
    ],
  },
  {
    version: '3.0', date: 'octobre 2026', items: [
      ['🧭', 'Nouveau menu en 5 onglets', 'Accueil, 🎮 Jouer, 🎛️ Créer, 📓 Carnet, 👤 Profil. Chaque écran a son retour vers son onglet, les réglages ont leur propre page (roue ⚙️ du Profil).'],
      ['🔇', 'Jeux sans le son', 'la Nuit au club se joue aussi en silence : Grid Puzzle, Accord Express, Calcul de producteur, L’Architecte et Le Bon Réglage, avec leurs propres étoiles et leur set du jour.'],
      ['🔍', 'Recherche rapide', 'un atelier, un style, une mission ou un niveau en quelques lettres : bouton 🔍, Ctrl+K ou « / » sur PC.'],
      ['🧰', 'Boîte à outils', 'tap tempo, delays en ms, roue Camelot, accords de la tonalité et accordage du kick, à garder ouverte à côté d’Ableton.'],
      ['🧊', 'Jokers de série', '7 jours d’affilée rapportent un joker (2 au maximum) qui sauve ta série un jour où tu ne peux pas jouer.'],
      ['📓', 'Carnet', 'recherche, compteurs par type, filtre « à finir sur PC » et bouton pour garder ton idée en cours.'],
      ['✨', 'Finitions partout', 'thème clair lisible partout, boutons plus grands au doigt, menus de Piano Rush et Pad Rush par chapitres, collection plus claire, ateliers harmonisés.'],
    ],
  },
  {
    version: '2.5', date: 'octobre 2026', items: [
      ['⚡', 'Hard Trance et 🔨 Hard House', 'deux nouveaux styles dans l’Atlas (155 et 145 BPM), avec démo, ingrédients et astuces Live / MPC / Serum.'],
      ['❤️', 'Mes 3 styles préférés', 'à choisir dans le Profil ou depuis une fiche de l’Atlas : ils reviennent plus souvent en style du jour et tes amis les voient.'],
      ['🎧', 'Analyse de référence', 'mise en pause le temps de trouver une meilleure solution.'],
    ],
  },
  {
    version: '2.4', date: 'octobre 2026', items: [
      ['🎹', 'Piano Rush : 34 niveaux', '15 nouveaux niveaux répartis dans tous les chapitres (5 doigts, Vive le vent, When the Saints, accords mineurs, arpèges, contretemps, triolets, doubles croches, Joyeux anniversaire, sus, dorien, synthwave, ragtime…) pour une progression plus douce.'],
      ['🔲', 'Pad Rush : 32 niveaux', '14 nouveaux grooves : hat à contretemps, rock, techno, half-time, crescendo, neo soul, build-up, triolets trap, shuffle, drum & bass, arpège, hook et accords pop aux pads.'],
      ['🏅', 'Collection', 'près de 40 nouveaux succès (bronze, argent, or) et 24 cartes « Machines de légende » à collectionner, avec une anecdote sur chaque instrument. Profil › Ma collection.'],
      ['🪩', 'Nuit au club', '4 nouvelles salles (9 en tout) et 4 nouveaux mini-jeux : swing, compter les notes, filtre ouvert ou fermé, contour de la basse.'],
      ['🔉', 'Son du club', 'son de victoire 15 % moins fort, et la réverbe ne déborde plus sur la question suivante.'],
    ],
  },
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
  { route: '#/learn', title: '🎓 Ton parcours', text: 'Le cœur de l’app. En haut, ta journée : objectif du jour, série et révisions dues. En dessous, le chemin : touche le prochain rond pour commencer.' },
  { route: '#/learn', title: '🎵 Un morceau par leçon', text: 'Chaque bonne réponse ajoute une piste à ton morceau, que tu écoutes à la fin. Chaque unité a son guide ; « Sauter ici » te fait passer un test pour aller plus loin.' },
  { route: '#/home', title: '🧩 Extras', text: 'Tout ce qui est en plus du parcours, optionnel : jeux, ateliers libres, carnet d’idées et session express.' },
  { route: '#/play', title: '🎮 Jouer', text: 'Tous les jeux au même endroit : Nuit au club avec ou sans le son, Piano Rush, Pad Rush, oreille et révisions.' },
  { route: '#/club?silent=1', title: '🔇 Sans le son', text: 'Des mini-jeux 100 % visuels pour progresser là où tu ne peux pas mettre le son : grilles, accords, calcul, structure, réglages.' },
  { route: '#/create', title: '🎛️ Créer', text: 'Ton idée en cours, puis les ateliers rangés : écrire, son & mix, développer, et tout ce qui se finit dans ton studio.' },
  { route: '#/tools', title: '🧰 Boîte à outils', text: 'À garder ouverte à côté d’Ableton : tap tempo, delays en ms, roue Camelot, accords de la tonalité, accordage du kick.' },
  { route: '#/profile', title: '👤 Profil', text: 'Progrès, compétences, collection et amis. La roue ⚙️ ouvre les réglages (compte, MIDI, audio, Live, sauvegarde).' },
  { route: '#/home', title: '🔍 Trouver n’importe quoi', text: 'Le bouton 🔍 (ou Ctrl+K sur PC) cherche un atelier, un style, une mission ou un niveau en quelques lettres.' },
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
