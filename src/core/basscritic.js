// Labo de basse : critique d'une ligne de basse (comme un prof) et 3 variantes argumentées. Module pur.
import { SCALES, mod, scaleNotes, midiToName } from './theory.js';

export const BASS_LOW = 28; // E1 (convention Ableton C3 = 60)
export const BASS_HIGH = 55; // G3

/** Basse à partir des notes : tableau de 64 pas (null | {n,len}) → liste de notes. */
export function lineToNotes(line) {
  const out = [];
  line.forEach((x, s) => { if (x) out.push({ s, n: x.n, len: x.len || 1 }); });
  return out;
}

export function notesToLine(notes, steps = 64) {
  const line = new Array(steps).fill(null);
  notes.forEach((x) => { if (x.s < steps) line[x.s] = { n: x.n, len: x.len }; });
  return line;
}

/**
 * @param {{s,n,len}[]} notes
 * @param {{pcs:number[], rootPc:number}[]} chords un accord par mesure (4)
 * @param {number[]} kick rangée kick (16 pas, répétée)
 */
export function critiqueBass(notes, chords, kick, rootPc, scale) {
  const issues = [];
  const goods = [];
  const steps = SCALES[scale]?.steps || [];
  const chordAt = (s) => chords[Math.floor(s / 16) % 4] || { pcs: [], rootPc };
  let points = 100;
  const hit = (s, type, msg, cost) => { issues.push({ s, type, msg }); points -= cost; };

  if (!notes.length) return { score: 0, issues: [{ s: 0, type: 'empty', msg: 'Aucune note : pose au moins une fondamentale par mesure.' }], goods, stats: {} };

  // 1. Premier temps de chaque mesure : la fondamentale (ou au moins une note de l'accord)
  for (let bar = 0; bar < 4; bar++) {
    const c = chordAt(bar * 16);
    const first = notes.find((n) => n.s <= bar * 16 && n.s + n.len > bar * 16) || notes.find((n) => n.s === bar * 16);
    if (!first) { hit(bar * 16, 'downbeat', `Mesure ${bar + 1} : rien sur le premier temps. La basse ancre l’accord : pose la fondamentale (${midiToName(36 + c.rootPc).replace(/-?\d+$/, '')}).`, 6); continue; }
    if (mod(first.n, 12) === c.rootPc) goods.push(`Mesure ${bar + 1} : fondamentale sur le 1 ✓`);
    else if (!c.pcs.includes(mod(first.n, 12))) hit(first.s, 'downbeat', `Mesure ${bar + 1} : la note du premier temps n’est pas dans l’accord → ça « frotte ». Vise la fondamentale.`, 10);
    else hit(first.s, 'inversion', `Mesure ${bar + 1} : tierce/quinte au premier temps (renversement). Possible, mais l’accord sonne moins stable.`, 3);
  }

  // 2. Hors gamme et frottements sur les temps
  for (const n of notes) {
    const c = chordAt(n.s);
    const pc = mod(n.n, 12);
    if (steps.length && !steps.includes(mod(n.n - rootPc, 12))) hit(n.s, 'scale', `${midiToName(n.n)} est hors gamme.`, 8);
    else if (n.s % 4 === 0 && !c.pcs.includes(pc)) {
      const clash = c.pcs.some((p) => [1, 6, 11].includes(mod(pc - p, 12)));
      if (clash) hit(n.s, 'clash', `${midiToName(n.n)} sur un temps fort frotte (demi-ton / triton) avec l’accord.`, 7);
    }
  }

  // 3. Sauts et tessiture
  for (let i = 1; i < notes.length; i++) {
    const leap = Math.abs(notes[i].n - notes[i - 1].n);
    if (leap > 12) hit(notes[i].s, 'leap', `Saut de ${leap} demi-tons : trop large pour une basse, rapproche-toi (octave max).`, 6);
  }
  const low = notes.filter((n) => n.n < BASS_LOW).length, high = notes.filter((n) => n.n > BASS_HIGH).length;
  if (low) hit(notes.find((n) => n.n < BASS_LOW).s, 'range', 'Notes trop graves (sous E1) : inaudibles sur la plupart des systèmes, et ça sature.', 5);
  if (high) hit(notes.find((n) => n.n > BASS_HIGH).s, 'range', 'Notes trop aiguës (au-dessus de G3) : la basse empiète sur les accords et perd son poids.', 5);

  // 4. Espace pour le kick
  const kickSteps = new Set();
  for (let s = 0; s < 64; s++) if (kick[s % 16]) kickSteps.add(s);
  const onKick = notes.filter((n) => kickSteps.has(n.s)).length;
  const longOverKick = notes.filter((n) => [...Array(n.len).keys()].some((k) => k > 0 && kickSteps.has(n.s + k))).length;
  const stats = { onKickRatio: notes.length ? onKick / notes.length : 0, longOverKick };
  if (kickSteps.size && notes.length >= 6 && stats.onKickRatio > 0.75) {
    hit(notes[0].s, 'kick', 'Presque toutes tes notes tombent sur le kick : kick et basse se masquent. Décale quelques notes sur les contretemps (ou sidechain).', 6);
  } else if (stats.onKickRatio < 0.75 && notes.length >= 4) goods.push('La basse laisse respirer le kick ✓');
  if (longOverKick > notes.length * 0.6 && notes.length >= 3) hit(notes[0].s, 'sustain', 'Notes longues qui chevauchent plusieurs kicks : pense au sidechain, ou raccourcis-les.', 4);

  // 5. Rythme et mouvement
  const sync = notes.filter((n) => n.s % 4 !== 0).length / notes.length;
  stats.syncopation = sync;
  if (sync === 0 && notes.length >= 4) hit(notes[0].s, 'rhythm', 'Toutes les notes sont sur les temps : essaie une anticipation (une note juste avant le 1) pour le groove.', 4);
  else if (sync > 0.2) goods.push('Syncopes présentes : la basse groove ✓');
  const approach = notes.filter((n, i) => {
    const next = notes[i + 1];
    return next && next.s % 16 === 0 && n.s % 16 !== 0 && Math.abs(next.n - n.n) <= 2 && mod(next.n, 12) === chordAt(next.s).rootPc;
  }).length;
  if (approach) goods.push(`${approach} note(s) d’approche vers la fondamentale suivante ✓ (technique de bassiste)`);
  if (notes.length > 40) hit(notes[0].s, 'density', 'Ligne très chargée : en électro, la basse gagne souvent à jouer moins.', 4);

  return { score: Math.max(0, Math.min(100, points)), issues, goods, stats };
}

/** Note de basse confortable (E1–D#2 env.) pour une classe de hauteur. */
export function bassNote(pc) {
  let n = 36 + mod(pc - 36, 12);
  if (n > 47) n -= 12;
  return n;
}

/** 3 variantes pédagogiques de la ligne : groovy, mélodique, minimale. */
export function bassVariants(chords, kick, rootPc, scale) {
  const sc = scaleNotes(rootPc, scale, BASS_LOW, BASS_HIGH);
  const kickSteps = (s) => !!kick[s % 16];
  const out = [];

  // Groovy : contretemps + octaves + anticipation, en évitant les kicks
  const groovy = [];
  chords.forEach((c, bar) => {
    const r = bassNote(c.rootPc), b0 = bar * 16;
    groovy.push({ s: b0, n: r, len: 2 });
    for (const [s, iv, len] of [[3, 12, 1], [6, 0, 2], [10, 12, 1], [11, 0, 1], [14, 7, 2]]) {
      if (!kickSteps(s)) groovy.push({ s: b0 + s, n: r + iv, len });
    }
  });
  out.push({ id: 'groovy', name: 'Groovy', emoji: '🕺', notes: groovy, why: 'Notes sur les contretemps (là où le kick ne frappe pas) + sauts d’octave : la basse « répond » au kick au lieu de le doubler. Typique house, disco, funk.' });

  // Mélodique : fondamentale puis notes de passage qui marchent vers l'accord suivant
  const melodic = [];
  chords.forEach((c, bar) => {
    const r = bassNote(c.rootPc), b0 = bar * 16;
    const next = bassNote(chords[(bar + 1) % 4].rootPc);
    const third = sc.find((x) => x > r && c.pcs.includes(mod(x, 12)) && mod(x, 12) !== c.rootPc) ?? r + 7;
    melodic.push({ s: b0, n: r, len: 4 }, { s: b0 + 4, n: third, len: 4 }, { s: b0 + 8, n: r + 7 <= BASS_HIGH ? r + 7 : r, len: 4 });
    // note d'approche : un degré au-dessus ou en dessous de la fondamentale suivante
    const approach = sc.filter((x) => Math.abs(x - next) <= 2 && x !== next).sort((a, b) => Math.abs(a - r - 7) - Math.abs(b - r - 7))[0] ?? next - 1;
    melodic.push({ s: b0 + 12, n: r + 7 <= BASS_HIGH ? r + 7 : r, len: 2 }, { s: b0 + 14, n: approach, len: 2 });
  });
  out.push({ id: 'melodic', name: 'Mélodique', emoji: '🎼', notes: melodic, why: 'Fondamentale, tierce, quinte puis une note d’approche qui « marche » vers l’accord suivant : la basse raconte la progression. Typique lo-fi, deep house, pop.' });

  // Minimale : une note longue + un rappel
  const minimal = [];
  chords.forEach((c, bar) => {
    const r = bassNote(c.rootPc), b0 = bar * 16;
    minimal.push({ s: b0, n: r, len: 6 });
    const off = [10, 11, 9].find((s) => !kickSteps(s)) ?? 10;
    minimal.push({ s: b0 + off, n: r, len: 3 });
  });
  out.push({ id: 'minimal', name: 'Minimale', emoji: '🧊', notes: minimal, why: 'Deux notes par mesure : beaucoup d’espace, le sub respire et le kick claque. Typique techno, deep, trap (avec un 808).' });
  return out;
}

