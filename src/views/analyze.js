// Analyse de référence guidée : importer un morceau, trouver BPM / tonalité / structure, relever le hook, noter 3 ingrédients.
import { el, card, header, segmented, finishExercise, toast } from '../ui.js';
import { update, projectFromGenre } from '../store.js';
import { detectBpm, detectKey, waveformPeaks, tapBpm } from '../core/audioanalysis.js';
import { decodeFile, playBuffer, playClick, playSynth, ensureAudio, now } from '../core/audio.js';
import { NOTE_NAMES, NOTE_NAMES_FR, midiToName, inScale, mod } from '../core/theory.js';
import { SECTIONS } from '../core/arrangement.js';
import { presetParams } from '../player.js';
import { keyboard } from './synth.js';
import { onMidi } from '../midiin.js';

export function render(root) {
  const st = {
    file: null, buffer: null, mono: null, peaks: null,
    bpm: null, conf: 0, offset: 0, key: null, keyAlt: [],
    markers: [], hook: [], taps: [],
    playing: null, pos: 0, loop: null, metro: false,
  };
  let raf = 0, metroTimer = null;

  root.append(header('🎧 Analyse de référence', 'Dissèque un morceau que tu aimes en 5-10 minutes : tempo, tonalité, structure, hook et 3 ingrédients à voler.', '#/studio'));

  // ---------- 1. Import ----------
  const fileIn = el('input', { type: 'file', accept: 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac', style: { display: 'none' }, onchange: (e) => e.target.files[0] && load(e.target.files[0]) });
  const drop = el('div.drop-zone', {
    onclick: () => fileIn.click(),
    ondragover: (e) => { e.preventDefault(); drop.classList.add('over'); },
    ondragleave: () => drop.classList.remove('over'),
    ondrop: (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) load(f); },
  }, el('div', { style: { fontSize: '30px' } }, '🎵'), el('b', 'Importer un morceau'), el('span.small.muted', 'MP3, WAV, M4A… (touche ici ou glisse le fichier). Rien n’est envoyé sur internet.'), fileIn);
  const linkIn = el('input', { type: 'text', placeholder: 'Lien YouTube / SoundCloud / Bandcamp (facultatif, pour mémoire)', style: { width: '100%' } });
  const titleIn = el('input', { type: 'text', placeholder: 'Artiste – Titre', style: { width: '100%', marginBottom: '6px' } });

  // ---------- 2. Lecteur + forme d'onde ----------
  const canvas = el('canvas.wave', { height: 120 });
  const posLabel = el('span.small.muted', '');
  const playBtn = el('button.btn.play', { onclick: () => (st.playing ? pause() : playAt(st.pos)) }, '▶ Lecture');
  const loopBtn = el('button.btn.small', { onclick: () => toggleLoop() }, '🔁 Boucler 4 mesures ici');
  const metroBtn = el('button.btn.small', { onclick: () => { st.metro = !st.metro; metroBtn.classList.toggle('primary', st.metro); } }, '🥁 Métronome');
  const playerCard = card(
    el('div.ctrl-row', playBtn, el('button.btn.small', { onclick: () => seek(st.pos - barDur() * 4) }, '⏪ 4 mes.'), el('button.btn.small', { onclick: () => seek(st.pos + barDur() * 4) }, '4 mes. ⏩'), loopBtn, metroBtn),
    canvas, posLabel,
    el('p.small.muted', 'Touche la forme d’onde pour te déplacer. Les traits verticaux sont les mesures (calées sur le BPM et le 1er temps).'),
  );
  playerCard.hidden = true;
  canvas.addEventListener('pointerdown', (e) => {
    if (!st.buffer) return;
    const r = canvas.getBoundingClientRect();
    seek(((e.clientX - r.left) / r.width) * st.buffer.duration);
  });

  // ---------- 3. Tempo ----------
  const bpmVal = el('b.big-val', '—');
  const bpmInfo = el('span.small.muted');
  const tapBtn = el('button.btn', {
    onpointerdown: (e) => {
      e.preventDefault();
      const t = performance.now();
      if (st.taps.length && t - st.taps[st.taps.length - 1] > 2500) st.taps = [];
      st.taps.push(t);
      const b = tapBpm(st.taps);
      tapBtn.textContent = b ? `👆 Tap (${b})` : `👆 Tap (${st.taps.length})`;
      if (b) setBpm(b, 'tap');
    },
  }, '👆 Tap tempo');
  const tempoCard = card(el('h3', '1. Tempo'),
    el('div.row.gap.wrap', bpmVal, el('span', 'BPM'), bpmInfo),
    el('div.row.gap.wrap', { style: { marginTop: '6px' } },
      tapBtn,
      el('button.btn.small', { onclick: () => st.bpm && setBpm(st.bpm / 2, 'manuel') }, '÷2'),
      el('button.btn.small', { onclick: () => st.bpm && setBpm(st.bpm * 2, 'manuel') }, '×2'),
      el('button.btn.small', { onclick: () => st.bpm && setBpm(Math.round(st.bpm), 'manuel') }, 'Arrondir'),
      el('button.btn.small', { onclick: () => { st.offset = st.pos % (60 / (st.bpm || 120)); draw(); toast('1er temps calé sur la position actuelle'); } }, '📍 Ici = un 1er temps')),
    el('p.small.muted', 'Vérifie au métronome. Si ça semble deux fois trop lent/rapide, utilise ×2 / ÷2. Tape sur le kick pour le tap tempo.'));

  // ---------- 4. Tonalité ----------
  const keyVal = el('b.big-val', '—');
  const keyInfo = el('span.small.muted');
  const keyHeld = new Map();
  const keyKb = keyboard({
    base: 48, octaves: 2,
    inScale: () => false,
    onDown: (m) => { ensureAudio(); keyHeld.set(m, playSynth(presetParams('piano'), m, now(), null, 0.8, { send: 0.2 })); addHook(m); },
    onUp: (m) => { keyHeld.get(m)?.release(); keyHeld.delete(m); },
  });
  const keyCard = card(el('h3', '2. Tonalité'), el('div.row.gap.wrap', keyVal, keyInfo),
    el('p.small.muted', 'Vérifie : joue la tonique au clavier pendant le morceau, elle doit sonner « à la maison ». Les points bleus = notes de la gamme détectée.'),
    keyKb.node);

  // ---------- 5. Structure ----------
  const markerList = el('div');
  const structCard = card(el('h3', '3. Structure'),
    el('p.small.muted', 'Pendant la lecture, touche la section qui COMMENCE : le repère se cale sur la mesure en cours.'),
    el('div.row.gap.wrap', Object.entries(SECTIONS).map(([k, v]) => el('button.btn.small', { style: { borderColor: v.color }, onclick: () => addMarker(k) }, `+ ${v.name}`))),
    markerList);

  // ---------- 6. Hook ----------
  const hookOut = el('p', '—');
  const hookCard = card(el('h3', '4. Relève le hook'),
    el('p.small.muted', 'Boucle 4 mesures sur le hook, puis retrouve ses notes au clavier ci-dessus (ou sur ton MPC Key 37). Chaque note jouée s’ajoute ici.'),
    hookOut,
    el('div.row.gap.wrap',
      el('button.btn.small', { onclick: () => { st.hook.pop(); paintHook(); } }, '⌫ Annuler'),
      el('button.btn.small', { onclick: () => { st.hook = []; paintHook(); } }, '🗑 Effacer'),
      el('button.btn.small', { onclick: () => replayHook() }, '▶ Rejouer'),
      el('button.btn.small.primary', { onclick: () => sendToMelody() }, '→ Envoyer au Lab Mélodie')));

  // ---------- 7. Ingrédients ----------
  const ing = {
    rythme: el('textarea', { placeholder: 'Rythme : ex. « kick sur 1 et 3½, snare en retard, hats swingués »' }),
    son: el('textarea', { placeholder: 'Son : ex. « basse Reese qui s’ouvre au drop, pad granulaire »' }),
    arr: el('textarea', { placeholder: 'Arrangement : ex. « break de 16 mesures sans kick, retour avec un roulement »' }),
  };
  const ingCard = card(el('h3', '5. Trois ingrédients à voler'),
    el('p.small.muted', 'Copier un morceau entier = plagiat. Voler UN ingrédient et le combiner ailleurs = influence.'),
    ing.rythme, ing.son, ing.arr,
    el('button.btn.primary.wide', { onclick: () => save() }, '✓ Enregistrer l’analyse'));

  root.append(
    card(titleIn, linkIn, drop,
      el('p.small.muted', 'Les liens YouTube/SoundCloud ne peuvent pas être analysés directement (protection des plateformes) : importe un fichier que tu possèdes (Bandcamp, Beatport, tes propres exports…). Sans fichier, tu peux tout de même faire le tap tempo, la tonalité au clavier, le hook et les ingrédients en écoutant dans un autre onglet.')),
    playerCard,
    el('div.cols', el('div', tempoCard, keyCard), el('div', structCard, hookCard, ingCard)),
  );

  // ---------- Logique ----------
  const barDur = () => (60 / (st.bpm || 120)) * 4;
  const barAt = (t) => Math.floor((t - st.offset) / barDur() + 1e-6);

  async function load(file) {
    st.file = file;
    if (!titleIn.value) titleIn.value = file.name.replace(/\.[^.]+$/, '');
    drop.replaceChildren(el('b', '⏳ Décodage et analyse…'), el('span.small.muted', file.name));
    try {
      const buf = await decodeFile(file);
      st.buffer = buf;
      const ch = buf.numberOfChannels;
      const mono = new Float32Array(buf.length);
      for (let c = 0; c < ch; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / ch; }
      st.mono = mono;
      st.peaks = waveformPeaks(mono, 1200);
      await new Promise((r) => setTimeout(r, 20));
      // Analyse du tempo sur 60 s centrales max (plus rapide, et évite intros sans batterie)
      const sr = buf.sampleRate;
      const mid = Math.floor(mono.length / 2), half = Math.min(mono.length / 2, sr * 30);
      const seg = mono.subarray(Math.max(0, mid - half), Math.min(mono.length, mid + half));
      const b = detectBpm(seg, sr, { min: 70, max: 180 });
      const segStart = Math.max(0, mid - half) / sr;
      const period = 60 / b.bpm;
      st.offset = ((b.offset + segStart) % period + period) % period;
      setBpm(b.bpm, 'détecté', b.confidence);
      const k = detectKey(mono, sr);
      st.key = k; st.keyAlt = k.alternatives;
      paintKey();
      drop.replaceChildren(el('b', `✅ ${file.name}`), el('span.small.muted', `${Math.floor(buf.duration / 60)} min ${String(Math.round(buf.duration % 60)).padStart(2, '0')} · touche pour changer de fichier`), fileIn);
      playerCard.hidden = false;
      requestAnimationFrame(draw);
    } catch (e) {
      console.error(e);
      drop.replaceChildren(el('b', '❌ Impossible de lire ce fichier'), el('span.small.muted', 'Essaie un MP3 ou un WAV.'), fileIn);
    }
  }

  function setBpm(b, src, conf = null) {
    st.bpm = Math.round(b * 10) / 10;
    if (conf != null) st.conf = conf;
    bpmVal.textContent = String(st.bpm);
    bpmInfo.textContent = src === 'détecté' ? `détecté (confiance ${Math.round(st.conf * 100)} %)` : src;
    draw();
  }

  function paintKey() {
    const k = st.key;
    if (!k) return;
    const name = (x) => `${NOTE_NAMES_FR[x.rootPc]} ${x.mode === 'major' ? 'majeur' : 'mineur'} (${NOTE_NAMES[x.rootPc]}${x.mode === 'major' ? '' : 'm'})`;
    keyVal.textContent = name(k);
    keyInfo.replaceChildren(`confiance ${Math.round(k.confidence * 100)} % · sinon : `, ...k.alternatives.map((a, i) => el('button.btn.small.ghost', {
      onclick: () => { const cur = st.key; st.key = { ...a, alternatives: [cur, ...st.keyAlt.filter((x) => x !== a)].slice(0, 2), confidence: 0 }; st.keyAlt = st.key.alternatives; paintKey(); },
    }, name(a))));
    const sc = k.mode === 'major' ? 'major' : 'minor';
    keyKb.node.querySelectorAll('.key').forEach((kEl) => kEl.classList.toggle('inscale', inScale(+kEl.dataset.midi, k.rootPc, sc)));
  }

  function curPos() {
    if (!st.playing) return st.pos;
    let p = st.playing.offset + (now() - st.playing.startAt);
    if (st.loop && p >= st.loop[1]) p = st.loop[0] + ((p - st.loop[0]) % (st.loop[1] - st.loop[0]));
    return p;
  }

  function playAt(pos) {
    if (!st.buffer) return toast('Importe d’abord un morceau', 'bad');
    pause(true);
    st.pos = Math.max(0, Math.min(st.buffer.duration - 0.05, pos));
    st.playing = playBuffer(st.buffer, st.pos, st.loop ? { loopStart: st.loop[0], loopEnd: st.loop[1] } : {});
    st.playing.node.onended = () => { if (st.playing && !st.loop) { st.pos = 0; pause(); } };
    playBtn.textContent = '⏸ Pause'; playBtn.classList.add('on');
    let lastBeat = -1;
    clearInterval(metroTimer);
    metroTimer = setInterval(() => {
      if (!st.metro || !st.bpm || !st.playing) return;
      const p = curPos(), period = 60 / st.bpm;
      const nextBeat = Math.ceil((p - st.offset) / period - 1e-6);
      const tBeat = st.offset + nextBeat * period;
      const dt = tBeat - p;
      if (dt < 0.1 && nextBeat !== lastBeat) { lastBeat = nextBeat; playClick(now() + dt, ((nextBeat % 4) + 4) % 4 === 0); }
    }, 25);
    cancelAnimationFrame(raf);
    const tick = () => { st.pos = curPos(); draw(); raf = requestAnimationFrame(tick); };
    tick();
  }

  function pause(silent) {
    if (st.playing) { st.pos = curPos(); st.playing.stop(); st.playing = null; }
    clearInterval(metroTimer);
    cancelAnimationFrame(raf);
    if (!silent) { playBtn.textContent = '▶ Lecture'; playBtn.classList.remove('on'); draw(); }
  }

  function seek(t) {
    if (!st.buffer) return;
    st.pos = Math.max(0, Math.min(st.buffer.duration - 0.05, t));
    if (st.loop && (st.pos < st.loop[0] || st.pos > st.loop[1])) { st.loop = null; loopBtn.classList.remove('primary'); loopBtn.textContent = '🔁 Boucler 4 mesures ici'; }
    if (st.playing) playAt(st.pos); else draw();
  }

  function toggleLoop() {
    if (!st.buffer) return;
    if (st.loop) { st.loop = null; loopBtn.classList.remove('primary'); loopBtn.textContent = '🔁 Boucler 4 mesures ici'; if (st.playing) playAt(curPos()); return; }
    const b = Math.max(0, barAt(curPos()));
    const a = st.offset + b * barDur();
    st.loop = [Math.max(0, a), Math.min(st.buffer.duration, a + 4 * barDur())];
    loopBtn.classList.add('primary'); loopBtn.textContent = `🔁 Boucle mes. ${b + 1}-${b + 4} (stop)`;
    playAt(st.loop[0]);
  }

  function addMarker(sec) {
    if (!st.buffer) { st.markers.push({ sec, bar: null }); paintMarkers(); return; }
    const bar = Math.max(0, barAt(curPos()));
    st.markers = st.markers.filter((m) => m.bar !== bar);
    st.markers.push({ sec, bar });
    st.markers.sort((a, b) => (a.bar ?? 0) - (b.bar ?? 0));
    paintMarkers(); draw();
  }

  function paintMarkers() {
    markerList.replaceChildren(...st.markers.map((m, i) => {
      const next = st.markers[i + 1];
      const len = m.bar != null && next?.bar != null ? next.bar - m.bar : null;
      return el('div.row.between', { style: { padding: '4px 0', borderBottom: '1px dashed var(--line)' } },
        el('span', el('b', { style: { color: SECTIONS[m.sec].color } }, SECTIONS[m.sec].name), m.bar != null ? ` · mesure ${m.bar + 1}` : '', len != null ? ` · ${len} mesures` : ''),
        el('button.btn.small.ghost', { onclick: () => { st.markers.splice(i, 1); paintMarkers(); draw(); } }, '✕'));
    }));
  }

  function addHook(m) {
    st.hook.push(m);
    if (st.hook.length > 32) st.hook.shift();
    paintHook();
  }
  function paintHook() {
    hookOut.textContent = st.hook.length ? st.hook.map(midiToName).join(' · ') : '—';
  }
  function replayHook() {
    ensureAudio();
    const t0 = now() + 0.05, step = 60 / (st.bpm || 120) / 2;
    st.hook.forEach((m, i) => playSynth(presetParams('pluck'), m, t0 + i * step, step * 0.9, 0.85, { send: 0.2 }));
  }
  function sendToMelody() {
    if (!st.hook.length) return toast('Relève d’abord quelques notes', 'bad');
    update((s) => {
      const p = projectFromGenre(s.project.genre);
      if (st.key) { p.rootPc = st.key.rootPc; p.scale = st.key.mode === 'major' ? 'major' : 'minor'; }
      if (st.bpm) p.bpm = Math.round(st.bpm > 150 ? st.bpm / 2 : st.bpm);
      st.hook.slice(0, 32).forEach((n, i) => { p.melody[i * 2] = { n, len: 2 }; });
      s.project = p;
    });
    toast('Hook envoyé (en croches) : ajuste le rythme dans le Lab Mélodie', 'good', 4000);
    location.hash = '#/melody';
  }

  function draw() {
    if (!st.peaks || playerCard.hidden) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth * dpr, h = 120 * dpr;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
    const c = canvas.getContext('2d');
    const dur = st.buffer.duration;
    const x = (t) => (t / dur) * w;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#14142a'; c.fillRect(0, 0, w, h);
    if (st.loop) { c.fillStyle = 'rgba(92,225,230,.15)'; c.fillRect(x(st.loop[0]), 0, x(st.loop[1]) - x(st.loop[0]), h); }
    // mesures
    if (st.bpm) {
      const bd = barDur();
      for (let b = 0, t = st.offset; t < dur; b++, t += bd) {
        c.fillStyle = b % 16 === 0 ? 'rgba(255,255,255,.35)' : b % 4 === 0 ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.05)';
        c.fillRect(x(t), 0, Math.max(1, dpr * (b % 16 === 0 ? 1.5 : 1)), h);
        if (b % 16 === 0) { c.fillStyle = 'rgba(255,255,255,.6)'; c.font = `${10 * dpr}px system-ui`; c.fillText(String(b + 1), x(t) + 3 * dpr, h - 4 * dpr); }
      }
    }
    // forme d'onde
    const n = st.peaks.length;
    c.fillStyle = '#8b5cf6';
    for (let i = 0; i < n; i++) {
      const [lo, hi] = st.peaks[i];
      const px = (i / n) * w;
      c.fillRect(px, h / 2 - hi * h * 0.45, Math.max(1, w / n), (hi - lo) * h * 0.45 || 1);
    }
    // repères
    st.markers.forEach((m) => {
      if (m.bar == null) return;
      const t = st.offset + m.bar * barDur();
      c.fillStyle = SECTIONS[m.sec].color;
      c.fillRect(x(t), 0, 2 * dpr, h);
      c.font = `bold ${10 * dpr}px system-ui`;
      c.fillText(SECTIONS[m.sec].name, x(t) + 4 * dpr, 12 * dpr);
    });
    // tête de lecture
    c.fillStyle = '#fff';
    c.fillRect(x(st.pos), 0, 2 * dpr, h);
    const bar = st.bpm ? barAt(st.pos) + 1 : null;
    posLabel.textContent = `${fmt(st.pos)} / ${fmt(dur)}${bar ? ` · mesure ${Math.max(1, bar)}` : ''}`;
  }

  const offMidi = onMidi({
    noteOn: (m, v) => { ensureAudio(); keyHeld.get('m' + m)?.release(); keyHeld.set('m' + m, playSynth(presetParams('piano'), m, now(), null, v, { send: 0.2 })); keyKb.light(m, true); addHook(m); },
    noteOff: (m) => { keyHeld.get('m' + m)?.release(); keyHeld.delete('m' + m); keyKb.light(m, false); },
  });

  function save() {
    const filled = Object.values(ing).filter((t) => t.value.trim().length > 3).length;
    if (!st.bpm && !st.markers.length && !filled) return toast('Remplis au moins le tempo, la structure ou un ingrédient', 'bad');
    const keyName = st.key ? `${NOTE_NAMES[st.key.rootPc]}${st.key.mode === 'major' ? '' : 'm'}` : '?';
    const structure = st.markers.map((m, i) => {
      const next = st.markers[i + 1];
      return `${SECTIONS[m.sec].name}${m.bar != null && next?.bar != null ? ` (${next.bar - m.bar})` : ''}`;
    }).join(' → ');
    const note = [
      linkIn.value.trim() && `🔗 ${linkIn.value.trim()}`,
      `Tempo : ${st.bpm ?? '?'} BPM · Tonalité : ${keyName}`,
      structure && `Structure : ${structure}`,
      st.hook.length && `Hook : ${st.hook.map(midiToName).join(' ')}`,
      ing.rythme.value.trim() && `🥁 ${ing.rythme.value.trim()}`,
      ing.son.value.trim() && `🔊 ${ing.son.value.trim()}`,
      ing.arr.value.trim() && `🧱 ${ing.arr.value.trim()}`,
    ].filter(Boolean).join('\n');
    pause();
    update((s) => { s.notebook.unshift({ id: Date.now(), type: 'note', title: `Analyse : ${titleIn.value.trim() || 'référence'}`, note, date: Date.now() }); });
    const parts = [!!st.bpm, !!st.key, st.markers.length >= 3, st.hook.length >= 4, filled === 3].filter(Boolean).length;
    finishExercise({
      key: 'analyze', title: 'Analyse de référence', score: Math.round((parts / 5) * 100), xp: 20 + parts * 8, skill: 'oreille', success: parts >= 4,
      lesson: 'Analyser, c’est apprendre des meilleurs à chaque écoute. Avec l’habitude, tu repéreras la structure et les ingrédients d’un morceau dès la première écoute.',
      transfer: 'Dans Live 12 : glisse le morceau, cale le Warp au BPM trouvé, place des Locators aux sections, puis utilise UN de tes 3 ingrédients dans ta prochaine idée. (Analyse sauvée dans le Carnet.)',
    });
  }

  const onResize = () => draw();
  window.addEventListener('resize', onResize);
  return () => { pause(true); offMidi(); keyKb.destroy(); keyHeld.forEach((v) => v.release()); window.removeEventListener('resize', onResize); };
}

function fmt(t) {
  t = Math.max(0, t);
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
}
