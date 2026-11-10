// Parcours, partie 3 : composer — gammes, accords, mélodies et basses.
import { card, Q, P, O, B, N, L, K, R, gen, unit, lesson, lab, studio, drums, notes, prog } from './coursekit.js';

const scaleDemo = (root, steps, p = 'pluck') => notes([...steps, 12].map((s, i) => [root + s, i * 0.5, 0.5]), { bpm: 120, p });

export const U7 = unit('u7', {
  part: 3, title: 'Gammes et tonalités', emoji: '🎼', color: '#4ade80', skill: 'harmonie',
  goal: 'Construire les gammes majeure, mineure et pentatonique, entendre la différence et utiliser le mode Scale de Live 12.',
  guide: [
    ['Gamme majeure', 'Ton, Ton, ½, Ton, Ton, Ton, ½. Do majeur = toutes les touches blanches depuis C.'],
    ['Gamme mineure', 'Ton, ½, Ton, Ton, ½, Ton, Ton. La mineur = toutes les blanches depuis A.'],
    ['Relatifs', 'Chaque gamme majeure a un relatif mineur avec les mêmes notes, sur sa 6e note (C ↔ Am).'],
    ['Pentatonique', '5 notes sans frottement. Penta mineure de La : A C D E G.'],
    ['Live 12', 'Scale Mode dans le clip (Root Note + Scale Name), Fold to Scale pour n’afficher que la gamme, Fit to Scale pour y ramener des notes, MIDI Effect Scale pour corriger ce que tu joues.'],
  ],
}, [
  lesson('l1', 'La gamme majeure', '☀️', [
    card('Une formule de 7 notes', ['Une gamme, c’est une sélection de 7 notes qui sonnent bien ensemble.', 'La gamme majeure suit la formule : Ton, Ton, ½, Ton, Ton, Ton, ½.', 'Depuis Do : C D E F G A B C. Toutes les touches blanches !'], { visual: { k: 'keyboard', lo: 60, hi: 72, lit: [60, 62, 64, 65, 67, 69, 71, 72], labels: 'all' }, demo: [{ label: '▶ Do majeur', play: scaleDemo(60, [0, 2, 4, 5, 7, 9, 11]) }] }),
    O('Remets la formule de la gamme majeure dans l’ordre', ['Ton', 'Ton', '½', 'Ton', 'Ton', 'Ton', '½']),
    gen('scale', { roots: ['C'], scale: 'major' }),
    gen('scale', { roots: ['G', 'F'], scale: 'major' }),
    Q('Quelle touche noire contient la gamme de Sol majeur ?', ['Fa♯ (F♯)', 'Si♭ (B♭)', 'Do♯ (C♯)', 'Aucune'], 'G A B C D E F♯ G : la formule oblige à monter le Fa.'),
    Q('Combien de notes différentes dans une gamme majeure ?', ['7', '5', '8', '12']),
  ]),
  lesson('l2', 'La gamme mineure', '🌙', [
    card('La couleur mineure', ['Formule de la gamme mineure naturelle : Ton, ½, Ton, Ton, ½, Ton, Ton.', 'Depuis La : A B C D E F G A. Encore toutes les blanches, mais en partant de La.', 'La mineur et Do majeur ont les mêmes notes : ce sont des relatifs.'], { demo: [{ label: '▶ La mineur', play: scaleDemo(57, [0, 2, 3, 5, 7, 8, 10]) }, { label: '▶ Do majeur', play: scaleDemo(60, [0, 2, 4, 5, 7, 9, 11]) }] }),
    gen('scale', { roots: ['A'], scale: 'minor' }),
    gen('scaleEar', { n: 3 }),
    gen('relative', { n: 2 }),
    gen('scale', { roots: ['E', 'D'], scale: 'minor' }),
    Q('La plupart des morceaux de techno et de trance sont…', ['En mineur', 'En majeur'], 'Le mineur donne cette couleur sombre et émotive.'),
  ]),
  lesson('l3', 'La pentatonique', '🖐️', [
    card('5 notes impossibles à rater', ['La penta mineure garde 5 notes de la gamme mineure. En La : A C D E G.', 'Aucune note ne frotte : idéal pour improviser un hook ou un solo.', 'Bonus : les 5 touches noires forment à elles seules une pentatonique.'], { visual: { k: 'keyboard', lo: 57, hi: 69, lit: [57, 60, 62, 64, 67, 69], labels: 'all' }, demo: [{ label: '▶ Penta de La mineur', play: scaleDemo(57, [0, 3, 5, 7, 10]) }] }),
    gen('scale', { roots: ['A'], scale: 'pentaMinor' }),
    Q('Combien de notes dans une pentatonique ?', ['5', '7', '6', '4']),
    gen('scale', { roots: ['C'], scale: 'pentaMajor' }),
    Q('Quelles notes forment la penta mineure de La ?', ['A C D E G', 'A B C D E', 'A C E G B', 'A D E F G']),
  ]),
  lesson('l4', 'Dans la tonalité', '🎯', [
    card('La tonalité', ['La tonalité d’un morceau = sa note de base (la tonique) + sa gamme. Exemple : La mineur.', 'Rester dans la gamme évite les fausses notes ; en sortir exprès crée de la tension.', 'Les DJ s’en servent aussi pour enchaîner des morceaux compatibles (roue Camelot).']),
    gen('notInScale', { roots: ['C', 'G'], scale: 'major', n: 2 }),
    gen('notInScale', { roots: ['A', 'E'], scale: 'minor', n: 2 }),
    R('Écris au moins 6 notes de la gamme de Do majeur (sans aide visuelle)', { rules: [{ k: 'count', min: 6, max: 32, why: 'Il faut au moins 6 notes.' }, { k: 'inScale', root: 0, scale: 'major', why: 'Une note n’est pas dans Do majeur : seulement les touches blanches.' }], hl: false }),
  ]),
  lesson('l5', 'Le mode Scale de Live 12', '🧩', [
    card('Live connaît ta gamme', ['Live 12 : dans les propriétés du clip, active le bouton Scale Mode, puis choisis la tonique (Root Note) et la gamme (Scale Name).', 'Le piano roll surligne les notes de la gamme ; l’option Fold to Scale cache toutes les autres lignes, et Fit to Scale ramène des notes égarées dans la gamme.', 'Les outils des panneaux Transform et Generate respectent cette gamme.'], { visual: { k: 'live', show: ['clip'], hl: 'scale' } }),
    L('Active la gamme du clip', 'scale', ['clip']),
    L('Où n’afficher que les notes utiles ?', 'fold', ['clip']),
    Q('Scale Mode sur La mineur et Fold to Scale activé : combien de lignes de notes par octave ?', ['7', '12', '5', '8']),
    Q('Tu veux être sûr que tout ce que tu joues tombe dans la gamme. Quel MIDI Effect ?', ['Scale', 'Arpeggiator', 'Chord', 'Velocity'], 'Le MIDI Effect Scale ramène chaque note jouée dans la gamme choisie ; son option « Use Current Scale » reprend la gamme du clip.'),
  ]),
  lab('lab-gamme', 'Pad Rush : la gamme sur les pads', '🎼', '#/pads?level=gamme', { pads: 'gamme' }, 'Joue la gamme sur les pads : la même logique que le mode Note des pads d’un MPC ou de Live.'),
  studio('st', 'Ta gamme dans Live', '🧩', [
    'Crée un clip MIDI de 2 mesures sur une piste avec un piano.',
    'Dans le clip : active Scale Mode, Root Note A, Scale Name Minor.',
    'Active Fold to Scale : il ne reste que 7 lignes par octave.',
    'Dessine une mélodie de 8 notes sans réfléchir : tout est juste !',
    'Ajoute le MIDI Effect Scale (option Use Current Scale) sur la piste et joue au clavier n’importe quelles touches.',
  ], 'Scale Mode est une aide, pas une prison : coupe-le pour ajouter une note de passage hors gamme.'),
]);

export const U8 = unit('u8', {
  part: 3, title: 'Les accords', emoji: '🎹', color: '#2dd4bf', skill: 'harmonie',
  goal: 'Construire et reconnaître les triades, les accords de la gamme, les progressions célèbres, les renversements et les septièmes.',
  guide: [
    ['Triade', 'Fondamentale + tierce + quinte. Majeur : 4 + 3 demi-tons. Mineur : 3 + 4.'],
    ['Degrés', 'En Do majeur : I C, ii Dm, iii Em, IV F, V G, vi Am, vii° Bdim.'],
    ['Progressions', 'I–V–vi–IV (pop), vi–IV–I–V (EDM), i–VI–III–VII (épique), ii–V–I (jazz).'],
    ['Renversements', 'Même accord, autre note en bas. Choisis celui qui bouge le moins (voice leading).'],
    ['Septièmes', 'maj7 rêveur, m7 doux (lo-fi, deep house), 7 tendu.'],
  ],
}, [
  lesson('l1', 'La triade', '🔺', [
    card('Trois notes empilées', ['Un accord de base (une triade) = fondamentale + tierce + quinte : on saute une note de la gamme à chaque fois.', 'Do majeur = C E G. La mineur = A C E.', 'Majeur : tierce de 4 demi-tons. Mineur : tierce de 3 demi-tons.'], { visual: { k: 'keyboard', lo: 60, hi: 72, lit: [60, 64, 67], labels: 'all' }, demo: [{ label: '▶ Do majeur', play: prog(['C'], { beats: 3 }) }, { label: '▶ La mineur', play: prog(['Am'], { beats: 3 }) }] }),
    gen('chord', { chords: ['C', 'F', 'G'], n: 2 }),
    gen('chord', { chords: ['Am', 'Dm', 'Em'], n: 2 }),
    Q('Quelles notes forment l’accord de Sol majeur (G) ?', ['G B D', 'G A B', 'G C D', 'G B♭ D']),
    N('Combien de demi-tons entre la fondamentale et la tierce d’un accord mineur ?', 3),
  ]),
  lesson('l2', 'Majeur ou mineur ?', '👂', [
    card('Deux couleurs', ['Majeur : lumineux, stable, joyeux.', 'Mineur : sombre, nostalgique, intense.', 'La seule différence : la tierce, un demi-ton plus bas en mineur.'], { demo: [{ label: '▶ C', play: prog(['C'], { beats: 3, p: 'epiano' }) }, { label: '▶ Cm', play: prog(['Cm'], { beats: 3, p: 'epiano' }) }] }),
    gen('chordEar', { qualities: ['maj', 'min'], n: 4 }),
    K('Transforme Do majeur en Do mineur : joue C, E♭, G', 'chord', [0, 3, 7]),
    gen('chord', { chords: ['Cm', 'Gm', 'Fm'], n: 1 }),
  ]),
  lesson('l3', 'Les accords de la gamme', '🔢', [
    card('Un accord par note', ['Sur chaque note de la gamme, on empile des tierces : 7 accords « dans la tonalité ».', 'En Do majeur : I C, ii Dm, iii Em, IV F, V G, vi Am, vii° Bdim.', 'Majuscule = majeur, minuscule = mineur. Ce sont les briques de 90 % des morceaux.']),
    P('En Do majeur, associe le degré à l’accord', [['I', 'C'], ['ii', 'Dm'], ['IV', 'F'], ['V', 'G'], ['vi', 'Am']]),
    gen('degree', { key: 'C', degrees: [1, 2, 3, 4, 5], n: 2 }),
    gen('degree', { key: 'C', degrees: [3, 4, 5], n: 2, play: true }),
    gen('degree', { key: 'A', minor: true, degrees: [0, 3, 5, 6], n: 2 }),
  ]),
  lesson('l4', 'Progressions célèbres', '🔁', [
    card('Les enchaînements qui marchent', ['I – V – vi – IV (C G Am F) : la progression de mille tubes.', 'vi – IV – I – V (Am F C G) : la même, en commençant en mineur : très EDM.', 'i – VI – III – VII (Am F C G en La mineur) : épique, trance.', 'ii – V – I (Dm G C) : la cadence du jazz.'], { demo: [{ label: '▶ I – V – vi – IV', play: prog(['C', 'G', 'Am', 'F']) }, { label: '▶ ii – V – I', play: prog(['Dm', 'G', 'C']) }] }),
    O('Remets la progression pop dans l’ordre : I – V – vi – IV en Do', ['C', 'G', 'Am', 'F'], null, { extra: ['Dm'] }),
    Q('Écoute : quelle progression ?', ['I – V – vi – IV (C G Am F)', 'ii – V – I (Dm G C)', 'I – IV – V (C F G)'], null, { play: prog(['C', 'G', 'Am', 'F']), autoplay: true }),
    Q('Écoute : et celle-ci ?', ['ii – V – I (Dm G C)', 'I – V – vi – IV (C G Am F)', 'vi – IV – I – V (Am F C G)'], null, { play: prog(['Dm', 'G', 'C']), autoplay: true }),
    gen('chord', { chords: ['C', 'G', 'Am', 'F'], n: 2 }),
    Q('Pourquoi tant de morceaux utilisent les mêmes 4 accords ?', ['Ils enchaînent tension et résolution naturellement ; le rythme, le son et la mélodie font la différence', 'C’est obligatoire', 'Il n’existe que 4 accords']),
  ]),
  lesson('l5', 'Renversements et voicings', '🔄', [
    card('Même accord, autre ordre', ['Renverser un accord = mettre une autre de ses notes en bas : C/E (E G C), C/G (G C E).', 'Entre deux accords, choisis le renversement qui bouge le moins : c’est le voice leading, ça sonne fluide.', 'En prod, la basse joue souvent la fondamentale pendant que les accords sont renversés.'], { visual: { k: 'keyboard', lo: 60, hi: 76, lit: [64, 67, 72], labels: 'all' } }),
    K('Joue Do majeur avec Mi en bas (C/E)', 'chord', [0, 4, 7], { bass: 4 }),
    K('Joue La mineur avec Do en bas (Am/C)', 'chord', [9, 0, 4], { bass: 0 }),
    Q('Après Do majeur (C E G), quel Fa majeur bouge le moins ?', ['C F A (Fa avec Do en bas)', 'F A C, une quarte plus haut', 'A C F, une octave plus haut'], 'C reste, E monte à F, G monte à A : deux tout petits pas.'),
  ]),
  lesson('l6', 'Les septièmes', '✨', [
    card('Ajouter une couleur', ['Ajoute une 4e note, la septième : l’accord devient plus riche.', 'maj7 (C E G B) : rêveur. m7 (A C E G) : doux, lo-fi, deep house. 7 (G B D F) : tendu, bluesy.'], { demo: [{ label: '▶ Cmaj7', play: prog(['Cmaj7'], { beats: 3, p: 'epiano' }) }, { label: '▶ Am7', play: prog(['Am7'], { beats: 3, p: 'epiano' }) }, { label: '▶ G7', play: prog(['G7'], { beats: 3, p: 'epiano' }) }] }),
    gen('chord', { chords: ['Am7', 'Cmaj7', 'Dm7', 'G7'], n: 3 }),
    gen('chordEar', { qualities: ['maj', 'maj7', 'm7'], n: 3 }),
  ]),
  lab('lab-recipe', 'Lab Accords : une recette', '🎼', '#/chords?mode=recipe', { log: 'chords:' }, 'Suis une recette de progression et réussis-la.'),
  lab('lab-pop', 'Piano Rush : la progression pop', '📻', '#/rush?level=pop', { rush: 'pop' }, 'Joue C G Am F en rythme, avec les deux mains si tu peux.'),
  studio('st', 'Des accords dans Live', '🎹', [
    'Piste MIDI + un pad (Sounds › Pad).',
    'Clip de 4 mesures : dessine C – G – Am – F, un accord par mesure.',
    'Active Scale Mode (Root Note C, Scale Name Major) : tout doit être surligné.',
    'Renverse G et F pour que les notes bougent le moins possible.',
    'Dans le panneau Transform du clip (Live 12), essaie Strum puis Arpeggiate.',
    'Ajoute le MIDI Effect Chord sur une autre piste et joue un accord d’un seul doigt.',
  ], 'Tu as maintenant une grille d’accords réutilisable : c’est la base de tous tes morceaux.'),
]);

export const U9 = unit('u9', {
  part: 3, title: 'Mélodies et basses', emoji: '🎵', color: '#facc15', skill: 'melodie',
  goal: 'Lire et écrire dans le piano roll, poser une basse solide, groover en offbeat et écrire un hook qui reste.',
  guide: [
    ['Piano roll', 'Hauteur à la verticale, temps à l’horizontale, longueur = durée.'],
    ['Basse', 'La fondamentale de l’accord, calée sur le kick, une note à la fois, en mono.'],
    ['Offbeat', 'House et trance : la basse sur les contretemps, entre les kicks.'],
    ['Hook', 'Peu de notes, un rythme marquant, de la répétition, des notes de l’accord sur les temps forts.'],
    ['Variations', 'Transposer, renverser, rétrograder, changer une note : même idée, nouvelle vie.'],
  ],
}, [
  lesson('l1', 'Le piano roll', '🎹', [
    card('Lire un piano roll', ['Chaque note est un rectangle : sa hauteur = la note, sa position horizontale = le moment, sa longueur = la durée.', 'Les traits verticaux marquent les temps ; plus épais, les mesures.'], { visual: { k: 'roll', notes: [[0, 60, 2], [4, 64, 2], [8, 67, 4], [12, 64, 2]], lo: 57, hi: 69 } }),
    R('Recopie le motif en pointillés', { ghost: true, target: [[0, 60], [4, 64], [8, 67], [12, 64]], lo: 55, hi: 69 }),
    R('Pose une note sur chaque temps (pas 1, 5, 9, 13), sur la note de ton choix', { rules: [{ k: 'hasStep', steps: [0, 4, 8, 12], why: 'Il manque une note sur un temps.' }, { k: 'onSteps', steps: [0, 4, 8, 12], why: 'Une note est en dehors des temps.' }], lo: 55, hi: 69 }),
    Q('Dans le piano roll, une note plus longue est…', ['Plus large (horizontalement)', 'Plus haute', 'D’une autre couleur']),
    R('Recopie ce motif', { ghost: true, target: [[0, 57], [2, 60], [4, 64], [6, 60], [8, 62], [12, 59]], lo: 55, hi: 67 }),
  ]),
  lesson('l2', 'La ligne de basse', '🎸', [
    card('Les fondations', ['La basse joue souvent la fondamentale de l’accord en cours, au début de l’accord.', 'Elle se cale sur le kick pour former un bloc solide.', 'Une seule note grave à la fois : la basse est (presque) toujours monophonique.'], { demo: [{ label: '▶ Accords + basse', play: { k: 'notes', bpm: 100, p: 'moogbass', notes: [[45, 0, 1.9], [41, 2, 1.9], [36, 4, 1.9], [43, 6, 1.9]], with: { p: 'pad', notes: [[57, 0, 1.9], [60, 0, 1.9], [64, 0, 1.9], [57, 2, 1.9], [60, 2, 1.9], [65, 2, 1.9], [55, 4, 1.9], [60, 4, 1.9], [64, 4, 1.9], [55, 6, 1.9], [59, 6, 1.9], [62, 6, 1.9]] } } }] }),
    R('Accords : Am – F – C – G (une mesure chacun). Pose la fondamentale au début de chaque mesure.', { res: 'beat', lo: 31, hi: 52, chords: ['Am', 'F', 'C', 'G'], p: 'moogbass', rules: [{ k: 'pcAt', at: [[0, 9], [4, 5], [8, 0], [12, 7]], why: 'Au début de chaque mesure, il faut la note qui donne son nom à l’accord : A, F, C puis G.' }, { k: 'mono', why: 'Une seule note de basse à la fois.' }] }),
    Q('Sur un accord de Ré mineur (Dm), quelle note de basse est la plus sûre ?', ['D (Ré)', 'F (Fa)', 'B (Si)', 'E (Mi)']),
    Q('Pourquoi garder la basse en mono et sans reverb ?', ['Le grave doit rester solide et centré, sinon le mix devient boueux', 'Pour économiser le processeur', 'Parce que le MIDI l’exige']),
  ]),
  lesson('l3', 'Basse offbeat et basse roulante', '💃', [
    card('Entre les kicks', ['En house et en trance, la basse joue sur les contretemps, entre les kicks : boum-BASS-boum-BASS.', 'Kick et basse ne se marchent plus dessus : le groove rebondit.', 'En hard trance, la basse « roule » : 3 doubles croches entre chaque kick.'], { demo: [{ label: '▶ Basse offbeat', play: drums({ kick: 'x...x...x...x...', hat: '..x...x...x...x.' }, { bpm: 124, pad: { p: 'trancebass', notes: [[45, 0.5, 0.4], [45, 1.5, 0.4], [45, 2.5, 0.4], [45, 3.5, 0.4]] } }) }] }),
    R('Basse offbeat : un A1 sur chaque contretemps (pas 3, 7, 11, 15)', { target: [[2, 45], [6, 45], [10, 45], [14, 45]], lo: 40, hi: 52, p: 'trancebass', bpm: 124, kick: true }),
    Q('Où tombe une basse « offbeat » ?', ['Sur les contretemps, entre les kicks', 'Pile sur chaque kick', 'Sur le 1 seulement']),
    R('Basse roulante : 3 notes entre chaque kick (tous les pas sauf 1, 5, 9, 13)', { lo: 40, hi: 52, p: 'trancebass', bpm: 140, kick: true, rules: [{ k: 'hasStep', steps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], why: 'Il manque des notes entre les kicks.' }, { k: 'onSteps', steps: [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15], why: 'Laisse les temps (1, 5, 9, 13) au kick.' }, { k: 'mono', why: 'Une note à la fois.' }] }),
  ]),
  lesson('l4', 'Un hook qui reste', '🪝', [
    card('Les secrets d’un hook', ['Peu de notes, un rythme marquant, de la répétition.', 'Des notes de l’accord sur les temps forts, les autres notes de la gamme pour passer de l’une à l’autre.', 'Question / réponse : une phrase qui « demande », une qui « répond ».']),
    R('Écris un motif sur les pas 1 à 8 en penta de La mineur, puis répète-le à l’identique sur les pas 9 à 16', { scale: { root: 9, scale: 'pentaMinor' }, lo: 55, hi: 72, rules: [{ k: 'count', min: 4, max: 16, why: 'Au moins 2 notes par moitié.' }, { k: 'inScale', root: 9, scale: 'pentaMinor', why: 'Reste dans la penta de La mineur : A C D E G.' }, { k: 'repeat', half: 8, why: 'La 2e moitié doit répéter exactement la 1re.' }] }),
    Q('Qu’est-ce qui rend un hook mémorable ?', ['Un motif court qui se répète, avec un rythme marquant', 'Le plus de notes possible', 'Des notes toutes différentes']),
    O('Une phrase classique de 4 mesures', ['Motif', 'Motif répété', 'Variation', 'Retour du motif']),
    gen('contourEar', { n: 2 }),
  ]),
  lesson('l5', 'Varier une idée', '🧬', [
    card('Même idée, nouvelle vie', ['Transposer : tout décaler (d’une quinte, d’une octave).', 'Rétrograder : jouer à l’envers. Renverser (miroir) : ce qui montait descend.', 'Ou simplement changer la dernière note : la « réponse » à ta « question ».']),
    R('Transpose ce motif d’une quinte vers le haut (+7 demi-tons). Le modèle est en pointillés.', { guide: [[0, 57], [2, 60], [4, 64], [8, 62]], target: [[0, 64], [2, 67], [4, 71], [8, 69]], lo: 55, hi: 74 }),
    Q('Ton motif monte C → E → G. Son miroir (renversement)…', ['Descend : C → A → F', 'Monte plus haut', 'Joue les mêmes notes à l’envers']),
    gen('contourEar', { n: 2 }),
  ]),
  lab('lab-melody', 'Lab Mélodie : défi hook', '🎵', '#/melody?mode=challenge', { log: 'melody:' }, 'Écris un hook qui respecte le défi, puis valide-le au Catchy-mètre.'),
  lab('lab-bass', 'Labo de basse', '🎸', '#/basslab', { log: 'bass:' }, 'Écris une basse sur ton idée et fais-la critiquer comme par un prof.'),
  studio('st', 'Hook et basse dans Live', '🪝', [
    'Reprends ta grille C – G – Am – F (unité 8) sur 4 mesures.',
    'Nouvelle piste MIDI avec une basse (Sounds › Bass) : la fondamentale de chaque accord en noires.',
    'Change-la en basse offbeat (sur les contretemps) : compare.',
    'Nouvelle piste avec un pluck : écris un motif de 2 temps, répète-le, change la fin à la 4e mesure.',
    'Active Scale Mode dans chaque clip pour rester dans la tonalité.',
  ], 'Accords + basse + hook : tu as les trois couches mélodiques d’un morceau.'),
]);
