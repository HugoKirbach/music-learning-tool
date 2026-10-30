// Recherche rapide : correspondance tolérante (sans accents ni majuscules, mots dans le désordre, début de mot favorisé).

/** Minuscules sans accents ni ponctuation. */
export const fold = (s = '') => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'«»…·,.!?:;()/→—–-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Score d'un élément { name, desc, keys } pour la requête (0 = pas de correspondance). */
export function scoreItem(item, q) {
  const words = fold(q).split(' ').filter(Boolean);
  if (!words.length) return 0;
  const name = fold(item.name);
  const rest = fold(`${item.desc || ''} ${item.keys || ''} ${item.group || ''}`);
  let score = 0;
  for (const w of words) {
    const inName = name.indexOf(w);
    if (inName === 0) score += 10;
    else if (inName > 0) score += name[inName - 1] === ' ' ? 7 : 4;
    else if (rest.includes(w)) score += /\s/.test(rest[rest.indexOf(w) - 1] || ' ') ? 2 : 1;
    else return 0;
  }
  return score + (name === fold(q) ? 20 : 0) + (item.boost || 0);
}

/** Meilleurs résultats, du plus pertinent au moins pertinent (ordre d'origine en cas d'égalité). */
export function search(items, q, max = 12) {
  return items.map((it, i) => ({ it, i, sc: scoreItem(it, q) })).filter((x) => x.sc > 0)
    .sort((a, b) => b.sc - a.sc || a.i - b.i).slice(0, max).map((x) => x.it);
}
