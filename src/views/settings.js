// Réglages : compte, préférences, clavier MIDI, moteur audio, sortie vers Live, rappels, sauvegarde, installation.
import { KB_OPTIONS, KB_NAMES, PIANO_CODES, kbLayout, detectedLayout, keyLabel, keyLabels } from '../keyboard.js';
import { el, card, header, segmented, slider, download, toast } from '../ui.js';
import { getState, update, exportBackup, importBackup, resetAll, snapshotInfo, restoreSnapshot } from '../store.js';
import { dayKey } from '../core/progress.js';
import { setVolume, playSynth, ensureAudio, now } from '../core/audio.js';
import { enableMidi, midiStatus, midiStatusText, onMidiStatus, onMidi, drumForNote } from '../midiin.js';
import { midiToName } from '../core/theory.js';
import { presetParams } from '../player.js';
import { accountCard } from './account.js';
import { audioCard } from './audiodiag.js';
import { remindersCard } from './reminderscard.js';
import { studioCard } from './studiocard.js';
import { APP_VERSION } from '../whatsnew.js';

/** Bouton « Installer » quand le navigateur le permet, ou « déjà installée ». */
function installState() {
  const box = el('div');
  const paint = () => {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    box.replaceChildren(el('div', standalone ? el('p.small', '✅ Tu utilises l’app installée.')
      : window.__bfInstall ? el('button.btn.primary', { style: { marginBottom: '8px' }, onclick: async () => {
        const ev = window.__bfInstall; window.__bfInstall = null;
        ev.prompt(); await ev.userChoice.catch(() => null); paint();
      } }, '📲 Installer BeatForge') : null));
  };
  window.addEventListener('bf-installable', paint);
  paint();
  return box;
}

const SECS = [
  ['account', '👤', 'Compte'], ['general', '🎚️', 'Général'], ['midi', '🎹', 'MIDI'], ['audio', '🔊', 'Audio'],
  ['live', '🎛️', 'Live'], ['reminders', '🔔', 'Rappels'], ['backup', '💾', 'Sauvegarde'], ['app', '📲', 'App'],
];

export function render(root, params = {}) {
  const s = getState();
  const midiLine = el('p.small');
  const midiBtn = el('button.btn.small', { onclick: async () => { ensureAudio(); await enableMidi(); } }, '🔌 Activer le clavier MIDI');
  const paintMidi = (st) => {
    midiLine.replaceChildren(el('b', st.state === 'connected' ? '🟢 ' : st.state === 'nodevice' ? '🟡 ' : '⚪ '), `MIDI : ${midiStatusText(st)}`);
    midiBtn.hidden = st.state === 'connected' || st.state === 'unsupported';
  };
  paintMidi(midiStatus());
  const offStatus = onMidiStatus(paintMidi);
  const tester = el('p.small.muted', 'Testeur : joue une touche, un pad ou tourne un potard.');
  const voices = new Map();
  const offTest = onMidi({
    noteOn: (n, v, _h, ch) => {
      ensureAudio();
      voices.set(n, playSynth(presetParams('piano'), n, now(), null, v, { send: 0.2 }));
      const d = drumForNote(n);
      tester.replaceChildren('🎹 ', el('b', midiToName(n)), ` — note ${n}, vélocité ${Math.round(v * 127)}, canal ${ch + 1}${d ? ` · pad → ${d}` : ''}`);
    },
    noteOff: (n) => { voices.get(n)?.release(); voices.delete(n); },
    cc: (c, v, ch) => { tester.replaceChildren('🎛️ ', el('b', `CC ${c}`), ` = ${Math.round(v * 127)} (canal ${ch + 1}) — assignable dans le Lab Synthé`); },
  });

  const acct = accountCard();
  const audio = audioCard();
  const studio = studioCard();
  const fileIn = el('input', {
    type: 'file', accept: 'application/json,.json', style: { display: 'none' },
    onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { importBackup(await f.text()); toast('Sauvegarde restaurée ✅', 'good'); location.hash = '#/home'; } catch (err) { toast(err.message, 'bad'); }
    },
  });
  const tag = (node, id) => { node.id = `set-${id}`; node.classList.add('set-sec'); return node; };
  const row = (label, ctrl) => el('div.ctrl-row', el('label', label), ctrl);

  const kbText = () => `⌨️ Clavier ${KB_NAMES[kbLayout()]} : piano sur ${keyLabels(PIANO_CODES.slice(0, 8))}…, octave ${keyLabel('KeyZ')} / ${keyLabel('KeyX')}. Toutes les touches affichées dans l’app suivent ce choix.`;
  const kbNote = el('p.small.muted.kb-note', kbText());
  const secs = {
    account: acct.node,
    general: card(el('h3', '🎚️ Général'),
      slider({ label: 'Volume', min: 0, max: 1, step: 0.01, value: s.settings.volume, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { setVolume(v); update((st) => { st.settings.volume = v; }); } }),
      row('Objectif / jour', segmented([{ value: 100, label: '100' }, { value: 150, label: '150' }, { value: 250, label: '250' }, { value: 400, label: '400' }], s.settings.dailyGoal, (v) => update((st) => { st.settings.dailyGoal = v; }))),
      row('Indices', segmented([{ value: 'auto', label: 'Auto (disparaissent niv. 6)' }, { value: 'on', label: 'Toujours' }, { value: 'off', label: 'Jamais' }], s.settings.hints, (v) => update((st) => { st.settings.hints = v; }))),
      row('Sons de validation', segmented([{ value: 'soft', label: 'Doux' }, { value: 'normal', label: 'Normaux' }, { value: 'off', label: 'Coupés' }], s.settings.sfx || 'soft', (v) => { update((st) => { st.settings.sfx = v; }); import('../learn/jam.js').then((m) => m.sfx('ok')); })),
      row('Volume égalisé', segmented([{ value: 'on', label: 'Oui' }, { value: 'off', label: 'Non' }], s.settings.leveling === false ? 'off' : 'on', (v) => { update((st) => { st.settings.leveling = v === 'on'; }); })),
      row('Clavier', segmented(KB_OPTIONS.map((o) => (o.value === 'auto' ? { ...o, label: `Auto (${KB_NAMES[detectedLayout()]})` } : o)), KB_OPTIONS.some((o) => o.value === s.settings.kbLayout) ? s.settings.kbLayout : 'auto', (v) => { update((st) => { st.settings.kbLayout = v; }); kbNote.textContent = kbText(); })),
      kbNote,
      row('Thème', segmented([{ value: 'auto', label: 'Auto' }, { value: 'dark', label: '🌙 Sombre' }, { value: 'light', label: '☀️ Clair' }], s.settings.theme || 'auto', (v) => update((st) => { st.settings.theme = v; }))),
      row('Animations', segmented([{ value: 'auto', label: 'Auto' }, { value: 'reduce', label: 'Réduites' }, { value: 'full', label: 'Complètes' }], s.settings.motion || 'auto', (v) => update((st) => { st.settings.motion = v; }))),
      row('Ateliers', segmented([{ value: false, label: 'Progressifs' }, { value: true, label: 'Tout afficher' }], !!s.settings.allModules, (v) => update((st) => { st.settings.allModules = v; }))),
      row('Pads', segmented([{ value: false, label: 'Droitier' }, { value: true, label: 'Gaucher' }], !!s.pads?.lefty, (v) => update((st) => { st.pads = { ...(st.pads || {}), lefty: v }; }))),
      el('div.row.gap.wrap',
        el('a.btn.small', { href: '#/latency' }, '⏱️ Calibrer la latence'),
        el('button.btn.small', { onclick: () => import('../shortcuts.js').then((m) => m.showShortcutHelp()) }, '⌨️ Raccourcis clavier'))),
    midi: card(el('h3', '🎹 Clavier MIDI (MPC Key 37)'),
      midiLine, el('div.ctrl-row', midiBtn), tester,
      el('details', el('summary', 'Brancher le MPC Key 37 au PC'),
        el('ol.clean.small',
          el('li', 'Câble USB du port « Computer » du MPC vers le PC. Allume le MPC.'),
          el('li', 'Sur le MPC : Menu → Mode contrôleur (« Controller Mode ») pour qu’il se comporte comme un clavier MIDI.'),
          el('li', 'Ouvre BeatForge dans Chrome ou Edge (ou l’app installée), clique sur 🎹 en haut puis « Autoriser ».'),
          el('li', 'C’est tout : l’app se reconnecte seule ensuite, même si tu débranches / rebranches.'),
          el('li', 'Si Ableton est ouvert, il peut partager le clavier ; sous Windows, ferme Live si le MPC n’apparaît pas.')),
        el('p.small.muted', 'Où ça sert : Piano Rush et Pad Rush, Lab Synthé (touches + potards Q-Link), quiz d’oreille (réponds en jouant), Lab Accords (reconnaissance d’accords), Lab Mélodie (saisie pas à pas), Lab Beat (pads → batterie, enregistrement live).'))),
    audio: audio.node,
    live: studio,
    reminders: remindersCard(),
    backup: card(el('h3', '💾 Sauvegarde en fichier'),
      el('p.small.muted', 'Sans compte : exporte un fichier ici et importe-le sur l’autre appareil. Utile aussi comme copie de secours.'),
      el('div.row.gap.wrap',
        el('button.btn.small', { onclick: () => download(`beatforge-sauvegarde-${dayKey()}.json`, exportBackup(), 'application/json') }, '⬇ Exporter'),
        el('button.btn.small', { onclick: () => fileIn.click() }, '⬆ Importer'), fileIn,
        el('button.btn.small.ghost', { onclick: () => { if (confirm('Tout effacer (XP, carnet, badges) ?')) { resetAll(); location.hash = '#/home'; location.reload(); } } }, '♻️ Réinitialiser')),
      snapshotInfo() ? el('p.small.muted', { style: { marginTop: '8px' } },
        `🛟 Copie de secours locale (${snapshotInfo().reason}, ${new Date(snapshotInfo().at).toLocaleString('fr-FR')}, ${snapshotInfo().xp} XP) `,
        el('button.btn.small.ghost', { onclick: () => { if (confirm('Revenir à cette copie ? L’état actuel devient à son tour la copie de secours.')) { restoreSnapshot(); toast('Copie restaurée ✅', 'good'); location.hash = '#/home'; } } }, 'Restaurer')) : null),
    app: card(el('h3', '📲 L’application'), installState(),
      el('ul.clean.small',
        el('li', el('b', 'Android (Chrome) : '), 'menu ⋮ → « Installer l’application ».'),
        el('li', el('b', 'iPhone (Safari) : '), 'Partager → « Sur l’écran d’accueil ».'),
        el('li', el('b', 'PC (Chrome / Edge) : '), 'icône d’installation dans la barre d’adresse. Fonctionne hors-ligne.')),
      el('div.row.gap.wrap',
        el('button.btn.small', { onclick: () => import('../whatsnew.js').then((m) => m.showWhatsNew({ force: true })) }, '✨ Quoi de neuf ? / visite guidée'),
        // Version web (hugokirbach.github.io) : lien vers le menu qui regroupe les applis.
        /\.github\.io$/.test(location.hostname) ? el('a.btn.small', { href: '/' }, '← Menu des applis') : null),
      el('p.small.muted', `BeatForge ${APP_VERSION} — tout est généré en temps réel par le navigateur (Web Audio), compte facultatif.`)),
  };
  const jump = (id) => document.getElementById(`set-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });

  root.append(
    header('⚙️ Réglages', 'Compte, son, clavier MIDI, lien avec Live et sauvegardes.', '#/profile'),
    el('nav.set-jump', { 'aria-label': 'Rubriques des réglages' }, SECS.map(([id, e, n]) => el('button.chip-tile', { type: 'button', onclick: () => jump(id) }, el('span', { 'aria-hidden': 'true' }, e), n))),
    el('div.cols',
      el('div', ...['account', 'general', 'midi', 'backup'].map((id) => tag(secs[id], id))),
      el('div', ...['audio', 'live', 'reminders', 'app'].map((id) => tag(secs[id], id)))),
  );
  const focus = params.account ? 'account' : params.sec;
  if (focus && secs[focus]) requestAnimationFrame(() => { secs[focus].scrollIntoView({ block: 'center', behavior: 'smooth' }); secs[focus].classList.add('flash'); });
  return () => { offStatus(); offTest(); acct.destroy(); audio.destroy(); studio.destroy?.(); voices.forEach((x) => x.release()); };
}
