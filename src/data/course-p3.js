// Parcours, partie 4 : le synthé à la main — oscillateurs, filtres, enveloppes, modulation et recettes de sons.
// Les exercices S(…) se font sur un vrai petit synthé : on tourne les potards et on écoute.
import { card, Q, P, O, B, N, L, S, gen, unit, lesson, lab, studio, synth } from './coursekit.js';
import { PRESETS } from './presets.js';

const SAW = (o = {}) => ({ osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }], ...o });
const BASS = [[36, 0, 0.9], [36, 1, 0.4], [43, 1.5, 0.4], [41, 2, 1], [38, 3, 1]];
const LEAD = [[60, 0, 0.5], [63, 0.5, 0.5], [67, 1, 0.5], [70, 1.5, 0.5], [67, 2, 1]];
const PAD = [[57, 0, 3.5], [60, 0, 3.5], [64, 0, 3.5]];
const recipe = (id) => (PRESETS[id]?.serum || []);

export const U10 = unit('u10', {
  part: 4, title: 'Les oscillateurs', emoji: '〰️', color: '#5ce1e6', skill: 'sound',
  goal: 'Choisir et accorder la matière première du son : formes d’onde, harmoniques, octaves, unison, sub et bruit.',
  guide: [
    ['Formes d’onde', 'Sinus : pur. Triangle : doux. Carré : creux (harmoniques impaires). Scie : brillante (toutes les harmoniques).'],
    ['Accorder', 'Oct = 12 demi-tons, Semi = 1 demi-ton, Fine en cents (100 cents = 1 demi-ton).'],
    ['Unison', 'Plusieurs voix désaccordées (detune) = son épais et large. Peu ou pas sur les basses.'],
    ['Sub et bruit', 'Sub : sinus une octave plus bas pour le poids. Bruit : souffle, attaque, air.'],
    ['Dans Live', 'Drift (dans toutes les éditions de Live), Wavetable et Operator (édition Suite)… et Serum 2 en plugin.'],
  ],
}, [
  lesson('l1', 'La forme d’onde', '〰️', [
    card('La matière première', ['Un synthé soustractif part d’un oscillateur : une forme d’onde qui se répète très vite.', 'Sinus : pur et rond. Triangle : doux. Carré : creux. Dent de scie : brillante et riche.', 'On choisit l’onde, puis on la sculpte avec le filtre et les enveloppes.'], { visual: { k: 'waves' }, demo: ['sine', 'triangle', 'square', 'sawtooth'].map((w) => ({ label: `▶ ${{ sine: 'Sinus', triangle: 'Triangle', square: 'Carré', sawtooth: 'Scie' }[w]}`, play: synth({ osc: [{ wave: w, semi: 0, voices: 1, detune: 0, level: 1 }], filter: { cutoff: 16000 }, reverb: 0 }, [[48, 0, 1.5]]) })) }),
    gen('wave', { mode: 'see', n: 2 }),
    gen('wave', { mode: 'ear', waves: ['sine', 'sawtooth', 'square'], n: 3 }),
    P('Associe l’onde à son caractère', [['Sinus', 'Pur, rond (sub)'], ['Dent de scie', 'Brillante, riche'], ['Carré', 'Creuse, 8-bit'], ['Triangle', 'Douce, flûtée']]),
    S('Choisis la forme d’onde la plus brillante pour un lead', ['wave1'], { base: { osc: [{ wave: 'sine' }] }, ranges: { wave1: 'sawtooth' }, phrase: LEAD }),
  ]),
  lesson('l2', 'Les harmoniques', '🌈', [
    card('Pourquoi une scie est brillante', ['Un son, c’est une fréquence de base (la note) + des harmoniques plus aiguës.', 'Sinus : aucune harmonique. Carré : les harmoniques impaires. Scie : toutes.', 'Plus d’harmoniques = plus brillant… et plus de matière à filtrer.']),
    Q('Quelle onde n’a aucune harmonique ?', ['Sinus', 'Scie', 'Carré', 'Triangle']),
    Q('Tu veux un son à filtrer pour créer du mouvement. Quelle onde de départ ?', ['Dent de scie : pleine d’harmoniques', 'Sinus : rien à filtrer']),
    Q('Quelle onde a seulement les harmoniques impaires ?', ['Carré', 'Scie', 'Sinus']),
    gen('wave', { mode: 'ear', waves: ['sine', 'sawtooth'], n: 2 }),
  ]),
  lesson('l3', 'Octave, demi-ton, detune', '🎚️', [
    card('Accorder les oscillateurs', ['Oct : décale de ±12 demi-tons. Semi : d’un demi-ton. Fine : de quelques cents (100 cents = 1 demi-ton).', 'Deux oscillateurs à l’octave : son plus plein. À la quinte (+7) : son « power ».', 'Un léger désaccord entre deux oscillateurs : ça bat, ça vit.']),
    S('Ajoute l’Osc B une octave au-dessus (+12), à mi-volume', ['semi2', 'level2'], { base: { osc: [{}, { wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 0 }] }, ranges: { semi2: 12, level2: [0.3, 0.8] }, whys: { semi2: 'Une octave = +12 demi-tons.', level2: 'Mi-volume : entre 30 et 80 %.' }, phrase: LEAD }),
    S('Mets maintenant l’Osc B à la quinte (+7 demi-tons)', ['semi2', 'level2'], { base: { osc: [{}, { wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 0.5 }] }, ranges: { semi2: 7, level2: [0.2, 1] }, phrase: LEAD }),
    Q('100 cents, c’est…', ['Un demi-ton', 'Une octave', 'Un ton']),
    N('De combien de demi-tons décale un réglage « Oct −1 » ?', -12),
  ]),
  lesson('l4', 'Unison et detune', '🌊', [
    card('L’épaisseur', ['L’unison empile plusieurs copies de l’oscillateur, chacune un peu désaccordée (detune).', '7 voix + beaucoup de detune = la fameuse supersaw (trance, EDM).', 'Plus large en stéréo… mais garde tes basses avec peu ou pas d’unison.'], { demo: [{ label: '▶ 1 voix', play: synth(SAW({ filter: { cutoff: 6000 } }), [[57, 0, 2], [60, 0, 2], [64, 0, 2]]) }, { label: '▶ 7 voix', play: synth({ osc: [{ wave: 'sawtooth', voices: 7, detune: 28 }], width: 1, filter: { cutoff: 6000 } }, [[57, 0, 2], [60, 0, 2], [64, 0, 2]]) }] }),
    S('Rends ce son large : unison de 5 voix ou plus, detune d’au moins 15 cents', ['voices', 'detune'], { ranges: { voices: [5, 7], detune: [15, 50] }, phrase: PAD }),
    Q('Écoute A puis B : lequel a de l’unison ?', ['B', 'A'], 'L’unison rend le son plus large et « chorusé ».', { plays: [{ label: 'A', play: synth(SAW({ filter: { cutoff: 6000 } }), [[57, 0, 2], [64, 0, 2]]) }, { label: 'B', play: synth({ osc: [{ wave: 'sawtooth', voices: 7, detune: 30 }], width: 1, filter: { cutoff: 6000 } }, [[57, 0, 2], [64, 0, 2]]) }] }),
    Q('Pourquoi éviter l’unison large sur une sub bass ?', ['Le grave doit rester mono et stable', 'Ça coupe le son', 'Ça change la note']),
  ]),
  lesson('l5', 'Sub et bruit', '🔉', [
    card('Les ingrédients en plus', ['Sub : un sinus une octave sous la note, pour le poids dans le grave.', 'Bruit (noise) : du souffle, utile pour l’attaque, l’air d’un pad ou les risers.']),
    S('Ajoute du poids : sub à 50 % ou plus', ['sub'], { ranges: { sub: [0.5, 1] }, phrase: BASS }),
    S('Ajoute un peu de souffle : bruit entre 3 et 15 %', ['noise'], { ranges: { noise: [0.03, 0.15] }, phrase: PAD }),
    P('Associe', [['Oscillateur', 'La source du son'], ['Sub', 'Le poids dans le grave'], ['Noise', 'Le souffle'], ['Unison', 'L’épaisseur']]),
  ]),
  lab('lab-synth', 'Lab Synthé : exploration', '🔊', '#/synth', { log: 'synth:' }, 'Pars d’un preset, change UN paramètre à la fois et écoute. Garde un son au Carnet.'),
  studio('st', 'Les oscillateurs de Drift', '〰️', [
    'Piste MIDI, glisse Drift (Instruments › Drift).',
    'Osc 1 : passe d’une forme à l’autre en jouant une note tenue.',
    'Monte l’Osc 2 à l’octave puis à la quinte (+7) : écoute le son s’épaissir.',
    'Ajoute un peu de Noise : le son prend de l’air.',
    'Même chose dans Serum 2 si tu l’as : Osc A en Saw, Unison 7, Detune.',
  ], 'Tous les synthés soustractifs ont ces mêmes briques : une fois comprises dans un, tu les retrouves partout.', { tool: 'serum' }),
]);

export const U11 = unit('u11', {
  part: 4, title: 'Les filtres', emoji: '🌗', color: '#38bdf8', skill: 'sound',
  goal: 'Sculpter le son avec le filtre : passe-bas, passe-haut, passe-bande, résonance et filter sweeps.',
  guide: [
    ['Passe-bas', 'Garde les graves, coupe les aigus au-dessus du cutoff. Le plus utilisé.'],
    ['Passe-haut', 'Coupe les graves : nettoyer une piste, faire monter la tension.'],
    ['Passe-bande', 'Ne garde qu’une bande : son de radio, de téléphone.'],
    ['Résonance', 'Accentue le cutoff : caractère, puis sifflement acid.'],
    ['Sweep', 'Ouvrir/fermer le filtre dans le temps (Auto Filter + automatisation) = tension et relâchement.'],
  ],
}, [
  lesson('l1', 'Le passe-bas', '🔽', [
    card('Sculpter le son', ['Le filtre passe-bas (low-pass) laisse passer les graves et coupe les aigus au-dessus du cutoff.', 'Cutoff haut : brillant. Cutoff bas : étouffé, « derrière une porte ».', 'C’est le réglage le plus utilisé du sound design.'], { visual: { k: 'filter', type: 'lp', cutoff: 800, res: 0.2 } }),
    S('Rends le son sombre : cutoff sous 600 Hz', ['cutoff'], { ranges: { cutoff: [40, 600] }, phrase: BASS }),
    gen('filterEar', { n: 3 }),
    S('Rouvre-le à moitié : entre 1 500 et 4 000 Hz', ['cutoff'], { base: { filter: { cutoff: 300 } }, ranges: { cutoff: [1500, 4000] }, phrase: LEAD }),
    Q('Le passe-bas coupe…', ['Les aigus', 'Les graves', 'Le médium', 'Le volume']),
  ]),
  lesson('l2', 'Passe-haut et passe-bande', '🔼', [
    card('Les autres filtres', ['Passe-haut (high-pass) : coupe les graves. Pour nettoyer un son ou créer une montée.', 'Passe-bande : ne garde qu’une bande autour du cutoff : son de radio ou de téléphone.', 'Pente 12 dB : douce. 24 dB : franche, plus « analogique ».'], { visual: { k: 'filter', type: 'hp', cutoff: 800, res: 0.2 } }),
    P('Associe la courbe au filtre', [[{ visual: { k: 'filter', type: 'lp', cutoff: 700, res: 0.1 } }, 'Passe-bas'], [{ visual: { k: 'filter', type: 'hp', cutoff: 700, res: 0.1 } }, 'Passe-haut'], [{ visual: { k: 'filter', type: 'bp', cutoff: 700, res: 0.5 } }, 'Passe-bande']]),
    S('Choisis le passe-haut et monte le cutoff au-dessus de 800 Hz : le son devient fin', ['ftype', 'cutoff'], { base: { filter: { cutoff: 200 } }, ranges: { ftype: 'highpass', cutoff: [800, 16000] }, phrase: LEAD }),
    Q('Sur une piste de hats, quel filtre pour enlever les graves inutiles ?', ['Passe-haut', 'Passe-bas', 'Aucun']),
    Q('Pente 24 dB par rapport à 12 dB :', ['Coupe plus franchement', 'Coupe moins', 'Ajoute de la résonance']),
  ]),
  lesson('l3', 'La résonance', '〽️', [
    card('Le sifflement', ['La résonance (Res, Q) accentue les fréquences juste au niveau du cutoff.', 'Un peu : plus de caractère. Beaucoup : ça siffle, c’est le son acid de la TB-303.', 'Attention aux oreilles : monte-la doucement.'], { visual: { k: 'filter', type: 'lp', cutoff: 900, res: 1 } }),
    S('Fais un son acid : résonance 8 ou plus, cutoff entre 400 et 1 500 Hz', ['cutoff', 'q'], { ranges: { cutoff: [400, 1500], q: [8, 20] }, phrase: BASS }),
    Q('Écoute A puis B : lequel a beaucoup de résonance ?', ['A', 'B'], 'La résonance fait « siffler » le filtre autour du cutoff.', { plays: [{ label: 'A', play: synth(SAW({ filter: { cutoff: 700, q: 14 } }), BASS) }, { label: 'B', play: synth(SAW({ filter: { cutoff: 700, q: 0.7 } }), BASS) }] }),
    Q('La résonance accentue…', ['Les fréquences autour du cutoff', 'Seulement les basses', 'Le volume général']),
  ]),
  lesson('l4', 'Le filter sweep', '🌅', [
    card('Le filtre qui bouge', ['Ouvrir progressivement un passe-bas pendant 8 ou 16 mesures = une montée irrésistible.', 'Monter un passe-haut sur tout le morceau avant le drop, puis tout relâcher : effet garanti.', 'Dans Live : Auto Filter + automatisation du cutoff.'], { demo: [{ label: '▶ Sweep', play: { k: 'sweep', from: 200, to: 9000, bpm: 128, beats: 8 } }] }),
    Q('Pour une montée avant le drop, le cutoff d’un passe-bas…', ['S’ouvre progressivement', 'Se ferme d’un coup', 'Ne bouge pas']),
    Q('Quel effet audio de Live met un filtre automatisable sur n’importe quelle piste ?', ['Auto Filter', 'EQ Eight', 'Utility', 'Limiter']),
    B('Pour faire monter la tension, on [automatise] le [cutoff] du filtre.', ['quantifie', 'tempo', 'volume']),
    { t: 'knob', q: 'Fais le sweep toi-même : tourne le potard du cutoff de 0 jusqu’à 120', target: 120, tol: 7, label: 'Cutoff', audio: 'cutoff', from: 0 },
  ]),
  lab('lab-sound', 'Quiz d’oreille : sons', '👂', '#/ear?mode=sound', { log: 'ear:sound' }, 'Quel paramètre a changé entre deux sons ? Filtre, résonance, enveloppe…'),
]);

export const U12 = unit('u12', {
  part: 4, title: 'Les enveloppes', emoji: '📈', color: '#818cf8', skill: 'sound',
  goal: 'Donner une forme au son dans le temps : ADSR de volume, profils pluck / pad / orgue, enveloppe de filtre.',
  guide: [
    ['ADSR', 'Attack (montée), Decay (descente), Sustain (niveau tenu), Release (queue après relâchement).'],
    ['Profils', 'Pluck : A 0, S 0. Pad : A lente, R longue. Orgue : A 0, S 100 %, R courte.'],
    ['Enveloppe de filtre', 'ENV 2 → cutoff : le filtre s’ouvre puis se referme à chaque note. Le secret des plucks et des stabs.'],
  ],
}, [
  lesson('l1', 'ADSR', '📐', [
    card('La forme du son dans le temps', ['Une enveloppe décrit comment le volume évolue quand tu joues une note.', 'Attack : temps de montée. Decay : temps de descente. Sustain : niveau tant que la touche est tenue. Release : la queue après avoir lâché.'], { visual: { k: 'adsr', a: 0.3, d: 0.5, s: 0.6, r: 0.8 } }),
    P('Associe', [['Attack', 'Montée au début'], ['Decay', 'Descente après le pic'], ['Sustain', 'Niveau tenu'], ['Release', 'Queue après relâchement']]),
    S('Son percussif : attack très court (moins de 10 ms), sustain à 0, decay entre 100 et 500 ms', ['attack', 'decay', 'sustain', 'release'], { base: { amp: { a: 0.3, d: 1, s: 0.8, r: 0.5 } }, ranges: { attack: [0.001, 0.01], sustain: [0, 0.02], decay: [0.1, 0.5] }, phrase: LEAD }),
    Q('Sustain est…', ['Un niveau', 'Une durée'], 'A, D et R sont des durées ; S est un niveau (de 0 à 100 %).'),
    Q('Quelle enveloppe pour un pad qui gonfle doucement ?', [{ label: 'Courbe ●', visual: { k: 'adsr', a: 1.2, d: 0.5, s: 0.8, r: 1.5 } }, { label: 'Courbe ■', visual: { k: 'adsr', a: 0.005, d: 0.25, s: 0, r: 0.1 } }, { label: 'Courbe ▲', visual: { k: 'adsr', a: 0.005, d: 0.05, s: 1, r: 0.05 } }]),
  ]),
  lesson('l2', 'Pad, pluck, orgue', '☁️', [
    card('Trois profils à connaître', ['Pluck : attack 0, sustain 0 : la note s’éteint seule.', 'Pad : attack lente, release longue : le son gonfle et traîne.', 'Orgue : attack 0, sustain 100 %, release courte : on / off.']),
    S('Fais un pad : attack de 400 ms ou plus, sustain 60 % ou plus, release de 800 ms ou plus', ['attack', 'decay', 'sustain', 'release'], { base: { amp: { a: 0.003, d: 0.25, s: 0, r: 0.1 }, filter: { cutoff: 2500 } }, ranges: { attack: [0.4, 2], sustain: [0.6, 1], release: [0.8, 3] }, phrase: PAD }),
    S('Maintenant un orgue : attack sous 10 ms, sustain au maximum (95 % ou plus), release sous 100 ms', ['attack', 'decay', 'sustain', 'release'], { base: { osc: [{ wave: 'square' }], amp: { a: 0.8, d: 0.5, s: 0.5, r: 1.5 }, filter: { cutoff: 3000 } }, ranges: { attack: [0.001, 0.01], sustain: [0.95, 1], release: [0.01, 0.1] }, phrase: PAD }),
    gen('envEar', { n: 3 }),
  ]),
  lesson('l3', 'L’enveloppe de filtre', '⚡', [
    card('Le secret des plucks', ['Une 2e enveloppe peut piloter le cutoff : à chaque note, le filtre s’ouvre puis se referme.', 'Cutoff bas + enveloppe de filtre forte + decay court = pluck, stab house, basse funky.', 'Dans Serum 2 : ENV 2 glissée sur Cutoff. Dans Drift : l’enveloppe 2 vers le filtre.'], { demo: [{ label: '▶ Sans enveloppe de filtre', play: synth(SAW({ filter: { cutoff: 500, q: 3 }, amp: { a: 0.002, d: 0.35, s: 0, r: 0.2 } }), LEAD) }, { label: '▶ Avec', play: synth({ filter: { cutoff: 500, q: 3, envAmt: 3.2 }, fenv: { a: 0.001, d: 0.22, s: 0, r: 0.15 }, amp: { a: 0.002, d: 0.35, s: 0, r: 0.2 } }, LEAD) }] }),
    S('Crée un pluck : cutoff bas (sous 900 Hz), Env → Cutoff à 2,5 oct ou plus, decay du filtre entre 50 et 350 ms', ['cutoff', 'envAmt', 'fdecay'], { base: { amp: { a: 0.002, d: 0.4, s: 0, r: 0.2 }, filter: { q: 2 } }, ranges: { cutoff: [40, 900], envAmt: [2.5, 5], fdecay: [0.05, 0.35] }, phrase: LEAD }),
    Q('Pour un pluck plus « long », tu augmentes…', ['Le decay de l’enveloppe de filtre', 'La résonance', 'Le tempo']),
    Q('Un « stab » house, c’est…', ['Un accord court dont le filtre s’ouvre et se referme vite', 'Un pad très long', 'Une basse sans attaque']),
  ]),
  lesson('l4', 'À l’oreille', '👂', [
    gen('envEar', { n: 3 }),
    S('Reproduis le son mystère : écoute la cible et règle l’enveloppe', ['attack', 'decay', 'sustain', 'release'], { base: { amp: { a: 0.6, d: 0.6, s: 0.8, r: 1.2 } }, match: { amp: { a: 0.003, d: 0.28, s: 0, r: 0.15 } }, threshold: 70, phrase: LEAD }),
    S('Encore une : celui-ci gonfle…', ['attack', 'decay', 'sustain', 'release'], { base: { amp: { a: 0.003, d: 0.3, s: 0.5, r: 0.1 } }, match: { amp: { a: 1, d: 0.6, s: 0.8, r: 1.6 } }, threshold: 70, phrase: PAD }),
  ]),
  lab('lab-match', 'Lab Synthé : son mystère', '🎯', '#/synth?mode=match', { log: 'synth:match' }, 'Reproduis un son à l’oreille en réglant les potards.'),
]);

export const U13 = unit('u13', {
  part: 4, title: 'La modulation', emoji: '🌀', color: '#a78bfa', skill: 'sound',
  goal: 'Faire bouger le son : LFO, synchro au tempo, glide, MIDI Map et macros, FM et wavetable.',
  guide: [
    ['LFO', 'Oscillateur lent qui bouge un paramètre. → pitch = vibrato, → volume = trémolo, → cutoff = wobble.'],
    ['Tempo', 'Une noire = 60 000 ÷ BPM ms. LFO sur la noire = BPM ÷ 60 Hz. Delay 1/8 pointé = 3/4 de noire.'],
    ['Glide', 'La hauteur glisse d’une note à l’autre. En Legato : seulement si les notes se chevauchent.'],
    ['MIDI Map', 'Ctrl/Cmd+M, clique le paramètre, tourne le potard, Ctrl/Cmd+M. Assigne plutôt des macros.'],
    ['FM / Wavetable', 'Operator (FM : cloches, e-piano), Wavetable (position qui évolue), Serum 2.'],
  ],
}, [
  lesson('l1', 'Le LFO', '🔁', [
    card('Un oscillateur lent', ['LFO = Low Frequency Oscillator : trop lent pour s’entendre, il fait bouger un autre paramètre en boucle.', 'Rate : la vitesse. Depth (ou Amount) : l’ampleur. Destination : ce qu’il fait bouger.', 'LFO → pitch : vibrato. → volume : trémolo. → cutoff : wobble.'], { demo: [{ label: '▶ Wobble', play: synth(SAW({ filter: { cutoff: 900, q: 4 }, lfo: { target: 'cutoff', rate: 3, depth: 0.8 }, amp: { s: 1 } }), [[36, 0, 4]]) }, { label: '▶ Vibrato', play: synth({ osc: [{ wave: 'triangle' }], lfo: { target: 'pitch', rate: 5.5, depth: 0.3 }, amp: { a: 0.05, s: 1 } }, [[67, 0, 3]]) }] }),
    P('Associe la destination du LFO à l’effet', [['Pitch', 'Vibrato'], ['Volume', 'Trémolo'], ['Cutoff', 'Wobble']]),
    S('Fais un wobble : LFO vers le cutoff, vitesse entre 1 et 6 Hz, quantité 50 % ou plus', ['lfoTarget', 'lfoRate', 'lfoDepth'], { base: { filter: { cutoff: 900, q: 4 }, amp: { s: 1 } }, ranges: { lfoTarget: 'cutoff', lfoRate: [1, 6], lfoDepth: [0.5, 1] }, phrase: [[36, 0, 4]] }),
    S('Un vibrato : LFO vers le pitch, vitesse entre 4 et 8 Hz, quantité discrète (5 à 50 %)', ['lfoTarget', 'lfoRate', 'lfoDepth'], { base: { osc: [{ wave: 'triangle' }], amp: { a: 0.05, s: 1 } }, ranges: { lfoTarget: 'pitch', lfoRate: [4, 8], lfoDepth: [0.05, 0.5] }, phrase: [[67, 0, 2], [69, 2, 2]] }),
    Q('Un LFO réglé à 0,25 Hz fait un cycle en…', ['4 secondes', '0,25 seconde', '25 secondes']),
  ]),
  lesson('l2', 'Synchro au tempo', '⏲️', [
    card('LFO et delays en rythme', ['Un LFO synchronisé (1/4, 1/8…) bouge en rythme avec le morceau : wobble dubstep, trémolo rythmique.', 'Pareil pour les delays : la croche pointée (1/8 dotted) est le grand classique.', 'Formule : une noire = 60 000 ÷ BPM millisecondes.']),
    gen('calc', { kinds: ['beatMs', 'eighthMs', 'dottedMs', 'lfoHz'], n: 4 }),
  ]),
  lesson('l3', 'Glide et mono', '🛝', [
    card('Glisser d’une note à l’autre', ['Le glide (portamento) fait glisser la hauteur au lieu de sauter.', 'En mode Mono/Legato, il n’agit que si les notes se chevauchent : c’est comme ça qu’on programme les slides d’une 303 ou d’une 808.'], { demo: [{ label: '▶ Sans glide', play: synth(SAW({ filter: { cutoff: 1200, q: 3 } }), [[36, 0, 1], [48, 1, 1], [43, 2, 1]]) }, { label: '▶ Avec glide', play: synth(SAW({ filter: { cutoff: 1200, q: 3 }, glide: 0.12 }), [[36, 0, 1], [48, 1, 1], [43, 2, 1]]) }] }),
    S('Ajoute du glide : au moins 50 ms', ['glide'], { base: { filter: { cutoff: 1200, q: 3 } }, ranges: { glide: [0.05, 0.3] }, phrase: [[36, 0, 1], [48, 1, 1], [43, 2, 1], [36, 3, 1]] }),
    Q('Écoute A puis B : lequel glisse ?', ['A', 'B'], null, { plays: [{ label: 'A', play: synth(SAW({ filter: { cutoff: 1500 }, glide: 0.15 }), [[40, 0, 1], [52, 1, 1]]) }, { label: 'B', play: synth(SAW({ filter: { cutoff: 1500 } }), [[40, 0, 1], [52, 1, 1]]) }] }),
    Q('En mode Legato, quand le glide s’applique-t-il ?', ['Quand les notes se chevauchent', 'Sur toutes les notes', 'Jamais']),
  ]),
  lesson('l4', 'MIDI Map et macros', '🎛️', [
    card('Ton clavier aux commandes', ['Ctrl/Cmd+M : mode MIDI Map, l’interface devient bleue.', 'Clique le paramètre (cutoff, macro…), tourne un potard de ton clavier : c’est assigné.', 'Ctrl/Cmd+M pour sortir. Assigne de préférence les macros d’un Rack : un potard peut piloter plusieurs paramètres.']),
    gen('shortcut', { ids: ['midiMap', 'keyMap'], n: 2 }),
    O('Assigner un potard au cutoff', ['Ctrl/Cmd+M (MIDI Map)', 'Cliquer le cutoff', 'Tourner le potard du clavier', 'Ctrl/Cmd+M pour sortir']),
    L('Où entres-tu en mode MIDI Map ?', 'midi-map', ['control']),
    { t: 'knob', q: 'Le potard est assigné au cutoff : ouvre le filtre jusqu’à 100', target: 100, tol: 6, audio: 'cutoff', label: 'Cutoff' },
    L('Où sont les macros d’un Rack ?', 'macros', ['device']),
  ]),
  lesson('l5', 'FM et wavetable', '🔔', [
    card('Deux autres synthèses', ['FM : un oscillateur module la fréquence d’un autre. Ratio entier = harmonique (e-piano, orgue) ; ratio non entier = métallique (cloches).', 'Wavetable : l’oscillateur lit une table de formes d’onde ; déplacer la « position » fait évoluer le son.', 'Dans Live : Operator (FM) et Wavetable, fournis avec l’édition Suite. Et Serum 2, bien sûr.'], { demo: [{ label: '▶ Cloche FM', play: synth('bell', [[72, 0, 2], [79, 2, 2]]) }] }),
    S('Fais une cloche FM : quantité FM 1,5 ou plus et ratio non entier (3,5)', ['fmIndex', 'fmRatio'], { base: { osc: [{ wave: 'sine' }], amp: { a: 0.002, d: 1.5, s: 0, r: 1 }, filter: { cutoff: 12000 } }, ranges: { fmIndex: [1.5, 6], fmRatio: [3.5, 3.5] }, phrase: [[72, 0, 2], [79, 2, 2]] }),
    P('Instrument de Live ↔ type de synthèse', [['Operator', 'FM'], ['Wavetable', 'Table d’ondes'], ['Drift', 'Soustractive'], ['Simpler', 'Sampler']]),
    Q('Un ratio FM non entier donne un son…', ['Métallique, de cloche', 'Plus grave', 'Parfaitement harmonique']),
  ]),
  studio('st', 'Mappe ton clavier', '🎛️', [
    'Glisse Drift sur une piste MIDI.',
    'Ctrl/Cmd+M, clique le cutoff de Drift, tourne un potard de ton clavier, Ctrl/Cmd+M.',
    'Pareil pour la résonance sur un 2e potard.',
    'Joue une note tenue et fais bouger les deux potards : c’est toi le filter sweep !',
    'Bonus : regroupe Drift dans un Rack (Ctrl/Cmd+G) et assigne une macro « Brillance » au cutoff + à la reverb.',
  ], 'Un son qu’on peut jouer avec les mains vit beaucoup plus qu’un son figé.', { tool: 'midi' }),
]);

export const U14 = unit('u14', {
  part: 4, title: 'Recettes de sons', emoji: '🧪', color: '#f472b6', skill: 'sound',
  goal: 'Recréer à la main les sons de base de la musique électronique : sub, pluck, pad, supersaw, acid.',
  guide: [
    ['Sub bass', 'Sinus, mono, pas de reverb, attaque courte, release courte.'],
    ['Pluck', 'Scie, cutoff bas, enveloppe de filtre forte et courte, sustain 0, delay.'],
    ['Pad', 'Onde douce, unison léger, attaque et release lentes, chorus et reverb.'],
    ['Supersaw', 'Scie, 7 voix, detune fort, largeur maximale, reverb.'],
    ['Acid', 'Scie mono, résonance forte, enveloppe de filtre, glide, distorsion.'],
  ],
}, [
  lesson('l1', 'La sub bass', '🔈', [
    card('Recette : sub bass', ['Un sinus, en mono, sans reverb : du poids pur dans le grave.', 'Attaque courte mais pas nulle (pas de clic), release courte.', ...recipe('sub').map((t) => `Serum 2 : ${t}`).slice(0, 2)], { demo: [{ label: '▶ Écouter', play: synth('sub', BASS) }] }),
    S('Étape 1 : passe l’oscillateur en sinus et coupe la reverb (sous 5 %)', ['wave1', 'reverb'], { ranges: { wave1: 'sine', reverb: [0, 0.05] }, phrase: BASS }),
    S('Étape 2 : maintenant, recrée la sub bass à l’oreille (filtre et release compris)', ['wave1', 'cutoff', 'release', 'reverb'], { match: 'sub', threshold: 72, phrase: BASS }),
    Q('Dans Live, comment vérifier où se situe ta sub ?', ['Avec Spectrum : le pic doit être entre 40 et 80 Hz', 'Avec le métronome', 'En regardant la couleur du clip']),
    Q('Pourquoi pas de reverb sur une sub ?', ['La reverb brouille le grave : il doit rester sec et précis', 'La reverb coupe le son', 'Pour économiser de la place']),
  ]),
  lesson('l2', 'Le pluck', '💧', [
    card('Recette : pluck', ['Scie, un peu d’unison, filtre bas.', 'L’enveloppe de filtre ouvre et referme le son à chaque note ; sustain 0.', ...recipe('pluck').map((t) => `Serum 2 : ${t}`).slice(0, 2)], { demo: [{ label: '▶ Écouter', play: synth('pluck', LEAD) }] }),
    S('Étape 1 : sustain à 0 et decay du volume entre 100 et 500 ms', ['decay', 'sustain'], { ranges: { sustain: [0, 0.03], decay: [0.1, 0.5] }, phrase: LEAD }),
    S('Étape 2 : recrée le pluck à l’oreille', ['cutoff', 'envAmt', 'fdecay', 'decay', 'sustain'], { match: 'pluck', threshold: 72, phrase: LEAD }),
    Q('Pour donner de l’espace et du rythme à un pluck, l’effet classique ?', ['Un delay en croche pointée', 'Une distorsion forte', 'Un passe-haut à 5 kHz']),
    Q('Dans un pluck, le « ploc » vient surtout…', ['De l’enveloppe de filtre', 'De la reverb', 'Du LFO']),
  ]),
  lesson('l3', 'Le pad', '☁️', [
    card('Recette : pad chaud', ['Onde douce (triangle), unison léger, filtre assez bas.', 'Attaque lente, release longue, chorus et grande reverb.', ...recipe('warmpad').map((t) => `Serum 2 : ${t}`).slice(0, 2)], { demo: [{ label: '▶ Écouter', play: synth('warmpad', PAD) }] }),
    S('Étape 1 : attaque de 500 ms ou plus et release d’au moins 1 s', ['attack', 'release'], { ranges: { attack: [0.5, 2], release: [1, 3] }, phrase: PAD }),
    S('Étape 2 : recrée le pad à l’oreille', ['wave1', 'attack', 'release', 'cutoff', 'chorus', 'reverb'], { match: 'warmpad', threshold: 70, phrase: PAD }),
    Q('Ton pad brouille la basse. Le geste le plus simple ?', ['Couper ses graves sous 150 Hz avec EQ Eight', 'Monter sa reverb', 'Le transposer d’une octave vers le bas']),
    Q('Quelle est la différence principale entre un pad et un pluck ?', ['L’enveloppe : lente et tenue pour le pad, immédiate et courte pour le pluck', 'La note jouée', 'Le tempo']),
  ]),
  lesson('l4', 'La supersaw', '🌊', [
    card('Recette : supersaw', ['Scie, 7 voix d’unison, detune fort, largeur maximale.', 'Filtre assez ouvert, reverb : le son des refrains trance et EDM.', ...recipe('supersaw').map((t) => `Serum 2 : ${t}`).slice(0, 2)], { demo: [{ label: '▶ Écouter', play: synth('supersaw', PAD) }] }),
    S('Étape 1 : 7 voix d’unison et au moins 20 cents de detune', ['voices', 'detune'], { ranges: { voices: [7, 7], detune: [20, 50] }, phrase: PAD }),
    S('Étape 2 : recrée la supersaw à l’oreille', ['voices', 'detune', 'width', 'cutoff', 'reverb'], { match: 'supersaw', threshold: 72, phrase: PAD }),
    Q('Une supersaw très large peut disparaître…', ['Quand on écoute en mono (téléphone, enceinte de club)', 'Quand on baisse le tempo', 'Quand on la quantifie']),
    Q('Pour que la supersaw « pompe » avec le kick, dans Live on ajoute…', ['Un Compressor en sidechain sur le kick', 'Un deuxième kick', 'Une reverb plus longue']),
  ]),
  lesson('l5', 'Acid et reese', '🧪', [
    card('Recette : acid', ['Scie en mono, filtre bas avec beaucoup de résonance.', 'Enveloppe de filtre courte, glide sur les notes liées, distorsion.', ...recipe('acid').map((t) => `Serum 2 : ${t}`).slice(0, 2)], { demo: [{ label: '▶ Acid', play: synth('acid', [[36, 0, 0.5], [48, 0.5, 0.5], [36, 1, 0.5], [39, 1.5, 0.75], [43, 2, 0.5], [36, 3, 0.5]]) }] }),
    S('Étape 1 : résonance 8 ou plus et un peu de glide (au moins 40 ms)', ['q', 'glide'], { base: { filter: { cutoff: 500 } }, ranges: { q: [8, 20], glide: [0.04, 0.3] }, phrase: [[36, 0, 0.5], [48, 0.5, 0.5], [36, 1, 0.5], [39, 1.5, 0.75], [43, 2, 0.5], [36, 3, 0.5]] }),
    S('Étape 2 : recrée l’acid à l’oreille', ['cutoff', 'q', 'envAmt', 'fdecay', 'glide', 'drive'], { match: 'acid', threshold: 70, phrase: [[36, 0, 0.5], [48, 0.5, 0.5], [36, 1, 0.5], [39, 1.5, 0.75], [43, 2, 0.5], [36, 3, 0.5]] }),
    Q('Pour qu’une ligne acid « parle », on automatise surtout…', ['Le cutoff et la résonance', 'Le tempo', 'Le volume du kick']),
    card('Bonus : la reese', ['Deux scies désaccordées l’une de l’autre : elles « battent » et le son se tord lentement.', 'Un sub en dessous, un filtre bas qui bouge lentement (LFO), de la distorsion.', 'Née dans la techno de Detroit, devenue la basse reine de la drum & bass.'], { demo: [{ label: '▶ Reese', play: synth('reese', [[36, 0, 2], [34, 2, 2]]) }] }),
    Q('Ce qui fait « battre » une reese…', ['Deux scies légèrement désaccordées', 'Un LFO sur le volume', 'La reverb']),
  ]),
  lab('lab-match2', 'Lab Synthé : son mystère', '🎯', '#/synth?mode=match', { log: 'synth:match' }, 'Le même défi qu’en leçon, avec tous les potards du Lab.'),
  studio('st', 'Trois sons dans Serum 2 ou Drift', '🧪', [
    'Pars d’un patch « Init » (Serum 2 : Menu › Init Preset ; Drift : glisse-le vierge).',
    'Recrée la sub bass, sauve le preset « Sub – appris ».',
    'Retour à Init : recrée le pluck (enveloppe 2 sur le cutoff), sauve-le.',
    'Retour à Init : recrée la supersaw (Unison 7, Detune), sauve-la.',
    'Fais jouer les trois sur ta grille C – G – Am – F.',
  ], 'Partir d’Init plutôt que d’un preset t’oblige à comprendre chaque réglage : c’est comme ça qu’on devient autonome.', { tool: 'serum' }),
]);
