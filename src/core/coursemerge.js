// Fusion de deux progressions du parcours (synchro entre appareils). Module pur, sans dépendance.

/** Fusion de deux progressions (synchro entre appareils) : rien de gagné n'est perdu. */
export function mergeCourse(a = {}, b = {}) {
  const done = { ...(a.done || {}) };
  for (const [id, v] of Object.entries(b.done || {})) {
    const o = done[id];
    done[id] = !o ? v : { d: [o.d, v.d].filter(Boolean).sort()[0], n: Math.max(o.n || 0, v.n || 0), best: Math.max(o.best || 0, v.best || 0), perfect: !!(o.perfect || v.perfect), ...(o.skipped && v.skipped ? { skipped: true } : {}) };
  }
  // Révisions : la plus récente (ou la plus avancée) l'emporte, avec son compteur d'erreurs déjà allégé
  const rev = { ...(a.rev || {}) };
  const newer = (x, y) => (!x ? true : !y ? false : y.d > x.d || (y.d === x.d && (y.n || 0) > (x.n || 0)));
  const miss = { ...(a.miss || {}) };
  for (const [k, v] of Object.entries(b.miss || {})) {
    const ra = a.rev?.[k], rb = b.rev?.[k];
    miss[k] = ra || rb ? (newer(ra, rb) ? v : miss[k] ?? v) : Math.max(miss[k] || 0, v);
  }
  for (const [k, v] of Object.entries(b.rev || {})) if (newer(rev[k], v)) rev[k] = v;
  return { ...a, ...b, done, miss, ...(Object.keys(rev).length ? { rev } : {}), started: { ...(a.started || {}), ...(b.started || {}) } };
}
