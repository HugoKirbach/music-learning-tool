import { el, card, header, segmented, select, slider, hintBox, finishExercise, downloadMidi, playButton, modal, toast, shuffle } from '../ui.js';
import { getState, update, level } from '../store.js';
import { DRUM_ROWS, STEPS, VEL, gridFromPatterns, emptyGrid, cloneGrid, compareGrids, euclid, countHits, shiftRow } from '../core/rhythm.js';
import { transport, playDrum, kitForGenre, KITS } from '../core/audio.js';
import { GENRES, genreById } from '../data/genres.js';
import { onMidi, drumForNote } from '../midiin.js';

// ---------- Grille réutilisable ----------
export function drumGrid({ getGrid, onChange, locked = [], hidden = [], onLabel, getKit = () => getState().project.kit }) {
  const wrap = el('div.seq');
  const cells = {};
  const ph = [];
  const phRow = el('div.seq-row.playhead', el('span'), Array.from({ length: STEPS }, (_, i) => { const d = el('div.ph'); ph[i] = d; return d; }));
  wrap.appendChild(phRow);
  for (const r of DRUM_ROWS) {
    if (hidden.includes(r.id)) continue;
    const row = el('div.seq-row', { style: { '--c': r.color } });
    row.appendChild(el('span.rlabel', { onclick: () => onLabel?.(r) }, el('i', { style: { background: r.color } }), r.name + (locked.includes(r.id) ? ' 🔒' : '')));
    cells[r.id] = [];
    for (let i = 0; i < STEPS; i++) {
      const c = el('button.cell' + (i % 4 === 0 ? '.beat' : ''), {
        type: 'button',
        'aria-label': `${r.name} pas ${i + 1}`,
        onclick: () => {
          if (locked.includes(r.id)) return;
          const g = getGrid();
          g[r.id][i] = (g[r.id][i] + 1) % 3;
          if (g[r.id][i]) playDrum(r.id, 0, VEL[g[r.id][i]] / 127, getState().project.kit);
          paint();
          onChange?.(g);
        },
      });
      if (locked.includes(r.id)) c.style.opacity = '0.55';
      cells[r.id].push(c);
      row.appendChild(c);
    }
    wrap.appendChild(row);
  }
  const paint = () => {
    const g = getGrid();
    for (const id of Object.keys(cells)) {
      cells[id].forEach((c, i) => {
        c.classList.toggle('on', g[id][i] === 1);
        c.classList.toggle('ghost', g[id][i] === 2);
      });
    }
  };
  let lastPh = -1, lastPhAt = 0;
  const setPlayhead = (s) => {
    if (lastPh >= 0) ph[lastPh].classList.remove('on');
    if (s >= 0) ph[s].classList.add('on');
    lastPh = s;
    lastPhAt = performance.now();
  };

  // Pads du MPC (ou tout clavier MIDI) : jouent la batterie ; en « Rec » pendant la lecture, écrivent dans la grille.
  let rec = false;
  const recBtn = el('button.btn.small', {
    title: 'Lance la lecture, active Rec et joue aux pads : chaque coup est quantifié à la double-croche la plus proche.',
    onclick: () => { rec = !rec; recBtn.classList.toggle('primary', rec); recBtn.textContent = rec ? '⏺ Rec pads : ON' : '⏺ Rec pads'; },
  }, '⏺ Rec pads');
  const offMidi = onMidi({
    noteOn: (n, v) => {
      const id = drumForNote(n);
      if (!id || hidden.includes(id)) return;
      playDrum(id, 0, Math.max(0.25, v), getKit());
      if (!rec || !transport.playing || lastPh < 0 || locked.includes(id)) return;
      const stepMs = (60000 / transport.bpm) / 4;
      const step = (lastPh + (performance.now() - lastPhAt > stepMs / 2 ? 1 : 0)) % STEPS;
      const g = getGrid();
      g[id][step] = v < 0.45 ? 2 : 1;
      paint();
      onChange?.(g);
    },
  });
  const setFeedback = (target) => {
    const g = getGrid();
    for (const id of Object.keys(cells)) {
      cells[id].forEach((c, i) => {
        c.classList.toggle('missed', !!target && !!target[id][i] && !g[id][i]);
        c.classList.toggle('wrong', !!target && !target[id][i] && !!g[id][i]);
      });
    }
  };
  paint();
  return { node: wrap, paint, setPlayhead, setFeedback, recBtn, destroy: offMidi };
}

export function playGrid(grid, { bpm, swing, kit, onVisual, bars = 0 }) {
  transport.start((step, time) => {
    if (bars && step >= bars * STEPS) { setTimeout(() => transport.stop(), 50); return; }
    const s = step % STEPS;
    for (const r of DRUM_ROWS) {
      const v = grid()[r.id][s];
      if (v) playDrum(r.id, time, VEL[v] / 127, kit);
    }
  }, (step) => onVisual?.(step % STEPS), { bpm, swing });
}

function gridToSong(grid, bpm, bars = 4) {
  const notes = [];
  for (let b = 0; b < bars; b++) {
    for (const r of DRUM_ROWS) {
      grid[r.id].forEach((v, i) => { if (v) notes.push({ pitch: r.midi, start: b * 4 + i / 4, dur: 0.25, vel: VEL[v] }); });
    }
  }
  return { bpm, tracks: [{ name: 'Drums', channel: 9, notes }] };
}

function euclidModal(row, grid, after) {
  let k = Math.max(1, grid[row.id].filter(Boolean).length || 5), rot = 0;
  const prev = el('div.seq-row', { style: { '--c': row.color } });
  const show = () => {
    prev.replaceChildren(el('span.rlabel', `E(${k},16)`), ...euclid(k, 16, rot).map((v, i) => el('div.cell' + (v ? '.on' : '') + (i % 4 === 0 ? '.beat' : ''))));
  };
  show();
  const close = modal(el('div',
    el('h2', `${row.name} : rythme euclidien`),
    el('p.muted', 'Répartit k coups le plus régulièrement possible sur 16 pas. E(3,8) = tresillo, E(5,16) = bossa, E(7,16) = samba… Live 12 propose la même chose dans ses Generators.'),
    el('div.seq', prev),
    slider({ label: 'Coups (k)', min: 1, max: 16, value: k, onInput: (v) => { k = v; show(); } }),
    slider({ label: 'Rotation', min: 0, max: 15, value: 0, onInput: (v) => { rot = v; show(); } }),
    el('div.row.gap.wrap',
      el('button.btn', { onclick: () => { grid[row.id] = shiftRow(grid[row.id], -1); after(); } }, '◀ Décaler'),
      el('button.btn', { onclick: () => { grid[row.id] = shiftRow(grid[row.id], 1); after(); } }, 'Décaler ▶'),
      el('button.btn', { onclick: () => { grid[row.id] = new Array(STEPS).fill(0); after(); close(); } }, 'Vider'),
      el('button.btn.primary', { onclick: () => { grid[row.id] = euclid(k, 16, rot); after(); close(); } }, 'Appliquer'),
    ),
  ));
}

// ---------- Contraintes ----------
const CONSTRAINTS = [
  { id: 'max', text: (n) => `Maximum ${n} coups au total (et au moins 6). Chaque coup doit compter.`, arg: () => 10 + Math.floor(Math.random() * 4),
    check: (g, n) => { const c = countHits(g); return c <= n && c >= 6; }, lesson: 'Moins de notes = chaque coup a plus d’impact. Le minimalisme est la base de la techno et de la house.' },
  { id: 'nokick1', text: () => 'Aucun kick sur le premier temps (pas 1), mais au moins 3 kicks.', check: (g) => !g.kick[0] && g.kick.filter(Boolean).length >= 3,
    lesson: 'Éviter le « 1 » crée une sensation de flottement et de suspense : c’est le principe du 2-step et de beaucoup de breaks.' },
  { id: 'nobackbeat', text: () => 'Snare et clap interdits sur les temps 2 et 4 (pas 5 et 13), mais au moins 2 snares/claps ailleurs.',
    check: (g) => !g.snare[4] && !g.snare[12] && !g.clap[4] && !g.clap[12] && (g.snare.filter(Boolean).length + g.clap.filter(Boolean).length) >= 2,
    lesson: 'Déplacer le backbeat casse l’attente. Les styles comme le dembow ou le half-time redéfinissent où tombe la snare.' },
  { id: 'ghosthats', text: () => 'Hats fermés uniquement en ghost notes (appuie 2 fois sur une case), au moins 6.',
    check: (g) => g.hat.every((v) => v !== 1) && g.hat.filter((v) => v === 2).length >= 6,
    lesson: 'Des hats doux laissent respirer le kick et la snare. Accentue ensuite 1 ou 2 hats seulement pour créer le groove.' },
  { id: 'three', text: () => 'Polyrythmie : la rangée Perc doit avoir un coup tous les 3 pas exactement (au moins 5 coups).',
    check: (g) => { const h = g.perc.map((v, i) => (v ? i : -1)).filter((i) => i >= 0); return h.length >= 5 && h.every((x, i) => i === 0 || x - h[i - 1] === 3); },
    lesson: 'Un motif de 3 sur une grille de 4 « tourne » : c’est l’effet hypnotique de la techno et de l’afro house.' },
  { id: 'nokick', text: () => 'Groove sans aucun kick : au moins 10 coups répartis sur les autres sons.',
    check: (g) => !g.kick.some(Boolean) && countHits(g) >= 10,
    lesson: 'Enlever le kick force à faire groover les percussions. Parfait pour les intros et les breaks.' },
  { id: 'euclid5', text: () => 'Utilise un rythme euclidien E(5,16) (n’importe quelle rotation) sur au moins une rangée. Touche le nom de la rangée.',
    check: (g) => DRUM_ROWS.some((r) => Array.from({ length: 16 }, (_, k) => euclid(5, 16, k).join('')).includes(g[r.id].map((v) => (v ? 1 : 0)).join(''))),
    lesson: 'E(5,16) est un rythme de bossa/samba. Les rythmes euclidiens sont une mine d’or de grooves « organiques ».' },
  { id: 'synckick', text: () => 'Kick syncopé : au moins 2 kicks hors des temps (pas autres que 1, 5, 9, 13).',
    check: (g) => g.kick.filter((v, i) => v && i % 4 !== 0).length >= 2,
    lesson: 'Un kick qui anticipe ou retarde le temps donne du rebond : breakbeat, trap, UKG.' },
  { id: 'ghosts3', text: () => 'Au moins 4 ghost notes (sur n’importe quelle rangée) et maximum 16 coups au total.',
    check: (g) => Object.values(g).flat().filter((v) => v === 2).length >= 4 && countHits(g) <= 16,
    lesson: 'Les ghost notes donnent la sensation d’un vrai batteur : c’est la dynamique qui fait groover.' },
];

export function render(root, params) {
  const mode = params.mode || 'free';
  const s = getState();
  const genre = genreById(params.genre || s.project.genre);
  const lv = level();

  root.append(header('Lab Beat', mode === 'ear' ? `Recrée le groove ${genre.name} à l’oreille` : mode === 'constraint' ? `Beat ${genre.name} sous contrainte` : 'Boîte à rythmes 16 pas'));

  const modeSeg = segmented([
    { value: 'free', label: '🎨 Libre' }, { value: 'ear', label: '👂 À l’oreille' }, { value: 'constraint', label: '🧩 Contrainte' },
  ], mode, (v) => { location.hash = `#/beat?mode=${v}&genre=${genre.id}`; });
  root.append(el('div.row.gap.wrap', { style: { marginBottom: '10px' } }, modeSeg));

  if (mode === 'ear') return earMode(root, genre, lv);
  if (mode === 'constraint') return constraintMode(root, genre);
  return freeMode(root, params);
}

// ---------- Mode libre ----------
function freeMode(root, params) {
  const st = getState();
  if (params.genre && params.genre !== st.project.genre) loadGenreDrums(params.genre);
  const P = () => getState().project;
  const grid = () => P().drums;
  const save = () => update(() => {});
  const g = drumGrid({ getGrid: grid, onChange: save, onLabel: (r) => euclidModal(r, grid(), () => { save(); g.paint(); }) });

  const play = playButton(
    () => playGrid(grid, { bpm: P().bpm, swing: P().swing, kit: P().kit, onVisual: g.setPlayhead }),
    () => { transport.stop(); g.setPlayhead(-1); },
  );
  const genre = genreById(P().genre);
  const genreSel = select(GENRES.map((x) => ({ value: x.id, label: `${x.emoji} ${x.name}` })), P().genre, (v) => {
    loadGenreDrums(v);
    location.hash = `#/beat?genre=${v}&t=${Date.now()}`;
  });
  const kitSel = select(Object.keys(KITS).map((k) => ({ value: k, label: { club: 'Kit Club', k808: 'Kit 808', acoustic: 'Kit Acoustique', hard: 'Kit Techno' }[k] })), P().kit, (v) => update((s) => { s.project.kit = v; }));

  let rewarded = false;
  root.append(
    card(
      el('div.ctrl-row', play, genreSel, kitSel, g.recBtn),
      slider({ label: 'Tempo', min: 60, max: 180, value: P().bpm, format: (v) => `${v} BPM`, onInput: (v) => { update((s) => { s.project.bpm = v; }); transport.bpm = v; } }),
      slider({ label: 'Swing', min: 0, max: 0.6, step: 0.01, value: P().swing, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { update((s) => { s.project.swing = v; }); transport.swing = v; } }),
      g.node,
      el('p.small.muted', 'Touche une case : coup → ghost note (doux) → vide. Touche le nom d’une rangée pour le générateur euclidien et le décalage.'),
      el('div.row.gap.wrap',
        el('button.btn.small', { onclick: () => { update((s) => { s.project.drums = gridFromPatterns(genreById(s.project.genre).drums); }); g.paint(); } }, '↺ Pattern du style'),
        el('button.btn.small', { onclick: () => { update((s) => { s.project.drums = emptyGrid(); }); g.paint(); } }, '🗑 Vider'),
        el('button.btn.small', { onclick: () => { mutate(grid()); save(); g.paint(); toast('2 pas modifiés : garde si c’est mieux !'); } }, '🧬 Muter'),
        el('button.btn.small', { onclick: () => downloadMidi(`beat-${P().genre}-${P().bpm}bpm`, gridToSong(grid(), P().bpm)) }, '⬇ MIDI'),
        el('button.btn.small', {
          onclick: () => {
            update((s) => { s.notebook.unshift({ id: Date.now(), type: 'beat', title: `Beat ${genreById(s.project.genre).name}`, date: Date.now(), genre: s.project.genre, bpm: s.project.bpm, swing: s.project.swing, drums: cloneGrid(s.project.drums) }); });
            toast('Beat sauvé dans le Carnet 📓', 'good');
          },
        }, '📓 Sauver'),
        el('button.btn.small.primary', {
          onclick: () => {
            if (countHits(grid()) < 4) return toast('Pose au moins 4 coups 😉', 'bad');
            if (rewarded) return toast('Déjà validé — continue de tweaker ou passe à la mélodie !');
            rewarded = true;
            finishExercise({
              key: 'beat:free', title: 'Beat créé', xp: 15, skill: 'rythme', genre: P().genre, success: true,
              lesson: 'Écoute ton beat 8 fois de suite : si quelque chose t’agace, c’est ça qu’il faut changer.',
              transfer: 'Exporte le MIDI et glisse-le sur un Drum Rack dans Live (36 = kick, 38 = snare, 42 = hat…), ou rejoue-le aux pads du MPC.',
            });
          },
        }, '✓ Valider'),
      ),
    ),
    card(el('h3', `${genre.emoji} Ingrédients ${genre.name}`), el('ul.clean', genre.signature.map((x) => el('li', x))),
      el('p.small', el('b', 'Live 12 : '), genre.tips.ableton), el('p.small', el('b', 'MPC : '), genre.tips.mpc),
      el('a.btn.small', { href: '#/melody' }, '→ Ajouter accords et mélodie')),
  );
  return () => { transport.stop(); g.destroy(); };
}

function loadGenreDrums(id) {
  const g = genreById(id);
  update((s) => {
    s.project.genre = g.id;
    s.project.drums = gridFromPatterns(g.drums);
    s.project.bpm = g.bpm;
    s.project.swing = g.swing;
    s.project.kit = kitForGenre(g.id);
  });
}

function mutate(grid) {
  for (let n = 0; n < 2; n++) {
    const r = DRUM_ROWS[Math.floor(Math.random() * DRUM_ROWS.length)].id;
    const i = Math.floor(Math.random() * STEPS);
    grid[r][i] = grid[r][i] ? 0 : Math.random() < 0.3 ? 2 : 1;
  }
}

// ---------- Mode oreille ----------
function earMode(root, genre, lv) {
  const target = gridFromPatterns(genre.drums);
  const nonEmpty = DRUM_ROWS.filter((r) => target[r.id].some(Boolean)).map((r) => r.id);
  const nFind = lv < 4 ? 2 : lv < 8 ? 3 : nonEmpty.length;
  // Lignes à trouver : kick et snare/clap d'abord
  const priority = ['kick', 'snare', 'clap', 'hat', 'ohat', 'perc'].filter((id) => nonEmpty.includes(id));
  const toFind = priority.slice(0, nFind);
  const given = nonEmpty.filter((id) => !toFind.includes(id));
  const user = emptyGrid();
  given.forEach((id) => { user[id] = [...target[id]]; });
  const hidden = DRUM_ROWS.map((r) => r.id).filter((id) => !nonEmpty.includes(id));
  let hintUsed = false, checks = 0, best = 0;

  const kit = kitForGenre(genre.id);
  const g = drumGrid({ getGrid: () => user, locked: given, hidden, onChange: () => g.setFeedback(null), getKit: () => kit });
  const stopAllBtns = () => { tBtn.reset(); uBtn.reset(); g.setPlayhead(-1); };
  const tBtn = playButton(() => { uBtn.reset(); playGrid(() => target, { bpm: genre.bpm, swing: genre.swing, kit, onVisual: g.setPlayhead }); }, () => { transport.stop(); stopAllBtns(); }, 'Cible');
  const uBtn = playButton(() => { tBtn.reset(); playGrid(() => user, { bpm: genre.bpm, swing: genre.swing, kit, onVisual: g.setPlayhead }); }, () => { transport.stop(); stopAllBtns(); }, 'Ma version');
  const scoreLine = el('div.row.between', el('span.muted', `À trouver : ${toFind.map((id) => DRUM_ROWS.find((r) => r.id === id).name).join(', ')}`), el('b', ''));

  const finish = () => {
    transport.stop();
    const res = compareGrids(target, user);
    if (res.score === 100) update((s) => { s.stats.beatPerfect++; });
    finishExercise({
      key: 'beat:ear', title: `Groove ${genre.name}`, score: res.score, skill: 'rythme', genre: genre.id, hintUsed, success: res.score >= 80,
      xp: Math.max(10, 10 + res.score * 0.45 - Math.max(0, checks - 1) * 4),
      lesson: `${genre.name} : ${genre.signature.join(' · ')}.`,
      transfer: genre.tips.mpc,
      onRetry: () => { location.hash = `#/beat?mode=ear&genre=${shuffle(GENRES)[0].id}&r=${Date.now()}`; },
    });
  };

  root.append(card(
    el('div.row.gap.wrap', tBtn, uBtn, g.recBtn),
    el('p.small.muted', `${genre.emoji} ${genre.name} · ${genre.bpm} BPM. Les rangées 🔒 sont données. Écoute la cible, reproduis le reste.`),
    scoreLine,
    g.node,
    hintBox(el('div', el('p', 'Méthode de transcription : écoute UN seul instrument à la fois. Commence par le kick (compte « 1 e & a 2 e & a… »), puis la snare/clap, puis les hats.'), el('p', 'Chaque colonne claire = un temps (noire). 4 cases = 1 temps.')), () => { hintUsed = true; }),
    el('div.row.gap.wrap',
      el('button.btn', {
        onclick: () => {
          checks++;
          const res = compareGrids(target, user);
          best = Math.max(best, res.score);
          g.setFeedback(target);
          scoreLine.lastChild.textContent = `${res.score}%`;
          toast(res.score === 100 ? 'Parfait ! 🎯' : `${res.score}% — jaune = manquant, rouge = en trop`, res.score === 100 ? 'good' : 'info');
          if (res.score === 100) setTimeout(finish, 700);
        },
      }, '🔍 Vérifier'),
      el('button.btn', {
        onclick: () => {
          const missing = toFind.find((id) => target[id].join() !== user[id].join());
          if (!missing) return;
          hintUsed = true;
          user[missing] = [...target[missing]];
          g.paint();
          toast(`Rangée ${DRUM_ROWS.find((r) => r.id === missing).name} révélée (−XP)`);
        },
      }, '💡 Révéler une rangée'),
      el('button.btn.primary', { onclick: finish }, 'Terminer'),
    ),
  ));
  return () => { transport.stop(); g.destroy(); };
}

// ---------- Mode contrainte ----------
function constraintMode(root, genre) {
  const c = CONSTRAINTS[Math.floor(Math.random() * CONSTRAINTS.length)];
  const arg = c.arg ? c.arg() : null;
  const grid = gridFromPatterns(genre.drums);
  const kit = kitForGenre(genre.id);
  let bpm = genre.bpm, swing = genre.swing, hintUsed = false;
  const g = drumGrid({ getGrid: () => grid, getKit: () => kit, onLabel: (r) => euclidModal(r, grid, () => g.paint()) });
  const play = playButton(() => playGrid(() => grid, { bpm, swing, kit, onVisual: g.setPlayhead }), () => { transport.stop(); g.setPlayhead(-1); });
  let rating = 2;

  root.append(card(
    el('div.lesson', el('div.lesson-title', '🧩 Contrainte'), el('p', el('b', c.text(arg)))),
    el('p.small.muted', `Pars de ce groove ${genre.emoji} ${genre.name} et transforme-le pour respecter la règle — en gardant le feeling du style.`),
    el('div.ctrl-row', play, g.recBtn),
    slider({ label: 'Tempo', min: 60, max: 180, value: bpm, format: (v) => `${v} BPM`, onInput: (v) => { bpm = v; transport.bpm = v; } }),
    slider({ label: 'Swing', min: 0, max: 0.6, step: 0.01, value: swing, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => { swing = v; transport.swing = v; } }),
    g.node,
    hintBox('Change une chose à la fois et réécoute. Garde les éléments signature du style que la contrainte n’interdit pas.', () => { hintUsed = true; }),
    el('p', 'Ton ressenti : ça groove ?'),
    segmented([{ value: 1, label: '😐 Bof' }, { value: 2, label: '🙂 Pas mal' }, { value: 3, label: '🔥 Ça groove' }], rating, (v) => { rating = v; }),
    el('div.row.gap.wrap', { style: { marginTop: '10px' } },
      el('button.btn.small', { onclick: () => downloadMidi(`contrainte-${genre.id}`, gridToSong(grid, bpm)) }, '⬇ MIDI'),
      el('button.btn.primary', {
        onclick: () => {
          if (!c.check(grid, arg)) return toast('La règle n’est pas encore respectée 🧐', 'bad');
          transport.stop();
          update((s) => { s.notebook.unshift({ id: Date.now(), type: 'beat', title: `Contrainte ${genre.name}`, note: c.text(arg), date: Date.now(), genre: genre.id, bpm, swing, drums: cloneGrid(grid) }); });
          finishExercise({
            key: 'beat:constraint', title: 'Contrainte respectée', skill: 'rythme', genre: genre.id, hintUsed, success: true,
            xp: 30 + rating * 5, lesson: c.lesson,
            transfer: 'Refais la même contrainte dans Live 12 sur ton prochain projet : les contraintes sont le meilleur antidote à la page blanche. (Beat sauvé dans le Carnet.)',
            onRetry: () => { location.hash = `#/beat?mode=constraint&genre=${shuffle(GENRES)[0].id}&r=${Date.now()}`; },
          });
        },
      }, '✓ Valider'),
    ),
  ));
  return () => { transport.stop(); g.destroy(); };
}
