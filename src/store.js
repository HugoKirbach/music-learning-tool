// État persistant de l'application (localStorage) + événements.
import { levelFromXp, updateStreak, dayKey, newBadges, SKILLS, CERT_LEVELS } from './core/progress.js';
import { gridFromPatterns } from './core/rhythm.js';
import { genreById, defaultPump } from './data/genres.js';
import { MELODY_STEPS } from './core/arrange.js';
import { kitForGenre } from './core/audio.js';
import { stepMatches } from './core/daily.js';
import { reviewUpdate, dueItems, isGameItem } from './core/srs.js';
import { SCHEMA, migrate, looksValid } from './core/schema.js';

const KEY = 'beatforge.v1';
const listeners = new Set();

export function projectFromGenre(id) {
  const g = genreById(id);
  return {
    genre: g.id,
    bpm: g.bpm,
    swing: g.swing,
    rootPc: g.rootPc,
    scale: g.scale,
    drums: gridFromPatterns(g.drums),
    chords: g.prog.map((s) => ({ ...s })),
    ext: g.id === 'lofi' || g.id === 'deephouse' || g.id === 'bossa' ? 4 : 3,
    voicing: 'lead',
    chordStyle: g.chordStyle,
    bassStyle: g.bassStyle,
    sounds: { ...g.sounds },
    kit: kitForGenre(g.id),
    pump: defaultPump(g.id),
    melody: new Array(MELODY_STEPS).fill(null),
    mutes: {},
  };
}

function fresh() {
  return {
    v: SCHEMA,
    createdAt: Date.now(),
    xp: 0,
    skills: Object.fromEntries(Object.keys(SKILLS).map((k) => [k, 0])),
    streak: { count: 0, last: null, best: 0 },
    days: {},
    badges: {},
    genres: {},
    missions: {},
    later: [],
    stats: { exercises: 0, sessions: 0, earCorrect: 0, earTotal: 0, hints: 0, noHintWins: 0, beatPerfect: 0, bestCatchy: 0, bestMatch: 0, exports: 0, midiNotes: 0 },
    notebook: [],
    project: projectFromGenre('house'),
    settings: { volume: 0.8, hints: 'auto', dailyGoal: 150, onboarded: false },
    session: null,
    sessionCount: {},
    review: {},
    program: { startedAt: null, done: {} },
    customDice: [],
    recent: [],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw);
    if (!looksValid(s)) throw new Error('format inconnu');
    if ((s.v || 1) < SCHEMA) {
      // copie de sécurité avant la mise à jour du format
      try { localStorage.setItem(`${KEY}.avant-v${SCHEMA}`, raw); } catch (e) { /* stockage plein */ }
    }
    migrate(s);
    const f = fresh();
    // fusion défensive (nouvelles clés ajoutées dans des versions futures)
    return {
      ...f, ...s,
      stats: { ...f.stats, ...(s.stats || {}) },
      settings: { ...f.settings, ...(s.settings || {}) },
      skills: { ...f.skills, ...(s.skills || {}) },
      project: { ...f.project, ...(s.project || {}) },
    };
  } catch (e) {
    // On ne jette jamais une sauvegarde illisible : elle est gardée à part pour pouvoir la récupérer
    console.warn('Sauvegarde illisible, mise de côté', e);
    try { const raw = localStorage.getItem(KEY); if (raw) localStorage.setItem(`${KEY}.illisible`, raw); } catch (err) { /* noop */ }
    return fresh();
  }
}

let state = load();

export function getState() {
  return state;
}

export function save({ touch = true } = {}) {
  if (touch) state.updatedAt = Date.now();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn(e); }
  listeners.forEach((l) => l(state));
}

export function update(fn) {
  fn(state);
  save();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function level() {
  return levelFromXp(state.xp).level;
}

export function today() {
  return state.days[dayKey()] || { xp: 0, sessions: 0, exercises: 0 };
}

/**
 * Enregistre un exercice terminé et attribue l'XP.
 * @param {{key:string, xp:number, skill?:string, genre?:string, hintUsed?:boolean, success?:boolean}} r
 * @returns {{levelUp:boolean, level:number, badges:object[], sessionAdvanced:boolean, sessionDone:boolean}}
 */
export function recordExercise(r) {
  const before = levelFromXp(state.xp).level;
  const d = dayKey();
  const day = state.days[d] || { xp: 0, sessions: 0, exercises: 0 };
  const xp = Math.max(0, Math.round(r.xp));
  state.xp += xp;
  day.xp += xp;
  day.exercises++;
  state.days[d] = day;
  state.stats.exercises++;
  // XP d'une seule compétence, ou réparti entre plusieurs (r.skills = { rythme: 12, oreille: 6 })
  const dist = r.skills || (r.skill ? { [r.skill]: xp } : {});
  for (const [k, v] of Object.entries(dist)) {
    if (state.skills[k] == null || !(v > 0)) continue;
    state.skills[k] += Math.round(v);
    day.skills = day.skills || {};
    day.skills[k] = (day.skills[k] || 0) + Math.round(v);
  }
  // Journal (pour le bilan hebdo) : 400 dernières entrées
  state.log = [...(state.log || []), { d, key: r.key, xp, skill: r.skill || null, genre: r.genre || null, score: r.score ?? null }].slice(-400);
  // Tableau de bord : score moyen du jour et tempo le plus rapide réussi (≥ 80 %)
  if (typeof r.score === 'number') day.acc = { n: (day.acc?.n || 0) + 1, sum: (day.acc?.sum || 0) + Math.round(r.score) };
  if (r.bpm && r.score >= 80) day.tempo = Math.max(day.tempo || 0, Math.round(r.bpm));
  if (r.genre) state.genres[r.genre] = (state.genres[r.genre] || 0) + 1;
  if (r.hintUsed) state.stats.hints++;
  else if (r.success) state.stats.noHintWins++;
  state.streak = updateStreak(state.streak, d);

  // Session en cours
  let sessionAdvanced = false, sessionDone = false;
  const sess = state.session;
  if (sess && sess.day === d && stepMatches(sess.steps[sess.idx], r.key)) {
    sess.done[sess.idx] = true;
    sess.idx++;
    sessionAdvanced = true;
    if (sess.idx >= sess.steps.length) {
      sessionDone = true;
      const bonus = 40;
      state.xp += bonus;
      day.xp += bonus;
      day.sessions++;
      state.stats.sessions++;
      state.session = { ...sess, finished: true };
      if (sess.programDay != null) {
        state.program.done[sess.programDay] = d;
        state.program.startedAt = state.program.startedAt || d;
      }
    }
  }

  const badges = newBadges(state);
  badges.forEach((b) => { state.badges[b.id] = d; });
  const after = levelFromXp(state.xp).level;
  // Certificat à chaque nouveau titre (niveaux 3, 5, 8, 12…)
  const certs = CERT_LEVELS.filter((L) => L > before && L <= after && !state.certs?.[L]);
  if (certs.length) state.certs = { ...(state.certs || {}), ...Object.fromEntries(certs.map((L) => [L, d])) };
  save();
  return { levelUp: after > before, level: after, badges, sessionAdvanced, sessionDone, xp, cert: certs.at(-1) || null };
}

/** Vérifie les badges hors exercice (export, notes MIDI…). */
export function checkBadges() {
  const badges = newBadges(state);
  if (badges.length) {
    badges.forEach((b) => { state.badges[b.id] = dayKey(); });
    save();
  }
  return badges;
}

/** Enregistre une réponse d'oreille pour les révisions espacées (clé du type 'intervals:7'). */
export function recordReview(key, ok, inReview = false) {
  const d = dayKey();
  const day = state.days[d] || { xp: 0, sessions: 0, exercises: 0 };
  day.ear = { ok: ((day.ear || {}).ok || 0) + (ok ? 1 : 0), total: ((day.ear || {}).total || 0) + 1 };
  state.days[d] = day;
  const next = reviewUpdate(state.review[key], ok, d, inReview);
  if (next) state.review[key] = next;
  else delete state.review[key];
  save();
}

/** Temps de pratique (secondes) mesuré pendant que l'app est utilisée. */
export function addPractice(sec) {
  if (!(sec > 0)) return;
  const d = dayKey();
  const day = state.days[d] || { xp: 0, sessions: 0, exercises: 0 };
  day.sec = (day.sec || 0) + Math.round(sec);
  state.days[d] = day;
  save();
}

/** Résultat d'un niveau de jeu pour les révisions : raté → revient demain ; réussi à une date prévue → intervalle suivant. */
export function recordGameReview(key, ok) {
  const e = state.review[key];
  if (!e && ok) return;
  const d = dayKey();
  const next = reviewUpdate(e, ok, d, !!e && e.due <= d);
  if (next) state.review[key] = next;
  else delete state.review[key];
  save();
}

export function dueReviews() {
  return dueItems(state.review, dayKey());
}
/** Révisions d'oreille seulement (quiz). */
export function dueEarReviews() {
  return dueReviews().filter((x) => !isGameItem(x));
}

export function exportBackup() {
  return JSON.stringify(state, null, 1);
}

export function importBackup(json) {
  let s;
  try { s = JSON.parse(json); } catch (e) { throw new Error('Fichier de sauvegarde invalide'); }
  if (!looksValid(s)) throw new Error('Fichier de sauvegarde invalide');
  if ((s.v || 1) > SCHEMA) throw new Error('Sauvegarde créée par une version plus récente de l’app : mets-la à jour d’abord');
  snapshot('avant import');
  migrate(s);
  localStorage.setItem(KEY, JSON.stringify(s));
  state = load();
  save();
}

/** Remplace tout l'état (synchro cloud). touch=false : ne compte pas comme une modification locale. */
export function replaceState(s, { touch = false } = {}) {
  localStorage.setItem(KEY, JSON.stringify(s));
  state = load();
  save({ touch });
}

export function resetAll() {
  snapshot('avant réinitialisation');
  state = fresh();
  save();
}

// ---------- Filet de sécurité local : copie de l'état avant toute action qui remplace tout ----------
const SNAP_KEY = `${KEY}.filet`;
export function snapshot(reason) {
  try { localStorage.setItem(SNAP_KEY, JSON.stringify({ at: Date.now(), reason, xp: state.xp, data: state })); } catch (e) { /* stockage plein */ }
}
export function snapshotInfo() {
  try { const s = JSON.parse(localStorage.getItem(SNAP_KEY)); return s ? { at: s.at, reason: s.reason, xp: s.xp } : null; } catch (e) { return null; }
}
export function restoreSnapshot() {
  const s = JSON.parse(localStorage.getItem(SNAP_KEY));
  if (!s?.data) throw new Error('Aucune copie disponible');
  const cur = JSON.stringify({ at: Date.now(), reason: 'avant restauration', xp: state.xp, data: state });
  localStorage.setItem(KEY, JSON.stringify(s.data));
  localStorage.setItem(SNAP_KEY, cur);
  state = load();
  save();
}
