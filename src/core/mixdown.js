// Mixdown express : une boucle volontairement mal mixée à corriger. Scénarios, score, règles. Module pur.

export const CHANNELS = [
  { id: 'kick', name: 'Kick', emoji: '🥁' },
  { id: 'drums', name: 'Drums (hats, snare…)', emoji: '🎚️' },
  { id: 'bass', name: 'Basse', emoji: '🎸' },
  { id: 'chords', name: 'Accords / pad', emoji: '🎼' },
  { id: 'lead', name: 'Lead', emoji: '🎵' },
];

/** Réglages de référence (mix « propre ») par piste. vol en dB, hpf en Hz, pan -1..1, verb 0..1. */
export function referenceMix(genre = 'house') {
  const pump = ['house', 'trance', 'disco', 'deephouse', 'ukg', 'techno', 'afrohouse'].includes(genre) ? 0.45 : 0.15;
  return {
    pump,
    ch: {
      kick: { vol: 0, hpf: 20, pan: 0, verb: 0 },
      drums: { vol: -4, hpf: 300, pan: 0, verb: 0.1 },
      bass: { vol: -3, hpf: 30, pan: 0, verb: 0 },
      chords: { vol: -7, hpf: 250, pan: 0, verb: 0.3 },
      lead: { vol: -4, hpf: 200, pan: 0, verb: 0.22 },
    },
  };
}

/** Problèmes injectables : chacun modifie le mix de référence et enseigne une règle. */
export const PROBLEMS = [
  {
    id: 'bassBoom', title: 'Basse qui écrase tout', apply: (m) => { m.ch.bass.vol += 8; },
    check: ['bass.vol'],
    hint: 'Compare kick et basse seuls : qui domine ? Le kick doit rester lisible.',
    rule: 'Le grave est l’endroit le plus encombré : une basse trop forte avale le kick et fait « pomper » le limiteur.',
    ableton: 'Utility (Gain) sur la basse, puis Spectrum : le kick et la basse doivent avoir des pics comparables.',
  },
  {
    id: 'mud', title: 'Accords boueux', apply: (m) => { m.ch.chords.hpf = 20; m.ch.chords.vol += 3; },
    check: ['chords.hpf', 'chords.vol'],
    hint: 'Les accords descendent-ils dans le grave ? Coupe ce qui ne sert à rien.',
    rule: 'Un seul instrument à la fois dans le grave : coupe sous ~200-300 Hz tout ce qui n’est pas kick ou basse.',
    ableton: 'EQ Eight sur le pad : filtre passe-haut (mode 48 dB) vers 250 Hz, en écoutant le mix complet.',
  },
  {
    id: 'kickBuried', title: 'Kick noyé', apply: (m) => { m.ch.kick.vol -= 10; },
    check: ['kick.vol'],
    hint: 'Le temps fort se sent-il ? En électro, le kick est la référence de volume.',
    rule: 'Mixe à partir du kick : règle-le d’abord, puis tout le reste par rapport à lui.',
    ableton: 'Mets le kick à -6 dB sur le master, puis monte les autres pistes une à une.',
  },
  {
    id: 'masking', title: 'Le pad masque le lead', apply: (m) => { m.ch.chords.vol += 6; m.ch.lead.vol -= 6; },
    check: ['chords.vol', 'lead.vol'],
    hint: 'Entends-tu clairement la mélodie ? Le pad doit être un tapis, pas un mur.',
    rule: 'Hiérarchie : l’élément principal (lead, voix) passe devant ; les accords soutiennent derrière.',
    ableton: 'Baisse le pad, ou creuse-le vers 1-3 kHz avec EQ Eight (là où le lead vit).',
  },
  {
    id: 'reverbSoup', title: 'Soupe de réverbe', apply: (m) => { m.ch.chords.verb = 0.95; m.ch.lead.verb = 0.9; m.ch.drums.verb = 0.6; },
    check: ['chords.verb', 'lead.verb', 'drums.verb'],
    hint: 'Les attaques sont-elles nettes ou tout baigne-t-il ?',
    rule: 'La réverbe met en arrière-plan : plus il y en a, plus l’élément recule. Garde le rythme sec.',
    ableton: 'Réverbe en piste de retour (Return), avec un EQ qui coupe le grave de la réverbe.',
  },
  {
    id: 'panning', title: 'Mix tout à gauche', apply: (m) => { m.ch.lead.pan = -0.9; m.ch.chords.pan = -0.8; m.ch.bass.pan = 0.7; },
    check: ['lead.pan', 'chords.pan', 'bass.pan'],
    hint: 'Écoute au casque : où sont les instruments dans l’espace ?',
    rule: 'Kick, basse et lead au centre. Les éléments secondaires peuvent s’écarter, symétriquement.',
    ableton: 'Pan des pistes, et Utility (Width 0 %) sur la basse pour la garder mono.',
  },
  {
    id: 'noPump', title: 'Pas de respiration', apply: (m) => { m.pump = 0; },
    check: ['pump'],
    hint: 'Les accords et la basse « respirent »-ils avec le kick ?',
    rule: 'En musique club, le sidechain laisse la place au kick et crée la pulsation (la « pompe »).',
    ableton: 'Compressor sur la basse/les accords, Sidechain activé avec le kick en source, Ratio 4:1, Release ~100 ms.',
  },
  {
    id: 'hatsHarsh', title: 'Hats qui agressent', apply: (m) => { m.ch.drums.vol += 9; },
    check: ['drums.vol'],
    hint: 'Les aigus fatiguent-ils l’oreille au bout de quelques mesures ?',
    rule: 'Les aigus fatiguent vite : des hats trop forts rendent le morceau agressif sur la durée.',
    ableton: 'Baisse le groupe de hats de quelques dB et vérifie à faible volume d’écoute.',
  },
];

const get = (m, path) => (path === 'pump' ? m.pump : path.split('.').reduce((o, k) => o[k], m.ch));

/** Crée un scénario : 2 à 3 problèmes selon le niveau. */
export function makeScenario(genre, level = 1, rnd = Math.random) {
  const n = level < 4 ? 2 : 3;
  const pool = [...PROBLEMS].sort(() => rnd() - 0.5);
  const chosen = [];
  for (const p of pool) {
    if (chosen.length >= n) break;
    if (p.id === 'noPump' && referenceMix(genre).pump < 0.3) continue;
    // éviter deux problèmes qui touchent le même réglage
    if (chosen.some((c) => c.check.some((k) => p.check.includes(k)))) continue;
    chosen.push(p);
  }
  const ref = referenceMix(genre);
  const broken = JSON.parse(JSON.stringify(ref));
  chosen.forEach((p) => p.apply(broken));
  return { ref, broken, problems: chosen };
}

/** Tolérances : distance acceptable par type de réglage. */
const TOL = { vol: 3, hpf: 0.6, pan: 0.25, verb: 0.2, pump: 0.2 };

/** Score 0-100 sur les réglages concernés par les problèmes (le reste est libre). */
export function scoreMix(mine, ref, problems) {
  const keys = [...new Set(problems.flatMap((p) => p.check))];
  const detail = {};
  let sum = 0;
  for (const k of keys) {
    const type = k === 'pump' ? 'pump' : k.split('.')[1];
    let a = get(mine, k), b = get(ref, k), d;
    if (type === 'hpf') d = Math.abs(Math.log2(Math.max(20, a)) - Math.log2(Math.max(20, b))) / 2;
    else d = Math.abs(a - b);
    const s = Math.max(0, 1 - Math.max(0, d - TOL[type] * 0.5) / (TOL[type] * 1.5));
    detail[k] = s;
    sum += s;
  }
  const perProblem = problems.map((p) => ({ id: p.id, ok: p.check.every((k) => detail[k] >= 0.6) }));
  return { score: Math.round((100 * sum) / Math.max(1, keys.length)), detail, perProblem };
}

export const dbToGain = (db) => Math.pow(10, db / 20);
