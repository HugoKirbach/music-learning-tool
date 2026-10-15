import { el, card, header, finishExercise, shuffle } from '../ui.js';
import { update, level } from '../store.js';
import { INTERVALS, midiToName, slotChord, voiceLead, mod } from '../core/theory.js';
import { gridFromPatterns, DRUM_ROWS, VEL } from '../core/rhythm.js';
import { ensureAudio, now, playSynth, playDrum, kitForGenre } from '../core/audio.js';
import { presetParams } from '../player.js';
import { GENRES } from '../data/genres.js';
import { PRESETS } from '../data/presets.js';
import { paramById, getPath, setPath, normalizeParams, CHALLENGE_VALUES } from '../core/synthparams.js';
import { phrase } from './synth.js';

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

function makeQuestion(mode, lv, i) {
  const t = () => now() + 0.08;
  if (mode === 'intervals') {
    const pool = lv < 3 ? [3, 4, 5, 7, 12] : lv < 6 ? [2, 3, 4, 5, 7, 9, 10, 12] : INTERVALS.map((x) => x.st);
    const st = pool[Math.floor(Math.random() * pool.length)];
    const root = 52 + Math.floor(Math.random() * 12);
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
      explain: `${info.name} (${info.st} demi-tons) — repère : ${info.hint}. Ici ${midiToName(root)} → ${midiToName(desc ? root : root + st)}.`,
    };
  }
  if (mode === 'chords') {
    const ids = lv < 3 ? ['maj', 'min'] : lv < 5 ? ['maj', 'min', 'dim', 'aug', 'sus4'] : lv < 8 ? ['maj', 'min', 'maj7', 'm7', '7', 'sus4'] : CHORD_SETS.map((c) => c.id);
    const pickId = ids[Math.floor(Math.random() * ids.length)];
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
      explain: `${c.label} : ${c.tip}. Intervalles : ${c.iv.join('-')} demi-tons.`,
    };
  }
  if (mode === 'progressions') {
    const pool = lv < 4 ? PROGS.slice(0, 4).concat(PROGS.slice(6, 8)) : PROGS;
    const pr = pool[Math.floor(Math.random() * pool.length)];
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
    const g = GENRES[Math.floor(Math.random() * GENRES.length)];
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
  const id = pool[Math.floor(Math.random() * pool.length)];
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

export function render(root, params) {
  const mode = params.mode;
  if (!MODES[mode]) {
    root.append(header('Oreille', 'Entraînements courts. Le niveau s’adapte à ta progression.'),
      el('div.grid2', Object.entries(MODES).map(([id, m]) => el('a.tile', { href: `#/ear?mode=${id}` }, el('div.tile-emoji', m.emoji), el('b', m.name), el('span', m.desc)))));
    return;
  }
  const M = MODES[mode];
  const n = Math.max(3, Math.min(15, +params.n || 8));
  const lv = level();
  let idx = 0, correct = 0;
  const results = [];
  let q = null, answered = false;
  const progress = el('div.quiz-progress');
  const body = el('div');

  const drawProgress = () => {
    progress.replaceChildren(...Array.from({ length: n }, (_, i) => el('span' + (results[i] === true ? '.ok' : results[i] === false ? '.ko' : i === idx ? '.cur' : ''))));
  };

  const next = () => {
    if (idx >= n) return done();
    q = makeQuestion(mode, lv, idx);
    answered = false;
    drawProgress();
    const fb = el('div');
    const listen = el('button.btn.primary.listen', { onclick: () => { ensureAudio(); q.play(); } }, '▶');
    body.replaceChildren(
      el('p.muted', { style: { textAlign: 'center' } }, `Question ${idx + 1}/${n} — ${q.prompt}`),
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
            update((s) => { s.stats.earTotal++; if (ok) s.stats.earCorrect++; if (q.genre && ok) s.genres[q.genre] = (s.genres[q.genre] || 0) + 1; });
            fb.replaceChildren(
              el('div.lesson', el('div.lesson-title', ok ? '✅ Bien joué' : '❌ Pas tout à fait'), el('p', q.explain)),
              el('div.row.gap', el('button.btn', { onclick: () => q.play() }, '↻ Réécouter'), el('button.btn.primary', { style: { flex: 1 }, onclick: () => { idx++; next(); } }, idx + 1 >= n ? 'Voir le résultat' : 'Suivant →')),
            );
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
    finishExercise({
      key: `ear:${mode}`, title: `${M.name} : ${correct}/${n}`, score, xp: 8 + correct * 4, skill: M.skill, success: score >= 70,
      lesson: {
        intervals: 'Associe chaque intervalle à un morceau que tu connais : c’est la méthode la plus rapide pour les retenir.',
        chords: 'Chaque couleur d’accord est une émotion. En composition, choisis l’accord pour ce qu’il fait ressentir, pas pour son nom.',
        progressions: 'Écoute la ligne de basse : c’est elle qui révèle la progression.',
        genre: 'Un style se reconnaît à 2-3 invariants (placement du kick, de la snare, tempo, swing). Ce sont eux qu’il faut respecter… ou casser.',
        sound: 'Identifier à l’oreille ce qui change dans un son, c’est 80 % du sound design. Le reste, c’est savoir quel bouton tourner.',
      }[mode],
      transfer: {
        intervals: 'Sur ton MPC Key 37 : joue une note, chante l’intervalle, vérifie. 2 minutes par jour.',
        chords: 'Dans Live 12, active Scale, empile 3 puis 4 notes et écoute la différence triade / 7e.',
        progressions: 'Relève la basse d’un morceau que tu aimes au MPC, puis devine la progression.',
        genre: 'Dans l’Atlas, choisis un style que tu as confondu et recrée son beat dans le Lab Beat.',
        sound: 'Dans Serum 2, ouvre un preset, change un seul paramètre, écoute, remets-le. Recommence avec un autre.',
      }[mode],
      onRetry: () => { location.hash = `#/ear?mode=${mode}&n=${n}&r=${Date.now()}`; },
    });
    body.replaceChildren(el('div.row.gap.center', el('a.btn', { href: '#/ear' }, '← Autres entraînements'), el('a.btn.primary', { href: `#/ear?mode=${mode}&n=${n}&r=${Date.now()}` }, '↻ Encore')));
  };

  root.append(header(`${M.emoji} ${M.name}`, M.desc, '#/ear'), card(progress, body));
  next();
}
