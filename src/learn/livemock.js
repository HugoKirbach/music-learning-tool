// Maquette simplifiée de l'interface d'Ableton Live 12, pour apprendre où cliquer.
// Chaque élément cliquable porte data-zone (voir LIVE_ZONES dans src/data/ableton.js).
import { el } from '../ui.js';
import { LIVE_ZONES } from '../data/ableton.js';

const z = (zone, tag, props = {}, ...kids) => el(tag, { ...props, 'data-zone': zone, title: props.title || LIVE_ZONES[zone]?.name }, ...kids);
const knob = (zone, label, v = 0.5) => z(zone, 'span.lm-knob', { style: { '--v': v } }, el('i'), label ? el('small', label) : null);

function controlBar() {
  return el('div.lm-control',
    el('div.lm-group',
      z('tap', 'span.lm-btn', {}, 'TAP'),
      z('tempo', 'span.lm-field', {}, '124.00'),
      z('timesig', 'span.lm-field', {}, '4 / 4'),
      z('metronome', 'span.lm-btn.round', {}, '◉'),
      z('quantize', 'span.lm-field', {}, '1 Bar ▾')),
    el('div.lm-group',
      z('play', 'span.lm-btn', {}, '▶'),
      z('stop', 'span.lm-btn', {}, '■'),
      z('rec', 'span.lm-btn.rec', {}, '●'),
      z('overdub', 'span.lm-btn', {}, '+'),
      z('automation-arm', 'span.lm-btn', {}, '⤴'),
      z('capture', 'span.lm-btn', {}, '⇣≡'),
      z('session-rec', 'span.lm-btn.rec', {}, '⊙'),
      z('loop', 'span.lm-btn', {}, '⟳'),
      z('draw', 'span.lm-btn', {}, '✎')),
    el('div.lm-group',
      z('key-map', 'span.lm-btn.txt', {}, 'KEY'),
      z('midi-map', 'span.lm-btn.txt', {}, 'MIDI'),
      z('cpu', 'span.lm-field.dim', {}, 'CPU 12 %'),
      z('view-switch', 'span.lm-views', {}, el('i.on', '▦'), el('i', '≡'))));
}

function browser() {
  const cat = (zone, icon, name) => z(zone, 'span.lm-cat', {}, el('i', icon), name);
  return el('div.lm-browser',
    z('br-search', 'span.lm-search', {}, '🔍 Rechercher'),
    el('small.lm-head', 'Collections'),
    cat('br-sounds', '🎹', 'Sounds'), cat('br-drums', '🥁', 'Drums'), cat('br-instruments', '🎛️', 'Instruments'),
    cat('br-audiofx', '🔊', 'Audio Effects'), cat('br-midifx', '🎼', 'MIDI Effects'), cat('br-plugins', '🔌', 'Plug-ins'),
    cat('br-clips', '🎞️', 'Clips'), cat('br-samples', '〰️', 'Samples'),
    el('small.lm-head', 'Places'),
    cat('br-user', '📁', 'User Library'));
}

const TRACKS = [
  { name: '1 Drums', color: '#ff8a65', clips: ['Beat', 'Fill', null] },
  { name: '2 Bass', color: '#ffd54f', clips: ['Bass', null, 'Bass B'] },
  { name: '3 Keys', color: '#81c784', clips: [null, 'Chords', null] },
];

function session() {
  const col = (t, i) => el('div.lm-track',
    z('track-title', 'span.lm-title', { style: { '--c': t.color } }, t.name),
    t.clips.map((c, s) => (c
      ? z('clip', 'span.lm-clip' + (i === 0 && s === 0 ? '.playing' : ''), { style: { '--c': t.color } }, z('clip-launch', 'b.lm-launch', {}, '▶'), c)
      : z('empty-slot', 'span.lm-slot', {}, z('slot-stop', 'b.lm-stop', {}, '■')))),
    z('io', 'span.lm-io', {}, el('small', 'MIDI From'), 'All Ins'),
    z('monitor', 'span.lm-mon', {}, el('i', 'In'), el('i.on', 'Auto'), el('i', 'Off')),
    el('span.lm-sends', knob('sends', 'A', 0.3), knob('sends', 'B', 0.1)),
    knob('pan', 'Pan', 0.5),
    z('volume', 'span.lm-fader', {}, el('i.lm-meter', { style: { '--m': [0.8, 0.6, 0.4][i] } }), el('b', { style: { '--v': 0.7 } }), el('small', '0.0')),
    el('span.lm-btns', z('activator', 'span.lm-act', {}, String(i + 1)), z('solo', 'span.lm-solo', {}, 'S'), z('arm', 'span.lm-arm' + (i === 2 ? '.on' : ''), {}, '●')));
  return el('div.lm-session',
    TRACKS.map(col),
    el('div.lm-track.ret',
      z('return-track', 'span.lm-title', { style: { '--c': '#90a4ae' } }, 'A Reverb'),
      el('span.lm-slot.empty'), el('span.lm-slot.empty'), el('span.lm-slot.empty'),
      el('span.lm-io.empty'), el('span.lm-mon.empty'), el('span.lm-sends'), knob('pan', 'Pan', 0.5),
      z('volume', 'span.lm-fader', {}, el('i.lm-meter', { style: { '--m': 0.3 } }), el('b', { style: { '--v': 0.6 } }), el('small', '-6.0')),
      el('span.lm-btns', z('activator', 'span.lm-act', {}, 'A'), z('solo', 'span.lm-solo', {}, 'S'))),
    el('div.lm-track.main',
      z('main-track', 'span.lm-title', { style: { '--c': '#b0bec5' } }, 'Main'),
      [1, 2, 3].map((n) => z('scene-launch', 'span.lm-scene', {}, el('b', '▶'), `Scène ${n}`)),
      el('span.lm-io.empty'),
      z('stop-all', 'span.lm-stopall', {}, '■ Stop'),
      el('span.lm-sends'), knob('pan', 'Pan', 0.5),
      z('volume', 'span.lm-fader', {}, el('i.lm-meter', { style: { '--m': 0.75 } }), el('b', { style: { '--v': 0.75 } }), el('small', '0.0'))));
}

function arrangement() {
  const bars = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const lane = (name, color, clips, hdr) => el('div.lm-arow',
    el('div.lm-alane', clips.map(([a, b, label]) => z('arr-clip', 'span.lm-aclip', { style: { '--c': color, left: `${((a - 1) / 8) * 100}%`, width: `${((b - a) / 8) * 100}%` } }, label))),
    hdr ? z('arr-header', 'span.lm-ahdr', { style: { '--c': color } }, name, el('i', '1'), el('i', 'S'), el('i', '●')) : el('span.lm-ahdr'));
  return el('div.lm-arr',
    el('div.lm-arow.ruler',
      el('div.lm-alane',
        z('loop-brace', 'span.lm-brace', { style: { left: `${(4 / 8) * 100}%`, width: `${(4 / 8) * 100}%` } }),
        z('locator', 'span.lm-locator', { style: { left: `${(4 / 8) * 100}%` } }, '▸ Drop'),
        z('ruler', 'span.lm-ruler', {}, bars.map((b) => el('i', { style: { left: `${((b - 1) / 8) * 100}%` } }, String(b))))),
      el('span.lm-ahdr')),
    lane('Drums', '#ff8a65', [[1, 5, 'Beat'], [5, 9, 'Beat']], true),
    lane('Bass', '#ffd54f', [[3, 9, 'Bass']], true),
    lane('Keys', '#81c784', [[1, 9, 'Chords']], true),
    el('div.lm-arow.auto',
      z('automation-lane', 'div.lm-alane', {}, el('span.lm-svg', { html: '<svg viewBox="0 0 330 30" preserveAspectRatio="none"><polyline points="0,26 120,26 230,6 330,6" fill="none" stroke="#ff5252" stroke-width="2"/></svg>' }), el('small', 'Auto Filter · Frequency')),
      el('span.lm-ahdr.sub', '↳ Automation')));
}

function clipView() {
  const ns = [[0, 4, 2], [2, 7, 2], [4, 9, 2], [8, 7, 4], [12, 4, 2]];
  return el('div.lm-detail.clip',
    el('div.lm-props',
      el('b.lm-ptitle', 'Clip'),
      z('clip-loop', 'span.lm-pbox', {}, el('small', 'Start  1.1.1'), el('small', 'End  2.1.1'), el('small', 'Loop ✓  Length 1.0.0')),
      z('scale', 'span.lm-pbox.scale', {}, el('small', 'Scale Mode ✓'), el('small', 'A  Minor'))),
    el('div.lm-editor',
      el('div.lm-etop', z('fold', 'span.lm-btn.txt', {}, 'Fold'), el('small', 'Notes')),
      el('div.lm-erow',
        z('piano-keys', 'span.lm-pkeys', {}, Array.from({ length: 10 }, (_, i) => el('i' + ([1, 3, 6, 8].includes(9 - i) ? '.b' : '')))),
        z('note-editor', 'span.lm-notes', {}, ns.map(([s, r, l]) => el('i', { style: { left: `${(s / 16) * 100}%`, top: `${((9 - r) / 10) * 100}%`, width: `${(l / 16) * 100}%` } })))),
      z('velocity-lane', 'span.lm-vel', {}, ns.map(([s], i) => el('i', { style: { left: `${(s / 16) * 100}%`, height: `${[90, 55, 75, 100, 45][i]}%` } })))));
}

function deviceView() {
  return el('div.lm-detail.device',
    el('div.lm-rack',
      z('macros', 'span.lm-macros', {}, ['Cutoff', 'Reso', 'Attack', 'Space'].map((n, i) => knob(null, n, [0.6, 0.2, 0.1, 0.4][i]))),
      z('instrument', 'span.lm-dev.inst', {}, el('b', 'Drift'), el('span.lm-knobs', knob(null, 'Shape', 0.4), knob(null, 'Freq', 0.7), knob(null, 'Res', 0.2)))),
    z('eq', 'span.lm-dev', {}, el('b', 'EQ Eight'), el('span.lm-svg', { html: '<svg viewBox="0 0 100 32" preserveAspectRatio="none"><path d="M0,22 C20,30 25,16 50,16 S80,10 100,14" fill="none" stroke="#ffb84d" stroke-width="2"/></svg>' })),
    z('compressor', 'span.lm-dev', {}, el('b', 'Compressor'), el('span.lm-knobs', knob(null, 'Thresh', 0.6), knob(null, 'Ratio', 0.4))),
    z('drop-zone', 'span.lm-drop', {}, 'Glisse des effets audio ici'));
}

const PARTS = { control: controlBar, browser, session, arrangement, clip: clipView, device: deviceView };

/**
 * Maquette de Live. show : parties à afficher ; hl : zone à éclairer ; onZone(zone) : rend la maquette cliquable.
 * @returns {{ node: HTMLElement, select(zone), mark(zone, cls) }}
 */
export function liveMock({ show = ['control', 'session'], hl = null, onZone = null } = {}) {
  const main = show.filter((p) => ['session', 'arrangement'].includes(p));
  const det = show.filter((p) => ['clip', 'device'].includes(p));
  const win = el('div.lm-win',
    el('div.lm-titlebar', el('i'), el('i'), el('i'), el('span', 'Ableton Live 12 — Mon set')),
    show.includes('control') ? controlBar() : null,
    show.includes('browser') || main.length ? el('div.lm-body', show.includes('browser') ? browser() : null, main.map((p) => PARTS[p]())) : null,
    det.map((p) => PARTS[p]()));
  const node = el('div.lm' + (onZone ? '.clickable' : ''), win);
  const zones = [...win.querySelectorAll('[data-zone]')];
  if (hl) zones.filter((n) => n.dataset.zone === hl).forEach((n) => n.classList.add('lm-hl'));
  if (onZone) {
    zones.forEach((n) => {
      n.setAttribute('role', 'button');
      n.tabIndex = 0;
      n.addEventListener('click', (e) => { e.stopPropagation(); onZone(n.dataset.zone); });
      n.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); onZone(n.dataset.zone); } });
    });
  }
  const mark = (zone, cls, on = true) => zones.forEach((n) => { if (n.dataset.zone === zone) n.classList.toggle(cls, on); });
  return {
    node,
    select: (zone) => { zones.forEach((n) => n.classList.toggle('lm-sel', n.dataset.zone === zone)); },
    mark,
  };
}
