// Mini-lecteur global « Mon idée » : la boucle continue pendant qu'on passe d'un Lab à l'autre (comme un set Live).
import { el, slider, select, downloadMidi } from './ui.js';
import { getState, update, subscribe, projectFromGenre } from './store.js';
import { transport } from './core/audio.js';
import { playProject, emitPlayhead } from './player.js';
import { voiceProgression, projectToSong } from './core/arrange.js';
import { NOTE_NAMES, SCALES } from './core/theory.js';
import { GENRES, genreById } from './data/genres.js';

const LAYERS = [['drums', '🥁', 'Batterie'], ['bass', '🎸', 'Basse'], ['chords', '🎼', 'Accords'], ['melody', '🎵', 'Mélodie']];
// Écrans où la boucle peut continuer (édition de l'idée) ; ailleurs (exercices) elle s'arrête et la barre se cache.
export const MINI_ROUTES = ['home', 'labs', 'beat', 'chords', 'melody', 'basslab', 'synth', 'atlas', 'studio', 'notebook', 'profile', 'program', 'bilan', 'remix', 'arrange'];

export function isMiniPlaying() {
  return transport.playing && transport.owner === 'mini';
}

export function mountMiniPlayer(host) {
  let open = false;
  let lastStep = -1;
  const playBtn = el('button.mini-play', { type: 'button', 'aria-label': 'Lecture / stop', onclick: () => toggle() }, '▶');
  const line1 = el('b.mini-l1');
  const line2 = el('span.mini-l2');
  const beats = el('span.mini-beats', [0, 1, 2, 3].map(() => el('i')));
  const info = el('button.mini-info', { type: 'button', onclick: () => { open = !open; paint(); } }, el('div', line1, beats), line2);
  const layerBtns = LAYERS.map(([id, emoji, label]) => el('button.mini-layer', {
    type: 'button', title: `Couper / rétablir : ${label}`,
    onclick: () => update((s) => { s.project.mutes = { ...(s.project.mutes || {}), [id]: !(s.project.mutes || {})[id] }; }),
  }, emoji));
  const panel = el('div.mini-panel');
  const bar = el('div.mp-bar', playBtn, info, el('div.mini-layers', layerBtns));
  host.append(panel, bar);

  function toggle() {
    if (isMiniPlaying()) { transport.stop(); return; }
    playProject(() => getState().project, {
      owner: 'mini',
      onVisual: (step) => {
        lastStep = step;
        const b = Math.floor((step % 16) / 4);
        [...beats.children].forEach((x, i) => x.classList.toggle('on', i === b));
        emitPlayhead(step);
      },
    });
  }

  function renderPanel() {
    const p = getState().project;
    panel.replaceChildren(
      el('div.row.between', el('b', '💡 Mon idée'), el('button.btn.small.ghost', { onclick: () => { open = false; paint(); } }, '✕')),
      slider({ label: 'Tempo', min: 60, max: 180, value: p.bpm, format: (v) => `${v} BPM`, onInput: (v) => { update((s) => { s.project.bpm = v; }); transport.bpm = v; } }),
      slider({ label: 'Swing', min: 0, max: 0.6, step: 0.01, value: p.swing, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { update((s) => { s.project.swing = v; }); transport.swing = v; } }),
      el('div.row.gap.wrap', { style: { margin: '6px 0' } },
        ['beat', 'chords', 'melody', 'basslab', 'arrange', 'remix'].map((r, i) => el('a.btn.small', { href: `#/${r}`, onclick: () => { open = false; paint(); } }, ['🥁 Beat', '🎼 Accords', '🎵 Mélodie', '🎸 Basse', '🧱 Arranger', '🧬 Remix'][i]))),
      el('div.row.gap.wrap',
        el('button.btn.small', { onclick: () => downloadMidi(`idee-${p.genre}-${p.bpm}bpm`, projectToSong(p)) }, '⬇ MIDI'),
        el('button.btn.small', {
          onclick: () => {
            update((s) => { s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Idée ${genreById(s.project.genre).name}`, date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)) }); });
            import('./ui.js').then(({ toast }) => toast('Idée sauvée dans le Carnet 📓', 'good'));
          },
        }, '📓 Sauver'),
        select([{ value: '', label: '✨ Nouvelle idée dans un style…' }, ...GENRES.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}` }))], '', (v) => {
          if (!v) return;
          if (!confirm('Remplacer l’idée en cours ? (Sauve-la d’abord dans le Carnet si tu veux la garder.)')) return;
          update((s) => { s.project = projectFromGenre(v); });
        })),
    );
  }

  function paint() {
    const p = getState().project;
    const g = genreById(p.genre);
    const chords = voiceProgression(p).map((c) => c?.symbol || '–').join(' · ');
    line1.textContent = `${g.emoji} ${g.name} · ${p.bpm} BPM`;
    line2.textContent = `${NOTE_NAMES[p.rootPc]} ${SCALES[p.scale].name.split(' ')[0]} · ${chords}`;
    const mutes = p.mutes || {};
    layerBtns.forEach((b, i) => b.classList.toggle('muted', !!mutes[LAYERS[i][0]]));
    const on = isMiniPlaying();
    playBtn.textContent = on ? '■' : '▶';
    playBtn.classList.toggle('on', on);
    if (!on) [...beats.children].forEach((x) => x.classList.remove('on'));
    panel.classList.toggle('open', open);
    if (open) renderPanel();
  }

  subscribe(() => paint());
  transport.subscribe((playing) => { if (!playing) emitPlayhead(-1); paint(); });
  paint();

  return {
    toggle,
    visible: () => !host.hidden,
    closePanel() { if (open) { open = false; paint(); } },
    setVisible(v) {
      host.hidden = !v;
      document.body.classList.toggle('has-mini', v);
      if (!v) { open = false; paint(); }
    },
    get step() { return lastStep; },
  };
}
