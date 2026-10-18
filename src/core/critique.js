// Critique de prod : mesures d'un morceau (niveau, dynamique, équilibre spectral, stéréo, contraste, densité)
// et comparaison avec une référence (ou des valeurs typiques) → conseils concrets pour Ableton Live.
import { fft } from './audioanalysis.js';

export const BANDS = [
  { id: 'sub', name: 'Sub (20-60 Hz)', lo: 20, hi: 60 },
  { id: 'bass', name: 'Basses (60-250 Hz)', lo: 60, hi: 250 },
  { id: 'lowmid', name: 'Bas-médiums (250-500 Hz)', lo: 250, hi: 500 },
  { id: 'mid', name: 'Médiums (0,5-2 kHz)', lo: 500, hi: 2000 },
  { id: 'high', name: 'Haut-médiums (2-6 kHz)', lo: 2000, hi: 6000 },
  { id: 'air', name: 'Aigus / air (6-16 kHz)', lo: 6000, hi: 16000 },
];

const db = (x) => 10 * Math.log10(Math.max(1e-12, x));

/** left/right : Float32Array, sr : fréquence d'échantillonnage. */
export function analyzeTrack(left, right = left, sr = 44100) {
  const n = left.length;
  // --- niveau (approche LUFS : blocs de 400 ms, filtre passe-haut doux, silence ignoré) ---
  const block = Math.floor(sr * 0.4);
  const a = Math.exp(-2 * Math.PI * 80 / sr);
  let hpL = 0, prevL = 0, hpR = 0, prevR = 0;
  const blocks = [];
  let peak = 0, sumL2 = 0, sumR2 = 0, sumLR = 0, sumM2 = 0, sumS2 = 0;
  let acc = 0, cnt = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i], r = right[i];
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    sumL2 += l * l; sumR2 += r * r; sumLR += l * r;
    const m = (l + r) / 2, s = (l - r) / 2;
    sumM2 += m * m; sumS2 += s * s;
    hpL = a * (hpL + l - prevL); prevL = l;
    hpR = a * (hpR + r - prevR); prevR = r;
    acc += hpL * hpL + hpR * hpR; cnt++;
    if (cnt === block) { blocks.push(acc / (2 * cnt)); acc = 0; cnt = 0; }
  }
  const gated = blocks.filter((b) => db(b) > -60);
  const loudness = gated.length ? db(gated.reduce((x, y) => x + y, 0) / gated.length) - 0.7 : -70;
  const rms = db((sumL2 + sumR2) / (2 * n));
  const peakDb = 20 * Math.log10(Math.max(1e-9, peak));
  // --- contraste de l'arrangement : niveau par tranches de 8 s ---
  const per = Math.max(1, Math.round(8 / 0.4));
  const segs = [];
  for (let i = 0; i + per <= blocks.length; i += per) segs.push(db(blocks.slice(i, i + per).reduce((x, y) => x + y, 0) / per));
  const loudSegs = segs.filter((x) => x > -50);
  const contrast = loudSegs.length > 1 ? Math.max(...loudSegs) - Math.min(...loudSegs) : 0;
  // --- spectre moyen (fenêtres réparties sur 10-90 % du morceau) ---
  const size = 4096, frames = 40;
  const bandE = Object.fromEntries(BANDS.map((b) => [b.id, 0]));
  const hann = new Float32Array(size).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)));
  let total = 0;
  for (let f = 0; f < frames; f++) {
    const start = Math.floor(n * (0.1 + 0.8 * (f / frames)));
    if (start + size > n) break;
    const re = new Float64Array(size), im = new Float64Array(size);
    for (let i = 0; i < size; i++) re[i] = ((left[start + i] + right[start + i]) / 2) * hann[i];
    fft(re, im);
    for (let k = 1; k < size / 2; k++) {
      const hz = (k * sr) / size, e = re[k] * re[k] + im[k] * im[k];
      const b = BANDS.find((x) => hz >= x.lo && hz < x.hi);
      if (b) { bandE[b.id] += e; total += e; }
    }
  }
  const bands = Object.fromEntries(BANDS.map((b) => [b.id, db(bandE[b.id] / Math.max(1e-12, total))]));
  // --- densité : attaques par seconde (hausse brusque d'énergie sur des fenêtres de 23 ms) ---
  const hop = 1024;
  let prevE = 0, onsets = 0, cool = 0;
  const env = [];
  for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = i; j < i + hop; j++) e += left[j] * left[j]; env.push(e / hop); }
  const meanE = env.reduce((x, y) => x + y, 0) / Math.max(1, env.length);
  for (const e of env) {
    if (cool > 0) cool--;
    else if (e > prevE * 1.8 && e > meanE * 0.3) { onsets++; cool = 3; }
    prevE = e;
  }
  return {
    duration: n / sr, loudness: round1(loudness), rms: round1(rms), peak: round1(peakDb), crest: round1(peakDb - rms),
    width: round1(db(sumS2 / Math.max(1e-12, sumM2))), correlation: Math.round((sumLR / Math.sqrt(Math.max(1e-12, sumL2 * sumR2))) * 100) / 100,
    contrast: round1(contrast), density: Math.round((onsets / (n / sr)) * 10) / 10,
    bands: Object.fromEntries(Object.entries(bands).map(([k, v]) => [k, round1(v)])),
  };
}
const round1 = (x) => Math.round(x * 10) / 10;

/** Valeurs typiques approximatives (morceaux masterisés, sur l'échelle de mesure ci-dessus), quand on n'importe pas de référence. */
export const TARGETS = {
  club: { name: 'Club (house, techno, DnB)', loudness: -10, crest: 8, width: -9, contrast: 7, density: 3.5, bands: { sub: -9, bass: -4, lowmid: -10, mid: -12, high: -16, air: -21 } },
  urban: { name: 'Hip-hop, trap, lo-fi', loudness: -10.5, crest: 8.5, width: -11, contrast: 5, density: 3, bands: { sub: -6, bass: -4, lowmid: -10, mid: -13, high: -17, air: -22 } },
  chill: { name: 'Pop, électro chill, ambient', loudness: -13, crest: 10, width: -7, contrast: 6, density: 2.5, bands: { sub: -11, bass: -5, lowmid: -9, mid: -11, high: -15, air: -20 } },
};

const BAND_TIPS = {
  sub: ['Trop de sub (sous 60 Hz) : ça peut saturer les enceintes et masquer le kick.', 'EQ Eight sur la basse : plateau bas -2 à -4 dB sous 60 Hz, ou baisse le sub dans Serum. Vérifie au casque.',
    'Il manque du sub : le morceau manque d’assise en club.', 'Ajoute une octave grave à la basse (osc Sub dans Serum) ou un Saturator léger pour qu’elle se lise, kick + basse en sidechain.'],
  bass: ['Trop de basses (60-250 Hz) : le mix est lourd, un peu sourd.', 'Coupe le bas des pistes qui n’en ont pas besoin (EQ Eight passe-haut à 100-150 Hz sur accords, nappes, voix).',
    'Pas assez de basses (60-250 Hz) : le morceau manque de corps.', 'Monte la basse de 2-3 dB ou ajoute un peu de 100 Hz au kick ; vérifie que le sidechain ne la vide pas.'],
  lowmid: ['Bas-médiums chargés (250-500 Hz) : effet « bouillie » ou carton.', 'Creuse 2-3 dB vers 300 Hz (Q moyen) sur les nappes, accords et guitares avec EQ Eight ; garde-les sur un seul élément.',
    'Bas-médiums creux : le mix sonne un peu maigre.', 'Rajoute de la chaleur vers 300 Hz sur les accords ou la voix, ou une saturation douce (Saturator « Warm »).'],
  mid: ['Médiums trop présents (0,5-2 kHz) : son nasillard, fatigant.', 'Creuse légèrement vers 1 kHz sur les éléments dominants ; baisse le lead d’1-2 dB.',
    'Médiums en retrait : les mélodies et les voix manquent de présence.', 'Monte le lead ou les accords d’1-2 dB, ou un léger boost vers 1-2 kHz.'],
  high: ['Haut-médiums agressifs (2-6 kHz) : ça pique à fort volume.', 'Repère l’élément qui siffle (hats, lead saturé) et creuse 2 dB vers 3-4 kHz ; un De-esser sur les voix.',
    'Haut-médiums en retrait : le mix manque de définition.', 'Monte un peu les hats et l’attaque des sons (EQ vers 3 kHz) ou ajoute un transient sur le kick.'],
  air: ['Trop d’aigus (6-16 kHz) : son brillant mais dur, hats trop forts.', 'Baisse les hats/cymbales de 2 dB ou adoucis le haut avec un plateau -2 dB à 10 kHz.',
    'Il manque d’air (6-16 kHz) : le mix sonne terne.', 'Plateau +1,5 à +3 dB à 10 kHz sur le master (EQ Eight) ou des hats/shakers un peu plus présents.'],
};

/**
 * Compare mes mesures à une référence (mesures d'un autre morceau, ou TARGETS.x).
 * Renvoie tous les écarts notés, triés du plus important au moins important.
 */
export function compareTracks(mine, ref) {
  const tips = [];
  const add = (score, title, detail, how) => tips.push({ score: Math.round(score * 10) / 10, title, detail, how });
  const dl = mine.loudness - ref.loudness;
  if (Math.abs(dl) > 1.5) {
    if (dl < 0) add(-dl, `Moins fort que la référence (${dl.toFixed(1)} dB)`, 'En playlist ou en club, ton morceau paraîtra moins impactant.', 'Master : Glue Compressor (ratio 2, attaque 10 ms, 1-2 dB de réduction) puis Limiter (plafond -0,3 dB) ; monte le gain du Limiter progressivement.');
    else add(dl * 0.8, `Plus fort que la référence (+${dl.toFixed(1)} dB)`, 'Un master trop poussé écrase les attaques et fatigue l’oreille.', 'Baisse le gain du Limiter de 1-2 dB et compare au même volume (Utility).');
  }
  const dc = mine.crest - ref.crest;
  if (dc > 3) add(dc * 0.7, 'Dynamique très large (pics très au-dessus du reste)', 'Les attaques dépassent beaucoup : le niveau moyen reste bas.', 'Compresse kick et snare (Compressor, attaque 5-10 ms) ou un Drum Buss ; un peu de Glue sur le groupe batterie.');
  else if (dc < -3) add(-dc * 0.8, 'Mix écrasé (peu de dynamique)', 'Les transitoires sont aplaties : le groove perd de son punch.', 'Moins de limiteur, compression parallèle (piste en retour avec Compressor fort, mélangée à 30 %).');
  for (const b of BANDS) {
    const d = mine.bands[b.id] - ref.bands[b.id];
    if (Math.abs(d) < 3) continue;
    const [tooMuch, fixMuch, tooLittle, fixLittle] = BAND_TIPS[b.id];
    if (d > 0) add(d, `${b.name} : +${d.toFixed(1)} dB`, tooMuch, fixMuch);
    else add(-d, `${b.name} : ${d.toFixed(1)} dB`, tooLittle, fixLittle);
  }
  const dw = mine.width - ref.width;
  if (dw < -4) add(-dw * 0.6, 'Mix étroit', 'Le morceau sonne « au centre », moins immersif que la référence.', 'Utility (Width 120-140 %) sur nappes et chœurs, panoramique opposé hats / percussions, réverbe stéréo. Garde kick et basse au centre.');
  else if (dw > 4) add(dw * 0.6, 'Mix très large', 'Attention à la compatibilité mono (téléphone, sono de club).', 'Écoute avec Utility en « Mono » sur le master : si des éléments disparaissent, réduis leur Width.');
  if (mine.correlation < 0.2) add(6, 'Problème de phase possible', 'Gauche et droite s’annulent en partie : en mono, des sons disparaissent.', 'Vérifie les chorus / wideners extrêmes et les doublons inversés ; Utility « Mono » sous 120 Hz.');
  const dct = mine.contrast - ref.contrast;
  if (dct < -3) add(-dct * 0.8, 'Arrangement plat', 'L’énergie varie peu du début à la fin : l’oreille décroche.', 'Crée des contrastes : break sans kick ni basse (8 mesures), filtre passe-bas qui s’ouvre, retire des couches avant le drop (Lab Arrangement).');
  const dd = mine.density - ref.density;
  if (Math.abs(dd) > Math.max(1.2, ref.density * 0.45)) {
    if (dd > 0) add(dd * 1.2, 'Très chargé rythmiquement', 'Beaucoup d’attaques : le groove peut devenir confus.', 'Enlève une couche de percussion ou remplace des notes par des silences (Labo de basse, Lab Beat).');
    else add(-dd * 1.2, 'Peu d’attaques', 'Le morceau peut manquer d’énergie rythmique.', 'Ajoute des hats en doubles croches, une percussion à contretemps ou des ghost notes (Pad Rush).');
  }
  return tips.sort((x, y) => y.score - x.score);
}
