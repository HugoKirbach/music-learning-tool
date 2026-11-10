# ◆ BeatForge

**Un parcours pas à pas pour apprendre Ableton Live, le sound design au synthé et ton clavier MIDI**, façon Duolingo : des leçons de 3 à 5 minutes, de plus en plus poussées, des bases du rythme jusqu'à ton premier morceau exporté.

- **🎓 Le parcours** est l'écran principal et le cœur de l'app : 5 parties, 18 unités, 90 leçons, plus de 500 exercices interactifs (clavier 3D et MIDI, maquette cliquable d'Ableton Live, boîte à rythmes, piano roll, synthé à régler à l'oreille, raccourcis à taper…), des ateliers, des missions à faire dans Live et un contrôle par unité.
- **Les 🧩 Extras** (jeux, ateliers, carnet, session express) sont optionnels : ils restent là pour t'entraîner librement, et chaque unité du parcours t'y envoie au bon moment.
- **Sur PC**, chaque notion se termine par un geste à refaire dans **Ableton Live 12**, **Serum 2** (ou Drift) et sur ton clavier MIDI ; **sur téléphone**, les leçons et les jeux se font au doigt, même sans le son.

> Le but n'est pas que l'app compose à ta place. Elle t'apprend **où cliquer**, **quoi tourner** et **pourquoi**, puis te fait pratiquer jusqu'à ce que tu sois autonome.

---

## Sommaire

1. [Démarrer](#démarrer)
2. [L'app en 3 onglets](#lapp-en-3-onglets)
3. [🎓 Le parcours](#-le-parcours)
4. [🎮 Jouer](#-jouer)
5. [🎛️ Créer](#️-créer)
6. [📓 Carnet, 👤 Profil et ⚙️ Réglages](#-carnet--profil-et-️-réglages)
7. [Progresser](#progresser)
8. [Avec Ableton Live, le MPC et Serum](#avec-ableton-live-le-mpc-et-serum)
9. [Raccourcis et recherche](#raccourcis-et-recherche)
10. [Compte, synchro et amis](#compte-synchro-et-amis)
11. [Technique, tests et mise en ligne](#technique)

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

## L'app en 3 onglets

L'app tourne autour du parcours. Tout le reste est rangé dans **Extras** : optionnel, en plus.

| Onglet | Ce que tu y trouves |
|---|---|
| 🎓 **Apprendre** | L'écran d'ouverture. En haut, **aujourd'hui** : l'anneau d'objectif du jour, ta série 🔥, les révisions dues et la prochaine leçon. En dessous, le chemin des unités. |
| 🧩 **Extras** | Tout ce qui est en plus du parcours : **🎮 Jeux** (Nuit au club, Piano Rush, Pad Rush, oreille), **🎛️ Ateliers** (ton idée en cours, les labs, les missions studio), **📓 Carnet** (ce que tu as gardé), et la session express. |
| 👤 **Profil** | Niveau, série, compétences, styles préférés, collection, amis ; la roue ⚙️ ouvre les **Réglages**. |

Sur PC la barre est à gauche, avec 🔍 *Rechercher* et ⌨️ *Raccourcis* ; sur téléphone elle est en bas. Chaque écran a un bouton retour vers sa page (Jeux, Ateliers, Extras, Profil). Les ateliers avancés apparaissent avec ton niveau (*Réglages › Général › Ateliers : Tout afficher* pour tout voir d'un coup).

---

## 🎓 Le parcours

Un chemin sinueux d'unités, comme Duolingo : chaque leçon débloque la suivante, chaque unité se termine par un contrôle. Les ateliers et missions studio sont des **bonus** qui ne bloquent jamais la progression (pas de clavier MIDI ou pas d'Ableton sous la main ? tu avances quand même).

| Partie | Unités |
|---|---|
| 🧱 **Les fondations** | 1. Le temps et le tempo · 2. Le clavier (notes, dièses, octaves, C3 = 60) · 3. Ton clavier MIDI (Note On/Off, vélocité, octaves, molettes, potards, pads, clavier de l'ordinateur) |
| 🖥️ **Ableton Live : premiers pas** | 4. Découvrir Live (Session / Arrangement, barre de contrôle, navigateur, pistes, mixage, vue détail) · 5. Programmer un beat (Drum Rack, clips MIDI, grooves, vélocité, ghost notes, variations) · 6. Jouer et enregistrer (métronome, Session Record, overdub, quantification, Capture MIDI) |
| 🎼 **Composer** | 7. Gammes et tonalités (majeure, mineure, penta, mode Scale de Live 12) · 8. Les accords (triades, degrés, progressions, renversements, septièmes) · 9. Mélodies et basses (piano roll, fondamentales, offbeat, basse roulante, hooks, variations) |
| 🔊 **Le synthé à la main** | 10. Oscillateurs · 11. Filtres · 12. Enveloppes · 13. Modulation (LFO, synchro, glide, MIDI Map, macros, FM, wavetable) · 14. Recettes (sub, pluck, pad, supersaw, acid, reese) |
| 🚀 **Produire un morceau** | 15. Effets (chaîne, inserts et envois, EQ, compression, sidechain, racks) · 16. Arrangement (sections, automatisation, transitions, méthode soustractive) · 17. Mixage et export (gain staging, stéréo, limiteur, LUFS, stems) · 18. Workflow de pro (warp, freeze, resampling, raccourcis, groove, finir) + examen final |

**Dans une unité** : des leçons (fiches courtes puis exercices), des **ateliers** de l'app (Piano Rush, Pad Rush, Lab Beat, Lab Synthé, Mixdown…) qui se valident tout seuls quand tu les réussis, une **mission studio** à cocher pendant que tu la fais dans Live / Serum / au clavier, un **guide** (l'essentiel à retenir) et le **contrôle** (12 exercices, 3 cœurs).

**Les exercices** (tous nouveaux, pensés pour le parcours) :
- 🎹 **Clavier 3D + clavier MIDI** : trouver une note, une octave précise (boutons Octave − / +), jouer un accord, un renversement, une gamme ; le clavier de l'ordinateur joue comme dans Live (A = Do, Z / X = octave).
- 💪 **Vélocité** et 🎚️ **potards (CC)** : frapper doux / fort, tourner un potard jusqu'à la bonne valeur, ouvrir un filtre en direct avec ton contrôleur.
- 🖱️ **Maquette cliquable d'Ableton Live 12** : barre de contrôle, navigateur, Session, Arrangement, vues Clip et Device. « Où cliques-tu pour… ? »
- ⌨️ **Raccourcis** : tape la combinaison sur ton clavier (Ctrl ou ⌘, QWERTY ou AZERTY), ou choisis-la.
- 🥁 **Boîte à rythmes** (dont ghost notes et grooves à reproduire à l'oreille), 🎼 **piano roll** (motifs, basses sur une grille d'accords, hooks répétés), 👆 **taper en rythme** (avec le décalage moyen en ms).
- 🎛️ **Synthé à régler** : un vrai petit synthé (forme d'onde, unison, filtre, enveloppes, LFO, glide, FM) avec dessins en direct, à régler d'après une consigne ou **à l'oreille** d'après un son cible.
- 👂 Écoute (accords, gammes, intervalles, formes d'onde, filtre, enveloppes, contour), 🔗 paires, 🔢 remettre dans l'ordre, ✍️ phrases à compléter, 🧮 calculs de producteur (ms, Hz, mesures).

**Contenu vérifié** : les raccourcis et les fonctions de Live 12 citées viennent du manuel officiel d'Ableton. Un bouton **⚑ Signaler** sur chaque exercice range un signalement d'erreur dans ton Carnet.

**🎵 Tes réponses construisent un morceau** : chaque bonne réponse ajoute une piste à une boucle (kick, puis hats, clap, basse, accords, mélodie) et joue la mesure suivante ; une erreur retire une piste. Les pistes gagnées s'allument en haut de la leçon, et l'écran de fin joue le morceau que tu as « gagné » (bouton *Réécouter*). Chaque partie du parcours a son morceau. *Réglages › Général › Sons de validation* règle son niveau (doux, normal, coupé).

**🔊 Volume égalisé** : tous les sons des exercices (presets, sons de synthé réglés à la main, batteries) sont mesurés une fois puis ramenés au même niveau perçu. Dans un exercice de synthé, ton son et la cible gardent le même gain : les écarts que tu crées restent audibles. *Réglages › Général › Volume égalisé* pour le couper.

**🤖 Bip, la mascotte, réagit** : il sourit ou fait la moue dans le bandeau vert ou rouge, fête une série de bonnes réponses, et te parle en haut du parcours (objectif atteint, série à sauver…).

**🌍 Un univers par partie** : le studio (fondations), l'écran de Live, la salle d'écriture (composer), le rack de synthés, puis le club. Chaque partie a son décor en deux plans, avec un léger effet de profondeur au défilement. L'en-tête de l'unité en cours reste collé en haut, avec son bouton Guide. Quand une leçon se débloque, le trait du chemin se trace jusqu'à elle et le cadenas saute.

**〰️ Schémas animés** dans les fiches : l'onde oscille, la courbe du filtre s'ouvre, l'enveloppe se dessine au rythme de la note. « 🔊 Voir et entendre » joue le son en même temps.

**🖥️ Sur PC, deux colonnes** : la consigne et l'explication à gauche, le grand exercice à droite (maquette de Live, piano roll, synthé, clavier). Un rappel des touches (1 à 4 pour choisir, Espace pour écouter, Entrée pour vérifier) s'affiche pendant que tu réponds, et un bandeau **🎹 Clavier MIDI détecté** apparaît quand l'exercice peut se jouer au clavier.

**🔁 Révisions** : une leçon où tu as hésité (2 erreurs ou plus) revient après 1, 3, 7 puis 14 jours ; le compteur « Révisions dues » en haut du parcours lance l'entraînement.

**Comme Duolingo** : barre de progression, « Vérifier » puis bandeau vert ou rouge avec l'explication, les questions ratées reviennent en fin de leçon, série 🔥, XP, couronnes (sans faute 👑), **⏩ Sauter ici** (un test pour aller directement à une unité), **🏋️ S'entraîner** (révision des leçons où tu as hésité). À l'ouverture, l'app te demande ton niveau et peut te faire passer directement le test de l'unité 4 ou 7.

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
- **Réglages** (rubriques en haut de l'écran) : **Compte & synchro**, **Général** (volume, sons de validation, objectif du jour, indices, thème clair / sombre, animations, ateliers progressifs, mode gaucher, latence), **MIDI**, **Audio** (moteur *Auto / Performance / Stable* + diagnostic en direct), **Live** (sortie MIDI, horloge), **Rappels**, **Sauvegarde** (fichier, copie de secours), **App** (installation, nouveautés, visite guidée).

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
- **Aller à** (Maj + lettre) : H Apprendre (parcours), L Extras, E Jouer, C Créer, S lancer une session, J Piano Rush, D Pad Rush, N Nuit au club, O Oreille, B Beat, A Accords, M Mélodie, G Basse, Y Synthé, R Arranger, X Remix, T Compétences, K Carnet, P Profil. `?` affiche l'aide, `Échap` ferme. Les lettres seules restent au piano.

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
src/views/learn.js, lesson.js   le parcours (carte) et le lecteur de leçon
src/learn/         exercices interactifs, maquette d'Ableton Live, clavier 3D, sons et dessins des leçons
src/core/course.js progression du parcours, construction des leçons, vérification des réponses (coursegen.js : générateurs d'exercices)
src/data/course*.js le contenu du parcours (5 parties, 18 unités) ; ableton.js : zones de Live et raccourcis
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
