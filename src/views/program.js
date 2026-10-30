// Programme de 4 semaines : un thème par semaine, une session par jour, un mini-projet le 7e jour.
import { el, card, header, finishExercise, toast, confetti, plural } from '../ui.js';
import { getState, update, dueEarReviews } from '../store.js';
import { PROGRAM, PROGRAM_DAYS, dayInfo, projectName } from '../data/program.js';
import { dayKey } from '../core/progress.js';
import { remindersCard } from './reminderscard.js';

export { makeIcs } from './reminderscard.js';

export function currentDay(s = getState()) {
  for (let i = 0; i < PROGRAM_DAYS; i++) if (!s.program.done[i]) return i;
  return PROGRAM_DAYS;
}

/** Lance la session d'un jour du programme (réutilise le mécanisme des sessions express). */
export function startProgramDay(i) {
  const { week, day, isProject } = dayInfo(i);
  if (isProject) { location.hash = `#/program?project=${week}`; return; }
  const steps = PROGRAM[week].days[day].map((x) => ({ ...x }));
  const due = dueEarReviews().length;
  if (due >= 3 && steps[0].key.startsWith('ear:')) {
    steps[0] = { key: 'ear:review', title: 'Révisions', desc: `${due} notions ratées à revoir`, route: '#/ear?mode=review', skill: 'oreille', min: 2 };
  }
  update((s) => {
    s.program.startedAt = s.program.startedAt || dayKey();
    s.session = { seed: `program-${i}`, focus: steps[1].skill, genre: '', steps, day: dayKey(), idx: 0, done: steps.map(() => false), finished: false, programDay: i };
  });
  location.hash = steps[0].route;
}

export function render(root, params) {
  if (params.project != null) return projectView(root, +params.project);
  const s = getState();
  const cur = currentDay(s);
  const doneCount = Object.keys(s.program.done).length;

  root.append(header('📅 Programme 4 semaines', 'Une session par jour (5-10 min), un thème par semaine, un mini-projet le 7e jour. Les notions ratées reviennent en révision.'));

  root.append(card(
    el('div.row.between', el('b', cur >= PROGRAM_DAYS ? '🏆 Programme terminé !' : `Semaine ${dayInfo(cur).week + 1} · Jour ${dayInfo(cur).day + 1}`), el('span.small.muted', `${doneCount}/${PROGRAM_DAYS} jours`)),
    el('div.bar', el('div.bar-fill', { style: { width: `${Math.round((100 * doneCount) / PROGRAM_DAYS)}%` } })),
    cur < PROGRAM_DAYS
      ? el('button.btn.primary.big.wide', { onclick: () => startProgramDay(cur) }, dayInfo(cur).isProject ? `🏁 Ouvrir le ${dayInfo(cur).w.project.label.toLowerCase()}` : `▶ ${doneCount ? 'Continuer' : 'Commencer'} : jour ${cur + 1}`)
      : el('p', 'Bravo ! Tu peux refaire n’importe quel jour, ou recommencer avec d’autres styles via les sessions express.'),
    el('p.small.muted', 'Conseil : un jour du programme par jour. Les autres sessions de la journée peuvent être des sessions express ou des révisions.'),
  ));

  PROGRAM.forEach((w, wi) => {
    const days = Array.from({ length: 7 }, (_, d) => wi * 7 + d);
    const open = days.includes(cur) || (cur >= PROGRAM_DAYS && wi === 3);
    root.append(el('details.card.prog-week', { open },
      el('summary', el('b', `${w.emoji} Semaine ${wi + 1} : ${w.theme}`), el('span.prog-count', `${days.filter((i) => s.program.done[i]).length}/7`)),
      el('p.small.muted', w.intro),
      el('ol.session-steps', days.map((i) => {
        const { day, isProject } = dayInfo(i);
        const done = !!s.program.done[i];
        const locked = i > cur;
        const titles = isProject ? w.project.title : w.days[day].map((x) => x.title).join(' · ');
        return el('li' + (done ? '.done' : i === cur ? '.current' : ''),
          el('span.step-num', done ? '✓' : locked ? '🔒' : String(day + 1)),
          el('span.step-info', el('b', isProject ? `🏁 ${w.project.label}` : `Jour ${day + 1}`), el('span', titles)),
          locked ? null : el('button.btn.small' + (i === cur ? '.primary' : ''), { onclick: () => startProgramDay(i), 'aria-label': `${done ? 'Refaire' : 'Lancer'} : ${isProject ? w.project.label : `jour ${day + 1}`}` }, done ? '↻' : '▶'));
      })),
    ));
  });

  // Rappel quotidien : la même carte que dans les Réglages (un seul réglage, settings.reminders)
  root.append(remindersCard());
}

function projectView(root, wi) {
  const w = PROGRAM[wi];
  if (!w) { location.hash = '#/program'; return; }
  const idx = wi * 7 + 6;
  const checks = (getState().program.checks || {})[wi] || [];
  const note = el('textarea', { placeholder: 'Notes : ce que tu as appris, ce que tu referais autrement…' });
  const items = w.project.checklist.map((t, i) => {
    const li = el('li' + (checks[i] ? '.checked' : ''), {
      onclick: () => {
        li.classList.toggle('checked');
        update((s) => { s.program.checks = s.program.checks || {}; const c = s.program.checks[wi] || []; c[i] = li.classList.contains('checked'); s.program.checks[wi] = c; });
      },
    }, t);
    return li;
  });
  root.append(
    header(`🏁 ${w.project.title}`, `${w.project.label} · semaine ${wi + 1} · ${w.theme}`, '#/program'),
    card(el('p', el('b', '🎯 Objectif : '), w.project.goal),
      el('p.small.muted', 'À faire sur Ableton Live 12 / MPC Key 37 / Serum 2, en une ou plusieurs fois. Touche une étape pour la cocher.'),
      el('ol.mission-steps', items)),
    card(note, el('button.btn.primary.wide', {
      onclick: () => {
        const done = items.filter((li) => li.classList.contains('checked')).length;
        if (done < items.length - 1) return toast(`Encore ${plural(items.length - 1 - done, 'étape')} à cocher (tu peux en laisser une de côté)`, 'bad');
        const d = dayKey();
        update((s) => {
          s.program.done[idx] = d;
          if (note.value.trim()) s.notebook.unshift({ id: Date.now(), type: 'note', title: projectName(w), note: note.value.trim(), date: Date.now() });
        });
        confetti();
        finishExercise({ key: 'program:project', title: projectName(w), xp: 120, skill: 'autonomie', success: true,
          lesson: `Semaine « ${w.theme} » bouclée. Ce ${w.project.label.toLowerCase()} est la preuve que tu sais appliquer seul ce que tu as entraîné.`,
          transfer: wi < 3 ? `La semaine ${wi + 2} (${PROGRAM[wi + 1].theme}) commence demain.` : 'Programme terminé : garde l’habitude avec une session express par jour et une mission studio par semaine.' });
      },
    }, `✓ ${w.project.label} terminé`)),
  );
}
