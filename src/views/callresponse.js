// Call & Response : l'app joue une phrase (appel), tu réponds en rythme sur la mesure suivante.
// « Répète » = copie exacte (oreille + précision) ; « Improvise » = réponse musicale libre, notée.
import { el, card, header, segmented, select, finishExercise, showsHints, toast } from '../ui.js';
import { level } from '../store.js';
import { genPhrase, scoreRepeat, scoreImprov, quantizeHits, KINDS } from '../core/phrase.js';
import { slotChord, midiToName, SCALES } from '../core/theory.js';
import { gridFromPatterns } from '../core/rhythm.js';
import { transport, playDrum, playSynth, playClick, ensureAudio, now, kitForGenre, outputLatency } from '../core/audio.js';
import { presetParams } from '../player.js';
import { GENRES, genreById } from '../data/genres.js';
import { keyboard } from './synth.js';
import { onMidi, drumForNote, midiStatus } from '../midiin.js';

const ROUNDS = 4;
const PADS = [
  { id: 'kick', name: 'Kick', color: '#ff5d73' }, { id: 'snare', name: 'Snare', color: '#ffb84d' },
  { id: 'hat', name: 'Hat', color: '#5ce1e6' }, { id: 'clap', name: 'Clap', color: '#ffe066' },
];
const DRUM_NAMES = { kick: 'K', snare: 'S', hat: 'H', clap: 'C', ohat: 'O', perc: 'P' };

export function render(root, params) {
  const st = {
    kind: KINDS[params.kind] ? params.kind : 'melody',
    mode: params.mode === 'improv' ? 'improv' : 'repeat',
    genre: params.genre ? genreById(params.genre).id : GENRES[Math.floor(Math.random() * GENRES.length)].id,
  };
  root.append(header('🔁 Call & Response', 'L’app joue une phrase, tu réponds en rythme sur la mesure suivante. Au clavier, aux pads ou sur ton MPC.'));
  const host = el('div');
  root.append(host);
  let cleanup = null;

  const setup = () => {
    cleanup?.(); cleanup = null;
    host.replaceChildren(card(
      el('div.ctrl-row', el('label', 'Quoi'), segmented(Object.entries(KINDS).map(([k, v]) => ({ value: k, label: `${v.emoji} ${v.name}` })), st.kind, (v) => { st.kind = v; })),
      el('div.ctrl-row', el('label', 'Mode'), segmented([{ value: 'repeat', label: '🪞 Répète' }, { value: 'improv', label: '💬 Improvise' }], st.mode, (v) => { st.mode = v; })),
      el('div.ctrl-row', el('label', 'Style'), select(GENRES.map((g) => ({ value: g.id, label: `${g.emoji} ${g.name}` })), st.genre, (v) => { st.genre = v; })),
      el('div.lesson', el('div.lesson-title', 'Comment ça marche'),
        el('p', `1 mesure de décompte, puis ${ROUNDS} manches : mesure 1 = l’appel (écoute), mesure 2 = ta réponse (joue !).`),
        el('p.small.muted', midiStatus().state === 'connected'
          ? '🎹 Clavier MIDI détecté : joue directement sur ton MPC Key 37 (touches ou pads).'
          : 'Joue sur le clavier / les pads à l’écran (ou branche ton MPC Key 37, détection automatique).')),
      el('button.btn.primary.big.wide', { onclick: () => { ensureAudio(); cleanup = play(host, st, setup); } }, '▶ Démarrer'),
    ));
  };
  setup();
  return () => cleanup?.();
}

function play(host, st, backToSetup) {
  const lv = level();
  const g = genreById(st.genre);
  const bpm = Math.round(Math.max(80, Math.min(lv < 4 ? 110 : 126, g.bpm > 150 ? g.bpm / 2 : g.bpm)));
  const sd = 60 / bpm / 4;
  const chords = g.prog.map((slot) => slotChord(g.rootPc, g.scale, slot, 3));
  const voicing = (c) => c.pcs.map((pc) => 60 + ((pc - 60) % 12 + 12) % 12);
  const phrases = Array.from({ length: ROUNDS }, (_, r) => genPhrase({ kind: st.kind, rootPc: g.rootPc, scale: g.scale, chordPcs: chords[r % 4].pcs, level: lv }));
  const drums = gridFromPatterns(g.drums);
  const kit = kitForGenre(g.id);
  const lead = presetParams(st.kind === 'bass' ? 'pluckbass' : 'pluck');
  const pad = presetParams('pad');
  const hits = [];
  const respStart = [];
  const results = [];
  const hints = showsHints();

  // ---------- UI ----------
  const banner = el('div.cr-banner', 'Prêt…');
  const beatBar = el('div.cr-beats', Array.from({ length: 4 }, () => el('span')));
  const roundInfo = el('p.small.muted', { style: { textAlign: 'center' } }, `${g.emoji} ${g.name} · ${bpm} BPM · ${KINDS[st.kind].name} · ${st.mode === 'repeat' ? 'Répète' : 'Improvise'}`);
  const lanes = el('div');
  const resultsEl = el('div');

  const input = (sound) => {
    hits.push({ t: now() - outputLatency(), ...sound });
  };
  let kb = null;
  let inputNode;
  if (st.kind === 'rhythm') {
    inputNode = el('div.pads', PADS.map((p) => el('button.pad', {
      style: { '--c': p.color },
      onpointerdown: (e) => { e.preventDefault(); ensureAudio(); playDrum(p.id, 0, 1, kit); input({ id: p.id }); },
    }, p.name)));
  } else {
    const held = new Map();
    kb = keyboard({
      base: st.kind === 'bass' ? 36 : 48, octaves: 2,
      onDown: (m) => { ensureAudio(); held.set(m, playSynth(lead, m, now(), null, 0.85, { send: 0.15 })); input({ n: m }); },
      onUp: (m) => { held.get(m)?.release(); held.delete(m); },
    });
    inputNode = kb.node;
  }
  const midiVoices = new Map();
  const offMidi = onMidi({
    noteOn: (n, v) => {
      ensureAudio();
      if (st.kind === 'rhythm') {
        const id = drumForNote(n) || ['kick', 'snare', 'hat', 'clap'][n % 4];
        playDrum(id, 0, Math.max(0.3, v), kit);
        input({ id: id === 'ohat' ? 'hat' : id === 'perc' ? 'clap' : id });
      } else {
        midiVoices.get(n)?.release();
        midiVoices.set(n, playSynth(lead, n, now(), null, v, { send: 0.15 }));
        kb?.light(n, true);
        input({ n });
      }
    },
    noteOff: (n) => { midiVoices.get(n)?.release(); midiVoices.delete(n); kb?.light(n, false); },
  });

  host.replaceChildren(card(roundInfo, banner, beatBar, lanes, inputNode, resultsEl,
    el('div.row.gap.wrap.center', { style: { marginTop: '10px' } }, el('button.btn.small', { onclick: () => { stop(); backToSetup(); } }, '⚙️ Réglages'))));

  const label = (x) => (st.kind === 'rhythm' ? DRUM_NAMES[x.id] : midiToName(x.n).replace(/-?\d+$/, ''));
  const lane = (title, notes, cls = () => '') => el('div.cr-lane', el('span.cr-lane-title', title),
    Array.from({ length: 16 }, (_, s) => {
      const n = notes.find((x) => x.s === s);
      return el('span.cr-cell' + (s % 4 === 0 ? '.beat' : '') + (n ? '.on' + cls(n) : ''), n ? label(n) : '');
    }));

  const evaluate = (r) => {
    const call = phrases[r];
    // Frappes de la mesure de réponse, calées sur la double-croche la plus proche
    const response = quantizeHits(hits, respStart[r], sd).map((h) => ({ s: h.s, n: h.n, id: h.id }));
    let res;
    if (st.mode === 'repeat') res = scoreRepeat(st.kind, call, response);
    else res = scoreImprov(st.kind, call, response, { rootPc: g.rootPc, chordPcs: chords[r % 4].pcs, scaleSteps: SCALES[g.scale].steps });
    results.push({ ...res, call, response });
    const cls = st.mode === 'repeat' ? (() => { const d = res.detail; const m = {}; call.forEach((c, i) => { m[c.s] = d[i]; }); return (n) => (m[n.s] === 'ok' ? '.ok' : m[n.s] === 'late' ? '.late' : '.miss'); })() : () => '';
    resultsEl.prepend(el('div.cr-result',
      el('div.row.between', el('b', `Manche ${r + 1}`), el('b', { style: { color: res.score >= 80 ? 'var(--good)' : res.score >= 50 ? 'var(--warn)' : 'var(--bad)' } }, `${res.score}%`)),
      lane('Appel', call, cls), lane('Toi', response),
      res.tips?.length ? el('p.small.muted', res.tips[0]) : null));
    if (r === ROUNDS - 1) setTimeout(finish, 400);
  };

  const finish = () => {
    stop();
    const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length));
    finishExercise({
      key: `cr:${st.mode}`, title: `Call & Response · ${KINDS[st.kind].name}`, score: avg, xp: 12 + avg * 0.35,
      skill: KINDS[st.kind].skill, genre: g.id, success: avg >= 70,
      lesson: st.mode === 'repeat'
        ? 'Rejouer une phrase entendue relie ton oreille à tes doigts. Concentre-toi d’abord sur le rythme, puis sur les hauteurs.'
        : 'Une bonne réponse reprend un élément de l’appel (le rythme, une note) et change autre chose. C’est le principe de toute conversation musicale : lead ↔ basse, couplet ↔ refrain.',
      transfer: 'Sur le MPC Key 37 : enregistre une boucle de 2 mesures, mesure 1 = une phrase, mesure 2 = vide. Puis improvise des réponses en Overdub pendant 5 minutes et garde la meilleure.',
      onRetry: () => { cleanup(); backToSetup(); },
    });
  };

  // ---------- Séquence ----------
  const total = 16 + ROUNDS * 32;
  transport.start((step, time) => {
    if (step >= total) { transport.onStep = null; return; }
    if (step < 16) {
      if (step % 4 === 0) playClick(time, step === 0);
      return;
    }
    const k = step - 16, r = Math.floor(k / 32), local = k % 32, s = local % 16;
    const chord = chords[r % 4];
    // Accompagnement discret : pad + kick/hats (le rythme d'appel reste lisible)
    if (s === 0) voicing(chord).forEach((n) => playSynth(pad, n - 12, time, sd * 15.5, 0.35, { send: 0.3 }));
    if (drums.kick[s] && st.kind !== 'rhythm') playDrum('kick', time, 0.55, kit);
    if (drums.hat[s] || drums.ohat[s]) playDrum('hat', time, st.kind === 'rhythm' ? 0.25 : 0.35, kit);
    if (local < 16) {
      phrases[r].filter((x) => x.s === s).forEach((x) => {
        if (st.kind === 'rhythm') playDrum(x.id, time, 1, kit);
        else playSynth(lead, x.n, time, x.len * sd * 0.9, 0.9, { send: 0.2 });
      });
    } else {
      if (s === 0) respStart[r] = time;
      if (s === 15) setTimeout(() => evaluate(r), Math.max(0, (time + sd - now()) * 1000) + 30);
    }
  }, (step) => {
    const spans = beatBar.children;
    for (let i = 0; i < 4; i++) spans[i].classList.toggle('on', i === Math.floor((step % 16) / 4));
    if (step >= total) return;
    if (step < 16) { banner.textContent = `Décompte… ${Math.floor(step / 4) + 1}`; banner.className = 'cr-banner'; return; }
    const k = step - 16, r = Math.floor(k / 32), local = k % 32;
    if (local === 0) {
      banner.textContent = `👂 Manche ${r + 1}/${ROUNDS} : écoute`; banner.className = 'cr-banner listen';
      lanes.replaceChildren();
    }
    if (local === 16) {
      banner.textContent = st.mode === 'repeat' ? '🎹 À toi : répète !' : '🎹 À toi : réponds !'; banner.className = 'cr-banner play';
      if (hints && lv < 3 && st.mode === 'repeat') lanes.replaceChildren(lane('Appel', phrases[r])); // petites roues pour débuter
    }
  }, { bpm, swing: 0 });

  const stop = () => { transport.stop(); };
  const cleanup = () => { stop(); offMidi(); kb?.destroy(); midiVoices.forEach((v) => v.release()); };
  toast(st.mode === 'repeat' ? 'Écoute l’appel, puis rejoue-le à l’identique' : 'Écoute l’appel, puis invente une réponse', 'info', 2500);
  return cleanup;
}
