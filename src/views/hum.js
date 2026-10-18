// Fredonne → MIDI : chante ou siffle une idée sur ta boucle, l'app la transcrit en notes calées sur la gamme et le tempo.
import { el, card, header, segmented, finishExercise, toast, downloadMidi } from '../ui.js';
import { getState, update } from '../store.js';
import { humToNotes, fitRange, freqToMidiF } from '../core/hum.js';
import { yin } from '../core/extract.js';
import { genPhrase, scoreImprov } from '../core/phrase.js';
import { analyzeMelody, catchyLabel } from '../core/catchy.js';
import { voiceProgression, eventsAt, MELODY_STEPS } from '../core/arrange.js';
import { transport, ensureAudio, playSynth, playClick, now, outputLatency } from '../core/audio.js';
import { playEvents, presetParams } from '../player.js';
import { midiToName, NOTE_NAMES, SCALES, mod } from '../core/theory.js';

export function render(root, params) {
  const mode = params.mode === 'response' ? 'response' : 'free';
  const P = () => getState().project;
  let stream = null, analyser = null, buf = null, poll = null;
  let frames = [], recStart = null, recording = false;
  let bars = 2, backing = true, result = null;

  root.append(header('🎤 Fredonne → MIDI', mode === 'response' ? 'L’app chante une phrase, tu chantes la réponse' : 'Chante ou siffle une idée : l’app la transcrit en notes sur ta boucle'));
  root.append(el('div.row.gap.wrap', { style: { marginBottom: '10px' } },
    segmented([{ value: 'free', label: '💡 Capturer une idée' }, { value: 'response', label: '💬 Chante la réponse' }], mode, (v) => { location.hash = `#/hum?mode=${v}`; })));

  const tuner = el('div.tuner', el('div.tuner-note', '—'), el('div.tuner-bar', el('span')), el('div.small.muted', 'Chante une note tenue pour tester'));
  const status = el('div.cr-banner', 'Micro inactif');
  const out = el('div');
  const micBtn = el('button.btn.primary', { onclick: () => startMic() }, '🎤 Activer le micro');

  // ---------- Micro et suivi de hauteur ----------
  async function startMic() {
    const ctx = ensureAudio();
    if (!navigator.mediaDevices?.getUserMedia) { toast('Micro non disponible dans ce navigateur', 'bad'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      toast('Accès au micro refusé : autorise-le dans les réglages du site (icône 🔒)', 'bad', 5000);
      return;
    }
    const src = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
    micBtn.remove();
    status.textContent = 'Micro prêt 🎙️ — mets un casque pour que la boucle ne repasse pas dans le micro';
    poll = setInterval(sample, 12);
  }

  function sample() {
    analyser.getFloatTimeDomainData(buf);
    let e = 0;
    for (let i = 0; i < buf.length; i++) e += buf[i] * buf[i];
    const rms = Math.sqrt(e / buf.length);
    const sr = analyser.context.sampleRate;
    const r = rms > 0.01 ? yin(buf, 0, buf.length, sr, 70, 1100, 0.15) : { f0: 0, conf: 0 };
    // Accordeur en direct
    if (r.f0 && r.conf > 0.75) {
      const m = freqToMidiF(r.f0), n = Math.round(m), cents = Math.round((m - n) * 100);
      tuner.children[0].textContent = midiToName(n);
      tuner.children[1].firstChild.style.left = `${50 + cents}%`;
      tuner.children[1].firstChild.style.background = Math.abs(cents) < 15 ? 'var(--good)' : 'var(--warn)';
    }
    if (recording) frames.push({ t: now() - recStart - outputLatency() - 0.02, f0: r.f0, conf: r.conf, rms });
  }

  // ---------- Enregistrement ----------
  function record() {
    if (!analyser) return toast('Active d’abord le micro', 'bad');
    const p = P();
    const voiced = voiceProgression(p);
    const sd = 60 / p.bpm / 4;
    const rounds = mode === 'response' ? 3 : 1;
    const calls = mode === 'response'
      ? Array.from({ length: rounds }, (_, r) => genPhrase({ kind: 'melody', rootPc: p.rootPc, scale: p.scale, chordPcs: voiced[(r * 2) % 4]?.pcs || [], level: 2 }))
      : [];
    const regionSteps = mode === 'response' ? rounds * 32 : bars * 16;
    frames = [];
    result = null;
    out.replaceChildren();
    let lastBass = null;
    const lead = presetParams('pluck');
    transport.start((step, time) => {
      if (step >= 16 + regionSteps) { transport.onStep = null; setTimeout(finishTake, Math.max(0, (time - now()) * 1000) + 150); return; }
      if (step < 16) { if (step % 4 === 0) playClick(time, step === 0); return; }
      const k = step - 16;
      if (k === 0) recStart = time;
      if (backing) {
        const ev = eventsAt(p, voiced, k);
        lastBass = playEvents({ ...p, pump: 0 }, { ...ev, melody: [] }, time, sd, { drums: true, chords: true, bass: true, melody: false }, lastBass);
      } else if (k % 4 === 0) playClick(time, k % 16 === 0);
      if (mode === 'response') {
        const r = Math.floor(k / 32), local = k % 32;
        if (local < 16) calls[r].filter((x) => x.s === local).forEach((x) => playSynth(lead, x.n, time, x.len * sd * 0.9, 0.9));
      }
    }, (step) => {
      if (step < 16) { status.textContent = `Décompte… ${Math.floor(step / 4) + 1}`; status.className = 'cr-banner'; recording = false; return; }
      recording = true;
      const k = step - 16;
      if (mode === 'response') {
        const local = k % 32;
        status.textContent = local < 16 ? `👂 Écoute (${Math.floor(k / 32) + 1}/${rounds})` : '🎤 À toi : chante la réponse !';
        status.className = 'cr-banner ' + (local < 16 ? 'listen' : 'play');
      } else {
        status.textContent = `🔴 Enregistrement — mesure ${Math.floor(k / 16) + 1}/${bars}`;
        status.className = 'cr-banner play';
      }
    }, { bpm: p.bpm, swing: 0 });

    function finishTake() {
      recording = false;
      transport.stop();
      status.textContent = 'Prise terminée ✓';
      status.className = 'cr-banner';
      const all = humToNotes(frames, { bpm: p.bpm, start: 0, steps: regionSteps, rootPc: p.rootPc, scale: p.scale });
      if (mode === 'response') showResponse(all.notes, calls, p, voiced);
      else showIdea(fitRange(all.notes, 67), p, voiced, all.voiced);
    }
  }

  // ---------- Résultats ----------
  const lanes = (notes, nBars, label = '') => el('div', Array.from({ length: nBars }, (_, bar) => el('div.cr-lane', el('span.cr-lane-title', `${label}M${bar + 1}`),
    Array.from({ length: 16 }, (_, s) => {
      const g = bar * 16 + s;
      const n = notes.find((x) => g >= x.s && g < x.s + x.len);
      return el('span.cr-cell' + (s % 4 === 0 ? '.beat' : '') + (n ? '.on' : ''), { style: n && n.s !== g ? { opacity: 0.5 } : null }, n && n.s === g ? midiToName(n.n).replace(/-?\d+$/, '') : '');
    }))));

  const playNotes = (notes, p, loopSteps) => {
    ensureAudio();
    const voiced = voiceProgression(p), sd = 60 / p.bpm / 4, lead = presetParams(p.sounds.lead);
    let lastBass = null;
    transport.start((step, time) => {
      const ev = eventsAt(p, voiced, step % 64);
      lastBass = playEvents(p, { ...ev, melody: [] }, time, sd, { drums: true, chords: true, bass: true, melody: false }, lastBass);
      notes.filter((x) => x.s === step % loopSteps).forEach((x) => playSynth(lead, x.n, time, x.len * sd * 0.92, 0.85));
    }, null, { bpm: p.bpm, swing: p.swing });
  };

  function showIdea(notes, p, voiced, voicedSteps) {
    if (notes.length < 2) {
      out.replaceChildren(card(el('div.lesson', el('div.lesson-title', 'Pas assez de notes détectées'),
        el('p', `Hauteur nette sur ${voicedSteps} doubles-croches seulement. Chante plus fort et plus « net » (« da-da » ou sifflement), casque sur les oreilles, puis recommence.`)),
        el('button.btn.primary', { onclick: record }, '↻ Recommencer')));
      return;
    }
    const mel = new Array(MELODY_STEPS).fill(null);
    notes.forEach((x) => { if (x.s < MELODY_STEPS) mel[x.s] = { n: x.n, len: x.len }; });
    const cat = analyzeMelody(mel, voiced.map((c) => c || { pcs: [] }), p.rootPc);
    const lab = catchyLabel(cat.score);
    result = { notes, cat };
    out.replaceChildren(card(
      el('div.row.between', el('h3', `🎵 ${notes.length} notes transcrites`), el('b', { style: { color: lab.color } }, `Catchy ${cat.score} · ${lab.label}`)),
      el('p.small.muted', `Calées sur ${NOTE_NAMES[p.rootPc]} ${SCALES[p.scale].name}, ${p.bpm} BPM, ramenées dans la tessiture d’un lead.`),
      lanes(notes, bars),
      cat.tips[0] ? el('div.lesson', el('div.lesson-title', 'Conseil'), el('p', cat.tips[0])) : null,
      el('div.row.gap.wrap', { style: { marginTop: '8px' } },
        el('button.btn.small', { onclick: () => playNotes(notes, p, bars * 16) }, '▶ Écouter sur la boucle'),
        el('button.btn.small', { onclick: () => transport.stop() }, '■ Stop'),
        el('button.btn.small', { onclick: () => record() }, '↻ Nouvelle prise'),
        el('button.btn.small', { onclick: () => downloadMidi(`fredonne-${p.bpm}bpm`, { bpm: p.bpm, tracks: [{ name: 'Fredonne', notes: notes.map((x) => ({ pitch: x.n, start: x.s / 4, dur: x.len / 4, vel: 100 })) }] }) }, '⬇ MIDI'),
        el('button.btn.small.primary', {
          onclick: (e) => {
            transport.stop();
            update((s) => {
              s.project.melody = mel.map((x, i) => x || null);
              s.notebook.unshift({ id: Date.now(), type: 'idea', title: 'Idée fredonnée', note: notes.map((x) => midiToName(x.n)).join(' '), date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)) });
            });
            finishExercise({ key: 'hum:free', title: 'Idée fredonnée capturée', score: cat.score, xp: 18 + cat.score / 5, skill: 'melodie', genre: p.genre, success: true,
              lesson: 'Ta voix trouve naturellement des mélodies chantables : c’est la meilleure source de hooks. Les doigts, eux, reproduisent des habitudes.',
              transfer: 'Dans Live 12 : enregistre-toi dans une piste audio puis « Convert Melody to New MIDI Track ». Ou rejoue la transcription au MPC Key 37 et ajuste les notes.' });
            e.target.replaceWith(el('a.btn.small.primary', { href: '#/melody' }, '✓ Envoyée — ouvrir le Lab Mélodie →'));
          },
        }, '→ Envoyer au Lab Mélodie'),
      ),
    ));
  }

  function showResponse(all, calls, p, voiced) {
    const results = calls.map((call, r) => {
      const resp = all.filter((x) => x.s >= r * 32 + 16 && x.s < r * 32 + 32).map((x) => ({ ...x, s: x.s - r * 32 - 16 }));
      const fitted = resp.length ? fitRange(resp, call.reduce((a, x) => a + x.n, 0) / call.length) : [];
      return { call, resp: fitted, ...scoreImprov('melody', call, fitted, { rootPc: p.rootPc, chordPcs: voiced[(r * 2) % 4]?.pcs || [], scaleSteps: SCALES[p.scale].steps }) };
    });
    const avg = Math.round(results.reduce((a, x) => a + x.score, 0) / results.length);
    out.replaceChildren(card(
      el('div.row.between', el('h3', '💬 Tes réponses chantées'), el('b', `${avg}%`)),
      results.map((x, r) => el('div.cr-result', el('div.row.between', el('b', `Manche ${r + 1}`), el('b', `${x.score}%`)),
        lanes(x.call, 1, 'Appel '), lanes(x.resp, 1, 'Toi '), x.tips[0] ? el('p.small.muted', x.tips[0]) : null)),
      el('div.row.gap.wrap', { style: { marginTop: '8px' } },
        el('button.btn.small', { onclick: record }, '↻ Rejouer'),
        el('button.btn.small.primary', {
          onclick: () => finishExercise({ key: 'hum:response', title: 'Réponses chantées', score: avg, xp: 15 + avg * 0.3, skill: 'melodie', genre: p.genre, success: avg >= 60,
            lesson: 'Chanter une réponse, c’est composer en temps réel : reprendre le rythme de l’appel, changer la fin, se poser sur une note de l’accord.',
            transfer: 'Mets une boucle de 2 mesures dans Live, chante 5 réponses différentes sur la mesure vide, garde la meilleure et rejoue-la au MPC.' }),
        }, '✓ Terminer'))));
  }

  root.append(
    card(
      el('p.small.muted', mode === 'response'
        ? 'L’app joue une phrase (1 mesure), tu chantes la réponse sur la mesure suivante, 3 fois. Casque recommandé.'
        : 'Ta boucle actuelle tourne (accords + basse + batterie) : chante ou siffle une mélodie pendant 2 ou 4 mesures. « Da-da » ou sifflement = détection plus nette.'),
      el('div.row.gap.wrap', micBtn),
      tuner,
      mode === 'free' ? el('div.ctrl-row', el('label', 'Durée'), segmented([{ value: 2, label: '2 mesures' }, { value: 4, label: '4 mesures' }], bars, (v) => { bars = v; })) : null,
      el('div.ctrl-row', el('label', 'Accompagnement'), segmented([{ value: true, label: 'Boucle' }, { value: false, label: 'Métronome seul' }], backing, (v) => { backing = v; })),
      status,
      el('button.btn.primary.big.wide', { onclick: () => record() }, '🔴 Enregistrer (après 1 mesure de décompte)'),
      el('p.small.muted', `Boucle : ${P().bpm} BPM, ${NOTE_NAMES[P().rootPc]} ${SCALES[P().scale].name}. Change-la dans les Labs (Accords / Beat).`),
    ),
    out,
  );
  return () => {
    transport.stop();
    clearInterval(poll);
    stream?.getTracks().forEach((t) => t.stop());
  };
}
