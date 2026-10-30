// Boîte à outils du studio : tap tempo et temps de delay, roue Camelot, accords de la tonalité, accordage du kick.
// Pensée pour rester ouverte à côté d'Ableton : tout se lit d'un coup d'œil, rien ne se perd en changeant de réglage.
import { el, card, header, segmented, toast } from '../ui.js';
import { getState, update } from '../store.js';
import { ensureAudio, playSynth, now } from '../core/audio.js';
import { presetParams } from '../player.js';
import { NOTE_NAMES, NOTE_NAMES_FR, midiToName, closeVoicing, mod } from '../core/theory.js';
import { noteTimes, barsSeconds, tapTempo, camelot, fromCamelot, compatibleKeys, keyName, nearestNote, lowNotes, keyChords } from '../core/toolbox.js';
import { viewKeys } from '../shortcuts.js';

const MINORISH = ['minor', 'dorian', 'phrygian', 'harmonicMinor', 'pentaMinor', 'blues'];
const fmt = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(2).replace('.', ',')} s` : `${ms.toFixed(ms < 100 ? 1 : 0).replace('.', ',')} ms`);
const hz = (f) => `${f.toFixed(f < 100 ? 1 : 0).replace('.', ',')} Hz`;

export function render(root) {
  const p = getState().project;
  let bpm = p.bpm;
  let key = { pc: p.rootPc, minor: MINORISH.includes(p.scale) };
  let sevenths = false;
  const taps = [];

  // ---------- Tempo ----------
  const bpmIn = el('input.tool-bpm', { type: 'number', min: 40, max: 250, step: 0.1, value: bpm, 'aria-label': 'Tempo en BPM', inputmode: 'decimal',
    oninput: (e) => { const v = parseFloat(e.target.value); if (v >= 40 && v <= 250) { bpm = v; paintTempo(); } } });
  const tapBtn = el('button.btn.tool-tap', { type: 'button', onpointerdown: (e) => { e.preventDefault(); tap(); } }, 'TAP');
  const tempoBody = el('div');
  function tap() {
    const t = performance.now();
    if (taps.length && t - taps.at(-1) > 2000) taps.length = 0;
    taps.push(t);
    tapBtn.classList.remove('hit'); void tapBtn.offsetWidth; tapBtn.classList.add('hit');
    const v = tapTempo(taps);
    if (v) { bpm = v; bpmIn.value = v; paintTempo(); }
    else tapBtn.textContent = `TAP ${taps.length}…`;
  }
  function paintTempo() {
    tapBtn.textContent = 'TAP';
    const rows = noteTimes(bpm);
    tempoBody.replaceChildren(
      el('div.table-scroll', el('table.tool-table',
        el('thead', el('tr', el('th', 'Note'), el('th', 'Normale'), el('th', 'Pointée'), el('th', 'Triolet'), el('th', 'LFO'))),
        el('tbody', rows.map((r) => el('tr', el('th', r.label), el('td', fmt(r.straight)), el('td', fmt(r.dotted)), el('td', fmt(r.triplet)), el('td', hz(r.hz))))))),
      el('p.small.muted', `1 mesure = ${fmt(barsSeconds(bpm) * 1000)} · 8 mesures = ${fmt(barsSeconds(bpm, 8) * 1000)} · 32 mesures = ${fmt(barsSeconds(bpm, 32) * 1000)}`),
      el('p.small.muted', '💡 Delay en ms dans Live (Echo, Delay en mode « Time ») ; pré-delay de réverbe ≈ 1/64 à 1/32 ; release d’un compresseur calé sur une croche pour qu’il respire avec le groove.'));
  }

  // ---------- Tonalité : roue Camelot + accords ----------
  const keyBody = el('div');
  const chordsBody = el('div');
  const kickBody = el('div');
  const setKey = (k) => { key = k; paintKey(); };
  function wheel() {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-110 -110 220 220');
    svg.setAttribute('class', 'camelot');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Roue Camelot : ${keyName(key.pc, key.minor)} = ${camelot(key.pc, key.minor).code}`);
    const cur = camelot(key.pc, key.minor).code;
    const comp = new Set(compatibleKeys(key.pc, key.minor).map((x) => x.code));
    const arc = (r0, r1, a0, a1) => {
      const P = (r, a) => `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
      return `M ${P(r1, a0)} A ${r1} ${r1} 0 0 1 ${P(r1, a1)} L ${P(r0, a1)} A ${r0} ${r0} 0 0 0 ${P(r0, a0)} Z`;
    };
    for (const [letter, r0, r1] of [['B', 70, 106], ['A', 34, 70]]) {
      for (let n = 1; n <= 12; n++) {
        const a0 = ((n - 1.5) / 12) * 2 * Math.PI, a1 = ((n - 0.5) / 12) * 2 * Math.PI;
        const code = `${n}${letter}`;
        const k = fromCamelot(n, letter);
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'cam-seg' + (code === cur ? ' on' : comp.has(code) ? ' near' : ''));
        g.setAttribute('role', 'button');
        g.setAttribute('tabindex', '0');
        g.setAttribute('aria-label', `${code} : ${keyName(k.pc, k.minor)}`);
        g.addEventListener('click', () => setKey(k));
        g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setKey(k); } });
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', arc(r0, r1, a0, a1));
        const mid = (a0 + a1) / 2, rm = (r0 + r1) / 2;
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', (rm * Math.sin(mid)).toFixed(1));
        t.setAttribute('y', (-rm * Math.cos(mid)).toFixed(1));
        t.innerHTML = `<tspan x="${(rm * Math.sin(mid)).toFixed(1)}" dy="-1">${code}</tspan><tspan x="${(rm * Math.sin(mid)).toFixed(1)}" dy="8">${keyName(k.pc, k.minor)}</tspan>`;
        g.append(path, t);
        svg.append(g);
      }
    }
    return svg;
  }
  function paintKey() {
    const c = camelot(key.pc, key.minor);
    keyBody.replaceChildren(
      el('div.row.gap.wrap.tool-key',
        el('select', { 'aria-label': 'Tonique', onchange: (e) => setKey({ ...key, pc: +e.target.value }) },
          NOTE_NAMES.map((n, i) => el('option', { value: i, selected: i === key.pc }, `${n} (${NOTE_NAMES_FR[i]})`))),
        segmented([{ value: false, label: 'Majeur' }, { value: true, label: 'Mineur' }], key.minor, (v) => setKey({ ...key, minor: v })),
        el('b.tool-code', c.code)),
      el('div.tool-wheel', wheel()),
      el('ul.tool-compat', compatibleKeys(key.pc, key.minor).slice(1).map((k) => el('li',
        el('button.chip-tile', { type: 'button', onclick: () => setKey(k) }, el('b', k.code), ` ${keyName(k.pc, k.minor)}`),
        el('span.small.muted', k.why)))),
      el('p.small.muted', '🎧 En DJ set : enchaîne vers une case voisine (même numéro, ou ±1). En prod : un break qui passe au relatif, ou un dernier refrain +2, garde l’oreille en terrain connu.'));
    paintChords();
    paintKick();
  }
  function paintChords() {
    const list = keyChords(key.pc, key.minor, sevenths ? 4 : 3);
    chordsBody.replaceChildren(
      el('div.row.between.wrap', el('p.small.muted', `Les 7 accords de ${keyName(key.pc, key.minor)} : touche pour écouter.`),
        segmented([{ value: false, label: 'Triades' }, { value: true, label: '7ᵉ' }], sevenths, (v) => { sevenths = v; paintChords(); })),
      el('div.tool-chords', list.map((ch) => el('button.tool-chord', { type: 'button', onclick: () => {
        ensureAudio();
        const t = now();
        closeVoicing(ch.pcs, 60).forEach((m) => playSynth(presetParams('piano'), m, t, 1.1, 0.7, { send: 0.2 }));
      } }, el('b', ch.symbol), el('small', ch.roman), el('span', ch.pcs.map((x) => NOTE_NAMES[x]).join(' '))))),
      el('button.btn.small', { onclick: () => {
        update((s) => { s.project.rootPc = key.pc; s.project.scale = key.minor ? 'minor' : 'major'; });
        toast(`🎵 Ton idée passe en ${keyName(key.pc, key.minor)}`, 'good');
      } }, '💡 Utiliser cette tonalité pour mon idée'));
  }
  const freqIn = el('input.tool-freq', { type: 'number', min: 20, max: 2000, step: 0.1, placeholder: 'ex. 52', 'aria-label': 'Fréquence en Hz', inputmode: 'decimal', oninput: () => paintNearest() });
  const nearOut = el('p.small');
  function paintNearest() {
    const f = parseFloat(freqIn.value);
    if (!(f >= 20 && f <= 2000)) { nearOut.textContent = ''; return; }
    const n = nearestNote(f);
    const r = mod(n.midi - key.pc, 12);
    nearOut.replaceChildren('→ ', el('b', midiToName(n.midi)), ` (${hz(n.freq)}), ${n.cents > 0 ? '+' : ''}${n.cents} cents.`,
      r === 0 || r === 7 ? ' ✅ Tonique ou quinte de ta tonalité : parfait pour un kick.' : ` Pour ${keyName(key.pc, key.minor)}, monte ou descends le pitch de ton kick vers ${NOTE_NAMES[key.pc]} ou ${NOTE_NAMES[(key.pc + 7) % 12]}.`);
  }
  function paintKick() {
    const notes = lowNotes(key.pc, key.minor).filter((x) => x.role && x.freq >= 30 && x.freq <= 130);
    kickBody.replaceChildren(
      el('p.small.muted', `Un kick ou une sub qui sonnent sur la tonique (ou la quinte) de ${keyName(key.pc, key.minor)} se marient avec la basse au lieu de la masquer.`),
      el('div.tool-kicks', notes.map((x) => el('div.tool-kick' + (x.role === 'tonique' ? '.on' : ''), el('b', midiToName(x.midi)), el('span', hz(x.freq)), el('small', x.role)))),
      el('div.row.gap.wrap', el('label.small', 'Mon kick sonne à ', freqIn, ' Hz'), nearOut),
      el('p.small.muted', '🔍 Repère la fondamentale avec Spectrum dans Live (zoom sur 30–120 Hz), puis Transpose dans Simpler ou la molette de tune de ton kick. Hard trance / hard house : kick accordé, sinon il « bave » sur la basse roulante.'));
    paintNearest();
  }

  root.append(
    header('🧰 Boîte à outils', 'Les calculs du studio, prêts à recopier dans Live, Serum ou sur le MPC.'),
    el('div.cols',
      el('div',
        card(el('h3', '⏱️ Tempo, delays et LFO'),
          el('div.row.gap.wrap.tool-tempo', el('label', bpmIn, ' BPM'), tapBtn,
            el('button.btn.small', { onclick: () => { bpm = getState().project.bpm; bpmIn.value = bpm; paintTempo(); } }, '💡 Tempo de mon idée'),
            el('button.btn.small', { onclick: () => { const v = Math.max(60, Math.min(180, Math.round(bpm))); update((s) => { s.project.bpm = v; }); toast(`💡 Ton idée passe à ${v} BPM`, 'good'); } }, 'Appliquer à mon idée')),
          el('p.small.muted', 'Tape au moins 3 fois sur TAP (ou Espace) au rythme d’un morceau.'),
          tempoBody),
        card(el('h3', '🥁 Accorder le kick et la basse'), kickBody)),
      el('div',
        card(el('h3', '🎡 Roue Camelot (mix harmonique)'), keyBody),
        card(el('h3', '🎹 Accords de la tonalité'), chordsBody))),
  );
  paintTempo();
  paintKey();
  viewKeys({ space: tap });
}
