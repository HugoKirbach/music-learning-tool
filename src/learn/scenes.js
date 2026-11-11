// 🎨 Un univers par partie du parcours : quelques dessins discrets en SVG, posés en fond
// du chemin. Le décor défile un peu plus lentement que le chemin : léger effet de profondeur.
// Les dessins restent sur les bords : le centre est laissé au chemin et à ses étiquettes.

const W = 640, H = 1500;
const svg = (body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' width='${W}' height='${H}' fill='none' stroke-linecap='round' stroke-linejoin='round'>${body}</svg>`)}")`;
const g = (color, sw, body) => `<g stroke='${color}' stroke-width='${sw}'>${body}</g>`;
const rep = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

// ---------- 1 · Le studio (fondations) ----------
function studioNear(c) {
  const monitor = (x, y) => `<rect x='${x}' y='${y}' width='84' height='128' rx='12'/><circle cx='${x + 42}' cy='${y + 84}' r='27'/><circle cx='${x + 42}' cy='${y + 84}' r='10'/><circle cx='${x + 42}' cy='${y + 30}' r='12'/>`;
  const keyboard = (x, y) => `<rect x='${x}' y='${y}' width='150' height='46' rx='8'/>${rep(9, (i) => `<path d='M${x + 15 + i * 15} ${y + 14}v32'/>`)}${rep(3, (i) => `<circle cx='${x + 16 + i * 16}' cy='${y + 8}' r='2.5'/>`)}`;
  const phones = (x, y) => `<path d='M${x} ${y + 44}v-12a36 36 0 0 1 72 0v12'/><rect x='${x - 8}' y='${y + 40}' width='18' height='34' rx='8'/><rect x='${x + 62}' y='${y + 40}' width='18' height='34' rx='8'/>`;
  const mic = (x, y) => `<rect x='${x}' y='${y}' width='26' height='52' rx='13'/><path d='M${x - 10} ${y + 34}a23 23 0 0 0 46 0M${x + 13} ${y + 58}v36M${x - 8} ${y + 94}h42'/>`;
  return g(c, 3, monitor(22, 90) + phones(552, 560) + keyboard(14, 1040) + mic(580, 1320));
}

// ---------- 2 · L'écran de Live ----------
function liveNear(c) {
  // Vue Arrangement : clips avec forme d'onde, tête de lecture, transport
  const clip = (x, y, w) => `<rect x='${x}' y='${y}' width='${w}' height='40' rx='7'/><path d='M${x} ${y + 12}h${w}'/>${rep(Math.floor((w - 12) / 9), (i) => { const h = 4 + ((i * 7) % 11); return `<path d='M${x + 8 + i * 9} ${y + 26 - h / 2}v${h}'/>`; })}`;
  const transport = (x, y) => `<path d='M${x} ${y}l20 12l-20 12z'/><rect x='${x + 34}' y='${y + 1}' width='22' height='22' rx='4'/><circle cx='${x + 80}' cy='${y + 12}' r='11' fill='${c}' fill-opacity='.5'/>`;
  return g(c, 3, clip(470, 90, 140) + clip(500, 142, 110) + transport(26, 620) + clip(20, 670, 120) + clip(480, 1180, 130));
}

// ---------- 3 · La salle d'écriture (composer) ----------
function composeNear(c) {
  const note = (x, y, flag = 1) => `<ellipse cx='${x}' cy='${y}' rx='11' ry='8' fill='${c}' fill-opacity='.55' transform='rotate(-20 ${x} ${y})'/><path d='M${x + 10} ${y - 2}v-46${flag ? 'c14 4 20 14 14 26' : ''}'/>`;
  const pair = (x, y) => `${note(x, y, 0)}${note(x + 44, y - 10, 0)}<path d='M${x + 10} ${y - 48}l44-10' stroke-width='6'/>`;
  const sharp = (x, y) => `<path d='M${x} ${y}v40M${x + 12} ${y - 4}v40M${x - 6} ${y + 14}l24-6M${x - 6} ${y + 28}l24-6'/>`;
  const bars = (x, y) => rep(5, (i) => `<rect x='${x + ((i * 37) % 60)}' y='${y + i * 16}' width='${28 + ((i * 13) % 30)}' height='10' rx='4' fill='${c}' fill-opacity='.4'/>`);
  return g(c, 3, note(54, 170) + pair(540, 560) + sharp(60, 980) + note(580, 1340));
}

// ---------- 4 · Le rack de synthés ----------
function rackNear(c) {
  const knob = (x, y, a) => `<circle cx='${x}' cy='${y}' r='17'/><path d='M${x} ${y}l${(Math.cos(a) * 15).toFixed(1)} ${(Math.sin(a) * 15).toFixed(1)}'/>`;
  const jack = (x, y) => `<circle cx='${x}' cy='${y}' r='9'/><circle cx='${x}' cy='${y}' r='3.5' fill='${c}'/>`;
  const wave = (x, y, k) => (k === 0 ? `<path d='M${x} ${y}q10-24 20 0t20 0t20 0'/>` : k === 1 ? `<path d='M${x} ${y + 10}l20-22v22l20-22v22l20-22'/>` : `<path d='M${x} ${y + 10}v-20h15v20h15v-20h15v20h15'/>`);
  const mod = (x, y, k) => wave(x + 12, y + 26, k) + knob(x + 26, y + 74, -2 + k) + knob(x + 82, y + 74, -0.6 - k) + jack(x + 26, y + 124) + jack(x + 64, y + 124) + jack(x + 102, y + 124);
  const cable = (x1, y1, x2, y2, col) => `<path d='M${x1} ${y1}C${x1} ${y1 + 110} ${x2} ${y2 + 110} ${x2} ${y2}' stroke='${col}' stroke-width='4'/>`;
  return g(c, 2.6, wave(30, 130, 0) + knob(56, 190, -2) + knob(596, 600, -0.8) + jack(566, 660) + jack(604, 660) + wave(30, 1040, 2) + knob(56, 1100, -1.2) + wave(540, 1380, 1));
}

// ---------- 5 · Le club ----------
function clubNear(c) {
  const ball = (x, y, r) => `<path d='M${x} ${y - r - 46}v46'/><circle cx='${x}' cy='${y}' r='${r}'/><path d='M${x - r} ${y}h${2 * r}M${x - r * 0.86} ${y - r / 2}h${r * 1.72}M${x - r * 0.86} ${y + r / 2}h${r * 1.72}M${x} ${y - r}v${2 * r}M${x - r / 2} ${y - r * 0.86}q-${r / 3} ${r * 0.86} 0 ${r * 1.72}M${x + r / 2} ${y - r * 0.86}q${r / 3} ${r * 0.86} 0 ${r * 1.72}'/>`;
  const stack = (x, y) => rep(3, (i) => `<rect x='${x}' y='${y + i * 78}' width='78' height='72' rx='8'/><circle cx='${x + 39}' cy='${y + i * 78 + 36}' r='23'/><circle cx='${x + 39}' cy='${y + i * 78 + 36}' r='8'/>`);
  const fan = (x, y, up) => `<circle cx='${x}' cy='${y}' r='15' fill='${c}' fill-opacity='.5'/><path d='M${x - 24} ${y + 62}q24-46 48 0'/>${up ? `<path d='M${x - 20} ${y + 30}l-12-44M${x + 20} ${y + 30}l12-44'/>` : ''}`;
  return g(c, 3, ball(80, 130, 38) + stack(540, 520) + rep(3, (i) => fan(30 + i * 40, 1010 + (i % 2) * 14, i % 2)) + ball(566, 1350, 32));
}

const SCENES = {
  1: { name: 'Le studio', color: '#ff8a4d', near: studioNear },
  2: { name: 'L’écran de Live', color: '#5ce1e6', near: liveNear },
  3: { name: 'La salle d’écriture', color: '#4ade80', near: composeNear },
  4: { name: 'Le rack de synthés', color: '#a78bfa', near: rackNear },
  5: { name: 'Le club', color: '#f472b6', near: clubNear },
};

const cache = new Map();
/** Décor d'une partie : { name, color, near } (image CSS prête à poser en background-image). */
export function sceneFor(part) {
  const s = SCENES[part] || SCENES[1];
  if (!cache.has(part)) cache.set(part, { name: s.name, color: s.color, near: svg(s.near(s.color)) });
  return cache.get(part);
}
