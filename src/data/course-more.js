// Exercices de pratique ajoutés à la fin des leçons (après les notions, on s'entraîne).
import { Q, P, O, B, N, L, K, R, S, T, gen, drums } from './coursekit.js';

const PAD = [[57, 0, 3.5], [60, 0, 3.5], [64, 0, 3.5]];
const BASS = [[36, 0, 0.9], [36, 1, 0.4], [43, 1.5, 0.4], [41, 2, 1], [38, 3, 1]];
const GHOSTLESS = { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' };
const GHOSTY = { kick: 'x......x..x.....', snare: '....x..g.g..x.g.', hat: 'x.x.x.x.x.x.x.x.' };

export const MORE = {
  'u5-l3': [
    gen('gridEar', { patterns: ['boombap', 'techno'] }),
    Q('Dans un groove techno, les hats en doubles croches…', ['Font avancer le morceau, comme un moteur', 'Ralentissent le tempo', 'Le rendent swing']),
    gen('countHits'),
  ],
  'u5-l4': [
    Q('Écoute A puis B : lequel a des ghost notes ?', ['B', 'A'], 'Les petits coups de snare entre les temps forts : on les sent plus qu’on ne les entend.', { plays: [{ label: 'A', play: drums(GHOSTLESS, { bpm: 92, kit: 'acoustic' }) }, { label: 'B', play: drums(GHOSTY, { bpm: 92, kit: 'acoustic' }) }] }),
    B('Une ghost note est un coup de [faible] [vélocité], glissé entre les coups forts.', ['forte', 'hauteur']),
  ],
  'u6-l1': [
    gen('tempoEar'),
    Q('Le métronome de Live s’entend-il dans l’export final ?', ['Non : il ne sert qu’à toi pendant que tu joues', 'Oui, toujours']),
    T('Une dernière fois, à 110 BPM', { bpm: 110, beats: 8 }),
  ],
  'u6-l4': [
    Q('Capture MIDI a récupéré ton idée. Où apparaît-elle ?', ['Dans un nouveau clip, sur la piste armée', 'Dans le navigateur', 'Nulle part, il faut l’exporter']),
    K('Joue l’arpège de La mineur 7 : A, C, E, G', 'seq', [9, 0, 4, 7]),
  ],
  'u7-l3': [
    gen('notInScale', { roots: ['A'], scale: 'pentaMinor', n: 2 }),
    R('Improvise au moins 6 notes dans la penta de La mineur (lignes claires)', { scale: { root: 9, scale: 'pentaMinor' }, lo: 55, hi: 72, rules: [{ k: 'count', min: 6, max: 32, why: 'Pose au moins 6 notes.' }, { k: 'inScale', root: 9, scale: 'pentaMinor', why: 'Une note sort de la penta (A C D E G).' }] }),
  ],
  'u7-l5': [
    gen('notInScale', { roots: ['A'], scale: 'minor', n: 1 }),
    Q('Scale activé dans un clip : peux-tu encore jouer une note hors gamme au clavier ?', ['Oui : Scale surligne la gamme ; c’est le MIDI Effect Scale qui corrige', 'Non, c’est impossible']),
  ],
  'u8-l5': [
    K('Joue Sol majeur avec Ré en bas (G/D)', 'chord', [7, 11, 2], { bass: 2 }),
    Q('Un accord renversé contient…', ['Les mêmes notes, dans un autre ordre', 'D’autres notes', 'Une note de moins']),
    gen('chord', { chords: ['C', 'F', 'G', 'Am'], n: 1 }),
  ],
  'u9-l1': [
    R('Recopie l’arpège : C, E, G puis le C du dessus', { ghost: true, target: [[0, 60], [2, 64], [4, 67], [6, 72]], lo: 57, hi: 74 }),
    Q('Dans le piano roll de Live, pour allonger une note…', ['On tire son bord droit', 'On la double-clique', 'On appuie sur Tab']),
  ],
  'u9-l2': [
    R('Accords C – G – Am – F : la fondamentale au début de chaque mesure', { res: 'beat', lo: 31, hi: 52, chords: ['C', 'G', 'Am', 'F'], p: 'moogbass', rules: [{ k: 'pcAt', at: [[0, 0], [4, 7], [8, 9], [12, 5]], why: 'Il faut C, G, A puis F au début des mesures.' }, { k: 'mono', why: 'Une seule note de basse à la fois.' }] }),
    gen('intervalEar', { set: [7, 12], n: 1 }),
    Q('Basse et kick frappent toujours en même temps. Le risque ?', ['Ils se masquent : on décale la basse (offbeat) ou on utilise le sidechain', 'Aucun', 'Le tempo ralentit']),
  ],
  'u9-l3': [
    R('Basse offbeat sur E1 : un E sur chaque contretemps (pas 3, 7, 11, 15)', { target: [[2, 40], [6, 40], [10, 40], [14, 40]], lo: 38, hi: 52, p: 'trancebass', bpm: 128, kick: true }),
    Q('En hard trance, la basse « roule » parce que…', ['3 doubles croches remplissent l’espace entre deux kicks', 'Elle joue des accords', 'Elle joue pile sur le kick']),
  ],
  'u9-l5': [
    R('Rétrograde ce motif : joue-le à l’envers (le modèle est en gris)', { guide: [[0, 60], [4, 62], [8, 64], [12, 67]], target: [[0, 67], [4, 64], [8, 62], [12, 60]], lo: 57, hi: 69 }),
    Q('Ne changer que la dernière note d’un motif répété crée…', ['Une réponse : la phrase se termine autrement', 'Une fausse note', 'Un nouveau tempo']),
  ],
  'u10-l3': [
    gen('intervalEar', { set: [7, 12], n: 2 }),
    Q('L’Osc B réglé sur +12 sonne…', ['Une octave au-dessus', 'Un demi-ton au-dessus', 'À la quinte']),
  ],
  'u10-l4': [
    S('Ouvre la stéréo : largeur à 90 % ou plus', ['width'], { base: { osc: [{ voices: 5, detune: 20 }], width: 0.2 }, ranges: { width: [0.9, 1] }, phrase: PAD }),
    Q('Le detune se mesure en…', ['Cents (centièmes de demi-ton)', 'Hertz', 'Millisecondes']),
  ],
  'u10-l5': [
    S('Pour une basse : sub à 40 % ou plus et une seule voix d’unison', ['sub', 'voices'], { base: { osc: [{ voices: 5, detune: 20 }] }, ranges: { sub: [0.4, 1], voices: [1, 1] }, phrase: BASS }),
    Q('Le bruit filtré qui monte avant un drop s’appelle…', ['Un riser', 'Un sub', 'Une ghost note']),
  ],
  'u11-l2': [
    gen('filterEar', { n: 1 }),
    Q('Quel filtre donne un son de radio ou de téléphone ?', ['Passe-bande', 'Passe-bas', 'Passe-haut']),
  ],
  'u11-l3': [
    S('Un son rond et doux : cutoff sous 800 Hz, résonance sous 2', ['cutoff', 'q'], { base: { filter: { cutoff: 3000, q: 10 } }, ranges: { cutoff: [40, 800], q: [0.1, 2] }, phrase: BASS }),
    Q('La TB-303 de Roland est célèbre pour…', ['Son filtre résonant et ses slides : l’acid', 'Ses pads', 'Ses boîtes à rythmes']),
  ],
  'u11-l4': [
    Q('Un passe-haut qui monte sur tout le mix avant le drop…', ['Retire les graves petit à petit : le drop paraît énorme quand ils reviennent', 'Ajoute des graves', 'Change la tonalité']),
    O('Un filter sweep de build-up, dans l’ordre', ['Cutoff fermé au début du build', 'Le cutoff s’ouvre sur 8 mesures', 'Ouverture complète sur le drop']),
  ],
  'u12-l1': [
    gen('envEar', { n: 1 }),
    Q('Release longue : quand tu lâches la touche, le son…', ['Continue et s’éteint doucement', 'S’arrête net', 'Devient plus fort']),
  ],
  'u12-l3': [
    S('Un stab plus sec : decay du filtre sous 120 ms', ['fdecay'], { base: { filter: { cutoff: 500, q: 2, envAmt: 3 }, fenv: { d: 0.5 }, amp: { a: 0.002, d: 0.3, s: 0, r: 0.15 } }, ranges: { fdecay: [0.01, 0.12] }, phrase: [[57, 0, 0.5], [60, 0, 0.5], [64, 0, 0.5], [57, 1.5, 0.5], [60, 1.5, 0.5], [64, 1.5, 0.5]] }),
    Q('Dans Serum 2, pour que l’ENV 2 pilote le cutoff…', ['On la glisse sur le potard Cutoff', 'On appuie sur Tab', 'On l’active dans les Préférences']),
  ],
  'u13-l1': [
    S('Un trémolo : LFO vers le volume, vitesse entre 3 et 10 Hz, quantité 30 % ou plus', ['lfoTarget', 'lfoRate', 'lfoDepth'], { base: { osc: [{ wave: 'triangle' }], amp: { s: 1 } }, ranges: { lfoTarget: 'amp', lfoRate: [3, 10], lfoDepth: [0.3, 1] }, phrase: [[64, 0, 3]] }),
    Q('LFO vers le volume, c’est…', ['Un trémolo', 'Un vibrato', 'Un wobble']),
  ],
  'u13-l2': [gen('calc', { kinds: ['sixteenthMs', 'barSec'], n: 2 })],
  'u13-l3': [
    S('Une 808 qui glisse : onde sinus, glide d’au moins 80 ms', ['wave1', 'glide'], { base: { filter: { cutoff: 2000 }, amp: { s: 0.9 } }, ranges: { wave1: 'sine', glide: [0.08, 0.3] }, phrase: [[36, 0, 1.2], [43, 1, 1], [36, 2, 1]] }),
    Q('En mode Mono, combien de notes le synthé joue-t-il à la fois ?', ['Une seule', 'Toutes celles qu’on enfonce', 'Deux']),
  ],
  'u13-l5': [
    Q('Dans un synthé wavetable, un LFO sur la « position » donne…', ['Un son qui évolue sans cesse', 'Un son plus fort', 'Un tempo plus rapide']),
    gen('wave', { mode: 'ear', waves: ['sine', 'square'], n: 1 }),
  ],
  'u15-l1': [
    O('La chaîne classique d’un lead', ['EQ Eight (nettoyage)', 'Compressor', 'Saturator', 'Delay', 'Reverb']),
    Q('Dans la vue Device, le signal traverse les devices…', ['De gauche à droite', 'De droite à gauche', 'Au hasard']),
  ],
  'u15-l2': [
    Q('Le niveau d’un Send détermine…', ['Quelle part du son part vers la piste de retour', 'Le volume du kick', 'Le tempo']),
    B('Une [piste de retour] reçoit le son de plusieurs pistes grâce à leurs [sends].', ['clips', 'scènes']),
  ],
  'u15-l3': [
    Q('Trop de graves (voir le spectre). Que faire ?', ['Baisser vers 40-80 Hz ou couper les graves inutiles des autres pistes', 'Booster 10 kHz', 'Rien'], null, { visual: { k: 'eq', fault: 'low', guide: true } }),
    Q('Booster fortement 3-5 kHz sur tout le mix rend le son…', ['Agressif, fatigant', 'Plus grave', 'Plus large']),
  ],
  'u15-l4': [
    Q('Un ratio de 1:1 signifie…', ['Aucune compression', 'La compression maximale', 'Un limiteur']),
    Q('Un attack lent sur le compresseur d’un kick…', ['Laisse passer le « clic » de l’attaque : plus de punch', 'Écrase l’attaque', 'Coupe le kick']),
  ],
  'u15-l5': [
    Q('Une longue reverb sur le kick…', ['Brouille le grave : garde-la courte ou évite-la', 'Rend le kick plus net', 'Est obligatoire']),
    gen('calc', { kinds: ['beatMs'], n: 1 }),
  ],
  'u15-l6': [
    Q('Un Instrument Rack peut contenir…', ['Un instrument et ses effets, rangés ensemble', 'Seulement des samples', 'Des pistes entières']),
    O('Assigner une macro', ['Sélectionner les devices', 'Ctrl/Cmd+G pour faire un Rack', 'Activer « Map » dans le Rack', 'Cliquer le paramètre, puis la macro']),
  ],
  'u16-l2': [
    Q('Dans un break, l’énergie…', ['Redescend pour préparer le prochain drop', 'Est au maximum', 'Disparaît pour de bon']),
    N('Combien de mesures dans une section de 32 temps en 4/4 ?', 8),
  ],
  'u16-l4': [
    Q('Un crash sur le premier temps du drop sert à…', ['Marquer l’arrivée de la nouvelle section', 'Annoncer la fin du morceau', 'Remplacer le kick']),
    Q('Un riser, c’est…', ['Un son (souvent du bruit filtré) qui monte avant un drop', 'Un type de kick', 'Un compresseur']),
  ],
  'u16-l5': [
    Q('Pourquoi la méthode soustractive aide à finir ?', ['On part d’une boucle complète : enlever est plus facile qu’inventer', 'Elle est plus rapide à calculer', 'Elle évite le mixage']),
    O('Une intro pensée pour les DJ', ['Kick et hats seuls', 'Arrivée de la basse', 'Arrivée des percussions', 'Entrée des accords']),
  ],
  'u17-l1': [
    Q('Une piste sature (le vumètre est rouge). Le bon réflexe ?', ['Baisser le gain de la source ou de la piste', 'Monter le Main', 'Ajouter de la reverb']),
  ],
  'u17-l2': [
    Q('Pourquoi écouter ton mix en mono de temps en temps ?', ['Beaucoup de systèmes (téléphone, club) sont en mono : rien ne doit disparaître', 'Pour gagner du temps', 'Pour changer le tempo']),
    Q('Le bouton Solo sert à…', ['Écouter une piste seule pour la régler', 'Supprimer la piste', 'Enregistrer']),
  ],
  'u17-l3': [
    Q('Un limiteur poussé trop fort…', ['Écrase la dynamique : le morceau devient plat et fatigant', 'Améliore toujours le son', 'Baisse le volume']),
    N('Plafond à −1 dB, pic à −7 dB : combien de dB de marge ?', 6, { unit: 'dB' }),
  ],
  'u18-l1': [
    Q('Le mode Beats est idéal pour…', ['Une boucle de batterie', 'Une voix seule', 'Un pad']),
    Q('Les warp markers servent à…', ['Caler les temps forts d’un sample sur la grille', 'Changer la tonalité', 'Ajouter de la reverb']),
    B('Le [warp] cale un sample sur le [tempo] du set.', ['volume', 'gain']),
  ],
  'u18-l2': [
    O('Transformer un son de synthé en sample', ['Freeze de la piste', 'Flatten', 'Découper et retourner l’audio']),
    Q('Une piste gelée (Freeze) : peut-on encore modifier ses notes ?', ['Non, il faut d’abord la dégeler (Unfreeze)', 'Oui, librement']),
  ],
  'u18-l4': [
    Q('Un groove « MPC Swing 58 % » signifie…', ['Les contretemps sont légèrement retardés', 'Le tempo baisse de 58 %', '58 % des notes sont supprimées']),
  ],
  'u18-l5': [
    Q('Le meilleur moment pour exporter un morceau ?', ['Quand il est fini, même imparfait : le suivant sera meilleur', 'Jamais', 'Après un an de retouches']),
    P('Associe l’habitude à son effet', [['Template', 'Démarrer en 10 secondes'], ['Deadline', 'Finir au lieu de peaufiner'], ['Référence', 'Comparer ton mix'], ['Ctrl/Cmd+S', 'Ne rien perdre']]),
  ],
};
