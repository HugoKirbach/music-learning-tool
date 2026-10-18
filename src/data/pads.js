// Pad Rush : parcours progressif (finger drumming). Chaque niveau = une notion + un groove pour la pratiquer.
// Motifs : 1 caractère par pas (res pas par temps, 4 = doubles croches) — x coup, X accent, g ghost, . silence, | = barre de mesure.

const D = (...ids) => ids.map((id) => ({ id, sound: { drum: id } }));
/** Motif écrit comme une liste d'événements [pas, pad, caractère] → chaînes par pad. */
function events(total, list, ids) {
  const out = Object.fromEntries(ids.map((id) => [id, Array(total).fill('.')]));
  for (const [s, id, c = 'x'] of list) out[id][s] = c;
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('')]));
}

export const PAD_CHAPTERS = [
  { id: 1, name: 'Les bases', emoji: '💓', desc: 'Kick, snare, hats : le squelette d’un beat' },
  { id: 2, name: 'Grooves de styles', emoji: '🌍', desc: 'House, boom bap, reggaeton' },
  { id: 3, name: 'Dynamique', emoji: '🎚️', desc: 'Accents et ghost notes : la vélocité fait groover' },
  { id: 4, name: 'Finger drumming', emoji: '🖐️', desc: 'Doubles croches, roulements trap, fills' },
  { id: 5, name: 'Breaks & percussions', emoji: '🥁', desc: 'Amen, clave afro, UK garage' },
  { id: 6, name: 'Pads mélodiques & chops', emoji: '🎹', desc: 'Gamme, basse et accords sur les pads' },
];

// ---------- Pads mélodiques ----------
const PENTA = [57, 60, 62, 64, 67, 69, 72, 74]; // La mineur pentatonique
const BASS = [45, 48, 50, 52, 55, 57, 60, 62];
const scalePads = (notes, preset) => notes.map((note, i) => ({ id: `n${i}`, note, preset }));
const gammePattern = events(32, [
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i * 2, `n${i}`]),
  ...[7, 6, 5, 4, 3, 2, 1, 0].map((i, k) => [16 + k * 2, `n${i}`]),
], PENTA.map((_, i) => `n${i}`));
const bassPattern = events(32, [
  [0, 'n0'], [3, 'n0'], [6, 'n1'], [8, 'n0'], [10, 'n4'], [14, 'n3'],
  [16, 'n0'], [19, 'n0'], [22, 'n2'], [24, 'n3'], [26, 'n4'], [28, 'n5'], [30, 'n4'],
], BASS.map((_, i) => `n${i}`));
const CHORDS = [
  { id: 'c0', name: 'Am7', notes: [57, 60, 64, 67] },
  { id: 'c1', name: 'Fmaj7', notes: [53, 57, 60, 64] },
  { id: 'c2', name: 'Dm7', notes: [50, 53, 57, 60] },
  { id: 'c3', name: 'Em7', notes: [52, 55, 59, 62] },
].map((c) => ({ ...c, preset: 'stab' }));
const tresillo = (bar, id) => [[bar * 16, id], [bar * 16 + 6, id], [bar * 16 + 12, id]];
const chopPattern = events(64, [...tresillo(0, 'c0'), ...tresillo(1, 'c1'), ...tresillo(2, 'c2'), ...tresillo(3, 'c3')], CHORDS.map((c) => c.id));

export const PAD_LEVELS = [
  // ---------- 1. Les bases ----------
  {
    id: 'otf', ch: 1, emoji: '🦶', title: 'Four on the floor', bpm: 100, repeat: 4, kit: 'club', pads: D('kick'),
    concept: 'Un kick sur chaque temps',
    intro: 'Le « four on the floor » (4 coups au sol) est la base de la house, de la techno et du disco : un kick sur chaque temps. Frappe le pad au moment où l’anneau se referme sur lui.',
    points: ['Un coup = un clic du métronome.', 'Frappe franchement, avec le bout du doigt, et relâche tout de suite.', 'Garde le poignet souple : c’est le doigt qui travaille.'],
    pattern: { kick: 'x...x...x...x...' },
    outro: 'Tu tiens la pulsation : tout le reste se construit autour. En club, ce kick régulier permet aux danseurs de toujours savoir où est le temps.',
    studio: 'Sur ton MPC, active le métronome et enregistre 4 mesures de kick en Note Repeat désactivé : vise des coups réguliers, puis regarde la grille.',
  },
  {
    id: 'backbeat', ch: 1, emoji: '👏', title: 'Le backbeat', bpm: 96, repeat: 4, kit: 'acoustic', pads: D('kick', 'snare'),
    concept: 'Kick sur 1 et 3, snare sur 2 et 4',
    intro: 'Le backbeat place la caisse claire sur les temps 2 et 4. C’est la colonne vertébrale du rock, de la pop, du hip-hop et du funk. Deux doigts : un pour le kick, un pour la snare.',
    points: ['Kick = temps 1 et 3, snare = temps 2 et 4.', 'Les deux ne tombent jamais ensemble : ils alternent.', 'Utilise deux doigts différents (index et majeur).'],
    pattern: { kick: 'x.......x.......', snare: '....x.......x...' },
    outro: 'Kick et snare forment le dialogue « boum – tchak » que l’oreille attend dans presque toute la musique populaire.',
    studio: 'Dans le Lab Beat ou sur le MPC : kick pas 1 et 9, snare pas 5 et 13 sur 16. Tu as la base de 90 % des morceaux.',
  },
  {
    id: 'hats8', ch: 1, emoji: '✋', title: 'Les hats en croches', bpm: 96, repeat: 4, kit: 'club', pads: D('kick', 'snare', 'hat'),
    concept: 'Indépendance : hats en croches + backbeat',
    intro: 'Les hats en croches ajoutent le mouvement : deux coups par temps. Une main (ou un doigt dédié) joue les hats en continu, l’autre le kick et la snare. C’est le premier exercice d’indépendance.',
    points: ['Hats : sur chaque temps et chaque « et ».', 'Kick et snare tombent en même temps qu’un hat : frappe les deux pads ensemble.', 'Commence en Apprentissage si la coordination résiste.'],
    pattern: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    outro: 'Tu viens de jouer un vrai beat complet à deux « mains ». L’indépendance (une main régulière, l’autre qui place) est la compétence n°1 du finger drumming.',
    studio: 'Enregistre ce beat en live sur le MPC sans quantisation, puis compare avec une version quantisée à 1/16 : laquelle groove le plus ?',
  },
  // ---------- 2. Grooves ----------
  {
    id: 'house', ch: 2, emoji: '🏠', title: 'Groove house', bpm: 122, repeat: 4, kit: 'club', pads: D('kick', 'clap', 'ohat'),
    concept: 'Open hat à contretemps',
    intro: 'La house ajoute au four on the floor un clap sur 2 et 4 et un hat ouvert sur les contretemps (les « et »). Ce hat entre les kicks crée le balancement « boum-tsss » caractéristique.',
    points: ['Open hat = entre deux kicks, jamais avec eux.', 'Clap avec le kick sur 2 et 4.', 'Écoute le « tsss » qui répond au « boum ».'],
    pattern: { kick: 'x...x...x...x...', clap: '....x.......x...', ohat: '..x...x...x...x.' },
    outro: 'Contretemps = tension entre les temps. C’est ce qui fait bouger la tête en house, en disco et en techno.',
    studio: 'Dans Live, Drum Rack 909 : kick 4/4, clap 2-4, open hat sur les pas 3, 7, 11, 15. Ajoute un sidechain (compresseur déclenché par le kick) sur les autres pistes pour pomper.',
  },
  {
    id: 'boombap', ch: 2, emoji: '🎤', title: 'Boom bap', bpm: 90, repeat: 4, kit: 'lofi', pads: D('kick', 'snare', 'hat'),
    concept: 'Kick syncopé du hip-hop 90s',
    intro: 'Le boom bap (hip-hop new-yorkais des années 90) garde la snare sur 2 et 4 mais déplace le kick : un coup juste avant le 3 (sur le « a » du 2) et un sur le « et » du 3. Le kick devient syncopé.',
    points: ['Kick : 1, le « a » du 2, le « et » du 3.', 'Snare lourde sur 2 et 4.', 'Joue « derrière le temps » : sans précipitation.'],
    pattern: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    outro: 'Déplacer un seul kick change tout le caractère du beat. La syncope du kick, c’est l’ADN du hip-hop.',
    studio: 'Sur le MPC, active un swing de 56-60 % sur ce beat : c’est le « feel » des MPC 60 et SP-1200 des classiques boom bap.',
  },
  {
    id: 'dembow', ch: 2, emoji: '🔥', title: 'Dembow (reggaeton)', bpm: 96, repeat: 4, kit: 'k808', pads: D('kick', 'snare', 'hat'),
    concept: 'Le rythme 3-3-2 du reggaeton',
    intro: 'Le dembow combine un kick sur chaque temps et une snare qui reprend le tresillo (3-3-2) : juste avant le 2, sur le « et » du 2, puis la même chose dans la 2e moitié de la mesure.',
    points: ['Kick régulier sur les 4 temps.', 'Snare : « a » du 1, « et » du 2, « a » du 3, « et » du 4.', 'Hats sur les contretemps pour remplir.'],
    pattern: { kick: 'x...x...x...x...', snare: '...x..x....x..x.', hat: '..x...x...x...x.' },
    outro: 'Le tresillo est partout : reggaeton, dancehall, afrobeats, moombahton. Une fois dans les doigts, tu le reconnaîtras dans des milliers de titres.',
    studio: 'Dans le Lab Beat, choisis le style Reggaeton et compare avec ton jeu. Sur le MPC, joue la snare avec un rim pour un son plus « perreo ».',
  },
  // ---------- 3. Dynamique ----------
  {
    id: 'accents', ch: 3, emoji: '💥', title: 'Accents sur les hats', bpm: 100, repeat: 4, kit: 'club', dyn: true, pads: D('kick', 'snare', 'hat'),
    concept: 'Vélocité : fort sur le temps, doux entre',
    intro: 'Tes pads sont sensibles à la vélocité (la force de frappe). Un hat joué fort sur les temps et doux entre les temps sonne humain ; tout à la même force sonne « machine ». Les grands anneaux = accents (fort).',
    points: ['Accent (gros anneau) = frappe franche.', 'Coup normal = plus léger, effleure le pad.', 'La dynamique est notée seulement avec un vrai pad MIDI (pas au clavier ni au tactile).'],
    pattern: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'X.x.X.x.X.x.X.x.' },
    outro: 'Un même rythme peut sonner mécanique ou vivant selon la vélocité. C’est la différence entre un beat programmé et un beat joué.',
    studio: 'Sur le MPC, désactive « Full Level » pour garder ta vélocité. Dans Live, l’outil « Velocity » ou le Groove Pool ajoute ces variations.',
  },
  {
    id: 'ghosts', ch: 3, emoji: '👻', title: 'Ghost notes funk', bpm: 92, repeat: 4, kit: 'acoustic', dyn: true, pads: D('kick', 'snare', 'hat'),
    concept: 'Ghost notes : la snare chuchotée',
    intro: 'Les ghost notes sont des coups de snare très doux, presque inaudibles, glissés entre les coups principaux. Elles font le groove du funk, de la neo soul et du hip-hop. Les petits anneaux pointillés = ghost (très doux).',
    points: ['Snare forte sur 2 et 4 (accents), ghost notes autour.', 'Une ghost note se frappe à peine : effleure le pad.', 'Si toutes les snares sont fortes, le groove disparaît.'],
    pattern: { kick: 'x.x.......x.....', snare: 'g...X..g.g..X..g', hat: 'x.x.x.x.x.x.x.x.' },
    outro: 'Les ghost notes remplissent l’espace sans l’encombrer : on les sent plus qu’on ne les entend. C’est la signature des batteurs funk.',
    studio: 'Dans Live, ajoute des snares à vélocité 30-45 entre tes coups principaux : ton beat respire immédiatement.',
  },
  // ---------- 4. Finger drumming ----------
  {
    id: 'hats16', ch: 4, emoji: '⚡', title: 'Hats en doubles croches', bpm: 100, repeat: 4, kit: 'club', dyn: true, pads: D('kick', 'snare', 'hat'),
    concept: 'Doubles croches : 4 coups par temps',
    intro: 'Quatre hats par temps : un seul doigt ne suit plus. Les finger drummers alternent deux doigts (index-majeur) sur le même pad, ou utilisent deux pads réglés sur le même son. Accent sur chaque temps.',
    points: ['Alterne deux doigts : droite-gauche-droite-gauche.', 'Accent sur le 1er hat de chaque temps.', 'Désactive « Roulements » dans les réglages pour une version en croches au tactile.'],
    pattern: { kick: 'x.......x.......', snare: '....x.......x...', hat: 'XxxxXxxxXxxxXxxx' },
    outro: 'L’alternance de doigts est la clé de la vitesse. La même technique sert pour les rolls de snare et les fills.',
    studio: 'Sur le MPC, essaie le même passage avec Note Repeat en 1/16 : compare la sensation avec ton jeu « à la main ».',
  },
  {
    id: 'trap', ch: 4, emoji: '🌀', title: 'Roulements trap', bpm: 140, res: 8, repeat: 2, kit: 'k808', pads: D('kick', 'snare', 'hat'),
    concept: 'Rolls de hats en 1/16 et 1/32 · half-time',
    intro: 'La trap se joue en « half-time » : à 140 BPM, la snare ne tombe que sur le 3e temps, ce qui donne une sensation lente. Les hats en croches accélèrent soudain en roulements de doubles et triples croches (1/16, 1/32) en fin de mesure.',
    points: ['Snare unique sur le temps 3 : c’est le half-time.', 'Fin de mesure 1 : roulement en doubles croches ; mesure 2 : en triples croches.', 'Alterne deux doigts pour les rolls, ou désactive les roulements au tactile.'],
    pattern: {
      kick: 'x...........x...........x.......|x.......x...........x...........',
      snare: '................x...............|................x...............',
      hat: 'x...x...x...x...x...x...x.x.x.x.|x...x...x...x...x...x...x...xxxx',
    },
    outro: 'Les rolls de hats sont l’ornement signature de la trap : ils relancent l’énergie juste avant la mesure suivante.',
    studio: 'Sur le MPC, Note Repeat + pression sur le pad : passe de 1/16 à 1/32 pendant que tu joues. Dans Live, dessine les rolls et varie leur vélocité.',
  },
  {
    id: 'fill', ch: 4, emoji: '🎆', title: 'Le fill de fin de phrase', bpm: 100, repeat: 1, kit: 'acoustic', pads: D('kick', 'snare', 'hat', 'tom', 'crash'),
    concept: 'Fill = transition vers la phrase suivante',
    intro: 'Un fill est un petit solo de batterie en fin de phrase (souvent la 4e ou la 8e mesure) qui annonce la suite. Trois mesures de groove, puis un fill snare → tom en doubles croches qui retombe… sur un crash.',
    points: ['Mesures 1-3 : groove régulier, crash au début.', 'Mesure 4 : snare puis toms en doubles croches.', 'Le fill annonce la suite : finis-le pile à temps.'],
    pattern: {
      kick: 'x.......x.......|x.......x.......|x.......x.......|x...............',
      snare: '....x.......x...|....x.......x...|....x.......x...|....xxxxxx......',
      hat: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.|x.x.............',
      tom: '................|................|................|..........xxxxx.',
      crash: 'x...............|................|................|................',
    },
    outro: 'Les fills structurent la musique : ils disent à l’auditeur « attention, ça change ». En électro, c’est le rôle des rolls de snare et des risers.',
    studio: 'Dans le Lab Arrangement, place un roulement de snare à la fin de chaque section : c’est le même rôle que ce fill.',
  },
  // ---------- 5. Breaks & percussions ----------
  {
    id: 'amen', ch: 5, emoji: '🌪️', title: 'Break DnB façon Amen', bpm: 160, repeat: 4, kit: 'acoustic', pads: D('kick', 'snare', 'hat'),
    concept: 'Breakbeat : snares syncopées rapides',
    intro: 'Le break « Amen » (1969) a été découpé et rejoué dans toute la jungle et la drum & bass. Ce niveau s’en inspire : kicks groupés, snares qui tombent à côté du temps, le tout très vite.',
    points: ['Kick : 1, « et » du 1, puis deux kicks collés au 3e temps.', 'Snare : 2, puis des coups décalés avant 3 et 4.', 'Commence en Facile (Mode libre) : 160 BPM, c’est rapide.'],
    pattern: { kick: 'x.x.......xx....', snare: '....x..x.x..x..x', hat: 'x.x.x.x.x.x.x.x.' },
    outro: 'Le breakbeat repose sur la syncope de la snare. Découper un break en tranches (chops) et les rejouer aux pads, c’est la naissance de la jungle.',
    studio: 'Importe un break dans un Simpler (mode Slice) ou un programme MPC « Chop » : chaque tranche sur un pad, puis rejoue-le dans un autre ordre.',
  },
  {
    id: 'afro', ch: 5, emoji: '🌍', title: 'Afro house & clave', bpm: 120, repeat: 2, kit: 'club', pads: D('kick', 'rim', 'shaker', 'conga'),
    concept: 'Clave 3-2 sur 2 mesures + percussions',
    intro: 'L’afro house superpose un kick régulier, une clave (rythme-guide sur 2 mesures : 3 coups puis 2), un shaker en doubles croches et des congas. Chaque percussion a sa place : ensemble elles créent la polyrythmie.',
    points: ['Rim = clave : 3 coups mesure 1, 2 coups mesure 2.', 'Shaker continu (roulements simplifiables au tactile).', 'Conga sur les « et » : elle répond au kick.'],
    pattern: {
      kick: 'x...x...x...x...|x...x...x...x...',
      rim: 'x.....x.....x...|....x...x.......',
      shaker: 'x.xxx.xxx.xxx.xx|x.xxx.xxx.xxx.xx',
      conga: '......x.......x.|......x...x...x.',
    },
    outro: 'Penser en cycles de 2 mesures (clave) plutôt qu’en mesure unique donne la profondeur des musiques afro et latines.',
    studio: 'Sur le MPC, mets chaque percussion sur un pad avec son propre swing léger ; dans Live, place-les sur des pistes séparées et décale-les de quelques ms.',
  },
  {
    id: 'garage', ch: 5, emoji: '🇬🇧', title: 'UK garage 2-step', bpm: 132, repeat: 4, kit: 'club', pads: D('kick', 'snare', 'hat', 'ohat'),
    concept: '2-step : kick qui saute un temps',
    intro: 'Le 2-step (UK garage) supprime des kicks du 4/4 : un kick sur le 1, un autre sur le « et » du 3. Avec les snares sur 2 et 4 et des hats syncopés, le groove « sautille ».',
    points: ['Kick : 1 et le « et » du 3, c’est tout.', 'Hats décalés entre les temps.', 'Open hat juste avant la snare du 4.'],
    pattern: { kick: 'x.........x.....', snare: '....x.......x...', hat: '..x...x.x.x.....', ohat: '..............x.' },
    outro: 'Enlever des coups crée autant de groove qu’en ajouter. Le 2-step a influencé le dubstep, la bass music et l’UK funky.',
    studio: 'Applique un swing de 60 % sur les hats uniquement (Live : Groove Pool sur la piste hats) : c’est le « shuffle » garage.',
  },
  // ---------- 6. Pads mélodiques ----------
  {
    id: 'gamme', ch: 6, emoji: '🎼', title: 'La gamme sur les pads', bpm: 96, repeat: 2, melodic: true, pads: scalePads(PENTA, 'pluck'),
    concept: 'Pentatonique de La mineur sur 8 pads',
    intro: 'Les pads peuvent jouer des notes ! Ici, 8 pads = la gamme pentatonique de La mineur (La-Do-Ré-Mi-Sol), du grave (en bas à gauche) vers l’aigu. On monte puis on redescend en croches.',
    points: ['Pad en bas à gauche = La (le plus grave).', 'On lit les pads comme un texte : de gauche à droite, de bas en haut.', 'La pentatonique n’a pas de fausse note : idéal pour improviser.'],
    pattern: gammePattern,
    outro: 'Sur un MPC, le mode « Pad Scale » ou « Chromatic » transforme les pads en clavier. Pratique pour trouver des mélodies sans connaître le piano.',
    studio: 'Sur le MPC Key 37, programme un synthé sur les pads en mode gamme La mineur et improvise sur ton beat : enregistre 8 mesures.',
  },
  {
    id: 'bassriff', ch: 6, emoji: '🎸', title: 'Riff de basse aux pads', bpm: 100, repeat: 2, melodic: true, pads: scalePads(BASS, 'moogbass'),
    concept: 'Basse syncopée sur 2 mesures',
    intro: 'Un riff de basse en La mineur joué aux pads : la fondamentale La revient souvent, avec des notes de passage (Do, Ré, Mi, Sol). Les syncopes (« a » du 1) donnent le groove.',
    points: ['La (pad 1) = point d’ancrage, joue-le franchement.', 'Mesure 2 : une montée La-Ré-Mi-Sol-La.', 'Écoute comment la basse répond au kick dans le Lab Beat.'],
    pattern: bassPattern,
    outro: 'Une bonne basse revient régulièrement à la fondamentale et utilise les syncopes. Les pads rendent ces riffs très physiques.',
    studio: 'Dans le Labo de basse, recopie ce riff : l’app le critiquera et proposera des variantes. Serum 2 : preset basse Moog (filtre 24 dB, glide léger).',
  },
  {
    id: 'chops', ch: 6, emoji: '✂️', title: 'Chops d’accords house', bpm: 120, repeat: 2, melodic: true, pads: CHORDS,
    concept: 'Un accord par pad, en tresillo',
    intro: 'Comme avec un sample d’accords découpé (chop), chaque pad déclenche un accord entier : Am7, Fmaj7, Dm7, Em7. Une mesure par accord, en rythme tresillo (3-3-2) façon piano house.',
    points: ['1 pad = 1 accord : la main gauche ne bouge presque pas.', 'Rythme : 1, « et » du 2, 4 (tresillo).', 'Accords de 7e = couleur deep house.'],
    pattern: chopPattern,
    outro: 'Découper un accord ou un sample et le rejouer aux pads est la technique de base du MPC : c’est ainsi que naissent les grooves de house et de hip-hop.',
    studio: 'Sur le MPC : Sample Edit → Chop → « Threshold » ou « Regions », puis « Convert to Keygroup / Program » ; joue les tranches en tresillo.',
  },
  {
    id: 'final', ch: 6, emoji: '🏆', title: 'Final : jam house complète', bpm: 124, repeat: 2, kit: 'club', dyn: true, pads: D('kick', 'clap', 'hat', 'rim'),
    concept: 'Groove + dynamique + roulement de clap',
    intro: 'Tout réuni sur 4 mesures : four on the floor, clap sur 2 et 4, hats accentués à contretemps (doux sur le temps), rim syncopé, et un roulement de clap en doubles croches pour finir la phrase.',
    points: ['Hats : ghost sur le temps, accent à contretemps.', 'Mesure 4 : roulement de clap sur le dernier temps.', 'Vise les 3 étoiles en Normal, puis en Difficile.'],
    pattern: {
      kick: 'x...x...x...x...|x...x...x...x...|x...x...x...x...|x...x...x.......',
      clap: '....x.......x...|....x.......x...|....x.......x...|....x.......xxxx',
      hat: 'g.X.g.X.g.X.g.X.|g.X.g.X.g.X.g.X.|g.X.g.X.g.X.g.X.|g.X.g.X.g.X.....',
      rim: '......x.......x.|......x.......x.|......x.......x.|......x.........',
    },
    outro: 'Bravo, tu as terminé le parcours ! Pulsation, styles, dynamique, roulements, breaks, pads mélodiques : tu as les bases du finger drumming. Le Mode libre et le Défi à l’oreille t’attendent.',
    studio: 'Enregistre cette jam en live sur le MPC Key 37, exporte la piste en MIDI vers Live et compare avec la version « Pad Rush ».',
  },
];

export const padLevelById = (id) => PAD_LEVELS.find((l) => l.id === id);
export const padChapterOf = (l) => PAD_CHAPTERS.find((c) => c.id === l.ch);
