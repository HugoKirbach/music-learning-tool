// Missions Studio : exercices de 5-10 min à faire sur Ableton Live 12, MPC Key 37 et Serum 2.
// Chaque mission enseigne un GESTE réutilisable (why) et propose une variante pour devenir autonome (next).

export const TOOLS = {
  ableton: { name: 'Ableton Live 12', short: 'Live 12', color: '#ffb84d', emoji: '🎛️' },
  mpc: { name: 'MPC Key 37', short: 'MPC', color: '#ff5d73', emoji: '🎹' },
  serum: { name: 'Serum 2', short: 'Serum 2', color: '#5ce1e6', emoji: '🌊' },
};

export const CATEGORIES = {
  rythme: { name: 'Rythme', emoji: '🥁' },
  harmonie: { name: 'Harmonie', emoji: '🎼' },
  melodie: { name: 'Mélodie', emoji: '🎵' },
  sound: { name: 'Sound design', emoji: '🔊' },
  arrangement: { name: 'Arrangement', emoji: '🧱' },
  inspiration: { name: 'Chercher l’idée', emoji: '🔎' },
  workflow: { name: 'Habitudes', emoji: '⏱️' },
};

export const MISSIONS = [
  // ---------- RYTHME ----------
  {
    id: 'm-euclid', title: 'Groove euclidien', tools: ['ableton'], cat: 'rythme', min: 6, level: 1,
    goal: 'Créer un groove de percussions original avec des rythmes euclidiens.',
    steps: [
      'Crée un clip MIDI de 1 mesure sur un Drum Rack.',
      'Ouvre le panneau Generators du clip (Live 12) et choisis « Rhythm » (ou « Euclidean » selon ta version).',
      'Génère 3 couches : 3 coups sur 8 pour une percu, 5 sur 16 pour un rim, 7 sur 16 pour un shaker.',
      'Décale (rotation) chaque couche jusqu’à ce que le groove « roule ».',
      'Garde la meilleure version, duplique et fais une variation pour la mesure 4.',
    ],
    why: 'Les rythmes euclidiens répartissent k coups dans n pas : la plupart des rythmes traditionnels (tresillo, clave…) en sont. C’est une source infinie de grooves non-clichés.',
    next: 'Refais-le sur le MPC en Step Sequencer en comptant toi-même les espacements (3+3+2 = tresillo).',
  },
  {
    id: 'm-noterepeat', title: 'Hats vivants au Note Repeat', tools: ['mpc'], cat: 'rythme', min: 5, level: 1,
    goal: 'Enregistrer une ligne de hi-hat expressive en 1 passe.',
    steps: [
      'Charge un kit, lance un kick en 4/4 à 124 BPM.',
      'Active Note Repeat, valeur 1/16.',
      'Enregistre 4 mesures sur le hat en jouant la vélocité avec la pression (désactive Full Level).',
      'Change la valeur en direct (1/32 ou 1/16T) sur la fin de la mesure 4 pour un roll.',
      'Écoute : garde ou recommence. 3 essais max.',
    ],
    why: 'La dynamique (vélocité) fait 50 % du groove. Jouer plutôt que dessiner te donne un placement humain.',
    next: 'Même chose pour un shaker, puis transfère le pattern MIDI dans Live (MPC en mode contrôleur).',
  },
  {
    id: 'm-ghost', title: 'Ghost notes', tools: ['ableton', 'mpc'], cat: 'rythme', min: 5, level: 1,
    goal: 'Transformer un beat raide en beat qui groove sans ajouter de son.',
    steps: [
      'Pars d’un kick/snare basique (snare sur 2 et 4).',
      'Ajoute 3-4 snares à vélocité 25-45 entre les temps (ex. juste avant le 2e et le 4e).',
      'Ajoute des hats où une sur deux est à 60 %.',
      'Dans Live 12 : sélectionne les notes, utilise « Velocity Range » / Chance pour varier à chaque boucle.',
    ],
    why: 'Les ghost notes sont la signature du funk, de la DnB et du hip-hop : elles remplissent sans encombrer.',
    next: 'Sur le MPC : 16 Levels > Velocity sur la snare pour trouver la bonne nuance à l’oreille.',
  },
  {
    id: 'm-groovepool', title: 'Voler un groove', tools: ['ableton'], cat: 'rythme', min: 7, level: 2,
    goal: 'Extraire le swing d’un morceau que tu aimes et l’appliquer à ton beat.',
    steps: [
      'Glisse dans Live une boucle de batterie d’un morceau de référence (ou un break).',
      'Clic droit sur le clip > « Extract Groove(s) ».',
      'Dans le Groove Pool, applique ce groove à ton clip de hats/percus.',
      'Joue avec Base, Amount, Random et Velocity.',
    ],
    why: 'Le « feeling » d’un style vient souvent du micro-timing. Le voler est légal et formateur.',
    next: 'Extrais le groove d’un morceau hors électro (funk, afrobeat) et applique-le à de la techno.',
  },
  {
    id: 'm-polyrhythm', title: '3 contre 4', tools: ['ableton', 'mpc'], cat: 'rythme', min: 6, level: 2,
    goal: 'Créer une tension rythmique hypnotique avec un motif de 3 pas sur une grille de 4.',
    steps: [
      'Kick en 4/4.',
      'Crée une percu dont le motif se répète tous les 3 doubles-croches (pas 1, 4, 7, 10, 13, 16…).',
      'Dans Live : règle la longueur de la boucle du clip percu à 3/16 (clips de longueurs différentes = polymétrie).',
      'Écoute 8 mesures : le motif « tourne » autour du kick.',
    ],
    why: 'La polymétrie crée du mouvement sans ajouter de notes : technique clé de la techno et de l’afro house.',
    next: 'Applique le même principe à une mélodie de 3 notes sur 5/16.',
  },
  {
    id: 'm-genreswap', title: 'Même beat, autre style', tools: ['ableton'], cat: 'rythme', min: 8, level: 2,
    goal: 'Comprendre ce qui définit un style en changeant le minimum de choses.',
    steps: [
      'Prends un beat house (kick 4/4, clap 2-4, hat offbeat).',
      'Transforme-le en UK garage : enlève 2 kicks, ajoute du swing (Groove 58 %).',
      'Puis en dembow : snare sur les pas 4, 7, 12, 15.',
      'Puis en half-time : snare sur le 3e temps, tempo 140.',
      'Note dans le Carnet ce qui change à chaque fois.',
    ],
    why: 'Un style = quelques invariants. Les connaître te permet de les CASSER volontairement.',
    next: 'Invente ton propre hybride : quel invariant de A garder dans B ?',
  },

  // ---------- HARMONIE ----------
  {
    id: 'm-scalemode', title: 'Le mode Scale de Live 12', tools: ['ableton'], cat: 'harmonie', min: 5, level: 1,
    goal: 'Écrire des accords sans fausse note grâce à la gamme du clip.',
    steps: [
      'Dans le clip MIDI, active « Scale » et choisis une tonalité (ex. D Dorien).',
      'Active « Fold to Scale » dans l’éditeur : seules les notes de la gamme s’affichent.',
      'Empile des tierces (1 note sur 2) pour faire 4 accords.',
      'Change la gamme du clip en Phrygien : écoute comment l’ambiance change.',
    ],
    why: 'Le mode est la couleur émotionnelle : même pattern, 7 ambiances différentes.',
    next: 'Sur le MPC Key 37, règle la même gamme dans le clavier (Scale) pour improviser en direct.',
  },
  {
    id: 'm-mpcchords', title: 'Progressions au MPC', tools: ['mpc'], cat: 'harmonie', min: 6, level: 1,
    goal: 'Trouver une progression en jouant les pads plutôt qu’en réfléchissant.',
    steps: [
      'Charge un son de keys ou pad.',
      'Pad Perform > mode Progressions : parcours quelques progressions intégrées.',
      'Choisis-en une, joue-la avec un rythme différent (stab, tenu, syncopé).',
      'Enregistre 4 mesures, puis regarde quelles notes composent chaque accord.',
      'Reporte la progression dans l’app (Lab Accords) pour voir ses degrés.',
    ],
    why: 'Analyser une progression qui te plaît t’apprend les « mouvements » que tu réutiliseras.',
    next: 'Crée ta propre progression en mode Chords (accords sur pads) et sauvegarde-la comme progression utilisateur.',
  },
  {
    id: 'm-voicelead', title: 'Voice leading', tools: ['ableton'], cat: 'harmonie', min: 7, level: 2,
    goal: 'Faire sonner une progression « pro » en déplaçant le moins possible chaque note.',
    steps: [
      'Écris 4 accords en position fondamentale (tous empilés depuis la basse).',
      'Pour chaque accord, déplace des notes d’une octave pour qu’elles restent proches des notes de l’accord précédent.',
      'Mets la fondamentale à la basse sur une piste séparée.',
      'Compare l’avant/après.',
    ],
    why: 'Les claviéristes enchaînent les accords avec un minimum de mouvement : c’est fluide et ça laisse la place à la mélodie.',
    next: 'Dans l’app, compare les voicings « Serré » et « Voice leading » sur la même progression.',
  },
  {
    id: 'm-borrow', title: 'Accord emprunté', tools: ['ableton', 'mpc'], cat: 'harmonie', min: 6, level: 2,
    goal: 'Ajouter de l’émotion avec UN accord pris au mode parallèle.',
    steps: [
      'Prends une progression majeure (ex. I–V–vi–IV en C).',
      'Remplace le IV par un iv mineur (Fm au lieu de F) : effet nostalgique immédiat.',
      'Essaie aussi bVI (Ab) ou bVII (Bb) à la place du V.',
      'Garde celle qui te donne un frisson.',
    ],
    why: 'L’échange modal est l’ingrédient secret de beaucoup de hits (Radiohead, Daft Punk, M83).',
    next: 'Dans une progression mineure, emprunte le V majeur (mineur harmonique) pour une tension dramatique.',
  },
  {
    id: 'm-stacks', title: 'Stacks & inversions', tools: ['ableton'], cat: 'harmonie', min: 5, level: 2,
    goal: 'Générer des accords riches automatiquement puis les rendre tiens.',
    steps: [
      'Dans un clip vide, ouvre Generators > « Stacks ».',
      'Génère une progression de 4 accords dans ta gamme.',
      'Applique le Transform « Strum » pour un effet guitare/piano joué.',
      'Change UNE note de chaque accord à la main : tu passes de « généré » à « composé ».',
    ],
    why: 'Les générateurs donnent un point de départ ; ta signature vient des choix que tu fais après.',
    next: 'Refais-le sans générateur, uniquement avec le mode Chords du MPC.',
  },
  {
    id: 'm-onechord', title: 'Un seul accord', tools: ['ableton', 'serum'], cat: 'harmonie', min: 8, level: 2,
    goal: 'Tenir 16 mesures sur un seul accord sans ennuyer (école techno/house).',
    steps: [
      'Choisis un accord m7 ou m9, en stab court.',
      'Mets Cutoff et Résonance de Serum 2 sur 2 macros.',
      'Ajoute un Delay 1/8 pointé avec feedback variable.',
      'Enregistre 16 mesures en tournant les macros à la main (MPC Q-Links ou souris).',
    ],
    why: 'Le mouvement peut venir du timbre plutôt que de l’harmonie. C’est la base de la techno.',
    next: 'Même exercice mais en changeant uniquement le rythme des stabs toutes les 4 mesures.',
  },

  // ---------- MÉLODIE ----------
  {
    id: 'm-rhythmfirst', title: 'Rythme d’abord', tools: ['mpc', 'ableton'], cat: 'melodie', min: 5, level: 1,
    goal: 'Trouver un hook en séparant rythme et hauteur.',
    steps: [
      'Sur une seule touche, tape un rythme accrocheur de 2 mesures (fredonne en même temps).',
      'Enregistre-le (quantize à 50 % seulement).',
      'Ensuite seulement, déplace certaines notes vers d’autres hauteurs de la gamme.',
      'Règle : pas plus de 4 hauteurs différentes.',
    ],
    why: 'Les hooks les plus mémorables ont un rythme fort et peu de notes. Le rythme est ce qu’on retient en premier.',
    next: 'Applique-le à une ligne de basse : un rythme, 2 notes.',
  },
  {
    id: 'm-callresponse', title: 'Question / réponse', tools: ['ableton', 'mpc'], cat: 'melodie', min: 6, level: 1,
    goal: 'Écrire un hook en 2 parties qui se répondent.',
    steps: [
      'Mesure 1 : une phrase qui finit « en l’air » (sur la 2de ou la 5te).',
      'Mesure 2 : copie le début, change la fin pour qu’elle se pose sur la tonique.',
      'Mesures 3-4 : répète la question, et une réponse différente.',
      'Joue-la sur le MPC Key 37 pour la sentir dans les doigts.',
    ],
    why: 'Structure AB / AB’ : le cerveau adore prédire puis être (un peu) surpris.',
    next: 'Fais répondre un autre instrument : question au lead, réponse à la basse.',
  },
  {
    id: 'm-seed', title: 'Seed + tri', tools: ['ableton'], cat: 'melodie', min: 7, level: 2,
    goal: 'Utiliser la génération aléatoire comme un digger, pas comme un compositeur.',
    steps: [
      'Clip MIDI avec Scale activé, Generators > « Seed ».',
      'Génère 10 variations rapidement (garde les paramètres de densité bas).',
      'Duplique les 2 meilleures, supprime le reste.',
      'Dans chacune, garde seulement 4 notes que tu aimes, efface le reste, répète-les.',
    ],
    why: 'Savoir TRIER est la compétence clé : l’aléatoire produit, ton oreille décide.',
    next: 'Utilise le Transform « Recombine » ou « Ornament » sur ton motif final pour des variations.',
  },
  {
    id: 'm-arpmpc', title: 'Arpège trouvé', tools: ['mpc', 'serum'], cat: 'melodie', min: 5, level: 1,
    goal: 'Faire naître une mélodie à partir d’un arpégiateur.',
    steps: [
      'Active l’arpégiateur du MPC Key 37 (Latch ON), mode Up/Down, 1/16.',
      'Joue un accord, puis change UNE note de l’accord à chaque mesure.',
      'Enregistre 8 mesures.',
      'Édite : supprime 1 note sur 3 pour créer des trous → l’arpège devient un motif.',
    ],
    why: 'Retirer des notes crée du rythme. Une mélodie, c’est aussi les notes qu’on ne joue pas.',
    next: 'Refais-le avec l’arpégiateur interne de Serum 2 et une enveloppe de filtre pluck.',
  },
  {
    id: 'm-transform', title: 'Variations sans effort', tools: ['ableton'], cat: 'melodie', min: 6, level: 2,
    goal: 'Créer la partie B d’un morceau à partir de la partie A.',
    steps: [
      'Duplique ton clip de mélodie.',
      'Dans la copie : inverse (« Reverse ») ou renverse (« Invert ») les notes depuis le menu Transform / clic droit.',
      'Garde la moitié intéressante et mélange-la avec l’original.',
      'Ajoute « Ornament » (flams/grace notes) avec parcimonie.',
    ],
    why: 'Rétrograde, inversion, transposition : les techniques de Bach marchent toujours. Le lien A/B reste audible.',
    next: 'Teste dans l’app les boutons « Rétro » et « Miroir » du Lab Mélodie.',
  },

  // ---------- SOUND DESIGN ----------
  {
    id: 's-init', title: 'Depuis Init', tools: ['serum'], cat: 'sound', min: 8, level: 1,
    goal: 'Construire un son de A à Z sans preset.',
    steps: [
      'Menu > Init Preset.',
      'Choisis un rôle (basse, pluck, pad). Une seule wavetable sur Osc A.',
      'Filtre + ENV 2 sur le cutoff.',
      'ENV 1 pour la forme du volume.',
      'UN effet maximum. Sauve-le en nommant ce que tu as appris (ex. « pluck_env-filtre »).',
    ],
    why: 'Repartir d’Init 1x par jour est le meilleur raccourci pour maîtriser Serum.',
    next: 'Recrée un preset que tu aimes uniquement à l’oreille, puis compare avec l’original.',
  },
  {
    id: 's-wtpos', title: 'Wavetable en mouvement', tools: ['serum'], cat: 'sound', min: 6, level: 1,
    goal: 'Faire bouger un son tenu grâce à la position de wavetable.',
    steps: [
      'Charge une wavetable riche sur Osc A.',
      'Glisse LFO 1 sur « WT POS » d’Osc A, rate lent (1/2 ou 1 bar).',
      'Dessine une forme de LFO personnalisée (pas une sinusoïde).',
      'Ajoute ENV 2 → WT POS pour que l’attaque soit différente du sustain.',
    ],
    why: 'Un son qui évolue tient l’attention sans ajouter de notes.',
    next: 'Importe ton propre sample comme wavetable (glisse un audio sur l’oscillateur).',
  },
  {
    id: 's-granular', title: 'Granulaire maison', tools: ['serum', 'mpc'], cat: 'sound', min: 8, level: 2,
    goal: 'Transformer un enregistrement banal en texture musicale.',
    steps: [
      'Enregistre 5 s d’un son du quotidien (voix, verre, porte) avec le MPC ou ton téléphone.',
      'Charge-le dans un oscillateur Granular de Serum 2.',
      'Joue sur la position, la taille des grains et la densité.',
      'Ajoute un LFO lent sur la position + reverb longue.',
    ],
    why: 'Les sons les plus originaux viennent de sources que personne d’autre n’a.',
    next: 'Utilise le mode Spectral sur le même sample et compare.',
  },
  {
    id: 's-macros', title: '4 macros utiles', tools: ['serum', 'mpc'], cat: 'sound', min: 7, level: 2,
    goal: 'Rendre un preset jouable en live.',
    steps: [
      'Ouvre un de tes sons.',
      'Macro 1 = Brillance (Cutoff + un peu de Drive).',
      'Macro 2 = Espace (Reverb Mix + Delay Mix).',
      'Macro 3 = Mouvement (LFO Rate/Amount). Macro 4 = Attaque (ENV 1 Attack).',
      'Mappe-les aux Q-Links du MPC Key 37 (ou aux potards via Live) et enregistre une prise.',
    ],
    why: 'Penser en macros t’oblige à identifier ce qui compte musicalement dans un son.',
    next: 'Dans Live, groupe Serum dans un Instrument Rack et utilise « Macro Variations » pour sauvegarder des états.',
  },
  {
    id: 's-reese', title: 'Reese en 5 minutes', tools: ['serum'], cat: 'sound', min: 5, level: 1,
    goal: 'Maîtriser LA basse de la DnB / dubstep.',
    steps: [
      'Init. Osc A et Osc B en Saw.',
      'Osc B : Fine +15 cents (ou Unison 2 avec Detune).',
      'Sub en Sine. Filtre Low 24 vers 600 Hz.',
      'Distortion avant le filtre, puis Chorus.',
      'Joue une note longue : écoute le battement.',
    ],
    why: 'Le désaccord entre 2 oscillateurs crée le mouvement de phase : un principe qui sert pour pads, leads et basses.',
    next: 'Remplace les Saw par une wavetable et anime la position avec un LFO.',
  },
  {
    id: 's-resample', title: 'Resampling', tools: ['ableton'], cat: 'sound', min: 8, level: 2,
    goal: 'Créer un son unique en enregistrant et retravaillant ton propre audio.',
    steps: [
      'Crée une piste audio avec entrée « Resampling ».',
      'Enregistre 4 mesures de ton synthé avec automation de filtre.',
      'Glisse l’audio dans Simpler, mode Slice ou Classic.',
      'Reverse, pitch -12, warp en mode Texture : joue-le au clavier.',
    ],
    why: 'Chaque génération de resampling t’éloigne du preset d’origine : c’est comme ça qu’on trouve SA signature.',
    next: 'Envoie l’audio dans le MPC et chop-le aux pads.',
  },
  {
    id: 's-drift', title: 'Kick sur mesure', tools: ['ableton', 'serum'], cat: 'sound', min: 7, level: 2,
    goal: 'Comprendre un kick en le synthétisant.',
    steps: [
      'Serum 2 Init, Osc A Sine, mode Mono.',
      'ENV 2 → Coarse Pitch (+24 à +36), Decay ~50 ms : le « thump ».',
      'ENV 1 : Decay 400 ms, Sustain 0.',
      'Ajoute un peu de Distortion. Compare avec le kick de ton kit.',
    ],
    why: 'Kick = sinusoïde + enveloppe de pitch. Une fois compris, tu règles n’importe quel kick à l’oreille.',
    next: 'Accorde ton kick à la tonalité du morceau (Tuner dans Live).',
  },

  // ---------- ARRANGEMENT ----------
  {
    id: 'a-subtract', title: 'Arrangement soustractif', tools: ['ableton'], cat: 'arrangement', min: 10, level: 2,
    goal: 'Transformer une boucle de 8 mesures en structure de morceau.',
    steps: [
      'Duplique ta boucle complète sur 64 mesures en Arrangement.',
      'Supprime des éléments pour créer intro (16), build (8), drop (16), break (8), drop 2 (16).',
      'Règle : chaque section de 8 mesures doit changer QUELQUE CHOSE.',
      'Ajoute un « reverse crash » ou un riser avant chaque drop.',
    ],
    why: 'Il est plus facile d’enlever que d’ajouter. Ça évite la boucle éternelle.',
    next: 'Analyse la structure d’un morceau de référence (marqueurs Locators) et calque-la.',
  },
  {
    id: 'a-follow', title: 'Session vivante', tools: ['ableton'], cat: 'arrangement', min: 8, level: 3,
    goal: 'Laisser Live proposer des variations pour trouver des idées d’arrangement.',
    steps: [
      'En Session, crée 4 variations d’un même clip (drums ou mélodie).',
      'Active les Follow Actions (Next / Any) avec des chances différentes.',
      'Lance la scène et enregistre 32 mesures en Arrangement.',
      'Garde les enchaînements surprenants.',
    ],
    why: 'L’aléatoire contrôlé révèle des combinaisons auxquelles tu n’aurais pas pensé.',
    next: 'Fais la même chose avec des Note Chance / probabilités dans les clips.',
  },
  {
    id: 'a-capture', title: 'Capture MIDI', tools: ['ableton', 'mpc'], cat: 'workflow', min: 5, level: 1,
    goal: 'Ne plus jamais perdre une impro.',
    steps: [
      'Mets ton MPC Key 37 en contrôleur de Live (USB).',
      'Joue librement 2 minutes sans enregistrer sur un son qui t’inspire.',
      'Clique sur « Capture MIDI » : Live récupère ce que tu viens de jouer.',
      'Garde 4 mesures, nomme le clip avec la date.',
    ],
    why: 'Les meilleures idées arrivent quand tu ne « composes » pas. Capture MIDI enlève la pression du bouton Rec.',
    next: 'Fais-le en mode Standalone sur le MPC : laisse tourner un séquence en enregistrement long.',
  },

  // ---------- CHERCHER L’IDÉE ----------
  {
    id: 'i-reference', title: 'Analyse éclair', tools: ['ableton'], cat: 'inspiration', min: 8, level: 1,
    goal: 'Extraire 3 ingrédients d’un morceau que tu adores.',
    steps: [
      'Glisse un morceau de référence dans Live (warpé).',
      'Note : BPM, tonalité (à l’oreille ou avec un tuner), structure en mesures.',
      'Identifie : 1 rythme, 1 son, 1 astuce d’arrangement.',
      'Écris-les dans le Carnet de l’app.',
      'Utilise UN seul de ces ingrédients dans ta prochaine idée.',
    ],
    why: 'Copier un morceau entier = plagiat. Voler un ingrédient et le combiner = influence. C’est ce que font tous les producteurs.',
    next: 'Fais-le sur un genre que tu n’écoutes jamais (Atlas des styles).',
  },
  {
    id: 'i-audio2midi', title: 'Voler l’harmonie', tools: ['ableton'], cat: 'inspiration', min: 6, level: 2,
    goal: 'Extraire les accords d’un enregistrement pour les étudier.',
    steps: [
      'Glisse un extrait (piano, guitare, voix) dans Live.',
      'Clic droit > « Convert Harmony to New MIDI Track » (ou Melody pour une voix).',
      'Nettoie le résultat, identifie les accords (Lab Accords > Détecter avec ton MPC).',
      'Réutilise la progression avec un autre rythme et d’autres sons.',
    ],
    why: 'Les progressions ne sont pas protégées par le droit d’auteur : la façon de les habiller fait l’originalité.',
    next: 'Si ta version le permet, utilise la séparation de stems pour isoler l’instrument d’abord.',
  },
  {
    id: 'i-similar', title: 'Chasse au son', tools: ['ableton'], cat: 'inspiration', min: 5, level: 1,
    goal: 'Sortir de tes samples habituels.',
    steps: [
      'Dans le navigateur de Live 12, cherche un son de percu que tu utilises souvent.',
      'Utilise la recherche par similarité (« Show Similar Files ») pour trouver ses voisins.',
      'Dans un Drum Rack, essaie le « Similar Sample Swapping » sur un pad.',
      'Tague les 5 meilleurs (Labels) avec un tag « à essayer ».',
    ],
    why: 'Savoir naviguer dans ta bibliothèque = trouver vite. Les tags construisent ta palette personnelle.',
    next: 'Fais-le pour les kicks, puis pour les one-shots vocaux.',
  },
  {
    id: 'i-constraint', title: 'La contrainte créative', tools: ['ableton', 'mpc', 'serum'], cat: 'inspiration', min: 10, level: 1,
    goal: 'Finir une boucle de 8 mesures en 10 minutes avec une règle stricte.',
    steps: [
      'Lance le « Dé à idées » (onglet Studio) pour tirer une contrainte.',
      'Timer 10 minutes.',
      'Respecte la règle même si elle semble absurde.',
      'À la fin : exporte ou sauvegarde, même si c’est imparfait.',
    ],
    why: 'La contrainte tue la page blanche. Elle force des choix inhabituels = idées originales.',
    next: 'Invente tes propres contraintes et note-les dans le Carnet.',
  },
  {
    id: 'i-sample-flip', title: 'Flip d’un sample', tools: ['mpc'], cat: 'inspiration', min: 10, level: 2,
    goal: 'Transformer un sample en un instrument méconnaissable.',
    steps: [
      'Sample 4-8 secondes d’un morceau (soul, jazz, bossa, film).',
      'Chop en 8-16 tranches (Chop mode, threshold ou régions).',
      'Rejoue les tranches dans un autre ordre, à un autre tempo.',
      'Pitch +/- et filtre jusqu’à ce que l’original ne soit plus reconnaissable.',
    ],
    why: 'Le flip est l’art du hip-hop et de la house : on recontextualise. Tu entraînes ton oreille à entendre « autre chose » dans un son.',
    next: 'Utilise un sample d’un genre de l’Atlas que tu n’as jamais travaillé.',
  },
  {
    id: 'i-hum', title: 'Fredonne d’abord', tools: ['ableton', 'mpc'], cat: 'inspiration', min: 5, level: 1,
    goal: 'Capturer une mélodie qui vient de ta voix, pas de tes doigts.',
    steps: [
      'Écoute ta boucle 4 fois sans rien toucher.',
      'Fredonne / chante dans ton téléphone par-dessus (mémo vocal).',
      'Retrouve les notes sur le MPC Key 37 (Scale activé), ou utilise « Convert Melody to MIDI » dans Live.',
      'Garde la meilleure phrase de 2 mesures.',
    ],
    why: 'La voix trouve naturellement des mélodies chantables. Les doigts reproduisent des habitudes.',
    next: 'Fredonne une contre-mélodie pour la basse.',
  },

  // ---------- HABITUDES ----------
  {
    id: 'w-template', title: 'Template de départ', tools: ['ableton'], cat: 'workflow', min: 10, level: 1,
    goal: 'Démarrer une idée en 10 secondes.',
    steps: [
      'Crée un set avec : Drum Rack, Serum 2 (Init), une piste audio Resampling, un bus Reverb/Delay.',
      'Mappe ton MPC Key 37 (contrôleur) et colore les pistes.',
      'File > Save Live Set as Default Set (ou en Template).',
    ],
    why: 'Moins de friction = plus de sessions. Les pros démarrent tous d’un template.',
    next: 'Crée un template spécial « 10 minutes » avec des contraintes déjà en place (3 pistes max).',
  },
  {
    id: 'w-10min', title: 'Boucle en 10 minutes', tools: ['ableton', 'mpc'], cat: 'workflow', min: 10, level: 2,
    goal: 'Muscle de la décision : finir vite.',
    steps: [
      '2 min : beat.', '3 min : basse.', '3 min : accords ou mélodie.', '2 min : un effet sur l’ensemble.',
      'Stop. Exporte en audio et écoute une fois.',
    ],
    why: 'La vitesse empêche l’auto-critique de bloquer. Tu affineras plus tard.',
    next: 'Fais-le tous les jours une semaine et réécoute les 7 boucles le dimanche.',
  },
  {
    id: 'w-mpcstandalone', title: 'Sans écran', tools: ['mpc'], cat: 'workflow', min: 10, level: 2,
    goal: 'Composer loin de l’ordinateur pour changer tes réflexes.',
    steps: [
      'MPC Key 37 en Standalone, ordi éteint.',
      'Beat aux pads en temps réel (pas de step sequencer).',
      'Basse au clavier avec Scale activé.',
      'Exporte le projet vers Live plus tard pour le finir.',
    ],
    why: 'Changer d’interface change tes habitudes de composition. Moins d’options = plus de jeu.',
    next: 'Utilise uniquement les plugins internes du MPC pendant une semaine.',
  },
];

export const missionById = (id) => MISSIONS.find((m) => m.id === id);

// ---------- Dé à idées (générateur combinatoire) ----------
export const DICE = {
  start: [
    'un accord de 9e tenu', 'un sample de voix du quotidien', 'une ligne de basse de 2 notes', 'un rythme euclidien 5/16',
    'un break de batterie découpé', 'un arpège pris sur le MPC', 'une note unique et beaucoup d’automation',
    'un bruit enregistré au téléphone', 'une progression empruntée à la bossa nova', 'une mélodie fredonnée',
    'un preset Serum 2 que tu n’as jamais ouvert', 'un pattern de percussion afro', 'un pad granulaire',
  ],
  constraint: [
    '3 pistes maximum', 'aucun kick sur le 1er temps', 'tempo imposé : 97 BPM', 'tout dans le mode phrygien',
    'mélodie de 3 notes seulement', 'interdiction d’utiliser la quantification', 'un seul synthé (Serum 2) pour tout',
    'chaque son doit être resamplé au moins une fois', 'swing minimum 60 %', 'pas de reverb, seulement du delay',
    'un silence total d’une mesure dans la boucle', 'tout doit être joué en live sur le MPC',
    'utiliser un générateur MIDI de Live 12 au moins une fois', 'la basse joue la mélodie principale',
  ],
  twist: [
    'mélange avec un élément de {genre}', 'inverse (reverse) un élément clé', 'pitch tout à -5 demi-tons à la fin',
    'ajoute une polyrythmie 3 contre 4', 'fais une version half-time', 'remplace la snare par un son non-musical',
    'termine par un accord emprunté', 'automatise le filtre sur 8 mesures', 'double la mélodie à l’octave sur la moitié',
  ],
};
