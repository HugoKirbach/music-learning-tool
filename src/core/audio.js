// Moteur audio Web Audio : batterie synthétisée, synthé soustractif polyphonique, transport précis.
import { midiToFreq } from './theory.js';

let ctx = null;
let master, comp, reverb, reverbSend, drumBus, synthBus, masterFilter;
let noiseBuf = null;
let openHat = null;
let volume = 0.8;

export function audioReady() {
  return !!ctx;
}

/** À appeler depuis un geste utilisateur (contrainte iOS / Chrome). */
export function ensureAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC({ latencyHint: 'interactive' });
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;
    master = ctx.createGain();
    master.gain.value = volume;
    comp.connect(master).connect(ctx.destination);

    // Filtre master (arrangement : filtre qui s'ouvre / se ferme sur tout le mix)
    masterFilter = ctx.createBiquadFilter();
    masterFilter.type = 'lowpass';
    masterFilter.frequency.value = 20000;
    masterFilter.Q.value = 0.9;
    masterFilter.connect(comp);
    drumBus = ctx.createGain();
    drumBus.gain.value = 0.9;
    drumBus.connect(masterFilter);
    synthBus = ctx.createGain();
    synthBus.gain.value = 0.9;
    synthBus.connect(masterFilter);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.4, 2.5);
    reverbSend = ctx.createGain();
    reverbSend.gain.value = 0.35;
    reverbSend.connect(reverb).connect(comp);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
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

function makeImpulse(seconds, decay) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function noise(time, dur) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  src.start(time, Math.random() * 0.5);
  src.stop(time + dur + 0.05);
  return src;
}

function env(param, time, peak, attack, decay, floor = 0.0001) {
  param.cancelScheduledValues(time);
  param.setValueAtTime(floor, time);
  param.linearRampToValueAtTime(peak, time + attack);
  param.exponentialRampToValueAtTime(floor, time + attack + decay);
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
  if (!ctx) return;
  masterFilter.frequency.cancelScheduledValues(ctx.currentTime);
  masterFilter.frequency.setValueAtTime(20000, ctx.currentTime);
}

/** Riser : bruit filtré qui monte (montée de tension avant un drop). */
export function playRiser(time, dur) {
  if (!ctx) return;
  const n = noise(time, dur);
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.Q.value = 4;
  bp.frequency.setValueAtTime(300, time);
  bp.frequency.exponentialRampToValueAtTime(9000, time + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(0.5, time + dur * 0.95);
  g.gain.linearRampToValueAtTime(0.0001, time + dur);
  n.connect(bp).connect(g).connect(comp);
  const s = ctx.createGain(); s.gain.value = 0.3; g.connect(s).connect(reverbSend);
}

/** Clic de métronome (accent sur le premier temps). */
export function playClick(time, accent = false) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = accent ? 1600 : 1000;
  env(g.gain, time, accent ? 0.35 : 0.2, 0.001, 0.05);
  o.connect(g).connect(comp);
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
  club: { kickPitch: 150, kickEnd: 48, kickDecay: 0.42, snareTone: 190, hatDecay: 0.045, clapDecay: 0.18 },
  k808: { kickPitch: 120, kickEnd: 42, kickDecay: 0.9, snareTone: 220, hatDecay: 0.035, clapDecay: 0.22 },
  acoustic: { kickPitch: 110, kickEnd: 55, kickDecay: 0.3, snareTone: 200, hatDecay: 0.06, clapDecay: 0.15 },
  hard: { kickPitch: 190, kickEnd: 45, kickDecay: 0.5, snareTone: 180, hatDecay: 0.04, clapDecay: 0.2 },
};

export function kitForGenre(id) {
  if (['trap', 'reggaeton', 'afrobeats', 'jersey'].includes(id)) return 'k808';
  if (['lofi', 'funk', 'bossa', 'jungle'].includes(id)) return 'acoustic';
  if (['techno', 'acid', 'dubstep'].includes(id)) return 'hard';
  return 'club';
}

export function playDrum(id, time, vel = 1, kitId = 'club') {
  if (!ctx) return;
  const kit = KITS[kitId] || KITS.club;
  const out = ctx.createGain();
  out.gain.value = vel;
  out.connect(drumBus);
  switch (id) {
    case 'kick': {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(kit.kickPitch, time);
      o.frequency.exponentialRampToValueAtTime(kit.kickEnd, time + 0.11);
      env(g.gain, time, 1, 0.002, kit.kickDecay);
      o.connect(g).connect(out);
      o.start(time);
      o.stop(time + kit.kickDecay + 0.1);
      const click = noise(time, 0.01);
      const cg = ctx.createGain();
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 2000;
      env(cg.gain, time, 0.25, 0.0005, 0.008);
      click.connect(hp).connect(cg).connect(out);
      break;
    }
    case 'snare': {
      const n = noise(time, 0.25);
      const bp = ctx.createBiquadFilter();
      bp.type = 'highpass'; bp.frequency.value = 1200;
      const g = ctx.createGain();
      env(g.gain, time, 0.7, 0.001, 0.2);
      n.connect(bp).connect(g).connect(out);
      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(kit.snareTone, time);
      o.frequency.exponentialRampToValueAtTime(kit.snareTone * 0.75, time + 0.08);
      env(og.gain, time, 0.6, 0.001, 0.1);
      o.connect(og).connect(out);
      o.start(time); o.stop(time + 0.2);
      break;
    }
    case 'clap': {
      const n = noise(time, kit.clapDecay + 0.05);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, time);
      [0, 0.011, 0.022].forEach((dt) => {
        g.gain.setValueAtTime(0.9, time + dt);
        g.gain.exponentialRampToValueAtTime(0.1, time + dt + 0.009);
      });
      g.gain.setValueAtTime(0.7, time + 0.031);
      g.gain.exponentialRampToValueAtTime(0.0001, time + 0.031 + kit.clapDecay);
      n.connect(bp).connect(g).connect(out);
      const s = ctx.createGain(); s.gain.value = 0.15; g.connect(s).connect(reverbSend);
      break;
    }
    case 'hat':
    case 'ohat': {
      if (openHat) { // choke : le hat fermé coupe le hat ouvert
        try { openHat.gain.cancelScheduledValues(time); openHat.gain.setTargetAtTime(0.0001, time, 0.01); } catch (e) { /* noop */ }
        openHat = null;
      }
      const dec = id === 'hat' ? kit.hatDecay : 0.32;
      const n = noise(time, dec + 0.05);
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass'; hp.frequency.value = 7500;
      const pk = ctx.createBiquadFilter();
      pk.type = 'peaking'; pk.frequency.value = 10000; pk.gain.value = 6;
      const g = ctx.createGain();
      env(g.gain, time, id === 'hat' ? 0.45 : 0.35, 0.001, dec);
      n.connect(hp).connect(pk).connect(g).connect(out);
      if (id === 'ohat') openHat = g;
      break;
    }
    case 'perc': {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(560, time);
      o.frequency.exponentialRampToValueAtTime(420, time + 0.05);
      env(g.gain, time, 0.6, 0.001, 0.12);
      o.connect(g).connect(out);
      o.start(time); o.stop(time + 0.2);
      const n = noise(time, 0.03);
      const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200;
      const ng = ctx.createGain();
      env(ng.gain, time, 0.35, 0.0005, 0.025);
      n.connect(hp).connect(ng).connect(out);
      break;
    }
    default: break;
  }
}

// ---------- Synthé ----------

let shaperCache = new Map();
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
 * @param {{fromMidi?:number, send?:number}} opts
 */
export function playSynth(p, midi, time, dur = 0.3, vel = 0.8, opts = {}) {
  if (!ctx) return { release() {} };
  time = Math.max(time, ctx.currentTime);
  const nodes = [];
  const vg = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = p.filter.type || 'lowpass';
  filter.Q.value = p.filter.q ?? 1;
  const cutoff = Math.min(18000, Math.max(40, p.filter.cutoff));

  let last = filter;
  if (p.drive > 0) {
    const sh = ctx.createWaveShaper();
    sh.curve = driveCurve(p.drive);
    sh.oversample = '2x';
    filter.connect(sh);
    last = sh;
  }
  last.connect(vg);
  vg.connect(synthBus);
  const send = opts.send ?? 0.2;
  if (send > 0) {
    const sg = ctx.createGain();
    sg.gain.value = send;
    vg.connect(sg).connect(reverbSend);
  }

  const glide = p.glide > 0 && opts.fromMidi != null;
  const addOsc = (wave, m, detuneCents, level) => {
    const o = ctx.createOscillator();
    o.type = wave;
    if (glide) {
      o.frequency.setValueAtTime(midiToFreq(opts.fromMidi + (m - midi)), time);
      o.frequency.exponentialRampToValueAtTime(midiToFreq(m), time + p.glide);
    } else {
      o.frequency.setValueAtTime(midiToFreq(m), time);
    }
    o.detune.value = detuneCents;
    const g = ctx.createGain();
    g.gain.value = level;
    o.connect(g).connect(filter);
    nodes.push(o);
    return o;
  };

  const oscs = [];
  for (const osc of p.osc) {
    const voices = Math.max(1, osc.voices || 1);
    for (let v = 0; v < voices; v++) {
      const spread = voices === 1 ? 0 : (v / (voices - 1)) * 2 - 1;
      oscs.push(addOsc(osc.wave, midi + (osc.semi || 0), spread * (osc.detune || 0), (osc.level ?? 1) / Math.sqrt(voices)));
    }
  }
  if (p.sub > 0) addOsc('sine', midi - 12, 0, p.sub);

  // Enveloppe de filtre (envAmt en octaves au-dessus du cutoff)
  const fe = p.fenv, amt = p.filter.envAmt || 0;
  const peak = Math.min(18000, cutoff * Math.pow(2, amt));
  const sus = Math.min(18000, cutoff * Math.pow(2, amt * fe.s));
  filter.frequency.setValueAtTime(cutoff, time);
  if (amt) {
    filter.frequency.linearRampToValueAtTime(peak, time + Math.max(0.001, fe.a));
    filter.frequency.setTargetAtTime(sus, time + fe.a, Math.max(0.005, fe.d / 3));
  }

  // Enveloppe d'amplitude
  const a = p.amp, level = p.gain * (0.35 + 0.65 * vel);
  vg.gain.setValueAtTime(0.0001, time);
  vg.gain.linearRampToValueAtTime(level, time + Math.max(0.001, a.a));
  vg.gain.setTargetAtTime(Math.max(0.0001, level * a.s), time + a.a, Math.max(0.005, a.d / 3));

  // LFO
  let lfo = null;
  if (p.lfo && p.lfo.target !== 'none' && p.lfo.depth > 0) {
    lfo = ctx.createOscillator();
    lfo.frequency.value = p.lfo.rate;
    const lg = ctx.createGain();
    if (p.lfo.target === 'cutoff') { lg.gain.value = cutoff * p.lfo.depth; lg.connect(filter.frequency); }
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
    filter.frequency.setTargetAtTime(cutoff, t, Math.max(0.01, fe.r / 4));
    allNodes.forEach((n) => { try { n.stop(t + a.r + 0.2); } catch (e) { /* déjà stoppé */ } });
  };
  if (dur != null) {
    // Relâchement programmé : on évite cancelScheduledValues dans le futur (bug Safari) en utilisant setTargetAtTime.
    const t = time + dur;
    vg.gain.setTargetAtTime(0.0001, t, Math.max(0.005, a.r / 4));
    allNodes.forEach((n) => n.stop(t + a.r + 0.3));
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
    this.onStep = onStep;
    this.onVisual = onVisual;
    this.step = 0;
    this.nextTime = ctx.currentTime + 0.06;
    this.playing = true;
    this.timer = setInterval(() => this.tick(), 25);
    this.tick();
  }

  tick() {
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
