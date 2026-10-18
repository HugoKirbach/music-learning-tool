// Fusion de deux sauvegardes (deux appareils modifiés hors-ligne) : rien de ce qui a été gagné n'est perdu.
// Cumulatif (XP, jours, badges, carnet, records…) → union / maximum. Le reste (idée en cours, réglages…) → la version la plus récente.

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const maxNum = (a, b) => Math.max(Number(a) || 0, Number(b) || 0);

/** { clé: nombre } → maximum par clé. */
function maxMap(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b || {})) out[k] = typeof v === 'number' ? maxNum(out[k], v) : out[k] ?? v;
  return out;
}

/** Objets de nombres imbriqués (journées : xp, sessions, skills{}, ear{}) → maximum champ par champ. */
function deepMax(a, b) {
  if (typeof a === 'number' || typeof b === 'number') return maxNum(a, b);
  if (!isObj(a)) return b;
  if (!isObj(b)) return a;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = k in a ? deepMax(a[k], b[k]) : b[k];
  return out;
}

function unionBy(a = [], b = [], key, deleted = new Set()) {
  const m = new Map();
  for (const x of [...a, ...b]) { const k = key(x); if (!deleted.has(k) && !m.has(k)) m.set(k, x); }
  return [...m.values()];
}

export function isPristine(s) {
  return !s || ((s.xp || 0) === 0 && !(s.notebook || []).length && !Object.keys(s.days || {}).length);
}

export function mergeStates(local, remote) {
  if (isPristine(remote)) return local;
  if (isPristine(local)) return remote;
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
  const older = newer === remote ? local : remote;
  const deleted = new Set([...(local.deleted || []), ...(remote.deleted || [])]);
  const out = { ...older, ...newer };

  out.xp = maxNum(local.xp, remote.xp);
  out.skills = maxMap(local.skills, remote.skills);
  out.stats = maxMap(local.stats, remote.stats);
  out.genres = maxMap(local.genres, remote.genres);
  out.missions = maxMap(local.missions, remote.missions);
  out.sessionCount = maxMap(local.sessionCount, remote.sessionCount);
  out.days = deepMax(local.days || {}, remote.days || {});
  out.badges = { ...(newer.badges || {}), ...(older.badges || {}) }; // garde la date d'obtention la plus ancienne
  for (const [k, v] of Object.entries(newer.badges || {})) if (!out.badges[k] || v < out.badges[k]) out.badges[k] = v;

  const sa = local.streak || {}, sb = remote.streak || {};
  const ls = (sa.last || '') >= (sb.last || '') ? sa : sb;
  out.streak = { ...ls, best: maxNum(sa.best, sb.best) };

  out.log = unionBy(local.log, remote.log, (x) => JSON.stringify(x)).sort((x, y) => (x.d || '').localeCompare(y.d || '')).slice(-400);
  out.notebook = unionBy(newer.notebook, older.notebook, (x) => x.id, deleted).sort((x, y) => (y.date || 0) - (x.date || 0));
  out.deleted = [...deleted].slice(-300);
  out.customDice = unionBy(newer.customDice, older.customDice, (x) => JSON.stringify(x));
  out.review = { ...(older.review || {}), ...(newer.review || {}) };

  const pa = local.program || {}, pb = remote.program || {};
  out.program = {
    ...older.program, ...newer.program,
    startedAt: [pa.startedAt, pb.startedAt].filter(Boolean).sort()[0] || null,
    done: { ...(pa.done || {}), ...(pb.done || {}) },
  };

  const ra = local.rush || {}, rb = remote.rush || {};
  if (local.rush || remote.rush) {
    const best = { ...(ra.best || {}) };
    for (const [k, v] of Object.entries(rb.best || {})) {
      const o = best[k];
      best[k] = !o ? v : { stars: maxNum(o.stars, v.stars), acc: maxNum(o.acc, v.acc) };
    }
    out.rush = { ...(older.rush || {}), ...(newer.rush || {}), best, learn: maxMap(ra.learn, rb.learn) };
  }
  out.settings = { ...(older.settings || {}), ...(newer.settings || {}), onboarded: !!(local.settings?.onboarded || remote.settings?.onboarded) };
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  return out;
}
