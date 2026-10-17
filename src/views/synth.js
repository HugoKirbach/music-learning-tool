import { el, card, header, segmented, select, slider, hintBox, finishExercise, toast, modal } from '../ui.js';
import { getState, update, level } from '../store.js';
import { PRESETS, makePreset } from '../data/presets.js';
import { PARAMS, paramById, getPath, setPath, normalizeParams, norm, fromNorm, similarity, formatParam, CHALLENGE_VALUES } from '../core/synthparams.js';
import { playSynth, ensureAudio, now, transport } from '../core/audio.js';
import { midiToName } from '../core/theory.js';
import { onMidi } from '../midiin.js';

export const INIT = makePreset({
  osc: [{ wave: 'sawtooth', semi: 0, voices: 1, detune: 10, level: 0.8 }, { wave: 'sawtooth', semi: 12, voices: 1, detune: 0, level: 0 }],
  filter: { type: 'lowpass', cutoff: 3000, q: 1, envAmt: 0 },
  fenv: { a: 0.005, d: 0.3, s: 0, r: 0.2 },
  amp: { a: 0.005, d: 0.4, s: 0.6, r: 0.3 },
  lfo: { target: 'none', rate: 5, depth: 0.4 },
  gain: 0.4,
});

/** Joue une petite phrase test avec des paramètres donnés. */
export function phrase(params, startDelay = 0.05, base = 48) {
  ensureAudio();
  const t0 = now() + startDelay;
  const e = 60 / 110 / 2;
  [[0, 0, 0.8], [12, 1, 0.8], [7, 2, 0.8], [10, 3, 0.8], [12, 4, 3.5]].forEach(([iv, pos, len]) => {
    playSynth(params, base + iv, t0 + pos * e, len * e, 0.85, { send: 0.2 });
  });
  return e * 8;
}

/** Clavier tactile (multi-touch) + clavier d'ordinateur. */
export function keyboard({ base = 48, octaves = 2, onDown, onUp, inScale }) {
  const wrap = el('div.keys');
  const whites = [0, 2, 4, 5, 7, 9, 11];
  const keys = {};
  const whiteCount = whites.length * octaves + 1;
  let wi = 0;
  for (let m = base; m <= base + 12 * octaves; m++) {
    const pc = m % 12;
    const black = !whites.includes(pc);
    const k = el('div.key' + (black ? '.black' : '') + (inScale?.(m) ? '.inscale' : ''), pc === 0 ? midiToName(m) : '');
    if (black) {
      k.style.left = `calc(${(wi / whiteCount) * 100}% - ${100 / whiteCount / 3}%)`;
      k.style.width = `${(100 / whiteCount) * 0.66}%`;
    } else wi++;
    k.dataset.midi = m;
    keys[m] = k;
    wrap.appendChild(k);
  }
  const active = new Map();
  const down = (pid, m) => { if (active.get(pid) === m) return; up(pid); active.set(pid, m); keys[m]?.classList.add('down'); onDown(m); };
  const up = (pid) => { const m = active.get(pid); if (m == null) return; active.delete(pid); keys[m]?.classList.remove('down'); onUp(m); };
  const keyAt = (x, y) => { const t = document.elementFromPoint(x, y); return t && t.dataset && t.dataset.midi ? +t.dataset.midi : null; };
  wrap.addEventListener('pointerdown', (e) => { e.preventDefault(); wrap.setPointerCapture?.(e.pointerId); const m = keyAt(e.clientX, e.clientY); if (m != null) down(e.pointerId, m); });
  wrap.addEventListener('pointermove', (e) => { if (!active.has(e.pointerId)) return; const m = keyAt(e.clientX, e.clientY); if (m != null) down(e.pointerId, m); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => wrap.addEventListener(t, (e) => up(e.pointerId)));

  const map = 'awsedftgyhujkolp';
  const kd = (e) => {
    if (e.repeat || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const i = map.indexOf(e.key.toLowerCase());
    if (i >= 0) down('k' + e.key, base + 12 + i);
  };
  const ku = (e) => up('k' + e.key);
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  return {
    node: wrap,
    destroy: () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); },
    light: (m, on) => keys[m]?.classList.toggle('down', on),
    mark: (m, on) => keys[m]?.classList.toggle('mark', on),
    clearMarks: () => Object.values(keys).forEach((k) => k.classList.remove('mark')),
  };
}

function paramControl(def, getP, onChange) {
  if (def.options) {
    return el('div.ctrl-row', { 'data-param': def.id }, el('label', { style: { width: '92px' } }, def.label),
      segmented(def.options, getPath(getP(), def.path), (v) => { setPath(getP(), def.path, v); onChange(def); }));
  }
  const v = getPath(getP(), def.path);
  const sl = slider({
    label: def.label, min: 0, max: 1, step: 0.001, value: norm(def, v),
    format: (x) => formatParam(def, def.step >= 1 ? Math.round(fromNorm(def, x)) : fromNorm(def, x)),
    onInput: (x) => { let val = fromNorm(def, x); if (def.step >= 1) val = Math.round(val); setPath(getP(), def.path, val); onChange(def); },
  });
  sl.dataset.param = def.id;
  return sl;
}

// Potards par défaut (CC standards) ; tout est réassignable par « MIDI learn ».
const DEFAULT_CC = { 74: 'cutoff', 71: 'q', 73: 'attack', 72: 'release', 1: 'lfoDepth' };

export function render(root, params) {
  const mode = params.mode || 'free';
  root.append(header('Lab Synthé', mode === 'match' ? 'Reproduis le son mystère' : 'Sound design soustractif, traduit pour Serum 2'));
  root.append(el('div.row.gap.wrap', { style: { marginBottom: '10px' } },
    segmented([{ value: 'free', label: '🎨 Libre' }, { value: 'match', label: '🎯 Son mystère' }], mode, (v) => { location.hash = `#/synth?mode=${v}`; }),
    el('a.btn.small.ghost', { href: '#/ear?mode=sound&n=6' }, '👂 Quiz A/B')));
  return mode === 'match' ? matchMode(root) : freeMode(root, params);
}

function freeMode(root, params) {
  let presetId = params.preset || 'pluck';
  let p = normalizeParams(PRESETS[presetId].params);
  let octave = 0;
  const held = new Map();
  const getP = () => p;
  const serumBox = el('div');
  const explain = el('div.lesson', el('div.lesson-title', '🎛️ Paramètre'), el('p', 'Touche un réglage pour voir son équivalent dans Serum 2.'));
  const controlsEl = el('div');

  const renderSerum = () => {
    const pr = PRESETS[presetId];
    serumBox.replaceChildren(el('h3', `🌊 Recette Serum 2 : ${pr ? pr.name : 'Mon son'}`),
      pr ? el('ol.mission-steps', pr.serum.map((s) => el('li', s))) : el('p.muted', 'Son personnalisé : reporte chaque réglage avec la correspondance ci-dessus.'));
  };
  const onChange = (def) => {
    if (learning) { learnParam = def.id; paintLearn(); }
    explain.replaceChildren(el('div.lesson-title', `🎛️ ${def.label} = ${formatParam(def, getPath(p, def.path))}`), el('p', def.explain || ''), el('p.small', el('b', 'Serum 2 : '), def.serum));
  };
  const renderControls = () => {
    const groups = [...new Set(PARAMS.map((d) => d.group))];
    controlsEl.replaceChildren(...groups.map((g) => el('details', { open: g !== 'LFO & FX' }, el('summary', el('b', g)), PARAMS.filter((d) => d.group === g).map((d) => paramControl(d, getP, onChange)))));
  };

  const start = (m) => { ensureAudio(); const v = playSynth(p, m + octave * 12, now(), null, 0.85, { send: 0.25 }); held.set(m, v); };
  const stop = (m) => { held.get(m)?.release(); held.delete(m); };
  const kb = keyboard({ base: 48, octaves: 2, onDown: start, onUp: stop });
  // ---------- Potards MIDI (Q-Links du MPC) ----------
  let learning = false, learnParam = null;
  const ccMap = () => ({ ...DEFAULT_CC, ...(getState().settings.ccMap || {}) });
  const learnBox = el('div');
  const paintLearn = () => {
    const map = ccMap();
    learnBox.replaceChildren(
      learning ? el('div.lesson', el('div.lesson-title', '🎛️ MIDI learn'),
        el('p', learnParam ? el('span', 'Tourne maintenant un potard pour le lier à ', el('b', paramById(learnParam).label), '.') : 'Touche le réglage à piloter (glisse un curseur), puis tourne un potard du MPC.')) : null,
      el('p.small.muted', 'Potards : ' + Object.entries(map).map(([cc, id]) => `CC${cc} → ${paramById(id)?.label}`).join(' · ')),
    );
  };
  const learnBtn = el('button.btn.small', {
    onclick: () => { learning = !learning; learnParam = null; learnBtn.classList.toggle('primary', learning); paintLearn(); },
  }, '🎛️ Assigner un potard');
  const applyCc = (id, v) => {
    const def = paramById(id);
    const node = controlsEl.querySelector(`[data-param="${id}"]`);
    if (def.options) {
      const opt = def.options[Math.min(def.options.length - 1, Math.floor(v * def.options.length))].value;
      if (getPath(p, def.path) === opt) return;
      setPath(p, def.path, opt);
      renderControls();
    } else if (node) {
      const input = node.querySelector('input');
      input.value = v;
      input.dispatchEvent(new Event('input'));
    }
    onChange(def);
  };
  const offMidi = onMidi({
    noteOn: (n, v) => { ensureAudio(); held.get('m' + n)?.release(); held.set('m' + n, playSynth(p, n, now(), null, v, { send: 0.25 })); kb.light(n, true); },
    noteOff: (n) => { held.get('m' + n)?.release(); held.delete('m' + n); kb.light(n, false); },
    cc: (cc, v) => {
      if (learning && learnParam) {
        update((s) => { s.settings.ccMap = { ...(s.settings.ccMap || {}), [cc]: learnParam }; });
        toast(`CC${cc} → ${paramById(learnParam).label} 🎛️`, 'good');
        learnParam = null; learning = false; learnBtn.classList.remove('primary'); paintLearn();
        return;
      }
      const id = ccMap()[cc];
      if (id) applyCc(id, v);
    },
  });

  let looping = false;
  const loopBtn = el('button.btn.small', {
    onclick: () => {
      looping = !looping;
      loopBtn.classList.toggle('primary', looping);
      if (looping) {
        transport.start((step, time, sd) => {
          const riff = [0, null, 12, null, 7, null, 10, 12, 0, null, 12, 7, null, 3, null, 5];
          const iv = riff[step % 16];
          if (iv != null) playSynth(p, 48 + octave * 12 + iv, time, sd * 1.6, 0.8, { send: 0.2 });
        }, null, { bpm: 118, swing: 0 });
      } else transport.stop();
    },
  }, '🔁 Riff test');

  const presetSel = select(Object.entries(PRESETS).map(([k, x]) => ({ value: k, label: `${x.name} (${{ chords: 'accords', lead: 'lead', bass: 'basse' }[x.role]})` })), presetId, (v) => {
    presetId = v; p = normalizeParams(PRESETS[v].params); renderControls(); renderSerum(); phrase(p, 0.05, PRESETS[v].role === 'bass' ? 36 : 48);
  });

  root.append(
    el('div.cols',
      el('div',
        card(el('div.ctrl-row', presetSel, el('button.btn.small', { onclick: () => { presetId = null; p = normalizeParams(INIT); renderControls(); renderSerum(); } }, 'Init'), loopBtn),
          kb.node,
          el('div.ctrl-row', el('label', 'Octave'), segmented([{ value: -1, label: '−1' }, { value: 0, label: '0' }, { value: 1, label: '+1' }], 0, (v) => { octave = v; }),
            el('span.small.muted', 'PC : touches A W S E D F T G Y H U J K')),
          el('div.ctrl-row', learnBtn, el('button.btn.small.ghost', { onclick: () => { update((s) => { s.settings.ccMap = {}; }); paintLearn(); } }, 'Réinitialiser')),
          learnBox,
          el('p.small.muted', 'Astuce : lance « 🔁 Riff test » et tourne les potards pour entendre chaque réglage en temps réel.'),
          explain),
        card(serumBox),
      ),
      el('div', card(controlsEl,
        el('div.row.gap.wrap', { style: { marginTop: '8px' } },
          el('button.btn.small', {
            onclick: () => {
              update((s) => { s.notebook.unshift({ id: Date.now(), type: 'sound', title: `Son ${presetId ? PRESETS[presetId]?.name + ' modifié' : 'perso'}`, date: Date.now(), params: JSON.parse(JSON.stringify(p)) }); });
              toast('Son sauvé dans le Carnet 📓', 'good');
            },
          }, '📓 Sauver le son'),
          el('button.btn.small', { onclick: () => showSerumSheet(p) }, '🌊 Fiche Serum 2'),
          el('button.btn.small.primary', {
            onclick: () => finishExercise({ key: 'synth:free', title: 'Exploration synthé', xp: 12, skill: 'sound', success: true,
              lesson: 'Change un seul paramètre à la fois, joue, écoute. Puis remets-le : ton oreille apprend ce que fait chaque bouton.',
              transfer: 'Ouvre Serum 2 en Init et refais ce son avec la fiche. Nomme le preset avec ce que tu as appris.' }),
          }, '✓ J’ai exploré')),
      )),
    ),
  );
  if (params.load) {
    const it = getState().notebook.find((n) => String(n.id) === params.load);
    if (it?.params) { p = normalizeParams(it.params); presetId = null; }
  }
  renderControls();
  renderSerum();
  paintLearn();
  return () => { kb.destroy(); offMidi(); transport.stop(); held.forEach((v) => v.release()); };
}

function showSerumSheet(p) {
  modal(el('div', el('h2', '🌊 Fiche Serum 2'), el('p.muted', 'Ouvre Serum 2 > Init Preset et reporte ces valeurs :'),
    el('ul.clean', PARAMS.filter((d) => {
      const v = getPath(p, d.path);
      if (d.id === 'level2' || d.id === 'wave2' || d.id === 'semi2') return p.osc[1]?.level > 0.01;
      if (d.id.startsWith('lfo') && d.id !== 'lfoTarget') return p.lfo.target !== 'none';
      if (['sub', 'glide', 'drive', 'envAmt'].includes(d.id)) return v > 0;
      return true;
    }).map((d) => el('li', el('b', d.serum), ' → ', formatParam(d, getPath(p, d.path))))),
    el('p.small.muted', 'Les valeurs sont approximatives : Serum utilise ses propres échelles. Fais confiance à ton oreille !')));
}

function matchMode(root) {
  const lv = level();
  const keys = Object.keys(CHALLENGE_VALUES);
  const n = lv < 4 ? 2 : lv < 8 ? 3 : 4;
  const chosen = [];
  while (chosen.length < n) { const k = keys[Math.floor(Math.random() * keys.length)]; if (!chosen.includes(k)) chosen.push(k); }
  const target = normalizeParams(INIT);
  const mine = normalizeParams(INIT);
  for (const id of chosen) {
    const def = paramById(id);
    const opts = CHALLENGE_VALUES[id].filter((v) => v !== getPath(INIT, def.path));
    setPath(target, def.path, opts[Math.floor(Math.random() * opts.length)]);
  }
  // décor : on montre aussi un paramètre inutile pour forcer l'écoute
  const decoy = keys.find((k) => !chosen.includes(k));
  const shown = [...chosen, decoy].sort(() => Math.random() - 0.5);
  let hintUsed = false;
  const getP = () => mine;
  const scoreEl = el('b');

  root.append(card(
    el('div.lesson', el('div.lesson-title', '🎯 Son mystère'), el('p', `Le son mystère a été créé à partir de « Init » en modifiant ${n} paramètres parmi ceux ci-dessous (un des réglages est un leurre). Écoute, compare, ajuste.`)),
    el('div.row.gap.wrap',
      el('button.btn.primary', { onclick: () => phrase(target) }, '▶ Son mystère'),
      el('button.btn', { onclick: () => phrase(mine) }, '▶ Mon son'),
      el('button.btn', { onclick: () => { const d = phrase(target); setTimeout(() => phrase(mine), d * 1000 + 300); } }, '▶ A puis B'),
    ),
    el('div', { style: { marginTop: '10px' } }, shown.map((id) => paramControl(paramById(id), getP, () => {}))),
    hintBox(el('div', el('p', 'Écoute dans cet ordre : 1) la forme d’onde (timbre de base), 2) la brillance (cutoff), 3) l’attaque et la fin de la note (enveloppe), 4) le mouvement (LFO).'), el('p', 'Astuce : exagère un réglage pour entendre ce qu’il fait, puis reviens en arrière.')), () => { hintUsed = true; }),
    el('div.row.between', el('span.muted', 'Score'), scoreEl),
    el('div.row.gap.wrap',
      el('button.btn', {
        onclick: () => { const r = similarity(target, mine, chosen); scoreEl.textContent = `${r.score}%`; toast(`${r.score}% de ressemblance`); },
      }, '🔍 Comparer'),
      el('button.btn.primary', {
        onclick: () => {
          const r = similarity(target, mine, chosen);
          update((s) => { s.stats.bestMatch = Math.max(s.stats.bestMatch, r.score); });
          finishExercise({ key: 'synth:match', title: 'Son mystère', score: r.score, xp: 10 + r.score * 0.4, skill: 'sound', hintUsed, success: r.score >= 80,
            details: el('ul.clean.small', { style: { textAlign: 'left' } }, chosen.map((id) => { const d = paramById(id); return el('li', `${d.label} : cible ${formatParam(d, getPath(target, d.path))}, toi ${formatParam(d, getPath(mine, d.path))} ${r.detail[id] > 0.8 ? '✓' : ''}`); })),
            lesson: 'Reconnaître un réglage à l’oreille, c’est ce qui te permettra de recréer les sons que tu entends dans tes morceaux préférés.',
            transfer: `Dans Serum 2, Init Preset puis règle : ${chosen.map((id) => paramById(id).serum).join(' ; ')}. Compare avec ce que tu entends ici.`,
            onRetry: () => { location.hash = `#/synth?mode=match&r=${Date.now()}`; } });
        },
      }, 'Terminer'),
    ),
  ));
  return () => transport.stop();
}
