// Ableton Live 12 : zones de la maquette cliquable (exercices « Où cliques-tu ? ») et raccourcis clavier.
// Raccourcis vérifiés dans le manuel officiel : https://www.ableton.com/en/live-manual/12/live-keyboard-shortcuts/
// Module pur : utilisé par le parcours (src/data/course.js) et par la maquette (src/learn/livemock.js).

/** Zones de l'interface : nom affiché dans la correction + explication courte. */
export const LIVE_ZONES = {
  // Barre de contrôle
  'view-switch': { name: 'Sélecteur de vue', part: 'control', desc: 'Les deux boutons en haut à droite basculent entre la vue Session (grille) et la vue Arrangement (ligne du temps). Raccourci : Tab.' },
  tap: { name: 'Bouton TAP', part: 'control', desc: 'Tape-le en rythme : Live calcule le tempo.' },
  tempo: { name: 'Tempo', part: 'control', desc: 'Le tempo du set en BPM : glisse vers le haut/bas ou double-clique pour taper une valeur.' },
  timesig: { name: 'Signature rythmique', part: 'control', desc: '4/4 par défaut : 4 temps par mesure.' },
  metronome: { name: 'Métronome', part: 'control', desc: 'Active le clic. Le menu juste à côté règle le décompte (Count-In) avant l’enregistrement.' },
  quantize: { name: 'Quantification globale', part: 'control', desc: '« 1 Bar » : un clip lancé démarre au début de la mesure suivante, toujours en rythme.' },
  play: { name: 'Lecture', part: 'control', desc: 'Lance la lecture (barre d’espace).' },
  stop: { name: 'Stop', part: 'control', desc: 'Arrête la lecture. Deux fois : retour au début.' },
  rec: { name: 'Enregistrement Arrangement', part: 'control', desc: 'Le rond : enregistre dans la vue Arrangement (F9). Pendant que tu lances des clips en Session, il « filme » ta performance.' },
  overdub: { name: 'MIDI Arrangement Overdub', part: 'control', desc: 'Le « + » : ajoute les nouvelles notes par-dessus celles du clip au lieu de les remplacer.' },
  'automation-arm': { name: 'Automation Arm', part: 'control', desc: 'Enregistre les mouvements de potards (filtre, volume…) comme automatisation.' },
  capture: { name: 'Capture MIDI', part: 'control', desc: 'Récupère ce que tu viens de jouer sur une piste armée, même sans avoir appuyé sur Rec. Pas de raccourci par défaut : c’est ce bouton (tu peux lui en assigner un en Key Map).' },
  'session-rec': { name: 'Session Record', part: 'control', desc: 'Enregistre dans le slot sélectionné de la vue Session (et boucle en overdub). Raccourci : Ctrl/Cmd+Maj+F9.' },
  loop: { name: 'Loop', part: 'control', desc: 'Active la boucle de l’Arrangement (entre les crochets de la loop brace).' },
  draw: { name: 'Mode dessin', part: 'control', desc: 'Le crayon : cliquer dessine des notes ou de l’automatisation (touche B).' },
  'key-map': { name: 'Key Map', part: 'control', desc: 'Mode d’assignation des touches de l’ordinateur (Ctrl/Cmd+K).' },
  'midi-map': { name: 'MIDI Map', part: 'control', desc: 'Mode d’assignation de ton contrôleur : clique un paramètre puis tourne un potard (Ctrl/Cmd+M).' },
  cpu: { name: 'Charge CPU', part: 'control', desc: 'La charge du processeur. Trop haut : freeze des pistes.' },
  // Navigateur
  'br-search': { name: 'Recherche du navigateur', part: 'browser', desc: 'Tape un nom (Ctrl/Cmd+F) : sons, effets, samples.' },
  'br-sounds': { name: 'Sounds', part: 'browser', desc: 'Presets d’instruments classés par type de son (Bass, Pad, Lead…).' },
  'br-drums': { name: 'Drums', part: 'browser', desc: 'Kits de batterie prêts (Drum Racks) et sons de batterie.' },
  'br-instruments': { name: 'Instruments', part: 'browser', desc: 'Les instruments de Live : Drift, Simpler, Drum Rack dans toutes les éditions ; Wavetable, Operator… dans Suite.' },
  'br-audiofx': { name: 'Audio Effects', part: 'browser', desc: 'EQ Eight, Compressor, Reverb, Delay, Saturator, Auto Filter, Utility…' },
  'br-midifx': { name: 'MIDI Effects', part: 'browser', desc: 'Arpeggiator, Chord, Scale, Note Length… : ils transforment les notes avant l’instrument.' },
  'br-plugins': { name: 'Plug-ins', part: 'browser', desc: 'Tes plugins VST/AU, comme Serum 2.' },
  'br-clips': { name: 'Clips', part: 'browser', desc: 'Clips MIDI et audio prêts à glisser.' },
  'br-samples': { name: 'Samples', part: 'browser', desc: 'Fichiers audio : one-shots, boucles.' },
  'br-user': { name: 'User Library', part: 'browser', desc: 'Tes propres presets, kits et modèles de sets.' },
  // Vue Session
  'track-title': { name: 'Titre de piste', part: 'session', desc: 'Nom et couleur de la piste. Double-clic ou Ctrl/Cmd+R pour renommer.' },
  clip: { name: 'Clip', part: 'session', desc: 'Un bloc de notes (MIDI) ou d’audio. Double-clic : l’ouvre dans la vue Clip.' },
  'clip-launch': { name: 'Bouton de lancement du clip', part: 'session', desc: 'Le triangle ▶ : lance le clip au prochain temps de quantification.' },
  'empty-slot': { name: 'Slot vide', part: 'session', desc: 'Case vide : double-clic sur une piste MIDI = nouveau clip MIDI vide.' },
  'slot-stop': { name: 'Bouton Stop de slot', part: 'session', desc: 'Le carré ■ arrête le clip de cette piste.' },
  'scene-launch': { name: 'Lancement de scène', part: 'session', desc: 'Sur la piste Main : lance toute la rangée de clips (une « scène ») d’un coup.' },
  'stop-all': { name: 'Stop All Clips', part: 'session', desc: 'Arrête tous les clips de toutes les pistes.' },
  io: { name: 'Entrées / sorties', part: 'session', desc: 'D’où vient le signal (MIDI From : ton clavier) et où il va.' },
  monitor: { name: 'Monitor', part: 'session', desc: 'In : tu entends toujours l’entrée. Auto : seulement quand la piste est armée. Off : jamais.' },
  sends: { name: 'Sends A / B', part: 'session', desc: 'Envoient une partie du son vers les pistes de retour (reverb, delay partagés).' },
  'return-track': { name: 'Piste de retour', part: 'session', desc: 'A-Reverb, B-Delay : un effet partagé par toutes les pistes via leurs sends.' },
  pan: { name: 'Panoramique', part: 'session', desc: 'Place le son à gauche ou à droite.' },
  volume: { name: 'Volume de la piste', part: 'session', desc: 'Le fader (en dB) et son vumètre.' },
  activator: { name: 'Activateur de piste', part: 'session', desc: 'Le bouton numéroté : éteint = piste muette (mute).' },
  solo: { name: 'Solo', part: 'session', desc: 'S : n’écouter que cette piste.' },
  arm: { name: 'Armement (Arm)', part: 'session', desc: 'Le rond rouge : la piste reçoit ton clavier et s’enregistrera.' },
  'main-track': { name: 'Piste Main', part: 'session', desc: 'La sortie générale (appelée Master avant Live 12) : le limiteur se met ici.' },
  // Vue Arrangement
  ruler: { name: 'Règle des mesures', part: 'arrangement', desc: 'Les numéros de mesure : clique pour placer la tête de lecture.' },
  'loop-brace': { name: 'Loop brace', part: 'arrangement', desc: 'Le crochet au-dessus de la règle : la zone qui boucle. Ctrl/Cmd+L l’active ou la coupe.' },
  'arr-clip': { name: 'Clip d’arrangement', part: 'arrangement', desc: 'Un clip posé sur la ligne du temps : on le coupe (Ctrl/Cmd+E), duplique (Ctrl/Cmd+D), consolide (Ctrl/Cmd+J).' },
  'automation-lane': { name: 'Couloir d’automatisation', part: 'arrangement', desc: 'La courbe d’un paramètre dans le temps (touche A pour l’afficher).' },
  locator: { name: 'Locator', part: 'arrangement', desc: 'Un repère nommé (Intro, Drop…) pour sauter d’une section à l’autre.' },
  'arr-header': { name: 'En-tête de piste (Arrangement)', part: 'arrangement', desc: 'Nom, activateur, solo et armement de la piste, à droite de la ligne du temps.' },
  // Vue détail : clip
  'note-editor': { name: 'Éditeur de notes (piano roll)', part: 'clip', desc: 'Les notes du clip : hauteur à la verticale, temps à l’horizontale.' },
  'velocity-lane': { name: 'Couloir de vélocité', part: 'clip', desc: 'Sous les notes : une tige par note, sa hauteur = la vélocité (force).' },
  fold: { name: 'Fold', part: 'clip', desc: 'N’affiche que les lignes qui contiennent des notes. Avec une gamme active, l’option Fold to Scale ne garde que les notes de la gamme.' },
  scale: { name: 'Scale Mode (gamme du clip)', part: 'clip', desc: 'Live 12 : active Scale Mode, choisis Root Note et Scale Name ; le piano roll surligne les notes de la gamme.' },
  'clip-loop': { name: 'Réglages de boucle du clip', part: 'clip', desc: 'Start, End, Loop et Length : la longueur de la boucle du clip.' },
  'piano-keys': { name: 'Mini-clavier', part: 'clip', desc: 'Le clavier vertical à gauche des notes : clique une touche pour l’entendre.' },
  // Vue détail : devices
  instrument: { name: 'Instrument', part: 'device', desc: 'Le premier device d’une piste MIDI : il transforme les notes en son (Drift, Wavetable, Serum 2…).' },
  eq: { name: 'EQ Eight', part: 'device', desc: 'L’égaliseur : couper ou booster des fréquences.' },
  compressor: { name: 'Compressor', part: 'device', desc: 'Réduit l’écart entre sons forts et faibles ; sidechain possible.' },
  'drop-zone': { name: 'Zone de dépôt', part: 'device', desc: 'Glisse ici un effet depuis le navigateur pour l’ajouter à la chaîne.' },
  macros: { name: 'Macros du Rack', part: 'device', desc: 'Les potards d’un Rack : un seul potard peut piloter plusieurs paramètres.' },
};

/**
 * Raccourcis de Live 12. « Mod » = Ctrl (Windows) ou Cmd (Mac), « Alt » = Alt ou Option.
 * capture: false → combinaison réservée par le navigateur (on répond en choisissant, pas en tapant).
 */
export const SHORTCUTS = [
  { id: 'tab', keys: 'Tab', action: 'Basculer entre la vue Session et la vue Arrangement' },
  { id: 'space', keys: 'Space', action: 'Lancer / arrêter la lecture' },
  { id: 'continuePlay', keys: 'Shift+Space', action: 'Reprendre la lecture là où elle s’était arrêtée' },
  { id: 'f9', keys: 'F9', action: 'Enregistrer dans l’Arrangement', capture: false },
  { id: 'sessionRecord', keys: 'Mod+Shift+F9', action: 'Enregistrer dans la vue Session (Session Record)' },
  { id: 'shifttab', keys: 'Shift+Tab', action: 'Basculer la vue détail entre Clip et Device (ou F12)' },
  { id: 'midiTrack', keys: 'Mod+Shift+T', action: 'Créer une piste MIDI', capture: false },
  { id: 'audioTrack', keys: 'Mod+T', action: 'Créer une piste audio', capture: false },
  { id: 'returnTrack', keys: 'Mod+Alt+T', action: 'Créer une piste de retour', capture: false },
  { id: 'midiClip', keys: 'Mod+Shift+M', action: 'Insérer un clip MIDI vide', capture: false },
  { id: 'dup', keys: 'Mod+D', action: 'Dupliquer la sélection' },
  { id: 'split', keys: 'Mod+E', action: 'Couper (split) un clip à l’endroit sélectionné' },
  { id: 'consolidate', keys: 'Mod+J', action: 'Consolider plusieurs clips en un seul' },
  { id: 'quantize', keys: 'Mod+U', action: 'Quantifier les notes sur la grille' },
  { id: 'quantizeSettings', keys: 'Mod+Shift+U', action: 'Ouvrir les réglages de quantification' },
  { id: 'group', keys: 'Mod+G', action: 'Grouper des pistes (ou des devices dans un Rack)' },
  { id: 'rename', keys: 'Mod+R', action: 'Renommer', capture: false },
  { id: 'loopSel', keys: 'Mod+L', action: 'Activer / couper la boucle (loop brace) de l’Arrangement', capture: false },
  { id: 'draw', keys: 'B', action: 'Activer le mode dessin (crayon)' },
  { id: 'automation', keys: 'A', action: 'Activer / couper le mode Automatisation' },
  { id: 'computerKeys', keys: 'M', action: 'Activer le clavier MIDI de l’ordinateur' },
  { id: 'octDown', keys: 'Z', action: 'Clavier de l’ordinateur : une octave plus bas' },
  { id: 'octUp', keys: 'X', action: 'Clavier de l’ordinateur : une octave plus haut' },
  { id: 'velDown', keys: 'C', action: 'Clavier de l’ordinateur : vélocité plus faible' },
  { id: 'velUp', keys: 'V', action: 'Clavier de l’ordinateur : vélocité plus forte' },
  { id: 'midiMap', keys: 'Mod+M', action: 'Mode MIDI Map (assigner ton contrôleur)' },
  { id: 'keyMap', keys: 'Mod+K', action: 'Mode Key Map (assigner les touches de l’ordinateur)' },
  { id: 'export', keys: 'Mod+Shift+R', action: 'Exporter l’audio (Export Audio/Video)', capture: false },
  { id: 'exportMidi', keys: 'Mod+Shift+E', action: 'Exporter un fichier MIDI' },
  { id: 'prefs', keys: 'Mod+,', action: 'Ouvrir les réglages de Live (Settings)' },
  { id: 'search', keys: 'Mod+F', action: 'Rechercher dans le navigateur' },
  { id: 'browser', keys: 'Mod+Alt+B', action: 'Afficher / masquer le navigateur' },
  { id: 'clipView', keys: 'Mod+Alt+3', action: 'Afficher / masquer la vue Clip' },
  { id: 'deviceView', keys: 'Mod+Alt+4', action: 'Afficher / masquer la vue Device' },
  { id: 'undo', keys: 'Mod+Z', action: 'Annuler' },
  { id: 'save', keys: 'Mod+S', action: 'Enregistrer le set' },
  { id: 'gridNarrow', keys: 'Mod+1', action: 'Rendre la grille plus fine' },
  { id: 'gridWiden', keys: 'Mod+2', action: 'Rendre la grille plus large' },
  { id: 'triplet', keys: 'Mod+3', action: 'Passer la grille en triolets' },
  { id: 'snap', keys: 'Mod+4', action: 'Activer / couper l’aimantation à la grille' },
  { id: 'deactivate', keys: '0', action: 'Désactiver la sélection (clip, notes ou piste)' },
  { id: 'insertSilence', keys: 'Mod+I', action: 'Insérer du silence dans l’Arrangement', capture: false },
];

export const shortcutById = (id) => SHORTCUTS.find((s) => s.id === id);

/** Combinaison normalisée depuis un événement clavier : 'Mod+Shift+M', 'Tab', 'Space', 'F9', 'Mod+,'. */
export function comboFromEvent(e) {
  const parts = [];
  if (e.ctrlKey || e.metaKey) parts.push('Mod');
  if (e.altKey) parts.push('Alt');
  let k = e.key || '';
  const code = e.code || '';
  if (['Control', 'Meta', 'Alt', 'Shift', 'AltGraph', 'OS'].includes(k)) return null;
  if (k === ' ' || k === 'Spacebar') k = 'Space';
  // Lettres : le caractère tapé (AZERTY compris) ; Option/Alt sur Mac change le caractère → touche physique.
  if (k === ',' || k === '?' && code === 'KeyM') k = ',';
  else if (/^[a-z]$/i.test(k)) k = k.toUpperCase();
  else if (/^Digit\d$/.test(code)) k = code.slice(5); // AZERTY : « & é " ' » sur la rangée des chiffres
  else if (/^Key[A-Z]$/.test(code)) k = code.slice(3);
  if (e.shiftKey && (k.length > 1 || /^[A-Z]$/.test(k))) parts.push('Shift');
  parts.push(k);
  return parts.join('+');
}

/** Affichage d'une combinaison selon le système (⌘ ⌥ sur Mac). */
export function comboLabel(keys, mac = false) {
  return keys.split('+').map((k) => ({
    Mod: mac ? '⌘ Cmd' : 'Ctrl', Alt: mac ? '⌥ Option' : 'Alt', Shift: mac ? '⇧ Shift' : 'Maj', Space: 'Espace', Tab: 'Tab ⇥',
  }[k] || k));
}
