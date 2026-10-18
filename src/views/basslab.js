// Labo de basse : écris ta ligne, l'app la critique comme un prof et propose 3 variantes argumentées.
import { el, card, header, segmented, finishExercise, toast, downloadMidi, select } from '../ui.js';
import { getState, update } from '../store.js';
import { critiqueBass, bassVariants, lineToNotes, notesToLine, BASS_LOW, BASS_HIGH } from '../core/basscritic.js';
import { voiceProgression, eventsAt, MELODY_STEPS } from '../core/arrange.js';
import { scaleNotes, midiToName, NOTE_NAMES, SCALES, mod } from '../core/theory.js';
import { transport, playSynth, playDrum, ensureAudio } from '../core/audio.js';
import { presetParams, previewNote } from '../player.js';
import { presetOptions } from '../data/presets.js';

/** Ligne de basse actuelle : celle écrite, sinon celle produite par le motif de basse du style. */
function currentLine(p) {
  if (p.bassLine) return p.bassLine.map((x) => (x ? { ...x } : null));
  const v = voiceProgression(p);
  const line = new Array(MELODY_STEPS).fill(null);
  for (let s = 0; s < MELODY_STEPS; s++) {
    const b = eventsAt(p, v, s).bass[0];
    if (b) line[s] = { n: b.note, len: Math.max(1, Math.round(b.len)) };
  }
  return line;
}

export function render(root) {
  const p0 = getState().project;
  let line = currentLine(p0);
  let bar = 0, dur = 2, playing = -1, variants = null, rewarded = false;
  const voiced = voiceProgression(p0);
  const rows = scaleNotes(p0.rootPc, p0.scale, BASS_LOW, BASS_HIGH).reverse();
  const kick = p0.drums.kick;

  root.append(header('🎸 Labo de basse', 'Écris ta ligne, l’app la critique comme un prof et te propose 3 variantes'));

  const rollEl = el('div.roll');
  const tabs = el('div.bar-tabs');
  const critEl = el('div');
  const varEl = el('div');

  const crit = () => critiqueBass(lineToNotes(line), voiced, kick, p0.rootPc, p0.scale);

  const drawTabs = () => {
    tabs.replaceChildren(...[0, 1, 2, 3].map((b) => el('button.btn.small' + (b === bar ? '.primary' : ''), { onclick: () => { bar = b; drawRoll(); drawTabs(); } },
      `M${b + 1}${voiced[b] ? ' · ' + voiced[b].symbol : ''}`)));
  };

  const drawRoll = () => {
    const c = crit();
    const issueSteps = new Set(c.issues.map((i) => i.s));
    const owner = new Array(MELODY_STEPS).fill(-1);
    line.forEach((m, i) => { if (m) for (let k = 0; k < m.len && i + k < MELODY_STEPS; k++) owner[i + k] = i; });
    const pcs = voiced[bar]?.pcs || [];
    rollEl.replaceChildren(...rows.map((n) => el('div.roll-row',
      el('span.nlabel' + (mod(n - p0.rootPc, 12) === 0 ? '.tonic' : ''), { onclick: () => previewNote(n, p0.sounds.bass) }, midiToName(n)),
      Array.from({ length: 16 }, (_, s) => {
        const g = bar * 16 + s;
        const o = owner[g];
        const on = line[g] && line[g].n === n;
        const tail = !on && o >= 0 && line[o].n === n;
        let cls = 'button.rcell';
        if (s % 4 === 0) cls += '.beat';
        if (pcs.includes(mod(n, 12))) cls += '.chordtone';
        if (on) cls += '.on';
        if (tail) cls += '.tail';
        if (on && issueSteps.has(g)) cls += '.issue';
        if (kick[s]) cls += '.kickcol';
        if (playing === g) cls += '.play';
        return el(cls, { type: 'button', onclick: () => toggle(g, n) });
      }))));
    drawCritique(c);
  };

  const toggle = (g, n) => {
    if (line[g] && line[g].n === n) line[g] = null;
    else {
      line[g] = { n, len: dur };
      for (let k = g - 1; k >= Math.max(0, g - 16); k--) if (line[k]) { if (k + line[k].len > g) line[k].len = g - k; break; }
      for (let k = 1; k < dur && g + k < MELODY_STEPS; k++) line[g + k] = null;
      previewNote(n, p0.sounds.bass, 0.25);
    }
    drawRoll();
  };

  function drawCritique(c) {
    const color = c.score >= 85 ? 'var(--good)' : c.score >= 60 ? 'var(--warn)' : 'var(--bad)';
    critEl.replaceChildren(
      el('div.row.between', el('h3', '🧑‍🏫 Critique'), el('b', { style: { color } }, `${c.score}/100`)),
      el('div.meter', el('div', { style: { width: `${c.score}%`, background: color } })),
      c.issues.length ? el('ul.clean', c.issues.slice(0, 6).map((i) => el('li', el('a', { href: 'javascript:void 0', onclick: () => { bar = Math.floor(i.s / 16); drawTabs(); drawRoll(); } }, `M${Math.floor(i.s / 16) + 1}`), ' — ', i.msg))) : el('p', '✅ Aucun problème relevé.'),
      c.goods.length ? el('ul.clean.small', { style: { color: 'var(--good)' } }, c.goods.slice(0, 4).map((g) => el('li', g))) : null,
      el('p.small.muted', 'Cases teintées = notes de l’accord · contour rouge = note qui pose problème · colonnes marquées = kicks.'),
    );
  }

  // ---------- Lecture ----------
  const play = (getLine) => {
    ensureAudio();
    const p = getState().project, sd = 60 / p.bpm / 4, bassP = presetParams(p.sounds.bass);
    let last = null;
    transport.start((step, time) => {
      const g = step % 64;
      const ev = eventsAt({ ...p, bassLine: null, bassStyle: 'none' }, voiced, g);
      ev.drums.forEach((d) => playDrum(d.id, time, d.vel, p.kit));
      ev.chords.forEach((c) => c.notes.forEach((n) => playSynth(presetParams(p.sounds.chords), n, time, c.len * sd * 0.95, 0.5)));
      const b = getLine()[g];
      if (b) { playSynth(bassP, b.n, time, b.len * sd * 0.92, 0.85, { send: 0, fromMidi: last }); last = b.n; }
    }, (step) => { playing = step % 64; if (Math.floor(playing / 16) === bar) drawRoll(); }, { bpm: p.bpm, swing: p.swing });
  };
  const stop = () => { transport.stop(); playing = -1; drawRoll(); };

  const showVariants = () => {
    variants = bassVariants(voiced, kick, p0.rootPc, p0.scale);
    varEl.replaceChildren(card(el('h3', '🔀 3 variantes à comparer'),
      el('p.small.muted', 'Écoute chacune sur la boucle, puis ta version : laquelle sert le mieux le morceau, et pourquoi ?'),
      variants.map((v) => {
        const c = critiqueBass(v.notes, voiced, kick, p0.rootPc, p0.scale);
        const vl = notesToLine(v.notes);
        return el('div.cr-result',
          el('div.row.between', el('b', `${v.emoji} ${v.name}`), el('span.small.muted', `critique ${c.score}/100`)),
          el('p.small', v.why),
          el('div.row.gap.wrap',
            el('button.btn.small', { onclick: () => play(() => vl) }, '▶ Écouter'),
            el('button.btn.small', { onclick: () => { line = vl.map((x) => (x ? { ...x } : null)); stop(); toast(`Variante « ${v.name} » chargée : modifie-la à ta sauce`, 'good'); } }, '✎ Partir de celle-ci')));
      })));
  };

  root.append(
    card(
      el('div.ctrl-row',
        el('button.btn.play', { onclick: (e) => { if (transport.playing) { stop(); e.target.textContent = '▶ Ma basse'; } else { play(() => line); e.target.textContent = '■ Stop'; } } }, '▶ Ma basse'),
        select(presetOptions((x) => x.role === 'bass'), p0.sounds.bass, (v) => update((s) => { s.project.sounds.bass = v; })),
        el('span.small.muted', `${NOTE_NAMES[p0.rootPc]} ${SCALES[p0.scale].name} · ${p0.bpm} BPM`)),
      el('div.ctrl-row', el('label', 'Durée'), segmented([{ value: 1, label: '1/16' }, { value: 2, label: '1/8' }, { value: 4, label: '1/4' }, { value: 8, label: '1/2' }], dur, (v) => { dur = v; }),
        el('button.btn.small.ghost', { onclick: () => { line = new Array(MELODY_STEPS).fill(null); drawRoll(); } }, '🗑 Vider')),
      tabs,
      el('div.roll-wrap', rollEl),
    ),
    card(critEl),
    el('div.row.gap.wrap', { style: { margin: '0 0 12px' } },
      el('button.btn', { onclick: showVariants }, '🔀 Proposer 3 variantes'),
      el('button.btn', { onclick: () => downloadMidi(`basse-${p0.genre}-${p0.bpm}bpm`, { bpm: p0.bpm, tracks: [{ name: 'Basse', notes: lineToNotes(line).map((x) => ({ pitch: x.n, start: x.s / 4, dur: x.len / 4, vel: 100 })) }] }) }, '⬇ MIDI'),
      el('button.btn.primary', {
        onclick: () => {
          const c = crit();
          if (lineToNotes(line).length < 3) return toast('Écris au moins 3 notes', 'bad');
          stop();
          update((s) => { s.project.bassLine = line.map((x) => (x ? { ...x } : null)); });
          if (rewarded) return toast('Basse enregistrée dans ton idée ✓', 'good');
          rewarded = true;
          finishExercise({ key: 'bass:critique', title: 'Ligne de basse', score: c.score, xp: 15 + c.score / 4, skill: 'harmonie', genre: p0.genre, success: c.score >= 70,
            lesson: 'Une bonne basse ancre l’accord (fondamentale sur le 1), laisse de la place au kick et « marche » vers l’accord suivant. Le reste est une question de style.',
            transfer: 'Dans Live : joue ta basse au MPC Key 37 avec Scale activé, puis compare deux versions (fondamentales seules / avec notes d’approche) sur le même groove.' });
        },
      }, '✓ Utiliser dans mon idée'),
    ),
    varEl,
  );
  drawTabs();
  drawRoll();
  return () => transport.stop();
}
