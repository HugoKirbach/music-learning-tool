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
- **MIDI** : branche ton MPC Key 37 en USB, va dans *Profil → Activer le clavier MIDI* (Chrome/Edge). Tu peux alors jouer le synthé, écrire des mélodies pas à pas et faire reconnaître les accords que tu joues. (Android + câble OTG fonctionne aussi ; iOS ne supporte pas Web MIDI.)

### Synchroniser téléphone ↔ PC
Pas de compte, tout reste sur l'appareil. *Profil → Exporter* crée un fichier `.json` ; *Importer* sur l'autre appareil.

---

## Le concept : la session express (≈ 7 min)

| Étape | Durée | Contenu |
|---|---|---|
| 👂 Échauffement | ~2 min | Intervalles, couleurs d'accords, progressions, blind test de styles, « quel paramètre a changé ? » |
| 🧪 Création | 3-5 min | Recréer un beat à l'oreille, beat sous contrainte, recette d'accords, hook sous contrainte, dictée mélodique, son mystère |
| 🎛️ Transfert studio | 5-10 min (ou « plus tard ») | Une mission concrète sur Live 12 / MPC / Serum 2 |

La session est **adaptative** : elle cible ta compétence la plus faible et te pousse vers des styles que tu n'as jamais essayés. Chaque session est différente, tu peux en enchaîner plusieurs par jour.

## Contenu

- **Lab Beat** : boîte à rythmes 16 pas (6 sons, ghost notes, swing, 4 kits), générateur **euclidien**, mutation, export MIDI. Modes *À l'oreille* (le niveau ajuste le nombre de rangées à trouver) et *Contrainte* (9 règles vérifiées automatiquement).
- **Lab Accords** : progressions par degrés dans 7 modes, fonctions tonales colorées, **emprunts modaux**, triades/7e/9e, voicings (voice leading, serré, écarté), 10 progressions célèbres, **détection des accords joués au clavier MIDI**, mode *Recette*.
- **Lab Mélodie** : piano roll calé sur la gamme (notes de l'accord surlignées), 4 mesures sur ta boucle (batterie + accords + basse), outils de variation (copie, AABA, rétrograde, miroir, séquence, « graine »), **Catchy-mètre** (7 critères : répétition, ambitus, notes d'accord sur les temps, mouvement conjoint, syncopes, respiration, résolution) avec conseils concrets, saisie pas à pas au clavier MIDI, modes *Défi hook* et *Dictée*.
- **Lab Synthé** : synthé soustractif (2 osc + unison + sub, filtre + enveloppe, ADSR, LFO, glide, drive), 13 presets avec leur **recette Serum 2**, fiche Serum générée pour ton son, clavier tactile / PC / MIDI, mode *Son mystère*.
- **Oreille** : 5 entraînements dont la difficulté suit ton niveau.
- **Atlas** : 20 styles (house, techno, acid, UKG, DnB, jungle, dubstep, trap, synthwave, trance, afro house, deep house, nu-disco, jersey club, ambient + reggaeton, lo-fi hip-hop, funk, bossa nova, afrobeats) avec démo jouable, ingrédients, références et astuces Live / MPC / Serum.
- **Studio** : 36 missions sur tes outils, avec checklist, minuteur, « pourquoi ça marche » et variante pour aller plus loin ; **Dé à idées** (point de départ × contrainte × twist), avec tes propres contraintes.
- **Carnet** : beats, progressions, idées complètes, sons et notes ; rouvrables et exportables en MIDI.
- **Gamification** : XP et niveaux avec titres, série de jours, objectif quotidien, quêtes, 22 badges, passeport des styles, compétences, calendrier d'activité. Les **indices disparaissent au niveau 6** (désormais −20 % d'XP si tu en demandes un).

### Export MIDI → Ableton / MPC
Les fichiers `.mid` sont multipistes (Drums, Accords, Basse, Mélodie) au tempo du projet. La batterie suit la convention Drum Rack / GM : 36 kick, 37 rim, 38 snare, 39 clap, 42 hat fermé, 46 hat ouvert. Convention de notes Ableton : C3 = 60.

---

## Technique

- **PWA sans dépendance ni build** : HTML/CSS/JavaScript (modules ES). Un seul code pour mobile et PC ; installable, hors-ligne (service worker).
- **Audio** : Web Audio API, tout est synthétisé en temps réel (batterie, synthé polyphonique, reverb à convolution), séquenceur à *lookahead* pour un timing précis.
- **MIDI** : Web MIDI API (entrée), écriture de fichiers SMF type 1 (sortie).
- **Données** : `localStorage` + export/import JSON.

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

## Mise en ligne (GitHub Pages)

Le workflow `.github/workflows/deploy.yml` lance les tests à chaque push et déploie la branche par défaut sur GitHub Pages.
**À faire une fois** : *Settings → Pages → Source : GitHub Actions*, puis relancer le workflow (*Actions → Run workflow*). L'app sera sur `https://<utilisateur>.github.io/music-learning-tool/`.
