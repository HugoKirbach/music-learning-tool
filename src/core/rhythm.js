// Rythme : parsing des patterns, euclidien, comparaison de grilles. Module pur.

export const DRUM_ROWS = [
  { id: 'kick', name: 'Kick', midi: 36, color: '#ff5d73' },
  { id: 'snare', name: 'Snare', midi: 38, color: '#ffb84d' },
  { id: 'clap', name: 'Clap', midi: 39, color: '#ffe066' },
  { id: 'hat', name: 'Hat fermé', midi: 42, color: '#5ce1e6' },
  { id: 'ohat', name: 'Hat ouvert', midi: 46, color: '#7c9cff' },
  { id: 'perc', name: 'Perc / Rim', midi: 37, color: '#c77dff' },
];

export const STEPS = 16;
// Valeurs de cellule : 0 = vide, 1 = coup normal, 2 = ghost note (doux)
export const VEL = { 1: 110, 2: 48 };

/** 'x...o...' → [1,0,0,0,2,0,0,0] ('x' normal, 'o' ghost, autre = silence) */
export function parsePattern(str = '') {
  const s = str.replace(/\s|\|/g, '');
  const out = new Array(STEPS).fill(0);
  for (let i = 0; i < STEPS && i < s.length; i++) out[i] = s[i] === 'x' ? 1 : s[i] === 'o' ? 2 : 0;
  return out;
}

export function emptyGrid() {
  return Object.fromEntries(DRUM_ROWS.map((r) => [r.id, new Array(STEPS).fill(0)]));
}

export function gridFromPatterns(patterns = {}) {
  const g = emptyGrid();
  for (const r of DRUM_ROWS) if (patterns[r.id]) g[r.id] = parsePattern(patterns[r.id]);
  return g;
}

export function cloneGrid(g) {
  return Object.fromEntries(Object.entries(g).map(([k, v]) => [k, [...v]]));
}

/** Rythme euclidien E(k, n) avec rotation : répartit k coups le plus régulièrement possible. */
export function euclid(k, n = STEPS, rotate = 0) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(k > 0 && ((i * k) % n) < k ? 1 : 0);
  if (!rotate) return out;
  const r = ((rotate % n) + n) % n;
  return out.slice(n - r).concat(out.slice(0, n - r));
}

export function countHits(grid, rowIds = null) {
  return Object.entries(grid)
    .filter(([k]) => !rowIds || rowIds.includes(k))
    .reduce((s, [, row]) => s + row.filter(Boolean).length, 0);
}

/**
 * Compare la grille de l'utilisateur à la cible (exercice « recrée à l'oreille »).
 * Les ghost notes comptent comme des coups (on évalue le placement).
 * @returns {{score:number, rows:Object<string,{hit:number, miss:number, extra:number}>}}
 */
export function compareGrids(target, user) {
  let tp = 0, fp = 0, fn = 0;
  const rows = {};
  for (const r of DRUM_ROWS) {
    const t = target[r.id] || [], u = user[r.id] || [];
    const st = { hit: 0, miss: 0, extra: 0 };
    for (let i = 0; i < STEPS; i++) {
      const a = !!t[i], b = !!u[i];
      if (a && b) st.hit++;
      else if (a) st.miss++;
      else if (b) st.extra++;
    }
    tp += st.hit; fn += st.miss; fp += st.extra;
    rows[r.id] = st;
  }
  const denom = 2 * tp + fp + fn;
  return { score: denom === 0 ? 100 : Math.round((200 * tp) / denom), rows };
}

/** Coups situés hors des temps (syncopes) : utile pour juger le « groove ». */
export function syncopation(row) {
  const hits = row.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
  if (!hits.length) return 0;
  return hits.filter((i) => i % 4 !== 0).length / hits.length;
}

/** Décale une rangée (nudge) de n pas, en boucle. */
export function shiftRow(row, n) {
  const len = row.length;
  return row.map((_, i) => row[(((i - n) % len) + len) % len]);
}
