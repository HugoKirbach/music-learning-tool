// Fusion de deux progressions du parcours (synchro entre appareils). Module pur, sans dépendance.

/** Fusion de deux progressions (synchro entre appareils) : rien de gagné n'est perdu. */
export function mergeCourse(a = {}, b = {}) {
  const done = { ...(a.done || {}) };
  for (const [id, v] of Object.entries(b.done || {})) {
    const o = done[id];
    done[id] = !o ? v : { d: [o.d, v.d].filter(Boolean).sort()[0], n: Math.max(o.n || 0, v.n || 0), best: Math.max(o.best || 0, v.best || 0), perfect: !!(o.perfect || v.perfect), ...(o.skipped && v.skipped ? { skipped: true } : {}) };
  }
  const miss = { ...(a.miss || {}) };
  for (const [k, v] of Object.entries(b.miss || {})) miss[k] = Math.max(miss[k] || 0, v);
  return { ...a, ...b, done, miss, started: { ...(a.started || {}), ...(b.started || {}) } };
}
