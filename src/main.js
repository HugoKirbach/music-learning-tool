// Point d'entrée : routeur à base de hash, barre de statut, navigation, onboarding.
import { el, clear, modal, segmented, toast } from './ui.js';
import { getState, subscribe, update, today } from './store.js';
import { levelFromXp, dayKey } from './core/progress.js';
import { transport, ensureAudio, setVolume, playSynth, now } from './core/audio.js';
import { autoEnableMidi, enableMidi, midiStatus, midiStatusText, onMidiStatus, onDeviceChange, setMidiFallback, midiSupported } from './midiin.js';
import { presetParams } from './player.js';

const ROUTES = {
  home: () => import('./views/home.js'),
  labs: () => import('./views/labs.js'),
  beat: () => import('./views/beat.js'),
  chords: () => import('./views/chords.js'),
  melody: () => import('./views/melody.js'),
  synth: () => import('./views/synth.js'),
  ear: () => import('./views/ear.js'),
  atlas: () => import('./views/atlas.js'),
  callresponse: () => import('./views/callresponse.js'),
  arrange: () => import('./views/arrange.js'),
  analyze: () => import('./views/analyze.js'),
  program: () => import('./views/program.js'),
  studio: () => import('./views/studio.js'),
  notebook: () => import('./views/notebook.js'),
  profile: () => import('./views/profile.js'),
};

const NAV = [
  { id: 'home', icon: '⚡', label: 'Session', also: ['program'] },
  { id: 'labs', icon: '🧪', label: 'Labs', also: ['beat', 'chords', 'melody', 'synth', 'ear', 'atlas', 'callresponse', 'arrange'] },
  { id: 'studio', icon: '🎛️', label: 'Studio', also: ['analyze'] },
  { id: 'notebook', icon: '📓', label: 'Carnet' },
  { id: 'profile', icon: '🏆', label: 'Profil' },
];

const view = document.getElementById('view');
const nav = document.getElementById('nav');
const status = document.getElementById('status');
let cleanup = null;
let renderToken = 0;

function renderNav(current) {
  clear(nav);
  for (const n of NAV) {
    const active = n.id === current || n.also?.includes(current);
    nav.appendChild(el('a.nav-item' + (active ? '.active' : ''), { href: '#/' + n.id },
      el('span.nav-icon', n.icon), el('span.nav-label', n.label)));
  }
}

function renderStatus() {
  const s = getState();
  const lv = levelFromXp(s.xp);
  const t = today();
  const goal = s.settings.dailyGoal;
  const pct = Math.min(1, t.xp / goal);
  clear(status);
  status.appendChild(el('a.brand', { href: '#/home' }, el('span.logo', '◆'), el('span.brand-name', 'BeatForge')));
  status.appendChild(el('div.status-right',
    el('a.chip.streak' + (s.streak.last === dayKey() ? '.lit' : ''), { href: '#/profile', title: 'Série de jours' }, '🔥 ', String(s.streak.count || 0)),
    el('a.chip.goal', { href: '#/profile', title: `Objectif du jour : ${t.xp}/${goal} XP` },
      ring(pct), ` ${t.xp}/${goal}`),
    el('a.chip.lvl', { href: '#/profile', title: `${lv.into}/${lv.needed} XP vers le niveau ${lv.level + 1}` },
      `Niv. ${lv.level}`, el('span.mini-bar', el('span', { style: { width: `${Math.round(lv.progress * 100)}%` } }))),
    midiChip,
  ));
}

// ---------- Clavier MIDI : pastille d'état dans la barre du haut ----------
const midiChip = el('button.chip.midi', { type: 'button', onclick: () => midiClick() });
function paintMidiChip(st = midiStatus()) {
  midiChip.hidden = st.state === 'unsupported';
  midiChip.className = 'chip midi ' + st.state;
  midiChip.title = `MIDI : ${midiStatusText(st)}`;
  midiChip.textContent = st.state === 'connected' ? `🎹 ${shortName(st.devices[0])}` : '🎹';
}
function shortName(n = '') {
  return n.replace(/\s*\(.*\)\s*/g, '').replace(/^(\d+-\s*)/, '').slice(0, 14) || 'MIDI';
}
async function midiClick() {
  if (['off', 'denied'].includes(midiStatus().state)) {
    ensureAudio();
    if (!(await enableMidi())) toast('Accès MIDI refusé : autorise-le via l’icône 🔒 de la barre d’adresse', 'bad', 5000);
    return;
  }
  location.hash = '#/profile';
}
onMidiStatus(paintMidiChip);
onDeviceChange((added, removed) => {
  added.forEach((n) => toast(`🎹 ${n} connecté — joue, l’app t’écoute !`, 'good', 3500));
  removed.forEach((n) => toast(`🔌 ${n} déconnecté`, 'info', 3000));
});
// Sur les écrans sans exercice MIDI, le clavier joue un piano (pour s'échauffer les doigts).
const fallbackVoices = new Map();
setMidiFallback({
  noteOn: (n, v) => { ensureAudio(); fallbackVoices.get(n)?.release(); fallbackVoices.set(n, playSynth(presetParams('piano'), n, now(), null, v, { send: 0.2 })); },
  noteOff: (n) => { fallbackVoices.get(n)?.release(); fallbackVoices.delete(n); },
});
paintMidiChip();

function ring(p) {
  const r = 7, c = 2 * Math.PI * r;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 18 18');
  svg.setAttribute('class', 'ring');
  svg.innerHTML = `<circle cx="9" cy="9" r="${r}" class="ring-bg"/><circle cx="9" cy="9" r="${r}" class="ring-fg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 9 9)"/>`;
  return svg;
}

async function route() {
  const token = ++renderToken;
  const hash = location.hash || '#/home';
  const [path, query = ''] = hash.slice(2).split('?');
  const id = ROUTES[path] ? path : 'home';
  transport.stop();
  if (getState().settings.onboarded) document.getElementById('modal-root').replaceChildren();
  if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
  renderNav(id);
  let mod;
  try {
    mod = await ROUTES[id]();
  } catch (e) {
    console.error(e);
    clear(view).appendChild(el('div.card', 'Erreur de chargement. Recharge la page.'));
    return;
  }
  if (token !== renderToken) return;
  clear(view);
  view.scrollTop = 0;
  window.scrollTo(0, 0);
  const params = Object.fromEntries(new URLSearchParams(query));
  const res = mod.render(view, params);
  cleanup = typeof res === 'function' ? res : null;
}

function onboarding() {
  const s = getState();
  if (s.settings.onboarded) return;
  let goal = 150;
  const close = modal(el('div.onboard',
    el('div.onboard-logo', '◆'),
    el('h2', 'Bienvenue dans BeatForge'),
    el('p', 'Ta salle d’entraînement de poche pour composer : rythmes, accords, mélodies « catchy » et sound design — puis transposer chaque geste dans Ableton Live 12, ton MPC Key 37 et Serum 2.'),
    el('ol.onboard-steps',
      el('li', el('b', '👂 Échauffement'), ' — 2 min pour entraîner l’oreille.'),
      el('li', el('b', '🧪 Création'), ' — 3-5 min de composition guidée dans un style.'),
      el('li', el('b', '🎛️ Transfert studio'), ' — une mission concrète à refaire sur tes outils.'),
    ),
    el('p.muted', 'Les indices disparaissent progressivement avec ton niveau : le but est que tu deviennes autonome.'),
    el('p', el('b', 'Objectif quotidien :')),
    segmented([
      { value: 100, label: 'Cool · 100 XP' }, { value: 150, label: 'Régulier · 150' }, { value: 250, label: 'Intense · 250' },
    ], goal, (v) => { goal = v; }),
    el('button.btn.primary.wide', {
      onclick: () => {
        ensureAudio();
        update((st) => { st.settings.onboarded = true; st.settings.dailyGoal = goal; });
        close();
      },
    }, 'C’est parti 🎧'),
  ), { dismissable: false });
}

// Débloque l'audio au premier geste (politique autoplay des navigateurs).
const unlock = () => { ensureAudio(); setVolume(getState().settings.volume); window.removeEventListener('pointerdown', unlock); };
window.addEventListener('pointerdown', unlock);

window.addEventListener('hashchange', route);
subscribe(renderStatus);
renderStatus();
route();
onboarding();
if (midiSupported()) autoEnableMidi();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
