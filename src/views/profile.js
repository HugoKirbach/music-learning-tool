import { el, card, header, segmented, slider, download, toast } from '../ui.js';
import { getState, update, exportBackup, importBackup, resetAll, snapshotInfo, restoreSnapshot } from '../store.js';
import { levelFromXp, titleFor, SKILLS, BADGES, dayKey } from '../core/progress.js';
import { GENRES } from '../data/genres.js';
import { setVolume } from '../core/audio.js';
import { enableMidi, midiStatus, midiStatusText, midiSupported, onMidiStatus, onMidi, drumForNote } from '../midiin.js';
import { midiToName } from '../core/theory.js';
import { playSynth, ensureAudio, now } from '../core/audio.js';
import { presetParams } from '../player.js';
import { accountCard } from './account.js';
import { audioCard } from './audiodiag.js';

export function render(root, params = {}) {
  const s = getState();
  const lv = levelFromXp(s.xp);
  const maxSkill = Math.max(100, ...Object.values(s.skills));
  const ear = s.stats.earTotal ? Math.round((100 * s.stats.earCorrect) / s.stats.earTotal) : 0;

  // Activité des 28 derniers jours
  const heat = el('div.heat');
  for (let i = 27; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const xp = s.days[dayKey(d)]?.xp || 0;
    const a = Math.min(1, xp / s.settings.dailyGoal);
    heat.appendChild(el('div', { title: `${dayKey(d)} : ${xp} XP`, style: { background: xp ? `rgba(179,136,255,${0.25 + a * 0.75})` : '' } }));
  }

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
  const fileIn = el('input', {
    type: 'file', accept: 'application/json,.json', style: { display: 'none' },
    onchange: async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { importBackup(await f.text()); toast('Sauvegarde restaurée ✅', 'good'); location.hash = '#/home'; } catch (err) { toast(err.message, 'bad'); }
    },
  });

  root.append(
    header('🏆 Profil', `${titleFor(lv.level)} — niveau ${lv.level}`, null),
    el('div.profile-links',
      el('a.btn.primary', { href: '#/bilan' }, '📈 Bilan & coach'),
      el('a.btn', { href: '#/skills' }, '🌳 Compétences'),
      el('a.btn', { href: '#/placement' }, '🧪 Test de la semaine'),
      el('a.btn', { href: '#/friends' }, '👥 Amis')),
    el('div.cols',
      el('div',
        card(
          el('div.row.between', el('b', `Niveau ${lv.level}`), el('span.muted.small', `${lv.into}/${lv.needed} XP`)),
          el('div.bar', el('div.bar-fill', { style: { width: `${Math.round(lv.progress * 100)}%` } })),
          el('div.stat-grid',
            el('div', el('b', `🔥 ${s.streak.count || 0}`), el('span', `série (record ${s.streak.best || 0})`)),
            el('div', el('b', s.stats.sessions), el('span', 'sessions')),
            el('div', el('b', s.xp), el('span', 'XP total')),
            el('div', el('b', s.stats.exercises), el('span', 'exercices')),
            el('div', el('b', `${ear}%`), el('span', 'oreille')),
            el('div', el('b', Object.values(s.missions).reduce((a, b) => a + b, 0)), el('span', 'missions studio')),
          ),
          el('p.small.muted', { style: { marginTop: '10px' } }, '28 derniers jours'), heat,
        ),
        card(el('h3', '📊 Compétences'), el('p.small.muted', 'La session express cible automatiquement ta compétence la plus faible.'),
          Object.entries(SKILLS).map(([k, sk]) => el('div.skill',
            el('div.skill-head', el('span', `${sk.emoji} ${sk.name}`), el('span.muted', `${s.skills[k]} XP`)),
            el('div.meter', el('div', { style: { width: `${Math.round((100 * s.skills[k]) / maxSkill)}%`, background: sk.color } }))))),
        card(el('h3', `🛂 Passeport des styles (${Object.keys(s.genres).length}/${GENRES.length})`),
          el('div.passport', GENRES.map((g) => el('a.stamp' + (s.genres[g.id] ? '.got' : ''), { href: `#/atlas?g=${g.id}` }, el('span.se', g.emoji), g.name)))),
      ),
      el('div',
        acct.node,
        card(el('h3', `🎖️ Badges (${Object.keys(s.badges).length}/${BADGES.length})`),
          el('div.badges', BADGES.map((b) => el('div.badge' + (s.badges[b.id] ? '' : '.locked'), { title: b.desc }, el('span.be', b.emoji), el('b', b.name), el('div.muted', b.desc))))),
        card(el('h3', '⚙️ Réglages'),
          // Version web (hugokirbach.github.io) : lien vers le menu qui regroupe les applis.
          /\.github\.io$/.test(location.hostname) ? el('a.btn.small', { href: '/', style: { marginBottom: '12px' } }, '← Retour au menu des applis') : null,
          slider({ label: 'Volume', min: 0, max: 1, step: 0.01, value: s.settings.volume, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { setVolume(v); update((st) => { st.settings.volume = v; }); } }),
          el('div.ctrl-row', el('label', 'Objectif / jour'), segmented([{ value: 100, label: '100' }, { value: 150, label: '150' }, { value: 250, label: '250' }, { value: 400, label: '400' }], s.settings.dailyGoal, (v) => update((st) => { st.settings.dailyGoal = v; }))),
          el('div.ctrl-row', el('label', 'Indices'), segmented([{ value: 'auto', label: 'Auto (disparaissent niv. 6)' }, { value: 'on', label: 'Toujours' }, { value: 'off', label: 'Jamais' }], s.settings.hints, (v) => update((st) => { st.settings.hints = v; }))),
          el('div.ctrl-row', el('label', 'Thème'), segmented([{ value: 'auto', label: 'Auto' }, { value: 'dark', label: '🌙 Sombre' }, { value: 'light', label: '☀️ Clair' }], s.settings.theme || 'auto', (v) => update((st) => { st.settings.theme = v; }))),
          el('div.ctrl-row', el('label', 'Animations'), segmented([{ value: 'auto', label: 'Auto' }, { value: 'reduce', label: 'Réduites' }, { value: 'full', label: 'Complètes' }], s.settings.motion || 'auto', (v) => update((st) => { st.settings.motion = v; }))),
          el('div.ctrl-row', el('label', 'Labs'), segmented([{ value: false, label: 'Progressifs' }, { value: true, label: 'Tout afficher' }], !!s.settings.allModules, (v) => update((st) => { st.settings.allModules = v; }))),
          el('div.ctrl-row', el('label', 'Pads'), segmented([{ value: false, label: 'Droitier' }, { value: true, label: 'Gaucher' }], !!s.pads?.lefty, (v) => update((st) => { st.pads = { ...(st.pads || {}), lefty: v }; }))),
          el('button.btn.small', { onclick: () => import('../whatsnew.js').then((m) => m.showWhatsNew({ force: true })) }, '✨ Quoi de neuf ? / visite guidée'),
          el('h3', { style: { marginTop: '12px' } }, '🎹 Clavier MIDI (MPC Key 37)'),
          midiLine, el('div.ctrl-row', midiBtn), tester,
          el('details', el('summary', 'Brancher le MPC Key 37 au PC'),
            el('ol.clean.small',
              el('li', 'Câble USB du port « Computer » du MPC vers le PC. Allume le MPC.'),
              el('li', 'Sur le MPC : Menu → Mode contrôleur (« Controller Mode ») pour qu’il se comporte comme un clavier MIDI.'),
              el('li', 'Ouvre BeatForge dans Chrome ou Edge (ou l’app installée), clique sur 🎹 en haut puis « Autoriser ».'),
              el('li', 'C’est tout : l’app se reconnecte seule ensuite, même si tu débranches / rebranches.'),
              el('li', 'Si Ableton est ouvert, il peut partager le clavier ; sous Windows, ferme Live si le MPC n’apparaît pas.')),
            el('p.small.muted', 'Où ça sert : Lab Synthé (touches + potards Q-Link), quiz d’Oreille (réponds en jouant), Lab Accords (reconnaissance d’accords), Lab Mélodie (saisie pas à pas), Lab Beat (pads → batterie, enregistrement live).')),
        ),
        audio.node,
        card(el('h3', '💾 Sauvegarde en fichier'),
          el('p.small.muted', 'Sans compte : exporte un fichier ici et importe-le sur l’autre appareil. Utile aussi comme copie de secours.'),
          el('div.row.gap.wrap',
            el('button.btn.small', { onclick: () => download(`beatforge-sauvegarde-${dayKey()}.json`, exportBackup(), 'application/json') }, '⬇ Exporter'),
            el('button.btn.small', { onclick: () => fileIn.click() }, '⬆ Importer'), fileIn,
            el('button.btn.small.ghost', { onclick: () => { if (confirm('Tout effacer (XP, carnet, badges) ?')) { resetAll(); location.hash = '#/home'; location.reload(); } } }, '♻️ Réinitialiser')),
          snapshotInfo() ? el('p.small.muted', { style: { marginTop: '8px' } },
            `🛟 Copie de secours locale (${snapshotInfo().reason}, ${new Date(snapshotInfo().at).toLocaleString('fr-FR')}, ${snapshotInfo().xp} XP) `,
            el('button.btn.small.ghost', { onclick: () => { if (confirm('Revenir à cette copie ? L’état actuel devient à son tour la copie de secours.')) { restoreSnapshot(); toast('Copie restaurée ✅', 'good'); location.hash = '#/home'; } } }, 'Restaurer')) : null),
        card(el('h3', '📲 Installer l’app'),
          el('ul.clean.small',
            el('li', el('b', 'Android (Chrome) : '), 'menu ⋮ → « Installer l’application ».'),
            el('li', el('b', 'iPhone (Safari) : '), 'Partager → « Sur l’écran d’accueil ».'),
            el('li', el('b', 'PC (Chrome / Edge) : '), 'icône d’installation dans la barre d’adresse. Fonctionne hors-ligne.')),
          el('p.small.muted', 'BeatForge — tout est généré en temps réel par le navigateur (Web Audio), compte facultatif.')),
      ),
    ),
  );
  if (params.account) requestAnimationFrame(() => { acct.node.scrollIntoView({ block: 'center', behavior: 'smooth' }); acct.node.classList.add('flash'); });
  return () => { offStatus(); offTest(); acct.destroy(); audio.destroy(); voices.forEach((x) => x.release()); };
}
