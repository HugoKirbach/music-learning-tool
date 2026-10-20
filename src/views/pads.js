// Pad Rush : finger drumming sur une grille de pads (2×4 ou 4×4) — anneaux qui se referment + séquenceur au-dessus.
import { el, header, segmented, confetti, showBadges, toast, landscapeBtn } from '../ui.js';
import { getState, update, recordExercise, recordGameReview } from '../store.js';
import { inputLatency } from '../core/latency.js';
import { ensureAudio, now, playSynth, playDrum, playClick, outputLatency, scheduleAhead } from '../core/audio.js';
import { presetParams } from '../player.js';
import { onMidi, midiStatus, enableMidi, midiSupported } from '../midiin.js';
import { viewKeys } from '../shortcuts.js';
import { DIFFS, TileGame, LearnSession, noteFr, noteEn } from '../core/tiles.js';
import { LAYOUTS, padCount, buildPadChart, hasRolls, judgeVelocity, padForNote } from '../core/padgame.js';
import { PAD_CHAPTERS, PAD_LEVELS, padLevelById, padChapterOf } from '../data/pads.js';

const GRADE_TXT = { ok: '✓', perfect: 'Parfait', good: 'Bien', miss: 'Raté', wrong: '✗' };
const KEY_TXT = (code) => code.replace('Key', '').replace('Digit', '');
const VEL = { acc: 1, ghost: 0.32 };

function padsState() {
  return { best: {}, learn: {}, layout: '2x4', rolls: true, metro: true, guide: false, diff: 'normal', map: {}, ...(getState().pads || {}) };
}
const setPads = (fn) => update((s) => { s.pads = { ...padsState(), ...(s.pads || {}) }; fn(s.pads); });
// Ouvert si c'est le premier, si le précédent est réussi, ou s'il a déjà été réussi (un niveau ajouté plus tard
// avant lui ne le reverrouille jamais).
const cleared = (i) => (padsState().best[PAD_LEVELS[i]?.id]?.stars || 0) >= 1;
const isUnlocked = (i) => i === 0 || cleared(i) || cleared(i - 1);
const starsTxt = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const learnCount = (l) => padsState().learn?.[l.id] || 0;
const padLabel = (p) => (p.note != null ? noteFr(p.note) : p.name);
const padSub = (p) => (p.note != null ? noteEn(p.note) : p.notes ? 'accord' : '');

/** Joue le son d'un pad (batterie, note ou accord). */
function playPad(p, time, vel, kit) {
  if (!p) return;
  if (p.sound?.drum) playDrum(p.sound.drum, time, vel, kit);
  else if (p.notes) p.notes.forEach((n) => playSynth(presetParams(p.preset), n, time, 0.4, 0.55 * vel, { send: 0.15 }));
  else if (p.note != null) playSynth(presetParams(p.preset), p.note, time, 0.32, 0.8 * vel, { send: 0.12 });
}

export function render(root, params = {}) {
  let mode = params.mode === 'libre' ? 'libre' : 'parcours';
  let stopGame = null;

  // ---------- Menu ----------
  function menu() {
    stopGame?.(); stopGame = null;
    const st = padsState();
    root.replaceChildren(
      header('🔲 Pad Rush', 'Finger drumming : frappe le pad quand l’anneau se referme. Théorie + pratique, du kick seul au breakbeat.'),
      el('div.row.gap.wrap', { style: { marginBottom: '10px' } },
        segmented([{ value: 'parcours', label: '🧭 Parcours' }, { value: 'libre', label: '🎮 Mode libre' }], mode, (v) => { mode = v; menu(); })),
      settingsCard(),
      mode === 'parcours' ? parcours(st) : libre(st),
    );
  }

  function settingsCard() {
    const st = padsState();
    const toggle = (key, label, title) => el('button.btn.small' + (st[key] ? '.primary' : ''), { title, onclick: () => { setPads((r) => { r[key] = !r[key]; }); menu(); } }, `${st[key] ? '✓' : '○'} ${label}`);
    return el('div.card.rush-settings',
      el('div.row.gap.wrap',
        el('span.small.muted', 'Pads'),
        segmented([{ value: '2x4', label: '2 × 4 (8 pads)' }, { value: '4x4', label: '4 × 4 (16 pads)' }], st.layout, (v) => setPads((r) => { r.layout = v; })),
        toggle('rolls', 'Roulements 1/16 · 1/32', 'Désactivé : au plus une croche par pad, plus confortable au tactile'),
        toggle('metro', 'Métronome'), toggle('guide', 'Guide audio'), toggle('lefty', 'Gaucher', 'Inverse la grille gauche ↔ droite'),
        el('button.btn.small', { onclick: assistant }, '🎛️ Assistant pads MIDI')),
      el('p.small.muted', { style: { margin: '8px 0 0' } }, inputHint(st.layout)),
    );
  }

  function levelRow(l, i, st, { locked = false, next = false, key = l.id } = {}) {
    const b = st.best[key];
    return el('button.rush-level' + (locked ? '.locked' : '') + (next ? '.next' : ''), {
      type: 'button', disabled: locked, onclick: () => intro(l, { mode, diff: mode === 'libre' ? padsState().diff : 'normal' }),
    },
    el('span.rl-emoji', locked ? '🔒' : l.emoji),
    el('span.rl-txt', el('b', `${i != null ? `${i + 1}. ` : ''}${l.title}`), el('small', l.concept)),
    el('span.rl-stars' + (b?.stars ? '.on' : ''), b ? starsTxt(b.stars) : (hasRolls(l) ? el('small.muted', '🌀 rolls') : '')));
  }

  function parcours(st) {
    const done = PAD_LEVELS.filter((l) => (st.best[l.id]?.stars || 0) >= 1).length;
    const stars = PAD_LEVELS.reduce((a, l) => a + (st.best[l.id]?.stars || 0), 0);
    const nextIdx = PAD_LEVELS.findIndex((l, i) => isUnlocked(i) && !(st.best[l.id]?.stars >= 1));
    return el('div',
      el('div.card.glow', el('div.row.between',
        el('div', el('b', `${done}/${PAD_LEVELS.length} niveaux`), el('div.small.muted', `${stars}/${PAD_LEVELS.length * 3} ★ · 60 % pour débloquer la suite`)),
        nextIdx >= 0 ? el('button.btn.primary', { onclick: () => intro(PAD_LEVELS[nextIdx], { mode: 'parcours', diff: 'normal' }) }, '▶ Continuer') : el('span.tag', '🏆 Terminé'))),
      PAD_CHAPTERS.map((c) => el('div',
        el('div.fam-head', el('h3.fam-title', `${c.emoji} ${c.id}. ${c.name}`), el('span.small.muted', c.desc)),
        el('div.rush-levels', PAD_LEVELS.map((l, i) => [l, i]).filter(([l]) => l.ch === c.id)
          .map(([l, i]) => levelRow(l, i, st, { locked: !isUnlocked(i), next: i === nextIdx }))))),
    );
  }

  function libre(st) {
    const diffDesc = {
      facile: 'Tempo ×0,75, grande tolérance : pour apprendre.', normal: 'Tempo d’origine.',
      difficile: 'Tempo ×1,15, fenêtre plus serrée.', expert: 'Tempo ×1,3, timing strict.',
    };
    const descEl = el('p.small.muted', diffDesc[st.diff]);
    return el('div',
      el('div.card', el('b', 'Difficulté'),
        segmented(Object.values(DIFFS).map((d) => ({ value: d.id, label: `${d.emoji} ${d.name}` })), st.diff, (v) => { setPads((r) => { r.diff = v; }); descEl.textContent = diffDesc[v]; }),
        descEl),
      PAD_CHAPTERS.map((c) => el('div',
        el('h3.fam-title', `${c.emoji} ${c.name}`),
        el('div.rush-levels', PAD_LEVELS.filter((l) => l.ch === c.id).map((l) => levelRow(l, null, st, { key: `${l.id}@${st.diff}` }))))),
    );
  }

  // ---------- Introduction ----------
  function intro(l, ctx) {
    stopGame?.(); stopGame = null;
    const st = padsState();
    const diff = DIFFS[ctx.diff] || DIFFS.normal;
    const chart = buildPadChart(l, diff, { layout: st.layout, rolls: st.rolls, lefty: st.lefty });
    const ch = padChapterOf(l);
    window.scrollTo(0, 0);
    root.replaceChildren(
      el('div.page-head',
        el('button.back', { type: 'button', 'aria-label': 'Retour', onclick: menu }, '‹'),
        el('div', el('h1', `${l.emoji} ${l.title}`), el('p.sub', ch ? `Chapitre ${ch.id} · ${ch.name}` : ''))),
      el('div.card.glow',
        el('div.row.gap.wrap', el('span.tag', `🎯 ${l.concept}`), l.dyn ? el('span.tag', '🎚️ vélocité') : null, hasRolls(l) ? el('span.tag', st.rolls ? '🌀 roulements' : '🌀 roulements simplifiés') : null),
        el('h3', '📖 Ce qu’on travaille'),
        el('p', l.intro),
        el('div.lesson', el('div.lesson-title', '🧠 À retenir'), el('ul.rush-points', l.points.map((p) => el('li', p)))),
        el('div.small.muted', { style: { marginTop: '10px' } }, 'La partition (1re mesure) :'),
        seqGrid(chart, l),
        padMap(chart, st.layout),
      ),
      el('div.card',
        el('div.row.gap.wrap.small.muted',
          el('span', `${diff.emoji} ${diff.name}`), el('span', `♩ = ${chart.bpm}`), el('span', `${chart.notes.length} coups`), el('span', `≈ ${Math.round(chart.length)} s`),
          chart.thinned ? el('span', `🌀 ${chart.thinned} coups rapides simplifiés`) : null),
        el('div.row.gap.wrap', { style: { marginTop: '10px' } },
          el('button.btn', { onclick: () => play(l, ctx, { demo: true }) }, '👀 Démo'),
          el('button.btn', { onclick: () => play(l, ctx, { learn: true }) }, '🎓 Apprentissage'),
          el('button.btn', { onclick: () => play(l, ctx, { ear: true }) }, '🎧 Défi à l’oreille'),
          el('button.btn.primary', { style: { flex: 1 }, onclick: () => play(l, ctx) }, '▶ Jouer')),
        el('p.small.muted', { style: { margin: '8px 0 0' } },
          '🎓 Apprentissage : les coups dans l’ordre, sans tempo.', learnCount(l) ? ` Déjà ${learnCount(l)} répétition${learnCount(l) > 1 ? 's' : ''}.` : '',
          ' 🎧 Défi à l’oreille : écoute le groove 2 fois, puis rejoue-le sans rien voir.'),
      ),
    );
  }

  // Grille de pas (vue séquenceur) de la 1re mesure.
  function seqGrid(chart, l, { steps = (l.res || 4) * 4, marks = null } = {}) {
    const res = chart.res;
    return el('div.pad-seq', { style: { '--steps': steps } },
      chart.pads.map((p) => el('div.ps-row',
        el('span.ps-name', { style: { color: p.color } }, padLabel(p)),
        el('div.ps-cells', Array.from({ length: steps }, (_, s) => {
          const n = chart.notes.find((x) => x.midi === p.idx && Math.abs(x.beat * res - s) < 1e-6);
          const m = marks?.[`${p.idx}:${s}`];
          return el('i' + (s % res === 0 ? '.beat' : '') + (n ? '.on' : '') + (n?.vel ? '.' + n.vel : '') + (m ? '.' + m : ''), { style: n ? { '--c': p.color } : {} });
        })))));
  }

  // Où est chaque son sur tes pads.
  function padMap(chart, layout) {
    const L = LAYOUTS[layout];
    const by = Object.fromEntries(chart.pads.map((p) => [p.idx, p]));
    const order = [];
    for (let r = L.rows - 1; r >= 0; r--) for (let c = 0; c < L.cols; c++) order.push(r * L.cols + c);
    return el('div', { style: { marginTop: '10px' } },
      el('div.small.muted', `Disposition sur tes pads (${layout.replace('x', ' × ')}) :`),
      el('div.pad-mini', { style: { '--cols': L.cols } }, order.map((i) => {
        const p = by[i];
        return el('span' + (p ? '' : '.off'), { style: p ? { '--c': p.color } : {} }, p ? padLabel(p) : '', el('small', KEY_TXT(L.keys[i])));
      })));
  }

  // ---------- Partie ----------
  function play(l, ctx, { demo = false, learn = false, ear = false } = {}) {
    stopGame?.();
    ensureAudio();
    const st = padsState();
    const layout = st.layout;
    const L = LAYOUTS[layout];
    const diff = DIFFS[ctx.diff] || DIFFS.normal;
    const chart = buildPadChart(l, diff, { layout, rolls: st.rolls, lefty: st.lefty, repeat: learn ? 1 : ear ? 2 : l.repeat || 1 });
    const game = new TileGame(chart, diff);
    const lesson = learn ? new LearnSession(chart) : null;
    const byIdx = Object.fromEntries(chart.pads.map((p) => [p.idx, p]));
    const kit = l.kit || 'club';
    const midiOn = midiStatus().state === 'connected';
    const finePointer = matchMedia('(pointer: fine)').matches;

    // ---- Interface ----
    const scoreEl = el('b', '');
    const comboEl = el('span.rush-combo', '');
    const accEl = el('span.small.muted', '');
    const dynEl = el('div.rush-now', '');
    const prog = el('div.bar-fill', { style: { width: '0%' } });
    const pauseBtn = el('button.btn.small', { onclick: () => togglePause() }, '⏸');
    const strip = el('canvas.pad-strip');
    const overlay = el('div.pads-overlay');
    const padEls = [];
    const order = [];
    for (let r = L.rows - 1; r >= 0; r--) for (let c = 0; c < L.cols; c++) order.push(r * L.cols + c);
    const grid = el('div.pad-grid', { style: { '--cols': L.cols } }, order.map((i) => {
      const p = byIdx[i];
      const e = el('button.pad' + (p ? '' : '.off'), { type: 'button', style: { '--c': p?.color || '#3a3a55' } },
        el('div.pad-ring'), el('span.pad-name', p ? padLabel(p) : ''), p && padSub(p) ? el('small.pad-sub', padSub(p)) : null,
        finePointer ? el('span.pad-key', KEY_TXT(L.keys[i])) : null, el('span.pad-fb'));
      padEls[i] = e;
      return e;
    }));
    const title = demo ? '👀 Démo' : learn ? `🎓 Apprentissage · ${l.title}` : ear ? `🎧 Défi à l’oreille · ${l.title}` : `${l.emoji} ${l.title}`;
    const wrap = el('div.rush-game.pads-game' + (layout === '4x4' ? '.big' : ''),
      el('div.rush-hud',
        el('div', el('div.small.muted', title), el('div.row.gap', scoreEl, comboEl, accEl)),
        dynEl,
        el('div.row.gap', landscapeBtn(), demo || learn ? null : pauseBtn, el('button.btn.small', { onclick: () => { stop(); intro(l, ctx); } }, '✕'))),
      el('div.bar.rush-prog', prog),
      strip,
      el('div.pad-stage', grid, overlay),
    );
    root.replaceChildren(wrap);
    document.body.classList.add('rush-playing');
    window.scrollTo(0, 0);

    // ---- Séquenceur (aperçu de la mesure à venir) ----
    const g2 = strip.getContext('2d');
    const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    const rowsPads = [...chart.pads].sort((a, b) => b.idx - a.idx);
    let SW = 0, SH = 0, rowH = 0;
    function layoutStrip() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      SW = grid.clientWidth || wrap.clientWidth;
      rowH = Math.max(11, Math.min(18, 120 / rowsPads.length));
      SH = rowH * rowsPads.length + 6;
      strip.width = SW * dpr; strip.height = SH * dpr;
      strip.style.width = `${SW}px`; strip.style.height = `${SH}px`;
      g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      // la grille de pads remplit l'espace restant (carrée au maximum)
      const navH = innerWidth >= 900 ? 0 : (document.getElementById('nav')?.offsetHeight || 0);
      const top = grid.getBoundingClientRect().top;
      const avail = Math.max(180, innerHeight - top - navH - 12);
      const w = Math.min(wrap.clientWidth, 640, (avail / L.rows) * L.cols);
      grid.style.width = `${w}px`;
    }
    layoutStrip();
    requestAnimationFrame(layoutStrip);
    const onResize = () => layoutStrip();
    window.addEventListener('resize', onResize);

    // ---- Horloge ----
    const lat = outputLatency();
    const barDur = chart.meter * chart.spb;
    const lead = barDur * (barDur < 1.6 ? 2 : 1);
    const baseLen = chart.baseBeats * chart.spb;
    const listen = ear ? baseLen * 2 : 0;
    let start = now() + 0.2 + listen + lead;
    const T = () => now() - lat - start;
    let paused = false, pausedAt = 0, raf = 0, running = true, ended = false;
    const firstT = -(lead + listen);
    let clickK = Math.floor(firstT / chart.spb);
    let guideI = 0, listenI = 0;
    const guide = demo || (st.guide && !ear);
    const baseNotes = chart.notes.filter((n) => n.beat < chart.baseBeats - 1e-9);
    const listenEvents = ear ? [0, 1].flatMap((k) => baseNotes.map((n) => ({ n, t: firstT + k * baseLen + n.t }))) : [];
    const userHits = [];
    let dynOk = 0, dynTotal = 0;
    const pressed = new Map();

    function schedule() {
      const horizon = now() + scheduleAhead() + 0.03;
      for (;;) {
        const t = clickK * chart.spb;
        const at = start + t;
        if (at > horizon || t > chart.length + 0.01) break;
        if (t >= firstT - 1e-6 && (t < 0 || st.metro)) playClick(Math.max(at, now()), Math.abs((clickK % chart.meter)) < 1e-6);
        clickK++;
      }
      while (listenI < listenEvents.length && start + listenEvents[listenI].t < horizon) {
        const { n, t } = listenEvents[listenI++];
        if (start + t >= now() - 0.02) playPad(byIdx[n.midi], start + t, VEL[n.vel] || 0.8, kit);
      }
      if (guide) {
        while (guideI < chart.notes.length && start + chart.notes[guideI].t < horizon) {
          const n = chart.notes[guideI++];
          if (start + n.t >= now() - 0.02) playPad(byIdx[n.midi], start + n.t, (VEL[n.vel] || 0.8) * (demo ? 1 : 0.45), kit);
        }
      }
    }

    function feedback(idx, grade) {
      const e = padEls[idx]?.querySelector('.pad-fb');
      if (!e) return;
      e.textContent = GRADE_TXT[grade] || '';
      e.className = 'pad-fb ' + grade;
      void e.offsetWidth;
      e.classList.add('show');
      padEls[idx].classList.remove('flash-perfect', 'flash-good', 'flash-wrong', 'flash-ok');
      void padEls[idx].offsetWidth;
      padEls[idx].classList.add('flash-' + (grade === 'miss' ? 'wrong' : grade));
    }

    function doPress(idx, src, vel) {
      if (paused || ended || idx == null) return;
      ensureAudio();
      pressed.set(src, idx);
      padEls[idx]?.classList.add('down');
      playPad(byIdx[idx], now(), vel ?? 0.85, kit);
      if (demo) return;
      if (learn) return learnPress(idx);
      const t = T() - inputLatency(getState().settings, src);
      if (t < -0.25) return; // écoute / décompte : on peut s'échauffer
      const ev = game.press(idx, t);
      userHits.push({ idx, t });
      if (ev.type === 'hit') {
        feedback(idx, ev.grade);
        const ok = judgeVelocity(ev.note.vel, vel);
        if (ok != null) { dynTotal++; if (ok) dynOk++; else dynEl.textContent = ev.note.vel === 'acc' ? '🎚️ Plus fort sur les accents !' : '🎚️ Plus doux sur les ghost notes !'; }
      } else feedback(idx, 'wrong');
    }
    function doRelease(src) {
      const idx = pressed.get(src);
      if (idx == null) return;
      pressed.delete(src);
      if (![...pressed.values()].includes(idx)) padEls[idx]?.classList.remove('down');
    }

    // ---- Entrées ----
    padEls.forEach((e, i) => {
      e.addEventListener('pointerdown', (ev) => { ev.preventDefault(); e.setPointerCapture?.(ev.pointerId); doPress(i, 'p' + ev.pointerId, null); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => e.addEventListener(t, (ev) => doRelease('p' + ev.pointerId)));
    });
    const kd = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const i = L.keys.indexOf(e.code);
      if (i < 0) return;
      e.preventDefault();
      doPress(i, 'k' + e.code, null);
    };
    const ku = (e) => { if (L.keys.includes(e.code)) doRelease('k' + e.code); };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    let warned = false;
    const offMidi = onMidi({
      noteOn: (n, v) => {
        const i = padForNote(n, st.map, layout);
        if (i == null) { if (!warned) { warned = true; toast(`Pad non reconnu (note ${n}) : lance l’Assistant pads MIDI depuis le menu`, 'info', 4000); } return; }
        doPress(i, 'm' + n, v);
      },
      noteOff: (n) => doRelease('m' + n),
    });
    viewKeys({ space: () => { if (!demo && !learn) togglePause(); } });
    const onVis = () => { if (document.hidden && !paused && !demo && !learn) togglePause(); };
    document.addEventListener('visibilitychange', onVis);

    function togglePause() {
      if (ended) return;
      if (!paused) {
        paused = true; pausedAt = T();
        pauseBtn.textContent = '▶';
      } else {
        const back = Math.max(firstT, pausedAt - barDur);
        start = now() - lat - back + 0.05;
        clickK = Math.ceil(back / chart.spb);
        guideI = chart.notes.findIndex((n) => n.t >= back + 0.02); if (guideI < 0) guideI = chart.notes.length;
        listenI = listenEvents.findIndex((x) => x.t >= back + 0.02); if (listenI < 0) listenI = listenEvents.length;
        paused = false;
        pauseBtn.textContent = '⏸';
      }
    }

    // ---- Dessin : séquenceur + anneaux ----
    const approach = Math.max(0.7, diff.look * 0.45);
    function drawStrip(t) {
      g2.clearRect(0, 0, SW, SH);
      g2.fillStyle = '#12121f'; g2.fillRect(0, 0, SW, SH);
      const px = SW * 0.18;
      const span = barDur * 1.15;
      const pps = (SW - px) / span;
      const xOf = (tt) => px + (tt - t) * pps;
      rowsPads.forEach((p, r) => { if (r % 2) { g2.fillStyle = 'rgba(255,255,255,0.03)'; g2.fillRect(0, 3 + r * rowH, SW, rowH); } });
      const step = chart.spb / chart.res;
      const s0 = Math.floor((t - px / pps) / step), s1 = Math.ceil((t + span) / step);
      for (let s = s0; s <= s1; s++) {
        const x = xOf(s * step);
        const isBeat = s % chart.res === 0, isBar = s % (chart.res * chart.meter) === 0;
        if (!isBeat && chart.res > 4 && s % 2) continue;
        g2.fillStyle = isBar ? 'rgba(179,136,255,0.45)' : isBeat ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)';
        g2.fillRect(x, 0, isBar ? 2 : 1, SH);
      }
      if (!ear || ended) {
        const w = Math.max(3, step * pps - 2);
        for (const n of game.notes) {
          if (n.t < t - px / pps - 0.1) continue;
          if (n.t > t + span) break;
          const r = rowsPads.findIndex((p) => p.idx === n.midi);
          const p = rowsPads[r];
          const h = n.vel === 'ghost' ? rowH * 0.45 : rowH - 4;
          g2.globalAlpha = n.state === 'wait' ? (n.vel === 'ghost' ? 0.55 : 1) : 0.3;
          g2.fillStyle = n.state === 'miss' ? '#ff5d73' : n.state === 'done' ? '#4ade80' : p.color;
          g2.fillRect(xOf(n.t), 3 + r * rowH + (rowH - 4 - h) / 2 + 2, w, h);
          if (n.vel === 'acc' && n.state === 'wait') { g2.fillStyle = '#fff'; g2.fillRect(xOf(n.t), 3 + r * rowH + 2, w, 2); }
        }
        g2.globalAlpha = 1;
      }
      g2.fillStyle = '#5ce1e6'; g2.fillRect(px - 1, 0, 2, SH);
      g2.font = `600 ${Math.min(10, rowH - 3)}px ${font}`;
      rowsPads.forEach((p, r) => { g2.fillStyle = p.color; g2.fillText(padLabel(p), 4, 3 + r * rowH + rowH / 2 + 3); });
    }

    const ringState = new Map();
    function drawRings(t) {
      const next = new Map();
      if (learn) {
        const cur = new Set(lesson.current.notes.filter((x) => game.notes[x.id].state === 'wait').map((x) => x.midi));
        padEls.forEach((e, i) => e?.classList.toggle('next', cur.has(i)));
        return;
      }
      if (!ear) {
        for (let i = game.cursor; i < game.notes.length; i++) {
          const n = game.notes[i];
          if (n.t > t + approach) break;
          if (n.state === 'wait' && !next.has(n.midi) && n.t >= t - diff.window) next.set(n.midi, n);
        }
      }
      padEls.forEach((e, i) => {
        if (!e) return;
        const ring = e.firstChild;
        const n = next.get(i);
        const key = n ? `${n.id}` : '';
        if (!n) { if (ringState.get(i)) { ring.style.opacity = '0'; ringState.set(i, ''); } return; }
        const dt = Math.max(0, n.t - t) / approach;
        ring.style.transform = `scale(${1 + 0.5 * dt})`;
        ring.style.opacity = String(0.35 + 0.65 * (1 - dt));
        if (ringState.get(i) !== key) { ring.className = 'pad-ring' + (n.vel ? ' ' + n.vel : ''); ringState.set(i, key); }
      });
    }

    function setOverlay(txt, sub = '') {
      const v = txt ? `${txt}|${sub}` : '';
      if (overlay.dataset.v === v) return;
      overlay.dataset.v = v;
      overlay.replaceChildren(...(txt ? [el('b', txt), sub ? el('span', sub) : null] : []));
      overlay.classList.toggle('show', !!txt);
    }

    // Bandeau du haut : 10 mises à jour par seconde suffisent
    let hudAt = 0;
    function hud(t) {
      const pn = performance.now();
      if (pn - hudAt < 100) return;
      hudAt = pn;
      if (learn) {
        scoreEl.textContent = `🔁 ${lesson.reps}`;
        accEl.textContent = `Coup ${lesson.step + 1}/${lesson.steps.length}` + (lesson.loopErrors ? ` · ${lesson.loopErrors} erreur${lesson.loopErrors > 1 ? 's' : ''}` : '');
        prog.style.width = `${(lesson.step / lesson.steps.length) * 100}%`;
        return;
      }
      scoreEl.textContent = demo ? '' : String(game.score);
      comboEl.textContent = !demo && game.combo >= 4 ? `🔥 ×${game.combo}` : '';
      accEl.textContent = !demo && game.judged ? `${game.liveAcc()} %` + (dynTotal ? ` · 🎚️ ${dynOk}/${dynTotal}` : '') : '';
      prog.style.width = `${Math.max(0, Math.min(100, (t / chart.length) * 100))}%`;
    }

    let viewT = lesson ? lesson.current.t : 0, lastFrame = performance.now();
    function frame() {
      if (!running) return;
      if (learn) {
        const pn = performance.now();
        viewT += (lesson.current.t - viewT) * Math.min(1, ((pn - lastFrame) / 1000) * 10);
        lastFrame = pn;
        drawStrip(viewT); drawRings(viewT); hud(viewT);
        setOverlay(lesson.atStart ? (lesson.reps ? `✅ Boucle ${lesson.reps} : ${lastLoop}` : '🎓 À ton rythme') : '', lesson.atStart ? (lesson.reps ? 'Rejoue le 1er coup pour recommencer' : 'Frappe le pad qui brille') : '');
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
      drawStrip(t); drawRings(t); hud(t);
      if (paused) setOverlay('⏸ Pause', 'Espace ou ▶ pour reprendre');
      else if (ear && t < -lead) setOverlay(`🎧 Écoute ${t < -lead - baseLen ? 1 : 2}/2`, 'Repère quel pad joue quoi');
      else if (t < 0) setOverlay(String(Math.ceil(-t / chart.spb)), ear ? 'À toi : rejoue-le de mémoire !' : demo ? 'Regarde et écoute…' : 'Prépare tes doigts…');
      else setOverlay('');
      if (!paused && game.finished(t)) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    // ---- Apprentissage ----
    let lastLoop = '', loopStart = 0;
    function learnPress(idx) {
      const wasStart = lesson.atStart;
      const res = lesson.press(idx);
      if (res.type === 'wrong') { feedback(idx, 'wrong'); return; }
      if (res.type !== 'ok') return;
      if (wasStart) loopStart = performance.now();
      game.notes[res.noteId].state = 'done';
      feedback(idx, 'ok');
      if (res.loopDone) {
        const secs = Math.round((performance.now() - loopStart) / 1000);
        lastLoop = `${lesson.lastLoopErrors ? `${lesson.lastLoopErrors} erreur${lesson.lastLoopErrors > 1 ? 's' : ''}` : 'sans faute ✨'} · ${secs} s`;
        game.notes.forEach((x) => { x.state = 'wait'; x.grade = null; });
        setPads((x) => { x.learn = { ...(x.learn || {}) }; x.learn[l.id] = (x.learn[l.id] || 0) + 1; });
        if (lesson.reps <= 5) recordExercise({ key: 'pads:learn', title: `Pad Rush · apprentissage · ${l.title}`, xp: lesson.lastLoopErrors ? 3 : 5, skill: l.melodic ? 'melodie' : 'rythme', success: true });
        if (!lesson.lastLoopErrors) confetti();
      }
    }

    function stop() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
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
      if (demo) intro(l, ctx);
      else outro(l, ctx, game.results(), { ear, chart, played: game.notes, userHits, dyn: { ok: dynOk, total: dynTotal }, midiOn });
    }
    stopGame = stop;
  }

  // ---------- Conclusion ----------
  function outro(l, ctx, r, { ear, chart, played = chart.notes, userHits, dyn, midiOn }) {
    const st = padsState();
    const idx = PAD_LEVELS.findIndex((x) => x.id === l.id);
    const wasOpen = idx >= 0 && isUnlocked(idx + 1);
    const prev = st.best[l.id];
    // Dynamique : compte pour 25 % de la note dans les niveaux « vélocité » (seulement si elle a pu être mesurée).
    const dynPct = dyn.total ? Math.round((dyn.ok / dyn.total) * 100) : null;
    const acc = l.dyn && dynPct != null ? Math.round(r.acc * 0.75 + dynPct * 0.25) : r.acc;
    const stars = acc >= 93 ? 3 : acc >= 80 ? 2 : acc >= 60 ? 1 : 0;
    const firstClear = stars >= 1 && !(prev?.stars >= 1);
    const keep = (old) => (!old || acc > old.acc ? { stars: Math.max(stars, old?.stars || 0), acc } : { ...old, stars: Math.max(stars, old.stars) });
    setPads((x) => {
      if (ear) {
        x.best[`${l.id}@ear`] = keep(x.best[`${l.id}@ear`]);
        // Réussir le défi à l'oreille valide aussi le niveau dans le parcours
        if (stars >= 1) x.best[l.id] = keep(x.best[l.id]);
      }
      else { x.best[l.id] = keep(x.best[l.id]); x.best[`${l.id}@${ctx.diff}`] = keep(x.best[`${l.id}@${ctx.diff}`]); }
    });
    const res = recordExercise({
      key: ear ? 'pads:ear' : 'pads', title: `Pad Rush · ${l.title}`, score: acc, skill: ear ? 'oreille' : l.melodic ? 'melodie' : 'rythme', success: stars >= 1, bpm: chart.bpm,
      xp: Math.round((6 + acc * 0.22) * (ear ? 1.3 : ctx.diff === 'expert' ? 1.4 : ctx.diff === 'difficile' ? 1.2 : ctx.diff === 'facile' ? 0.8 : 1) + (firstClear ? 10 : 0)),
    });
    if (!l.random) recordGameReview(`${ear ? 'padsear' : 'pads'}:${l.id}`, acc >= 80);
    const nowOpen = idx >= 0 && idx + 1 < PAD_LEVELS.length && isUnlocked(idx + 1);
    const next = idx >= 0 ? PAD_LEVELS[idx + 1] : null;
    if (stars === 3) confetti();
    showBadges(res.badges);

    const tips = [];
    if (r.perfect + r.good) tips.push(Math.abs(r.meanOffMs) < 15 ? 'Pile dans le temps en moyenne, bravo.'
      : `Tu frappes en moyenne ${Math.abs(r.meanOffMs)} ms ${r.meanOffMs < 0 ? 'en avance : attends que l’anneau touche le pad' : 'en retard : anticipe légèrement le clic'}.`);
    if (r.weakBars.length && r.miss) tips.push(`Mesures à retravailler : ${r.weakBars.join(', ')}.`);
    if (r.wrong > 3) tips.push(`${r.wrong} coups en trop ou sur le mauvais pad : regarde la disposition des sons avant de jouer.`);
    if (l.dyn) tips.push(dynPct != null ? `Dynamique : ${dyn.ok}/${dyn.total} accents et ghost notes justes (${dynPct} %).` : 'La dynamique (vélocité) n’a pas été notée : il faut un vrai pad MIDI sensible à la force de frappe.');
    if (stars === 0) tips.push('Il faut 60 % pour valider. Astuce : 🎓 Apprentissage d’abord, puis Mode libre › Facile.');

    // Défi à l'oreille : partition révélée, comparée à ton jeu (2e passage).
    let reveal = null;
    if (ear) {
      const steps = Math.round(chart.baseBeats * chart.res);
      const marks = {};
      const stepOf = (t) => Math.round((t / chart.spb) * chart.res);
      // Notes jouées (avec leur état : réussie / ratée), pas la partition brute
      const second = played.filter((n) => n.beat >= chart.baseBeats - 1e-9);
      for (const n of second) marks[`${n.midi}:${Math.round((n.beat - chart.baseBeats) * chart.res)}`] = n.state === 'done' ? 'hit' : 'missed';
      for (const h of userHits) {
        const s = stepOf(h.t) - steps;
        if (s < 0 || s >= steps) continue;
        if (!marks[`${h.idx}:${s}`]) marks[`${h.idx}:${s}`] = 'extra';
      }
      const showSteps = Math.min(steps, chart.res * 8);
      reveal = el('div.card',
        el('h3', '🎧 La solution (2e passage)'),
        el('p.small.muted', '🟩 trouvé · 🟥 manqué · 🟨 coup en trop'),
        seqGrid({ ...chart, notes: second.map((n) => ({ ...n, beat: n.beat - chart.baseBeats })) }, l, { steps: showSteps, marks }));
    }

    window.scrollTo(0, 0);
    root.replaceChildren(
      el('div.page-head',
        el('button.back', { type: 'button', 'aria-label': 'Retour', onclick: menu }, '‹'),
        el('div', el('h1', `${l.emoji} ${l.title}`), el('p.sub', `Conclusion · ${ear ? '🎧 Défi à l’oreille' : `${(DIFFS[ctx.diff] || DIFFS.normal).emoji} ${(DIFFS[ctx.diff] || DIFFS.normal).name}`}`))),
      el('div.card.glow.rush-result',
        el('div.rush-stars', starsTxt(stars)),
        el('div.big', `${acc} %`),
        el('div.xp-gain', `+${res.xp} XP`),
        res.levelUp ? el('div.levelup', `🎉 Niveau ${res.level} !`) : null,
        el('div.rush-stats',
          stat('🟢 Parfait', r.perfect), stat('🟡 Bien', r.good), stat('🔴 Raté', r.miss), stat('❌ En trop', r.wrong), stat('🔥 Combo max', r.maxCombo),
          dynPct != null ? stat('🎚️ Dynamique', `${dynPct} %`) : stat('🏅 Score', r.score)),
        !wasOpen && nowOpen && ctx.mode === 'parcours' ? el('div.levelup', `🔓 Niveau débloqué : ${next.emoji} ${next.title}`) : null,
        !midiOn && l.dyn ? el('p.small.muted', 'Branche ton MPC pour que la vélocité compte.') : null,
      ),
      reveal,
      el('div.card',
        el('h3', '🔍 Ton jeu'),
        el('ul.rush-points', tips.map((x) => el('li', x))),
        el('div.lesson', el('div.lesson-title', '🧠 Ce que tu as travaillé'), el('p', el('b', l.concept), ' — ', l.outro)),
        el('div.lesson.transfer', el('div.lesson-title', '🎛️ Dans ton studio'), el('p', l.studio)),
      ),
      el('div.row.gap.wrap',
        el('button.btn', { onclick: () => play(l, ctx, { ear }) }, '↻ Rejouer'),
        el('button.btn', { onclick: () => play(l, ctx, { learn: true }) }, '🎓 Apprentissage'),
        ear ? el('button.btn', { onclick: () => play(l, ctx) }, '▶ Mode normal') : el('button.btn', { onclick: () => play(l, ctx, { ear: true }) }, '🎧 À l’oreille'),
        ctx.mode === 'parcours' && next && isUnlocked(idx + 1)
          ? el('button.btn.primary', { style: { flex: 1 }, onclick: () => intro(next, ctx) }, `Niveau suivant : ${next.emoji} ${next.title} →`)
          : el('button.btn.primary', { style: { flex: 1 }, onclick: menu }, '☰ Menu'),
      ),
    );
  }
  const stat = (k, v) => el('div', el('small', k), el('b', String(v)));

  // ---------- Assistant : apprendre les notes MIDI de tes pads ----------
  function assistant() {
    stopGame?.(); stopGame = null;
    const st = padsState();
    const L = LAYOUTS[st.layout];
    const n = padCount(st.layout);
    const map = {};
    let i = 0;
    const order = [];
    for (let r = L.rows - 1; r >= 0; r--) for (let c = 0; c < L.cols; c++) order.push(r * L.cols + c);
    const cells = [];
    const grid = el('div.pad-mini.assist', { style: { '--cols': L.cols } }, order.map((k) => { const c = el('span', String(k + 1)); cells[k] = c; return c; }));
    const msg = el('p', '');
    const statusEl = el('p.small.muted', '');
    const paint = () => {
      cells.forEach((c, k) => {
        const note = Object.keys(map).find((x) => map[x] === k);
        c.className = k === i ? 'cur' : note ? 'done' : '';
        c.replaceChildren(String(k + 1), note ? el('small', `note ${note}`) : null);
      });
      msg.replaceChildren(i < n ? el('b', `Frappe le pad n°${i + 1} (surligné)`) : el('b', '✅ Tous les pads sont réglés !'));
      const ms = midiStatus();
      statusEl.textContent = ms.state === 'connected' ? `🎹 ${ms.devices.join(', ')} connecté` : '⚠️ Aucun appareil MIDI détecté : branche ton MPC et autorise le MIDI.';
    };
    const save = () => { setPads((x) => { x.map = { ...map }; }); toast('Pads enregistrés ✅', 'good'); menu(); };
    const off = onMidi({
      noteOn: (note) => {
        if (i >= n) return;
        for (const k of Object.keys(map)) if (map[k] === i) delete map[k];
        map[note] = i;
        i++;
        paint();
      },
    });
    stopGame = () => { off(); stopGame = null; };
    root.replaceChildren(
      el('div.page-head', el('button.back', { type: 'button', 'aria-label': 'Retour', onclick: menu }, '‹'),
        el('div', el('h1', '🎛️ Assistant pads MIDI'), el('p.sub', `Disposition ${st.layout.replace('x', ' × ')} · le pad 1 est en bas à gauche`))),
      el('div.card',
        el('p', 'Frappe chaque pad de ton contrôleur dans l’ordre indiqué : l’app retient la note MIDI de chacun. Ça marche avec tous les contrôleurs (MPC, MPD, Launchpad, Maschine…).'),
        statusEl,
        midiSupported() && midiStatus().state !== 'connected' ? el('button.btn.small', { onclick: async () => { ensureAudio(); await enableMidi(); paint(); } }, '🔌 Activer le MIDI') : null,
        msg, grid,
        el('div.row.gap.wrap', { style: { marginTop: '12px' } },
          el('button.btn.small', { onclick: () => { if (i < n) { i++; paint(); } } }, 'Passer ce pad'),
          el('button.btn.small', { onclick: () => { for (const k of Object.keys(map)) delete map[k]; i = 0; paint(); } }, '↺ Recommencer'),
          el('button.btn.small', { onclick: () => { setPads((x) => { x.map = {}; }); toast('Préréglage MPC : pad 1 = note 36 (C1), puis +1 par pad', 'good'); menu(); } }, 'Préréglage MPC (36 → 51)'),
          el('button.btn.primary', { onclick: save }, 'Enregistrer')),
        el('p.small.muted', 'Astuce MPC : utilise la banque de pads A. Sur le MPC Key 37, les 8 pads suffisent pour le format 2 × 4.')),
    );
    paint();
  }

  if (params.level && padLevelById(params.level)) intro(padLevelById(params.level), { mode, diff: mode === 'libre' ? padsState().diff : 'normal' });
  else menu();
  return () => { stopGame?.(); document.body.classList.remove('rush-playing'); };
}

function inputHint(layout) {
  const parts = [];
  if (midiStatus().state === 'connected') parts.push('🎹 Pads MIDI connectés (réglage par défaut : pad 1 = note 36 ; sinon lance l’assistant).');
  if (matchMedia('(pointer: fine)').matches) parts.push(layout === '4x4' ? '⌨️ Clavier : 1 2 3 4 / Q W E R / A S D F / Z X C V.' : '⌨️ Clavier : Q W E R (rangée du haut) / A S D F (rangée du bas).');
  parts.push('📱 Tactile : touche directement les pads (plusieurs doigts possibles).');
  return parts.join(' ');
}
