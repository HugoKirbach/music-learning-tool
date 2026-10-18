# ◆ BeatForge

**Une salle d'entraînement de poche pour apprendre à composer** : rythmes, accords, mélodies « catchy » et sound design, en sessions de **5-10 minutes**, sur smartphone **et** PC. Chaque exercice se termine par un geste à refaire sur tes vrais outils : **Ableton Live 12**, **MPC Key 37** et **Serum 2**.

> Le but n'est pas que l'app compose à ta place. Elle t'apprend **où chercher** et **quoi manipuler**, puis retire progressivement les indices pour que tu deviennes autonome.

---

## Utilisation

### Sur smartphone (Android / iPhone)
1. Ouvre l'URL de l'app (GitHub Pages, voir *Mise en ligne*) dans Chrome (Android) ou Safari (iPhone).
2. **Installer** : Android → menu ⋮ → *Installer l'application* ; iPhone → Partager → *Sur l'écran d'accueil*.
3. L'app fonctionne ensuite **hors-ligne**, comme une app native.

### Sur PC (Windows / Mac / Linux)
- **En ligne** : ouvre la même URL dans Chrome ou Edge, puis clique l'icône *Installer* dans la barre d'adresse → BeatForge s'ouvre dans sa propre fenêtre, hors-ligne.
- **En local** (sans internet, avec [Node.js](https://nodejs.org) ≥ 18) :
  ```bash
  npm start          # puis ouvre http://localhost:8080
  ```
  Sans Node : `python3 -m http.server 8080` dans le dossier.
- **MIDI (MPC Key 37)** : branche le MPC en USB sur le PC (port « Computer », mode contrôleur), ouvre l'app dans Chrome ou Edge et clique sur la pastille 🎹 en haut → « Autoriser ». Ensuite c'est **automatique** : l'app se reconnecte au démarrage et détecte les (dé)branchements. Profil → *Clavier MIDI* contient un testeur (note, vélocité, canal, CC) et le guide de branchement. Avec le clavier :
  - **Lab Synthé** : touches à la vélocité + **potards Q-Link** sur les réglages (CC74 cutoff, CC71 résonance, CC73 attack, CC72 release, CC1 LFO par défaut, tout réassignable par « 🎛️ Assigner un potard »).
  - **Oreille** (intervalles, accords) : **« Réponds en jouant »**, jouer les bonnes notes valide la réponse.
  - **Lab Accords** : l'accord joué est reconnu et s'ajoute à la progression en un clic.
  - **Lab Mélodie** : saisie pas à pas.
  - **Lab Beat** : les **pads** jouent la batterie (mapping MPC/Drum Rack : 36 kick, 38 snare, 39 clap, 42 hat, 46 hat ouvert…) et **⏺ Rec pads** enregistre en live pendant la lecture.
  - Ailleurs, le clavier joue un piano.
  (Android + câble OTG fonctionne aussi ; iOS ne supporte pas Web MIDI.)

### Synchroniser téléphone ↔ PC
- **Compte (facultatif, gratuit)** : *Profil → Compte & synchro* → « Continuer avec Google » ou e-mail + mot de passe, avec le même compte sur chaque appareil. La progression est sauvegardée en ligne (Firebase) quelques secondes après chaque changement, récupérée à l'ouverture, et reste utilisable hors-ligne. Si deux appareils ont été modifiés, les données sont **fusionnées** (XP, jours, badges, carnet, records Piano Rush réunis ; idée en cours et réglages du plus récent). Bouton **👤 Connexion** toujours visible en haut à droite ; une fois connecté il affiche ton avatar et l'état de la synchro (✓, ⏳, 📴, ⚠️). Sur iPhone (app installée), préfère l'e-mail : la fenêtre Google peut y être bloquée.
- **Sans compte** : *Profil → Exporter* crée un fichier `.json` ; *Importer* sur l'autre appareil.

---

## Le concept : la session express (≈ 7 min)

| Étape | Durée | Contenu |
|---|---|---|
| 👂 Échauffement | ~2 min | Intervalles, couleurs d'accords, progressions, blind test de styles, « quel paramètre a changé ? » |
| 🧪 Création | 3-5 min | Recréer un beat à l'oreille, beat sous contrainte, recette d'accords, hook sous contrainte, dictée mélodique, son mystère |
| 🎛️ Transfert studio | 5-10 min (ou « plus tard ») | Une mission concrète sur Live 12 / MPC / Serum 2 |

La session est **adaptative** : elle cible ta compétence la plus faible et te pousse vers des styles que tu n'as jamais essayés. Chaque session est différente, tu peux en enchaîner plusieurs par jour.

## Contenu

- **Navigation** : les Labs sont rangés en 4 familles (*Créer*, *Oreille & jeu*, *Son & mix*, *Studio & idées*) avec une rangée **« Reprendre »** (derniers écrans ouverts). L'accueil tient en 3 blocs : la session du jour, une carte de suivi contextuelle (bilan, programme, révisions ou missions en attente) et un accès rapide.
- **Mini-lecteur « Mon idée »** : barre fixe au-dessus de la navigation avec style, tempo, tonalité et accords de ton idée, ▶/■, mute par couche (batterie, basse, accords, mélodie) et un panneau (tempo, swing, export MIDI, sauvegarde, nouvelle idée). La boucle **continue quand tu passes de Beat à Accords à Mélodie** ; elle s'arrête et la barre se cache dans les exercices.
- **Raccourcis clavier (PC)** : `Espace` lecture/stop (ou écoute de la question), `1`-`4` couper batterie/basse/accords/mélodie, `+`/`−` tempo, `←`/`→` mesure ou accord, `1`-`9` réponses des quiz et `Entrée` question suivante, **Maj + lettre** pour naviguer (J Piano Rush, D Pad Rush, B Beat, A Accords, M Mélodie, G Basse, Y Synthé, O Oreille, R Arranger, X Remix, S Session, L Labs, K Carnet, P Profil), `?` aide, `Échap` fermer. Les lettres seules restent au piano.
- **Lab Beat** : boîte à rythmes 16 pas (6 sons, ghost notes, swing, 4 kits), générateur **euclidien**, mutation, export MIDI. Modes *À l'oreille* (le niveau ajuste le nombre de rangées à trouver) et *Contrainte* (9 règles vérifiées automatiquement).
- **Lab Accords** : progressions par degrés dans 7 modes, fonctions tonales colorées, **emprunts modaux**, triades/7e/9e, voicings (voice leading, serré, écarté), 10 progressions célèbres, **détection des accords joués au clavier MIDI**, mode *Recette*.
- **Lab Mélodie** : piano roll calé sur la gamme (notes de l'accord surlignées), 4 mesures sur ta boucle (batterie + accords + basse), outils de variation (copie, AABA, rétrograde, miroir, séquence, « graine »), **Catchy-mètre** (7 critères : répétition, ambitus, notes d'accord sur les temps, mouvement conjoint, syncopes, respiration, résolution) avec conseils concrets, saisie pas à pas au clavier MIDI, modes *Défi hook* et *Dictée*.
- **Lab Synthé** : synthé soustractif (2 osc + unison + sub, filtre + enveloppe, ADSR, LFO, glide, drive), 13 presets avec leur **recette Serum 2**, fiche Serum générée pour ton son, clavier tactile / PC / MIDI, mode *Son mystère*.
- **🎹 Piano Rush** (Labs › Jouer & oreille, raccourci `Maj+J`) : jeu façon Piano Tiles / Guitar Hero. Les notes tombent vers un piano où chaque touche porte son nom (Do/Ré/Mi, C/D/E ou les deux). Tuiles à taper, à **tenir** (notes longues) ou **accords** (toutes les notes ensemble), métronome, guide audio, démo, pause. Jouable au toucher, au clavier d'ordinateur (rangée A S D F… = blanches, Q W E R… = noires) ou au clavier MIDI (octave libre).
  - **Parcours** de 19 niveaux en 7 chapitres, du plus simple au plus complexe : rondes/blanches, noires, noire pointée, croches, silences, triades I-IV-V, progression pop I-V-vi-IV, deux mains, tresillo, stabs piano house en m7, son clave, shuffle en triolets, doubles croches (Lettre à Élise), ii-V-I jazz, neuvièmes lo-fi, bossa nova, Canon de Pachelbel, Greensleeves. Chaque niveau s'ouvre sur une **introduction théorique** (notion, à retenir, aperçu du rythme, accords détaillés note par note) et se termine par une **conclusion** (étoiles, précision, avance/retard moyen, notes tenues trop courtes, mesures à retravailler, ce que tu as appris, geste à refaire dans Live / MPC / Serum). 60 % débloquent le niveau suivant.
  - **🎓 Apprentissage** (bouton sur l'intro et la conclusion de chaque niveau) : les notes du niveau dans l'ordre, sans rythme imposé. La note suivante s'allume quand la bonne a été jouée (un accord = une étape, notes dans n'importe quel ordre). En fin de boucle, rejouer la 1re note recommence ; un compteur affiche les répétitions (mémorisé par niveau), avec erreurs et durée de la dernière boucle.
  - **Mode libre** : tous les niveaux en Facile (tempo ×0,75), Normal, Difficile ou Expert (tempo ×1,3, timing strict, sans noms sur les tuiles), plus des **rythmes aléatoires** dont la complexité suit la difficulté.
- **🔲 Pad Rush** (Labs › Jouer & oreille, raccourci `Maj+D`) : finger drumming sur une grille de pads **2 × 4** (8 pads, MPC Key 37) ou **4 × 4** (16 pads). Un anneau se referme sur le pad à frapper, et un **séquenceur** au-dessus montre la mesure à venir (une ligne par son).
  - **Parcours** de 18 niveaux en 6 chapitres : four on the floor, backbeat, hats, house, boom bap, dembow, **accents et ghost notes notés à la vélocité** (pads MIDI), doubles croches, **roulements trap 1/16 et 1/32**, fill, break façon Amen, afro house et clave, UK garage, puis **pads mélodiques** (gamme, riff de basse, chops d'accords). Intro théorique (partition en grille, disposition des sons sur tes pads) et conclusion à chaque niveau.
  - **Modes** : Jouer, Démo, 🎓 Apprentissage (coups dans l'ordre, sans tempo, compteur de répétitions), **🎧 Défi à l'oreille** (le groove joue 2 fois sans rien afficher, tu le rejoues de mémoire, puis la solution est révélée case par case), Mode libre en 4 difficultés.
  - **Roulements on/off** : désactivés, les coups plus rapides que la croche sur un même pad sont simplifiés (pratique au tactile, en déplacement).
  - **Entrées** : pads MIDI (pad 1 = note 36 par défaut, ou **Assistant pads MIDI** pour n'importe quel contrôleur), clavier (`Q W E R` / `A S D F`, + `1 2 3 4` / `Z X C V` en 4 × 4) ou tactile multi-doigts.
- **Oreille** : 5 entraînements dont la difficulté suit ton niveau.
- **📅 Programme 4 semaines** : Groove → Harmonie → Hooks → Sound design & arrangement. 6 jours de session (5-10 min) + 1 mini-projet par semaine à réaliser dans Live / MPC / Serum. Rappel quotidien ajoutable à ton agenda (fichier .ics).
- **🔁 Révisions espacées** : chaque erreur dans un quiz d'oreille crée une fiche qui revient après 1, 2, 4, 8 puis 16 jours ; elles s'insèrent automatiquement dans les sessions.
- **🔁 Call & Response** : l'app joue une phrase (mélodie, basse ou rythme), tu réponds sur la mesure suivante au clavier, aux pads ou sur le MPC. Mode *Répète* (précision note + timing) ou *Improvise* (écho rythmique, gamme, notes d'accord, résolution).
- **🧱 Lab Arrangement** : ta boucle devient un morceau de 64 mesures (16 blocs : sections, pistes, batterie partielle, filtre master qui s'ouvre/se ferme, riser, roulement de snare), 3 modèles, 4 défis vérifiés, export MIDI 64 mesures avec marqueurs de sections.
- **🎧 Analyse de référence** : importe un MP3/WAV → forme d'onde avec grille de mesures, **BPM et 1er temps détectés**, tap tempo, métronome, **tonalité estimée**, repères de structure, boucle de 4 mesures pour relever le hook au clavier (envoi vers le Lab Mélodie), 3 ingrédients sauvés dans le Carnet. Tout est analysé sur l'appareil.
  - **Extraire & recréer** : isole la **ligne de basse** ou le **lead** (bandes de fréquences + détection de hauteur YIN / saillance harmonique, harmoniques de la basse neutralisées pour le lead), relève ses notes calées sur la gamme, mesure son timbre (forme d'onde par les harmoniques paires/impaires, brillance, enveloppe, largeur stéréo, vibrato, réverbe) et en déduit un **preset de correction**. Exercice : reproduire le son dans **Serum 2** avec 4 indices progressifs, essai noté dans le synthé de l'app, recette Serum 2 complète, écoute A/B original isolé ↔ correction jouée sur les notes relevées, export MIDI de la ligne. Sans IA de séparation : un élément noyé dans d'autres instruments (ou doublant la basse à l'octave) sera moins bien isolé.
- **🎤 Fredonne → MIDI** : chante ou siffle une idée sur ta boucle (accordeur en direct), l'app la transcrit en notes calées sur la gamme et le tempo, avec Catchy-mètre, puis l'envoie au Lab Mélodie. Mode « Chante la réponse » noté.
- **🎸 Labo de basse** : écris ta basse, l'app la critique comme un prof (fondamentale sur le 1, notes qui frottent, sauts, tessiture, place du kick, syncopes, notes d'approche) et propose 3 variantes argumentées (groovy, mélodique, minimale). La ligne remplace le motif de basse de ton idée.
- **🎚️ Mixdown express** : une boucle volontairement mal mixée (2-3 défauts parmi 8 : basse trop forte, accords boueux, kick noyé, masquage, soupe de réverbe, panoramique, pas de sidechain, hats agressifs) à corriger avec une vraie console (volume, passe-haut, pan, réverbe, solo, sidechain), écoute A/B avec la référence, règle et geste Ableton pour chaque défaut.
- **🧬 Remix ton idée** : 7 transformations expliquées (changer de style, majeur ⇄ mineur, réharmonisation par tierces, accord emprunté, half-time, rôles basse/lead inversés, version épurée), empilables, à comparer et garder.
- **📈 Bilan hebdo & coach** : XP par jour et par compétence comparée à la semaine précédente, précision de l'oreille, styles travaillés, playlist de tes idées de la semaine, conseils et plan personnalisé ; export en image ou en texte.
- **Atlas** : 20 styles (house, techno, acid, UKG, DnB, jungle, dubstep, trap, synthwave, trance, afro house, deep house, nu-disco, jersey club, ambient + reggaeton, lo-fi hip-hop, funk, bossa nova, afrobeats) avec démo jouable, ingrédients, références et astuces Live / MPC / Serum.
- **Studio** : 36 missions sur tes outils, avec checklist, minuteur, « pourquoi ça marche » et variante pour aller plus loin ; **Dé à idées** (point de départ × contrainte × twist), avec tes propres contraintes.
- **Carnet** : beats, progressions, idées complètes, sons et notes ; rouvrables et exportables en MIDI.
- **Gamification** : XP et niveaux avec titres, série de jours, objectif quotidien, quêtes, 22 badges, passeport des styles, compétences, calendrier d'activité. Les **indices disparaissent au niveau 6** (désormais −20 % d'XP si tu en demandes un).

### Export MIDI → Ableton / MPC
Les fichiers `.mid` sont multipistes (Drums, Accords, Basse, Mélodie) au tempo du projet. La batterie suit la convention Drum Rack / GM : 36 kick, 37 rim, 38 snare, 39 clap, 42 hat fermé, 46 hat ouvert. Convention de notes Ableton : C3 = 60.

---

## Technique

- **PWA sans dépendance ni build** : HTML/CSS/JavaScript (modules ES). Un seul code pour mobile et PC ; installable, hors-ligne (service worker).
- **Audio** : Web Audio API, tout est synthétisé en temps réel, sans échantillon :
  - **6 kits de batterie** (909, 808, techno avec rumble, acoustique, lo-fi, minimal) : kicks à enveloppe de pitch + click + saturation, snares à 2 tons, **hats métalliques** (6 oscillateurs inharmoniques façon 808/909), percussions (rim, cowbell, conga, tom) ;
  - **25 sons** en 4 familles (Keys, Pads, Leads, Basses) avec recette Serum 2 : e-piano FM, orgue house, strings, chœur, hoover, marimba, basses Moog / FM / wobble / 808… Unison **stéréo**, FM, filtre 12/24 dB, enveloppe de pitch, couche de bruit ;
  - **chaîne master** : sidechain (pompe réglable), compresseur glue, saturation douce, limiteur ; **effets en envoi** : réverbe (pré-délai, amortissement), delay ping-pong synchronisé, chorus stéréo ;
  - séquenceur à *lookahead* piloté par un minuteur en Web Worker (non ralenti quand la page est chargée) ;
  - **stabilité** : chaque note est débranchée des bus une fois finie, envois d'effets partagés (pas de nœud par note), polyphonie limitée avec vol de voix en fondu, courbes de saturation en cache ;
  - **Moteur audio** (*Profil*) : *Auto* (Stable sur écran tactile), *Performance* (latence minimale, effets complets) ou *Stable* (réserve de son plus grande, notes programmées 300 ms à l'avance, réverbe courte, un seul compresseur, sans suréchantillonnage, unisson limitée) + **diagnostic en direct** (latence, voix actives, notes en retard, nettoyage, minuteur) avec rapport copiable.
- **MIDI** : Web MIDI API (entrée), écriture de fichiers SMF type 1 (sortie).
- **Données** : `localStorage` (hors-ligne) + compte facultatif Firebase Auth / Firestore (SDK chargé à la demande, 1 document par utilisateur, règles : chacun n'accède qu'à son document) + export/import JSON.

```
index.html, styles.css, sw.js, manifest.webmanifest
src/core/     logique pure et testée (théorie, rythme, MIDI, catchy-mètre, progression, sessions, audio)
src/data/     styles, presets + recettes Serum 2, missions studio
src/views/    écrans
tests/        tests unitaires (node --test)
```

```bash
npm test        # tests unitaires
npm run check   # vérification des imports/exports
```

## Progresser : compétences, test de la semaine, projet

- **🌳 Arbre de compétences** (Profil, `Maj+T`) : 18 compétences en 5 branches (rythme, harmonie, mélodie & oreille, son & production, autonomie). Chacune se valide par des preuves venant de tous les modules (Piano Rush, Pad Rush, quiz, Labs, missions…).
- **🧪 Test de la semaine** (chaque lundi, une fois par semaine, ≈ 5 min) : intervalles, accords, progressions, styles, paramètres de son et un test de régularité en rythme. Scores par domaine comparés à la semaine précédente ; le point faible devient le **focus des sessions express** de la semaine.
- **🏁 Projet de la semaine** : un morceau construit un peu chaque jour (beat, accords, basse, hook, arrangement, son & mix) et exporté vers Live le dimanche : MIDI multipiste et **pistes audio WAV** (batterie, basse, accords, mélodie + mix, dans un ZIP).
- **🩺 Critique de ma prod** : importe ton export Live (et une référence) → niveau, dynamique, équilibre en 6 bandes, largeur stéréo, contraste de l'arrangement, densité, et les **3 actions prioritaires dans Ableton**. Tout est analysé sur l'appareil.

## Confort

- **Navigation progressive** : les ateliers avancés apparaissent avec ton niveau (Profil › Réglages › Labs : « Tout afficher »).
- **Thème clair / sombre / auto**, **animations réduites** (ou selon le système), focus clavier visible, zoom autorisé, libellés pour les lecteurs d'écran.
- **Mode gaucher** pour les pads (grille inversée gauche ↔ droite).
- **Partager une idée par lien** (mini-lecteur › 🔗 Partager, ou depuis le Carnet) : l'idée est compressée dans l'adresse, ton ami l'écoute sans compte et peut l'ajouter à son carnet.
- **Quoi de neuf** après chaque mise à jour, avec une **visite guidée** (aussi dans Profil › Réglages).

## Compte, amis et règles Firebase

- **Compte facultatif** (Profil › Compte & synchro) : progression sauvegardée en ligne et fusionnée entre appareils (fusion à trois voies : une modification faite d'un seul côté n'est jamais écrasée). Le carnet est rangé à part (1 document par idée) et une **sauvegarde par jour** est gardée sur 7 jours, restaurable en un clic.
- **Pseudo unique** demandé à la première connexion ; **👥 Amis** : demande / acceptation, classement de la semaine (niveau, XP de la semaine, série et record). Seuls ces chiffres et le pseudo sont visibles par tes amis.
- **Filet de sécurité local** : le format de sauvegarde est versionné (copie automatique avant chaque mise à jour du format), une sauvegarde illisible n'est jamais effacée, et une copie de secours est faite avant toute réinitialisation, import ou restauration.
- **Règles de sécurité** : le fichier [`firestore.rules`](firestore.rules) est à copier dans *console Firebase › Firestore › Règles* puis **Publier** (à refaire quand il change).

## Tests

```bash
npm test          # tests unitaires (logique pure)
npm run e2e       # tests navigateur : tous les écrans PC + mobile, jeux, MIDI simulé, compte et amis (faux Firebase avec les mêmes règles)
npm run test:all  # tout
```
Les tests navigateur demandent Playwright (`npm install --no-save playwright && npx playwright install chromium`). Sur GitHub, ils tournent à chaque push et **bloquent la mise en ligne** s'ils échouent.

## Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` lance les tests à chaque push et déploie la branche par défaut sur GitHub Pages.
**À faire une fois** : *Settings → Pages → Source : GitHub Actions*, puis relancer le workflow (*Actions → Run workflow*). L'app sera sur `https://<utilisateur>.github.io/music-learning-tool/`.
