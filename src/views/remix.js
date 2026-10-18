// Remix ton idée : transformer une idée existante au lieu d'en recommencer une nouvelle.
import { el, card, header, select, finishExercise, toast } from '../ui.js';
import { getState, update } from '../store.js';
import { TRANSFORMS } from '../core/variations.js';
import { playProject, stopAll } from '../player.js';
import { GENRES, genreById } from '../data/genres.js';
import { voiceProgression } from '../core/arrange.js';
import { NOTE_NAMES, SCALES } from '../core/theory.js';

const describe = (p) => {
  const g = genreById(p.genre);
  return `${g.emoji} ${g.name} · ${p.bpm} BPM · ${NOTE_NAMES[p.rootPc]} ${SCALES[p.scale].name} · ${voiceProgression(p).map((c) => c?.symbol || '–').join(' – ')} · ${p.melody.filter(Boolean).length} notes de mélodie`;
};

export function render(root) {
  const s = getState();
  const ideas = s.notebook.filter((n) => n.type === 'idea' && n.project);
  let base = JSON.parse(JSON.stringify(s.project));
  let baseLabel = 'Idée en cours';
  const history = [];
  let kept = false;
  let targetGenre = GENRES.find((g) => g.id !== base.genre)?.id || 'dnb';

  root.append(header('🧬 Remix ton idée', 'Développe une idée au lieu d’en commencer une nouvelle : chaque transformation t’explique ce qui change et pourquoi'));

  const baseEl = el('div');
  const listEl = el('div');
  let playingId = null;
  const toggle = (id, getP) => {
    if (playingId === id) { stopAll(); playingId = null; refresh(); return; }
    playingId = id;
    playProject(getP);
    refresh();
  };

  const drawBase = () => {
    baseEl.replaceChildren(card(
      el('div.row.between', el('h3', `🎯 Base : ${baseLabel}`), history.length ? el('span.small.muted', `${history.length} transformation(s) empilée(s)`) : null),
      el('p.small.muted', describe(base)),
      history.length ? el('p.small', '🧬 ', history.join(' → ')) : null,
      el('div.row.gap.wrap',
        el('button.btn.small' + (playingId === 'base' ? '.primary' : ''), { onclick: () => toggle('base', () => base) }, playingId === 'base' ? '■ Stop' : '▶ Écouter la base'),
        ideas.length ? select([{ value: '', label: '📓 Partir d’une idée du Carnet…' }, ...ideas.map((n) => ({ value: n.id, label: n.title }))], '', (v) => {
          const it = ideas.find((n) => String(n.id) === v);
          if (!it) return;
          base = JSON.parse(JSON.stringify(it.project)); baseLabel = it.title; history.length = 0; variants.length = 0;
          stopAll(); playingId = null; refresh();
        }) : null),
    ));
  };

  const variants = [];
  const genreSel = select(GENRES.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}` })), targetGenre, (v) => { targetGenre = v; });
  const run = (id) => {
    const r = TRANSFORMS[id].run(base, targetGenre);
    variants.unshift({ ...r, id: `${id}-${Date.now()}`, tid: id });
    if (variants.length > 6) variants.pop();
    stopAll(); playingId = variants[0].id; playProject(() => variants[0].project);
    refresh();
  };

  const drawList = () => {
    listEl.replaceChildren(...variants.map((v) => card(
      el('div.row.between', el('h3', `${TRANSFORMS[v.tid].emoji} ${v.title}`)),
      el('p', v.what),
      el('div.lesson', el('div.lesson-title', '🧠 Pourquoi ça marche'), el('p', v.why)),
      el('div.row.gap.wrap',
        el('button.btn.small' + (playingId === v.id ? '.primary' : ''), { onclick: () => toggle(v.id, () => v.project) }, playingId === v.id ? '■ Stop' : '▶ Écouter'),
        el('button.btn.small', { onclick: () => toggle('base', () => base) }, '▶ Comparer avec la base'),
        el('button.btn.small', {
          onclick: () => { base = v.project; history.push(v.title); variants.length = 0; stopAll(); playingId = null; toast('Transformation empilée : applique-en une autre par-dessus'); refresh(); },
        }, '⤵ Empiler une transformation'),
        el('button.btn.small.primary', {
          onclick: () => {
            stopAll(); playingId = null;
            update((st) => {
              st.project = JSON.parse(JSON.stringify(v.project));
              st.notebook.unshift({ id: Date.now(), type: 'idea', title: `${baseLabel} — ${v.title}`, note: [...history, v.title].join(' → '), date: Date.now(), genre: v.project.genre, project: JSON.parse(JSON.stringify(v.project)) });
            });
            if (kept) { toast('Variante gardée dans le Carnet 📓', 'good'); refresh(); return; }
            kept = true;
            finishExercise({ key: 'remix', title: 'Idée développée', xp: 25 + history.length * 5, skill: 'autonomie', genre: v.project.genre, success: true,
              lesson: 'Un producteur finit des morceaux en développant ses idées : changer le style, le mode, l’harmonie ou les rôles d’une même idée donne des variations pour un couplet, un break ou un remix.',
              transfer: 'Dans Live : duplique ta scène, applique UNE transformation (ex. snare au 3e temps, accords en mineur) et garde les deux versions pour l’arrangement.' });
          },
        }, '💾 Garder'),
      ))));
  };

  const refresh = () => { drawBase(); drawList(); };

  root.append(
    baseEl,
    card(el('h3', '🔧 Transformations'),
      el('div.row.gap.wrap', el('button.btn.small', { onclick: () => run('genre') }, `${TRANSFORMS.genre.emoji} ${TRANSFORMS.genre.name} →`), genreSel),
      el('div.row.gap.wrap', { style: { marginTop: '8px' } }, Object.entries(TRANSFORMS).filter(([id]) => id !== 'genre').map(([id, t]) => el('button.btn.small', { onclick: () => run(id) }, `${t.emoji} ${t.name}`))),
      el('p.small.muted', 'Astuce : empile 2 transformations (ex. half-time + mode mineur) pour créer un break ou un 2e drop.')),
    listEl,
  );
  refresh();
  return () => stopAll();
}
