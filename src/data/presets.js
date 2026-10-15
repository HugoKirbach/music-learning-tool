// Presets du synthé intégré + recette pour les recréer dans Serum 2.
// Paramètres : voir src/core/audio.js (playSynth).

const base = {
  osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }],
  sub: 0,
  noise: 0,
  filter: { type: 'lowpass', cutoff: 3000, q: 1, envAmt: 0 },
  fenv: { a: 0.005, d: 0.3, s: 0.0, r: 0.2 },
  amp: { a: 0.005, d: 0.3, s: 0.7, r: 0.2 },
  lfo: { target: 'none', rate: 4, depth: 0 },
  glide: 0,
  drive: 0,
  gain: 0.5,
};

export function makePreset(over) {
  return structuredCloneSafe({
    ...base,
    ...over,
    filter: { ...base.filter, ...(over.filter || {}) },
    fenv: { ...base.fenv, ...(over.fenv || {}) },
    amp: { ...base.amp, ...(over.amp || {}) },
    lfo: { ...base.lfo, ...(over.lfo || {}) },
  });
}

function structuredCloneSafe(o) {
  return JSON.parse(JSON.stringify(o));
}

export const PRESETS = {
  pad: {
    name: 'Pad large',
    role: 'chords',
    params: makePreset({
      osc: [
        { wave: 'sawtooth', semi: 0, voices: 4, detune: 18, level: 0.7 },
        { wave: 'triangle', semi: 12, voices: 1, detune: 0, level: 0.3 },
      ],
      filter: { cutoff: 1600, q: 0.7, envAmt: 0.5 },
      fenv: { a: 0.6, d: 1.2, s: 0.4, r: 1 },
      amp: { a: 0.35, d: 0.5, s: 0.85, r: 1.1 },
      lfo: { target: 'cutoff', rate: 0.3, depth: 0.25 },
      gain: 0.28,
    }),
    serum: [
      'Osc A : wavetable « Basic Shapes », position sur Saw, Unison 4-6 voix, Detune ~0.18, Blend 75.',
      'Osc B : Triangle +12 demi-tons, niveau ~30 % pour l’air.',
      'Filtre : MG Low 12, Cutoff ~1.5 kHz, ENV 2 → Cutoff (attaque 600 ms).',
      'ENV 1 : Attack 350 ms, Release 1.1 s. LFO 1 lent (0.3 Hz) → Cutoff, faible quantité.',
      'FX : Chorus + Hall Reverb (Size 70 %). Astuce : macro 1 = Cutoff + Reverb Mix.',
    ],
  },
  stab: {
    name: 'Stab house (orgue)',
    role: 'chords',
    params: makePreset({
      osc: [
        { wave: 'square', semi: 0, voices: 1, detune: 0, level: 0.6 },
        { wave: 'sawtooth', semi: 12, voices: 2, detune: 8, level: 0.4 },
      ],
      filter: { cutoff: 900, q: 2, envAmt: 2.2 },
      fenv: { a: 0.002, d: 0.18, s: 0, r: 0.1 },
      amp: { a: 0.002, d: 0.22, s: 0.0, r: 0.1 },
      gain: 0.32,
    }),
    serum: [
      'Osc A : Square, Osc B : Saw +12 avec Unison 2.',
      'Filtre : Low 24, Cutoff bas (~900 Hz), Res ~20 %.',
      'ENV 2 → Cutoff, Decay 180 ms, Sustain 0 : c’est l’enveloppe qui fait le « stab ».',
      'ENV 1 : Decay 220 ms, Sustain 0. Ajoute Reverb courte + Delay 1/8 pointé.',
    ],
  },
  piano: {
    name: 'Keys lo-fi',
    role: 'chords',
    params: makePreset({
      osc: [
        { wave: 'triangle', semi: 0, voices: 1, detune: 0, level: 0.7 },
        { wave: 'sine', semi: 12, voices: 1, detune: 0, level: 0.25 },
      ],
      filter: { cutoff: 2200, q: 0.5, envAmt: 1 },
      fenv: { a: 0.002, d: 0.6, s: 0.2, r: 0.4 },
      amp: { a: 0.003, d: 1.2, s: 0.15, r: 0.5 },
      lfo: { target: 'pitch', rate: 0.6, depth: 0.08 },
      gain: 0.36,
    }),
    serum: [
      'Osc A : Triangle, Osc B : Sine +12 (niveau bas) : timbre « Rhodes » simplifié.',
      'ENV 1 : Decay 1.2 s, Sustain 15 %. Filtre Low 12 vers 2 kHz.',
      'LFO lent → Fine (pitch) très léger = effet bande / wow.',
      'FX : Distortion « Tube » légère + EQ coupe-aigus + Reverb. Dans Live : ajoute Vinyl Distortion ou Roar.',
    ],
  },
  supersaw: {
    name: 'Supersaw',
    role: 'chords',
    params: makePreset({
      osc: [
        { wave: 'sawtooth', semi: 0, voices: 7, detune: 28, level: 0.8 },
        { wave: 'sawtooth', semi: 12, voices: 3, detune: 20, level: 0.3 },
      ],
      filter: { cutoff: 5200, q: 0.6, envAmt: 0.6 },
      fenv: { a: 0.01, d: 0.4, s: 0.6, r: 0.3 },
      amp: { a: 0.01, d: 0.3, s: 0.9, r: 0.35 },
      gain: 0.2,
    }),
    serum: [
      'Osc A : Saw, Unison 7, Detune 0.25–0.3, Blend 80. Osc B : Saw +12, Unison 3.',
      'Filtre : Low 12, Cutoff ~5 kHz. Pas trop de résonance.',
      'FX : Hyper/Dimension pour élargir, Compressor (OTT) puis Reverb.',
      'Sidechain dans Live : Compressor avec sidechain sur le kick → la pompe trance/EDM.',
    ],
  },
  pluck: {
    name: 'Pluck',
    role: 'lead',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 3, detune: 12, level: 0.8 }],
      filter: { cutoff: 500, q: 3, envAmt: 3.2 },
      fenv: { a: 0.001, d: 0.22, s: 0, r: 0.15 },
      amp: { a: 0.001, d: 0.35, s: 0, r: 0.25 },
      gain: 0.36,
    }),
    serum: [
      'Osc A : Saw, Unison 3. Filtre Low 24, Cutoff bas (~500 Hz).',
      'ENV 2 → Cutoff à fond, Decay 220 ms, Sustain 0 : le « pluck » vient du filtre.',
      'ENV 1 : Decay 350 ms, Sustain 0.',
      'FX : Delay ping-pong 1/8 pointé + Reverb. Varie le Decay pour passer de « pizz » à « mallet ».',
    ],
  },
  squarelead: {
    name: 'Lead carré',
    role: 'lead',
    params: makePreset({
      osc: [
        { wave: 'square', semi: 0, voices: 1, detune: 0, level: 0.6 },
        { wave: 'sawtooth', semi: 12, voices: 2, detune: 10, level: 0.25 },
      ],
      filter: { cutoff: 3500, q: 1.2, envAmt: 0.6 },
      fenv: { a: 0.01, d: 0.3, s: 0.5, r: 0.2 },
      amp: { a: 0.01, d: 0.2, s: 0.8, r: 0.18 },
      lfo: { target: 'pitch', rate: 5.5, depth: 0.12 },
      glide: 0.04,
      gain: 0.3,
    }),
    serum: [
      'Osc A : Square (ou wavetable « Analog_BD_Sin » position PWM). Osc B : Saw +12, Unison 2.',
      'Mode Mono + Legato + Porta ~40 ms pour les glissés.',
      'LFO 1 (5.5 Hz) → Osc A Fine avec un délai d’entrée (Delay) = vibrato expressif.',
      'FX : Delay 1/4, Reverb. Dans Live : Echo est parfait pour ça.',
    ],
  },
  bell: {
    name: 'Cloche FM',
    role: 'lead',
    params: makePreset({
      osc: [
        { wave: 'sine', semi: 0, voices: 1, detune: 0, level: 0.7 },
        { wave: 'sine', semi: 24, voices: 1, detune: 7, level: 0.3 },
        { wave: 'triangle', semi: 19, voices: 1, detune: 0, level: 0.12 },
      ],
      filter: { cutoff: 8000, q: 0.5, envAmt: 0 },
      amp: { a: 0.001, d: 1.4, s: 0, r: 0.8 },
      gain: 0.36,
    }),
    serum: [
      'Osc A : Sine. Osc B : Sine +24 demi-tons.',
      'Osc A Warp : « FM (from B) », quantité 20–40 % : le métal apparaît.',
      'ENV 3 → FM amount avec Decay court : attaque brillante qui s’adoucit.',
      'ENV 1 : Decay 1.4 s, Sustain 0. Reverb longue = ambiance « Bonobo / Tycho ».',
    ],
  },
  brass: {
    name: 'Brass synthwave',
    role: 'chords',
    params: makePreset({
      osc: [
        { wave: 'sawtooth', semi: 0, voices: 2, detune: 9, level: 0.6 },
        { wave: 'sawtooth', semi: -12, voices: 1, detune: 0, level: 0.35 },
      ],
      filter: { cutoff: 900, q: 1, envAmt: 2 },
      fenv: { a: 0.12, d: 0.5, s: 0.5, r: 0.3 },
      amp: { a: 0.03, d: 0.3, s: 0.85, r: 0.35 },
      gain: 0.26,
    }),
    serum: [
      'Osc A : Saw Unison 2, Osc B : Saw -12.',
      'ENV 2 → Cutoff avec Attack ~120 ms : le filtre « souffle » comme un cuivre (style Jupiter/OB).',
      'FX : Chorus (indispensable 80s) + Reverb plate.',
    ],
  },
  sub: {
    name: 'Sub bass',
    role: 'bass',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 1 }],
      filter: { cutoff: 400, q: 0.5, envAmt: 0 },
      amp: { a: 0.004, d: 0.3, s: 0.9, r: 0.08 },
      gain: 0.6,
    }),
    serum: [
      'Désactive Osc A/B, active SUB (Sine), Octave -1 ou 0 selon la note.',
      'Mode Mono, Porta court (20 ms). ENV 1 Release ~80 ms pour éviter les clics.',
      'Garde-le mono et sans reverb. Vérifie-le avec Spectrum dans Live (50–80 Hz).',
    ],
  },
  reese: {
    name: 'Reese',
    role: 'bass',
    params: makePreset({
      osc: [
        { wave: 'sawtooth', semi: 0, voices: 2, detune: 22, level: 0.6 },
        { wave: 'sawtooth', semi: -12, voices: 1, detune: 0, level: 0.3 },
      ],
      sub: 0.5,
      filter: { cutoff: 650, q: 1.5, envAmt: 0.3 },
      amp: { a: 0.01, d: 0.3, s: 0.95, r: 0.15 },
      lfo: { target: 'cutoff', rate: 0.25, depth: 0.6 },
      drive: 0.3,
      gain: 0.34,
    }),
    serum: [
      'Osc A et B : Saw, désaccordés l’un de l’autre (Fine ±15 cents) → le battement « Reese ».',
      'Sub Sine en dessous, Filtre Low 24 ~650 Hz, LFO lent → Cutoff.',
      'FX : Distortion (Diode/Tube) puis Filtre, Chorus léger. Dans Live : Roar en série, très efficace.',
      'Origine : Kevin Saunderson (« Just Want Another Chance », sous l’alias Reese) → DnB, dubstep.',
    ],
  },
  acid: {
    name: 'Acid 303',
    role: 'bass',
    params: makePreset({
      osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 0, level: 1 }],
      filter: { cutoff: 380, q: 14, envAmt: 3 },
      fenv: { a: 0.001, d: 0.17, s: 0.05, r: 0.1 },
      amp: { a: 0.002, d: 0.25, s: 0.6, r: 0.08 },
      glide: 0.06,
      drive: 0.45,
      gain: 0.3,
    }),
    serum: [
      'Osc A : Saw (ou Square). Mode Mono + Legato + Porta 60 ms : les slides.',
      'Filtre : « Diode 4 » ou Low 24, Res 70-80 %, Cutoff bas.',
      'ENV 2 → Cutoff, Decay ~170 ms. Mappe Cutoff et Decay sur 2 macros et AUTOMATISE-LES en live.',
      'FX : Distortion. Dans Live 12 : le device « Acid » n’existe pas → utilise Serum ou Analog ; sur MPC, le plugin Bassline.',
    ],
  },
  bass808: {
    name: '808',
    role: 'bass',
    params: makePreset({
      osc: [{ wave: 'sine', semi: 0, voices: 1, detune: 0, level: 1 }],
      filter: { cutoff: 1200, q: 0.5, envAmt: 0 },
      amp: { a: 0.002, d: 1.1, s: 0.35, r: 0.4 },
      glide: 0.09,
      drive: 0.55,
      gain: 0.5,
    }),
    serum: [
      'Osc A : Sine (ou Sub), ENV 2 → Pitch (Coarse) +12 avec Decay 40 ms : le « punch » d’attaque.',
      'Mode Mono + Porta 90 ms (Always) : glissés trap entre les notes qui se chevauchent.',
      'Distortion (Tube / Soft Clip) pour qu’on l’entende sur téléphone.',
      'Sur MPC : 808 en « Drum program » chromatique, ou Keygroup pour le jouer au clavier.',
    ],
  },
  pluckbass: {
    name: 'Basse pluck',
    role: 'bass',
    params: makePreset({
      osc: [
        { wave: 'square', semi: 0, voices: 1, detune: 0, level: 0.6 },
        { wave: 'sawtooth', semi: 0, voices: 1, detune: 6, level: 0.4 },
      ],
      sub: 0.4,
      filter: { cutoff: 380, q: 3, envAmt: 2.5 },
      fenv: { a: 0.001, d: 0.15, s: 0.1, r: 0.1 },
      amp: { a: 0.002, d: 0.25, s: 0.4, r: 0.08 },
      gain: 0.38,
    }),
    serum: [
      'Osc A : Square, Osc B : Saw, Sub Sine.',
      'ENV 2 → Cutoff, Decay 150 ms : une basse « funky » qui claque.',
      'Joue des octaves (disco) ou des notes courtes syncopées (house, funk).',
    ],
  },
};

export const PRESET_IDS = Object.keys(PRESETS);
