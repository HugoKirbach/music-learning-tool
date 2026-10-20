import { el, card, header, finishExercise, shuffle, toast } from '../ui.js';
import { getState, update, level, recordReview, dueEarReviews } from '../store.js';
import { recurringErrors, drillPlan } from '../core/mistakes.js';
import { dayKey } from '../core/progress.js';
import { INTERVALS, midiToName, slotChord, voiceLead, mod, detectChord } from '../core/theory.js';
import { gridFromPatterns, DRUM_ROWS, VEL } from '../core/rhythm.js';
import { ensureAudio, now, playSynth, playDrum, kitForGenre } from '../core/audio.js';
import { presetParams } from '../player.js';
import { GENRES } from '../data/genres.js';
import { PRESETS } from '../data/presets.js';
import { paramById, getPath, setPath, normalizeParams, CHALLENGE_VALUES } from '../core/synthparams.js';
import { phrase, keyboard } from './synth.js';
import { onMidi, midiStatus } from '../midiin.js';

const MODES = {
  intervals: { name: 'Intervalles', emoji: '📏', skill: 'oreille', desc: 'Distance entre deux notes : la base pour relever des mélodies.' },
  chords: { name: 'Couleurs d’accords', emoji: '🎨', skill: 'oreille', desc: 'Majeur, mineur, 7e… reconnaître l’émotion d’un accord.' },
  progressions: { name: 'Progressions', emoji: '🧭', skill: 'harmonie', desc: 'Identifier les enchaînements classiques.' },
  genre: { name: 'Blind test rythmique', emoji: '🥁', skill: 'rythme', desc: 'Reconnaître un style à son groove.' },
  sound: { name: 'Quel paramètre ?', emoji: '🎛️', skill: 'sound', desc: 'A/B : qu’est-ce qui a changé dans le son ?' },
};

const CHORD_SETS = [
  { id: 'maj', label: 'Majeur', iv: [0, 4, 7], tip: 'Stable, lumineux' },
  { id: 'min', label: 'Mineur', iv: [0, 3, 7], tip: 'Sombre, mélancolique' },
  { id: 'dim', label: 'Diminué', iv: [0, 3, 6], tip: 'Tendu, instable' },
  { id: 'aug', label: 'Augmenté', iv: [0, 4, 8], tip: 'Étrange, rêve' },
  { id: 'sus4', label: 'Sus4', iv: [0, 5, 7], tip: 'Suspendu, ouvert' },
  { id: 'maj7', label: 'Maj7', iv: [0, 4, 7, 11], tip: 'Doux, jazzy, nostalgique' },
  { id: 'm7', label: 'm7', iv: [0, 3, 7, 10], tip: 'Mineur velouté (deep house)' },
  { id: '7', label: '7 (dominante)', iv: [0, 4, 7, 10], tip: 'Bluesy, appelle une résolution' },
  { id: 'm7b5', label: 'm7b5', iv: [0, 3, 6, 10], tip: 'Sombre et jazz' },
];

const PROGS = [
  { label: 'I – V – vi – IV', scale: 'major', d: [0, 4, 5, 3] },
  { label: 'vi – IV – I – V', scale: 'major', d: [5, 3, 0, 4] },
  { label: 'I – vi – IV – V', scale: 'major', d: [0, 5, 3, 4] },
  { label: 'I – IV – V – IV', scale: 'major', d: [0, 3, 4, 3] },
  { label: 'ii – V – I – I', scale: 'major', d: [1, 4, 0, 0] },
  { label: 'IV – V – iii – vi', scale: 'major', d: [3, 4, 2, 5] },
  { label: 'i – VI – III – VII', scale: 'minor', d: [0, 5, 2, 6] },
  { label: 'i – VII – VI – VII', scale: 'minor', d: [0, 6, 5, 6] },
  { label: 'i – iv – v – i', scale: 'minor', d: [0, 3, 4, 0] },
  { label: 'i – VI – VII – i', scale: 'minor', d: [0, 5, 6, 0] },
];

const SOUND_Q = {
  cutoff: 'Brillance (cutoff du filtre)', q: 'Résonance du filtre', attack: 'Attaque (enveloppe)', release: 'Release (queue)',
  wave1: 'Forme d’onde', voices: 'Unison (largeur)', lfoTarget: 'LFO (mouvement)', drive: 'Distorsion / drive', envAmt: 'Enveloppe de filtre (pluck)',
  sustain: 'Sustain', decay: 'Decay',
};

export function makeQuestion(mode, lv, i, forced = null) {
  const t = () => now() + 0.08;
  const q = makeQuestionInner(mode, lv, forced, t);
  return { ...q, mode, reviewKey: `${mode}:${q.answer}` };
}

function makeQuestionInner(mode, lv, forced, t) {
  if (mode === 'intervals') {
    const pool = lv < 3 ? [3, 4, 5, 7, 12] : lv < 6 ? [2, 3, 4, 5, 7, 9, 10, 12] : INTERVALS.map((x) => x.st);
    const st = forced != null ? +forced : pool[Math.floor(Math.random() * pool.length)];
    if (!pool.includes(st)) pool.push(st);
    const root = 48 + Math.floor(Math.random() * 13);
    const harmonic = lv >= 8 && Math.random() < 0.4;
    const desc = lv >= 5 && Math.random() < 0.3;
    const info = INTERVALS.find((x) => x.st === st);
    const opts = shuffle([st, ...shuffle(pool.filter((x) => x !== st)).slice(0, 3)]);
    return {
      prompt: harmonic ? 'Deux notes jouées ensemble' : desc ? 'Intervalle descendant' : 'Intervalle ascendant',
      play: () => {
        const p = presetParams('piano');
        const a = desc ? root + st : root, b = desc ? root : root + st;
        playSynth(p, a, t(), 0.9, 0.8);
        playSynth(p, b, t() + (harmonic ? 0 : 0.6), 0.9, 0.8);
      },
      options: opts.map((x) => ({ value: x, label: INTERVALS.find((y) => y.st === x).name })),
      answer: st,
      notes: desc ? [root + st, root] : [root, root + st],
      explain: `${info.name} (${info.st} demi-tons) — repère : ${info.hint}. Ici ${midiToName(root)} → ${midiToName(desc ? root : root + st)}.`,
    };
  }
  if (mode === 'chords') {
    const ids = lv < 3 ? ['maj', 'min'] : lv < 5 ? ['maj', 'min', 'dim', 'aug', 'sus4'] : lv < 8 ? ['maj', 'min', 'maj7', 'm7', '7', 'sus4'] : CHORD_SETS.map((c) => c.id);
    if (forced && CHORD_SETS.some((c) => c.id === forced) && !ids.includes(forced)) ids.push(forced);
    const pickId = forced && ids.includes(forced) ? forced : ids[Math.floor(Math.random() * ids.length)];
    const c = CHORD_SETS.find((x) => x.id === pickId);
    const root = 50 + Math.floor(Math.random() * 10);
    return {
      prompt: 'Quelle couleur d’accord ?',
      play: () => {
        const p = presetParams('piano');
        c.iv.forEach((iv, k) => playSynth(p, root + iv, t() + k * 0.12, 0.6, 0.7));
        c.iv.forEach((iv) => playSynth(p, root + iv, t() + c.iv.length * 0.12 + 0.3, 1.4, 0.7));
      },
      options: ids.map((id) => ({ value: id, label: CHORD_SETS.find((x) => x.id === id).label })),
      answer: c.id,
      notes: c.iv.map((iv) => root + iv),
      explain: `${c.label} : ${c.tip}. Intervalles : ${c.iv.join('-')} demi-tons.`,
    };
  }
  if (mode === 'progressions') {
    const pool = lv < 4 ? PROGS.slice(0, 4).concat(PROGS.slice(6, 8)) : [...PROGS];
    const pr = PROGS.find((x) => x.label === forced) || pool[Math.floor(Math.random() * pool.length)];
    if (!pool.includes(pr)) pool.push(pr);
    const same = pool.filter((x) => x !== pr && x.scale === pr.scale);
    const opts = shuffle([pr, ...shuffle(same).slice(0, 3)]);
    const tonic = Math.floor(Math.random() * 12);
    return {
      prompt: pr.scale === 'major' ? 'Progression en majeur' : 'Progression en mineur',
      play: () => {
        let prev = null;
        const p = presetParams('piano');
        const bass = presetParams('sub');
        pr.d.forEach((deg, k) => {
          const c = slotChord(tonic, pr.scale, { deg }, 3);
          const v = voiceLead(prev, c.pcs, 62); prev = v;
          v.forEach((n) => playSynth(p, n, t() + k * 0.9, 0.85, 0.65));
          playSynth(bass, 36 + mod(c.rootPc, 12), t() + k * 0.9, 0.85, 0.8, { send: 0 });
        });
      },
      options: opts.map((x) => ({ value: x.label, label: x.label })),
      answer: pr.label,
      explain: `${pr.label}. Astuce : écoute la BASSE. Le I/i sonne « à la maison », le V tire vers le I, le IV « décolle ».`,
    };
  }
  if (mode === 'genre') {
    const g = GENRES.find((x) => x.id === forced) || GENRES[Math.floor(Math.random() * GENRES.length)];
    const opts = shuffle([g, ...shuffle(GENRES.filter((x) => x !== g && Math.abs(x.bpm - g.bpm) < 40)).slice(0, 3)]);
    while (opts.length < 4) { const x = GENRES[Math.floor(Math.random() * GENRES.length)]; if (!opts.includes(x)) opts.push(x); }
    return {
      prompt: 'Quel style ?',
      play: () => {
        const grid = gridFromPatterns(g.drums);
        const sd = 60 / g.bpm / 4, kit = kitForGenre(g.id);
        const t0 = t();
        for (let s = 0; s < 32; s++) {
          const off = s % 2 ? g.swing * sd * 0.66 : 0;
          for (const r of DRUM_ROWS) { const v = grid[r.id][s % 16]; if (v) playDrum(r.id, t0 + s * sd + off, VEL[v] / 127, kit); }
        }
      },
      options: shuffle(opts).map((x) => ({ value: x.id, label: `${x.emoji} ${x.name}` })),
      answer: g.id,
      genre: g.id,
      explain: `${g.emoji} ${g.name} (${g.bpm} BPM) : ${g.signature.join(' · ')}.`,
    };
  }
  // sound
  const baseId = shuffle(['pluck', 'pad', 'squarelead', 'stab', 'reese'])[0];
  const base = normalizeParams(PRESETS[baseId].params);
  const pool = lv < 4 ? ['cutoff', 'attack', 'wave1', 'lfoTarget', 'release'] : Object.keys(SOUND_Q);
  const id = SOUND_Q[forced] ? forced : pool[Math.floor(Math.random() * pool.length)];
  if (!pool.includes(id)) pool.push(id);
  const def = paramById(id);
  const b = JSON.parse(JSON.stringify(base));
  const cur = getPath(base, def.path);
  let vals = CHALLENGE_VALUES[id].filter((v) => v !== cur);
  if (!def.options) vals = vals.filter((v) => Math.abs(Math.log((v || 0.001) / (cur || 0.001))) > 0.8 || (cur === 0) !== (v === 0));
  if (!vals.length) vals = CHALLENGE_VALUES[id].filter((v) => v !== cur);
  setPath(b, def.path, vals[Math.floor(Math.random() * vals.length)]);
  if (id === 'lfoTarget') b.lfo.depth = Math.max(0.4, b.lfo.depth);
  const opts = shuffle([id, ...shuffle(pool.filter((x) => x !== id)).slice(0, 3)]);
  const lowNote = PRESETS[baseId].role === 'bass' ? 36 : 48;
  return {
    prompt: `Son « ${PRESETS[baseId].name} » : A puis B`,
    play: () => { const d = phrase(base, 0.08, lowNote); phrase(b, 0.08 + d + 0.35, lowNote); },
    options: opts.map((x) => ({ value: x, label: SOUND_Q[x] })),
    answer: id,
    explain: `C’était : ${SOUND_Q[id]}. Dans Serum 2 → ${def.serum}. ${def.explain}`,
  };
}

/** Nom d'intervalle entre deux notes (au-delà de l'octave : « + octave »). */
function intervalLabel(a, b) {
  const d = Math.abs(b - a);
  if (d === 0) return 'Unisson (même note)';
  const base = d > 12 ? d % 12 || 12 : d;
  const name = INTERVALS.find((x) => x.st === base).name;
  return `${name}${d > 12 ? ' + octave' : ''} (${d} demi-tons, ${b > a ? 'montant' : 'descendant'})`;
}

/**
 * Clavier pour chercher les notes avant de répondre : affiche les notes jouées,
 * l'intervalle entre les deux dernières et l'accord formé (notes tenues ou tapées rapidement).
 */
function practicePad(mode, getQ, onFound) {
  const info = el('div.lesson', el('div.lesson-title', '🎹 Cherche au clavier'),
    el('p.small.muted', mode === 'intervals'
      ? 'Rejoue la 1re note, puis cherche la 2e. L’app te dit l’intervalle que tu viens de jouer.'
      : 'Joue (ou tape vite) les notes de l’accord : l’app te dit lequel tu as formé.'));
  const out = el('p.pad-out', ' ');
  const recent = [];
  const held = new Map();
  const midiHeld = new Set();
  const piano = presetParams('piano');

  const analyze = () => {
    const t = performance.now();
    const names = (arr) => arr.map(midiToName).join(' · ');
    if (mode === 'intervals') {
      const last = recent.slice(-2).map((r) => r.m);
      out.replaceChildren(last.length < 2
        ? el('span', last.length ? `Note : ${midiToName(last[0])}` : ' ')
        : el('span', `${midiToName(last[0])} → ${midiToName(last[1])} = `, el('b', intervalLabel(last[0], last[1]))));
      return;
    }
    const pressed = [...held.keys()].concat([...midiHeld]);
    let group = pressed.length >= 2 ? pressed : recent.filter((r) => t - r.t < 1600).map((r) => r.m);
    group = [...new Set(group)].sort((a, b) => a - b);
    if (group.length < 3) { out.replaceChildren(el('span', group.length ? `Notes : ${names(group)}` : ' ')); return; }
    const d = detectChord(group);
    out.replaceChildren(el('span', `${names(group)} = `, el('b', d ? `${d.symbol} (${d.quality.label})` : 'accord non reconnu')));
  };
  // « Réponds en jouant » : jouer les bonnes notes valide la réponse (activé d'office avec un clavier MIDI).
  let playToAnswer = midiStatus().state === 'connected';
  const check = () => {
    const q = getQ();
    if (!playToAnswer || !q || !q.notes) return;
    if (mode === 'intervals') {
      const last = recent.slice(-2).map((r) => r.m);
      if (last.length === 2 && mod(last[0], 12) === mod(q.notes[0], 12) && last[1] - last[0] === q.notes[1] - q.notes[0]) onFound();
      return;
    }
    const t = performance.now();
    const pressed = [...held.keys()].filter((k) => typeof k === 'number').concat([...midiHeld]);
    const group = pressed.length >= 2 ? pressed : recent.filter((r) => t - r.t < 1600).map((r) => r.m);
    const pcs = (arr) => [...new Set(arr.map((x) => mod(x, 12)))].sort((a, b) => a - b).join();
    if (pcs(group) === pcs(q.notes)) onFound();
  };
  const push = (m) => { recent.push({ m, t: performance.now() }); if (recent.length > 8) recent.shift(); analyze(); check(); };

  const kb = keyboard({
    base: 48, octaves: 2,
    onDown: (m) => { ensureAudio(); held.set(m, playSynth(piano, m, now(), null, 0.8, { send: 0.15 })); push(m); },
    onUp: (m) => { held.get(m)?.release(); held.delete(m); },
  });
  const offMidi = onMidi({
    noteOn: (m, v) => { ensureAudio(); midiHeld.add(m); held.get('m' + m)?.release(); held.set('m' + m, playSynth(piano, m, now(), null, v, { send: 0.15 })); kb.light(m, true); push(m); },
    noteOff: (m) => { midiHeld.delete(m); held.get('m' + m)?.release(); held.delete('m' + m); kb.light(m, false); },
  });

  let markTimer = null;
  const mark = (notes, ms = 2500) => {
    clearTimeout(markTimer);
    kb.clearMarks();
    notes.forEach((m) => kb.mark(m, true));
    markTimer = setTimeout(() => kb.clearMarks(), ms);
  };
  const firstBtn = el('button.btn.small', {
    onclick: () => { const q = getQ(); if (!q) return; ensureAudio(); playSynth(piano, q.notes[0], now() + 0.02, 0.9, 0.8); mark([q.notes[0]], 1500); },
  }, '🎯 Rejouer la 1re note');
  const clearBtn = el('button.btn.small.ghost', { onclick: () => { recent.length = 0; analyze(); } }, 'Effacer');

  const playBtn = el('button.btn.small' + (playToAnswer ? '.primary' : ''), {
    onclick: () => { playToAnswer = !playToAnswer; playBtn.classList.toggle('primary', playToAnswer); playBtn.textContent = playToAnswer ? '🎹 Réponds en jouant : ON' : '🎹 Réponds en jouant'; },
    title: mode === 'intervals' ? 'Joue les deux notes (1re note dans n’importe quelle octave) pour répondre' : 'Joue l’accord (n’importe quel renversement) pour répondre',
  }, playToAnswer ? '🎹 Réponds en jouant : ON' : '🎹 Réponds en jouant');
  const node = el('div', { style: { marginTop: '14px' } }, info, el('div.row.gap.wrap', firstBtn, playBtn, clearBtn), out, kb.node);
  return {
    node,
    /** Après la réponse : montre (et rejoue) les notes de la question sur le clavier. */
    reveal: (q) => { mark(q.notes, 4000); },
    reset: () => { recent.length = 0; kb.clearMarks(); analyze(); },
    destroy: () => { kb.destroy(); offMidi(); clearTimeout(markTimer); held.forEach((v) => v.release()); },
  };
}

export const REVIEW_NAMES = { intervals: '📏 Intervalle', chords: '🎨 Accord', progressions: '🧭 Progression', genre: '🥁 Style', sound: '🎛️ Paramètre' };

/** Révisions espacées : uniquement les notions ratées dont la date de révision est arrivée. */
function reviewRender(root) {
  const items = dueEarReviews().filter((x) => REVIEW_NAMES[x.mode]).slice(0, 10);
  root.append(header('🔁 Révisions d’oreille', 'Les notions que tu as ratées reviennent après 1, 3, 7, 14 puis 30 jours.', '#/review'));
  if (!items.length) {
    root.append(card(el('p', '🎉 Rien à réviser aujourd’hui. Chaque erreur dans les quiz d’oreille crée une fiche qui reviendra au bon moment.'),
      el('a.btn.primary', { href: '#/ear' }, 'Faire un quiz')));
    return;
  }
  return runQuiz(root, { mode: 'review', n: items.length, M: { name: 'Révisions', emoji: '🔁', skill: 'oreille', desc: '' }, nextQuestion: (idx, lv) => makeQuestion(items[idx].mode, lv, idx, items[idx].value), inReview: true, label: (q) => REVIEW_NAMES[q.mode] });
}

/** Nom lisible d'une notion d'oreille (ex. 'intervals', '4' → « Tierce majeure »). */
export function notionLabel(mode, value) {
  if (mode === 'intervals') return INTERVALS.find((x) => x.st === +value)?.name || value;
  if (mode === 'chords') return CHORD_SETS.find((x) => x.id === value)?.label || value;
  if (mode === 'genre') { const g = GENRES.find((x) => x.id === value); return g ? `${g.emoji} ${g.name}` : value; }
  if (mode === 'sound') return SOUND_Q[value] || value;
  return value;
}

/** Exercice ciblé : la notion souvent ratée, en alternance avec celle qu'on confond avec elle. */
function drillRender(root, key) {
  const err = recurringErrors(getState(), dayKey(), { min: 1, days: 365 }).find((e) => e.key === key);
  if (!err || !MODES[err.mode]) { location.hash = '#/ear'; return; }
  const plan = drillPlan(err, 6);
  const name = notionLabel(err.mode, err.value);
  const M = { name: 'Exercice ciblé', emoji: '🎯', skill: MODES[err.mode].skill, desc: err.confused ? `${name} ou ${notionLabel(err.mode, err.confused)} ? On les fait écouter l’un après l’autre jusqu’à ce que la différence saute aux oreilles.` : `${name}, plusieurs fois de suite pour l’ancrer.` };
  return runQuiz(root, {
    mode: err.mode, n: plan.length, M, inReview: false, drill: true,
    nextQuestion: (idx, lv) => {
      const q = makeQuestion(err.mode, lv, idx, plan[idx]);
      // Les deux notions confondues sont toujours proposées
      const other = plan[idx] === err.value ? err.confused : err.value;
      if (other != null && !q.options.some((o) => String(o.value) === String(other))) {
        const val = err.mode === 'intervals' ? +other : other;
        const i = q.options.findIndex((o) => o.value !== q.answer);
        if (i >= 0) q.options[i] = { value: val, label: notionLabel(err.mode, other) };
      }
      return q;
    },
    onDone: (score) => { if (score >= 80) update((s) => { if (s.errors?.[key]) s.errors[key].cleared = dayKey(); }); },
  });
}

export function render(root, params) {
  const mode = params.mode;
  if (mode === 'review') return reviewRender(root);
  if (mode === 'drill') return drillRender(root, params.k);
  if (!MODES[mode]) {
    root.append(header('Oreille', 'Entraînements courts. Le niveau s’adapte à ta progression.'),
      el('div.grid2',
        el('a.tile', { href: '#/ear?mode=review' }, el('div.tile-emoji', '🔁'), el('b', `Révisions (${dueEarReviews().filter((x) => REVIEW_NAMES[x.mode]).length})`), el('span', 'Tes erreurs passées, revues au bon moment')),
        Object.entries(MODES).map(([id, m]) => el('a.tile', { href: `#/ear?mode=${id}` }, el('div.tile-emoji', m.emoji), el('b', m.name), el('span', m.desc)))));
    return;
  }
  const M = MODES[mode];
  const n = Math.max(3, Math.min(15, +params.n || 8));
  return runQuiz(root, { mode, n, M, nextQuestion: (idx, lv) => makeQuestion(mode, lv, idx), inReview: false });
}

function runQuiz(root, { mode, n, M, nextQuestion, inReview, label, drill = false, onDone = null }) {
  const lv = level();
  let idx = 0, correct = 0;
  const results = [];
  let q = null, answered = false;
  const progress = el('div.quiz-progress');
  const body = el('div');
  const pad = ['intervals', 'chords'].includes(mode) ? practicePad(mode, () => q, () => {
    if (answered) return;
    const b = [...body.querySelectorAll('.answer')].find((x) => x.dataset.v === String(q.answer));
    if (b) { toast('🎹 Trouvé au clavier !', 'good'); b.click(); }
  }) : null;

  const drawProgress = () => {
    progress.replaceChildren(...Array.from({ length: n }, (_, i) => el('span' + (results[i] === true ? '.ok' : results[i] === false ? '.ko' : i === idx ? '.cur' : ''))));
  };

  const next = () => {
    if (idx >= n) return done();
    q = nextQuestion(idx, lv);
    answered = false;
    pad?.reset();
    drawProgress();
    const fb = el('div');
    const listen = el('button.btn.primary.listen', { onclick: () => { ensureAudio(); q.play(); } }, '▶');
    body.replaceChildren(
      el('p.muted', { style: { textAlign: 'center' } }, `Question ${idx + 1}/${n} — ${label ? label(q) + ' · ' : ''}${q.prompt}`),
      listen,
      el('div.answers', q.options.map((o) => {
        const b = el('button.btn.answer', {
          onclick: () => {
            if (answered) return;
            answered = true;
            const ok = o.value === q.answer;
            results[idx] = ok;
            if (ok) correct++;
            b.classList.add(ok ? 'right' : 'wrong');
            if (!ok) body.querySelectorAll('.answer').forEach((x) => { if (x.dataset.v === String(q.answer)) x.classList.add('right'); });
            recordReview(q.reviewKey, ok, inReview, ok ? null : o.value);
            update((s) => { s.stats.earTotal++; if (ok) s.stats.earCorrect++; if (q.genre && ok) s.genres[q.genre] = (s.genres[q.genre] || 0) + 1; });
            fb.replaceChildren(
              el('div.lesson', el('div.lesson-title', ok ? '✅ Bien joué' : '❌ Pas tout à fait'), el('p', q.explain),
                pad ? el('p.small.muted', `Notes : ${q.notes.map(midiToName).join(' · ')} — surlignées sur le clavier, rejoue-les pour les mémoriser.`) : null),
              el('div.row.gap', el('button.btn', { onclick: () => q.play() }, '↻ Réécouter'), el('button.btn.primary', { style: { flex: 1 }, 'data-key': 'enter', onclick: () => { idx++; next(); } }, idx + 1 >= n ? 'Voir le résultat' : 'Suivant →')),
            );
            if (pad) pad.reveal(q);
            drawProgress();
          },
        }, o.label);
        b.dataset.v = String(o.value);
        return b;
      })),
      fb,
    );
    ensureAudio();
    setTimeout(() => q.play(), 250);
  };

  const done = () => {
    const score = Math.round((100 * correct) / n);
    onDone?.(score);
    finishExercise({
      key: drill ? 'ear:drill' : `ear:${mode}`, title: `${M.name} : ${correct}/${n}`, score, xp: 8 + correct * 4, skill: M.skill, success: score >= 70,
      lesson: {
        intervals: 'Associe chaque intervalle à un morceau que tu connais : c’est la méthode la plus rapide pour les retenir.',
        chords: 'Chaque couleur d’accord est une émotion. En composition, choisis l’accord pour ce qu’il fait ressentir, pas pour son nom.',
        progressions: 'Écoute la ligne de basse : c’est elle qui révèle la progression.',
        genre: 'Un style se reconnaît à 2-3 invariants (placement du kick, de la snare, tempo, swing). Ce sont eux qu’il faut respecter… ou casser.',
        sound: 'Identifier à l’oreille ce qui change dans un son, c’est 80 % du sound design. Le reste, c’est savoir quel bouton tourner.',
        review: 'La répétition espacée ancre durablement : revoir une notion juste avant de l’oublier est la façon la plus efficace d’apprendre.',
      }[mode],
      transfer: {
        intervals: 'Sur ton MPC Key 37 : joue une note, chante l’intervalle, vérifie. 2 minutes par jour.',
        chords: 'Dans Live 12, active Scale, empile 3 puis 4 notes et écoute la différence triade / 7e.',
        progressions: 'Relève la basse d’un morceau que tu aimes au MPC, puis devine la progression.',
        genre: 'Dans l’Atlas, choisis un style que tu as confondu et recrée son beat dans le Lab Beat.',
        sound: 'Dans Serum 2, ouvre un preset, change un seul paramètre, écoute, remets-le. Recommence avec un autre.',
        review: 'Pour chaque notion révisée, trouve-la dans un morceau que tu connais ou joue-la au MPC Key 37.',
      }[mode],
      onRetry: inReview || drill ? null : () => { location.hash = `#/ear?mode=${mode}&n=${n}&r=${Date.now()}`; },
    });
    if (pad) pad.node.remove();
    body.replaceChildren(el('div.row.gap.center', el('a.btn', { href: drill ? '#/progress' : '#/ear' }, drill ? '← Mes progrès' : '← Autres entraînements'),
      drill ? null : el('a.btn.primary', { href: `#/ear?mode=${mode}&n=${n}&r=${Date.now()}` }, '↻ Encore')));
  };

  root.append(header(`${M.emoji} ${M.name}`, M.desc, '#/ear'), card(progress, body, pad?.node));
  next();
  return () => pad?.destroy();
}
