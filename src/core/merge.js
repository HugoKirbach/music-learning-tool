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

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Fusion à trois voies d'une valeur « non cumulative » : base = dernière version synchronisée.
 * Modifiée d'un seul côté → cette modification gagne ; des deux côtés → la plus récente (objets : champ par champ).
 */
function pick3(l, r, b, remoteNewer, depth = 0) {
  if (same(l, r)) return l;
  if (b !== undefined) {
    if (same(l, b)) return r;
    if (same(r, b)) return l;
  }
  if (depth < 1 && isObj(l) && isObj(r)) {
    const out = {};
    for (const k of new Set([...Object.keys(l), ...Object.keys(r)])) {
      if (!(k in r)) out[k] = l[k];
      else if (!(k in l)) out[k] = r[k];
      else out[k] = pick3(l[k], r[k], isObj(b) ? b[k] : undefined, remoteNewer, depth + 1);
    }
    return out;
  }
  return remoteNewer ? r : l;
}

/** base (facultatif) : l'état tel qu'il était à la dernière synchro réussie. */
export function mergeStates(local, remote, base = null) {
  if (isPristine(remote)) return local;
  if (isPristine(local)) return remote;
  const newer = (remote.updatedAt || 0) > (local.updatedAt || 0) ? remote : local;
  const older = newer === remote ? local : remote;
  const deleted = new Set([...(local.deleted || []), ...(remote.deleted || [])]);
  const out = { ...older, ...newer };
  // Valeurs « non cumulatives » (idée en cours, arrangement, réglages, session…) : fusion à trois voies
  for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
    if (k in local && k in remote) out[k] = pick3(local[k], remote[k], base ? base[k] : undefined, newer === remote);
  }

  out.xp = maxNum(local.xp, remote.xp);
  out.skills = maxMap(local.skills, remote.skills);
  out.stats = maxMap(local.stats, remote.stats);
  out.genres = maxMap(local.genres, remote.genres);
  out.missions = maxMap(local.missions, remote.missions);
  out.sessionCount = maxMap(local.sessionCount, remote.sessionCount);
  out.days = deepMax(local.days || {}, remote.days || {});
  out.badges = { ...(newer.badges || {}), ...(older.badges || {}) }; // garde la date d'obtention la plus ancienne
  for (const [k, v] of Object.entries(newer.badges || {})) if (!out.badges[k] || v < out.badges[k]) out.badges[k] = v;
  // Erreurs récurrentes : on garde le plus grand compteur par notion
  out.errors = { ...(older.errors || {}) };
  for (const [k, v] of Object.entries(newer.errors || {})) { const o = out.errors[k]; out.errors[k] = !o || (v.n || 0) >= (o.n || 0) ? v : o; }
  // Parcours de style : étapes faites des deux côtés
  out.paths = { ...(older.paths || {}) };
  for (const [g, p] of Object.entries(newer.paths || {})) { const o = out.paths[g] || {}; out.paths[g] = { ...o, ...p, start: [o.start, p.start].filter(Boolean).sort()[0], done: { ...(o.done || {}), ...(p.done || {}) } }; }
  out.cards = { ...(newer.cards || {}), ...(older.cards || {}) };
  for (const [k, v] of Object.entries(newer.cards || {})) if (!out.cards[k] || v < out.cards[k]) out.cards[k] = v;
  out.certs = { ...(newer.certs || {}), ...(older.certs || {}) };
  for (const [k, v] of Object.entries(newer.certs || {})) if (!out.certs[k] || v < out.certs[k]) out.certs[k] = v;

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

  // Jeux (Piano Rush, Pad Rush) : meilleurs scores et répétitions au maximum, réglages du plus récent.
  for (const key of ['rush', 'pads']) {
    const ra = local[key] || {}, rb = remote[key] || {};
    if (!local[key] && !remote[key]) continue;
    const best = { ...(ra.best || {}) };
    for (const [k, v] of Object.entries(rb.best || {})) {
      const o = best[k];
      best[k] = !o ? v : { stars: maxNum(o.stars, v.stars), acc: maxNum(o.acc, v.acc) };
    }
    out[key] = { ...pick3(ra, rb, base?.[key], newer === remote), best, learn: maxMap(ra.learn, rb.learn) };
  }
  // Nuit au club : meilleures nuits, vinyles et compteurs au maximum
  if (local.club || remote.club) {
    const ca = local.club || {}, cb = remote.club || {};
    const best = { ...(ca.best || {}) };
    for (const [k, v] of Object.entries(cb.best || {})) best[k] = best[k] ? { stars: maxNum(best[k].stars, v.stars), score: maxNum(best[k].score, v.score) } : v;
    const rank = { black: 1, color: 2, gold: 3 };
    const crate = { ...(ca.crate || {}) };
    for (const [k, v] of Object.entries(cb.crate || {})) crate[k] = crate[k] ? { n: maxNum(crate[k].n, v.n), kind: rank[v.kind] > rank[crate[k].kind] ? v.kind : crate[k].kind } : v;
    const daily = (ca.daily?.day || '') > (cb.daily?.day || '') ? ca.daily : (cb.daily?.day || '') > (ca.daily?.day || '') ? cb.daily : (ca.daily && { ...ca.daily, score: maxNum(ca.daily.score, cb.daily?.score) });
    out.club = { ...pick3(ca, cb, base?.club, newer === remote), best, crate, nights: maxNum(ca.nights, cb.nights), dailyCount: maxNum(ca.dailyCount, cb.dailyCount), daily: daily || null };
  }
  out.settings = { ...pick3(local.settings || {}, remote.settings || {}, base?.settings, newer === remote), onboarded: !!(local.settings?.onboarded || remote.settings?.onboarded) };
  out.updatedAt = Math.max(local.updatedAt || 0, remote.updatedAt || 0);
  return out;
}
