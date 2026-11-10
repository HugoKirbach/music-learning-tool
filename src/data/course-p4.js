// Parcours, partie 5 : produire un morceau dans Live — effets, arrangement, mixage, export et workflow de pro.
import { card, Q, P, O, B, N, L, G, gen, unit, lesson, lab, studio, drums } from './coursekit.js';

const LOOP = { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' };
const PADLOOP = { p: 'supersaw', notes: [[57, 0, 3.8], [60, 0, 3.8], [64, 0, 3.8]] };

export const U15 = unit('u15', {
  part: 5, title: 'Effets et chaîne de traitement', emoji: '🎛️', color: '#fb7185', skill: 'sound',
  goal: 'Construire une chaîne d’effets : ordre du signal, inserts et envois, EQ, compression et sidechain, reverb, delay, racks.',
  guide: [
    ['Chaîne', 'MIDI Effects → Instrument → Audio Effects, de gauche à droite. L’ordre change le son.'],
    ['Insert / envoi', 'Insert : sur la piste. Envoi : une piste de retour (reverb, delay) partagée via les Sends.'],
    ['EQ', 'Couper plutôt que booster. Low cut sur tout ce qui n’est ni kick ni basse. Boue vers 200-400 Hz.'],
    ['Compression', 'Threshold, Ratio, Attack, Release. Sidechain : le kick fait baisser la basse ou les pads.'],
    ['Racks', 'Ctrl/Cmd+G regroupe des devices ; les macros pilotent plusieurs paramètres à la fois.'],
  ],
}, [
  lesson('l1', 'La chaîne de devices', '⛓️', [
    card('Le signal circule de gauche à droite', ['Sur une piste MIDI : MIDI Effects → Instrument → Audio Effects, dans la vue Device.', 'L’ordre compte : une reverb avant ou après une distorsion, ce n’est pas le même son.', 'Glisse un effet depuis le navigateur dans la zone de dépôt.'], { visual: { k: 'chain', items: ['Arpeggiator', 'Drift', 'EQ Eight', 'Compressor', 'Reverb'] } }),
    O('Remets la chaîne dans l’ordre du signal', ['Arpeggiator (MIDI Effect)', 'Drift (instrument)', 'EQ Eight', 'Compressor', 'Reverb']),
    L('Où déposes-tu un nouvel effet ?', 'drop-zone', ['device']),
    L('Où est l’égaliseur de la piste ?', 'eq', ['device']),
    Q('Un MIDI Effect se place…', ['Avant l’instrument : il transforme les notes', 'Après l’instrument', 'Sur la piste Main']),
  ]),
  lesson('l2', 'Insert ou envoi', '↪️', [
    card('Deux façons d’ajouter un effet', ['En insert : l’effet est sur la piste et traite tout son son (EQ, compresseur, saturation).', 'En envoi : une piste de retour (A-Reverb) reçoit un peu de chaque piste via ses Sends. Une seule reverb pour tout le morceau : cohérent et léger.', 'Sur une piste de retour, l’effet est réglé à 100 % « wet ».'], { visual: { k: 'live', show: ['session'], hl: 'sends' } }),
    L('Envoie un peu de cette piste vers la reverb', 'sends', ['session']),
    L('Où est la piste de retour ?', 'return-track', ['session']),
    gen('shortcut', { ids: ['returnTrack'], n: 1 }),
    Q('Pourquoi mettre la reverb sur une piste de retour ?', ['Une seule reverb partagée : son cohérent et moins de calcul', 'C’est obligatoire', 'Pour qu’elle soit plus forte']),
  ]),
  lesson('l3', 'L’égaliseur', '📊', [
    card('EQ Eight', ['L’EQ monte ou baisse des zones de fréquences.', 'Grave 20-100 Hz (sub, kick). Bas-médium 200-500 Hz (boue, chaleur). Médium 1-5 kHz (présence, agressivité). Aigu 8 kHz et plus (air).', 'Règle d’or : couper plutôt que booster, et retirer les graves inutiles (low cut) sur tout ce qui n’est ni kick ni basse.'], { visual: { k: 'eq', fault: 'mud', guide: true } }),
    P('Associe la zone à la sensation', [['40-80 Hz', 'Le poids du sub'], ['200-400 Hz', 'La boue'], ['2-5 kHz', 'La présence, l’agressivité'], ['10 kHz et +', 'L’air']]),
    Q('Ce mix sonne boueux (voir le spectre). Où couper ?', ['Vers 200-400 Hz', 'Vers 10 kHz', 'Vers 40 Hz'], 'La bosse dans le bas-médium : c’est la boue.', { visual: { k: 'eq', fault: 'mud', guide: true } }),
    Q('Et celui-ci est agressif. Où creuser ?', ['Vers 3-5 kHz', 'Vers 60 Hz', 'Vers 300 Hz'], null, { visual: { k: 'eq', fault: 'harsh', guide: true } }),
    Q('Sur une piste de pad, un réflexe de nettoyage ?', ['Couper les graves sous 150 Hz environ (low cut)', 'Booster 60 Hz', 'Monter le volume']),
  ]),
  lesson('l4', 'Compression et sidechain', '🗜️', [
    card('Le compresseur', ['Il baisse le volume quand le son dépasse un seuil (Threshold), d’autant plus que le Ratio est élevé.', 'Attack : vitesse de réaction. Release : vitesse de relâchement.', 'Sidechain : le compresseur de la basse « écoute » le kick → la basse s’efface à chaque kick : la pompe.'], { demo: [{ label: '▶ Sans sidechain', play: drums(LOOP, { bpm: 124, pad: PADLOOP }) }, { label: '▶ Avec sidechain', play: drums(LOOP, { bpm: 124, pad: PADLOOP, pump: 0.9 }) }] }),
    B('Le compresseur réduit le volume au-dessus du [seuil], selon un [ratio].', ['tempo', 'cutoff', 'release']),
    Q('Écoute A puis B : lequel « pompe » avec le kick ?', ['B', 'A'], 'Le sidechain creuse le pad à chaque kick.', { plays: [{ label: 'A', play: drums(LOOP, { bpm: 124, pad: PADLOOP }) }, { label: 'B', play: drums(LOOP, { bpm: 124, pad: PADLOOP, pump: 0.9 }) }] }),
    Q('Pour le sidechain, quel signal déclenche le compresseur de la basse ?', ['Le kick', 'La basse elle-même', 'La reverb']),
    L('Où est le compresseur ?', 'compressor', ['device']),
  ]),
  lesson('l5', 'Reverb, delay, saturation', '🌌', [
    card('Espace et couleur', ['Reverb : l’espace (pièce, salle, cathédrale). Courte sur les percus, longue sur les pads.', 'Delay : des échos en rythme (1/8 pointé, 1/4).', 'Saturator : de la chaleur et des harmoniques. Utility : gain, mono, largeur.']),
    P('Associe l’effet à son usage', [['Reverb', 'L’espace'], ['Delay', 'Des échos en rythme'], ['Saturator', 'Chaleur, harmoniques'], ['Auto Filter', 'Balayage du filtre'], ['Utility', 'Gain, mono, largeur']]),
    gen('calc', { kinds: ['eighthMs', 'dottedMs'], n: 2 }),
    Q('Tu veux que le grave de ta basse reste mono. Quel device ?', ['Utility (Bass Mono)', 'Reverb', 'Chorus-Ensemble']),
  ]),
  lesson('l6', 'Racks et macros', '🧩', [
    card('Ranger et piloter', ['Sélectionne plusieurs devices et fais Ctrl/Cmd+G : ils deviennent un Rack.', 'Les macros pilotent plusieurs paramètres d’un coup : « Sombre → Brillant » qui ouvre le filtre et ajoute de la reverb en même temps.', 'Sauve le Rack dans ta User Library : c’est ton propre preset.']),
    gen('shortcut', { ids: ['group'], n: 1 }),
    L('Où sont les macros ?', 'macros', ['device']),
    Q('Une macro peut piloter…', ['Plusieurs paramètres à la fois', 'Un seul paramètre', 'Seulement le volume']),
  ]),
  lab('lab-mix', 'Mixdown express', '🎚️', '#/mixdown', { log: 'mix:' }, 'Une boucle mal mixée : corrige-la avec la console et compare avec la référence.'),
  studio('st', 'Ta chaîne d’effets', '⛓️', [
    'Sur ta piste de pad : EQ Eight, low cut vers 150 Hz.',
    'Crée une piste de retour Reverb (Ctrl/Cmd+Alt+T) et envoie-y un peu de pad et de lead.',
    'Mets un Compressor sur la basse, sidechain sur la piste du kick : règle-le jusqu’à entendre la pompe.',
    'Groupe EQ + Compressor de la basse dans un Rack (Ctrl/Cmd+G) et sauve-le.',
  ], 'Une chaîne propre et sauvegardée, c’est du temps gagné sur chaque nouveau morceau.'),
]);

export const U16 = unit('u16', {
  part: 5, title: 'L’arrangement', emoji: '🧱', color: '#f97316', skill: 'autonomie',
  goal: 'Transformer une boucle en morceau : vue Arrangement, sections, automatisation, transitions et méthode soustractive.',
  guide: [
    ['Vue Arrangement', 'La ligne du temps. Enregistre ta Session dedans, coupe (Ctrl/Cmd+E), duplique, boucle (Ctrl/Cmd+L).'],
    ['Sections', 'Intro, build, drop, break, outro, par blocs de 8, 16 ou 32 mesures.'],
    ['Automatisation', 'Touche A pour l’afficher, B pour dessiner, Automation Arm pour enregistrer les mouvements.'],
    ['Transitions', 'Roulement de snare qui accélère, riser, filtre qui monte, un temps de silence, crash sur le drop.'],
    ['Soustraire', 'Une boucle complète, dupliquée sur toute la durée, puis on retire des éléments section par section.'],
  ],
}, [
  lesson('l1', 'La vue Arrangement', '📜', [
    card('La ligne du temps', ['De gauche à droite : le morceau. Les en-têtes de pistes sont à droite.', 'La loop brace (au-dessus de la règle) délimite la zone qui boucle ; les locators marquent les sections.', 'Pour passer de la Session à l’Arrangement : active l’enregistrement Arrangement et lance tes scènes, Live enregistre ta performance.'], { visual: { k: 'live', show: ['arrangement'] } }),
    gen('where', { zones: ['loop-brace', 'arr-clip', 'ruler', 'locator', 'automation-lane', 'arr-header'], n: 4, show: ['arrangement'] }),
    gen('shortcut', { ids: ['loopSel', 'split', 'insertSilence'], n: 2 }),
    Q('Comment passer tes clips de la Session à l’Arrangement ?', ['Activer l’enregistrement Arrangement puis lancer clips et scènes : Live enregistre ta performance', 'Les recopier note par note', 'C’est impossible']),
  ]),
  lesson('l2', 'Les sections d’un morceau', '🏗️', [
    card('Une structure lisible', ['Intro (16-32 mesures, pour que le DJ mixe), build (la montée), drop (l’énergie maximale), break (on respire), puis outro.', 'Tout se compte en blocs de 8 : les changements arrivent toujours sur le 1 d’un bloc.'], { visual: { k: 'energy', zones: [{ name: 'Intro', e: 0.35 }, { name: 'Build', e: 0.6 }, { name: 'Drop', e: 1 }, { name: 'Break', e: 0.3 }, { name: 'Drop', e: 1 }, { name: 'Outro', e: 0.3 }] } }),
    O('Remets dans l’ordre un morceau club classique', ['Intro', 'Build', 'Drop', 'Break', 'Build', 'Drop', 'Outro']),
    Q('Sur cette courbe d’énergie, quelle zone est le drop ?', ['C', 'A', 'B', 'D'], null, { visual: { k: 'energy', zones: [{ name: 'A', e: 0.3 }, { name: 'B', e: 0.6 }, { name: 'C', e: 1 }, { name: 'D', e: 0.35 }], letters: true } }),
    Q('Une intro club dure souvent…', ['16 ou 32 mesures : de quoi mixer pour le DJ', '1 mesure', '3 mesures']),
    N('Une section de 16 mesures à 128 BPM dure combien de secondes ?', 30, { tol: 0.5, unit: 's', explain: '16 × 4 = 64 temps ; 64 × 60 ÷ 128 = 30 s.' }),
  ]),
  lesson('l3', 'L’automatisation', '〰️', [
    card('Faire bouger les réglages', ['La touche A affiche les couloirs d’automatisation ; B pour dessiner une courbe.', 'Ou active Automation Arm et tourne les potards pendant la lecture : Live enregistre tes mouvements.', 'Classiques : un filtre qui s’ouvre, une reverb qui grandit avant le drop, un volume qui monte.'], { visual: { k: 'live', show: ['arrangement'], hl: 'automation-lane' } }),
    gen('shortcut', { ids: ['automation', 'draw'], n: 2 }),
    L('Où vois-tu la courbe d’automatisation ?', 'automation-lane', ['arrangement']),
    L('Pour enregistrer tes mouvements de potards ?', 'automation-arm', ['control']),
    Q('Que faut-il automatiser pour une montée ?', ['Un cutoff qui s’ouvre, une reverb qui grandit, un riser qui monte', 'Le tempo jusqu’à 0', 'Le nom de la piste']),
  ]),
  lesson('l4', 'Les transitions', '🚀', [
    card('Préparer le drop', ['Un roulement de snare qui accélère : noires → croches → doubles croches.', 'Un riser (bruit filtré qui monte), un passe-haut qui grimpe sur tout le mix.', 'Un temps de silence juste avant le drop, puis crash + kick sur le 1.'], { demo: [{ label: '▶ Roulement', play: drums({ snare: 'x...x...x.x.xxxx' }, { bpm: 128, bars: 2, kit: 'club' }) }] }),
    G('Écris le roulement : snare en noires (pas 1, 5), en croches (9, 11), puis en doubles croches (13 à 16)', { rows: ['snare'], target: { snare: 'x...x...x.x.xxxx' }, bpm: 128 }),
    O('Une montée de 8 mesures, dans l’ordre', ['Snare en noires', 'Snare en croches', 'Snare en doubles croches + riser', 'Un temps de silence', 'Drop : crash + kick']),
    Q('Couper tout pendant un temps juste avant le drop sert à…', ['Créer un appel d’air : le drop frappe plus fort', 'Économiser le processeur', 'Changer de tempo']),
  ]),
  lesson('l5', 'Arranger en soustrayant', '➖', [
    card('La méthode soustractive', ['Construis une boucle de 8 mesures où TOUT joue.', 'Duplique-la sur toute la durée du morceau, place des locators (Intro, Drop…).', 'Puis retire des éléments section par section : c’est plus facile d’enlever que d’inventer.']),
    O('Dans l’ordre', ['Boucle complète de 8 mesures', 'Dupliquer sur toute la durée', 'Placer des locators', 'Retirer des éléments par section', 'Ajouter transitions et automatisations']),
    Q('Dans un break, on retire souvent…', ['Le kick et la basse', 'Tout sauf le kick', 'Rien du tout']),
    L('Où places-tu un repère « Drop » ?', 'locator', ['arrangement']),
  ]),
  lab('lab-arr', 'Lab Arrangement', '🧱', '#/arrange?challenge=structure', { log: 'arr:' }, 'Ta boucle devient un morceau de 64 mesures : réussis le défi « structure complète ».'),
  studio('st', 'Ta boucle devient un morceau', '🧱', [
    'Dans la Session, prépare 3 scènes : intro (kick + hats), drop (tout), break (pad + lead).',
    'Active l’enregistrement Arrangement et lance les scènes dans l’ordre en jouant le morceau.',
    'Dans l’Arrangement, place des locators : Intro, Build, Drop, Break, Drop 2, Outro.',
    'Automatise un Auto Filter sur le build (8 mesures) et ajoute un roulement de snare.',
    'Écoute tout d’une traite : note 3 choses à améliorer.',
  ], 'Un morceau fini, même imparfait, t’apprend plus que dix boucles parfaites.'),
]);

export const U17 = unit('u17', {
  part: 5, title: 'Mixage et export', emoji: '🎚️', color: '#e879f9', skill: 'autonomie',
  goal: 'Équilibrer, préparer le master et exporter : gain staging, balance, stéréo, limiteur, LUFS, export audio et stems.',
  guide: [
    ['Gain staging', 'De la marge : pics vers −6 dB sur Main avant le mastering. Utility pour le gain.'],
    ['Balance', 'Commence par kick et basse. Grave au centre, hats et percus un peu sur les côtés.'],
    ['Master', 'Limiteur en dernier sur Main, plafond −1 dB. Environ −14 LUFS pour le streaming, plus fort en club.'],
    ['Export', 'Ctrl/Cmd+Shift+R : WAV 24 bits. « All Individual Tracks » pour les stems.'],
  ],
}, [
  lesson('l1', 'Le gain staging', '📶', [
    card('Garder de la marge', ['Chaque piste ne doit pas saturer, et la piste Main doit garder de la place : des pics vers −6 dB avant le mastering.', 'Pour baisser le niveau d’un son sans toucher au fader : Utility (Gain).', 'Un mix qui sonne bien fort est souvent un mix bien équilibré… à bas volume.']),
    Q('Sur la piste Main, avant le mastering, les pics devraient rester…', ['Vers −6 dB', 'À +3 dB', 'Dans le rouge']),
    Q('Quel device pour baisser le gain sans toucher au fader ?', ['Utility', 'Reverb', 'Auto Pan']),
    L('Où est le volume de la piste ?', 'volume', ['session']),
    Q('Le premier élément à régler dans un mix électro ?', ['Le kick (et la basse)', 'Les hats', 'La reverb']),
  ]),
  lesson('l2', 'Balance et stéréo', '⚖️', [
    card('Chaque son à sa place', ['Commence par le kick et la basse, puis ajoute le reste autour.', 'Tout ce qui est grave reste au centre (mono).', 'Hats, percussions, pads : un peu sur les côtés pour faire de la place au centre.']),
    P('Où placer chaque élément ?', [['Kick', 'Au centre'], ['Basse', 'Au centre, en mono'], ['Lead', 'Au centre ou presque'], ['Hats', 'Un peu sur le côté'], ['Pad', 'Large']]),
    L('Où règles-tu la position gauche-droite ?', 'pan', ['session']),
    Q('Ton mix sonne bien en stéréo mais la basse disparaît en mono. Cause probable ?', ['Une basse trop large (unison, chorus) qui s’annule en mono', 'Un tempo trop rapide', 'Un kick trop court']),
  ]),
  lesson('l3', 'Le master et le limiteur', '🧱', [
    card('La dernière étape', ['Sur la piste Main, en dernier : un Limiter, plafond à −1 dB.', 'Il permet de monter le niveau sans jamais dépasser 0 dB.', 'Le volume perçu se mesure en LUFS : environ −14 pour le streaming, −6 à −9 pour le club.']),
    O('Une chaîne de master simple, dans l’ordre', ['EQ Eight', 'Glue Compressor', 'Saturator', 'Limiter']),
    Q('Où place-t-on le Limiter ?', ['En dernier, sur la piste Main', 'Au début de chaque piste', 'Sur la piste de retour']),
    Q('Les plateformes de streaming visent environ…', ['−14 LUFS', '0 LUFS', '−40 LUFS']),
  ]),
  lesson('l4', 'Exporter', '📦', [
    card('Sortir le morceau de Live', ['Ctrl/Cmd+Maj+R : Export Audio/Video.', 'WAV, 24 bits, 44,1 ou 48 kHz pour le master. Choisis la portion (Render Start / Length).', 'Rendered Track : « Main » pour le morceau, « All Individual Tracks » pour les pistes séparées (stems), « Selected Tracks Only » pour quelques pistes. Pour le MIDI : Ctrl/Cmd+Maj+E (Export MIDI File).']),
    gen('shortcut', { ids: ['export', 'save'], n: 2 }),
    O('Exporter ton morceau', ['Sélectionner la piste Main', 'Ctrl/Cmd+Shift+R', 'Choisir WAV 24 bits', 'Régler le début et la longueur', 'Exporter']),
    Q('Pour envoyer les pistes séparées à un ami ou un ingé son ?', ['Exporter « All Individual Tracks » (stems)', 'Exporter seulement le Main', 'Envoyer le fichier .als seul']),
    Q('Quel format pour un master de qualité ?', ['WAV 24 bits', 'MP3 128 kbps', 'MIDI']),
  ]),
  lab('lab-critique', 'Critique de ma prod', '🩺', '#/critique', { log: 'critique' }, 'Importe ton export Live : niveau, dynamique, équilibre, et les 3 actions prioritaires.'),
  lab('lab-export', 'Exporter ton idée en MIDI', '📦', '#/create', { exports: true }, 'Exporte ton idée en MIDI ou en Pack Live (mini-lecteur) et ouvre-la dans Ableton.'),
  studio('st', 'Exporte ton premier morceau', '📦', [
    'Coupe le Limiter du Main : vérifie que les pics restent vers −6 dB, baisse les pistes si besoin.',
    'Écoute en mono quelques secondes (Utility sur Main, Width 0) : la basse doit rester là.',
    'Remets le Limiter, plafond −1 dB.',
    'Ctrl/Cmd+Shift+R : WAV 24 bits, tout le morceau.',
    'Écoute l’export sur ton téléphone et dans une voiture si possible : note ce qui change.',
  ], 'Écouter sur plusieurs systèmes révèle ce que ton casque cache.'),
]);

export const U18 = unit('u18', {
  part: 5, title: 'Le workflow de pro', emoji: '🚀', color: '#fbbf24', skill: 'autonomie', final: true,
  goal: 'Travailler vite et finir : warping, resampling, freeze, raccourcis, groove et habitudes de producteur.',
  guide: [
    ['Warp', 'Cale un sample sur le tempo. Beats : batterie. Complex : mix complet. Tones : voix, instrument seul. Re-Pitch : comme un vinyle.'],
    ['Freeze / Flatten', 'Freeze calcule l’audio d’une piste pour soulager le processeur ; Flatten la transforme en audio.'],
    ['Resampling', 'Une piste audio avec l’entrée « Resampling » enregistre ce que sort Live : idéal pour créer des sons.'],
    ['Groove Pool', 'Les grooves (.agr) du navigateur s’appliquent à tes clips ; le Groove Pool (Ctrl/Cmd+Alt+6) règle leur dosage.'],
    ['Finir', 'Un modèle de set, une deadline, une référence, et on exporte même imparfait.'],
  ],
}, [
  lesson('l1', 'L’audio et le warping', '🎧', [
    card('Caler un sample au tempo', ['Le Warp étire l’audio pour qu’il suive le tempo du set, sans changer sa hauteur.', 'Des marqueurs (warp markers) calent les temps forts au bon endroit.', 'Six modes : Beats pour la batterie, Tones pour une voix ou un instrument seul, Texture pour les nappes et sons sans hauteur nette, Re-Pitch pour un effet vinyle, Complex et Complex Pro pour un morceau complet.']),
    P('Associe le mode de warp à son usage', [['Beats', 'Boucles de batterie'], ['Complex', 'Morceau complet'], ['Tones', 'Voix, instrument seul'], ['Re-Pitch', 'Effet vinyle (hauteur + vitesse)']]),
    Q('Tu accélères un sample en mode Re-Pitch. Que se passe-t-il ?', ['Il devient plus aigu, comme un vinyle accéléré', 'Sa hauteur ne change pas', 'Il s’arrête']),
  ]),
  lesson('l2', 'Resampling, freeze, flatten', '🧊', [
    card('Transformer en audio', ['Freeze : Live calcule l’audio de la piste pour soulager le processeur (clic droit › Freeze Track).', 'Flatten : la piste gelée devient définitivement de l’audio, à découper et retravailler.', 'Resampling : une piste audio dont l’entrée est « Resampling » enregistre la sortie de Live.']),
    Q('Ton ordinateur rame à cause de trois instances de Serum 2. Premier réflexe ?', ['Freeze des pistes terminées', 'Supprimer les pistes', 'Baisser le tempo']),
    Q('Pour découper et inverser le son d’un synthé comme un sample ?', ['Freeze puis Flatten (ou resampling)', 'Quantifier', 'Changer la signature']),
    Q('Une piste audio avec l’entrée « Resampling » enregistre…', ['Tout ce que Live joue', 'Seulement le micro', 'Le métronome']),
  ]),
  lesson('l3', 'Raccourcis de pro', '⚡', [
    card('Les mains sur le clavier', ['Les producteurs rapides utilisent une vingtaine de raccourcis, pas plus.', 'Tu en connais déjà beaucoup : on révise tout d’un coup.']),
    gen('shortcut', { n: 4 }),
    gen('shortcut', { n: 3, reverse: true }),
  ]),
  lesson('l4', 'Groove et humanisation', '🌀', [
    card('Rendre le MIDI vivant', ['Les grooves sont des fichiers .agr du navigateur : glisse-en un sur un clip pour lui donner du swing, puis règle-le dans le Groove Pool (Ctrl/Cmd+Alt+6).', 'Varie les vélocités, décale très légèrement certaines notes, ajoute des ghost notes.', 'Live 12 : le panneau Transform du clip propose des outils pour varier la vélocité et le timing.']),
    Q('Le swing décale…', ['Les notes paires (les contretemps) légèrement en retard', 'Toutes les notes en avance', 'Le tempo du morceau']),
    Q('Où trouves-tu les grooves de Live ?', ['Dans le navigateur (fichiers .agr), puis dans le Groove Pool pour les régler', 'Dans les réglages (Settings)', 'Dans le Limiter']),
    G('Humanise ces hats : coups forts sur les temps, ghost notes sur les doubles croches entre', { rows: ['kick', 'hat'], target: { kick: 'x...x...x...x...', hat: 'xgggxgggxgggxggg' }, start: { kick: 'x...x...x...x...', hat: 'xxxxxxxxxxxxxxxx' }, vel: true, bpm: 118 }),
  ]),
  lesson('l5', 'Finir ses morceaux', '🏁', [
    card('Les habitudes qui font finir', ['Un modèle de set (template) avec tes pistes, tes retours et ta chaîne de master : tu démarres en 10 secondes.', 'Une deadline courte, une référence à côté (un morceau que tu aimes), et tu exportes même imparfait.', 'Nomme et colore tes pistes, sauve souvent (Ctrl/Cmd+S).']),
    O('Une session efficace, dans l’ordre', ['Ouvrir son template', 'Trouver la boucle (8 mesures)', 'Arranger en soustrayant', 'Mixer avec une référence', 'Exporter']),
    Q('Tu bloques depuis une heure sur un son de kick. Le meilleur réflexe ?', ['Garder un kick « assez bien » et avancer sur le reste', 'Recommencer le morceau', 'Changer de logiciel']),
    Q('À quoi sert un morceau de référence ?', ['Comparer ton équilibre et ton niveau à un mix pro', 'Copier ses notes', 'Régler le tempo']),
  ]),
  lab('lab-project', 'Projet de la semaine', '🏁', '#/project', { log: 'project:' }, 'Un morceau construit un peu chaque jour, exporté vers Live le dimanche.'),
  studio('st', 'Ton morceau de A à Z', '🎓', [
    'Crée ton template : pistes Drums, Bass, Chords, Lead, retours Reverb et Delay, Limiter sur Main. Sauve-le comme set par défaut.',
    'Trouve une boucle de 8 mesures en 30 minutes maximum : beat, basse, accords, hook.',
    'Arrange-la en soustrayant : intro, build, drop, break, drop, outro.',
    'Mixe avec une référence, kick et basse d’abord.',
    'Exporte en WAV 24 bits et fais-le écouter à quelqu’un.',
  ], 'Tu as tout appris : maintenant, la seule façon de progresser est de finir des morceaux, encore et encore.'),
]);
