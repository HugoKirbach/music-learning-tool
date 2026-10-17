// Banque de sons du synthé intégré + recette pour les recréer dans Serum 2.
// Paramètres : voir src/core/audio.js (playSynth).

const base = {
  osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }],
  sub: 0,
  noise: 0,
  fm: { ratio: 1, index: 0, decay: 0.4, sustain: 0.15 },
  pitchEnv: { amt: 0, decay: 0.05 },
  filter: { type: 'lowpass', cutoff: 3000, q: 1, envAmt: 0, slope: 12 },
  fenv: { a: 0.005, d: 0.3, s: 0.0, r: 0.2 },
  amp: { a: 0.005, d: 0.3, s: 0.7, r: 0.2 },
  lfo: { target: 'none', rate: 4, depth: 0 },
  glide: 0,
  drive: 0,
  width: 0.5,
  reverb: 0.2,
  delay: 0,
  chorus: 0,
  gain: 0.5,
};

export function makePreset(over) {
  return JSON.parse(JSON.stringify({
    ...base,
    ...over,
    fm: { ...base.fm, ...(over.fm || {}) },
    pitchEnv: { ...base.pitchEnv, ...(over.pitchEnv || {}) },
    filter: { ...base.filter, ...(over.filter || {}) },
    fenv: { ...base.fenv, ...(over.fenv || {}) },
    amp: { ...base.amp, ...(over.amp || {}) },
    lfo: { ...base.lfo, ...(over.lfo || {}) },
  }));
}

/** Complète un jeu de paramètres ancien / partiel avec les valeurs par défaut. */
export function withDefaults(p) {
  return makePreset(p || {});
}

export const CATEGORIES = { keys: '🎹 Keys', pads: '☁️ Pads', leads: '🎵 Leads', basses: '🎸 Basses' };

export const PRESETS = {
  // ---------------- KEYS ----------------
  epiano: {
    name: 'E-Piano (Rhodes FM)', role: 'chords', cat: 'keys',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 0.9 }, { wave: 'sine', semi: 12, voices: 1, detune: 3, level: 0.12 }],
      fm: { ratio: 1, index: 1.7, decay: 0.55, sustain: 0.1 },
      filter: { cutoff: 5200, q: 0.5 },
      amp: { a: 0.002, d: 1.8, s: 0.22, r: 0.5 },
      lfo: { target: 'amp', rate: 4.2, depth: 0.18 },
      chorus: 0.45, reverb: 0.25, width: 0.6, gain: 0.22,
    }),
    serum: [
      'Osc A : Sine. Osc B : Sine (même hauteur), niveau 0 : il sert uniquement de modulateur.',
      'Warp de l’Osc A : « FM (from B) », quantité ~35 %. ENV 2 → ce Warp avec Decay 550 ms : l’attaque « tine » du Rhodes.',
      'ENV 1 : Attack 2 ms, Decay 1,8 s, Sustain 20 %. LFO 4 Hz très léger sur le volume = tremolo.',
      'FX : Chorus + Reverb Plate courte. Dans Live : Chorus-Ensemble puis Saturator « Analog Clip » doux.',
    ],
  },
  organ: {
    name: 'Orgue house (M1)', role: 'chords', cat: 'keys',
    params: makePreset({
      osc: [
        { wave: 'sine', semi: 0, voices: 1, detune: 0, level: 0.55 },
        { wave: 'sine', semi: 12, voices: 1, detune: 2, level: 0.45 },
        { wave: 'triangle', semi: 19, voices: 1, detune: 0, level: 0.22 },
      ],
      fm: { ratio: 2, index: 0.8, decay: 0.09, sustain: 0.04 },
      filter: { cutoff: 6500, q: 0.6 },
      amp: { a: 0.002, d: 0.35, s: 0.5, r: 0.12 },
      chorus: 0.2, reverb: 0.22, delay: 0.12, width: 0.4, gain: 0.38,
    }),
    serum: [
      'Osc A : Sine, Osc B : Sine +12, Osc C : Sine +19 (la quinte de l’octave) : les tirettes d’un orgue.',
      'Un petit « click » d’attaque : ENV 2 → Warp FM d’Osc A, Decay 90 ms.',
      'ENV 1 : Decay 350 ms, Sustain 50 %. Joue en stabs courts, voicing serré (7e ou 9e).',
      'Référence : Robin S. « Show Me Love », Crystal Waters. Dans Live : Reverb courte + EQ qui coupe sous 200 Hz.',
    ],
  },
  stab: {
    name: 'Stab house', role: 'chords', cat: 'keys',
    params: makePreset({
      osc: [{ wave: 'square', semi: 0, voices: 1, detune: 0, level: 0.6 }, { wave: 'sawtooth', semi: 12, voices: 2, detune: 8, level: 0.4 }],
      filter: { cutoff: 900, q: 2, envAmt: 2.2, slope: 24 },
      fenv: { a: 0.002, d: 0.18, s: 0, r: 0.1 },
      amp: { a: 0.002, d: 0.22, s: 0.0, r: 0.12 },
      reverb: 0.25, delay: 0.22, width: 0.6, gain: 0.5,
    }),
    serum: [
      'Osc A : Square, Osc B : Saw +12 avec Unison 2.',
      'Filtre : Low 24, Cutoff bas (~900 Hz), Res ~20 %.',
      'ENV 2 → Cutoff, Decay 180 ms, Sustain 0 : c’est l’enveloppe qui fait le « stab ».',
      'ENV 1 : Decay 220 ms, Sustain 0. FX : Reverb courte + Delay 1/8 pointé.',
    ],
  },
  piano: {
    name: 'Keys lo-fi', role: 'chords', cat: 'keys',
    params: makePreset({
      osc: [{ wave: 'triangle', semi: 0, voices: 1, detune: 0, level: 0.7 }, { wave: 'sine', semi: 12, voices: 1, detune: 0, level: 0.25 }],
      filter: { cutoff: 2200, q: 0.5, envAmt: 1 },
      fenv: { a: 0.002, d: 0.6, s: 0.2, r: 0.4 },
      amp: { a: 0.003, d: 1.2, s: 0.15, r: 0.5 },
      lfo: { target: 'pitch', rate: 0.6, depth: 0.08 },
      noise: 0.015, chorus: 0.3, reverb: 0.3, gain: 0.42,
    }),
    serum: [
      'Osc A : Triangle, Osc B : Sine +12 (niveau bas) : timbre « Rhodes » simplifié.',
      'ENV 1 : Decay 1,2 s, Sustain 15 %. Filtre Low 12 vers 2 kHz.',
      'LFO lent → Fine (pitch) très léger = effet bande / wow. Noise osc très bas = souffle.',
      'FX : Distortion « Tube » légère + EQ coupe-aigus + Reverb. Dans Live : Vinyl Distortion ou Roar.',
    ],
  },
  pianoBright: {
    name: 'Piano FM brillant', role: 'chords', cat: 'keys',
    params: makePreset({
      osc: [{ wave: 'triangle', semi: 0, voices: 1, detune: 0, level: 0.8 }, { wave: 'sine', semi: 12, voices: 1, detune: 4, level: 0.2 }],
      fm: { ratio: 1, index: 2.2, decay: 0.3, sustain: 0.05 },
      filter: { cutoff: 7500, q: 0.4 },
      amp: { a: 0.001, d: 2.2, s: 0, r: 0.6 },
      reverb: 0.3, width: 0.5, gain: 0.24,
    }),
    serum: [
      'Osc A : Triangle, Warp « FM (from B) » avec Osc B en Sine même hauteur.',
      'ENV 2 → FM avec Decay 300 ms : attaque brillante, corps doux.',
      'ENV 1 : Decay 2,2 s, Sustain 0 (le son s’éteint comme une corde frappée).',
      'FX : Reverb Hall, EQ +2 dB vers 3 kHz pour la présence.',
    ],
  },

  // ---------------- PADS ----------------
  pad: {
    name: 'Pad large', role: 'chords', cat: 'pads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 5, detune: 18, level: 0.7 }, { wave: 'triangle', semi: 12, voices: 1, detune: 0, level: 0.3 }],
      filter: { cutoff: 1600, q: 0.7, envAmt: 0.5, slope: 24 },
      fenv: { a: 0.6, d: 1.2, s: 0.4, r: 1 },
      amp: { a: 0.35, d: 0.5, s: 0.85, r: 1.1 },
      lfo: { target: 'cutoff', rate: 0.3, depth: 0.25 },
      chorus: 0.4, reverb: 0.45, width: 0.95, gain: 0.26,
    }),
    serum: [
      'Osc A : wavetable « Basic Shapes » sur Saw, Unison 5, Detune ~0.18, Blend 75.',
      'Osc B : Triangle +12, niveau ~30 % pour l’air.',
      'Filtre : MG Low 24, Cutoff ~1,5 kHz, ENV 2 → Cutoff (attaque 600 ms). LFO 1 lent (0,3 Hz) → Cutoff.',
      'FX : Chorus + Hall Reverb (Size 70 %). Macro 1 = Cutoff + Reverb Mix.',
    ],
  },
  stringpad: {
    name: 'Strings synthé', role: 'chords', cat: 'pads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 6, detune: 14, level: 0.7 }, { wave: 'sawtooth', semi: 12, voices: 3, detune: 10, level: 0.3 }],
      filter: { cutoff: 3200, q: 0.5, slope: 24 },
      amp: { a: 0.45, d: 0.5, s: 0.9, r: 1.2 },
      lfo: { target: 'pitch', rate: 5, depth: 0.12 },
      chorus: 0.6, reverb: 0.5, width: 1, gain: 0.22,
    }),
    serum: [
      'Osc A : Saw Unison 6, Detune 0.14. Osc B : Saw +12, Unison 3.',
      'Filtre Low 24 vers 3 kHz : les « Solina » / Juno strings.',
      'ENV 1 : Attack 450 ms, Release 1,2 s. LFO 5 Hz léger → Fine (vibrato d’ensemble).',
      'FX : Chorus (indispensable) + Reverb Hall. Parfait pour disco, synthwave, French touch.',
    ],
  },
  warmpad: {
    name: 'Pad chaud analogique', role: 'chords', cat: 'pads',
    params: makePreset({
      osc: [{ wave: 'triangle', semi: 0, voices: 4, detune: 10, level: 0.7 }, { wave: 'square', semi: -12, voices: 1, detune: 0, level: 0.25 }],
      noise: 0.03,
      filter: { cutoff: 1000, q: 0.8, envAmt: 1, slope: 24 },
      fenv: { a: 1.4, d: 1.5, s: 0.5, r: 1.5 },
      amp: { a: 0.9, d: 0.6, s: 0.9, r: 2 },
      chorus: 0.5, reverb: 0.6, width: 0.9, gain: 0.3,
    }),
    serum: [
      'Osc A : Triangle Unison 4 (Detune faible), Osc B : Square -12 bas, Noise très léger (souffle).',
      'Filtre Low 24 ~1 kHz, ENV 2 lente (Attack 1,4 s) → Cutoff : le son « s’ouvre » en douceur.',
      'ENV 1 : Attack 900 ms, Release 2 s.',
      'FX : Chorus + Reverb longue. Idéal ambient, deep house, intros.',
    ],
  },
  choirpad: {
    name: 'Chœur « Aah »', role: 'chords', cat: 'pads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 3, detune: 8, level: 0.7 }, { wave: 'sawtooth', semi: 12, voices: 2, detune: 6, level: 0.25 }],
      filter: { type: 'bandpass', cutoff: 950, q: 1.6 },
      amp: { a: 0.35, d: 0.4, s: 0.9, r: 1 },
      lfo: { target: 'pitch', rate: 5.2, depth: 0.15 },
      noise: 0.02, chorus: 0.6, reverb: 0.6, width: 0.9, gain: 0.42,
    }),
    serum: [
      'Osc A : Saw Unison 3. Filtre en mode « Formant » (ou Band 12) autour de 950 Hz : la voyelle « Aah ».',
      'Automatise la fréquence du filtre formant pour passer de « Aah » à « Ooh ».',
      'LFO 5 Hz → Fine pour le vibrato, Noise bas pour le souffle.',
      'Alternative : oscillateur Granular de Serum 2 avec un sample de voix.',
    ],
  },
  supersaw: {
    name: 'Supersaw', role: 'chords', cat: 'pads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 7, detune: 28, level: 0.8 }, { wave: 'sawtooth', semi: 12, voices: 3, detune: 20, level: 0.3 }],
      filter: { cutoff: 5200, q: 0.6, envAmt: 0.6 },
      fenv: { a: 0.01, d: 0.4, s: 0.6, r: 0.3 },
      amp: { a: 0.01, d: 0.3, s: 0.9, r: 0.35 },
      chorus: 0.2, reverb: 0.35, delay: 0.15, width: 1, gain: 0.22,
    }),
    serum: [
      'Osc A : Saw, Unison 7, Detune 0.25–0.3, Blend 80. Osc B : Saw +12, Unison 3.',
      'Filtre : Low 12, Cutoff ~5 kHz. Pas trop de résonance.',
      'FX : Hyper/Dimension pour élargir, Compressor (OTT) puis Reverb.',
      'Sidechain dans Live : Compressor avec sidechain sur le kick → la pompe trance/EDM.',
    ],
  },
  brass: {
    name: 'Brass synthwave', role: 'chords', cat: 'pads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 2, detune: 9, level: 0.6 }, { wave: 'sawtooth', semi: -12, voices: 1, detune: 0, level: 0.35 }],
      filter: { cutoff: 900, q: 1, envAmt: 2, slope: 24 },
      fenv: { a: 0.12, d: 0.5, s: 0.5, r: 0.3 },
      amp: { a: 0.03, d: 0.3, s: 0.85, r: 0.35 },
      chorus: 0.5, reverb: 0.3, width: 0.7, gain: 0.26,
    }),
    serum: [
      'Osc A : Saw Unison 2, Osc B : Saw -12.',
      'ENV 2 → Cutoff avec Attack ~120 ms : le filtre « souffle » comme un cuivre (style Jupiter/OB).',
      'FX : Chorus (indispensable 80s) + Reverb plate.',
    ],
  },

  // ---------------- LEADS ----------------
  pluck: {
    name: 'Pluck', role: 'lead', cat: 'leads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 3, detune: 12, level: 0.8 }],
      filter: { cutoff: 500, q: 3, envAmt: 3.2, slope: 24 },
      fenv: { a: 0.001, d: 0.22, s: 0, r: 0.15 },
      amp: { a: 0.001, d: 0.35, s: 0, r: 0.25 },
      delay: 0.3, reverb: 0.25, width: 0.7, gain: 0.38,
    }),
    serum: [
      'Osc A : Saw, Unison 3. Filtre Low 24, Cutoff bas (~500 Hz).',
      'ENV 2 → Cutoff à fond, Decay 220 ms, Sustain 0 : le « pluck » vient du filtre.',
      'ENV 1 : Decay 350 ms, Sustain 0.',
      'FX : Delay ping-pong 1/8 pointé + Reverb. Varie le Decay pour passer de « pizz » à « mallet ».',
    ],
  },
  sawlead: {
    name: 'Lead saw épais', role: 'lead', cat: 'leads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 3, detune: 9, level: 0.7 }, { wave: 'sawtooth', semi: -12, voices: 1, detune: 0, level: 0.3 }],
      filter: { cutoff: 2600, q: 1.2, envAmt: 1.2, slope: 24 },
      fenv: { a: 0.005, d: 0.3, s: 0.4, r: 0.2 },
      amp: { a: 0.005, d: 0.2, s: 0.85, r: 0.2 },
      lfo: { target: 'pitch', rate: 5.5, depth: 0.1 },
      glide: 0.03, delay: 0.3, reverb: 0.25, width: 0.6, drive: 0.15, gain: 0.26,
    }),
    serum: [
      'Osc A : Saw Unison 3, Osc B : Saw -12 pour le corps.',
      'Filtre Low 24 ~2,6 kHz, ENV 2 courte → Cutoff pour l’attaque.',
      'Mono + Legato + Porta 30 ms. LFO 5,5 Hz → Fine avec délai (vibrato qui arrive après la note).',
      'FX : Distortion légère, Delay 1/8 pointé, Reverb.',
    ],
  },
  squarelead: {
    name: 'Lead carré', role: 'lead', cat: 'leads',
    params: makePreset({
      osc: [{ wave: 'square', semi: 0, voices: 1, detune: 0, level: 0.6 }, { wave: 'sawtooth', semi: 12, voices: 2, detune: 10, level: 0.25 }],
      filter: { cutoff: 3500, q: 1.2, envAmt: 0.6 },
      fenv: { a: 0.01, d: 0.3, s: 0.5, r: 0.2 },
      amp: { a: 0.01, d: 0.2, s: 0.8, r: 0.18 },
      lfo: { target: 'pitch', rate: 5.5, depth: 0.12 },
      glide: 0.04, delay: 0.25, reverb: 0.2, gain: 0.4,
    }),
    serum: [
      'Osc A : Square (ou wavetable position PWM). Osc B : Saw +12, Unison 2.',
      'Mode Mono + Legato + Porta ~40 ms pour les glissés.',
      'LFO 1 (5,5 Hz) → Osc A Fine avec un délai d’entrée = vibrato expressif.',
      'FX : Delay 1/4, Reverb. Dans Live : Echo est parfait pour ça.',
    ],
  },
  bell: {
    name: 'Cloche FM', role: 'lead', cat: 'leads',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 0.8 }, { wave: 'sine', semi: 24, voices: 1, detune: 7, level: 0.15 }],
      fm: { ratio: 3.5, index: 3, decay: 0.7, sustain: 0.05 },
      filter: { cutoff: 9000, q: 0.5 },
      amp: { a: 0.001, d: 2, s: 0, r: 1 },
      reverb: 0.45, delay: 0.2, width: 0.6, gain: 0.34,
    }),
    serum: [
      'Osc A : Sine. Osc B : Sine en ratio non entier (Coarse +21/+22 ≈ ×3,5) comme modulateur.',
      'Osc A Warp : « FM (from B) », 30–50 %. ENV 3 → FM avec Decay 700 ms : métal brillant qui s’adoucit.',
      'ENV 1 : Decay 2 s, Sustain 0. Reverb longue = ambiance « Bonobo / Tycho ».',
    ],
  },
  marimba: {
    name: 'Marimba / log drum', role: 'lead', cat: 'leads',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 1 }],
      fm: { ratio: 4, index: 1.6, decay: 0.05, sustain: 0 },
      pitchEnv: { amt: 2, decay: 0.03 },
      filter: { cutoff: 6000, q: 0.5 },
      amp: { a: 0.001, d: 0.45, s: 0, r: 0.25 },
      reverb: 0.25, delay: 0.15, gain: 0.36,
    }),
    serum: [
      'Osc A : Sine, FM depuis Osc B (ratio ×4) avec ENV très courte (50 ms) : l’attaque boisée.',
      'ENV 2 → Coarse +2 demi-tons, Decay 30 ms : le « toc » d’attaque.',
      'ENV 1 : Decay 450 ms, Sustain 0. Une octave plus bas = log drum amapiano.',
    ],
  },
  hoover: {
    name: 'Hoover rave', role: 'lead', cat: 'leads',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 5, detune: 35, level: 0.6 }, { wave: 'sawtooth', semi: -12, voices: 4, detune: 30, level: 0.5 }],
      pitchEnv: { amt: -5, decay: 0.25 },
      filter: { cutoff: 3500, q: 0.8, slope: 24 },
      amp: { a: 0.01, d: 0.3, s: 0.85, r: 0.3 },
      glide: 0.12, chorus: 0.6, drive: 0.3, reverb: 0.3, width: 1, gain: 0.2,
    }),
    serum: [
      'Osc A : Saw (ou wavetable « PWM ») Unison 5 très désaccordé, Osc B idem -12.',
      'ENV 2 → Coarse négatif (-5) avec Decay 250 ms : le « wouuu » caractéristique.',
      'Mono + Porta 120 ms (Always). FX : Chorus fort + Distortion.',
      'Référence : Joey Beltram « Mentasm », hardcore 90s, jungle.',
    ],
  },

  // ---------------- BASSES ----------------
  sub: {
    name: 'Sub bass', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 1 }],
      filter: { cutoff: 400, q: 0.5 },
      amp: { a: 0.004, d: 0.3, s: 0.9, r: 0.08 },
      drive: 0.08, reverb: 0, width: 0, gain: 0.42,
    }),
    serum: [
      'Désactive Osc A/B, active SUB (Sine), Octave -1 ou 0 selon la note.',
      'Mode Mono, Porta court (20 ms). ENV 1 Release ~80 ms pour éviter les clics.',
      'Garde-le mono et sans reverb. Vérifie-le avec Spectrum dans Live (50–80 Hz).',
    ],
  },
  moogbass: {
    name: 'Basse Moog', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 0.7 }, { wave: 'square', semi: -12, voices: 1, detune: 0, level: 0.45 }],
      filter: { cutoff: 380, q: 2.5, envAmt: 2.2, slope: 24 },
      fenv: { a: 0.001, d: 0.25, s: 0.15, r: 0.1 },
      amp: { a: 0.002, d: 0.3, s: 0.7, r: 0.08 },
      glide: 0.02, drive: 0.3, reverb: 0, width: 0, gain: 0.44,
    }),
    serum: [
      'Osc A : Saw, Osc B : Square -12. Filtre « MG Low 24 » (le ladder Moog), Res ~30 %.',
      'ENV 2 → Cutoff, Decay 250 ms, Sustain 15 % : le « wow » à chaque note.',
      'Mono, Porta 20 ms. Distortion Tube légère. Joue des notes courtes et syncopées.',
    ],
  },
  fmbass: {
    name: 'Basse FM', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 0.9 }],
      fm: { ratio: 1, index: 2.6, decay: 0.15, sustain: 0.3 },
      sub: 0.45,
      filter: { cutoff: 2500, q: 0.6 },
      amp: { a: 0.002, d: 0.4, s: 0.6, r: 0.08 },
      drive: 0.2, reverb: 0, width: 0, gain: 0.42,
    }),
    serum: [
      'Osc A : Sine, Warp « FM (from B) » avec Osc B Sine même hauteur. Sub Sine en dessous.',
      'ENV 2 → FM, Decay 150 ms, Sustain 30 % : attaque « growl » puis rond.',
      'Typique deep house / UKG / garage. Joue-la en notes détachées.',
    ],
  },
  reese: {
    name: 'Reese', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 2, detune: 22, level: 0.6 }, { wave: 'sawtooth', semi: -12, voices: 1, detune: 0, level: 0.3 }],
      sub: 0.5,
      filter: { cutoff: 650, q: 1.5, envAmt: 0.3, slope: 24 },
      amp: { a: 0.01, d: 0.3, s: 0.95, r: 0.15 },
      lfo: { target: 'cutoff', rate: 0.25, depth: 0.6 },
      drive: 0.35, chorus: 0.15, reverb: 0.05, width: 0.35, gain: 0.32,
    }),
    serum: [
      'Osc A et B : Saw, désaccordés l’un de l’autre (Fine ±15 cents) → le battement « Reese ».',
      'Sub Sine en dessous, Filtre Low 24 ~650 Hz, LFO lent → Cutoff.',
      'FX : Distortion (Diode/Tube) puis Filtre, Chorus léger. Dans Live : Roar en série, très efficace.',
      'Origine : Kevin Saunderson (« Just Want Another Chance », sous l’alias Reese) → DnB, dubstep.',
    ],
  },
  wobble: {
    name: 'Wobble dubstep', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 2, detune: 12, level: 0.6 }, { wave: 'square', semi: -12, voices: 1, detune: 0, level: 0.45 }],
      sub: 0.4,
      filter: { cutoff: 450, q: 6, slope: 24 },
      amp: { a: 0.005, d: 0.3, s: 0.95, r: 0.1 },
      lfo: { target: 'cutoff', rate: 4, depth: 0.95 },
      drive: 0.5, reverb: 0, width: 0.3, gain: 0.36,
    }),
    serum: [
      'Osc A : Saw Unison 2, Osc B : Square -12, Sub Sine.',
      'Filtre Low 24 résonant, LFO 1 en mode BPM (1/8) → Cutoff à fond : le wobble.',
      'Macro sur le Rate du LFO (1/4 → 1/16) pour faire « parler » la basse. Distortion + OTT.',
    ],
  },
  acid: {
    name: 'Acid 303', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }],
      filter: { cutoff: 380, q: 9, envAmt: 3, slope: 24 },
      fenv: { a: 0.001, d: 0.17, s: 0.05, r: 0.1 },
      amp: { a: 0.002, d: 0.25, s: 0.6, r: 0.08 },
      glide: 0.06, drive: 0.5, delay: 0.12, reverb: 0.05, width: 0, gain: 0.42,
    }),
    serum: [
      'Osc A : Saw (ou Square). Mode Mono + Legato + Porta 60 ms : les slides.',
      'Filtre : « Diode 4 » ou Low 24, Res 70-80 %, Cutoff bas.',
      'ENV 2 → Cutoff, Decay ~170 ms. Mappe Cutoff et Decay sur 2 macros et AUTOMATISE-LES en live.',
      'FX : Distortion. Sur MPC : le plugin Bassline (303-like) si dispo.',
    ],
  },
  bass808: {
    name: '808', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 1 }],
      pitchEnv: { amt: 12, decay: 0.045 },
      filter: { cutoff: 1200, q: 0.5 },
      amp: { a: 0.002, d: 1.1, s: 0.35, r: 0.4 },
      glide: 0.09, drive: 0.55, reverb: 0, width: 0, gain: 0.5,
    }),
    serum: [
      'Osc A : Sine (ou Sub), ENV 2 → Pitch (Coarse) +12 avec Decay 40 ms : le « punch » d’attaque.',
      'Mode Mono + Porta 90 ms (Always) : glissés trap entre les notes qui se chevauchent.',
      'Distortion (Tube / Soft Clip) pour qu’on l’entende sur téléphone.',
      'Sur MPC : 808 en « Drum program » chromatique, ou Keygroup pour le jouer au clavier.',
    ],
  },
  pluckbass: {
    name: 'Basse pluck', role: 'bass', cat: 'basses',
    params: makePreset({
      osc: [{ wave: 'square', semi: 0, voices: 1, detune: 0, level: 0.6 }, { wave: 'sawtooth', semi: 0, voices: 1, detune: 6, level: 0.4 }],
      sub: 0.4,
      filter: { cutoff: 380, q: 3, envAmt: 2.5, slope: 24 },
      fenv: { a: 0.001, d: 0.15, s: 0.1, r: 0.1 },
      amp: { a: 0.002, d: 0.25, s: 0.4, r: 0.08 },
      reverb: 0, width: 0, gain: 0.58,
    }),
    serum: [
      'Osc A : Square, Osc B : Saw, Sub Sine.',
      'ENV 2 → Cutoff, Decay 150 ms : une basse « funky » qui claque.',
      'Joue des octaves (disco) ou des notes courtes syncopées (house, funk).',
    ],
  },
};

export const PRESET_IDS = Object.keys(PRESETS);

/** Options pour un menu déroulant, groupées par catégorie (préfixe). */
export function presetOptions(filterFn = () => true) {
  return Object.entries(PRESETS).filter(([, p]) => filterFn(p)).map(([k, p]) => ({ value: k, label: `${CATEGORIES[p.cat].split(' ')[0]} ${p.name}` }));
}
