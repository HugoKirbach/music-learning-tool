// Outils des leçons : lecture des sons décrits par les exercices, petits dessins (clavier, ondes, enveloppes,
// filtres, grilles…), clavier de piano 3D, sons de réussite / d'erreur et la mascotte.
import { el } from '../ui.js';
import { ensureAudio, now, playSynth, playDrum, playClick, setPump } from '../core/audio.js';
import { presetParams } from '../player.js';
import { resolvePatch } from '../core/course.js';
import { liveName, frName, enName } from '../core/coursegen.js';
import { liveMock } from './livemock.js';
import { getState } from '../store.js';

export const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const touchOnly = () => matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;

// ---------- Lecture des sons (petit séquenceur annulable) ----------
let job = null;
/** Arrête le son de démonstration en cours (les notes déjà lancées finissent leur queue). */
export function stopSpec() {
  if (job) { clearInterval(job.timer); job.done?.(); job = null; }
}
/** events : [{ t: secondes depuis le début, fn(time) }]. Programmé par petits bouts : on peut l'arrêter à tout moment. */
export function runEvents(events, dur, done) {
  stopSpec();
  ensureAudio();
  const t0 = now() + 0.08;
  const evs = [...events].sort((a, b) => a.t - b.t);
  let i = 0;
  const j = { timer: null, done, end: t0 + dur };
  const tick = () => {
    const horizon = now() + 0.3;
    while (i < evs.length && t0 + evs[i].t < horizon) { evs[i].fn(t0 + evs[i].t); i++; }
    if (i >= evs.length && now() > j.end) { clearInterval(j.timer); if (job === j) { job = null; done?.(); } }
  };
  j.timer = setInterval(tick, 60);
  job = j;
  tick();
  return j;
}

const DRUM_IDS = { kick: 'kick', snare: 'snare', clap: 'clap', hat: 'hat', ohat: 'ohat', perc: 'perc', rim: 'rim', shaker: 'shaker' };

/** Joue un son décrit par un exercice. Renvoie la durée (s). */
export function playSpec(spec, { onEnd } = {}) {
  if (!spec) return 0;
  const evs = [];
  let dur = 1;
  switch (spec.k) {
    case 'click': {
      const sp = 60 / spec.bpm;
      for (let b = 0; b < spec.beats; b++) evs.push({ t: b * sp, fn: (t) => playClick(t, spec.accent ? b % spec.accent === 0 : false) });
      dur = spec.beats * sp;
      break;
    }
    case 'notes': case 'chord': {
      const sp = 60 / (spec.bpm || 110);
      const layer = (s) => {
        const pr = presetParams(s.p || 'pluck');
        const list = s.k === 'chord' || (!s.k && s.chord) ? s.notes.map((m) => [m, 0, 2.5]) : s.notes;
        for (const [m, b, d, v] of list) { evs.push({ t: b * sp, fn: (t) => playSynth(pr, m, t, d * sp, v ?? 0.75, { send: 0.2 }) }); dur = Math.max(dur, (b + d) * sp + 0.6); }
      };
      layer(spec);
      if (spec.with) layer({ ...spec.with, k: 'notes' });
      break;
    }
    case 'synth': {
      const p = resolvePatch(spec.preset || spec.over);
      const sp = 60 / (spec.bpm || 100);
      let prev = null;
      for (const [m, b, d, v] of spec.notes || [[48, 0, 1], [55, 1, 1], [60, 2, 2]]) {
        const from = prev;
        evs.push({ t: b * sp, fn: (t) => playSynth(p, m, t, d * sp, v ?? 0.8, { fromMidi: from }) });
        prev = m;
        dur = Math.max(dur, (b + d) * sp + (p.amp?.r || 0.2) + 0.3);
      }
      break;
    }
    case 'drums': {
      const sp = 60 / (spec.bpm || 120) / 4;
      const bars = spec.bars || 2;
      for (let bar = 0; bar < bars; bar++) {
        for (const [row, pat] of Object.entries(spec.grid)) {
          [...pat].forEach((c, s) => { if (c === 'x' || c === 'g') evs.push({ t: (bar * 16 + s) * sp, fn: (t) => playDrum(DRUM_IDS[row] || row, t, c === 'g' ? 0.3 : 1, spec.kit || 'club') }); });
        }
        if (spec.pad) {
          const pr = presetParams(spec.pad.p);
          for (const [m, b, d] of spec.pad.notes) evs.push({ t: (bar * 16 + b * 4) * sp, fn: (t) => playSynth(pr, m, t, d * 4 * sp, 0.6, { send: 0.15 }) });
        }
      }
      dur = bars * 16 * sp + 0.4;
      setPump(spec.pump || 0);
      const end = onEnd;
      onEnd = () => { setPump(0); end?.(); };
      break;
    }
    case 'sweep': {
      const sp = 60 / spec.bpm / 2;
      const n = spec.beats * 2;
      for (let i = 0; i < n; i++) {
        const cutoff = spec.from * Math.pow(spec.to / spec.from, i / (n - 1));
        const p = resolvePatch({ osc: [{ wave: 'sawtooth', voices: 3, detune: 15 }], filter: { cutoff, q: 3 }, amp: { a: 0.003, d: 0.2, s: 0.3, r: 0.1 }, reverb: 0.1 });
        evs.push({ t: i * sp, fn: (t) => [45, 57].forEach((m) => playSynth(p, m, t, sp * 0.8, 0.7)) });
      }
      dur = n * sp + 0.4;
      break;
    }
    default: return 0;
  }
  runEvents(evs, dur, onEnd);
  return dur;
}

/** Bouton d'écoute : ▶ / ■ */
export function playBtn(spec, label = '▶ Écouter', cls = '') {
  const b = el('button.btn.lbtn.ldemo' + cls, { type: 'button', onclick: () => {
    if (b.classList.contains('on')) { stopSpec(); return; }
    document.querySelectorAll('.lbtn.ldemo.on').forEach((x) => x.reset?.());
    b.classList.add('on');
    playSpec(spec, { onEnd: () => b.reset() });
  } }, label);
  b.reset = () => b.classList.remove('on');
  return b;
}

// ---------- Sons de l'interface ----------
/** Niveau des sons de validation par rapport aux exercices (Réglages › Général). */
export const SFX_LEVELS = { soft: 0.3, normal: 0.6, off: 0 };
const sfxPatch = (id, k) => { const p = JSON.parse(JSON.stringify(presetParams(id))); p.gain *= k; p.delay = 0; p.reverb = Math.min(p.reverb ?? 0.2, 0.12); return p; };
export function sfx(kind) {
  const st = getState().settings;
  const k = SFX_LEVELS[st.sfx || 'soft'] ?? SFX_LEVELS.soft;
  if ((st.volume ?? 0.8) <= 0 || !k) return;
  ensureAudio();
  const t = now() + 0.02;
  if (kind === 'ok') { const p = sfxPatch('marimba', k); playSynth(p, 76, t, 0.12, 0.45, { send: 0.05 }); playSynth(p, 83, t + 0.08, 0.18, 0.45, { send: 0.05 }); }
  else if (kind === 'bad') { const p = sfxPatch('pluckbass', k * 0.9); playSynth(p, 43, t, 0.16, 0.4, { send: 0 }); playSynth(p, 42, t + 0.11, 0.22, 0.35, { send: 0 }); }
  else if (kind === 'end') { const p = sfxPatch('marimba', k); [72, 76, 79, 84].forEach((m, i) => playSynth(p, m, t + i * 0.1, 0.3, 0.45, { send: 0.08 })); }
}

// ---------- Clavier de piano (3D) ----------
const BLACK = [1, 3, 6, 8, 10];
export const isBlackKey = (m) => BLACK.includes(((m % 12) + 12) % 12);
/** Code physique → demi-ton (comme le clavier d'ordinateur de Live : rangée du milieu = touches blanches). */
export const COMPUTER_KEYS = { KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14, KeyP: 15, Semicolon: 16 };

/**
 * Clavier : labels 'all' (toutes les blanches), 'c' (les Do avec octave), 'oct' (noms + octaves), 'none'.
 * onDown(m, vel) / onUp(m) rendent le clavier jouable (doigt, souris).
 */
export function piano({ lo = 48, hi = 71, labels = 'c', lit = [], onDown = null, onUp = null, small = false } = {}) {
  const keys = new Map();
  const whites = [];
  for (let m = lo; m <= hi; m++) if (!isBlackKey(m)) whites.push(m);
  const W = 100 / whites.length;
  const node = el('div.piano3d' + (small ? '.small' : '') + (onDown ? '' : '.static'), { role: onDown ? 'group' : 'img', 'aria-label': onDown ? 'Clavier de piano' : 'Clavier' });
  for (let m = lo; m <= hi; m++) {
    const black = isBlackKey(m);
    const wi = whites.indexOf(black ? m - 1 : m);
    let text = null;
    if (!black && labels === 'all') text = [el('b', enName(m)), el('small', frName(m))];
    else if (!black && labels === 'c' && m % 12 === 0) text = el('b', liveName(m));
    else if (!black && labels === 'oct') text = m % 12 === 0 ? el('b', liveName(m)) : el('small', enName(m));
    const k = el((onDown ? 'button' : 'span') + '.pk' + (black ? '.black' : '.white') + (lit.includes(m) ? '.lit' : ''), {
      type: onDown ? 'button' : null, 'data-midi': m, tabindex: onDown ? '-1' : null, 'aria-label': onDown ? `${frName(m)} (${liveName(m)})` : null,
      style: black ? { left: `${(wi + 1) * W - W * 0.3}%`, width: `${W * 0.6}%` } : { width: `${W}%` },
    }, text);
    if (onDown) {
      k.addEventListener('pointerdown', (e) => { e.preventDefault(); try { k.setPointerCapture?.(e.pointerId); } catch (err) { /* pointeur synthétique */ } const r = k.getBoundingClientRect(); const v = Math.max(0.15, Math.min(1, (e.clientY - r.top) / r.height + 0.25)); onDown(m, v); k.classList.add('down'); });
      const up = () => { if (k.classList.contains('down')) { k.classList.remove('down'); onUp?.(m); } };
      k.addEventListener('pointerup', up);
      k.addEventListener('pointercancel', up);
      k.addEventListener('pointerleave', up);
    }
    keys.set(m, k);
    node.append(k);
  }
  const set = (cls, ms, on = true) => ms.forEach((m) => keys.get(m)?.classList.toggle(cls, on));
  return { node, keys, set, clear: (cls) => keys.forEach((k) => k.classList.remove(cls)) };
}

// ---------- Dessins ----------
const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, ...kids) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); n.append(...kids.filter(Boolean)); return n; };
const svgBox = (W, H, name, ...kids) => svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'lsvg', role: 'img', 'aria-label': name }, ...kids);
const pathD = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');
const fillD = (pts, base) => `${pathD(pts)}L${pts.at(-1)[0].toFixed(1)},${base}L${pts[0][0].toFixed(1)},${base}Z`;
const txt = (x, y, s, anchor = 'middle', cls = '') => svgEl('text', { x, y, 'text-anchor': anchor, class: cls }, s);

const WAVES = { sine: (t) => Math.sin(2 * Math.PI * t), sawtooth: (t) => 2 * (t % 1) - 1, square: (t) => (t % 1 < 0.5 ? 1 : -1), triangle: (t) => 1 - 4 * Math.abs(((t + 0.25) % 1) - 0.5) };
export function waveSvg(wave, { W = 320, H = 110, cycles = 2 } = {}) {
  const P = 12, mid = H / 2, N = 240, f = WAVES[wave] || WAVES.sine;
  const pts = Array.from({ length: N + 1 }, (_, i) => [P + (i / N) * (W - 2 * P), mid - f((i / N) * cycles - (i === N ? 1e-6 : 0)) * (mid - P)]);
  return svgBox(W, H, 'Forme d’onde', svgEl('line', { x1: P, x2: W - P, y1: mid, y2: mid, class: 'axis' }), svgEl('path', { d: pathD(pts), class: 'stroke' }));
}

/** Enveloppe ADSR (secondes ; s entre 0 et 1). */
export function adsrSvg({ a, d, s, r }, { W = 320, H = 120 } = {}) {
  const P = 12, top = 14, base = H - 18;
  const hold = 0.5;
  const total = Math.max(1.2, a + d + hold + r);
  const x = (t) => P + (t / total) * (W - 2 * P);
  const y = (v) => base - v * (base - top);
  const pts = [[x(0), y(0)], [x(a), y(1)]];
  for (let i = 1; i <= 10; i++) pts.push([x(a + (d * i) / 10), y(s + (1 - s) * (1 - i / 10) ** 2)]);
  pts.push([x(a + d + hold), y(s)]);
  for (let i = 1; i <= 10; i++) pts.push([x(a + d + hold + (r * i) / 10), y(s * (1 - i / 10) ** 2)]);
  const off = x(a + d + hold);
  return svgBox(W, H, 'Enveloppe ADSR',
    svgEl('path', { d: fillD(pts, base), class: 'fill' }), svgEl('path', { d: pathD(pts), class: 'stroke' }),
    svgEl('line', { x1: off, x2: off, y1: top - 6, y2: base, class: 'mark' }),
    txt(x(a / 2), H - 4, 'A'), txt(x(a + d / 2), H - 4, 'D'), txt(x(a + d + hold / 2), H - 4, 'S'), txt(x(a + d + hold + r / 2), H - 4, 'R'),
    txt(off + 4, top, 'touche relâchée', 'start', 'mini'));
}

const freqX = (W, P) => (f) => P + (Math.log10(f / 20) / 3) * (W - 2 * P);
const sweep = (fx, fn) => Array.from({ length: 121 }, (_, i) => { const f = 20 * 10 ** ((3 * i) / 120); return [fx(f), fn(f)]; });
const freqTicks = (fx, y) => [[100, '100 Hz'], [1000, '1 kHz'], [10000, '10 kHz']].flatMap(([f, t]) => [svgEl('line', { x1: fx(f), x2: fx(f), y1: 8, y2: y - 12, class: 'grid' }), txt(fx(f), y, t, 'middle', 'mini')]);
/** Courbe de filtre : type lp / hp / bp, cutoff (Hz), res (0..1). */
export function filterSvg({ type = 'lp', cutoff = 1000, res = 0.2 }, { W = 320, H = 120 } = {}) {
  const P = 12, base = H - 16;
  const fx = freqX(W, P);
  const Q = 0.707 + res * 6;
  const y = (db) => 10 + ((12 - Math.max(-36, Math.min(14, db))) / 50) * (base - 10);
  const t = { lowpass: 'lp', highpass: 'hp', bandpass: 'bp' }[type] || type;
  const pts = sweep(fx, (f) => { const w = f / cutoff, den = Math.hypot(1 - w * w, w / Q); return y(20 * Math.log10(Math.max(1e-4, { lp: 1, hp: w * w, bp: w / Q }[t] / den))); });
  return svgBox(W, H, 'Courbe de filtre', ...freqTicks(fx, H - 3), svgEl('line', { x1: P, x2: W - P, y1: y(0), y2: y(0), class: 'axis' }),
    svgEl('path', { d: fillD(pts, base), class: 'fill' }), svgEl('path', { d: pathD(pts), class: 'stroke' }),
    svgEl('line', { x1: fx(cutoff), x2: fx(cutoff), y1: 8, y2: base, class: 'mark' }));
}
/** Spectre d'un mix avec un défaut (mud, harsh, low, air) ; en pointillés, l'équilibre de référence. */
export function eqSvg({ fault = 'mud', guide = true }, { W = 320, H = 120 } = {}) {
  const P = 12, base = H - 16;
  const fx = freqX(W, P);
  const ref = (f) => (f < 100 ? -4 * Math.log2(100 / f) : -3 * Math.log2(f / 100));
  const bell = (f, f0, g, q) => g * Math.exp(-(Math.log2(f / f0) ** 2) * q);
  const flt = { low: (f) => bell(f, 60, 13, 1.2), mud: (f) => bell(f, 300, 12, 2.2), harsh: (f) => bell(f, 4000, 13, 3), air: (f) => -18 / (1 + (6000 / f) ** 4), none: () => 0 }[fault];
  const y = (db) => 16 + ((14 - Math.max(-34, Math.min(14, db))) / 48) * (base - 16);
  const wig = (f) => 0.8 * Math.sin(Math.log2(f) * 7.3) + 0.5 * Math.sin(Math.log2(f) * 13.1);
  const pts = sweep(fx, (f) => y(ref(f) + flt(f) + wig(f)));
  return svgBox(W, H, 'Spectre du mix', ...freqTicks(fx, H - 3), svgEl('path', { d: fillD(pts, base), class: 'fill' }), svgEl('path', { d: pathD(pts), class: 'stroke' }),
    guide ? svgEl('path', { d: pathD(sweep(fx, (f) => y(ref(f)))), class: 'guide' }) : null);
}
/** Courbe d'énergie d'un morceau par sections. */
export function energySvg(zones, { W = 320, H = 120 } = {}) {
  const P = 6, base = H - 22, top = 14;
  const w = (W - 2 * P) / zones.length;
  const kids = [];
  zones.forEach((z, i) => {
    const h = z.e * (base - top);
    kids.push(svgEl('rect', { x: P + i * w + 2, y: base - h, width: w - 4, height: h, rx: 5, class: 'bar' + (z.e >= 0.95 ? ' hot' : '') }));
    kids.push(txt(P + i * w + w / 2, H - 6, z.name, 'middle', 'mini'));
  });
  return svgBox(W, H, 'Énergie du morceau', svgEl('line', { x1: P, x2: W - P, y1: base, y2: base, class: 'axis' }), ...kids);
}

const ROW_NAMES = { kick: 'Kick', snare: 'Snare', clap: 'Clap', hat: 'Hat', ohat: 'Hat ouvert', perc: 'Perc' };
export const rowName = (r) => ROW_NAMES[r] || r[0].toUpperCase() + r.slice(1);
/** Grille 16 pas en lecture seule. */
export function miniGrid(rows) {
  return el('div.mgrid', { role: 'img', 'aria-label': 'Grille de 16 pas' }, Object.entries(rows).map(([r, pat]) => el('div.mgrid-row',
    el('span.mgrid-name', rowName(r)),
    el('span.mgrid-cells', [...pat].map((c, i) => el('i' + (c === 'x' ? '.on' : c === 'g' ? '.ghost' : '') + (i % 4 === 0 ? '.beat' : '')))))));
}
/** Petit piano roll en lecture seule : notes [[pas, midi, longueur]]. */
export function miniRoll({ notes, lo = 55, hi = 72, steps = 16 }) {
  const rows = [];
  for (let m = hi; m >= lo; m--) rows.push(el('div.mroll-row' + (isBlackKey(m) ? '.blk' : ''), el('span.mroll-key', m % 12 === 0 ? liveName(m) : ''),
    el('span.mroll-cells', Array.from({ length: steps }, (_, s) => el('i' + (s % 4 === 0 ? '.beat' : ''))),
      notes.filter(([, nm]) => nm === m).map(([s, , len = 1]) => el('b.mroll-note', { style: { left: `${(s / steps) * 100}%`, width: `${(len / steps) * 100}%` } })))));
  return el('div.mroll', { role: 'img', 'aria-label': 'Piano roll' }, rows);
}
/** Chaîne de devices / schéma en flèches. */
export const chain = (items) => el('div.lchain', items.map((t, i) => [i ? el('span.lchain-arrow', { 'aria-hidden': 'true' }, '→') : null, el('span.lchain-box', t)]));
/** Touches de clavier en relief. */
export const keycaps = (keys) => el('span.keycaps', keys.map((k, i) => [i ? el('span.kc-plus', '+') : null, el('kbd.kc', k)]));

/** Dessin d'un exercice ou d'une fiche. */
export function visual(v) {
  if (!v) return null;
  switch (v.k) {
    case 'keyboard': return piano({ lo: v.lo ?? 48, hi: v.hi ?? 71, labels: v.labels ?? 'none', lit: v.lit || [] }).node;
    case 'wave': return el('div.lvis', waveSvg(v.wave));
    case 'waves': return el('div.lvis.waves', ['sine', 'triangle', 'square', 'sawtooth'].map((w) => el('figure', waveSvg(w, { W: 160, H: 70, cycles: 2 }), el('figcaption', { sine: 'Sinus', triangle: 'Triangle', square: 'Carré', sawtooth: 'Dent de scie' }[w]))));
    case 'adsr': return el('div.lvis', adsrSvg(v));
    case 'filter': return el('div.lvis', filterSvg(v));
    case 'eq': return el('div.lvis', eqSvg(v));
    case 'energy': return el('div.lvis', energySvg(v.zones));
    case 'grid': return miniGrid(v.rows);
    case 'roll': return miniRoll(v);
    case 'chain': return chain(v.items);
    case 'keycaps': return el('div.lvis.center', keycaps(v.keys));
    case 'live': return liveMock({ show: v.show, hl: v.hl }).node;
    default: return null;
  }
}

// ---------- Mascotte : « Bip », un petit module de synthé ----------
export function mascot(mood = 'happy', size = 72) {
  const mouth = { happy: 'M25 39 Q32 45 39 39', wow: 'M29 40 Q32 45 35 40 Q32 36 29 40', sad: 'M25 42 Q32 37 39 42', cool: 'M25 40 L39 40' }[mood] || 'M25 39 Q32 45 39 39';
  const svg = svgEl('svg', { viewBox: '0 0 64 64', width: size, height: size, class: `mascot mood-${mood}`, 'aria-hidden': 'true' },
    svgEl('defs', {}, svgEl('linearGradient', { id: 'bipBody', x1: 0, y1: 0, x2: 0, y2: 1 }, svgEl('stop', { offset: 0, 'stop-color': '#c4a1ff' }), svgEl('stop', { offset: 1, 'stop-color': '#7c4dff' }))),
    svgEl('line', { x1: 32, y1: 4, x2: 32, y2: 13, stroke: '#7c4dff', 'stroke-width': 3, 'stroke-linecap': 'round' }),
    svgEl('circle', { cx: 32, cy: 5, r: 4, fill: '#ffb84d' }),
    svgEl('rect', { x: 8, y: 16, width: 48, height: 44, rx: 13, fill: '#4b2a99' }),
    svgEl('rect', { x: 8, y: 12, width: 48, height: 44, rx: 13, fill: 'url(#bipBody)' }),
    svgEl('rect', { x: 15, y: 20, width: 34, height: 26, rx: 8, fill: '#16122b' }),
    svgEl('circle', { cx: 25, cy: 32, r: 3.6, fill: '#5ce1e6', class: 'eye' }),
    svgEl('circle', { cx: 39, cy: 32, r: 3.6, fill: '#5ce1e6', class: 'eye' }),
    svgEl('path', { d: mouth, stroke: '#5ce1e6', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' }),
    svgEl('circle', { cx: 18, cy: 52, r: 3, fill: '#ffe066' }), svgEl('circle', { cx: 46, cy: 52, r: 3, fill: '#ff5d73' }),
    svgEl('rect', { x: 26, y: 50, width: 12, height: 4, rx: 2, fill: '#2e1d66' }));
  return svg;
}
