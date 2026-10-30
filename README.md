# ◆ BeatForge

**Une salle d'entraînement de poche pour apprendre à composer** : rythmes, accords, mélodies « catchy », sound design et arrangement, en sessions de **5 à 10 minutes**.

- **Sur PC**, tu travailles : chaque atelier se termine par un geste à refaire dans **Ableton Live 12**, sur le **MPC Key 37** ou dans **Serum 2**, et tout s'exporte en MIDI.
- **Sur téléphone**, tu joues : des jeux courts qui entraînent ton oreille, ton rythme et ta théorie sans y penser, **même sans le son**.

> Le but n'est pas que l'app compose à ta place. Elle t'apprend **où chercher** et **quoi manipuler**, puis retire progressivement les indices pour que tu deviennes autonome.

---

## Sommaire

1. [Démarrer](#démarrer)
2. [L'app en 5 onglets](#lapp-en-5-onglets)
3. [🎮 Jouer](#-jouer)
4. [🎛️ Créer](#️-créer)
5. [📓 Carnet, 👤 Profil et ⚙️ Réglages](#-carnet--profil-et-️-réglages)
6. [Progresser](#progresser)
7. [Avec Ableton Live, le MPC et Serum](#avec-ableton-live-le-mpc-et-serum)
8. [Raccourcis et recherche](#raccourcis-et-recherche)
9. [Compte, synchro et amis](#compte-synchro-et-amis)
10. [Technique, tests et mise en ligne](#technique)

---

## Démarrer

### Sur téléphone (Android / iPhone)
1. Ouvre l'adresse de l'app (GitHub Pages) dans Chrome (Android) ou Safari (iPhone).
2. **Installe-la** : Android → menu ⋮ → *Installer l'application* ; iPhone → Partager → *Sur l'écran d'accueil*.
3. Elle fonctionne ensuite **hors-ligne**, comme une app native.

### Sur PC (Windows / Mac / Linux)
- **En ligne** : ouvre la même adresse dans Chrome ou Edge, puis clique l'icône *Installer* de la barre d'adresse.
- **En local** (avec [Node.js](https://nodejs.org) ≥ 18) : `npm start` puis http://localhost:8080 (sans Node : `python3 -m http.server 8080`).

### Brancher le MPC Key 37 (MIDI)
Câble USB sur le port « Computer » du MPC, mode contrôleur, app ouverte dans Chrome ou Edge, puis la pastille 🎹 en haut → « Autoriser ». L'app se reconnecte ensuite toute seule et détecte les (dé)branchements. *Réglages › MIDI* contient un testeur (note, vélocité, canal, CC) et le guide pas à pas. Android + câble OTG fonctionne aussi ; iOS ne gère pas le Web MIDI.

---

## L'app en 5 onglets

| Onglet | Ce que tu y trouves |
|---|---|
| 🏠 **Accueil** | La session express du jour, ta prochaine étape (série, test, projet, révisions…), un accès direct aux jeux (téléphone) ou à ton idée et au studio (PC). |
| 🎮 **Jouer** | Tous les jeux : Nuit au club (avec ou **sans le son**), Piano Rush, Pad Rush, Call & Response, quiz d'oreille, défi 2 min, révisions. |
| 🎛️ **Créer** | Ton idée en cours (beat → accords → basse → mélodie), puis les ateliers rangés en 4 rubriques : *Écrire*, *Son & mix*, *Développer*, *Dans ton studio*. |
| 📓 **Carnet** | Tout ce que tu as gardé : idées complètes, beats, accords, sons, notes. Recherche, filtres, export MIDI, partage. |
| 👤 **Profil** | Niveau, série, compétences, styles préférés, collection, amis ; la roue ⚙️ ouvre les **Réglages**. |

Sur PC la barre est à gauche, avec 🔍 *Rechercher* et ⌨️ *Raccourcis* ; sur téléphone elle est en bas, et 🔍 est en haut de l'Accueil, de Jouer et de Créer. Chaque écran a un bouton retour vers son onglet. Les ateliers avancés apparaissent avec ton niveau (*Réglages › Général › Ateliers : Tout afficher* pour tout voir d'un coup).

---

## 🎮 Jouer

### 🪩 Nuit au club : le jeu du téléphone
Tu es DJ : une soirée enchaîne des mini-jeux de quelques secondes façon WarioWare, la salle s'échauffe (le tempo monte), et tu progresses sans y penser. **9 salles** à débloquer avec les étoiles (du bar du coin à la rave orbitale), un **set du jour** (le même pour tout le monde, XP ×2), des **vinyles** à collectionner (noir, couleur, or), un récap « ce que tu as appris » avec un lien vers l'atelier qui approfondit chaque notion.

- **🔊 Avec le son** (13 mini-jeux) : plus aigu ?, joyeux ou triste ?, tape sur le temps, il manque un coup, quel style ?, répète la mélodie, quelle note ?, le plus rapide ?, droit ou swing ?, combien de notes ?, filtre ouvert ou fermé ?, ça monte ou ça descend ?, tape sur le drop.
- **🔇 Sans le son** (5 mini-jeux 100 % visuels, pour le métro, une salle d'attente ou une réunion) : **Grid Puzzle** (le coup en trop ou manquant dans une grille de séquenceur), **Accord Express** (construire un accord sur un mini-clavier, ou le nommer), **Calcul de producteur** (durée d'une mesure, delay en ms, quinte, relatif mineur, armure…), **L'Architecte** (remettre les sections d'un morceau dans l'ordre, trouver le drop sur une courbe d'énergie), **Le Bon Réglage** (lire une enveloppe, une courbe de filtre, une forme d'onde ou un spectre d'EQ). Aucun son n'est joué, les vibrations restent ; étoiles, salles et set du jour ont leur propre progression.

### 🎹 Piano Rush
Les notes tombent vers un piano dont chaque touche porte son nom (Do/Ré/Mi, C/D/E ou les deux). Tuiles à taper, à **tenir** ou **accords**. **34 niveaux** en chapitres, des rondes au jazz (5 doigts, Au clair de la lune, triades, I-V-vi-IV, deux mains, tresillo, stabs house, clave, shuffle, Lettre à Élise, ii-V-I, neuvièmes lo-fi, bossa, Pachelbel, ragtime…). Chaque niveau : **introduction théorique** → partie → **conclusion** (étoiles, avance/retard moyen, mesures à retravailler, geste à refaire dans Live / MPC / Serum). Modes **🎓 Apprentissage** (les notes dans l'ordre, sans tempo) et **Mode libre** en 4 difficultés. Toucher, clavier d'ordinateur ou clavier MIDI.

### 🔲 Pad Rush
Finger drumming sur une grille **2 × 4** (MPC Key 37) ou **4 × 4**. Un anneau se referme sur le pad à frapper et un séquenceur montre la mesure à venir. **34 niveaux** : four on the floor, backbeat, house, boom bap, dembow, accents et ghost notes **à la vélocité**, roulements trap, Amen, afro house, UK garage, **hard trance** (155 BPM) et **donk de hard house**, pads mélodiques… Modes Démo, 🎓 Apprentissage, **🎧 Défi à l'oreille** (le groove joue 2 fois sans rien afficher, tu le rejoues de mémoire) et Mode libre. Pads MIDI (assistant pour n'importe quel contrôleur), clavier ou tactile multi-doigts, mode gaucher.

### 👂 Oreille et révisions
- **Quiz d'oreille** : intervalles, couleurs d'accords, progressions, blind test de styles, « quel paramètre a changé ? ». La difficulté suit ton niveau ; « réponds en jouant » au clavier MIDI.
- **🔁 Call & Response** : l'app joue une phrase (mélodie, basse ou rythme), tu réponds sur la mesure suivante. Mode *Répète* (noté) ou *Improvise*.
- **⏱️ Défi 2 min** : un échauffement tiré au hasard.
- **🔁 Révisions espacées** : ce que tu rates (quiz, niveaux de jeux) revient après 1, 3 puis 7 jours, juste avant de l'oublier.

---

## 🎛️ Créer

### 💡 Mon idée
Une boucle qui te suit d'un atelier à l'autre : style, tempo, tonalité, batterie, accords, basse, mélodie. Le **mini-lecteur** en bas de l'écran la joue partout (mute par couche, tempo, swing) et l'exporte en **MIDI** ou en **📦 Pack Live**.

### ✍️ Écrire
- **🥁 Lab Beat** : boîte à rythmes 16 pas (ghost notes, swing, kits), générateur euclidien, mutation ; modes *À l'oreille* et *Contrainte*. Les pads MIDI jouent la batterie, **⏺ Rec pads** enregistre en live.
- **🎼 Lab Accords** : progressions par degrés dans 7 modes, fonctions tonales, **emprunts modaux**, triades / 7ᵉ / 9ᵉ, voicings, progressions célèbres, **reconnaissance des accords joués au clavier**, mode *Recette*.
- **🎵 Lab Mélodie** : piano roll calé sur la gamme, outils de variation (AABA, rétrograde, miroir, séquence…), **Catchy-mètre** (7 critères + conseils), saisie pas à pas, modes *Défi hook* et *Dictée*.
- **🎸 Labo de basse** : ta basse critiquée comme par un prof (fondamentale, frottements, place du kick, syncopes…) et 3 variantes argumentées.
- **🎤 Fredonne → MIDI** : chante ou siffle sur ta boucle, l'app transcrit en notes calées sur la gamme et le tempo.

### 🔊 Son & mix
- **Lab Synthé** : synthé soustractif (2 osc + unison + sub, filtre, ADSR, LFO, glide, drive), **28 presets avec leur recette Serum 2**, fiche Serum générée pour ton son, potards Q-Link (CC), mode *Son mystère*.
- **🎚️ Mixdown express** : une boucle volontairement mal mixée à corriger avec une vraie console, A/B avec la référence, et le geste Ableton pour chaque défaut.

### 🧱 Développer
- **Lab Arrangement** : ta boucle devient un morceau de 64 mesures (sections, filtre master, riser, roulements), défis vérifiés, export MIDI avec marqueurs.
- **🧬 Remix ton idée** : 7 transformations expliquées (changer de style, majeur ⇄ mineur, réharmonisation, half-time…).
- **🩺 Critique de ma prod** : importe ton export Live → niveau, dynamique, équilibre en 6 bandes, stéréo, contraste, et les 3 actions prioritaires dans Ableton.

### 🎛️ Dans ton studio
- **🎯 Missions studio** : 36 missions de 5-10 min sur Live, MPC et Serum (checklist, minuteur, « pourquoi ça marche »).
- **🏁 Projet de la semaine** : un morceau construit un peu chaque jour, exporté vers Live le dimanche (MIDI + pistes WAV).
- **🏆 Défi de la semaine** : la même contrainte pour tout le monde, publie ta version et écoute celles des autres.
- **🧰 Boîte à outils** (nouveau) : à garder ouverte à côté d'Ableton. **Tap tempo** (TAP ou Espace), tableau des **delays en ms** (normale, pointée, triolet) et des vitesses de LFO, durée des mesures ; **roue Camelot** interactive pour le mix harmonique et les modulations ; les **7 accords de la tonalité** (à écouter) ; **accordage du kick et de la sub** (notes graves en Hz, tonique et quinte, note la plus proche d'une fréquence). Tempo et tonalité s'appliquent à ton idée en un clic.
- **🗺️ Atlas des styles** : 22 styles (house, techno, trance, **hard trance**, **hard house**, DnB, UKG, trap, afro house, lo-fi…) avec démo jouable, ingrédients, références et astuces Live / MPC / Serum. Hard trance et hard house ont une **vraie mini-maquette** (sections, frise, export MIDI multipiste avec marqueurs) et un **parcours** du beat à l'export.
- **🎲 Dé à idées** : point de départ × contrainte × twist, avec tes propres contraintes.

---

## 📓 Carnet, 👤 Profil et ⚙️ Réglages

- **Carnet** : idées complètes, beats, accords, sons et notes ; filtres avec compteurs, recherche, rouvrir dans le bon atelier, export MIDI, partage par lien. Ce que tu gardes sur le téléphone est marqué **📲 à finir sur PC** et t'attend sur l'accueil du PC.
- **Profil** : niveau, série et jokers, activité des 28 derniers jours, compétences, **3 styles préférés**, derniers succès, passeport des styles ; accès à *Mes progrès*, *Compétences*, *Bilan & coach*, *Collection*, *Amis*, *Test de la semaine*.
- **Réglages** (rubriques en haut de l'écran) : **Compte & synchro**, **Général** (volume, objectif du jour, indices, thème clair / sombre, animations, ateliers progressifs, mode gaucher, latence), **MIDI**, **Audio** (moteur *Auto / Performance / Stable* + diagnostic en direct), **Live** (sortie MIDI, horloge), **Rappels**, **Sauvegarde** (fichier, copie de secours), **App** (installation, nouveautés, visite guidée).

---

## Progresser

- **⚡ Session express (≈ 7 min)** : 👂 échauffement de l'oreille → 🧪 création dans un style → 🎛️ mission Live / MPC / Serum. Elle cible ta compétence la plus faible (ou celle que tu as choisie) et te pousse vers des styles jamais essayés.
- **XP, niveaux et titres**, objectif quotidien, quêtes, **série de jours** avec **🧊 jokers** : 7 jours d'affilée rapportent un joker (2 au maximum), qui rattrape tout seul un jour manqué.
- **🌳 Arbre de compétences** : 18 compétences en 5 branches, validées par des preuves venues de tous les modules.
- **🧪 Test de la semaine** (le lundi, 5 min) : scores par domaine, le point faible devient le focus des sessions.
- **🎯 Erreurs récurrentes** : les notions que tu confonds souvent sont repérées et un exercice ciblé te les fait alterner.
- **📊 Mes progrès** : courbes sur 12 semaines, compétences qui stagnent, **objectifs** découpés en paliers, **certificats** à chaque nouveau titre.
- **📈 Bilan hebdo & coach**, **📅 Programme 4 semaines**, **🏅 Collection** (64 succès, 24 cartes « Machines de légende », vinyles, certificats).

---

## Avec Ableton Live, le MPC et Serum

- **Export MIDI** partout (`.mid` multipistes au tempo du projet). Batterie en convention Drum Rack / GM : 36 kick, 37 rim, 38 snare, 39 clap, 42 hat fermé, 46 hat ouvert. Notes : C3 = 60 (Ableton).
- **📦 Pack Live** (mini-lecteur, projet de la semaine) : ZIP avec le MIDI (boucle + arrangement), les pistes WAV (batterie, basse, accords, mélodie, mix) et un mode d'emploi (tempo, tonalité, sons, recettes Serum 2).
- **Sortie MIDI** (*Réglages › Live*) : l'app joue aussi ses notes en MIDI (canal 1 mélodie, 2 accords, 3 basse, 10 batterie) vers Live (loopMIDI / IAC) ou le MPC ; option pour couper le son de l'app.
- **Suivre le tempo de Live** : l'horloge MIDI règle le tempo de ton idée, Play / Stop dans Live lancent le mini-lecteur.
- **Serum 2** : chaque preset du Lab Synthé a sa recette, et le Lab génère une fiche pour ton propre son.

---

## Raccourcis et recherche

- **🔍 Recherche rapide** : `Ctrl + K` (ou `/`) sur PC, bouton 🔍 sur téléphone. Elle trouve un atelier, un style, une mission studio, un niveau de Piano Rush / Pad Rush ou une rubrique des réglages en quelques lettres (sans se soucier des accents) ; ↑ ↓ puis Entrée.
- **Lecture** : `Espace` lecture / stop (ta boucle, la question du quiz, ou TAP dans la boîte à outils), `1`-`4` couper batterie / basse / accords / mélodie, `+` / `−` tempo, `←` / `→` mesure ou accord.
- **Quiz** : `1`-`9` réponses, `Entrée` question suivante.
- **Aller à** (Maj + lettre) : H Accueil, E Jouer, C Créer, S lancer une session, J Piano Rush, D Pad Rush, N Nuit au club, O Oreille, B Beat, A Accords, M Mélodie, G Basse, Y Synthé, R Arranger, X Remix, T Compétences, K Carnet, P Profil. `?` affiche l'aide, `Échap` ferme. Les lettres seules restent au piano.

---

## Compte, synchro et amis

- **Compte facultatif et gratuit** (*Réglages › Compte*, ou 👤 en haut à droite) : Google ou e-mail. La progression est sauvegardée en ligne quelques secondes après chaque changement et **fusionnée** entre appareils (fusion à trois voies : une modification faite d'un seul côté n'est jamais écrasée). Le carnet est rangé à part, une **sauvegarde par jour** est gardée 7 jours. Hors-ligne, tu restes connecté et la synchro repart au retour du réseau.
- **Sans compte** : *Réglages › Sauvegarde* → Exporter un `.json`, puis Importer sur l'autre appareil.
- **Pseudo unique** et **👥 Amis** : demande / acceptation, classement de la semaine (niveau, XP, série, styles préférés). Seuls ces chiffres et le pseudo sont visibles.
- **Règles Firebase** : [`firestore.rules`](firestore.rules) est à copier dans *console Firebase › Firestore › Règles* puis **Publier** (à refaire quand il change).

---

## Technique

- **PWA sans dépendance ni build** : HTML / CSS / JavaScript (modules ES). Un seul code pour mobile et PC ; installable et hors-ligne (service worker, mises à jour fiables).
- **Audio** : Web Audio API, tout est synthétisé en temps réel, sans échantillon : 7 kits de batterie (909, 808, techno, acoustique, lo-fi, minimal, hard dance), 28 sons avec recette Serum 2 (unison stéréo, FM, filtres 12/24 dB, enveloppes de pitch), chaîne master (sidechain, glue, saturation, limiteur), effets en envoi (réverbe, delay ping-pong, chorus), séquenceur à *lookahead* piloté par un Web Worker, moteur *Stable* pour les téléphones et diagnostic en direct.
- **MIDI** : Web MIDI (entrée, sortie, horloge) et écriture de fichiers SMF type 1.
- **Données** : `localStorage` (format versionné, copie de secours avant chaque migration) + compte facultatif Firebase Auth / Firestore (SDK chargé à la demande).

```
index.html, styles.css, sw.js, manifest.webmanifest
src/main.js        routeur, barre du haut, onglets
src/catalog.js     onglets, rubriques, écrans (navigation, retour, recherche)
src/core/          logique pure et testée (théorie, rythme, MIDI, jeux, progression, fusion, recherche, boîte à outils…)
src/data/          styles, presets + recettes Serum 2, missions, niveaux, maquettes
src/views/         écrans
tests/             tests unitaires (node --test) et navigateur (tests/e2e)
```

### Tests

```bash
npm test          # tests unitaires (logique pure)
npm run check     # vérification des imports / exports
npm run e2e       # tests navigateur : tous les écrans PC + mobile (thèmes clair et sombre), jeux, MIDI simulé, compte et amis (faux Firebase avec les mêmes règles)
npm run test:all  # tout
```
Les tests navigateur demandent Playwright (`npm install --no-save playwright && npx playwright install chromium`). Sur GitHub, ils tournent à chaque push et **bloquent la mise en ligne** s'ils échouent.

### Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` lance les tests à chaque push puis déploie sur GitHub Pages.
**À faire une fois** : *Settings → Pages → Source : GitHub Actions*, puis relancer le workflow (*Actions → Run workflow*). L'app est ensuite sur `https://<utilisateur>.github.io/music-learning-tool/`.
