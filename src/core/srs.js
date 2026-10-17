// Révisions espacées (système de Leitner) : les notions ratées reviennent après 1, 2, 4, 8, 16 jours. Module pur.
import { daysBetween } from './progress.js';

export const BOX_DAYS = [1, 2, 4, 8, 16];

export function addDays(day, n) {
  const d = new Date(day + 'T12:00:00');
  d.setDate(d.getDate() + n);
  const z = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/**
 * Met à jour une fiche après une réponse.
 * @param {{box:number, due:string}|undefined} entry
 * @param {boolean} ok
 * @param {string} today 'AAAA-MM-JJ'
 * @param {boolean} inReview la question venait des révisions
 * @returns {{box:number, due:string}|null} null = fiche acquise (on la retire)
 */
export function reviewUpdate(entry, ok, today, inReview) {
  if (!ok) return { box: 0, due: addDays(today, 1) };
  if (!entry) return null; // bonne réponse sur une notion jamais ratée : rien à réviser
  if (!inReview && daysBetween(today, entry.due) > 0) return entry; // pas encore à réviser : on ne compte pas
  const box = entry.box + 1;
  if (box >= BOX_DAYS.length) return null;
  return { box, due: addDays(today, BOX_DAYS[box]) };
}

export function dueItems(review = {}, today) {
  return Object.entries(review)
    .filter(([, e]) => daysBetween(e.due, today) >= 0)
    .sort((a, b) => a[1].box - b[1].box || a[1].due.localeCompare(b[1].due))
    .map(([key, e]) => ({ key, ...e, mode: key.split(':')[0], value: key.slice(key.indexOf(':') + 1) }));
}
