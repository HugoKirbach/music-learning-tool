// 🎨 Un univers par partie du parcours : un décor en deux plans (lointain et proche) dessiné en SVG, posé en fond
// du chemin. Le plan lointain défile plus lentement que le chemin : léger effet de profondeur.
// Les dessins restent sur les bords : le centre est laissé au chemin et à ses étiquettes.

const W = 640, H = 900;
const svg = (body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' width='${W}' height='${H}' fill='none' stroke-linecap='round' stroke-linejoin='round'>${body}</svg>`)}")`;
const g = (color, sw, body) => `<g stroke='${color}' stroke-width='${sw}'>${body}</g>`;
const rep = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

// ---------- 1 · Le studio (fondations) ----------
function studioFar(c) {
  // Panneaux acoustiques : lattes arrondies, en quinconce
  const panel = (x, y) => `<rect x='${x}' y='${y}' width='64' height='86' rx='14'/><path d='M${x + 16} ${y + 16}v54M${x + 32} ${y + 16}v54M${x + 48} ${y + 16}v54'/>`;
  return g(c, 2, rep(4, (r) => panel(20 + (r % 2) * 76, 30 + r * 222) + panel(556 - (r % 2) * 76, 140 + r * 222)));
}
function studioNear(c) {
  const monitor = (x, y) => `<rect x='${x}' y='${y}' width='84' height='128' rx='12'/><circle cx='${x + 42}' cy='${y + 84}' r='27'/><circle cx='${x + 42}' cy='${y + 84}' r='10'/><circle cx='${x + 42}' cy='${y + 30}' r='12'/>`;
  const keyboard = (x, y) => `<rect x='${x}' y='${y}' width='150' height='46' rx='8'/>${rep(9, (i) => `<path d='M${x + 15 + i * 15} ${y + 14}v32'/>`)}${rep(3, (i) => `<circle cx='${x + 16 + i * 16}' cy='${y + 8}' r='2.5'/>`)}`;
  const phones = (x, y) => `<path d='M${x} ${y + 44}v-12a36 36 0 0 1 72 0v12'/><rect x='${x - 8}' y='${y + 40}' width='18' height='34' rx='8'/><rect x='${x + 62}' y='${y + 40}' width='18' height='34' rx='8'/>`;
  const mic = (x, y) => `<rect x='${x}' y='${y}' width='26' height='52' rx='13'/><path d='M${x - 10} ${y + 34}a23 23 0 0 0 46 0M${x + 13} ${y + 58}v36M${x - 8} ${y + 94}h42'/>`;
  return g(c, 3, monitor(22, 70) + keyboard(470, 250) + phones(40, 420) + mic(560, 520) + monitor(534, 700) + keyboard(14, 760)
    + `<path d='M106 150c60 30 20 90 70 120' stroke-dasharray='1 9'/><path d='M560 300c-50 40-10 110-60 150' stroke-dasharray='1 9'/>`);
}

// ---------- 2 · L'écran de Live ----------
function liveFar(c) {
  // Vue Session : colonnes de clips
  const col = (x, y0, on) => rep(7, (i) => `<rect x='${x}' y='${y0 + i * 44}' width='62' height='30' rx='6'${on.includes(i) ? ` fill='${c}' fill-opacity='.45'` : ''}/>${on.includes(i) ? `<path d='M${x + 10} ${y0 + i * 44 + 9}l10 6l-10 6z' fill='${c}'/>` : ''}`);
  return g(c, 2, col(14, 40, [0, 3]) + col(86, 40, [1, 2, 5]) + col(492, 330, [0, 4]) + col(564, 330, [2, 3, 6]) + col(14, 560, [1, 4]) + col(86, 560, [0, 5]));
}
function liveNear(c) {
  // Vue Arrangement : clips avec forme d'onde, tête de lecture, transport
  const clip = (x, y, w) => `<rect x='${x}' y='${y}' width='${w}' height='40' rx='7'/><path d='M${x} ${y + 12}h${w}'/>${rep(Math.floor((w - 12) / 9), (i) => { const h = 4 + ((i * 7) % 11); return `<path d='M${x + 8 + i * 9} ${y + 26 - h / 2}v${h}'/>`; })}`;
  const transport = (x, y) => `<path d='M${x} ${y}l20 12l-20 12z'/><rect x='${x + 34}' y='${y + 1}' width='22' height='22' rx='4'/><circle cx='${x + 80}' cy='${y + 12}' r='11' fill='${c}' fill-opacity='.5'/>`;
  return g(c, 3, clip(456, 60, 150) + clip(500, 112, 120) + clip(470, 164, 96) + transport(26, 372) + clip(20, 430, 132) + clip(20, 482, 96) + clip(64, 534, 110)
    + `<path d='M548 40v190' stroke-dasharray='3 8'/><path d='M540 40l8 10l8-10z' fill='${c}'/>` + transport(516, 760) + clip(470, 810, 140));
}

// ---------- 3 · La salle d'écriture (composer) ----------
function composeFar(c) {
  const staff = (y, d) => rep(5, (i) => `<path d='M-10 ${y + i * 13}c160 ${d} 320 ${-d} 660 ${d / 2}'/>`);
  return g(c, 1.6, staff(60, 26) + staff(360, -30) + staff(660, 22));
}
function composeNear(c) {
  const note = (x, y, flag = 1) => `<ellipse cx='${x}' cy='${y}' rx='11' ry='8' fill='${c}' fill-opacity='.55' transform='rotate(-20 ${x} ${y})'/><path d='M${x + 10} ${y - 2}v-46${flag ? 'c14 4 20 14 14 26' : ''}'/>`;
  const pair = (x, y) => `${note(x, y, 0)}${note(x + 44, y - 10, 0)}<path d='M${x + 10} ${y - 48}l44-10' stroke-width='6'/>`;
  const sharp = (x, y) => `<path d='M${x} ${y}v40M${x + 12} ${y - 4}v40M${x - 6} ${y + 14}l24-6M${x - 6} ${y + 28}l24-6'/>`;
  const bars = (x, y) => rep(5, (i) => `<rect x='${x + ((i * 37) % 60)}' y='${y + i * 16}' width='${28 + ((i * 13) % 30)}' height='10' rx='4' fill='${c}' fill-opacity='.4'/>`);
  return g(c, 3, note(54, 150) + pair(520, 130) + sharp(590, 300) + bars(24, 330) + pair(40, 560) + note(580, 520) + bars(500, 680) + sharp(60, 760) + note(110, 840, 1));
}

// ---------- 4 · Le rack de synthés ----------
function rackFar(c) {
  const rail = (x) => `<path d='M${x} 0v${H}'/>${rep(15, (i) => `<circle cx='${x}' cy='${30 + i * 60}' r='4'/>`)}`;
  return g(c, 2, rail(12) + rail(158) + rail(482) + rail(628) + rep(5, (i) => `<path d='M12 ${180 * i + 6}h146M482 ${180 * i + 96}h146'/>`));
}
function rackNear(c) {
  const knob = (x, y, a) => `<circle cx='${x}' cy='${y}' r='17'/><path d='M${x} ${y}l${(Math.cos(a) * 15).toFixed(1)} ${(Math.sin(a) * 15).toFixed(1)}'/>`;
  const jack = (x, y) => `<circle cx='${x}' cy='${y}' r='9'/><circle cx='${x}' cy='${y}' r='3.5' fill='${c}'/>`;
  const wave = (x, y, k) => (k === 0 ? `<path d='M${x} ${y}q10-24 20 0t20 0t20 0'/>` : k === 1 ? `<path d='M${x} ${y + 10}l20-22v22l20-22v22l20-22'/>` : `<path d='M${x} ${y + 10}v-20h15v20h15v-20h15v20h15'/>`);
  const mod = (x, y, k) => wave(x + 12, y + 26, k) + knob(x + 26, y + 74, -2 + k) + knob(x + 82, y + 74, -0.6 - k) + jack(x + 26, y + 124) + jack(x + 64, y + 124) + jack(x + 102, y + 124);
  const cable = (x1, y1, x2, y2, col) => `<path d='M${x1} ${y1}C${x1} ${y1 + 110} ${x2} ${y2 + 110} ${x2} ${y2}' stroke='${col}' stroke-width='4'/>`;
  return g(c, 2.6, mod(22, 20, 0) + mod(22, 380, 1) + mod(22, 740, 2) + mod(492, 110, 2) + mod(492, 470, 0)
    + cable(48, 144, 86, 504, '#f472b6') + cable(594, 234, 556, 594, '#ffb84d') + cable(124, 504, 48, 864, '#5ce1e6'));
}

// ---------- 5 · Le club ----------
function clubFar(c) {
  const beam = (x, dx, col) => `<path d='M${x} 0l${dx - 46} ${H}h92z' fill='${col}' fill-opacity='.22' stroke='none'/>`;
  return beam(80, -30, c) + beam(320, 0, '#7c9cff') + beam(560, 30, '#ffb84d') + beam(200, 150, '#5ce1e6') + beam(440, -150, c)
    + g(c, 2, rep(22, (i) => `<circle cx='${(i * 149) % W}' cy='${(i * 211) % H}' r='${1.5 + (i % 3)}' fill='${c}'/>`));
}
function clubNear(c) {
  const ball = (x, y, r) => `<path d='M${x} ${y - r - 46}v46'/><circle cx='${x}' cy='${y}' r='${r}'/><path d='M${x - r} ${y}h${2 * r}M${x - r * 0.86} ${y - r / 2}h${r * 1.72}M${x - r * 0.86} ${y + r / 2}h${r * 1.72}M${x} ${y - r}v${2 * r}M${x - r / 2} ${y - r * 0.86}q-${r / 3} ${r * 0.86} 0 ${r * 1.72}M${x + r / 2} ${y - r * 0.86}q${r / 3} ${r * 0.86} 0 ${r * 1.72}'/>`;
  const stack = (x, y) => rep(3, (i) => `<rect x='${x}' y='${y + i * 78}' width='78' height='72' rx='8'/><circle cx='${x + 39}' cy='${y + i * 78 + 36}' r='23'/><circle cx='${x + 39}' cy='${y + i * 78 + 36}' r='8'/>`);
  const fan = (x, y, up) => `<circle cx='${x}' cy='${y}' r='15' fill='${c}' fill-opacity='.5'/><path d='M${x - 24} ${y + 62}q24-46 48 0'/>${up ? `<path d='M${x - 20} ${y + 30}l-12-44M${x + 20} ${y + 30}l12-44'/>` : ''}`;
  return g(c, 3, ball(80, 96, 40) + stack(540, 60) + rep(4, (i) => fan(30 + i * 40, 420 + (i % 2) * 14, i % 2)) + rep(4, (i) => fan(490 + i * 40, 470 + (i % 2) * 14, (i + 1) % 2))
    + stack(22, 600) + ball(566, 690, 34) + `<path d='M0 880l160-60M640 880l-160-60' stroke-dasharray='2 10'/>`);
}

const SCENES = {
  1: { name: 'Le studio', color: '#ff8a4d', far: studioFar, near: studioNear },
  2: { name: 'L’écran de Live', color: '#5ce1e6', far: liveFar, near: liveNear },
  3: { name: 'La salle d’écriture', color: '#4ade80', far: composeFar, near: composeNear },
  4: { name: 'Le rack de synthés', color: '#a78bfa', far: rackFar, near: rackNear },
  5: { name: 'Le club', color: '#f472b6', far: clubFar, near: clubNear },
};

const cache = new Map();
/** Décor d'une partie : { name, color, far, near } (images CSS prêtes à poser en background-image). */
export function sceneFor(part) {
  const s = SCENES[part] || SCENES[1];
  if (!cache.has(part)) cache.set(part, { name: s.name, color: s.color, far: svg(s.far(s.color)), near: svg(s.near(s.color)) });
  return cache.get(part);
}
