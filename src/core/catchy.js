// « Catchy-mètre » : analyse heuristique d'une mélodie et conseils concrets. Module pur.
// Les critères viennent des principes classiques d'écriture de hooks :
// répétition + variation, ambitus chantable, notes d'accord sur les temps forts,
// mouvement conjoint, syncopes dosées, respiration, résolution.
import { mod } from './theory.js';

/**
 * @param {({n:number,len?:number}|null)[]} melody pas de double-croche
 * @param {{pcs:number[]}[]} chords un accord par mesure (16 pas)
 * @param {number} tonicPc
 */
export function analyzeMelody(melody, chords = [], tonicPc = 0) {
  const steps = melody.length;
  const notes = melody.map((m, i) => (m ? { ...m, i } : null)).filter(Boolean);
  const res = { score: 0, criteria: [], tips: [] };
  if (notes.length < 3) {
    res.tips.push('Pose au moins 3-4 notes pour démarrer. Astuce : commence par le RYTHME sur une seule note.');
    return res;
  }

  const crit = (id, label, value, ideal, weight, tip) => {
    res.criteria.push({ id, label, value, ok: value >= ideal, weight });
    if (value < ideal && tip) res.tips.push(tip);
    return value * weight;
  };

  // 1. Répétition de motif : similarité rythmique entre segments de 8 pas
  const seg = 8;
  const rhythms = [];
  for (let s = 0; s < steps; s += seg) rhythms.push(melody.slice(s, s + seg).map((m) => (m ? 1 : 0)));
  let best = 0;
  for (let a = 0; a < rhythms.length; a++) {
    for (let b = a + 1; b < rhythms.length; b++) {
      const ra = rhythms[a], rb = rhythms[b];
      const hits = ra.filter(Boolean).length + rb.filter(Boolean).length;
      if (hits < 2) continue;
      const same = ra.reduce((s, v, i) => s + (v && rb[i] ? 2 : 0), 0);
      best = Math.max(best, same / hits);
    }
  }
  let total = 0;
  total += crit('repeat', 'Motif répété', best, 0.6, 25,
    'Répète ton motif rythmique (même rythme, hauteurs qui peuvent changer). Structure AABA ou « question / réponse ».');

  // 2. Ambitus chantable
  const pitches = notes.map((n) => n.n);
  const range = Math.max(...pitches) - Math.min(...pitches);
  const rangeScore = range <= 12 ? 1 : Math.max(0, 1 - (range - 12) / 12);
  total += crit('range', 'Ambitus chantable (≤ 1 octave)', rangeScore, 0.9, 10,
    `Ton ambitus fait ${range} demi-tons : resserre-le sous l’octave pour qu’on puisse le fredonner.`);

  // 3. Notes d'accord sur les temps forts
  let strong = 0, strongOk = 0;
  for (const n of notes) {
    if (n.i % 4 !== 0) continue;
    const chord = chords[Math.floor(n.i / 16) % Math.max(1, chords.length)];
    if (!chord) continue;
    strong++;
    if (chord.pcs.includes(mod(n.n, 12))) strongOk++;
  }
  const ctRatio = strong ? strongOk / strong : 0.5;
  total += crit('chordTones', 'Notes d’accord sur les temps', ctRatio, 0.6, 20,
    'Sur les temps forts, vise une note de l’accord (fondamentale, tierce, quinte). Les notes étrangères vont plutôt entre les temps.');

  // 4. Mouvement conjoint
  let stepwise = 0;
  for (let k = 1; k < notes.length; k++) if (Math.abs(notes[k].n - notes[k - 1].n) <= 2) stepwise++;
  const sw = stepwise / (notes.length - 1);
  const swScore = sw >= 0.4 && sw <= 0.85 ? 1 : sw < 0.4 ? sw / 0.4 : Math.max(0.4, 1 - (sw - 0.85) * 3);
  total += crit('stepwise', 'Équilibre conjoint / sauts', swScore, 0.8, 15,
    sw < 0.4 ? 'Trop de sauts : relie tes notes par des pas (degrés voisins) et garde UN grand saut comme moment fort.'
      : 'Mélodie très linéaire : ajoute un saut (quinte, octave) à un endroit clé pour créer la surprise.');

  // 5. Syncope dosée
  const off = notes.filter((n) => n.i % 2 === 1 || (n.i % 4 === 2)).length / notes.length;
  const syncScore = off >= 0.15 && off <= 0.6 ? 1 : off < 0.15 ? off / 0.15 : Math.max(0.3, 1 - (off - 0.6) * 2);
  total += crit('sync', 'Syncopes dosées', syncScore, 0.8, 10,
    off < 0.15 ? 'Tout tombe sur les temps : décale 1 ou 2 notes d’une double-croche en avance (anticipation) pour le groove.'
      : 'Beaucoup de contretemps : ancre quelques notes sur le temps pour que l’oreille se repère.');

  // 6. Respiration
  let maxRest = 0, cur = 0;
  for (let i = 0; i < steps; i++) {
    if (melody[i]) { cur = 0; } else { cur++; maxRest = Math.max(maxRest, cur); }
  }
  const density = notes.length / steps;
  const breathe = maxRest >= 3 && density <= 0.6 ? 1 : 0.4;
  total += crit('space', 'Respiration (silences)', breathe, 0.9, 10,
    'Laisse des silences : un hook respire. Un trou d’au moins un temps laisse place à la réponse.');

  // 7. Résolution finale
  const lastN = notes[notes.length - 1];
  const lastChord = chords[Math.floor(lastN.i / 16) % Math.max(1, chords.length)];
  const resolves = mod(lastN.n, 12) === mod(tonicPc, 12) ? 1 : lastChord && lastChord.pcs.includes(mod(lastN.n, 12)) ? 0.8 : 0.3;
  total += crit('resolve', 'Fin qui se pose', resolves, 0.8, 10,
    'Termine sur la tonique ou une note de l’accord. Ou fais-le exprès : finir « en suspens » appelle la répétition.');

  res.score = Math.round(total);
  res.range = range;
  res.density = density;
  return res;
}

export function catchyLabel(score) {
  if (score >= 85) return { label: 'Ver d’oreille 🐛', color: '#4ade80' };
  if (score >= 70) return { label: 'Ça accroche !', color: '#a3e635' };
  if (score >= 50) return { label: 'Prometteur', color: '#facc15' };
  if (score >= 30) return { label: 'Esquisse', color: '#fb923c' };
  return { label: 'À creuser', color: '#f87171' };
}
