// Calibrage de la latence : on tape en même temps qu'un clic, on mesure le décalage moyen
// (latence de l'écran tactile, du clavier, du MIDI ou du Bluetooth + habitude de jeu) puis les jeux le corrigent. Module pur.

export const INPUTS = {
  touch: { emoji: '👆', name: 'Écran tactile / souris' },
  key: { emoji: '⌨️', name: 'Clavier de l’ordinateur' },
  midi: { emoji: '🎹', name: 'Clavier ou pads MIDI' },
};

/** Type d'entrée à partir de l'identifiant d'appui des jeux ('p1' pointeur, 'kKeyA' clavier, 'midi60' / 'm36' MIDI). */
export function inputKind(src = '') {
  if (src.startsWith('m')) return 'midi';
  if (src.startsWith('k')) return 'key';
  return 'touch';
}

const median = (a) => { const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

/**
 * Analyse des frappes. taps / beats en secondes sur la même horloge (la sortie audio déjà corrigée).
 * On ignore les 2 premières frappes (mise en route) et les frappes à plus de 250 ms d'un clic.
 * @returns {{ok:boolean, offset:number, spread:number, n:number, quality:string, reason?:string}} offset en ms (+ = en retard)
 */
export function analyzeTaps(taps, beats) {
  const offs = [];
  const used = new Set();
  for (const t of taps) {
    let best = null;
    beats.forEach((b, i) => { const d = (t - b) * 1000; if (!used.has(i) && Math.abs(d) <= 250 && (best == null || Math.abs(d) < Math.abs(best.d))) best = { d, i }; });
    if (best) { used.add(best.i); offs.push(best.d); }
  }
  const kept0 = offs.slice(2);
  if (kept0.length < 6) return { ok: false, offset: 0, spread: 0, n: kept0.length, quality: 'insuffisant', reason: 'Pas assez de frappes près des clics : recommence en tapant sur chaque clic.' };
  // Retire les frappes aberrantes (plus de 3 écarts médians de la médiane)
  const m0 = median(kept0);
  const mad0 = median(kept0.map((x) => Math.abs(x - m0))) || 1;
  const kept = kept0.filter((x) => Math.abs(x - m0) <= Math.max(25, 3 * mad0));
  const offset = Math.round(median(kept));
  const spread = Math.round(median(kept.map((x) => Math.abs(x - offset))));
  const quality = spread <= 15 ? 'très régulier' : spread <= 35 ? 'régulier' : 'irrégulier';
  if (spread > 60) return { ok: false, offset, spread, n: kept.length, quality, reason: 'Frappes trop irrégulières pour mesurer : concentre-toi sur le clic et recommence.' };
  return { ok: true, offset: Math.max(-200, Math.min(300, offset)), spread, n: kept.length, quality };
}

/** Correction (secondes) à retirer de l'instant d'appui pour une source donnée. */
export function inputLatency(settings, src) {
  const v = settings?.latency?.[inputKind(src)];
  return typeof v === 'number' ? v / 1000 : 0;
}
