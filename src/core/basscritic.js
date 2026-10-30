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
  // `global` : remarque sur toute la ligne (pas sur une note précise) ; `note` : détail propre à la mesure (fondamentale)
  const hit = (s, type, msg, cost, extra = {}) => { issues.push({ s, type, msg, ...extra }); points -= cost; };
  const pcName = (pc) => midiToName(36 + pc).replace(/-?\d+$/, '');

  if (!notes.length) return { score: 0, issues: [{ s: 0, type: 'empty', msg: 'Aucune note : pose au moins une fondamentale par mesure.', global: true }], goods, stats: {} };

  // 1. Premier temps de chaque mesure : la fondamentale (ou au moins une note de l'accord).
  // Idiome house / techno : le kick prend le 1 et la basse répond juste après (contretemps, rolling bass) → pas un défaut.
  const kickOn1 = !!kick[0];
  const rootBars = [], answerBars = [];
  for (let bar = 0; bar < 4; bar++) {
    const c = chordAt(bar * 16), b0 = bar * 16;
    let first = notes.find((n) => n.s <= b0 && n.s + n.len > b0);
    if (!first && kickOn1) {
      first = notes.find((n) => n.s > b0 && n.s < b0 + 4);
      if (first) answerBars.push(bar);
    }
    if (!first) { hit(b0, 'downbeat', 'Rien sur le 1er temps → pose la fondamentale : la basse ancre l’accord.', 6, { note: pcName(c.rootPc) }); continue; }
    if (mod(first.n, 12) === c.rootPc) rootBars.push(bar);
    else if (!c.pcs.includes(mod(first.n, 12))) hit(first.s, 'downbeat', 'Note du 1er temps hors de l’accord → ça « frotte ». Vise la fondamentale.', 10, { note: pcName(c.rootPc) });
    else hit(first.s, 'inversion', 'Tierce ou quinte au 1er temps (renversement) : possible, mais l’accord sonne moins stable.', 3);
  }
  if (rootBars.length) goods.push(`Fondamentale en début de mesure (${barsLabel(rootBars)}) ✓`);
  if (answerBars.length >= 2) goods.push('Le kick garde le 1, la basse lui répond juste après : le groove house / techno ✓');

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
    hit(notes[0].s, 'kick', 'Presque toutes tes notes tombent sur le kick : kick et basse se masquent. Décale quelques notes sur les contretemps (ou sidechain).', 6, { global: true });
  } else if (stats.onKickRatio < 0.75 && notes.length >= 4) goods.push('La basse laisse respirer le kick ✓');
  if (longOverKick > notes.length * 0.6 && notes.length >= 3) hit(notes[0].s, 'sustain', 'Notes longues qui chevauchent plusieurs kicks : pense au sidechain, ou raccourcis-les.', 4, { global: true });

  // 5. Rythme et mouvement
  const sync = notes.filter((n) => n.s % 4 !== 0).length / notes.length;
  stats.syncopation = sync;
  if (sync === 0 && notes.length >= 4) hit(notes[0].s, 'rhythm', 'Toutes les notes sont sur les temps : essaie une anticipation (une note juste avant le 1) pour le groove.', 4, { global: true });
  else if (sync > 0.2) goods.push('Syncopes présentes : la basse groove ✓');
  const approach = notes.filter((n, i) => {
    const next = notes[i + 1];
    return next && next.s % 16 === 0 && n.s % 16 !== 0 && Math.abs(next.n - n.n) <= 2 && mod(next.n, 12) === chordAt(next.s).rootPc;
  }).length;
  if (approach) goods.push(`${approach} note${approach > 1 ? 's' : ''} d’approche vers la fondamentale suivante ✓ (technique de bassiste)`);
  // Une ligne dense qui évite le kick (rolling bass) est un choix de style ; dense ET sur le kick, elle encombre
  if (notes.length > 40 && stats.onKickRatio > 0.1) hit(notes[0].s, 'density', 'Ligne très chargée : en électro, la basse gagne souvent à jouer moins.', 4, { global: true });

  return { score: Math.max(0, Math.min(100, points)), issues, goods, stats };
}

/** Mesures (0-3) → « M1–M4 », « M1, M3 », « M2–M4 ». */
export function barsLabel(bars) {
  const b = [...new Set(bars)].sort((x, y) => x - y);
  const out = [];
  for (let i = 0; i < b.length;) {
    let j = i;
    while (j + 1 < b.length && b[j + 1] === b[j] + 1) j++;
    out.push(j - i >= 2 ? `M${b[i] + 1}–M${b[j] + 1}` : b.slice(i, j + 1).map((x) => `M${x + 1}`).join(', '));
    i = j + 1;
  }
  return out.join(', ');
}

/** Regroupe les remarques identiques : une ligne par problème, avec les mesures concernées. */
export function groupIssues(issues) {
  const groups = [];
  for (const i of issues) {
    let g = groups.find((x) => x.type === i.type && x.msg === i.msg);
    if (!g) groups.push((g = { type: i.type, msg: i.msg, global: !!i.global, s: i.s, bars: [], notes: [] }));
    const bar = Math.floor(i.s / 16);
    if (!g.bars.includes(bar)) g.bars.push(bar);
    if (i.note && !g.notes.includes(i.note)) g.notes.push(i.note);
  }
  return groups.map((g) => ({ ...g, label: g.global ? '' : barsLabel(g.bars) }));
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

