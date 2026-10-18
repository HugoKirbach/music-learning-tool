// Projet de la semaine : chaque jour, un exercice nourrit le même morceau, exporté vers Ableton le dimanche.
import { el, header, card, select, downloadMidi, toast, confetti } from '../ui.js';
import { getState, update, projectFromGenre, recordExercise } from '../store.js';
import { GENRES, genreById } from '../data/genres.js';
import { projectToSong } from '../core/arrange.js';
import { arrangementToSong } from '../core/arrangement.js';
import { genreOfDay } from '../core/daily.js';
import { PROJECT_STEPS, projectProgress, weekId, weekday, addDays } from '../core/pedagogy.js';
import { dayKey } from '../core/progress.js';
import { exportStems, stemsSupported, exportLivePack } from '../stems.js';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export function render(root) {
  root.append(header('🏁 Projet de la semaine', 'Un seul morceau, construit un peu chaque jour : beat, accords, basse, hook, arrangement, son, puis export vers Live.', '#/home'));
  const body = el('div');
  root.append(body);
  const week = weekId();

  function paint() {
    const s = getState();
    const p = (s.weekProjects || {})[week];
    if (!p) return startScreen(s);
    const prog = projectProgress(s, p);
    const today = weekday();
    if (prog.finished && !p.finished) finishProject(p);
    const g = genreById(p.genre);
    body.replaceChildren(
      el('div.card.glow',
        el('div.row.between', el('div', el('b', `${g.emoji} ${p.title}`), el('div.small.muted', `${g.name} · semaine du ${new Date(`${week}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`)),
          el('b.big-val', `${prog.count}/${prog.total}`)),
        el('div.bar', el('div.bar-fill', { style: { width: `${(prog.count / prog.total) * 100}%` } })),
        el('p.small.muted', 'Les étapes se valident en faisant l’exercice correspondant (dans l’ordre que tu veux). Ton idée en cours = ton projet : tout ce que tu fais dans les Labs s’y ajoute.')),
      el('div.project-steps', PROJECT_STEPS.map((st) => {
        const done = prog.done[st.id];
        const isToday = st.day === today;
        return el('div.project-step' + (done ? '.done' : '') + (isToday ? '.today' : ''),
          el('span.ps-day', DAYS[st.day].slice(0, 3)),
          el('span.ps-emoji', done ? '✅' : st.emoji),
          el('div.ps-txt', el('b', st.title), el('small', done ? `Fait le ${new Date(`${done}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long' })}` : st.desc)),
          st.id === 'export' ? null : el('a.btn.small' + (isToday && !done ? '.primary' : ''), { href: st.route }, done ? 'Revoir' : 'Ouvrir'));
      })),
      card(el('h3', '📤 Export vers Ableton Live'),
        el('p.small.muted', 'Le MIDI contient une piste par instrument (batterie, accords, basse, mélodie) au bon tempo. Les pistes audio (WAV) se glissent directement dans Live ou dans le MPC.'),
        el('div.row.gap.wrap',
          el('button.btn', { onclick: () => exportMidi(p) }, '⬇ MIDI (boucle)'),
          s.arrangement ? el('button.btn', { onclick: () => exportMidi(p, true) }, '⬇ MIDI (arrangement complet)') : null,
          stemsSupported() ? el('button.btn', { onclick: async (e) => { e.target.disabled = true; try { await exportStems(getState().project, p.title); markExport(); } finally { e.target.disabled = false; } } }, '⬇ Pistes audio (WAV)') : null,
          stemsSupported() ? el('button.btn.primary', { onclick: async (e) => { e.target.disabled = true; try { await exportLivePack(getState().project, { title: p.title, arrangement: getState().arrangement }); markExport(); } finally { e.target.disabled = false; } } }, '📦 Pack Live complet') : null),
        el('p.small', '🎛️ Dans Live : glisse le fichier .mid dans la vue Arrangement, puis assigne tes instruments (Drum Rack, Serum 2…) à chaque piste.')),
      p.finished ? el('div.card.levelup', '🏆 Projet terminé ! Il est rangé dans ton Carnet. Un nouveau projet t’attend lundi.') : null,
      pastProjects(s),
    );
  }

  function exportMidi(p, full = false) {
    const pr = getState().project;
    downloadMidi(`projet-${week}-${pr.genre}-${pr.bpm}bpm${full ? '-arrangement' : ''}`, full ? arrangementToSong(pr, getState().arrangement) : projectToSong(pr));
    markExport();
  }
  function markExport() {
    recordExercise({ key: 'project:export', title: 'Projet de la semaine · export', xp: 15, skill: 'autonomie', success: true });
    setTimeout(paint, 200);
  }

  function finishProject(p) {
    update((s) => {
      const wp = s.weekProjects[week];
      wp.finished = dayKey();
      s.notebook.unshift({ id: Date.now(), type: 'idea', title: `🏁 ${wp.title}`, note: 'Projet de la semaine terminé', date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)), arrangement: s.arrangement ? JSON.parse(JSON.stringify(s.arrangement)) : undefined });
    });
    recordExercise({ key: 'project:done', title: 'Projet de la semaine terminé', xp: 100, skill: 'autonomie', success: true });
    confetti();
    toast('🏆 Projet de la semaine terminé ! +100 XP', 'good', 4000);
  }

  function startScreen(s) {
    const suggested = genreOfDay(week);
    let genre = suggested.id;
    const title = el('input', { type: 'text', value: `Projet ${suggested.name}`, maxlength: 40 });
    body.replaceChildren(
      el('div.card.glow',
        el('h3', '🗓️ Une semaine, un morceau'),
        el('ul.rush-points', PROJECT_STEPS.map((st) => el('li', el('b', `${DAYS[st.day]} · ${st.emoji} ${st.title}`), ` — ${st.desc}`))),
        el('p.small.muted', 'Tu peux prendre de l’avance ou rattraper une étape : seul compte qu’elles soient toutes faites avant dimanche soir.'),
        el('div.ctrl-row', el('label', 'Style'), select(GENRES.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}${g.id === suggested.id ? ' (style de la semaine)' : ''}` })), genre, (v) => { genre = v; title.value = `Projet ${genreById(v).name}`; })),
        el('div.ctrl-row', el('label', 'Nom'), title),
        el('p.small.muted', 'Ton idée en cours est rangée dans le Carnet, puis une nouvelle idée démarre dans ce style.'),
        el('button.btn.primary.wide', {
          onclick: () => {
            update((st) => {
              st.notebook.unshift({ id: Date.now(), type: 'idea', title: `Idée ${genreById(st.project.genre).name} (avant le projet)`, date: Date.now(), genre: st.project.genre, project: JSON.parse(JSON.stringify(st.project)) });
              st.project = projectFromGenre(genre);
              st.weekProjects = { ...(st.weekProjects || {}), [week]: { week, startedDay: dayKey(), genre, title: title.value.trim() || `Projet ${genreById(genre).name}` } };
            });
            toast('C’est parti ! Commence par le beat 🥁', 'good');
            paint();
          },
        }, '🚀 Démarrer le projet')),
      pastProjects(s),
    );
  }

  function pastProjects(s) {
    const past = Object.values(s.weekProjects || {}).filter((p) => p.week !== week).sort((a, b) => b.week.localeCompare(a.week)).slice(0, 6);
    if (!past.length) return null;
    return card(el('h3', '📚 Projets précédents'), past.map((p) => {
      const pr = projectProgress(s, p);
      return el('div.friend-req', el('span', `${genreById(p.genre).emoji} ${p.title}`, el('small.muted', ` · ${new Date(`${p.week}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`)), el('b', p.finished ? '🏆' : `${pr.count}/${pr.total}`));
    }));
  }

  paint();
}

