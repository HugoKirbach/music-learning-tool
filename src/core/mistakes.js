// Erreurs récurrentes : les notions ratées plusieurs fois récemment, et ce avec quoi tu les confonds. Module pur.
import { daysBetween, dayKey } from './progress.js';
import { GAME_MODES } from './srs.js';

/**
 * Notions ratées au moins `min` fois, la dernière fois il y a moins de `days` jours, et pas « réglées » depuis
 * (exercice ciblé réussi après la dernière erreur). Triées de la plus fréquente à la moins fréquente.
 */
export function recurringErrors(s, today = dayKey(), { min = 2, days = 30 } = {}) {
  return Object.entries(s.errors || {})
    .filter(([, e]) => (e.n || 0) >= min && e.last && daysBetween(e.last, today) <= days && !(e.cleared && e.cleared >= e.last))
    .map(([key, e]) => {
      const i = key.indexOf(':');
      const mode = key.slice(0, i), value = key.slice(i + 1);
      const conf = Object.entries(e.given || {}).filter(([g]) => g !== value).sort((a, b) => b[1] - a[1])[0];
      return { key, mode, value, n: e.n, last: e.last, game: GAME_MODES.includes(mode), confused: conf ? conf[0] : null, confusedN: conf ? conf[1] : 0 };
    })
    .sort((a, b) => b.n - a.n || b.last.localeCompare(a.last));
}

/** Questions d'un exercice ciblé : alterne la notion ratée et celle avec laquelle on la confond. */
export function drillPlan(err, n = 6) {
  return Array.from({ length: n }, (_, i) => (err.confused && i % 2 === 1 ? err.confused : err.value));
}
