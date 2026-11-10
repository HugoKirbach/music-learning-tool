// Parcours « Apprendre » : progression façon Duolingo (unités → nœuds → exercices), construction des leçons,
// vérification des réponses. Module pur, testé avec `node --test`.
import { UNITS } from '../data/course.js';
import { GEN, rng, shuffle, sample } from './coursegen.js';
import { mod, SCALES } from './theory.js';
import { similarity, getPath, paramById, normalizeParams } from './synthparams.js';
import { makePreset, PRESETS } from '../data/presets.js';


/** Tous les nœuds du chemin, dans l'ordre, avec leur unité. */
export const NODES = UNITS.flatMap((u, ui) => u.nodes.map((n, i) => ({ ...n, unit: u.id, ui, i })));
const BY_ID = new Map(NODES.map((n) => [n.id, n]));
export const nodeById = (id) => BY_ID.get(id) || null;
export const unitById = (id) => UNITS.find((u) => u.id === id) || null;
export const unitIndex = (id) => UNITS.findIndex((u) => u.id === id);

/** Leçons et contrôles bloquent la suite ; ateliers et missions studio sont des bonus qui ne bloquent jamais. */
export const isRequired = (n) => n.type === 'lesson' || n.type === 'checkpoint';
export const REQUIRED_TOTAL = NODES.filter(isRequired).length;

export const courseOf = (s) => s?.course || { done: {} };

/**
 * État de chaque nœud : 'perfect' | 'done' | 'current' (prochaine leçon) | 'open' (bonus disponible) | 'locked'.
 * @returns {{ states: Object<string,string>, current: string|null }}
 */
export function nodeStates(course = {}) {
  const done = course.done || {};
  const states = {};
  let current = null;
  for (const n of NODES) {
    if (done[n.id]) { states[n.id] = done[n.id].perfect ? 'perfect' : 'done'; continue; }
    if (current) { states[n.id] = 'locked'; continue; }
    if (isRequired(n)) { states[n.id] = 'current'; current = n.id; } else states[n.id] = 'open';
  }
  return { states, current };
}

/** Une unité est ouverte dès que son premier nœud n'est plus verrouillé ; terminée quand son contrôle est réussi. */
export function unitStatus(course, unitId) {
  const { states } = nodeStates(course);
  const u = unitById(unitId);
  const ns = u.nodes.map((n) => states[n.id]);
  const req = u.nodes.filter(isRequired);
  const doneReq = req.filter((n) => ['done', 'perfect'].includes(states[n.id])).length;
  return {
    open: ns[0] !== 'locked',
    complete: req.every((n) => ['done', 'perfect'].includes(states[n.id])),
    gold: u.nodes.every((n) => states[n.id] === 'perfect' || (!isRequired(n) && states[n.id] === 'done')),
    done: doneReq, total: req.length,
  };
}

/** Avancement global (leçons + contrôles). */
export function courseProgress(course = {}) {
  const done = NODES.filter((n) => isRequired(n) && course.done?.[n.id]).length;
  const { current } = nodeStates(course);
  return { done, total: REQUIRED_TOTAL, pct: Math.round((100 * done) / REQUIRED_TOTAL), current: current ? nodeById(current) : null, bonus: NODES.filter((n) => !isRequired(n) && course.done?.[n.id]).length };
}

// ---------- Construction des exercices ----------

/** Développe les générateurs (`{ gen: 'chord', … }`) et prépare chaque exercice (mélange des propositions). */
export function expand(list, r) {
  const out = [];
  for (const e of list) {
    if (e.gen) {
      const g = GEN[e.gen];
      if (!g) throw new Error(`Générateur inconnu : ${e.gen}`);
      out.push(...g(r, e));
    } else out.push(e);
  }
  return out.map((it) => finalize(it, r));
}

/** Mélange les propositions d'un QCM (la 1re écrite est la bonne) et prépare les mots à placer. */
export function finalize(item, r) {
  const it = { ...item };
  if ((it.t === 'mcq' || it.t === 'shortcut') && it.a == null) {
    // Écoute A / B : les réponses restent dans l'ordre A, B ; sinon on mélange
    const order = it.plays ? it.choices.map((_, i) => i).sort((x, y) => String(it.choices[x]).localeCompare(String(it.choices[y]))) : shuffle(r, it.choices.map((_, i) => i));
    it.choices = order.map((i) => item.choices[i]);
    it.a = order.indexOf(0);
  }
  if (it.t === 'blank' && !it.answers) {
    const answers = [];
    const parts = [];
    it.text.split(/(\[[^\]]+\])/).forEach((p) => { if (/^\[.+\]$/.test(p)) { answers.push(p.slice(1, -1)); parts.push(null); } else if (p) parts.push(p); });
    it.answers = answers;
    it.parts = parts;
    it.words = shuffle(r, [...answers, ...(it.bank || [])]);
  }
  if (it.t === 'order' && !it.words) it.words = shuffle(r, [...it.items, ...(it.extra || [])]);
  if (it.t === 'pairs' && !it.right) {
    it.left = shuffle(r, it.pairs.map((p, i) => i));
    it.right = shuffle(r, it.pairs.map((p, i) => i));
  }
  return it;
}

const isCard = (it) => it.t === 'card';
const tag = (items, prefix) => items.map((it, i) => ({ ...it, uid: `${prefix}#${i}` }));

/** Exercices d'une leçon (ordre écrit conservé : les fiches arrivent juste avant les exercices qu'elles introduisent). */
export function buildLesson(nodeId, seed = Date.now()) {
  const n = nodeById(nodeId);
  if (!n || n.type !== 'lesson') throw new Error(`Leçon inconnue : ${nodeId}`);
  return { kind: 'lesson', node: n, hearts: null, items: tag(expand(n.ex, rng(`${seed}:${nodeId}`)).map((it) => ({ ...it, src: nodeId })), nodeId) };
}

/** Pioche équilibrée : un exercice de chaque leçon à tour de rôle. */
function roundRobin(pools, count, r) {
  const ps = pools.map((p) => shuffle(r, p)).filter((p) => p.length);
  const out = [];
  while (out.length < count && ps.some((p) => p.length)) {
    for (const p of shuffle(r, ps)) { if (p.length && out.length < count) out.push(p.pop()); }
  }
  return out;
}
const lessonPool = (n, seed) => expand(n.ex, rng(`${seed}:${n.id}`)).filter((it) => !isCard(it) && !it.noTest).map((it) => ({ ...it, src: n.id }));

/** Contrôle d'unité : 12 exercices piochés dans toutes ses leçons, 3 cœurs. */
export function buildCheckpoint(unitId, seed = Date.now()) {
  const u = unitById(unitId);
  const r = rng(`${seed}:cp:${unitId}`);
  const lessons = u.nodes.filter((n) => n.type === 'lesson');
  const node = u.nodes.find((n) => n.type === 'checkpoint');
  return { kind: 'checkpoint', node: node && nodeById(node.id), unit: u, hearts: 3, items: tag(roundRobin(lessons.map((n) => lessonPool(n, seed)), 12, r), `cp-${unitId}`) };
}

/** Test pour sauter jusqu'à une unité : exercices des unités précédentes pas encore terminées, 3 cœurs. */
export function buildJump(course, unitId, seed = Date.now()) {
  const k = unitIndex(unitId);
  const r = rng(`${seed}:jump:${unitId}`);
  const skipped = UNITS.slice(0, k).filter((u) => !unitStatus(course, u.id).complete);
  const lessons = skipped.flatMap((u) => u.nodes.filter((n) => n.type === 'lesson'));
  return { kind: 'jump', unit: unitById(unitId), skipped: skipped.map((u) => u.id), hearts: 3, items: tag(roundRobin(lessons.map((n) => lessonPool(n, seed)), Math.min(16, 8 + 2 * skipped.length), r), `jump-${unitId}`) };
}

/** Entraînement libre : leçons déjà faites, en priorité celles où il y a eu des erreurs. */
export function buildPractice(course, seed = Date.now()) {
  const r = rng(`${seed}:practice`);
  const done = NODES.filter((n) => n.type === 'lesson' && course.done?.[n.id]);
  if (!done.length) return null;
  const miss = course.miss || {};
  const ranked = shuffle(r, done).sort((a, b) => (miss[b.id] || 0) - (miss[a.id] || 0));
  const chosen = ranked.slice(0, 5);
  return { kind: 'practice', hearts: null, lessons: chosen.map((n) => n.id), items: tag(roundRobin(chosen.map((n) => lessonPool(n, seed)), 10, r), 'practice') };
}

// ---------- Vérification des réponses ----------

const eqArr = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const norm = (s) => String(s).trim().toLowerCase();
const pcsOf = (ms) => [...new Set(ms.map((m) => mod(m, 12)))].sort((a, b) => a - b);

/** Patch de départ des exercices de synthé : une scie brute, filtre ouvert. */
export const INIT_PATCH = makePreset({
  osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }, { wave: 'sawtooth', semi: 12, voices: 1, detune: 0, level: 0 }],
  filter: { type: 'lowpass', cutoff: 12000, q: 0.7, envAmt: 0, slope: 12 },
  fenv: { a: 0.005, d: 0.3, s: 0, r: 0.2 },
  amp: { a: 0.005, d: 0.3, s: 0.8, r: 0.2 },
  reverb: 0.1, gain: 0.45,
});

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
function deepMerge(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => (i in b ? deepMerge(x, b[i]) : x)).concat(b.slice(a.length));
  if (!isObj(a) || !isObj(b)) return b === undefined ? a : b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in a ? deepMerge(a[k], v) : v;
  return out;
}
/** Patch complet : rien → patch de départ ; 'pluck' → preset ; { filter: {…} } → réglages par-dessus le patch de départ. */
export function resolvePatch(spec) {
  if (!spec) return JSON.parse(JSON.stringify(INIT_PATCH));
  if (typeof spec === 'string') return normalizeParams(JSON.parse(JSON.stringify((PRESETS[spec] || PRESETS.pluck).params)));
  return normalizeParams(deepMerge(INIT_PATCH, spec));
}

/**
 * Vérifie une réponse. Renvoie { ok, why? } (why : explication de l'erreur, quand elle est utile).
 * Les exercices en temps réel (paires, tap, vélocité, potard) donnent leur verdict eux-mêmes : ans = { ok }.
 */
export function checkAnswer(item, ans) {
  switch (item.t) {
    case 'mcq': case 'shortcut': return { ok: ans === item.a };
    case 'order': return { ok: Array.isArray(ans) && eqArr(ans, item.items) };
    case 'blank': return { ok: Array.isArray(ans) && eqArr(ans.map(norm), item.answers.map(norm)) };
    case 'number': {
      const x = Number(String(ans).replace(',', '.'));
      return { ok: Number.isFinite(x) && Math.abs(x - item.a) <= (item.tol ?? 0) + 1e-9 };
    }
    case 'live': return { ok: [].concat(item.target).includes(ans) };
    case 'keys': return checkKeys(item, ans || []);
    case 'grid': return checkGrid(item, ans || {});
    case 'roll': return checkRoll(item, ans || []);
    case 'synth': return checkSynth(item, ans);
    default: return { ok: !!ans?.ok, why: ans?.why };
  }
}

/** Clavier : une note (classe de hauteur ou note exacte), un accord (ensemble de notes), une suite de notes. */
export function checkKeys(item, notes) {
  if (!notes.length) return { ok: false };
  if (item.mode === 'note') {
    const m = notes[notes.length - 1];
    return { ok: item.exact ? m === item.target[0] : mod(m, 12) === mod(item.target[0], 12) };
  }
  if (item.mode === 'chord') {
    const ok = eqArr(pcsOf(notes), [...item.target].map((x) => mod(x, 12)).sort((a, b) => a - b));
    if (ok && item.bass != null && mod(Math.min(...notes), 12) !== mod(item.bass, 12)) return { ok: false, why: 'Les bonnes notes, mais pas la bonne note en bas (basse).' };
    return { ok };
  }
  const got = item.exact ? notes : notes.map((m) => mod(m, 12));
  return { ok: eqArr(got, item.target.map((x) => (item.exact ? x : mod(x, 12)))) };
}

/** Grille de batterie : cases jouées (1) / ghost (2) comparées au modèle, ou règles. */
export function checkGrid(item, cells) {
  if (item.rules) {
    for (const rule of item.rules) {
      const row = cells[rule.row] || [];
      const zone = rule.in ? rule.in.map((s) => row[s] || 0) : row;
      const hits = zone.filter((v) => v > 0).length;
      if (rule.on && !rule.on.every((s) => row[s] > 0)) return { ok: false, why: rule.why };
      if (rule.off && rule.off.some((s) => row[s] > 0)) return { ok: false, why: rule.why };
      if (rule.min != null && hits < rule.min) return { ok: false, why: rule.why };
      if (rule.max != null && hits > rule.max) return { ok: false, why: rule.why };
    }
    return { ok: true };
  }
  for (const r of item.rows) {
    const want = item.target[r] || '................';
    const row = cells[r] || [];
    for (let s = 0; s < want.length; s++) {
      const w = want[s] === 'x' ? 1 : want[s] === 'g' ? 2 : 0;
      const v = row[s] || 0;
      if (item.vel ? v !== w : (v > 0) !== (w > 0)) return { ok: false };
    }
  }
  return { ok: true };
}

/** Piano roll : notes exactes ou règles (dans la gamme, sur les bons pas, fondamentale de l'accord…). */
export function checkRoll(item, notes) {
  if (item.target) {
    const key = (n) => `${n.s}:${n.m}`;
    const a = notes.map(key).sort(), b = item.target.map(([s, m]) => key({ s, m })).sort();
    return { ok: eqArr(a, b) };
  }
  for (const rule of item.rules || []) {
    const fail = { ok: false, why: rule.why };
    switch (rule.k) {
      case 'count': if (notes.length < (rule.min ?? 0) || notes.length > (rule.max ?? 1e9)) return fail; break;
      case 'inScale': if (!notes.every((n) => SCALES[rule.scale].steps.includes(mod(n.m - rule.root, 12)))) return fail; break;
      case 'onSteps': if (!notes.every((n) => rule.steps.includes(n.s))) return fail; break;
      case 'hasStep': if (!rule.steps.every((s) => notes.some((n) => n.s === s))) return fail; break;
      case 'pcAt': if (!rule.at.every(([s, pc]) => notes.some((n) => n.s === s && mod(n.m, 12) === pc))) return fail; break;
      case 'mono': { const seen = new Set(); for (const n of notes) { if (seen.has(n.s)) return fail; seen.add(n.s); } break; }
      case 'repeat': { // la 2e moitié reprend la 1re (motif répété)
        const half = rule.half;
        const a = notes.filter((n) => n.s < half).map((n) => `${n.s}:${n.m}`).sort();
        const b = notes.filter((n) => n.s >= half).map((n) => `${n.s - half}:${n.m}`).sort();
        if (!a.length || !eqArr(a, b)) return fail;
        break;
      }
      case 'range': if (!notes.every((n) => n.m >= rule.lo && n.m <= rule.hi)) return fail; break;
      default: break;
    }
  }
  return { ok: true };
}

/** Synthé : chaque paramètre dans sa plage, ou son assez proche d'une cible (à l'oreille). */
export function checkSynth(item, params) {
  if (!params) return { ok: false };
  if (item.match) {
    const sim = similarity(params, resolvePatch(item.match), item.knobs);
    const worst = Object.entries(sim.detail).sort((a, b) => a[1] - b[1])[0];
    return { ok: sim.score >= (item.threshold ?? 72), score: sim.score, why: worst && worst[1] < 0.6 ? `Le réglage le plus éloigné : ${paramById(worst[0]).label}.` : null };
  }
  for (const [id, range] of Object.entries(item.ranges || {})) {
    const def = paramById(id);
    const v = getPath(params, def.path);
    const ok = Array.isArray(range) ? v >= range[0] - 1e-9 && v <= range[1] + 1e-9 : v === range;
    if (!ok) return { ok: false, why: item.whys?.[id] || `Regarde « ${def.label} ».` };
  }
  return { ok: true };
}

/**
 * Tapes en rythme : appariement des frappes avec les temps attendus (secondes).
 * @returns {{ ok:boolean, hits:number, total:number, extra:number, offsets:number[] }}
 */
export function judgeTaps(taps, expected, tol = 0.13) {
  const used = new Set();
  const offsets = [];
  let hits = 0;
  for (const e of expected) {
    let best = -1, bd = Infinity;
    taps.forEach((t, i) => { const d = Math.abs(t - e); if (!used.has(i) && d < bd) { bd = d; best = i; } });
    if (best >= 0 && bd <= tol) { used.add(best); hits++; offsets.push(taps[best] - e); }
  }
  const extra = taps.length - used.size;
  return { ok: hits >= Math.ceil(expected.length * 0.75) && extra <= Math.max(1, Math.floor(expected.length / 4)), hits, total: expected.length, extra, offsets };
}

// ---------- Récompenses et enregistrement ----------

/** XP d'un nœud : plus pour un contrôle, moins pour une révision d'une leçon déjà faite. */
export function xpFor(node, { first = true, perfect = false, kind = 'lesson' } = {}) {
  if (kind === 'jump') return 30;
  if (kind === 'practice') return perfect ? 15 : 10;
  const base = node?.type === 'checkpoint' ? 25 : node?.type === 'studio' ? 20 : node?.type === 'lab' ? 15 : 12;
  return (first ? base : Math.round(base / 2)) + (perfect ? 5 : 0);
}

/** Enregistre un nœud terminé (copie : ne modifie pas l'entrée). */
export function completeNode(course = {}, id, { acc = 100, perfect = false, day, skipped = false } = {}) {
  const prev = course.done?.[id];
  const entry = {
    d: prev?.d || day, n: (prev?.n || 0) + 1, best: Math.max(prev?.best || 0, Math.round(acc)),
    perfect: !!(prev?.perfect || perfect), ...(skipped && !prev ? { skipped: true } : {}),
  };
  return { ...course, done: { ...(course.done || {}), [id]: entry } };
}

/** Test de saut réussi : toutes les leçons et contrôles des unités précédentes sont validés. */
export function applyJump(course = {}, unitId, day) {
  const k = unitIndex(unitId);
  let c = course;
  for (const n of NODES) if (n.ui < k && isRequired(n) && !c.done?.[n.id]) c = completeNode(c, n.id, { acc: 80, day, skipped: true });
  return c;
}

/** Erreurs par leçon (l'entraînement revient en priorité sur les leçons difficiles). */
export function addMisses(course = {}, lessonId, n) {
  if (!n || !lessonId) return course;
  return { ...course, miss: { ...(course.miss || {}), [lessonId]: (course.miss?.[lessonId] || 0) + n } };
}

// ---------- Révisions du parcours : une leçon où l'on a hésité revient après 1, 3, 7 puis 14 jours ----------
const REV_GAPS = [1, 3, 7, 14];
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86400000);
/** Leçons à réviser aujourd'hui (au moins 2 erreurs, et l'intervalle depuis la dernière révision est écoulé). */
export function dueLessons(course = {}, day) {
  const miss = course.miss || {}, rev = course.rev || {};
  return NODES.filter((n) => {
    const done = course.done?.[n.id];
    if (n.type !== 'lesson' || !done || (miss[n.id] || 0) < 2) return false;
    const r = rev[n.id];
    const gap = daysBetween(r?.d || done.d || day, day);
    return Number.isFinite(gap) && gap >= REV_GAPS[Math.min(r?.n || 0, REV_GAPS.length - 1)];
  }).map((n) => n.id);
}
/** Entraînement terminé : les leçons révisées sont datées, et leur compteur d'erreurs diminue de moitié. */
export function markPracticed(course = {}, ids = [], day) {
  if (!ids.length) return course;
  const miss = { ...(course.miss || {}) }, rev = { ...(course.rev || {}) };
  for (const id of ids) {
    if (miss[id]) miss[id] = Math.floor(miss[id] / 2);
    rev[id] = { d: day, n: rev[id]?.d === day ? rev[id].n : (rev[id]?.n || 0) + 1 };
  }
  return { ...course, miss, rev };
}

/** Atelier ou mission bonus validé(e) d'après ce que l'élève a fait dans l'app depuis son lancement. */
export function bonusDone(s, node) {
  const st = s.course?.started?.[node.id];
  const c = node.check || {};
  const after = (t) => !st || (t || 0) >= st.at;
  if (c.pads) return (s.pads?.best?.[c.pads]?.stars || 0) >= (c.stars || 1);
  if (c.rush) return (s.rush?.best?.[c.rush]?.stars || 0) >= (c.stars || 1);
  if (!st) return false;
  if (c.log) return (s.log || []).some((e) => [].concat(c.log).some((p) => e.key?.startsWith(p)) && after(e.t));
  if (c.exports) return (s.stats?.exports || 0) > (st.exports0 || 0);
  if (c.notebook) return (s.notebook || []).some((it) => it.type === c.notebook && after(it.date));
  return false;
}

export { mergeCourse } from './coursemerge.js';
