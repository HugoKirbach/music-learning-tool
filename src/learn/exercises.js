// Exercices interactifs du parcours. Chaque type renvoie { node, value(), reveal(res), answerText(), destroy() }.
// api : setReady(bool) active « Vérifier », submit() vérifie tout de suite (fin d'un exercice en temps réel), enter().
import { fmtKeys } from '../keyboard.js';
import { el } from '../ui.js';
import { ensureAudio, now, playSynth, playDrum, playClick, transport, outputLatency } from '../core/audio.js';
import { presetParams } from '../player.js';
import { onMidi, drumForNote, midiStatus, onMidiStatus, midiSupported } from '../midiin.js';
import { getState } from '../store.js';
import { inputLatency } from '../core/latency.js';
import { resolvePatch, judgeTaps } from '../core/course.js';
import { noteName, enName, frName, liveName, chordMidi } from '../core/coursegen.js';
import { SCALES, mod } from '../core/theory.js';
import { paramById, getPath, setPath, norm, fromNorm, formatParam, similarity } from '../core/synthparams.js';
import { LIVE_ZONES, comboFromEvent, comboLabel } from '../data/ableton.js';
import { sfx } from './jam.js';
import { playSpec, playBtn, stopSpec, runEvents, prepareItem, prepareSpec, lvPreset, piano, isBlackKey, COMPUTER_KEYS, visual, keycaps, mascot, isMac, touchOnly, waveSvg, adsrSvg, filterSvg, rowName } from './kit.js';
import { liveMock } from './livemock.js';

const labelOf = (c) => (typeof c === 'string' ? c : c.label);
const fineNum = (v) => String(Math.round(v * 100) / 100).replace('.', ',');

/** Grand bouton d'écoute (haut-parleur 3D). */
function bigPlay(spec) {
  const b = el('button.bigplay', { type: 'button', 'aria-label': 'Écouter', onclick: () => { b.classList.add('on'); playSpec(spec, { onEnd: () => b.classList.remove('on') }); } },
    el('span.bigplay-ico', { 'aria-hidden': 'true' }, '🔊'), el('span.bigplay-txt', 'Écouter'));
  return b;
}

// ---------- Fiche ----------
function card(item) {
  return {
    node: el('div.ex-card' + (item.visual || item.demo ? '.split' : ''),
      el('div.ex-card-text',
        el('div.ex-card-head', mascot('happy', 46), el('h2', item.title)),
        el('div.ex-card-body', [].concat(item.text).map((t) => el('p', fmtKeys(t)))),
        item.tip ? el('p.ex-tip', '💡 ', fmtKeys(item.tip)) : null),
      item.visual || item.demo ? el('div.ex-card-side',
        item.visual ? el('div.ex-media', visual(item.visual, { live: true })) : null,
        item.demo ? el('div.ex-demos', item.demo.map((d) => playBtn(d.play, d.label))) : null) : null),
    value: () => ({ ok: true }),
    ready: true,
  };
}

// ---------- QCM ----------
function mcq(item, api) {
  let sel = -1;
  const media = [];
  if (item.visual) media.push(el('div.ex-media', visual(item.visual)));
  if (item.keycaps) media.push(el('div.ex-media.center', keycaps(comboLabel(item.keycaps, isMac()))));
  if (item.play) media.push(el('div.ex-listen', bigPlay(item.play)));
  if (item.plays) media.push(el('div.ex-ab', item.plays.map((p) => playBtn(p.play, `▶ ${p.label}`, '.ab'))));
  const visualChoices = item.choices.some((c) => c && c.visual);
  const box = el('div.answers.ex-choices' + (visualChoices ? '.visual' : '') + (item.choices.length <= 2 && !visualChoices ? '.two' : ''));
  item.choices.forEach((c, i) => {
    box.append(el('button.answer.choice3d', { type: 'button', onclick: () => {
      sel = i;
      [...box.children].forEach((x, j) => x.classList.toggle('sel', j === i));
      if (c.play) playSpec(c.play);
      api.setReady(true);
    } }, el('span.choice-num', { 'aria-hidden': 'true' }, String(i + 1)), c.visual ? visual(c.visual) : null, el('span.choice-label', labelOf(c))));
  });
  let auto = null;
  if (item.autoplay && item.play) auto = setTimeout(() => playSpec(item.play), 450);
  return {
    node: el('div', media, box),
    value: () => sel,
    reveal: (res) => { [...box.children].forEach((b) => { b.disabled = true; }); box.children[item.a]?.classList.add('right'); if (!res.ok && sel >= 0) box.children[sel]?.classList.add('wrong'); },
    answerText: () => labelOf(item.choices[item.a]),
    onSpace: item.play ? () => playSpec(item.play) : null,
    destroy: () => clearTimeout(auto),
  };
}

// ---------- Raccourci clavier ----------
function shortcut(item, api) {
  const mac = isMac();
  const capture = item.capture !== false && !touchOnly();
  let sel = -1;
  const box = el('div.answers.ex-choices.keys');
  const choose = (i) => { sel = i; [...box.children].forEach((x, j) => x.classList.toggle('sel', j === i)); api.setReady(true); };
  item.choices.forEach((k, i) => box.append(el('button.answer.choice3d', { type: 'button', onclick: () => choose(i) }, el('span.choice-num', { 'aria-hidden': 'true' }, String(i + 1)), keycaps(comboLabel(k, mac)))));
  const heard = el('p.ex-heard', capture ? '⌨️ Tape la combinaison sur ton clavier… ou choisis-la.' : touchOnly() ? 'Choisis la bonne combinaison.' : 'Choisis la bonne combinaison (le navigateur garde ce raccourci pour lui : pas la peine de le taper).');
  let done = false;
  const kd = (e) => {
    if (done || e.repeat || document.querySelector('#modal-root .modal-back')) return;
    const combo = comboFromEvent(e);
    if (!combo || combo === 'Enter' || combo === 'Escape') return;
    const i = item.choices.indexOf(combo);
    if (/^[1-9]$/.test(combo) && i < 0) return; // les chiffres choisissent une réponse
    if (combo.includes('Mod') || /^(Shift\+)?(Tab|Space|F\d+)$/.test(combo) || i >= 0) { e.preventDefault(); e.stopPropagation(); }
    heard.textContent = `Tu as tapé : ${comboLabel(combo, mac).join(' + ')}`;
    if (i >= 0) { choose(i); done = true; setTimeout(() => api.submit(), 150); }
  };
  if (capture) window.addEventListener('keydown', kd, true);
  return {
    node: el('div', el('p.ex-sub', 'Quel raccourci de Live ?'), heard, box),
    value: () => sel,
    reveal: (res) => { done = true; [...box.children].forEach((b) => { b.disabled = true; }); box.children[item.a]?.classList.add('right'); if (!res.ok && sel >= 0) box.children[sel]?.classList.add('wrong'); },
    answerText: () => comboLabel(item.keys, mac).join(' + '),
    onSpace: () => true,
    destroy: () => window.removeEventListener('keydown', kd, true),
  };
}

// ---------- Associer les paires ----------
function pairs(item, api) {
  const n = item.pairs.length;
  let pick = null, matched = 0, mistakes = 0;
  const tile = (content, side, idx) => {
    const c = typeof content === 'string' ? { label: content } : content;
    const b = el('button.pair3d', { type: 'button', 'data-side': side, 'data-idx': idx },
      c.visual ? visual(c.visual) : null, c.label ? el('span', c.label) : null, c.play ? el('span.pair-snd', '🔊') : null);
    b.addEventListener('click', () => {
      if (b.classList.contains('done')) return;
      if (c.play) playSpec(c.play);
      if (!pick || pick.side === side) {
        pick?.node.classList.remove('sel');
        pick = { side, idx, node: b };
        b.classList.add('sel');
        return;
      }
      const other = pick;
      pick = null;
      other.node.classList.remove('sel');
      if (other.idx === idx) {
        [b, other.node].forEach((x) => { x.classList.add('done'); x.disabled = true; });
        matched++;
        if (matched === n) setTimeout(() => api.submit(), 350);
      } else {
        mistakes++;
        [b, other.node].forEach((x) => { x.classList.add('bad'); setTimeout(() => x.classList.remove('bad'), 550); });
        sfx('bad');
      }
    });
    return b;
  };
  return {
    node: el('div.ex-pairs',
      el('div.pair-col', item.left.map((i) => tile(item.pairs[i][0], 'L', i))),
      el('div.pair-col', item.right.map((i) => tile(item.pairs[i][1], 'R', i)))),
    value: () => ({ ok: matched === n, mistakes }),
  };
}

// ---------- Mots à placer (ordre, texte à trous) ----------
function chipsUI(words, onChange) {
  const bank = el('div.ex-bank');
  const used = new Set();
  const chips = words.map((w, i) => {
    const c = el('button.chip3d', { type: 'button', onclick: () => { if (!used.has(i)) onChange('add', i); } }, w);
    bank.append(c);
    return c;
  });
  return { bank, chips, used, sync: () => chips.forEach((c, i) => c.classList.toggle('used', used.has(i))) };
}

function order(item, api) {
  const ans = [];
  const line = el('div.ex-line');
  const ui = chipsUI(item.words, (op, i) => { ans.push(i); ui.used.add(i); paint(); });
  const paint = () => {
    line.replaceChildren(...ans.map((i, k) => el('button.chip3d.placed', { type: 'button', onclick: () => { ans.splice(k, 1); ui.used.delete(i); paint(); } }, el('small', `${k + 1}.`), item.words[i])));
    if (!ans.length) line.append(el('span.ex-line-hint', 'Touche les étiquettes dans le bon ordre'));
    ui.sync();
    api.setReady(ans.length === item.items.length);
  };
  paint();
  return {
    node: el('div.ex-order', line, ui.bank),
    value: () => ans.map((i) => item.words[i]),
    reveal: () => { line.querySelectorAll('button').forEach((b) => { b.disabled = true; }); ui.chips.forEach((b) => { b.disabled = true; }); },
    answerText: () => item.items.join(' → '),
  };
}

function blank(item, api) {
  const fill = item.answers.map(() => null);
  const sentence = el('p.ex-sentence');
  const ui = chipsUI(item.words, (op, i) => { const k = fill.indexOf(null); if (k >= 0) { fill[k] = i; ui.used.add(i); paint(); } });
  const paint = () => {
    let g = 0;
    sentence.replaceChildren(...item.parts.map((p) => {
      if (p != null) return document.createTextNode(p);
      const k = g++;
      const i = fill[k];
      return el('button.bgap' + (i == null ? '.empty' : ''), { type: 'button', onclick: () => { if (i != null) { fill[k] = null; ui.used.delete(i); paint(); } } }, i == null ? '      ' : item.words[i]);
    }));
    ui.sync();
    api.setReady(fill.every((x) => x != null));
  };
  paint();
  return {
    node: el('div.ex-blank', sentence, ui.bank),
    value: () => fill.map((i) => (i == null ? '' : item.words[i])),
    reveal: () => { sentence.querySelectorAll('button').forEach((b) => { b.disabled = true; }); ui.chips.forEach((b) => { b.disabled = true; }); },
    answerText: () => item.answers.join(' · '),
  };
}

// ---------- Réponse chiffrée ----------
function number(item, api) {
  const input = el('input.ex-num', { type: 'text', inputmode: item.a < 0 ? 'text' : 'decimal', autocomplete: 'off', placeholder: '?', 'aria-label': 'Ta réponse' });
  const valid = () => Number.isFinite(Number(input.value.replace(',', '.').replace('−', '-'))) && input.value.trim() !== '';
  input.addEventListener('input', () => api.setReady(valid()));
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); api.enter(); } });
  if (matchMedia('(pointer: fine)').matches) setTimeout(() => input.focus(), 80);
  return {
    node: el('div', item.visual ? el('div.ex-media', visual(item.visual)) : null, el('div.ex-numrow', input, item.unit ? el('span.ex-unit', item.unit) : null)),
    value: () => input.value.replace('−', '-'),
    reveal: () => { input.disabled = true; },
    answerText: () => `${fineNum(item.a)}${item.unit ? ` ${item.unit}` : ''}`,
  };
}

// ---------- Clavier (piano + MIDI + clavier de l'ordinateur) ----------
function keys(item, api) {
  ensureAudio();
  const mode = item.mode;
  const exact = !!item.exact;
  const lo = item.lo ?? 48, hi = item.hi ?? (item.octaveButtons ? 96 : 71);
  let from = item.octaveButtons ? Math.max(lo, Math.min(hi - 24, 60)) : lo;
  const span = item.octaveButtons ? 24 : hi - lo;
  let picked = [];
  const held = new Set();
  const voices = new Map();
  let locked = false;
  const sound = (m, v = 0.75) => { voices.get(m)?.release(); voices.set(m, playSynth(lvPreset('piano'), m, now(), null, v, { send: 0.15 })); };
  const silence = (m) => { voices.get(m)?.release(); voices.delete(m); };

  const kbHost = el('div.ex-kb');
  const info = el('div.ex-picked');
  const slots = mode === 'seq' ? el('div.ex-slots') : null;
  let kb = null;
  const buildKb = () => {
    kb = piano({ lo: from, hi: from + span, labels: item.labels || 'c', onDown: (m, v) => press(m, v), onUp: (m) => release(m) });
    kbHost.replaceChildren(kb.node);
    paintSel();
  };
  const octLabel = el('span.ex-oct-label');
  const octBar = item.octaveButtons ? el('div.ex-oct',
    el('button.btn.lbtn', { type: 'button', onclick: () => shift(-12) }, '◀ Octave −'), octLabel,
    el('button.btn.lbtn', { type: 'button', onclick: () => shift(12) }, 'Octave + ▶')) : null;
  const shift = (d) => { const f = Math.max(lo, Math.min(hi - span, from + d)); if (f !== from) { from = f; buildKb(); } paintOct(); };
  const paintOct = () => { if (octLabel) octLabel.textContent = `${liveName(from)} → ${liveName(from + span)}`; };

  const nameOf = (m) => (exact || item.labels === 'oct' ? `${liveName(m)} (${frName(m)})` : noteName(m));
  const paintSel = () => {
    if (!kb) return;
    kb.clear('sel');
    if (mode !== 'seq') kb.set('sel', picked);
    if (mode === 'note') info.textContent = picked.length ? `Ta note : ${nameOf(picked[0])}` : 'Touche une note (écran, clavier MIDI ou clavier de l’ordinateur)';
    if (mode === 'chord') info.textContent = picked.length ? `Tes notes : ${[...picked].sort((a, b) => a - b).map((m) => enName(m)).join(' + ')}` : 'Touche les notes de l’accord une par une (ou joue-les ensemble au clavier MIDI)';
    if (slots) {
      slots.replaceChildren(...item.target.map((_, i) => el('span.ex-slot' + (picked[i] != null ? '.on' : ''), picked[i] != null ? enName(picked[i]) : '·')));
      info.textContent = picked.length ? '' : `Joue les ${item.target.length} notes dans l’ordre`;
    }
  };

  const press = (m, v = 0.75) => {
    if (locked) return;
    ensureAudio();
    sound(m, v);
    if (mode === 'note') { picked = [m]; api.setReady(true); }
    else if (mode === 'chord') {
      picked = picked.includes(m) ? picked.filter((x) => x !== m) : [...picked, m];
      api.setReady(picked.length >= 2);
    } else {
      picked.push(m);
      kb?.set('sel', [m]);
      setTimeout(() => kb?.set('sel', [m], false), 220);
      if (picked.length >= item.target.length) { locked = true; setTimeout(() => api.submit(), 300); }
    }
    paintSel();
  };
  const release = (m) => { silence(m); };

  // Clavier MIDI : notes réelles (accords joués ensemble), fenêtre qui suit les octaves du clavier
  const off = onMidi({
    noteOn: (n, v) => {
      if (locked) return;
      if (item.octaveButtons && (n < from || n > from + span)) { from = Math.max(lo, Math.min(hi - span, n - mod(n, 12))); buildKb(); paintOct(); }
      held.add(n);
      kb?.set('down', [n]);
      if (mode === 'chord') {
        sound(n, v);
        picked = [...held];
        paintSel();
        api.setReady(picked.length >= 2);
        if (picked.length >= item.target.length) {
          const pcs = [...new Set(picked.map((x) => mod(x, 12)))].sort((a, b) => a - b);
          const want = [...item.target].map((x) => mod(x, 12)).sort((a, b) => a - b);
          if (pcs.join() === want.join()) { locked = true; setTimeout(() => api.submit(), 250); }
        }
      } else press(n, v);
    },
    noteOff: (n) => { held.delete(n); kb?.set('down', [n], false); silence(n); },
  });
  // Clavier de l'ordinateur, par emplacement (QWERTY : A = Do, Z / X = octave ; AZERTY : Q = Do, W / X = octave)
  let compBase = Math.max(from, Math.min(from + span - 12, 60));
  compBase -= mod(compBase, 12);
  const down = new Set();
  const kd = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.repeat || document.querySelector('#modal-root .modal-back')) return;
    if (e.target?.tagName === 'INPUT') return;
    if (e.code === 'KeyZ' || e.code === 'KeyX') { e.preventDefault(); compBase += e.code === 'KeyZ' ? -12 : 12; if (item.octaveButtons) shift(e.code === 'KeyZ' ? -12 : 12); return; }
    const off2 = COMPUTER_KEYS[e.code];
    if (off2 == null) return;
    e.preventDefault();
    const m = compBase + off2;
    down.add(e.code);
    kb?.set('down', [m]);
    press(m, 0.75);
  };
  const ku = (e) => { const off2 = COMPUTER_KEYS[e.code]; if (off2 == null || !down.has(e.code)) return; down.delete(e.code); const m = compBase + off2; kb?.set('down', [m], false); release(m); };
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);

  buildKb();
  paintOct();
  const clearBtn = mode !== 'note' ? el('button.btn.lbtn.ghost', { type: 'button', onclick: () => { if (locked) return; picked = []; paintSel(); api.setReady(false); } }, '↺ Effacer') : null;
  return {
    node: el('div.ex-keys', item.play ? el('div.ex-listen', bigPlay(item.play)) : null, slots, octBar, kbHost, el('div.row.between.ex-keys-foot', info, clearBtn)),
    value: () => picked,
    reveal: (res) => {
      locked = true;
      if (!kb) return;
      const inView = (m) => m >= from && m <= from + span;
      let show = [];
      if (exact) show = item.target.filter(inView);
      else {
        const center = mode === 'chord' ? Math.max(from, Math.min(from + span - 11, 60)) : from;
        show = item.target.map((pc) => { let m = center + mod(pc - center, 12); while (!inView(m) && m > from) m -= 12; return m; });
      }
      kb.clear('sel');
      kb.set('right', show);
      const pcs = item.target.map((x) => mod(x, 12));
      if (!res.ok && mode !== 'seq') kb.set('wrong', picked.filter((m) => (exact ? !item.target.includes(m) : !pcs.includes(mod(m, 12)))));
    },
    answerText: () => (mode === 'seq' ? item.target.map((p) => (exact ? liveName(p) : enName(p))).join(' – ') : mode === 'chord' ? item.target.map((p) => enName(p)).join(' + ') : nameOf(item.target[0])),
    destroy: () => { off(); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); voices.forEach((v) => v.release()); },
  };
}

// ---------- Boîte à rythmes ----------
const fromPattern = (p = '') => Array.from({ length: 16 }, (_, i) => (p[i] === 'x' ? 1 : p[i] === 'g' ? 2 : 0));
function grid(item, api) {
  const rows = item.rows;
  const cells = Object.fromEntries(rows.map((r) => [r, fromPattern(item.start?.[r])]));
  const kit = item.kit || 'club';
  const btns = {};
  const playOne = (r, v) => { ensureAudio(); playDrum(r, now() + 0.01, v === 2 ? 0.3 : 1, kit); };
  const table = el('div.ex-grid', rows.map((r) => el('div.gx-row',
    el('span.gx-name', rowName(r)),
    el('span.gx-cells', (btns[r] = cells[r].map((v, s) => el('button.gx-cell' + (s % 4 === 0 ? '.beat' : ''), {
      type: 'button', 'aria-label': `${rowName(r)}, pas ${s + 1}`,
      onclick: () => { cells[r][s] = item.vel ? (cells[r][s] + 1) % 3 : cells[r][s] ? 0 : 1; if (cells[r][s]) playOne(r, cells[r][s]); paint(); api.setReady(true); },
    })))))));
  const numbers = el('div.gx-row.gx-nums', el('span.gx-name'), el('span.gx-cells', Array.from({ length: 16 }, (_, s) => el('i' + (s % 4 === 0 ? '.beat' : ''), s % 4 === 0 ? String(s / 4 + 1) : '·'))));
  const paint = () => rows.forEach((r) => btns[r].forEach((b, s) => { b.classList.toggle('on', cells[r][s] === 1); b.classList.toggle('ghost', cells[r][s] === 2); }));
  let playing = null;
  const target = Object.fromEntries(rows.map((r) => [r, fromPattern(item.target?.[r])]));
  const stopLoop = () => { transport.stop(); playing = null; table.querySelectorAll('.ph').forEach((x) => x.classList.remove('ph')); bMine.classList.remove('on'); bModel?.classList.remove('on'); };
  const loop = (src, btn) => {
    if (playing === btn) { stopLoop(); return; }
    stopLoop();
    ensureAudio();
    playing = btn;
    btn.classList.add('on');
    transport.start((step, time) => { const s = step % 16; rows.forEach((r) => { const v = src[r][s]; if (v) playDrum(r, time, v === 2 ? 0.3 : 1, kit); }); },
      (step) => { const s = step % 16; table.querySelectorAll('.ph').forEach((x) => x.classList.remove('ph')); rows.forEach((r) => btns[r][s].classList.add('ph')); },
      { bpm: item.bpm || 120, swing: 0 });
  };
  const bMine = el('button.btn.lbtn.play', { type: 'button', onclick: () => loop(cells, bMine) }, '▶ Ton beat');
  const bModel = item.ear ? el('button.btn.lbtn.play.model', { type: 'button', onclick: () => loop(target, bModel) }, '🎧 Le modèle') : null;
  const why = el('p.ex-why');
  // Pads MIDI : jouer les sons de la grille
  const off = onMidi({ noteOn: (n, v) => { const d = drumForNote(n); if (d) playDrum(d, now(), v, kit); } });
  paint();
  api.setReady(true);
  return {
    node: el('div.ex-gridwrap', el('div.row.gap.wrap.ex-tools', bModel, bMine, item.vel ? el('span.small.muted', '1 toucher = coup · 2 = ghost note · 3 = effacer') : null), el('div.gx-scroll', table, numbers), why),
    value: () => cells,
    reveal: (res) => {
      stopLoop();
      table.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      if (res.ok || item.rules) { if (res.why) why.textContent = res.why; return; }
      rows.forEach((r) => btns[r].forEach((b, s) => {
        const want = target[r][s], got = cells[r][s];
        if (item.vel ? want !== got : !!want !== !!got) b.classList.add(want ? 'miss' : 'extra');
      }));
      why.textContent = 'En vert pointillé : les coups attendus. En rouge : les coups en trop.';
    },
    destroy: () => { stopLoop(); off(); },
    onSpace: () => { (bModel || bMine).click(); return true; },
  };
}

// ---------- Piano roll ----------
function roll(item, api) {
  const lo = item.lo ?? 48, hi = item.hi ?? 72, steps = item.steps || 16;
  const beatRes = item.res === 'beat';
  const mono = item.mono || (item.rules || []).some((r) => r.k === 'mono');
  const notes = new Map();
  const cellsByKey = new Map();
  const scale = item.scale && item.hl !== false ? SCALES[item.scale.scale].steps.map((s) => mod(item.scale.root + s, 12)) : null;
  const lead = () => lvPreset(item.p || 'pluck');
  const ghost = new Set((item.ghost ? item.target : []).map(([s, m]) => `${s}:${m}`));
  const guide = new Set((item.guide || []).map(([s, m]) => `${s}:${m}`));
  const preview = (m) => { ensureAudio(); playSynth(lead(), m, now() + 0.01, 0.25, 0.8, { send: 0.1 }); };
  const toggle = (s, m) => {
    const k = `${s}:${m}`;
    if (notes.has(k)) notes.delete(k);
    else {
      if (mono) [...notes.keys()].filter((x) => x.startsWith(`${s}:`)).forEach((x) => notes.delete(x));
      notes.set(k, { s, m });
      preview(m);
    }
    paint();
    api.setReady(notes.size > 0);
  };
  const rows = [];
  for (let m = hi; m >= lo; m--) {
    const inSc = scale ? scale.includes(mod(m, 12)) : false;
    rows.push(el('div.rx-row' + (isBlackKey(m) ? '.blk' : '') + (inSc ? '.insc' : '') + (scale && mod(m, 12) === item.scale.root ? '.root' : ''),
      el('button.rx-key', { type: 'button', tabindex: '-1', onclick: () => preview(m) }, m % 12 === 0 ? liveName(m) : enName(m)),
      el('span.rx-cells', Array.from({ length: steps }, (_, s) => {
        const k = `${s}:${m}`;
        const c = el('button.rx-cell' + (s % 4 === 0 ? '.beat' : '') + (beatRes && s % 4 === 0 ? '.bar' : '') + (ghost.has(k) ? '.ghost' : '') + (guide.has(k) ? '.guide' : ''), { type: 'button', 'aria-label': `${liveName(m)}, ${beatRes ? 'temps' : 'pas'} ${s + 1}`, onclick: () => toggle(s, m) });
        cellsByKey.set(k, c);
        return c;
      }))));
  }
  const head = item.chords ? el('div.rx-row.rx-head', el('span.rx-key'), el('span.rx-cells', item.chords.map((c) => el('b.rx-chord', { style: { width: `${(100 / item.chords.length)}%` } }, c)))) : null;
  const scroll = el('div.rx-scroll', el('div.ex-roll', head, rows));
  const paint = () => cellsByKey.forEach((c, k) => c.classList.toggle('on', notes.has(k)));
  // Lecture en boucle (avec kick et accords si l'exercice en a)
  let playing = false;
  const btn = el('button.btn.lbtn.play', { type: 'button', onclick: () => {
    if (playing) { stop(); return; }
    ensureAudio();
    playing = true;
    btn.classList.add('on');
    btn.textContent = '■ Stop';
    const padP = { ...lvPreset('pad') };
    transport.start((step, time, sd) => {
      const per = beatRes ? 4 : 1;
      if (item.kick && step % 4 === 0) playDrum('kick', time, 0.9, 'club');
      if (step % per) return;
      const col = (step / per) % steps;
      for (const n of notes.values()) if (n.s === col) playSynth(lead(), n.m, time, sd * per * 0.9, 0.8, { send: 0.1 });
      if (item.chords && beatRes && col % 4 === 0) chordMidi(item.chords[col / 4] || item.chords[0], 57).forEach((m) => playSynth(padP, m, time, sd * 15, 0.35, { send: 0.2 }));
    }, (step) => {
      const per = beatRes ? 4 : 1;
      const col = Math.floor(step / per) % steps;
      scroll.querySelectorAll('.ph').forEach((x) => x.classList.remove('ph'));
      rows.forEach((r) => r.querySelectorAll('.rx-cell')[col]?.classList.add('ph'));
    }, { bpm: item.bpm || 110, swing: 0 });
  } }, '▶ Écouter');
  const stop = () => { transport.stop(); playing = false; btn.classList.remove('on'); btn.textContent = '▶ Écouter'; scroll.querySelectorAll('.ph').forEach((x) => x.classList.remove('ph')); };
  const why = el('p.ex-why');
  if (item.guide) (item.guide).forEach(([s, m]) => cellsByKey.get(`${s}:${m}`)?.classList.add('guide'));
  return {
    node: el('div.ex-rollwrap', el('div.row.gap.wrap.ex-tools', btn, el('span.small.muted', beatRes ? '1 case = 1 temps · 4 cases = 1 mesure' : '1 case = 1 double croche · 4 cases = 1 temps'), scale ? el('span.small.muted', '· lignes claires = la gamme') : null), scroll, why),
    value: () => [...notes.values()],
    reveal: (res) => {
      stop();
      scroll.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      if (res.why) why.textContent = res.why;
      if (!res.ok && item.target) {
        const want = new Set(item.target.map(([s, m]) => `${s}:${m}`));
        want.forEach((k) => { if (!notes.has(k)) cellsByKey.get(k)?.classList.add('miss'); });
        notes.forEach((_, k) => { if (!want.has(k)) cellsByKey.get(k)?.classList.add('extra'); });
        if (!res.why) why.textContent = 'En vert pointillé : les notes attendues. En rouge : celles en trop.';
      }
    },
    destroy: stop,
    onSpace: () => { btn.click(); return true; },
  };
}

// ---------- Synthé à régler ----------
const ENV_IDS = ['attack', 'decay', 'sustain', 'release'];
const FILTER_IDS = ['cutoff', 'q', 'ftype', 'envAmt', 'slope'];
function synthEx(item, api) {
  const params = resolvePatch(item.base);
  const phrase = item.phrase || [[48, 0, 1], [55, 1, 1], [60, 2, 2]];
  const vis = el('div.ex-synthvis');
  const paintVis = () => {
    const kids = [];
    if (item.knobs.includes('wave1')) kids.push(waveSvg(params.osc[0].wave, { W: 240, H: 80 }));
    if (item.knobs.some((k) => ENV_IDS.includes(k))) kids.push(adsrSvg({ a: params.amp.a, d: params.amp.d, s: params.amp.s, r: params.amp.r }, { W: 240, H: 90 }));
    if (item.knobs.some((k) => FILTER_IDS.includes(k))) kids.push(filterSvg({ type: params.filter.type, cutoff: params.filter.cutoff, res: Math.min(1, (params.filter.q - 0.1) / 12) }, { W: 240, H: 90 }));
    vis.replaceChildren(...kids);
  };
  let touched = false;
  let playT = null;
  // Volume égalisé : ton son et la cible gardent le même gain (celui de la cible, ou du réglage de départ),
  // pour que les écarts de niveau que tu crées en réglant restent audibles.
  const ref = { k: 'synth', ...(item.match ? (typeof item.match === 'string' ? { preset: item.match } : { over: item.match }) : { over: resolvePatch(item.base) }), notes: phrase, bpm: 100 };
  prepareSpec(ref);
  const mineSpec = () => ({ k: 'synth', over: params, notes: phrase, bpm: 100, ref });
  const audition = () => { clearTimeout(playT); playT = setTimeout(() => playSpec(mineSpec()), 120); };
  const change = () => { paintVis(); if (!touched) { touched = true; api.setReady(true); } };
  const controls = item.knobs.map((id) => {
    const def = paramById(id);
    if (def.options) {
      const seg = el('div.seg.sx-seg');
      const paint = () => seg.replaceChildren(...def.options.map((o) => el('button' + (getPath(params, def.path) === o.value ? '.on' : ''), { type: 'button', onclick: () => { setPath(params, def.path, o.value); paint(); change(); audition(); } }, o.label)));
      paint();
      return el('div.sx-ctl.opt', el('span.sx-label', def.label), seg);
    }
    const out = el('span.sx-val');
    const kn = el('span.sx-knob', el('i'));
    const range = el('input.sx-range', { type: 'range', min: 0, max: 1000, step: 1, 'aria-label': def.label });
    const setFromNorm = (x) => {
      let v = fromNorm(def, Math.max(0, Math.min(1, x)));
      if (def.step) v = Math.round(v / def.step) * def.step;
      if (def.step === 1) v = Math.round(v);
      setPath(params, def.path, +v.toFixed(4));
      sync();
      change();
    };
    const sync = () => { const v = getPath(params, def.path); const x = norm(def, v); range.value = Math.round(x * 1000); kn.style.setProperty('--v', x); out.textContent = formatParam(def, v); };
    range.addEventListener('input', () => setFromNorm(range.value / 1000));
    range.addEventListener('change', audition);
    // Tourner le potard en glissant verticalement
    kn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { kn.setPointerCapture?.(e.pointerId); } catch (err) { /* pointeur synthétique */ }
      const y0 = e.clientY, x0 = norm(def, getPath(params, def.path));
      const mv = (ev) => setFromNorm(x0 + (y0 - ev.clientY) / 160);
      const up = () => { kn.removeEventListener('pointermove', mv); kn.removeEventListener('pointerup', up); audition(); };
      kn.addEventListener('pointermove', mv);
      kn.addEventListener('pointerup', up);
    });
    sync();
    return el('div.sx-ctl', { title: def.explain || '' }, el('span.sx-label', def.label), kn, out, range);
  });
  paintVis();
  const why = el('div.ex-why');
  const mine = el('button.btn.lbtn.play', { type: 'button', onclick: () => playSpec(mineSpec()) }, '▶ Ton son');
  const target = item.match ? el('button.btn.lbtn.play.model', { type: 'button', onclick: () => playSpec(ref) }, '🎯 La cible') : null;
  const node = el('div.ex-synth', el('div.row.gap.wrap.ex-tools', target, mine), el('div.sx-panel', el('div.sx-ctls', controls), vis), why);
  return {
    node,
    value: () => params,
    reveal: (res) => {
      why.replaceChildren();
      if (item.match) {
        const tgt = resolvePatch(item.match);
        const sim = similarity(params, tgt, item.knobs);
        why.append(el('p', `Ressemblance : ${sim.score} %`), res.ok ? null : el('p.small', 'Réglages de la cible : ', item.knobs.map((id) => `${paramById(id).label} ${formatParam(paramById(id), getPath(tgt, paramById(id).path))}`).join(' · ')));
      } else if (!res.ok) {
        why.append(el('p.small', 'À viser : ', Object.entries(item.ranges).map(([id, r]) => { const d = paramById(id); return Array.isArray(r) ? `${d.label} entre ${formatParam(d, r[0])} et ${formatParam(d, r[1])}` : `${d.label} : ${formatParam(d, r)}`; }).join(' · ')));
      }
      node.querySelectorAll('.sx-ctls input, .sx-ctls button').forEach((b) => { b.disabled = true; });
    },
    destroy: () => clearTimeout(playT),
  };
}

// ---------- Maquette de Live ----------
function live(item, api) {
  let sel = null;
  const mock = liveMock({ show: item.show, onZone: (z) => { sel = z; mock.select(z); api.setReady(true); } });
  return {
    node: el('div.ex-live', mock.node),
    value: () => sel,
    reveal: (res) => { mock.select(null); [].concat(item.target).forEach((t) => mock.mark(t, 'lm-right')); if (!res.ok && sel) mock.mark(sel, 'lm-wrong'); },
    answerText: () => LIVE_ZONES[[].concat(item.target)[0]]?.name,
    explain: () => item.explain || LIVE_ZONES[[].concat(item.target)[0]]?.desc,
  };
}

// ---------- Taper en rythme ----------
function tap(item, api) {
  const bpm = item.bpm || 100, sp = 60 / bpm;
  const pattern = item.mode === 'pattern';
  const bars = item.bars || 2;
  const recBeats = pattern ? bars * 4 : item.beats || 8;
  const rel = pattern ? Array.from({ length: bars }, (_, b) => [...item.pattern].map((c, s) => (c === 'x' ? (b * 16 + s) * sp / 4 : null)).filter((x) => x != null)).flat() : Array.from({ length: recBeats }, (_, i) => i * sp);
  const steps = [...(item.pattern || '')].map((c, i) => (c === 'x' ? i : -1)).filter((i) => i >= 0);
  const minGap = pattern ? Math.min(...steps.slice(1).map((s, i) => s - steps[i]), 16) * sp / 4 : sp;
  const tol = Math.min(0.13, minGap * 0.45);
  let phase = 'idle', expected = [], taps = [], timers = [];
  const status = el('p.ex-tapstatus', pattern ? (item.listen === false ? 'Après le décompte (4 clics), à toi !' : 'Écoute le rythme une fois, puis 4 clics de décompte, puis à toi.') : 'Après 4 clics de décompte, tape sur chaque clic.');
  const dots = el('div.ex-dots', [0, 1, 2, 3].map(() => el('i')));
  const pad = el('button.tappad', { type: 'button', 'aria-label': 'Taper' }, el('span', 'TAP'));
  const start = el('button.btn3d.primary', { type: 'button', onclick: () => run() }, '▶ Commencer');
  const flash = (i, cls) => { [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i % 4)); dots.children[i % 4].classList.toggle('one', cls === 'one'); };
  const hit = (src = 'p1') => {
    pad.classList.add('hit'); setTimeout(() => pad.classList.remove('hit'), 90);
    if (phase !== 'rec') return;
    taps.push(now() - outputLatency() - inputLatency(getState().settings, src));
    playDrum(pattern ? 'kick' : 'rim', now(), 0.6, 'club');
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); ensureAudio(); hit('p1'); });
  const off = onMidi({ noteOn: (n) => hit(`m${n}`) });
  const run = () => {
    ensureAudio();
    start.disabled = true;
    taps = [];
    const listen = pattern && item.listen !== false ? bars * 4 * sp : 0;
    const evs = [];
    const T = (t, fn) => evs.push({ t, fn });
    // 1) écoute : clics + le rythme joué au kick
    if (listen) {
      for (let b = 0; b < bars * 4; b++) T(b * sp, (t) => playClick(t, b % 4 === 0));
      rel.forEach((r) => T(r, (t) => playDrum('kick', t, 0.9, 'club')));
    }
    // 2) décompte, 3) enregistrement (le clic continue)
    for (let b = 0; b < 4 + recBeats; b++) T(listen + b * sp, (t) => playClick(t, b % 4 === 0));
    const t0 = now() + 0.08;
    const recStart = t0 + listen + 4 * sp;
    expected = rel.map((r) => recStart + r);
    const ui = (t, fn) => timers.push(setTimeout(fn, Math.max(0, (t - now()) * 1000)));
    phase = listen ? 'listen' : 'count';
    status.textContent = listen ? '👂 Écoute…' : 'Décompte…';
    for (let b = 0; b < bars * 4 && listen; b++) ui(t0 + b * sp, () => flash(b));
    for (let b = 0; b < 4; b++) ui(t0 + listen + b * sp, () => { phase = 'count'; status.textContent = `Décompte : ${4 - b}`; flash(b, 'one'); });
    ui(recStart - 0.05, () => { phase = 'rec'; status.textContent = pattern ? '🥁 À toi : rejoue le rythme !' : '🥁 À toi : tape sur chaque clic !'; });
    for (let b = 0; b < recBeats; b++) ui(recStart + b * sp, () => flash(b));
    const end = recStart + recBeats * sp + tol + 0.1;
    ui(end, () => finish());
    runEvents(evs, end - t0, null);
  };
  let result = null;
  const finish = () => {
    phase = 'done';
    const r = judgeTaps(taps, expected, tol);
    const offs = r.offsets.length ? Math.round((1000 * r.offsets.reduce((a, b) => a + b, 0)) / r.offsets.length) : 0;
    const lean = Math.abs(offs) < 15 ? 'pile dans le temps' : offs > 0 ? `en retard de ${offs} ms en moyenne` : `en avance de ${-offs} ms en moyenne`;
    result = { ok: r.ok, why: `${r.hits} frappe${r.hits > 1 ? 's' : ''} juste${r.hits > 1 ? 's' : ''} sur ${r.total}${r.extra ? `, ${r.extra} en trop` : ''} · ${r.hits ? lean : 'aucune frappe au bon moment'}.` };
    status.textContent = result.why;
    api.submit();
  };
  return {
    node: el('div.ex-tap', el('div.ex-tapinfo', el('span.badge3d', `${bpm} BPM`), pattern ? el('div.ex-media', visual({ k: 'grid', rows: { rythme: item.pattern } })) : null), status, dots, pad, el('div.row.center', start), el('p.small.muted.center', 'Tape sur le pad, la barre d’espace ou n’importe quelle touche de ton clavier MIDI.')),
    value: () => result || { ok: false, why: 'Lance l’exercice avec « Commencer ».' },
    onSpace: () => { ensureAudio(); if (phase === 'idle') run(); else hit('kSpace'); return true; },
    destroy: () => { timers.forEach(clearTimeout); stopSpec(); off(); },
  };
}

// ---------- Vélocité ----------
function velocity(item, api) {
  ensureAudio();
  let idx = 0, misses = 0, last = null;
  const marker = el('i.vm-mark');
  const band = el('i.vm-band');
  const meter = el('div.vmeter', band, marker, el('small.vm-top', '127'), el('small.vm-bot', '0'));
  const val = el('div.vel-val', '—');
  const msg = el('p.ex-why');
  const chips = el('div.vel-steps', item.steps.map((s) => el('span.vchip', s.label)));
  const paint = () => {
    const s = item.steps[Math.min(idx, item.steps.length - 1)];
    band.style.bottom = `${(s.lo / 127) * 100}%`;
    band.style.height = `${((s.hi - s.lo) / 127) * 100}%`;
    [...chips.children].forEach((c, i) => { c.classList.toggle('done', i < idx); c.classList.toggle('cur', i === idx); });
  };
  let finished = false;
  const hitVel = (v127, m = 60) => {
    if (finished) return;
    ensureAudio();
    playSynth(lvPreset('epiano'), m, now(), 0.6, Math.max(0.05, v127 / 127), { send: 0.15 });
    last = v127;
    val.textContent = String(v127);
    marker.style.bottom = `${(v127 / 127) * 100}%`;
    const s = item.steps[idx];
    if (v127 >= s.lo && v127 <= s.hi) {
      msg.textContent = `✓ ${s.label} : ${v127}`;
      idx++;
      if (idx >= item.steps.length) { finished = true; result = { ok: true }; setTimeout(() => api.submit(), 350); }
    } else {
      misses++;
      msg.textContent = v127 < s.lo ? `Trop doux (${v127}) : frappe plus fort` : `Trop fort (${v127}) : frappe plus doucement`;
      if (misses >= 6) { finished = true; result = { ok: false, why: 'La vélocité demande un peu d’entraînement : on y revient tout à l’heure.' }; setTimeout(() => api.submit(), 400); }
    }
    paint();
  };
  let result = null;
  const pad = el('button.velpad', { type: 'button', 'aria-label': 'Pad : tape en haut pour fort, en bas pour doux' }, el('span', '↑ fort'), el('b', 'PAD'), el('span', '↓ doux'));
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); const r = pad.getBoundingClientRect(); const x = 1 - (e.clientY - r.top) / r.height; hitVel(Math.max(1, Math.min(127, Math.round(x * 127)))); pad.classList.add('hit'); setTimeout(() => pad.classList.remove('hit'), 100); });
  const off = onMidi({ noteOn: (n, v) => hitVel(Math.max(1, Math.round(v * 127)), n) });
  paint();
  return {
    node: el('div.ex-vel', chips, el('div.vel-main', meter, el('div.vel-side', val, pad)), msg, el('p.small.muted.center', 'Avec un clavier MIDI : joue n’importe quelle touche. À l’écran : la hauteur où tu touches le pad donne la force.')),
    value: () => result || { ok: false, why: 'Joue toutes les étapes.' },
    destroy: off,
  };
}

// ---------- Potard (Control Change) ----------
function knob(item, api) {
  let v = item.from ?? 0, holdT = null, done = false, touched = false;
  const ring = el('div.bigknob', { style: { '--v': v / 127, '--t': item.target / 127 } }, el('i.bk-cap'), el('i.bk-target'));
  const num = el('div.bk-val', String(v));
  const range = el('input.sx-range', { type: 'range', min: 0, max: 127, step: 1, value: v, 'aria-label': item.label || 'Potard' });
  const src = el('p.small.muted.center', 'Tourne un potard (ou la molette) de ton clavier MIDI, ou glisse le potard de l’écran.');
  let loop = false;
  const startAudio = () => {
    if (!item.audio || loop) return;
    loop = true;
    ensureAudio();
    const base = resolvePatch({ osc: [{ wave: 'sawtooth', voices: 3, detune: 12 }], filter: { cutoff: 400, q: 4 }, amp: { a: 0.003, d: 0.25, s: 0.4, r: 0.1 }, reverb: 0.1 });
    const seq = [45, 57, 45, 52, 45, 57, 48, 52];
    transport.start((step, time, sd) => {
      if (step % 2) return;
      const p = { ...base, filter: { ...base.filter, cutoff: 80 * Math.pow(2, (v / 127) * 7.3) } };
      playSynth(p, seq[(step / 2) % seq.length], time, sd * 1.6, 0.75, { send: 0.1 });
    }, null, { bpm: 120, swing: 0 });
  };
  const set = (x, from = 'ui') => {
    if (done) return;
    v = Math.max(0, Math.min(127, Math.round(x)));
    if (!touched) { touched = true; api.setReady(true); }
    ring.style.setProperty('--v', v / 127);
    num.textContent = String(v);
    range.value = v;
    if (from === 'midi') src.textContent = '🎹 Ton contrôleur pilote le potard';
    startAudio();
    const near = Math.abs(v - item.target) <= item.tol;
    ring.classList.toggle('near', near);
    if (near && !holdT) holdT = setTimeout(() => { done = true; ring.classList.add('ok'); api.submit(); }, 650);
    if (!near && holdT) { clearTimeout(holdT); holdT = null; }
  };
  range.addEventListener('input', () => set(+range.value));
  ring.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    try { ring.setPointerCapture?.(e.pointerId); } catch (err) { /* pointeur synthétique */ }
    const y0 = e.clientY, v0 = v;
    const mv = (ev) => set(v0 + (y0 - ev.clientY) * 0.8);
    const up = () => { ring.removeEventListener('pointermove', mv); ring.removeEventListener('pointerup', up); };
    ring.addEventListener('pointermove', mv);
    ring.addEventListener('pointerup', up);
  });
  const off = onMidi({ cc: (n, val) => set(val * 127, 'midi') });
  return {
    node: el('div.ex-knob', el('div.bk-wrap', ring, el('div.bk-info', el('small', item.label || 'Potard'), num, el('small', `cible : ${item.target}`))), range, src),
    value: () => ({ ok: Math.abs(v - item.target) <= item.tol, why: `Tu étais à ${v}, la cible était ${item.target}.` }),
    destroy: () => { clearTimeout(holdT); off(); if (loop) transport.stop(); },
  };
}

const RENDER = { card, mcq, shortcut, pairs, order, blank, number, keys, grid, roll, synth: synthEx, live, tap, velocity, knob };

/** Petite étiquette au-dessus de la consigne. */
export function typeLabel(item) {
  if (item.t === 'mcq') return item.play || item.plays ? '👂 Écoute' : item.visual ? '👀 Observe' : '🤔 Choisis la bonne réponse';
  return { card: '✨ Nouvelle notion', shortcut: '⌨️ Raccourci', pairs: '🔗 Associe les paires', order: '🔢 Remets dans l’ordre', blank: '✍️ Complète', number: '🧮 Calcule', keys: '🎹 Au clavier', grid: '🥁 Boîte à rythmes', roll: '🎼 Piano roll', synth: '🎛️ Au synthé', live: '🖱️ Dans Live', tap: '👆 En rythme', velocity: '💪 Vélocité', knob: '🎚️ Potard' }[item.t] || '';
}

/** Rend un exercice. */
export function renderItem(item, api) {
  const fn = RENDER[item.t];
  if (!fn) throw new Error(`Type d'exercice inconnu : ${item.t}`);
  prepareItem(item);
  const r = fn(item, api);
  return { reveal() {}, answerText: () => null, destroy() {}, ...r };
}

// ---------- Aides au bon moment ----------
const MIDI_USE = {
  keys: 'joue la réponse directement sur ton clavier',
  tap: 'tape le rythme sur n’importe quelle touche ou pad',
  velocity: 'frappe tes touches : la force compte',
  knob: 'tourne un potard ou la molette de ton contrôleur',
  grid: 'tes pads jouent les sons de la grille',
};
/** Cet exercice peut se faire au clavier MIDI. */
export const midiPlayable = (item) => !!MIDI_USE[item.t];
/**
 * Bandeau « 🎹 Clavier MIDI détecté » quand l'exercice peut se jouer au clavier (mis à jour si on branche en cours de route).
 * Renvoie { node, destroy } ou null.
 */
export function midiBanner(item) {
  if (!midiPlayable(item) || !midiSupported()) return null;
  const node = el('div.midi-banner', { role: 'status' });
  const short = (n = '') => n.replace(/\s*\(.*\)\s*/g, '').replace(/^(\d+-\s*)/, '').slice(0, 22) || 'clavier MIDI';
  const paint = (st = midiStatus()) => {
    const on = st.state === 'connected';
    node.hidden = !on;
    if (on) node.replaceChildren(el('span.mb-ico', { 'aria-hidden': 'true' }, '🎹'), el('span', el('b', 'Clavier MIDI détecté'), ` · ${short(st.devices?.[0])} — ${MIDI_USE[item.t]}.`));
  };
  const off = onMidiStatus(paint);
  paint();
  return { node, destroy: () => { if (typeof off === 'function') off(); } };
}

