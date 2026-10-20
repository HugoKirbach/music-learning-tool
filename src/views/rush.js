// Piano Rush : les notes tombent, on les joue en rythme (touches, clavier PC, MPC). Chaque niveau = théorie + pratique.
import { el, header, segmented, confetti, showBadges, landscapeBtn } from '../ui.js';
import { getState, update, recordExercise, recordGameReview } from '../store.js';
import { inputLatency } from '../core/latency.js';
import { ensureAudio, now, playSynth, playClick, outputLatency, scheduleAhead } from '../core/audio.js';
import { presetParams } from '../player.js';
import { onMidi, midiStatus } from '../midiin.js';
import { viewKeys } from '../shortcuts.js';
import { DIFFS, CHORD_TYPES, buildChart, keyRange, whiteKeys, isBlack, noteFr, noteEn, noteLabel, parseChord, TileGame, LearnSession, randomLevel } from '../core/tiles.js';
import { CHAPTERS, LEVELS, levelById, chapterOf } from '../data/rush.js';

const HOME_ROW = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote'];
const UPPER_ROW = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];
const QWERTY = { Semicolon: ';', Quote: '\'', BracketLeft: '[', BracketRight: ']' };
const COLORS = { ok: '#4ade80', tap: '#5ce1e6', hold: '#b388ff', chord: '#ffb84d', perfect: '#4ade80', good: '#ffe066', miss: '#ff5d73' };
const GRADE_TXT = { ok: '✓', perfect: 'Parfait !', good: 'Bien', miss: 'Raté', wrong: 'Fausse note' };

function rushState() {
  const s = getState();
  return { best: {}, lang: 'both', metro: true, guide: false, diff: 'normal', ...(s.rush || {}) };
}
const setRush = (fn) => update((s) => { s.rush = { ...rushState(), ...(s.rush || {}) }; fn(s.rush); });
// Ouvert si c'est le premier, si le précédent est réussi, ou s'il a déjà été réussi (un niveau ajouté plus tard
// avant lui ne le reverrouille jamais).
const cleared = (i) => (rushState().best[LEVELS[i]?.id]?.stars || 0) >= 1;
const isUnlocked = (i) => i === 0 || cleared(i) || cleared(i - 1);
const learnCount = (l) => rushState().learn?.[l.id] || 0;
const starsTxt = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);

export function render(root, params = {}) {
  let mode = params.mode === 'libre' ? 'libre' : 'parcours';
  let stopGame = null;

  // ---------- Menu ----------
  function menu() {
    stopGame?.(); stopGame = null;
    const st = rushState();
    root.replaceChildren(
      header('🎹 Piano Rush', 'Les notes tombent : joue-les en rythme. Chaque niveau = une notion de théorie + sa pratique.'),
      el('div.row.gap.wrap', { style: { marginBottom: '10px' } },
        segmented([{ value: 'parcours', label: '🧭 Parcours' }, { value: 'libre', label: '🎮 Mode libre' }], mode, (v) => { mode = v; menu(); })),
      settingsCard(),
      mode === 'parcours' ? parcours(st) : libre(st),
    );
  }

  function settingsCard() {
    const st = rushState();
    const toggle = (key, label) => el('button.btn.small' + (st[key] ? '.primary' : ''), { onclick: () => { setRush((r) => { r[key] = !r[key]; }); menu(); } }, `${st[key] ? '✓' : '○'} ${label}`);
    return el('div.card.rush-settings',
      el('div.row.gap.wrap',
        el('span.small.muted', 'Noms des notes'),
        segmented([{ value: 'fr', label: 'Do Ré Mi' }, { value: 'en', label: 'C D E' }, { value: 'both', label: 'Les deux' }], st.lang, (v) => setRush((r) => { r.lang = v; })),
        toggle('metro', 'Métronome'), toggle('guide', 'Guide audio')),
      el('p.small.muted', { style: { margin: '8px 0 0' } }, inputHint()),
    );
  }

  function parcours(st) {
    const done = LEVELS.filter((l) => (st.best[l.id]?.stars || 0) >= 1).length;
    const stars = LEVELS.reduce((a, l) => a + (st.best[l.id]?.stars || 0), 0);
    const nextIdx = LEVELS.findIndex((l, i) => isUnlocked(i) && !(st.best[l.id]?.stars >= 1));
    return el('div',
      el('div.card.glow', el('div.row.between',
        el('div', el('b', `${done}/${LEVELS.length} niveaux`), el('div.small.muted', `${stars}/${LEVELS.length * 3} ★ · du plus simple au plus complexe, 60 % pour débloquer la suite`)),
        nextIdx >= 0 ? el('button.btn.primary', { onclick: () => intro(LEVELS[nextIdx], { mode: 'parcours', diff: 'normal' }) }, '▶ Continuer') : el('span.tag', '🏆 Terminé'))),
      CHAPTERS.map((c) => el('div',
        el('div.fam-head', el('h3.fam-title', `${c.emoji} ${c.id}. ${c.name}`), el('span.small.muted', c.desc)),
        el('div.rush-levels', LEVELS.map((l, i) => [l, i]).filter(([l]) => l.ch === c.id).map(([l, i]) => {
          const open = isUnlocked(i);
          const b = st.best[l.id];
          return el('button.rush-level' + (open ? '' : '.locked') + (i === nextIdx ? '.next' : ''), {
            type: 'button', disabled: !open, onclick: () => intro(l, { mode: 'parcours', diff: 'normal' }),
          },
          el('span.rl-emoji', open ? l.emoji : '🔒'),
          el('span.rl-txt', el('b', `${i + 1}. ${l.title}`), el('small', l.concept)),
          el('span.rl-stars' + (b?.stars ? '.on' : ''), b ? `${starsTxt(b.stars)}` : skillTag(l)));
        })))),
    );
  }

  function libre(st) {
    const diffDesc = {
      facile: 'Tempo ×0,75, grande tolérance : pour apprendre.', normal: 'Tempo d’origine.',
      difficile: 'Tempo ×1,15, fenêtre plus serrée.', expert: 'Tempo ×1,3, timing strict, sans noms sur les tuiles.',
    };
    const descEl = el('p.small.muted', diffDesc[st.diff]);
    return el('div',
      el('div.card',
        el('b', 'Difficulté'),
        segmented(Object.values(DIFFS).map((d) => ({ value: d.id, label: `${d.emoji} ${d.name}` })), st.diff, (v) => { setRush((r) => { r.diff = v; }); descEl.textContent = diffDesc[v]; }),
        descEl,
        el('button.btn.primary.wide', { onclick: () => intro(randomLevel(rushState().diff), { mode: 'libre', diff: rushState().diff }) }, '🎲 Rythmes aléatoires (niveau selon la difficulté)')),
      CHAPTERS.map((c) => el('div',
        el('h3.fam-title', `${c.emoji} ${c.name}`),
        el('div.rush-levels', LEVELS.filter((l) => l.ch === c.id).map((l) => {
          const b = st.best[`${l.id}@${st.diff}`];
          return el('button.rush-level', { type: 'button', onclick: () => intro(l, { mode: 'libre', diff: rushState().diff }) },
            el('span.rl-emoji', l.emoji), el('span.rl-txt', el('b', l.title), el('small', l.concept)),
            el('span.rl-stars' + (b?.stars ? '.on' : ''), b ? starsTxt(b.stars) : skillTag(l)));
        })))),
    );
  }

  // ---------- Introduction (théorie) ----------
  function intro(l, ctx) {
    stopGame?.(); stopGame = null;
    const diff = DIFFS[ctx.diff] || DIFFS.normal;
    const chart = buildChart(l, diff);
    const ch = chapterOf(l);
    const lang = rushState().lang;
    window.scrollTo(0, 0);
    root.replaceChildren(
      el('div.page-head',
        el('button.back', { type: 'button', 'aria-label': 'Retour', onclick: menu }, '‹'),
        el('div', el('h1', `${l.emoji} ${l.title}`), el('p.sub', ch ? `Chapitre ${ch.id} · ${ch.name}` : 'Mode libre'))),
      el('div.card.glow',
        el('div.row.gap.wrap', el('span.tag', `🎯 ${l.concept}`), l.source ? el('span.tag', `📜 ${l.source}`) : null, skillTag(l, true)),
        el('h3', '📖 Ce qu’on travaille'),
        el('p', l.intro),
        el('div.lesson', el('div.lesson-title', '🧠 À retenir'), el('ul.rush-points', l.points.map((p) => el('li', p)))),
        rhythmStrip(chart, lang),
        chordList(chart, lang),
      ),
      el('div.card',
        el('div.row.gap.wrap.small.muted',
          el('span', `${diff.emoji} ${diff.name}`), el('span', `♩ = ${chart.bpm}`), el('span', `${chart.notes.length} notes`),
          el('span', `≈ ${Math.round(chart.length)} s`), chart.notes.some((n) => n.hold) ? el('span', '🟪 notes à tenir') : null),
        el('div.row.gap.wrap', { style: { marginTop: '10px' } },
          el('button.btn', { onclick: () => play(l, ctx, { demo: true }) }, '👀 Voir la démo'),
          el('button.btn', { onclick: () => play(l, ctx, { learn: true }) }, '🎓 Apprentissage'),
          el('button.btn.primary', { style: { flex: 1 }, onclick: () => play(l, ctx) }, '▶ Jouer')),
        el('p.small.muted', { style: { margin: '8px 0 0' } }, '🎓 Apprentissage : les notes dans l’ordre, à ton rythme, sans chrono. La suivante s’allume quand tu as joué la bonne.',
          learnCount(l) ? ` Déjà ${learnCount(l)} répétition${learnCount(l) > 1 ? 's' : ''}.` : ''),
        el('p.small.muted', { style: { margin: '8px 0 0' } }, '🟦 taper · 🟪 tenir jusqu’au bout de la tuile · 🟧 accord (toutes les notes ensemble)'),
      ),
    );
  }

  // Aperçu des 2 premières mesures : chaque note est un bloc proportionnel à sa durée sur la grille des temps.
  function rhythmStrip(chart, lang) {
    const barBeats = chart.meter;
    const startBeat = chart.pickup ? chart.pickup - barBeats : 0;
    const span = barBeats * 2;
    const evs = new Map();
    for (const n of chart.notes) {
      if (n.voice !== 0 || n.beat < startBeat || n.beat >= startBeat + span) continue;
      const k = n.beat;
      if (!evs.has(k)) evs.set(k, n);
    }
    const ticks = [];
    for (let b = 0; b <= span + 1e-6; b += chart.meter % 1 ? 0.5 : 1) ticks.push(el('i' + (Math.abs(b % barBeats) < 1e-6 ? '.bar' : ''), { style: { left: `${(b / span) * 100}%` } }));
    return el('div.rush-strip-wrap',
      el('div.small.muted', 'Aperçu du rythme (2 premières mesures)'),
      el('div.rush-strip', ticks, [...evs.values()].map((n) => el('span.rs-note' + (n.hold ? '.hold' : '') + (n.chord ? '.chord' : ''), {
        style: { left: `${((n.beat - startBeat) / span) * 100}%`, width: `calc(${(Math.min(n.beats, span - (n.beat - startBeat)) / span) * 100}% - 2px)` },
        title: `${n.beats} temps`,
      }, n.chord ? (n.label || '') : (lang === 'en' ? noteEn(n.midi) : noteFr(n.midi))))),
    );
  }

  function chordList(chart, lang) {
    const seen = new Map();
    for (const c of chart.chords) if (!seen.has(c.label)) seen.set(c.label, c);
    if (!seen.size) return null;
    return el('div', { style: { marginTop: '10px' } },
      el('div.small.muted', 'Les accords du niveau'),
      el('div.rush-chords', [...seen.values()].map((c) => {
        let type = '';
        try { type = CHORD_TYPES[parseChord(c.label.replace('♯', '#').replace('♭', 'b')).type]?.name || ''; } catch (e) { type = ''; }
        return el('div.rush-chord', el('b', c.label), el('span', c.notes.map((m) => noteLabel(m, lang === 'both' ? 'fr' : lang)).join(' · ')),
          lang === 'both' ? el('small', c.notes.map(noteEn).join(' ')) : null, type ? el('small.muted', type) : null);
      })));
  }

  // ---------- Partie ----------
  function play(l, ctx, { demo = false, learn = false } = {}) {
    stopGame?.();
    ensureAudio();
    const diff = DIFFS[ctx.diff] || DIFFS.normal;
    const chart = buildChart(l, diff);
    const game = new TileGame(chart, diff);
    const lesson = learn ? new LearnSession(chart) : null;
    const st = rushState();
    const lang = st.lang;
    const showLabels = learn || diff.labels;
    const range = keyRange(chart.lo, chart.hi);
    const whites = whiteKeys(range.lo, range.hi);
    const pcKeys = new Map(); // code → midi
    const pcLabel = new Map(); // midi → caractère
    whites.forEach((m, i) => {
      if (HOME_ROW[i]) pcKeys.set(HOME_ROW[i], m);
      if (isBlack(m + 1) && m + 1 <= range.hi && UPPER_ROW[i + 1]) pcKeys.set(UPPER_ROW[i + 1], m + 1);
    });
    for (const [code, m] of pcKeys) pcLabel.set(m, QWERTY[code] || code.replace('Key', ''));
    navigator.keyboard?.getLayoutMap?.().then((map) => { for (const [code, m] of pcKeys) { const c = map.get(code); if (c) pcLabel.set(m, c.toUpperCase()); } }).catch(() => {});
    const finePointer = matchMedia('(pointer: fine)').matches;

    const scoreEl = el('b', '0');
    const comboEl = el('span.rush-combo', '');
    const accEl = el('span.small.muted', '');
    const chordEl = el('div.rush-now', '');
    const prog = el('div.bar-fill', { style: { width: '0%' } });
    const pauseBtn = el('button.btn.small', { onclick: () => togglePause() }, '⏸');
    const canvas = el('canvas.rush-canvas');
    const wrap = el('div.rush-game',
      el('div.rush-hud',
        el('div', el('div.small.muted', demo ? '👀 Démo' : learn ? `🎓 Apprentissage · ${l.title}` : `${l.emoji} ${l.title}`), el('div.row.gap', scoreEl, comboEl, accEl)),
        chordEl,
        el('div.row.gap', landscapeBtn(), demo || learn ? null : pauseBtn, el('button.btn.small', { onclick: () => { stop(); intro(l, ctx); } }, '✕'))),
      el('div.bar.rush-prog', prog),
      canvas,
    );
    root.replaceChildren(wrap);
    document.body.classList.add('rush-playing');
    window.scrollTo(0, 0);

    const g2 = canvas.getContext('2d');
    const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    let W = 0, H = 0, kbH = 0, hitY = 0, ww = 0, bw = 0, bh = 0, pps = 0;
    const rects = new Map();
    function layout() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = wrap.clientWidth;
      const navH = innerWidth >= 900 ? 0 : (document.getElementById('nav')?.offsetHeight || 0);
      const top = canvas.getBoundingClientRect().top;
      H = Math.max(300, Math.min(900, innerHeight - top - navH - 10));
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      kbH = Math.round(Math.max(90, Math.min(150, H * 0.24)));
      hitY = H - kbH - 6;
      pps = hitY / diff.look;
      ww = W / whites.length; bw = ww * 0.62; bh = kbH * 0.6;
      rects.clear();
      whites.forEach((m, i) => {
        rects.set(m, { x: i * ww, w: ww, black: false });
        if (isBlack(m + 1) && m + 1 <= range.hi) rects.set(m + 1, { x: (i + 1) * ww - bw / 2, w: bw, black: true });
      });
    }
    layout();
    const onResize = () => layout();
    window.addEventListener('resize', onResize);

    // Horloge : temps « partition » = 0 au 1er temps du morceau, aligné sur ce qu'on entend.
    const lat = outputLatency();
    const barDur = chart.meter * chart.spb;
    const lead = barDur * (barDur < 1.6 ? 2 : 1) + (chart.pickup ? chart.pickup * chart.spb : 0);
    const clickUnit = chart.meter % 1 ? 0.5 : 1;
    let start = now() + 0.15 + lead;
    const T = () => now() - lat - start;
    let paused = false, pausedAt = 0, raf = 0, running = true, ended = false;
    let clickK = Math.floor(-lead / (clickUnit * chart.spb));
    let guideI = 0;
    const firstBeat = -lead;
    const fx = [];
    const pressed = new Map(); // source → midi
    const down = new Map(); // midi → nombre d'appuis
    const voices = new Map();
    const piano = presetParams('pianoBright') || presetParams('piano');
    const guide = demo || st.guide;

    function schedule() {
      const horizon = now() + scheduleAhead() + 0.03;
      // métronome : décompte toujours, puis selon le réglage
      for (;;) {
        const beat = clickK * clickUnit;
        const at = start + beat * chart.spb;
        if (at > horizon || beat * chart.spb > chart.length + 0.01) break;
        const rel = beat - chart.pickup;
        const isBar = Math.abs(rel / chart.meter - Math.round(rel / chart.meter)) < 1e-6;
        if (beat * chart.spb >= firstBeat - 1e-6 && (beat < 0 || st.metro)) playClick(Math.max(at, now()), isBar);
        clickK++;
      }
      if (guide) {
        while (guideI < chart.notes.length && start + chart.notes[guideI].t < horizon) {
          const n = chart.notes[guideI++];
          if (start + n.t >= now() - 0.02) playSynth(piano, n.midi, start + n.t, Math.max(0.12, n.dur * 0.92), demo ? 0.6 : 0.28, { send: 0.15 });
        }
      }
    }

    function sound(midi, on) {
      if (on) { voices.get(midi)?.release(); if (!guide || !demo) voices.set(midi, playSynth(piano, midi, now(), null, 0.75, { send: 0.15 })); }
      else { voices.get(midi)?.release(); voices.delete(midi); }
    }

    function feedback(midi, grade) {
      const r = rects.get(midi);
      if (!r) return;
      fx.push({ x: r.x + r.w / 2, y: hitY - 16, txt: GRADE_TXT[grade], color: COLORS[grade] || COLORS.miss, t0: performance.now() });
      if (fx.length > 24) fx.shift();
    }

    function doPress(midi, src) {
      if (paused || ended) return;
      ensureAudio();
      if (pressed.has(src)) doRelease(src);
      pressed.set(src, midi);
      down.set(midi, (down.get(midi) || 0) + 1);
      sound(midi, true);
      if (demo) return;
      if (learn) return learnPress(midi, src);
      const t = T() - inputLatency(getState().settings, src);
      const ev = game.press(midi, t, { octaveFree: src.startsWith('midi') });
      if (ev.type === 'hit') feedback(ev.note.midi, ev.grade);
      else if (t > -0.2) feedback(midi, 'wrong');
    }
    function doRelease(src) {
      const midi = pressed.get(src);
      if (midi == null) return;
      pressed.delete(src);
      const c = (down.get(midi) || 1) - 1;
      if (c <= 0) { down.delete(midi); sound(midi, false); } else down.set(midi, c);
      if (!demo && !learn) game.release(midi, T() - inputLatency(getState().settings, src));
    }

    // ---- Entrées : toucher / souris ----
    function keyAt(x, y) {
      const inKb = y >= hitY + 6;
      for (const [m, r] of rects) if (r.black && x >= r.x && x <= r.x + r.w && (!inKb || y <= hitY + 6 + bh)) return m;
      for (const [m, r] of rects) if (!r.black && x >= r.x && x < r.x + r.w) return m;
      return null;
    }
    const ptr = (e) => { const b = canvas.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top]; };
    canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); canvas.setPointerCapture?.(e.pointerId); const m = keyAt(...ptr(e)); if (m != null) doPress(m, 'p' + e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      const src = 'p' + e.pointerId;
      if (!pressed.has(src)) return;
      const m = keyAt(...ptr(e));
      if (m != null && m !== pressed.get(src)) doPress(m, src);
    });
    ['pointerup', 'pointercancel'].forEach((t) => canvas.addEventListener(t, (e) => doRelease('p' + e.pointerId)));

    // ---- Clavier d'ordinateur ----
    const kd = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const m = pcKeys.get(e.code);
      if (m == null) return;
      e.preventDefault();
      doPress(m, 'k' + e.code);
    };
    const ku = (e) => { if (pcKeys.has(e.code)) doRelease('k' + e.code); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    // ---- MIDI (MPC Key 37…) : l'octave est libre ----
    const offMidi = onMidi({ noteOn: (n) => doPress(n, 'midi' + n), noteOff: (n) => doRelease('midi' + n) });
    viewKeys({ space: () => { if (!demo && !learn) togglePause(); } });
    const onVis = () => { if (document.hidden && !paused && !demo && !learn) togglePause(); };
    document.addEventListener('visibilitychange', onVis);

    function togglePause() {
      if (ended) return;
      if (!paused) {
        paused = true; pausedAt = T();
        for (const src of [...pressed.keys()]) doRelease(src);
        pauseBtn.textContent = '▶';
      } else {
        // reprise avec une mesure de décompte, un peu avant l'endroit de la pause
        const back = Math.max(firstBeat, pausedAt - barDur);
        start = now() - lat - back + 0.05;
        clickK = Math.ceil(back / (clickUnit * chart.spb));
        guideI = chart.notes.findIndex((n) => n.t >= back + 0.02); if (guideI < 0) guideI = chart.notes.length;
        paused = false;
        pauseBtn.textContent = '⏸';
      }
    }

    // ---- Dessin ----
    const yOf = (t, now_) => hitY - (t - now_) * pps;
    function draw(t) {
      g2.clearRect(0, 0, W, H);
      g2.fillStyle = '#0d0d16'; g2.fillRect(0, 0, W, H);
      // couloirs
      whites.forEach((m, i) => { if (i % 2) { g2.fillStyle = 'rgba(255,255,255,0.025)'; g2.fillRect(i * ww, 0, ww, hitY); } });
      g2.strokeStyle = 'rgba(255,255,255,0.05)'; g2.lineWidth = 1;
      whites.forEach((m, i) => { if (m % 12 === 0 || m % 12 === 5) { g2.beginPath(); g2.moveTo(i * ww + 0.5, 0); g2.lineTo(i * ww + 0.5, hitY); g2.stroke(); } });
      // temps et mesures
      const unit = clickUnit;
      const b0 = Math.floor((t - 0.5) / (chart.spb * unit));
      const b1 = Math.ceil((t + diff.look) / (chart.spb * unit));
      for (let k = b0; k <= b1; k++) {
        const beat = k * unit;
        const y = yOf(beat * chart.spb, t);
        if (y < 0 || y > hitY) continue;
        const rel = beat - chart.pickup;
        const isBar = Math.abs(rel / chart.meter - Math.round(rel / chart.meter)) < 1e-6;
        g2.fillStyle = isBar ? 'rgba(179,136,255,0.35)' : 'rgba(255,255,255,0.07)';
        g2.fillRect(0, y - (isBar ? 1 : 0), W, isBar ? 2 : 1);
        if (isBar && rel >= 0) { g2.fillStyle = 'rgba(179,136,255,0.6)'; g2.font = `600 10px ${font}`; g2.fillText(String(Math.round(rel / chart.meter) + 1), 4, y - 4); }
      }
      // tuiles
      const labelled = new Set();
      for (const n of game.notes) {
        if (n.t > t + diff.look + 0.1) break;
        if (n.t + n.dur < t - 0.6) continue;
        const r = rects.get(n.midi);
        if (!r) continue;
        let yb = yOf(n.t, t);
        const yt = yOf(n.t + n.dur, t);
        if (n.state === 'holding') yb = Math.min(yb, hitY);
        // tuiles à taper : au plus 1 temps de haut (les stabs restent courts), les tenues gardent toute leur durée
        const h = Math.max(10, n.hold ? yb - yt - 2 : Math.min(yb - yt, chart.spb * pps) - 2);
        const x = r.x + 2, w = r.w - 4;
        let col = n.chord ? COLORS.chord : n.hold ? COLORS.hold : COLORS.tap;
        let alpha = 1;
        if (n.state === 'done') { col = n.grade === 'perfect' ? COLORS.perfect : COLORS.good; alpha = 0.35; }
        if (n.state === 'miss') { col = COLORS.miss; alpha = 0.35; }
        g2.globalAlpha = alpha * (r.black ? 0.88 : 1);
        if (n.hold) {
          g2.fillStyle = col + '55'; roundRect(x + w * 0.2, yb - h, w * 0.6, h, 4);
          g2.fillStyle = col; roundRect(x, yb - Math.min(h, 16), w, Math.min(h, 16), 5);
          if (n.state === 'holding') { g2.shadowColor = col; g2.shadowBlur = 16; roundRect(x, hitY - 6, w, 8, 4); g2.shadowBlur = 0; }
        } else {
          g2.fillStyle = col; roundRect(x, yb - h, w, h, 5);
        }
        g2.globalAlpha = 1;
        if (showLabels && n.state !== 'done' && w >= 16) {
          g2.fillStyle = '#10101c';
          g2.textAlign = 'center';
          const lab = lang === 'en' ? noteEn(n.midi) : noteFr(n.midi);
          g2.font = `700 ${Math.min(13, w / 2.6)}px ${font}`;
          g2.fillText(lab, x + w / 2, yb - 4);
          if (lang === 'both' && !n.hold && h >= 30) { g2.font = `500 ${Math.min(10, w / 3)}px ${font}`; g2.fillText(noteEn(n.midi), x + w / 2, yb - 16); }
          g2.textAlign = 'left';
        }
        if (n.label && !labelled.has(n.t) && n.state === 'wait') {
          labelled.add(n.t);
          const xs = game.notes.filter((o) => o.t === n.t && o.label).map((o) => rects.get(o.midi)).filter(Boolean);
          const right = Math.max(...xs.map((o) => o.x + o.w));
          const lx = right + 6 < W - 40 ? right + 6 : Math.min(...xs.map((o) => o.x)) - 46;
          g2.font = `700 12px ${font}`;
          const tw = g2.measureText(n.label).width + 10;
          g2.fillStyle = 'rgba(255,184,77,0.92)'; roundRect(Math.max(2, lx), yb - 20, tw, 18, 6);
          g2.fillStyle = '#10101c'; g2.fillText(n.label, Math.max(2, lx) + 5, yb - 7);
        }
      }
      // ligne de frappe
      const grd = g2.createLinearGradient(0, 0, W, 0);
      grd.addColorStop(0, '#b388ff'); grd.addColorStop(1, '#5ce1e6');
      g2.fillStyle = grd; g2.fillRect(0, hitY - 1, W, 3);
      // clavier
      const soon = new Map();
      if (learn) for (const x of lesson.current.notes) { if (game.notes[x.id].state === 'wait') soon.set(x.midi, 1); }
      else for (let i = game.cursor; i < game.notes.length; i++) {
        const n = game.notes[i];
        if (n.t > t + chart.spb * 1.2) break;
        if (n.state === 'wait' && n.t > t - diff.window) soon.set(n.midi, Math.max(soon.get(n.midi) || 0, 1 - Math.max(0, n.t - t) / (chart.spb * 1.2)));
      }
      const ky = hitY + 6;
      const holdingMidi = new Set([...game.active.keys()]);
      for (const m of whites) {
        const r = rects.get(m);
        g2.fillStyle = down.has(m) || holdingMidi.has(m) ? '#b388ff' : '#ececf6';
        roundRect(r.x + 1, ky, r.w - 2, kbH, 6);
        if (soon.has(m) && !down.has(m)) { g2.fillStyle = `rgba(92,225,230,${0.15 + 0.5 * soon.get(m)})`; roundRect(r.x + 1, ky, r.w - 2, kbH, 6); }
        g2.textAlign = 'center';
        if (lang !== 'en') { g2.fillStyle = '#1a1a2e'; g2.font = `700 ${Math.min(13, r.w / 2.8)}px ${font}`; g2.fillText(noteFr(m), r.x + r.w / 2, ky + kbH - (lang === 'both' ? 20 : 8)); }
        if (lang !== 'fr') { g2.fillStyle = lang === 'both' ? '#6a6a88' : '#1a1a2e'; g2.font = `${lang === 'both' ? 500 : 700} ${Math.min(lang === 'both' ? 11 : 13, r.w / 2.8)}px ${font}`; g2.fillText(noteEn(m), r.x + r.w / 2, ky + kbH - 7); }
        if (m === 60) { g2.fillStyle = '#b388ff'; g2.beginPath(); g2.arc(r.x + r.w / 2, ky + kbH - (lang === 'both' ? 38 : 24), 2.5, 0, Math.PI * 2); g2.fill(); }
        if (finePointer && pcLabel.has(m)) { g2.fillStyle = '#9a9ab8'; g2.font = `600 10px ${font}`; g2.fillText(pcLabel.get(m), r.x + r.w / 2, ky + bh + 14); }
        g2.textAlign = 'left';
      }
      for (const [m, r] of rects) {
        if (!r.black) continue;
        g2.fillStyle = down.has(m) || holdingMidi.has(m) ? '#8a5cf0' : '#1c1c2c';
        roundRect(r.x, ky, r.w, bh, 4);
        if (soon.has(m) && !down.has(m)) { g2.fillStyle = `rgba(92,225,230,${0.2 + 0.55 * soon.get(m)})`; roundRect(r.x, ky, r.w, bh, 4); }
        if (r.w >= 18) {
          g2.textAlign = 'center'; g2.fillStyle = '#ececf6';
          g2.font = `600 ${Math.min(10, r.w / 3)}px ${font}`;
          if (lang !== 'en') g2.fillText(noteFr(m), r.x + r.w / 2, ky + bh - (lang === 'both' ? 16 : 6));
          if (lang !== 'fr') { g2.fillStyle = '#9a9ab8'; g2.fillText(noteEn(m), r.x + r.w / 2, ky + bh - 5); }
          if (finePointer && pcLabel.has(m)) { g2.fillStyle = '#9a9ab8'; g2.fillText(pcLabel.get(m), r.x + r.w / 2, ky + 12); }
          g2.textAlign = 'left';
        }
      }
      // retours « Parfait / Bien / Raté »
      const pn = performance.now();
      g2.textAlign = 'center';
      for (const f of fx) {
        const a = (pn - f.t0) / 650;
        if (a > 1) continue;
        g2.globalAlpha = 1 - a;
        g2.fillStyle = f.color; g2.font = `800 13px ${font}`;
        g2.fillText(f.txt, Math.max(30, Math.min(W - 30, f.x)), f.y - a * 26);
      }
      g2.globalAlpha = 1; g2.textAlign = 'left';
      if (learn && lesson.atStart) {
        g2.fillStyle = 'rgba(13,13,22,0.7)'; roundRect(W / 2 - Math.min(W / 2 - 8, 220), 14, Math.min(W - 16, 440), 62, 12);
        g2.fillStyle = '#ececf6'; g2.textAlign = 'center';
        g2.font = `800 ${W < 500 ? 15 : 18}px ${font}`;
        g2.fillText(lesson.reps ? `✅ Boucle ${lesson.reps} terminée : ${lastLoop}` : '🎓 À ton rythme, note par note', W / 2, 40);
        g2.font = `500 ${W < 500 ? 12 : 13}px ${font}`; g2.fillStyle = '#9a9ab8';
        g2.fillText(lesson.reps ? 'Rejoue la 1re note pour recommencer' : 'Joue la note qui s’allume pour commencer', W / 2, 62);
        g2.textAlign = 'left';
      }
      // décompte / pause
      if (t < 0 || paused) {
        g2.fillStyle = 'rgba(13,13,22,0.55)'; g2.fillRect(0, 0, W, hitY);
        g2.fillStyle = '#ececf6'; g2.textAlign = 'center';
        g2.font = `800 ${paused ? 28 : 54}px ${font}`;
        const txt = paused ? '⏸ Pause — Espace pour reprendre' : String(Math.ceil(-t / (chart.spb * clickUnit)));
        g2.fillText(txt, W / 2, hitY / 2);
        if (!paused && t < -0.01) { g2.font = `500 14px ${font}`; g2.fillText(demo ? 'Regarde et écoute…' : 'Prépare tes doigts…', W / 2, hitY / 2 + 34); }
        g2.textAlign = 'left';
      }
    }
    function roundRect(x, y, w, h, r) {
      g2.beginPath();
      if (g2.roundRect) g2.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2)); else g2.rect(x, y, w, h);
      g2.fill();
    }

    let lastChord = '';
    // Bandeau du haut : 10 mises à jour par seconde suffisent (moins de travail pendant la partie)
    let hudAt = 0;
    function hud(t) {
      const pn = performance.now();
      if (pn - hudAt < 100) return;
      hudAt = pn;
      if (learn) {
        scoreEl.textContent = `🔁 ${lesson.reps}`;
        accEl.textContent = `Note ${lesson.step + 1}/${lesson.steps.length}` + (lesson.loopErrors ? ` · ${lesson.loopErrors} erreur${lesson.loopErrors > 1 ? 's' : ''}` : '');
        comboEl.textContent = '';
        prog.style.width = `${(lesson.step / lesson.steps.length) * 100}%`;
      }
      if (learn) { chordHud(t); return; }
      scoreEl.textContent = demo ? '' : String(game.score);
      comboEl.textContent = !demo && game.combo >= 4 ? `🔥 ×${game.combo}` : '';
      accEl.textContent = !demo && game.judged ? `${game.liveAcc()} %` : '';
      prog.style.width = `${Math.max(0, Math.min(100, (t / chart.length) * 100))}%`;
      chordHud(t);
    }
    function chordHud(t) {
      const cur = [...chart.chords].reverse().find((c) => c.t <= t + chart.spb * 0.5);
      const label = cur ? `${cur.label} : ${cur.notes.map((m) => noteLabel(m, lang === 'both' ? 'fr' : lang)).join(' · ')}` : '';
      if (label !== lastChord) { lastChord = label; chordEl.textContent = label ? `🎼 ${label}` : ''; }
    }

    let viewT = lesson ? lesson.current.t : 0, lastFrame = performance.now();
    function frame() {
      if (!running) return;
      if (learn) {
        // la partition glisse jusqu'à l'étape attendue, puis attend le joueur
        const pn = performance.now();
        viewT += (lesson.current.t - viewT) * Math.min(1, ((pn - lastFrame) / 1000) * 10);
        lastFrame = pn;
        draw(viewT);
        hud(viewT);
        raf = requestAnimationFrame(frame);
        return;
      }
      const t = paused ? pausedAt : T();
      if (!paused) {
        schedule();
        if (demo) {
          for (let i = game.cursor; i < game.notes.length; i++) {
            const n = game.notes[i];
            if (n.t > t) break;
            if (n.state === 'wait') { game.press(n.midi, n.t); feedback(n.midi, 'perfect'); }
          }
        }
        for (const n of game.update(t)) feedback(n.midi, 'miss');
      }
      draw(t);
      hud(t);
      if (!paused && game.finished(t)) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      for (const src of [...pressed.keys()]) doRelease(src);
      voices.forEach((v) => v.release()); voices.clear();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      document.removeEventListener('visibilitychange', onVis);
      document.body.classList.remove('rush-playing');
      offMidi();
      viewKeys({ space: null });
      stopGame = null;
    }
    function finish() {
      ended = true;
      stop();
      if (demo) intro(l, ctx); else outro(l, ctx, game.results());
    }
    // ---- Apprentissage : la note suivante n'est disponible qu'une fois la bonne jouée ----
    let lastLoop = '', loopStart = 0;
    function learnPress(midi, src) {
      const wasStart = lesson.atStart;
      const res = lesson.press(midi, { octaveFree: src.startsWith('midi') });
      if (res.type === 'wrong') { feedback(midi, 'wrong'); return; }
      if (res.type !== 'ok') return;
      if (wasStart) loopStart = performance.now();
      const n = game.notes[res.noteId];
      n.state = 'done'; n.grade = 'perfect';
      feedback(res.midi, 'ok');
      if (res.loopDone) {
        const secs = Math.round((performance.now() - loopStart) / 1000);
        lastLoop = `${lesson.lastLoopErrors ? `${lesson.lastLoopErrors} erreur${lesson.lastLoopErrors > 1 ? 's' : ''}` : 'sans faute ✨'} · ${secs} s`;
        // la boucle repart : la 1re note se rallume, prête à être rejouée
        game.notes.forEach((x) => { x.state = 'wait'; x.grade = null; });
        if (!l.random) setRush((x) => { x.learn = { ...(x.learn || {}) }; x.learn[l.id] = (x.learn[l.id] || 0) + 1; });
        if (lesson.reps <= 5) recordExercise({ key: 'rush:learn', title: `Piano Rush · apprentissage · ${l.title}`, xp: lesson.lastLoopErrors ? 3 : 5, skill: l.skill, success: true });
        if (!lesson.lastLoopErrors) confetti();
      }
    }
    stopGame = stop;
  }

  // ---------- Conclusion ----------
  function outro(l, ctx, r) {
    const st = rushState();
    const idx = LEVELS.findIndex((x) => x.id === l.id);
    const wasOpen = idx >= 0 && isUnlocked(idx + 1);
    const prev = st.best[l.id];
    const firstClear = r.stars >= 1 && !(prev?.stars >= 1);
    const diff = DIFFS[ctx.diff] || DIFFS.normal;
    if (!l.random) {
      setRush((x) => {
        const keep = (old) => (!old || r.acc > old.acc ? { stars: Math.max(r.stars, old?.stars || 0), acc: r.acc } : { ...old, stars: Math.max(r.stars, old.stars) });
        x.best[l.id] = keep(x.best[l.id]);
        x.best[`${l.id}@${ctx.diff}`] = keep(x.best[`${l.id}@${ctx.diff}`]);
      });
    }
    const res = recordExercise({
      key: 'rush', title: `Piano Rush · ${l.title}`, score: r.acc, skill: l.skill, success: r.stars >= 1, bpm: Math.round(l.bpm * diff.tempo),
      xp: Math.round((6 + r.acc * 0.22) * (ctx.diff === 'expert' ? 1.4 : ctx.diff === 'difficile' ? 1.2 : ctx.diff === 'facile' ? 0.8 : 1) + (firstClear ? 10 : 0)),
    });
    if (!l.random) recordGameReview(`rush:${l.id}`, r.acc >= 80);
    const nowOpen = idx >= 0 && idx + 1 < LEVELS.length && isUnlocked(idx + 1);
    const next = idx >= 0 ? LEVELS[idx + 1] : null;
    if (r.stars === 3) confetti();
    showBadges(res.badges);

    const timing = Math.abs(r.meanOffMs) < 15 ? 'Pile dans le temps en moyenne, bravo.'
      : `Tu joues en moyenne ${Math.abs(r.meanOffMs)} ms ${r.meanOffMs < 0 ? 'en avance : écoute le clic et attends-le' : 'en retard : anticipe un peu, appuie quand la tuile touche la ligne'}.`;
    const tips = r.perfect + r.good ? [timing] : [];
    if (Math.abs(r.meanOffMs) >= 40 && !Object.keys(getState().settings.latency || {}).length) tips.push('Toujours décalé dans le même sens ? Ton appareil a peut-être de la latence : Profil › ⏱️ Calibrer la latence (30 s).');
    if (r.shortHolds) tips.push(`${r.shortHolds} note${r.shortHolds > 1 ? 's' : ''} tenue${r.shortHolds > 1 ? 's' : ''} relâchée${r.shortHolds > 1 ? 's' : ''} trop tôt : compte la durée jusqu’au bout de la tuile.`);
    if (r.weakBars.length && r.miss) tips.push(`Mesures à retravailler : ${r.weakBars.join(', ')}.`);
    if (r.wrong > 3) tips.push(`${r.wrong} fausses notes : regarde le nom sur la tuile et la touche qui s’allume avant d’appuyer.`);
    if (r.stars === 0) tips.push('Il faut 60 % pour valider. Astuce : travaille-le d’abord en 🎓 Apprentissage (sans chrono), regarde la démo, ou passe en Mode libre › Facile.');

    window.scrollTo(0, 0);
    root.replaceChildren(
      el('div.page-head',
        el('button.back', { type: 'button', 'aria-label': 'Retour', onclick: menu }, '‹'),
        el('div', el('h1', `${l.emoji} ${l.title}`), el('p.sub', `Conclusion · ${diff.emoji} ${diff.name}`))),
      el('div.card.glow.rush-result',
        el('div.rush-stars', starsTxt(r.stars)),
        el('div.big', `${r.acc} %`),
        el('div.xp-gain', `+${res.xp} XP`),
        res.levelUp ? el('div.levelup', `🎉 Niveau ${res.level} !`) : null,
        el('div.rush-stats',
          stat('🟢 Parfait', r.perfect), stat('🟡 Bien', r.good), stat('🔴 Raté', r.miss), stat('❌ Fausses notes', r.wrong), stat('🔥 Combo max', r.maxCombo), stat('🏅 Score', r.score)),
        !wasOpen && nowOpen && ctx.mode === 'parcours' ? el('div.levelup', `🔓 Niveau débloqué : ${next.emoji} ${next.title}`) : null,
      ),
      el('div.card',
        el('h3', '🔍 Ton jeu'),
        el('ul.rush-points', tips.map((x) => el('li', x))),
        el('div.lesson', el('div.lesson-title', '🧠 Ce que tu as travaillé'), el('p', el('b', l.concept), ' — ', l.outro)),
        el('div.lesson.transfer', el('div.lesson-title', '🎛️ Dans ton studio'), el('p', l.studio)),
      ),
      el('div.row.gap.wrap',
        el('button.btn', { onclick: () => play(l.random ? randomLevel(ctx.diff) : l, ctx) }, '↻ Rejouer'),
        el('button.btn', { onclick: () => intro(l, ctx) }, '📖 Relire l’intro'),
        el('button.btn', { onclick: () => play(l, ctx, { learn: true }) }, '🎓 Apprentissage'),
        ctx.mode === 'parcours' && next && isUnlocked(idx + 1)
          ? el('button.btn.primary', { style: { flex: 1 }, onclick: () => intro(next, ctx) }, `Niveau suivant : ${next.emoji} ${next.title} →`)
          : el('button.btn.primary', { style: { flex: 1 }, onclick: menu }, '☰ Menu'),
      ),
    );
  }

  const stat = (k, v) => el('div', el('small', k), el('b', String(v)));

  if (params.level && levelById(params.level)) intro(levelById(params.level), { mode, diff: mode === 'libre' ? rushState().diff : 'normal' });
  else menu();
  return () => { stopGame?.(); document.body.classList.remove('rush-playing'); };
}

function skillTag(l, big = false) {
  const t = l.skill === 'harmonie' ? '🎼 Accords' : '🥁 Rythme';
  return big ? el('span.tag', t) : el('small.muted', t);
}

function inputHint() {
  const midi = midiStatus().state === 'connected';
  const parts = [];
  if (midi) parts.push('🎹 Clavier MIDI connecté : joue directement (l’octave est libre).');
  if (matchMedia('(pointer: fine)').matches) parts.push('⌨️ Clavier : rangée A S D F… = touches blanches, Q W E R… = noires (lettres affichées sur le piano). Espace = pause.');
  parts.push('📱 Tactile : touche le piano ou directement la colonne de la note.');
  return parts.join(' ');
}
