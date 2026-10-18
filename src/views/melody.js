import { el, card, header, segmented, select, hintBox, finishExercise, downloadMidi, playButton, toast, shuffle } from '../ui.js';
import { getState, update, projectFromGenre, level } from '../store.js';
import { SCALES, NOTE_NAMES, scaleNotes, midiToName, mod } from '../core/theory.js';
import { MELODY_STEPS, STEPS_PER_BAR, voiceProgression, projectToSong } from '../core/arrange.js';
import { analyzeMelody, catchyLabel } from '../core/catchy.js';
import { playProject, stopAll, previewNote, previewChord, presetParams, onPlayhead } from '../player.js';
import { transport, playSynth, ensureAudio, now as getCtxTime } from '../core/audio.js';
import { presetOptions } from '../data/presets.js';
import { GENRES, genreById } from '../data/genres.js';
import { onMidi } from '../midiin.js';
import { viewKeys } from '../shortcuts.js';

const CHALLENGES = [
  { text: 'Hook avec 3 hauteurs différentes maximum. Catchy-mètre ≥ 60.', min: 60,
    check: (m) => new Set(m.filter(Boolean).map((x) => x.n)).size <= 3,
    lesson: 'Moins de notes = plus mémorable. « Seven Nation Army », « Da Funk »… peu de notes, beaucoup de rythme.' },
  { text: 'Rythme d’abord : la mesure 1 utilise UNE seule hauteur (4 notes min.). Varie ensuite les hauteurs. Catchy ≥ 50.', min: 50,
    check: (m) => { const b = m.slice(0, 16).filter(Boolean); return b.length >= 4 && new Set(b.map((x) => x.n)).size === 1 && new Set(m.filter(Boolean).map((x) => x.n)).size >= 3; },
    lesson: 'Trouver le rythme avant les notes est une technique de pro : le rythme est ce que l’oreille retient en premier.' },
  { text: 'Structure AABA : les mesures 1, 2 et 4 ont le même rythme (hauteurs libres). Catchy ≥ 60.', min: 60,
    check: (m) => { const r = (b) => m.slice(b * 16, b * 16 + 16).map((x) => (x ? 1 : 0)).join(''); return r(0).includes('1') && r(0) === r(1) && r(0) === r(3) && r(2) !== r(0); },
    lesson: 'AABA : répétition (A, A), contraste (B), retour (A). La forme des standards… et de beaucoup de drops.' },
  { text: 'Commence sur la quinte de la gamme et termine sur la tonique. Catchy ≥ 55.', min: 55,
    check: (m, p) => { const n = m.filter(Boolean); return n.length >= 4 && mod(n[0].n - p.rootPc, 12) === 7 && mod(n[n.length - 1].n - p.rootPc, 12) === 0; },
    lesson: 'Partir de la quinte crée une attente, finir sur la tonique la résout : une phrase complète.' },
  { text: 'Question / réponse : la mesure 2 se termine sur la tonique, la mesure 1 NON. Catchy ≥ 55.', min: 55,
    check: (m, p) => { const last = (b) => m.slice(b * 16, b * 16 + 16).filter(Boolean).pop(); const a = last(0), b = last(1); return a && b && mod(b.n - p.rootPc, 12) === 0 && mod(a.n - p.rootPc, 12) !== 0; },
    lesson: 'La question reste en l’air, la réponse se pose : c’est la base de la phrase musicale (et de la conversation lead/basse).' },
  { text: 'Au moins 4 notes syncopées (hors des temps) et Catchy ≥ 60.', min: 60,
    check: (m) => m.filter((x, i) => x && i % 4 !== 0).length >= 4,
    lesson: 'Les syncopes donnent du groove à une mélodie : en house, UKG ou afro, le hook « danse » autour des temps.' },
];

export function render(root, params) {
  const mode = params.mode || 'free';
  const lv = level();
  if (params.genre && (mode !== 'free' || params.load)) {
    update((s) => { s.project = projectFromGenre(params.genre); });
  }
  const P = () => getState().project;
  const genre = genreById(P().genre);
  let bar = 0, dur = 1, penta = false, hintUsed = false, follow = true, cursor = 0, rec = false;
  let playStep = -1;

  // Dictée : motif cible dans la mesure 1
  let target = null;
  if (mode === 'dictation') {
    target = makeDictation(P(), lv);
    update((s) => { s.project.melody = new Array(MELODY_STEPS).fill(null); });
  }
  const challenge = mode === 'challenge' ? CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)] : null;
  if (challenge) update((s) => { s.project.melody = new Array(MELODY_STEPS).fill(null); });

  root.append(header('Lab Mélodie', mode === 'dictation' ? 'Dictée : retrouve le motif à l’oreille' : challenge ? `Hook ${genre.name} sous contrainte` : 'Écris des hooks sur ta boucle'));
  root.append(el('div.row.gap.wrap', { style: { marginBottom: '10px' } },
    segmented([{ value: 'free', label: '🎨 Libre' }, { value: 'challenge', label: '🧩 Défi hook' }, { value: 'dictation', label: '👂 Dictée' }], mode,
      (v) => { location.hash = `#/melody?mode=${v}&genre=${v === 'free' ? '' : shuffle(GENRES)[0].id}`; })));

  const rowsFor = () => {
    const p = P();
    const sc = penta ? (SCALES[p.scale].steps.includes(3) ? 'pentaMinor' : 'pentaMajor') : p.scale;
    const lowRoot = 60 + mod(p.rootPc - 0, 12) - (mod(p.rootPc, 12) > 6 ? 12 : 0);
    return scaleNotes(p.rootPc, sc, lowRoot - 5, lowRoot + 16).reverse();
  };

  const rollEl = el('div.roll');
  const tabs = el('div.bar-tabs');
  const catchyEl = el('div');
  const chordName = el('span.muted.small');
  const cells = [];

  const maxBars = mode === 'dictation' ? 1 : 4;

  const renderTabs = () => {
    const v = voiceProgression(P());
    tabs.replaceChildren(...Array.from({ length: maxBars }, (_, b) => el('button.btn.small' + (b === bar ? '.primary' : ''), { onclick: () => { bar = b; follow = false; renderRoll(); renderTabs(); } },
      `M${b + 1}${v[b] ? ' · ' + v[b].symbol : ''}`)));
    chordName.textContent = v[bar] ? `Accord : ${v[bar].symbol} (${v[bar].roman}) — cases teintées = notes de l’accord` : '';
  };

  const renderRoll = () => {
    const p = P();
    const rows = rowsFor();
    const v = voiceProgression(p);
    const chordPcs = v[bar]?.pcs || [];
    const mel = p.melody;
    // carte des queues de notes
    const owner = new Array(MELODY_STEPS).fill(-1);
    mel.forEach((m, i) => { if (m) for (let k = 0; k < (m.len || 1) && i + k < MELODY_STEPS; k++) owner[i + k] = i; });
    cells.length = 0;
    rollEl.replaceChildren(...rows.map((n) => {
      const isTonic = mod(n - p.rootPc, 12) === 0;
      const row = el('div.roll-row');
      row.appendChild(el('span.nlabel' + (isTonic ? '.tonic' : ''), { onclick: () => previewNote(n, p.sounds.lead) }, midiToName(n)));
      for (let s = 0; s < STEPS_PER_BAR; s++) {
        const gi = bar * STEPS_PER_BAR + s;
        const o = owner[gi];
        const isOn = mel[gi] && mel[gi].n === n;
        const isTail = !isOn && o >= 0 && mel[o].n === n;
        let cls = 'button.rcell';
        if (s % 4 === 0) cls += '.beat';
        if (chordPcs.includes(mod(n, 12))) cls += '.chordtone';
        if (isOn) cls += '.on';
        if (isTail) cls += '.tail';
        if (target && target.showRhythm && target.notes[gi] && !mel[gi]) cls += '.target';
        if (gi === cursor && rec && !transport.playing) cls += '.play';
        const c = el(cls, { type: 'button', onclick: () => toggle(gi, n) });
        cells.push({ c, s });
        row.appendChild(c);
      }
      return row;
    }));
    paintPlayhead();
    renderCatchy();
  };

  const paintPlayhead = () => {
    for (const { c, s } of cells) c.classList.toggle('play', playStep >= 0 && Math.floor(playStep / 16) % maxBars === bar && playStep % 16 === s);
  };

  const toggle = (gi, n) => {
    update((s) => {
      const mel = s.project.melody;
      if (mel[gi] && mel[gi].n === n) mel[gi] = null;
      else {
        mel[gi] = { n, len: dur };
        // tronque la note précédente qui chevaucherait
        for (let k = gi - 1; k >= Math.max(0, gi - 16); k--) {
          if (mel[k]) { if (k + mel[k].len > gi) mel[k].len = gi - k; break; }
        }
        // supprime les notes recouvertes par la nouvelle
        for (let k = 1; k < dur && gi + k < MELODY_STEPS; k++) mel[gi + k] = null;
      }
    });
    if (getState().project.melody[gi]) previewNote(n, P().sounds.lead, Math.max(0.15, dur * 0.1));
    cursor = gi + dur;
    renderRoll();
  };

  const renderCatchy = () => {
    if (mode === 'dictation') { catchyEl.replaceChildren(); return; }
    const p = P();
    const v = voiceProgression(p);
    const res = analyzeMelody(p.melody, v.map((c) => c || { pcs: [] }), p.rootPc);
    const lab = catchyLabel(res.score);
    catchyEl.replaceChildren(
      el('div.row.between', el('h3', '🐛 Catchy-mètre'), el('b', { style: { color: lab.color } }, `${res.score} · ${lab.label}`)),
      el('div.meter', el('div', { style: { width: `${res.score}%`, background: lab.color } })),
      res.criteria.length ? el('div', { style: { marginTop: '8px' } }, res.criteria.map((c) => el('div.crit', el('span', c.label), el('span' + (c.ok ? '.ok' : '.ko'), c.ok ? '✓' : '…')))) : null,
      res.tips.length ? el('div.lesson', el('div.lesson-title', 'Conseil'), el('p', res.tips[0])) : null,
    );
    return res;
  };

  // ---------- Outils de transformation ----------
  const barSlice = (m, b) => m.slice(b * 16, b * 16 + 16);
  const setBar = (m, b, arr) => { for (let i = 0; i < 16; i++) m[b * 16 + i] = arr[i] ? { ...arr[i] } : null; };
  const scaleShift = (n, k) => {
    const rows = rowsFor().slice().reverse();
    let idx = rows.indexOf(n);
    if (idx < 0) idx = rows.findIndex((x) => x >= n);
    return rows[Math.max(0, Math.min(rows.length - 1, idx + k))];
  };
  const tool = (fn, msg) => () => { update((s) => fn(s.project.melody)); renderRoll(); if (msg) toast(msg); };
  const tools = el('div.row.gap.wrap',
    el('button.btn.small', { onclick: tool((m) => setBar(m, (bar + 1) % 4, barSlice(m, bar)), 'Mesure copiée → change la fin pour faire une « réponse »') }, '⧉ Copier →'),
    el('button.btn.small', { onclick: tool((m) => { const a = barSlice(m, 0); setBar(m, 1, a); setBar(m, 3, a); }, 'AABA : écris la partie B en mesure 3') }, 'AABA'),
    el('button.btn.small', { onclick: tool((m) => { const a = barSlice(m, bar); const notes = a.map((x, i) => (x ? { ...x, i } : null)).filter(Boolean); const out = new Array(16).fill(null); notes.forEach((x, k) => { const src = notes[notes.length - 1 - k]; out[x.i] = { n: src.n, len: x.len }; }); setBar(m, bar, out); }, 'Rétrograde : mêmes rythmes, notes à l’envers') }, '⇆ Rétro'),
    el('button.btn.small', { onclick: tool((m) => { const a = barSlice(m, bar); const first = a.find(Boolean); if (!first) return; const rows = rowsFor().slice().reverse(); const f = rows.indexOf(first.n); setBar(m, bar, a.map((x) => { if (!x) return null; const i = rows.indexOf(x.n); return { ...x, n: rows[Math.max(0, Math.min(rows.length - 1, 2 * f - i))] ?? x.n }; })); }, 'Miroir : les montées deviennent des descentes') }, '⇅ Miroir'),
    el('button.btn.small', { onclick: tool((m) => setBar(m, bar, barSlice(m, bar).map((x) => (x ? { ...x, n: scaleShift(x.n, 1) } : null))), 'Séquence : motif monté d’un degré') }, '↑ Degré'),
    el('button.btn.small', { onclick: tool((m) => setBar(m, bar, barSlice(m, bar).map((x) => (x ? { ...x, n: scaleShift(x.n, -1) } : null)))) }, '↓ Degré'),
    el('button.btn.small', { onclick: tool((m) => seed(m, rowsFor(), voiceProgression(P())), 'Graine générée : garde ce qui te plaît, efface le reste !') }, '🌱 Graine'),
    el('button.btn.small', { onclick: tool((m) => setBar(m, bar, new Array(16).fill(null))) }, '🗑 Mesure'),
    el('button.btn.small', { onclick: tool((m) => m.fill(null)) }, '🗑 Tout'),
  );

  // ---------- Lecture ----------
  const onVis = (step) => {
    playStep = step % (16 * maxBars);
    const b = Math.floor(playStep / 16);
    if (follow && b !== bar && maxBars > 1) { bar = b; renderTabs(); renderRoll(); } else paintPlayhead();
    if (rec) cursor = playStep;
  };
  const play = playButton(() => { follow = true; playProject(P, { onVisual: onVis }); }, () => { stopAll(); playStep = -1; paintPlayhead(); });

  // ---------- Clavier MIDI : saisie pas à pas ----------
  const recBtn = el('button.btn.small', { onclick: () => { rec = !rec; recBtn.classList.toggle('primary', rec); recBtn.textContent = rec ? '⏺ Saisie MIDI : ON' : '⏺ Saisie MIDI'; renderRoll(); } }, '⏺ Saisie MIDI');
  const offMidi = onMidi({
    noteOn: (n, v) => {
      ensureAudio();
      playSynth(presetParams(P().sounds.lead), n, 0, 0.3, v, { send: 0.2 });
      if (!rec) return;
      const rows = rowsFor();
      const snapped = rows.reduce((best, r) => (Math.abs(r - n) < Math.abs(best - n) ? r : best), rows[0]);
      const gi = Math.min(MELODY_STEPS - 1, cursor % (16 * maxBars));
      update((s) => { s.project.melody[gi] = { n: snapped, len: dur }; });
      cursor = (gi + dur) % (16 * maxBars);
      if (Math.floor(cursor / 16) !== bar) bar = Math.floor(cursor / 16);
      renderTabs(); renderRoll();
    },
  });

  const durSeg = segmented([{ value: 1, label: '♬ 1/16' }, { value: 2, label: '♪ 1/8' }, { value: 4, label: '♩ 1/4' }, { value: 8, label: '𝅗𝅥 1/2' }], dur, (v) => { dur = v; });
  const leadSel = select(presetOptions((p) => p.role !== 'bass'), P().sounds.lead, (v) => update((s) => { s.project.sounds.lead = v; }));
  const muteSeg = segmented([{ value: 'all', label: 'Tout' }, { value: 'nodrums', label: 'Sans drums' }, { value: 'solo', label: 'Mélodie seule' }], 'all', (v) => update((s) => {
    s.project.mutes = v === 'all' ? {} : v === 'nodrums' ? { drums: true } : { drums: true, chords: true, bass: true };
  }));

  root.append(card(
    el('div.ctrl-row', play, mode !== 'dictation' ? leadSel : null, el('span.muted.small', `${genre.emoji} ${NOTE_NAMES[P().rootPc]} ${SCALES[P().scale].name} · ${P().bpm} BPM`)),
    el('div.ctrl-row', el('label', 'Durée'), durSeg, mode !== 'dictation' ? el('button.btn.small', { onclick: () => { penta = !penta; renderRoll(); toast(penta ? 'Pentatonique : impossible de sonner faux' : 'Gamme complète'); } }, 'Penta ⇄') : null),
    tabs, chordName,
    el('div.roll-wrap', rollEl),
    mode !== 'dictation' ? tools : null,
    el('div.ctrl-row', recBtn, el('span.small.muted', 'Clavier MIDI (MPC Key 37) : active la saisie, chaque note jouée s’écrit et le curseur avance.')),
    el('div.ctrl-row', el('label', 'Écoute'), muteSeg),
  ));
  if (mode !== 'dictation') root.append(card(catchyEl));

  // ---------- Modes ----------
  if (mode === 'free') {
    let rewarded = false;
    root.append(
      hintBox(el('div', el('p', '1) Tape d’abord un rythme sur une seule note. 2) Répète-le. 3) Change quelques hauteurs en visant les cases teintées (notes de l’accord) sur les temps. 4) Termine la mesure 2 ou 4 sur la tonique.'), el('p', 'Utilise ⧉ Copier puis modifie la fin : question → réponse.'))),
      card(el('div.row.gap.wrap',
        el('button.btn.small', { onclick: () => downloadMidi(`idee-${P().genre}-${P().bpm}bpm`, projectToSong(P())) }, '⬇ MIDI complet (4 pistes)'),
        el('button.btn.small', { onclick: () => downloadMidi(`melodie-${P().genre}`, projectToSong(P(), { melody: true })) }, '⬇ MIDI mélodie'),
        el('button.btn.small', {
          onclick: () => {
            update((s) => { s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Idée ${genreById(s.project.genre).name}`, date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)) }); });
            toast('Idée complète sauvée 📓', 'good');
          },
        }, '📓 Sauver l’idée'),
        el('a.btn.small', { href: '#/beat' }, '🥁 Modifier le beat'),
        el('a.btn.small', { href: '#/chords' }, '🎼 Modifier les accords'),
        el('button.btn.small.primary', {
          onclick: () => {
            const res = renderCatchy();
            if (!res || P().melody.filter(Boolean).length < 4) return toast('Écris au moins 4 notes', 'bad');
            if (rewarded) return toast('Déjà validé — tu peux encore l’améliorer !');
            rewarded = true;
            update((s) => { s.stats.bestCatchy = Math.max(s.stats.bestCatchy, res.score); });
            stopAll();
            finishExercise({ key: 'melody:free', title: 'Mélodie écrite', score: res.score, xp: 10 + res.score / 4, skill: 'melodie', genre: P().genre, success: res.score >= 60,
              lesson: res.tips[0] || 'Excellent équilibre ! Essaie maintenant la même mélodie avec un autre son ou une octave plus bas (en basse).',
              transfer: 'Exporte le MIDI complet : dans Live, glisse chaque piste sur Serum 2 (accords, basse, lead) et un Drum Rack.' });
          },
        }, '✓ Valider'),
      )),
    );
  }

  if (challenge) {
    root.prepend(card(el('div.lesson', el('div.lesson-title', '🧩 Défi'), el('p', el('b', challenge.text)))));
    root.append(
      hintBox('Commence par le rythme sur une seule note, utilise ⧉ Copier pour répéter, puis ajuste les hauteurs. Le Catchy-mètre te guide.', () => { hintUsed = true; }),
      el('button.btn.primary.wide', {
        onclick: () => {
          const res = renderCatchy();
          const p = P();
          if (!challenge.check(p.melody, p)) return toast('La règle du défi n’est pas encore respectée 🧐', 'bad');
          if (res.score < challenge.min) return toast(`Catchy-mètre à ${res.score} : vise ${challenge.min}+. Regarde les conseils.`, 'bad');
          stopAll();
          update((s) => {
            s.stats.bestCatchy = Math.max(s.stats.bestCatchy, res.score);
            s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Hook ${genre.name}`, note: challenge.text, date: Date.now(), genre: genre.id, project: JSON.parse(JSON.stringify(s.project)) });
          });
          finishExercise({ key: 'melody:challenge', title: 'Défi hook réussi', score: res.score, xp: 25 + res.score / 4, skill: 'melodie', genre: genre.id, hintUsed, success: true,
            lesson: challenge.lesson,
            transfer: 'Rejoue ce hook au MPC Key 37 (Scale activé) avec un son de Serum 2 : change le son (pluck, lead, cloche) et note lequel le rend le plus catchy. (Sauvé dans le Carnet.)',
            onRetry: () => { location.hash = `#/melody?mode=challenge&genre=${shuffle(GENRES)[0].id}&r=${Date.now()}`; } });
        },
      }, '✓ Valider le défi'),
    );
  }

  if (target) {
    const playTarget = () => {
      ensureAudio();
      stopAll();
      const v = voiceProgression(P());
      const sd = 60 / P().bpm / 4;
      if (v[0]) previewChord(v[0].notes, 'pad', sd * 16, 0);
      const lead = presetParams('pluck');
      const t0 = getCtxTime() + 0.05;
      target.notes.forEach((m, i) => { if (m) playSynth(lead, m.n, t0 + i * sd, m.len * sd * 0.9, 0.9, { send: 0.2 }); });
    };
    const playMine = () => {
      ensureAudio();
      const sd = 60 / P().bpm / 4;
      const lead = presetParams('pluck');
      P().melody.slice(0, 16).forEach((m, i) => { if (m) playSynth(lead, m.n, getCtxTime() + 0.05 + i * sd, m.len * sd * 0.9, 0.9, { send: 0.2 }); });
    };
    root.prepend(card(
      el('div.lesson', el('div.lesson-title', '👂 Dictée'), el('p', target.showRhythm ? 'Les cases vertes indiquent le RYTHME. Retrouve les hauteurs.' : 'Retrouve le rythme ET les hauteurs du motif (mesure 1).')),
      el('p.small.muted', `Le motif commence sur ${target.startHint ? midiToName(target.startHint) + ' (la première note est donnée)' : 'une note de l’accord'}.`),
      el('div.row.gap.wrap', el('button.btn.primary', { onclick: playTarget }, '▶ Écouter le motif'), el('button.btn', { onclick: playMine }, '▶ Ma version')),
    ));
    if (target.startHint) {
      const first = target.notes.findIndex(Boolean);
      update((s) => { s.project.melody[first] = { ...target.notes[first] }; });
    }
    root.append(
      hintBox('Chante le motif. Repère d’abord si ça monte ou descend, puis la note la plus haute. Les notes sur les temps sont presque toujours des notes de l’accord (cases teintées).', () => { hintUsed = true; }),
      el('button.btn.primary.wide', {
        onclick: () => {
          const mine = P().melody.slice(0, 16);
          let hit = 0, total = 0, extra = 0;
          target.notes.forEach((m, i) => { if (m) { total++; if (mine[i] && mine[i].n === m.n) hit++; } });
          mine.forEach((m, i) => { if (m && !target.notes[i]) extra++; });
          const score = Math.round((200 * hit) / (2 * hit + (total - hit) + extra) || 0);
          stopAll();
          finishExercise({ key: 'melody:dictation', title: 'Dictée mélodique', score, xp: 10 + score * 0.4, skill: 'oreille', genre: P().genre, hintUsed, success: score >= 80,
            details: el('p.small.muted', `Motif : ${target.notes.filter(Boolean).map((m) => midiToName(m.n)).join(' – ')}`),
            lesson: 'Pour relever une mélodie : contour (monte/descend) → notes des temps forts → remplissage. Avec la pratique, tu reconnaîtras les degrés (tonique, quinte…) directement.',
            transfer: 'Prends un morceau que tu aimes, relève son hook au MPC Key 37 en 5 minutes max. C’est l’exercice n°1 des producteurs autodidactes.',
            onRetry: () => { location.hash = `#/melody?mode=dictation&genre=${shuffle(GENRES)[0].id}&r=${Date.now()}`; } });
        },
      }, '✓ Vérifier'),
    );
  }

  renderTabs();
  renderRoll();
  const goBar = (d) => { if (maxBars < 2) return; bar = (bar + d + maxBars) % maxBars; follow = false; renderTabs(); renderRoll(); };
  viewKeys({ left: () => goBar(-1), right: () => goBar(1) });
  const offPh = onPlayhead((step) => { if (step < 0) { playStep = -1; paintPlayhead(); } else onVis(step); });
  return () => { stopAll(); offMidi(); offPh(); };
}


/** Génère une graine « rythme d'abord » : motif de 1 mesure répété en AAB A'. */
function seed(m, rowsDesc, voiced) {
  const rows = rowsDesc.slice().reverse();
  const r = Math.random;
  const rhythmPool = [
    [0, 3, 6, 10, 12], [0, 2, 4, 7, 10], [0, 4, 6, 8, 11, 14], [2, 6, 8, 10, 14], [0, 3, 6, 8, 12, 14], [0, 6, 8, 11],
  ];
  const rhythm = rhythmPool[Math.floor(r() * rhythmPool.length)];
  const chordTones = (b) => rows.filter((n) => voiced[b]?.pcs.includes(mod(n, 12)));
  m.fill(null);
  const mid = Math.floor(rows.length / 2);
  let idx = mid;
  const motif = rhythm.map((s, k) => {
    if (s % 4 === 0) {
      const ct = chordTones(0);
      const near = ct.reduce((b, n) => (Math.abs(n - rows[idx]) < Math.abs(b - rows[idx]) ? n : b), ct[0] ?? rows[idx]);
      idx = Math.max(0, rows.indexOf(near));
    } else idx = Math.max(0, Math.min(rows.length - 1, idx + [-1, 1, -2, 2, 0][Math.floor(r() * 5)]));
    const next = rhythm[k + 1] ?? 16;
    return { s, n: rows[idx], len: Math.min(2, next - s) };
  });
  for (const b of [0, 1, 3]) motif.forEach((x) => { m[b * 16 + x.s] = { n: x.n, len: x.len }; });
  // mesure 2 : réponse — finit sur une note de l'accord
  const last = motif[motif.length - 1];
  const ct1 = chordTones(1);
  if (ct1.length) m[16 + last.s] = { n: ct1.reduce((b, n) => (Math.abs(n - last.n) < Math.abs(b - last.n) ? n : b), ct1[0]), len: 2 };
  // mesure 3 : contraste (B) — même rythme décalé d'un degré
  motif.forEach((x) => { const i = rows.indexOf(x.n); m[32 + x.s] = { n: rows[Math.min(rows.length - 1, i + 2)], len: x.len }; });
}

function makeDictation(p, lv) {
  const v = voiceProgression(p);
  const sc = SCALES[p.scale].steps.includes(3) ? 'pentaMinor' : 'pentaMajor';
  const lowRoot = 60 + mod(p.rootPc, 12) - (mod(p.rootPc, 12) > 6 ? 12 : 0);
  const rows = scaleNotes(p.rootPc, lv < 5 ? sc : p.scale, lowRoot - 2, lowRoot + 12);
  const rhythms = [[0, 4, 8, 12], [0, 2, 4, 8], [0, 4, 6, 8, 12], [0, 3, 6, 8, 12], [0, 2, 4, 6, 8]];
  const rh = rhythms[Math.floor(Math.random() * (lv < 4 ? 2 : rhythms.length))];
  const ct = rows.filter((n) => v[0]?.pcs.includes(mod(n, 12)));
  let i = rows.indexOf(ct[Math.floor(Math.random() * ct.length)] ?? rows[0]);
  const notes = new Array(16).fill(null);
  rh.forEach((s, k) => {
    if (k > 0) i = Math.max(0, Math.min(rows.length - 1, i + [-2, -1, 1, 2, 1, -1][Math.floor(Math.random() * 6)]));
    const next = rh[k + 1] ?? 16;
    notes[s] = { n: rows[i], len: Math.min(4, next - s) };
  });
  const first = notes.find(Boolean);
  return { notes, showRhythm: lv < 6, startHint: lv < 10 ? first.n : null };
}
