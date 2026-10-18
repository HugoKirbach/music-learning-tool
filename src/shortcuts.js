// Raccourcis clavier (PC). Un seul écouteur global ; chaque écran peut ajouter ses touches via viewKeys().
// Les lettres seules restent au piano (A W S E D…) : la navigation passe donc par Maj + lettre.
import { el, modal } from './ui.js';
import { getState, update } from './store.js';
import { transport, ensureAudio } from './core/audio.js';

export const NAV_KEYS = {
  s: ['home', 'Session'], l: ['labs', 'Labs'], b: ['beat', 'Lab Beat'], a: ['chords', 'Lab Accords'],
  m: ['melody', 'Lab Mélodie'], g: ['basslab', 'Labo de basse'], y: ['synth', 'Lab Synthé'], o: ['ear', 'Quiz d’oreille'],
  r: ['arrange', 'Lab Arrangement'], j: ['rush', 'Piano Rush'], d: ['pads', 'Pad Rush'], t: ['skills', 'Arbre de compétences'], x: ['remix', 'Remix'], k: ['notebook', 'Carnet'], p: ['profile', 'Profil'],
};

const LAYERS = ['drums', 'bass', 'chords', 'melody'];
let viewMap = {};
let mini = null;
let helpClose = null;

/** Touches propres à l'écran courant ({ left, right, … }) ; remises à zéro à chaque changement d'écran. */
export function viewKeys(map) { viewMap = { ...viewMap, ...map }; }
export function resetViewKeys() { viewMap = {}; }

const isTyping = (t) => t && (['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable);
const digitOf = (e) => { const m = /^(?:Digit|Numpad)(\d)$/.exec(e.code); return m ? +m[1] : null; };
const visible = (n) => n && n.offsetParent !== null && !n.disabled;
const view = () => document.getElementById('view');

function openModal() { return document.querySelector('#modal-root .modal-back'); }

export function showShortcutHelp() {
  if (helpClose && openModal()) { helpClose(); helpClose = null; return; }
  const row = (k, d) => el('div.kbd-row', el('span', k.map((x) => el('kbd', x))), el('span', d));
  helpClose = modal(el('div',
    el('h2', '⌨️ Raccourcis clavier'),
    el('h3.fam-title', 'Lecture'),
    row(['Espace'], 'Lecture / stop (ta boucle, ou la question du quiz)'),
    row(['1', '2', '3', '4'], 'Couper / rétablir batterie, basse, accords, mélodie'),
    row(['+', '−'], 'Tempo ± 1 BPM'),
    row(['←', '→'], 'Mesure ou accord précédent / suivant (Mélodie, Basse, Accords)'),
    el('h3.fam-title', 'Quiz'),
    row(['1', '…', '9'], 'Choisir la réponse n°'),
    row(['Entrée'], 'Question suivante'),
    el('h3.fam-title', 'Aller à (Maj + lettre)'),
    el('div.kbd-grid', Object.entries(NAV_KEYS).map(([k, [, name]]) => row(['Maj', k.toUpperCase()], name))),
    el('h3.fam-title', 'Divers'),
    row(['?'], 'Afficher / cacher cette aide'),
    row(['Échap'], 'Fermer une fenêtre ou le panneau du mini-lecteur'),
    el('p.small.muted', 'Les lettres seules (A W S E D F T G…) jouent du piano quand un clavier est affiché.'),
  ), { onClose: () => { helpClose = null; } });
}

function nudgeTempo(d) {
  const bpm = Math.max(60, Math.min(180, getState().project.bpm + d));
  update((s) => { s.project.bpm = bpm; });
  if (transport.owner === 'mini') transport.bpm = bpm;
  import('./ui.js').then(({ toast }) => toast(`Tempo : ${bpm} BPM`, 'info', 900));
}

function onKey(e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Escape') {
    const back = openModal();
    if (back) { back.click(); return; }
    mini?.closePanel();
    return;
  }
  if (isTyping(e.target)) return;
  if (e.key === '?') { e.preventDefault(); showShortcutHelp(); return; }
  if (openModal()) return;

  const v = view();
  const answers = [...v.querySelectorAll('.answers .answer')].filter(visible);
  const digit = digitOf(e);
  const miniOn = mini?.visible();

  // Navigation : Maj + lettre
  if (e.shiftKey && /^Key[A-Z]$/.test(e.code)) {
    const target = NAV_KEYS[e.code.slice(3).toLowerCase()];
    if (target) { e.preventDefault(); location.hash = '#/' + target[0]; }
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (e.repeat) return;
    ensureAudio();
    if (viewMap.space) return viewMap.space();
    const listen = v.querySelector('.listen');
    if (visible(listen)) return listen.click();
    if (miniOn) return mini.toggle();
    const play = [...v.querySelectorAll('.btn.play')].find(visible);
    play?.click();
    return;
  }

  if (answers.length && digit) {
    const b = answers[digit - 1];
    if (b) { e.preventDefault(); b.click(); }
    return;
  }
  if (e.key === 'Enter') {
    const next = [...v.querySelectorAll('[data-key="enter"]')].find(visible);
    if (next) { e.preventDefault(); next.click(); }
    return;
  }
  if (['+', '='].includes(e.key) || e.code === 'NumpadAdd') { if (miniOn) { e.preventDefault(); nudgeTempo(1); } return; }
  if (['-', '_'].includes(e.key) || e.code === 'NumpadSubtract') { if (miniOn) { e.preventDefault(); nudgeTempo(-1); } return; }
  if (digit >= 1 && digit <= 4 && miniOn) {
    e.preventDefault();
    const id = LAYERS[digit - 1];
    update((s) => { s.project.mutes = { ...(s.project.mutes || {}), [id]: !(s.project.mutes || {})[id] }; });
    return;
  }
  if (e.key === 'ArrowLeft' && viewMap.left) { e.preventDefault(); viewMap.left(); return; }
  if (e.key === 'ArrowRight' && viewMap.right) { e.preventDefault(); viewMap.right(); }
}

export function initShortcuts(miniPlayer) {
  mini = miniPlayer;
  window.addEventListener('keydown', onKey);
  // Astuce unique sur PC (clavier + souris)
  if (matchMedia('(pointer: fine) and (min-width: 900px)').matches && !getState().settings.kbdTip && getState().settings.onboarded) {
    setTimeout(() => import('./ui.js').then(({ toast }) => toast('⌨️ Astuce : appuie sur ? pour voir les raccourcis clavier', 'info', 5000)), 1500);
    update((s) => { s.settings.kbdTip = true; });
  }
}
