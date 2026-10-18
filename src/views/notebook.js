import { el, card, header, segmented, downloadMidi, toast, modal } from '../ui.js';
import { getState, update } from '../store.js';
import { genreById } from '../data/genres.js';
import { projectToSong } from '../core/arrange.js';
import { DRUM_ROWS, VEL } from '../core/rhythm.js';

const TYPES = {
  idea: { emoji: '💡', name: 'Idées' },
  beat: { emoji: '🥁', name: 'Beats' },
  chords: { emoji: '🎼', name: 'Accords' },
  sound: { emoji: '🔊', name: 'Sons' },
  note: { emoji: '📝', name: 'Notes' },
};

function beatSong(it) {
  const notes = [];
  for (let b = 0; b < 4; b++) for (const r of DRUM_ROWS) it.drums[r.id].forEach((v, i) => { if (v) notes.push({ pitch: r.midi, start: b * 4 + i / 4, dur: 0.25, vel: VEL[v] }); });
  return { bpm: it.bpm, tracks: [{ name: 'Drums', channel: 9, notes }] };
}

function open(it) {
  update((s) => {
    if (it.type === 'idea') s.project = JSON.parse(JSON.stringify(it.project));
    if (it.type === 'idea' && it.arrangement) s.arrangement = JSON.parse(JSON.stringify(it.arrangement));
    if (it.type === 'beat') Object.assign(s.project, { drums: JSON.parse(JSON.stringify(it.drums)), bpm: it.bpm, swing: it.swing ?? s.project.swing, genre: it.genre || s.project.genre });
    if (it.type === 'chords') Object.assign(s.project, { chords: JSON.parse(JSON.stringify(it.chords)), rootPc: it.rootPc, scale: it.scale, ext: it.ext || 3 });
  });
  location.hash = { idea: it.arrangement ? '#/arrange' : '#/melody', beat: '#/beat', chords: '#/chords', sound: `#/synth?load=${it.id}` }[it.type] || '#/notebook';
}

export function render(root) {
  let filter = 'all';
  const list = el('div');
  const draw = () => {
    const items = getState().notebook.filter((n) => filter === 'all' || n.type === filter);
    if (!items.length) {
      list.replaceChildren(card(el('p.muted', 'Rien ici pour l’instant. Sauve tes beats, progressions, mélodies et sons depuis les Labs, ou note une idée qui te passe par la tête.')));
      return;
    }
    list.replaceChildren(...items.map((it) => card(el('div.note-item',
      el('span.ne', TYPES[it.type]?.emoji || '•'),
      el('div.nbody',
        el('b', it.title),
        el('div.small.muted', new Date(it.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) + (it.genre ? ` · ${genreById(it.genre).name}` : '') + (it.bpm ? ` · ${it.bpm} BPM` : '')),
        it.note ? el('p', it.note) : null,
        el('div.row.gap.wrap',
          it.type !== 'note' ? el('button.btn.small', { onclick: () => open(it) }, '↗ Ouvrir') : null,
          it.type === 'idea' ? el('button.btn.small', { onclick: () => downloadMidi(`idee-${it.genre}`, projectToSong(it.project)) }, '⬇ MIDI') : null,
          it.type === 'idea' && it.project ? el('button.btn.small', { title: 'Partager par lien', onclick: () => import('../share.js').then(({ shareIdea }) => shareIdea(it.project, it.title)) }, '🔗') : null,
          it.type === 'beat' ? el('button.btn.small', { onclick: () => downloadMidi(`beat-${it.genre}`, beatSong(it)) }, '⬇ MIDI') : null,
          it.type === 'chords' ? el('button.btn.small', { onclick: () => downloadMidi('accords', projectToSong({ ...getState().project, chords: it.chords, rootPc: it.rootPc, scale: it.scale, ext: it.ext }, { chords: true, bass: true })) }, '⬇ MIDI') : null,
          el('button.btn.small', { onclick: () => editNote(it, draw) }, '✏️'),
          el('button.btn.small.ghost', {
            onclick: () => {
              if (!confirm('Supprimer cet élément ?')) return;
              update((s) => { s.notebook = s.notebook.filter((n) => n.id !== it.id); s.deleted = [...(s.deleted || []), it.id].slice(-300); });
              draw();
            },
          }, '🗑'),
        ),
      ),
    ))));
  };
  root.append(
    header('📓 Carnet d’idées', 'Tout ce que tu crées, prêt à être rouvert ou exporté en MIDI vers Ableton / le MPC.', null),
    el('div.row.gap.wrap', { style: { marginBottom: '10px' } },
      segmented([{ value: 'all', label: 'Tout' }, ...Object.entries(TYPES).map(([k, t]) => ({ value: k, label: `${t.emoji} ${t.name}` }))], filter, (v) => { filter = v; draw(); }),
      el('button.btn.small.primary', { onclick: () => editNote(null, draw) }, '+ Note rapide')),
    list,
  );
  draw();
}

function editNote(it, after) {
  const title = el('input', { type: 'text', value: it ? it.title : '', placeholder: 'Titre (ex. « idée de hook dans le métro »)', style: { width: '100%', marginBottom: '8px' } });
  const txt = el('textarea', { placeholder: 'Ton idée, une référence à écouter, un réglage à tester…' });
  txt.value = it?.note || '';
  const close = modal(el('div', el('h2', it ? 'Modifier' : 'Nouvelle note'), title, txt,
    el('button.btn.primary.wide', {
      onclick: () => {
        const t = title.value.trim() || 'Note';
        update((s) => {
          if (it) { const n = s.notebook.find((x) => x.id === it.id); if (n) { n.title = t; n.note = txt.value; } }
          else s.notebook.unshift({ id: Date.now(), type: 'note', title: t, note: txt.value, date: Date.now() });
        });
        close();
        toast('Enregistré 📓', 'good');
        after();
      },
    }, 'Enregistrer')));
}
