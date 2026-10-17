// Moteur audio Web Audio « qualité studio » :
// - batterie synthétisée multi-kits (909, 808, techno, acoustique, lo-fi, minimal) : hats métalliques, kicks à enveloppe de pitch, snares à 2 tons
// - synthé polyphonique : unison stéréo, FM, filtre 12/24 dB, enveloppe de pitch, couche de bruit, drive
// - chaîne master : sidechain (pompe), filtre d'arrangement, compresseur « glue », saturation douce, limiteur
// - effets en envoi : réverbe à convolution (pré-délai, amortissement), delay ping-pong synchronisé, chorus stéréo
import { midiToFreq } from './theory.js';

let ctx = null;
let master, limiter, glue, saturator, masterFilter, drumBus, synthBus, pumpGain;
let reverbSend, delaySend, chorusSend, delayL, delayR;
let noiseBuf = null;
let openHat = null;
let volume = 0.8;
let pump = 0;
let tempo = 120;

export function audioReady() {
  return !!ctx;
}

/** À appeler depuis un geste utilisateur (contrainte iOS / Chrome). */
export function ensureAudio() {
  if (!ctx) build();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC({ latencyHint: 'interactive' });

  // ----- Master : filtre d'arrangement → glue → saturation → limiteur → volume
  master = ctx.createGain();
  master.gain.value = volume;
  limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.5; limiter.knee.value = 0; limiter.ratio.value = 20;
  limiter.attack.value = 0.002; limiter.release.value = 0.08;
  saturator = ctx.createWaveShaper();
  saturator.curve = softClip(0.35);
  saturator.oversample = '2x';
  glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -16; glue.knee.value = 8; glue.ratio.value = 2.5;
  glue.attack.value = 0.012; glue.release.value = 0.22;
  const makeup = ctx.createGain();
  makeup.gain.value = 0.9;
  masterFilter = ctx.createBiquadFilter();
  masterFilter.type = 'lowpass'; masterFilter.frequency.value = 20000; masterFilter.Q.value = 0.9;
  masterFilter.connect(glue).connect(makeup).connect(saturator).connect(limiter).connect(master).connect(ctx.destination);

  // ----- Bus
  drumBus = ctx.createGain(); drumBus.gain.value = 0.42;
  drumBus.connect(masterFilter);
  synthBus = ctx.createGain(); synthBus.gain.value = 0.36;
  pumpGain = ctx.createGain(); pumpGain.gain.value = 1;
  synthBus.connect(pumpGain).connect(masterFilter);

  // ----- Réverbe : pré-délai → convolution → EQ (coupe le grave boueux et les aigus agressifs)
  reverbSend = ctx.createGain(); reverbSend.gain.value = 0.45;
  const pre = ctx.createDelay(0.1); pre.delayTime.value = 0.022;
  const conv = ctx.createConvolver(); conv.buffer = makeImpulse(2.8);
  const rvHp = ctx.createBiquadFilter(); rvHp.type = 'highpass'; rvHp.frequency.value = 220;
  const rvLp = ctx.createBiquadFilter(); rvLp.type = 'lowpass'; rvLp.frequency.value = 7500;
  reverbSend.connect(pre).connect(conv).connect(rvHp).connect(rvLp).connect(pumpGain);

  // ----- Delay ping-pong synchronisé (croche pointée), filtré dans la boucle
  delaySend = ctx.createGain(); delaySend.gain.value = 0.5;
  delayL = ctx.createDelay(2); delayR = ctx.createDelay(2);
  const fb = ctx.createGain(); fb.gain.value = 0.38;
  const dHp = ctx.createBiquadFilter(); dHp.type = 'highpass'; dHp.frequency.value = 350;
  const dLp = ctx.createBiquadFilter(); dLp.type = 'lowpass'; dLp.frequency.value = 4200;
  const merger = ctx.createChannelMerger(2);
  delaySend.connect(dHp).connect(dLp).connect(delayL);
  delayL.connect(delayR);
  delayR.connect(fb).connect(delayL);
  delayL.connect(merger, 0, 0);
  delayR.connect(merger, 0, 1);
  merger.connect(pumpGain);
  setTempo(tempo);

  // ----- Chorus stéréo (2 lignes modulées en opposition)
  chorusSend = ctx.createGain(); chorusSend.gain.value = 0.7;
  const cm = ctx.createChannelMerger(2);
  [[0.31, 0.012, 0], [0.43, 0.017, 1]].forEach(([rate, base, ch]) => {
    const d = ctx.createDelay(0.05); d.delayTime.value = base;
    const lfo = ctx.createOscillator(); lfo.frequency.value = rate;
    const depth = ctx.createGain(); depth.gain.value = 0.0035;
    lfo.connect(depth).connect(d.delayTime); lfo.start();
    chorusSend.connect(d).connect(cm, 0, ch);
  });
  cm.connect(pumpGain);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
}

export function now() {
  return ctx ? ctx.currentTime : 0;
}

/** Latence de sortie : on l'entend après l'avoir programmé → on en tient compte pour noter le timing du joueur. */
export function outputLatency() {
  return ctx ? (ctx.outputLatency || 0) + (ctx.baseLatency || 0) : 0;
}

export function setVolume(v) {
  volume = v;
  if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
}

/** Tempo des effets synchronisés (delay en croche pointée). */
export function setTempo(bpm) {
  tempo = bpm;
  if (!ctx || !delayL) return;
  const t = (60 / bpm) * 0.75;
  delayL.delayTime.setTargetAtTime(t, ctx.currentTime, 0.05);
  delayR.delayTime.setTargetAtTime(t, ctx.currentTime, 0.05);
}

/** Quantité de « pompe » (sidechain des synthés sur le kick), 0..1. */
export function setPump(amount) {
  pump = Math.max(0, Math.min(1, amount || 0));
}

function softClip(amount) {
  const n = 2048, curve = new Float32Array(n), k = 1 + amount * 4;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return curve;
}

/** Réponse impulsionnelle stéréo : réflexions précoces + queue décorrélée qui s'assombrit (amortissement). */
function makeImpulse(seconds) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const damp = 0.85 - 0.75 * t; // l'aigu s'éteint plus vite
      lp += damp * ((Math.random() * 2 - 1) - lp);
      ch[i] = lp * Math.pow(1 - t, 3.2) * (i < rate * 0.004 ? i / (rate * 0.004) : 1);
    }
    // réflexions précoces
    for (const [ms, g] of [[7, 0.5], [13, 0.38], [19, 0.3], [29, 0.24], [41, 0.18], [53, 0.14]]) {
      const idx = Math.floor((ms + (c ? 2.3 : 0)) * rate / 1000);
      if (idx < len) ch[idx] += g * (c ? -1 : 1);
    }
  }
  return buf;
}

function noise(time, dur, offset = Math.random() * 1.5) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  src.start(time, offset);
  src.stop(time + dur + 0.05);
  return src;
}

function env(param, time, peak, attack, decay, floor = 0.0001) {
  param.cancelScheduledValues(time);
  param.setValueAtTime(floor, time);
  param.linearRampToValueAtTime(peak, time + attack);
  param.exponentialRampToValueAtTime(floor, time + attack + decay);
}

function sendTo(node, bus, amount) {
  if (amount <= 0) return;
  const g = ctx.createGain();
  g.gain.value = amount;
  node.connect(g).connect(bus);
}

/** Automatisation du filtre master : valeur fixe (to seul) ou balayage exponentiel de from à to. */
export function masterFilterAt(time, to, from = null, dur = 0) {
  if (!ctx) return;
  const f = masterFilter.frequency;
  f.cancelScheduledValues(time);
  if (from != null && dur > 0) {
    f.setValueAtTime(from, time);
    f.exponentialRampToValueAtTime(to, time + dur);
  } else f.setValueAtTime(to, time);
}

export function resetMasterFilter() {
  pump = 0;
  if (!ctx) return;
  masterFilter.frequency.cancelScheduledValues(ctx.currentTime);
  masterFilter.frequency.setValueAtTime(20000, ctx.currentTime);
  pumpGain.gain.cancelScheduledValues(ctx.currentTime);
  pumpGain.gain.setValueAtTime(1, ctx.currentTime);
}

/** Riser : bruit filtré qui monte + léger sweep tonal (montée de tension avant un drop). */
export function playRiser(time, dur) {
  if (!ctx) return;
  const n = noise(time, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 3;
  bp.frequency.setValueAtTime(300, time);
  bp.frequency.exponentialRampToValueAtTime(10000, time + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.45, time + dur * 0.95);
  g.gain.linearRampToValueAtTime(0.0001, time + dur);
  const pan = ctx.createStereoPanner();
  const plfo = ctx.createOscillator(); plfo.frequency.setValueAtTime(0.5, time); plfo.frequency.linearRampToValueAtTime(6, time + dur);
  plfo.connect(pan.pan); plfo.start(time); plfo.stop(time + dur + 0.1);
  n.connect(bp).connect(g).connect(pan).connect(masterFilter);
  sendTo(pan, reverbSend, 0.5);
  const o = ctx.createOscillator(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, time); o.frequency.exponentialRampToValueAtTime(880, time + dur);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, time); og.gain.exponentialRampToValueAtTime(0.06, time + dur * 0.95); og.gain.linearRampToValueAtTime(0.0001, time + dur);
  const olp = ctx.createBiquadFilter(); olp.frequency.value = 3000;
  o.connect(olp).connect(og).connect(pan);
  o.start(time); o.stop(time + dur + 0.05);
}

/** Clic de métronome (accent sur le premier temps). */
export function playClick(time, accent = false) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  env(g.gain, time, accent ? 0.35 : 0.2, 0.001, 0.05);
  o.connect(g).connect(master);
  o.start(time); o.stop(time + 0.08);
}

/** Décode un fichier audio (MP3, WAV, M4A…) importé par l'utilisateur. */
export async function decodeFile(file) {
  ensureAudio();
  const buf = await file.arrayBuffer();
  return ctx.decodeAudioData(buf);
}

/** Lecteur d'un AudioBuffer (référence), à part du mix et du filtre. Renvoie stop(). */
export function playBuffer(buffer, offset = 0, { loopStart = null, loopEnd = null, rate = 1 } = {}) {
  ensureAudio();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = rate;
  if (loopStart != null && loopEnd != null && loopEnd > loopStart) { src.loop = true; src.loopStart = loopStart; src.loopEnd = loopEnd; }
  const g = ctx.createGain();
  g.gain.value = 0.9;
  src.connect(g).connect(master);
  const startAt = ctx.currentTime;
  src.start(startAt, offset);
  return { stop: () => { try { src.stop(); } catch (e) { /* déjà stoppé */ } }, startAt, offset, rate, node: src };
}

// ---------- Batterie ----------

export const KITS = {
  club: {
    name: 'Club 909',
    kick: { pitch: 210, end: 50, bend: 0.045, decay: 0.42, click: 0.5, drive: 0.35 },
    snare: { tones: [185, 330], toneDecay: 0.09, noiseFreq: 2400, noiseDecay: 0.19, mix: 0.75 },
    hat: { metal: 0.65, decay: 0.05, odecay: 0.34, tone: 9500 },
    clap: { decay: 0.22, freq: 1200 }, perc: 'rim',
  },
  k808: {
    name: '808',
    kick: { pitch: 140, end: 44, bend: 0.06, decay: 1.1, click: 0.15, drive: 0.55 },
    snare: { tones: [238, 476], toneDecay: 0.11, noiseFreq: 3200, noiseDecay: 0.16, mix: 0.6 },
    hat: { metal: 1, decay: 0.04, odecay: 0.42, tone: 8500 },
    clap: { decay: 0.26, freq: 1000 }, perc: 'cowbell',
  },
  hard: {
    name: 'Techno',
    kick: { pitch: 260, end: 46, bend: 0.035, decay: 0.55, click: 0.7, drive: 0.8, rumble: true },
    snare: { tones: [170, 290], toneDecay: 0.07, noiseFreq: 2800, noiseDecay: 0.16, mix: 0.8 },
    hat: { metal: 0.5, decay: 0.035, odecay: 0.26, tone: 10500 },
    clap: { decay: 0.3, freq: 1350 }, perc: 'rim',
  },
  acoustic: {
    name: 'Acoustique',
    kick: { pitch: 120, end: 58, bend: 0.03, decay: 0.32, click: 0.6, drive: 0.15 },
    snare: { tones: [200, 360], toneDecay: 0.12, noiseFreq: 4000, noiseDecay: 0.24, mix: 0.85 },
    hat: { metal: 0.25, decay: 0.07, odecay: 0.45, tone: 8000 },
    clap: { decay: 0.18, freq: 1500 }, perc: 'conga',
  },
  lofi: {
    name: 'Lo-fi poussiéreux',
    kick: { pitch: 110, end: 52, bend: 0.04, decay: 0.38, click: 0.25, drive: 0.5 },
    snare: { tones: [190, 300], toneDecay: 0.1, noiseFreq: 1800, noiseDecay: 0.2, mix: 0.7 },
    hat: { metal: 0.3, decay: 0.055, odecay: 0.3, tone: 6000 },
    clap: { decay: 0.2, freq: 900 }, perc: 'conga', dusty: true,
  },
  minimal: {
    name: 'Minimal',
    kick: { pitch: 180, end: 52, bend: 0.025, decay: 0.28, click: 0.35, drive: 0.2 },
    snare: { tones: [220, 410], toneDecay: 0.05, noiseFreq: 5000, noiseDecay: 0.1, mix: 0.6 },
    hat: { metal: 0.85, decay: 0.025, odecay: 0.2, tone: 11000 },
    clap: { decay: 0.14, freq: 1600 }, perc: 'tom',
  },
};

export function kitForGenre(id) {
  if (['trap', 'reggaeton', 'afrobeats', 'jersey', 'synthwave'].includes(id)) return 'k808';
  if (['lofi', 'jungle'].includes(id)) return 'lofi';
  if (['funk', 'bossa'].includes(id)) return 'acoustic';
  if (['techno', 'acid', 'dubstep'].includes(id)) return 'hard';
  if (['ambient', 'afrohouse', 'deephouse'].includes(id)) return 'minimal';
  return 'club';
}

/** Pompe : les synthés baissent sur chaque kick puis remontent (sidechain). */
function duck(time) {
  if (!pump) return;
  const g = pumpGain.gain;
  const rel = (60 / tempo) * 0.16;
  g.setTargetAtTime(1 - pump * 0.75, time, 0.004);
  g.setTargetAtTime(1, time + 0.035, rel);
}

const HAT_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];

export function playDrum(id, time, vel = 1, kitId = 'club') {
  if (!ctx) return;
  time = Math.max(time, ctx.currentTime);
  const kit = KITS[kitId] || KITS.club;
  const out = ctx.createGain();
  out.gain.value = vel;
  let dest = drumBus;
  if (kit.dusty) { // filtre « vinyle » : aigus adoucis
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; lp.Q.value = 0.5;
    lp.connect(drumBus); dest = lp;
  }
  out.connect(dest);
  switch (id) {
    case 'kick': {
      const k = kit.kick;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(k.pitch, time);
      o.frequency.exponentialRampToValueAtTime(k.end * 1.6, time + k.bend);
      o.frequency.exponentialRampToValueAtTime(k.end, time + k.bend * 4);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(0.78, time + 0.0015);
      g.gain.setTargetAtTime(0.0001, time + 0.02, k.decay / 4);
      const sh = ctx.createWaveShaper(); sh.curve = softClip(k.drive); sh.oversample = '2x';
      o.connect(g).connect(sh).connect(out);
      o.start(time); o.stop(time + k.decay * 1.6 + 0.1);
      // Click d'attaque
      const c = noise(time, 0.012);
      const chp = ctx.createBiquadFilter(); chp.type = 'highpass'; chp.frequency.value = 3500;
      const cg = ctx.createGain(); env(cg.gain, time, 0.45 * k.click, 0.0005, 0.01);
      c.connect(chp).connect(cg).connect(out);
      // Rumble techno : queue grave filtrée envoyée dans la réverbe
      if (k.rumble) {
        const rg = ctx.createGain(); rg.gain.value = 0.35;
        const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 180;
        sh.connect(rg).connect(rlp).connect(reverbSend);
      }
      duck(time);
      break;
    }
    case 'snare': {
      const s = kit.snare;
      s.tones.forEach((f, i) => {
        const o = ctx.createOscillator(); o.type = 'triangle';
        o.frequency.setValueAtTime(f * 1.15, time); o.frequency.exponentialRampToValueAtTime(f, time + 0.02);
        const og = ctx.createGain(); env(og.gain, time, (i ? 0.25 : 0.45) * (1 - s.mix * 0.4), 0.001, s.toneDecay);
        o.connect(og).connect(out); o.start(time); o.stop(time + s.toneDecay + 0.1);
      });
      const n = noise(time, s.noiseDecay + 0.05);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = s.noiseFreq; bp.Q.value = 0.7;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
      const ng = ctx.createGain(); env(ng.gain, time, 0.75 * s.mix, 0.001, s.noiseDecay);
      n.connect(bp).connect(hp).connect(ng).connect(out);
      sendTo(ng, reverbSend, 0.18);
      break;
    }
    case 'clap': {
      const c = kit.clap;
      const n = noise(time, c.decay + 0.06);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = c.freq; bp.Q.value = 1.4;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 700;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      [0, 0.009, 0.019, 0.028].forEach((dt) => {
        g.gain.setValueAtTime(0.85, time + dt);
        g.gain.exponentialRampToValueAtTime(0.12, time + dt + 0.008);
      });
      g.gain.setValueAtTime(0.75, time + 0.036);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.036 + c.decay);
      const pan = ctx.createStereoPanner(); pan.pan.value = 0.05;
      n.connect(bp).connect(hp).connect(g).connect(pan).connect(out);
      sendTo(g, reverbSend, 0.3);
      break;
    }
    case 'hat':
    case 'ohat': {
      if (openHat) { // choke : le hat fermé coupe le hat ouvert
        try { openHat.gain.cancelScheduledValues(time); openHat.gain.setTargetAtTime(0.0001, time, 0.008); } catch (e) { /* noop */ }
        openHat = null;
      }
      const h = kit.hat;
      const dec = id === 'hat' ? h.decay : h.odecay;
      const mix = ctx.createGain();
      // Partie métallique (6 carrés inharmoniques, à la 808/909)
      if (h.metal > 0) {
        const mg = ctx.createGain(); mg.gain.value = 0.22 * h.metal;
        HAT_RATIOS.forEach((r) => {
          const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 40 * r * 1.6;
          o.connect(mg); o.start(time); o.stop(time + dec + 0.1);
        });
        mg.connect(mix);
      }
      const n = noise(time, dec + 0.05);
      const ng = ctx.createGain(); ng.gain.value = 0.6 * (1 - h.metal * 0.5);
      n.connect(ng).connect(mix);
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = h.tone; bp.Q.value = 0.9;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      g.gain.linearRampToValueAtTime(id === 'hat' ? 0.55 : 0.42, time + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, time + dec);
      const pan = ctx.createStereoPanner(); pan.pan.value = id === 'hat' ? 0.18 : -0.15;
      mix.connect(bp).connect(hp).connect(g).connect(pan).connect(out);
      if (id === 'ohat') { openHat = g; sendTo(g, reverbSend, 0.12); }
      break;
    }
    case 'perc': {
      percVoice(kit.perc, time, out);
      break;
    }
    default: break;
  }
}

function percVoice(type, time, out) {
  const pan = ctx.createStereoPanner(); pan.pan.value = -0.25;
  pan.connect(out);
  if (type === 'cowbell') {
    const g = ctx.createGain(); env(g.gain, time, 0.35, 0.001, 0.28);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 1.2;
    [545, 815].forEach((f) => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; o.connect(bp); o.start(time); o.stop(time + 0.35); });
    bp.connect(g).connect(pan);
  } else if (type === 'conga') {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(360, time); o.frequency.exponentialRampToValueAtTime(240, time + 0.03);
    const g = ctx.createGain(); env(g.gain, time, 0.7, 0.001, 0.22);
    o.connect(g).connect(pan); o.start(time); o.stop(time + 0.3);
    const n = noise(time, 0.02); const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2500;
    const ng = ctx.createGain(); env(ng.gain, time, 0.25, 0.0005, 0.015); n.connect(hp).connect(ng).connect(pan);
  } else if (type === 'tom') {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(220, time); o.frequency.exponentialRampToValueAtTime(130, time + 0.18);
    const g = ctx.createGain(); env(g.gain, time, 0.7, 0.001, 0.3);
    o.connect(g).connect(pan); o.start(time); o.stop(time + 0.4);
  } else { // rimshot
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1700;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 460;
    const g = ctx.createGain(); env(g.gain, time, 0.45, 0.0005, 0.035);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 350;
    o.connect(g); o2.connect(g); g.connect(hp).connect(pan);
    o.start(time); o2.start(time); o.stop(time + 0.08); o2.stop(time + 0.08);
    sendTo(g, reverbSend, 0.2);
  }
}

// ---------- Synthé ----------

const shaperCache = new Map();
function driveCurve(amount) {
  const k = Math.round(amount * 100);
  if (shaperCache.has(k)) return shaperCache.get(k);
  const n = 1024, curve = new Float32Array(n), a = 1 + amount * 20;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(a * x) / Math.tanh(a);
  }
  shaperCache.set(k, curve);
  return curve;
}

/**
 * Joue une note de synthé.
 * @param {object} p paramètres (voir data/presets.js)
 * @param {number} midi note MIDI
 * @param {number} time début (secondes, horloge AudioContext)
 * @param {number|null} dur durée en secondes, null = tenue (renvoie release())
 * @param {number} vel 0..1
 * @param {{fromMidi?:number, send?:number}} opts send = réverbe (sinon valeur du preset)
 */
export function playSynth(p, midi, time, dur = 0.3, vel = 0.8, opts = {}) {
  if (!ctx) return { release() {} };
  time = Math.max(time, ctx.currentTime);
  const nodes = [];
  const vg = ctx.createGain();
  const slope = p.filter.slope === 24 ? 2 : 1;
  const filters = Array.from({ length: slope }, () => {
    const f = ctx.createBiquadFilter();
    f.type = p.filter.type || 'lowpass';
    f.Q.value = slope === 2 ? Math.max(0.5, (p.filter.q ?? 1) * 0.7) : (p.filter.q ?? 1);
    return f;
  });
  filters.reduce((a, b) => { a.connect(b); return b; });
  const fIn = filters[0], fOut = filters[filters.length - 1];
  // Suivi de vélocité : jouer plus fort ouvre un peu le filtre (comme un vrai synthé)
  const cutoff = Math.min(18000, Math.max(40, p.filter.cutoff * Math.pow(2, (vel - 0.75) * 0.8)));

  let last = fOut;
  if (p.drive > 0) {
    const sh = ctx.createWaveShaper();
    sh.curve = driveCurve(p.drive);
    sh.oversample = '2x';
    fOut.connect(sh);
    last = sh;
  }
  last.connect(vg);
  vg.connect(synthBus);
  sendTo(vg, reverbSend, opts.send ?? p.reverb ?? 0.2);
  sendTo(vg, delaySend, p.delay || 0);
  sendTo(vg, chorusSend, p.chorus || 0);

  const glide = p.glide > 0 && opts.fromMidi != null;
  const width = p.width ?? 0.5;
  const pe = p.pitchEnv;
  const addOsc = (wave, m, detuneCents, level, pan) => {
    const o = ctx.createOscillator();
    o.type = wave;
    if (glide) {
      o.frequency.setValueAtTime(midiToFreq(opts.fromMidi + (m - midi)), time);
      o.frequency.exponentialRampToValueAtTime(midiToFreq(m), time + p.glide);
    } else {
      o.frequency.setValueAtTime(midiToFreq(m), time);
    }
    if (pe && pe.amt) {
      o.detune.setValueAtTime(detuneCents + pe.amt * 100, time);
      o.detune.setTargetAtTime(detuneCents, time, Math.max(0.003, pe.decay / 3));
    } else o.detune.value = detuneCents;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g);
    if (pan) {
      const pn = ctx.createStereoPanner(); pn.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(pn).connect(fIn);
    } else g.connect(fIn);
    nodes.push(o);
    return o;
  };

  const oscs = [];
  const oscA = [];
  p.osc.forEach((osc, oi) => {
    if ((osc.level ?? 1) <= 0.001) return;
    const voices = Math.max(1, osc.voices || 1);
    for (let v = 0; v < voices; v++) {
      const spread = voices === 1 ? 0 : (v / (voices - 1)) * 2 - 1;
      // Unison : voix réparties en stéréo (alternance gauche/droite)
      const pan = voices === 1 ? 0 : spread * width;
      const o = addOsc(osc.wave, midi + (osc.semi || 0), spread * (osc.detune || 0) + (Math.random() - 0.5) * 2, (osc.level ?? 1) / Math.sqrt(voices), pan);
      oscs.push(o);
      if (oi === 0) oscA.push(o);
    }
  });
  if (p.sub > 0) addOsc('sine', midi - 12, 0, p.sub, 0);

  // FM : un modulateur sinus fait varier la fréquence de l'osc A (cloches, e-piano, basses FM)
  const fm = p.fm;
  if (fm && fm.index > 0 && oscA.length) {
    const mod = ctx.createOscillator();
    const f0 = midiToFreq(midi + (p.osc[0].semi || 0));
    mod.frequency.value = f0 * (fm.ratio || 1);
    const mg = ctx.createGain();
    const depth = f0 * fm.index * (0.5 + 0.5 * vel);
    mg.gain.setValueAtTime(depth, time);
    mg.gain.setTargetAtTime(depth * (fm.sustain ?? 0.15), time, Math.max(0.01, (fm.decay ?? 0.4) / 3));
    mod.connect(mg);
    oscA.forEach((o) => mg.connect(o.frequency));
    nodes.push(mod);
  }

  // Couche de bruit (souffle, attaque)
  if (p.noise > 0) {
    const n = noise(time, (dur ?? 4) + (p.amp.r || 0.2) + 0.2);
    const ng = ctx.createGain(); ng.gain.value = p.noise * 0.5;
    n.connect(ng).connect(fIn);
  }

  // Enveloppe de filtre (envAmt en octaves au-dessus du cutoff)
  const fe = p.fenv, amt = p.filter.envAmt || 0;
  const peak = Math.min(18000, cutoff * Math.pow(2, amt));
  const sus = Math.min(18000, cutoff * Math.pow(2, amt * fe.s));
  filters.forEach((f) => {
    f.frequency.setValueAtTime(cutoff, time);
    if (amt) {
      f.frequency.linearRampToValueAtTime(peak, time + Math.max(0.001, fe.a));
      f.frequency.setTargetAtTime(sus, time + fe.a, Math.max(0.005, fe.d / 3));
    }
  });

  // Enveloppe d'amplitude
  const a = p.amp, level = p.gain * (0.35 + 0.65 * vel);
  vg.gain.setValueAtTime(0.0001, time);
  vg.gain.linearRampToValueAtTime(level, time + Math.max(0.0015, a.a));
  vg.gain.setTargetAtTime(Math.max(0.0001, level * a.s), time + a.a, Math.max(0.005, a.d / 3));

  // LFO
  let lfo = null;
  if (p.lfo && p.lfo.target !== 'none' && p.lfo.depth > 0) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = p.lfo.rate;
    const lg = ctx.createGain();
    if (p.lfo.target === 'cutoff') { lg.gain.value = cutoff * p.lfo.depth; filters.forEach((f) => lg.connect(f.frequency)); }
    else if (p.lfo.target === 'pitch') { lg.gain.value = 100 * p.lfo.depth; oscs.forEach((o) => lg.connect(o.detune)); }
    else if (p.lfo.target === 'amp') { lg.gain.value = level * p.lfo.depth * 0.5; lg.connect(vg.gain); }
    lfo.connect(lg);
    lfo.start(time);
  }

  nodes.forEach((n) => n.start(time));
  const allNodes = lfo ? [...nodes, lfo] : nodes;

  let released = false;
  const release = (t = ctx.currentTime) => {
    if (released) return;
    released = true;
    t = Math.max(t, time + 0.005);
    vg.gain.cancelScheduledValues(t);
    vg.gain.setValueAtTime(vg.gain.value || level * a.s, t);
    vg.gain.setTargetAtTime(0.0001, t, Math.max(0.005, a.r / 4));
    filters.forEach((f) => f.frequency.setTargetAtTime(cutoff, t, Math.max(0.01, fe.r / 4)));
    allNodes.forEach((n) => { try { n.stop(t + a.r * 1.5 + 0.2); } catch (e) { /* déjà stoppé */ } });
  };
  if (dur != null) {
    // Relâchement programmé : on évite cancelScheduledValues dans le futur (bug Safari) en utilisant setTargetAtTime.
    const t = time + dur;
    vg.gain.setTargetAtTime(0.0001, t, Math.max(0.005, a.r / 4));
    allNodes.forEach((n) => n.stop(t + a.r * 1.5 + 0.3));
    released = true;
  }
  return { release };
}

// ---------- Transport ----------

/**
 * Séquenceur à « lookahead » : programme les pas ~120 ms à l'avance (précision sample).
 * onStep(step, time, stepDur) programme l'audio ; onVisual(step) est appelé au bon moment pour l'UI.
 */
class Transport {
  constructor() {
    this.bpm = 120;
    this.swing = 0;
    this.playing = false;
    this.timer = null;
    this.step = 0;
    this.onStep = null;
    this.onVisual = null;
    this.onStop = null;
  }

  get stepDur() {
    return 60 / this.bpm / 4;
  }

  start(onStep, onVisual, { bpm, swing } = {}) {
    ensureAudio();
    this.stop();
    if (bpm) this.bpm = bpm;
    if (swing != null) this.swing = swing;
    setTempo(this.bpm);
    this.onStep = onStep;
    this.onVisual = onVisual;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.playing = true;
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  tick() {
    if (this.bpm !== tempo) setTempo(this.bpm);
    while (this.playing && this.nextTime < ctx.currentTime + 0.12) {
      const dur = this.stepDur;
      const t = this.nextTime + (this.step % 2 === 1 ? this.swing * dur * 0.66 : 0);
      const s = this.step;
      this.onStep?.(s, t, dur);
      if (this.onVisual) {
        const delay = Math.max(0, (t - ctx.currentTime) * 1000);
        setTimeout(() => { if (this.playing) this.onVisual?.(s); }, delay);
      }
      this.nextTime += dur;
      this.step++;
    }
  }

  stop() {
    const was = this.playing;
    if (was) resetMasterFilter();
    this.playing = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (was) this.onStop?.();
    this.onStop = null;
  }
}

export const transport = new Transport();
