// Lab Arrangement : de la boucle de 4 mesures au morceau de 64 mesures.
import { el, card, header, segmented, select, finishExercise, downloadMidi, toast, hintBox } from '../ui.js';
import { getState, update } from '../store.js';
import { genreById } from '../data/genres.js';
import { voiceProgression } from '../core/arrange.js';
import {
  BLOCKS, BLOCK_STEPS, LAYERS, SECTIONS, DRUM_MODES, FILTERS, TEMPLATES, ARR_CHALLENGES,
  newArrangement, arrangementEventsAt, arrangementToSong, activeLayers,
} from '../core/arrangement.js';
import { transport, masterFilterAt, playRiser, ensureAudio } from '../core/audio.js';
import { playEvents } from '../player.js';

const LAYER_UI = { drums: '🥁 Drums', bass: '🎸 Basse', chords: '🎼 Accords', melody: '🎵 Mélodie' };

export function render(root, params) {
  const challenge = ARR_CHALLENGES.find((c) => c.id === params.challenge) || null;
  if (challenge || !getState().arrangement) {
    update((s) => { s.arrangement = newArrangement(challenge ? 'loop' : 'club'); });
  }
  const A = () => getState().arrangement;
  const P = () => getState().project;
  const g = genreById(P().genre);
  let sel = 0;
  let playingBlock = -1;
  let hintUsed = false;
  let rewarded = false;

  root.append(header('🧱 Lab Arrangement', challenge ? `Défi : ${challenge.title}` : 'Transforme ta boucle en morceau de 64 mesures'));

  const timeline = el('div.arr-timeline');
  const editor = el('div');
  const summary = el('p.small.muted');

  const drawTimeline = () => {
    timeline.replaceChildren(...A().blocks.map((b, i) => {
      const sec = SECTIONS[b.sec];
      const fx = [b.filter === 'open' ? '↗' : b.filter === 'down' ? '↘' : b.filter === 'closed' ? '▁' : '', b.riser ? '⤴' : '', b.roll ? '≡' : ''].join('');
      return el('button.arr-block' + (i === sel ? '.sel' : '') + (i === playingBlock ? '.play' : ''), {
        type: 'button', style: { '--c': sec.color }, title: `Mesures ${i * 4 + 1}-${i * 4 + 4} · ${sec.name}`,
        onclick: () => { sel = i; drawTimeline(); drawEditor(); },
      },
      el('span.arr-sec', sec.name.slice(0, 5)),
      el('span.arr-layers', LAYERS.map((l) => el('i' + (b.layers[l] ? '.on' : '')))),
      el('span.arr-fx', fx || ' '),
      el('span.arr-bar', String(i * 4 + 1)));
    }));
    const secs = A().blocks.length * 4 * 4 * 60 / P().bpm;
    summary.textContent = `64 mesures · ${Math.floor(secs / 60)} min ${String(Math.round(secs % 60)).padStart(2, '0')} à ${P().bpm} BPM · boucle : ${g.emoji} ${g.name}`;
  };

  const setBlock = (fn) => { update((s) => fn(s.arrangement.blocks[sel])); drawTimeline(); drawEditor(); };

  const drawEditor = () => {
    const b = A().blocks[sel];
    editor.replaceChildren(
      el('div.row.between', el('h3', `Bloc ${sel + 1} · mesures ${sel * 4 + 1}–${sel * 4 + 4}`), el('span.small.muted', `${activeLayers(b)} piste(s)`)),
      el('div.ctrl-row', el('label', 'Section'), segmented(Object.entries(SECTIONS).map(([k, v]) => ({ value: k, label: v.name })), b.sec, (v) => setBlock((x) => { x.sec = v; }))),
      el('div.ctrl-row', el('label', 'Pistes'), el('div.row.gap.wrap', LAYERS.map((l) => el('button.btn.small' + (b.layers[l] ? '.primary' : ''), {
        onclick: () => setBlock((x) => { x.layers[l] = !x.layers[l]; }),
      }, LAYER_UI[l])))),
      el('div.ctrl-row', el('label', 'Batterie'), segmented(Object.entries(DRUM_MODES).map(([k, v]) => ({ value: k, label: v.name })), b.drumMode, (v) => setBlock((x) => { x.drumMode = v; }))),
      el('div.ctrl-row', el('label', 'Filtre'), segmented(Object.entries(FILTERS).map(([k, v]) => ({ value: k, label: v.name })), b.filter, (v) => setBlock((x) => { x.filter = v; }))),
      el('div.ctrl-row',
        el('button.btn.small' + (b.riser ? '.primary' : ''), { onclick: () => setBlock((x) => { x.riser = !x.riser; }) }, '⤴ Riser (dernière mesure)'),
        el('button.btn.small' + (b.roll ? '.primary' : ''), { onclick: () => setBlock((x) => { x.roll = !x.roll; }) }, '≡ Roulement de snare')),
      el('div.row.gap.wrap',
        el('button.btn.small', { onclick: () => playFrom(sel) }, '▶ Écouter depuis ici'),
        el('button.btn.small', {
          onclick: () => {
            if (sel >= BLOCKS - 1) return;
            update((s) => { s.arrangement.blocks[sel + 1] = JSON.parse(JSON.stringify(s.arrangement.blocks[sel])); });
            sel++; drawTimeline(); drawEditor();
          },
        }, '⧉ Copier → bloc suivant'),
      ),
    );
  };

  // ---------- Lecture ----------
  const playBtn = el('button.btn.play', { onclick: () => (transport.playing ? stop() : playFrom(0)) }, '▶ Lecture');
  const stop = () => { transport.stop(); playingBlock = -1; playBtn.textContent = '▶ Lecture'; playBtn.classList.remove('on'); drawTimeline(); };
  const playFrom = (startBlock) => {
    ensureAudio();
    const voiced = voiceProgression(P());
    let lastBass = null;
    playBtn.textContent = '■ Stop'; playBtn.classList.add('on');
    transport.start((step, time, sd) => {
      const gStep = startBlock * BLOCK_STEPS + step;
      if (gStep >= BLOCKS * BLOCK_STEPS) { setTimeout(stop, 50); transport.onStep = null; return; }
      const p = P(), arr = A();
      const ev = arrangementEventsAt(p, voiced, arr, gStep);
      const b = arr.blocks[ev.block];
      if (ev.local === 0) {
        const dur = BLOCK_STEPS * sd;
        if (b.filter === 'open') masterFilterAt(time, 18000, 250, dur);
        else if (b.filter === 'down') masterFilterAt(time, 300, 18000, dur);
        else if (b.filter === 'closed') masterFilterAt(time, 700);
        else masterFilterAt(time, 20000);
      }
      if (b.riser && ev.local === 48) playRiser(time, 16 * sd);
      lastBass = playEvents(p, ev, time, sd, { drums: true, chords: true, bass: true, melody: true }, lastBass);
    }, (step) => {
      const bi = startBlock + Math.floor(step / BLOCK_STEPS);
      if (bi !== playingBlock) { playingBlock = bi; drawTimeline(); }
    }, { bpm: P().bpm, swing: P().swing });
  };

  const tplSel = select([{ value: '', label: '📐 Appliquer un modèle…' }, ...Object.entries(TEMPLATES).map(([k, t]) => ({ value: k, label: t.name }))], '', (v) => {
    if (!v) return;
    if (!confirm('Remplacer l’arrangement actuel par ce modèle ?')) { tplSel.value = ''; return; }
    update((s) => { s.arrangement = newArrangement(v); });
    tplSel.value = '';
    drawTimeline(); drawEditor();
  });

  root.append(
    challenge ? card(el('div.lesson', el('div.lesson-title', '🧩 Défi'), el('p', el('b', challenge.text))),
      el('p.small.muted', 'Point de départ : ta boucle complète répétée sur 64 mesures. Sculpte-la bloc par bloc.')) : null,
    card(
      el('div.ctrl-row', playBtn, tplSel),
      summary,
      timeline,
      el('p.small.muted', 'Chaque bloc = 4 mesures. Points = pistes actives (drums, basse, accords, mélodie). ↗↘▁ filtre · ⤴ riser · ≡ roulement.'),
    ),
    card(editor),
    hintBox(el('div',
      el('p', 'Règle d’or : toutes les 8 mesures, quelque chose change (une piste entre ou sort, le filtre bouge, un roulement…).'),
      el('p', 'Pour faire monter la tension sans ajouter de notes : coupe le kick, ouvre le filtre, ajoute un riser et un roulement. Puis tout revient d’un coup au drop.'),
      el('p', 'Dans Live 12 : place des Locators aux mêmes endroits, et automatise un Auto Filter sur le groupe master.')), () => { hintUsed = true; }),
    card(el('div.row.gap.wrap',
      el('button.btn.small', { onclick: () => downloadMidi(`arrangement-${P().genre}-${P().bpm}bpm`, arrangementToSong(P(), A())) }, '⬇ MIDI 64 mesures (avec marqueurs)'),
      el('button.btn.small', {
        onclick: () => {
          update((s) => { s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Arrangement ${genreById(s.project.genre).name}`, note: s.arrangement.blocks.map((b) => SECTIONS[b.sec].name[0]).join(''), date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)), arrangement: JSON.parse(JSON.stringify(s.arrangement)) }); });
          toast('Arrangement sauvé dans le Carnet 📓', 'good');
        },
      }, '📓 Sauver'),
      el('a.btn.small', { href: '#/melody' }, '✏️ Modifier la boucle'),
      challenge
        ? el('button.btn.small.primary', {
          onclick: () => {
            if (!challenge.check(A())) return toast('Le défi n’est pas encore réussi 🧐 Relis la consigne.', 'bad');
            stop();
            finishExercise({ key: 'arr:challenge', title: challenge.title, xp: 45, skill: 'autonomie', genre: P().genre, hintUsed, success: true,
              lesson: challenge.lesson,
              transfer: 'Exporte le MIDI : à l’import dans Live, les marqueurs de sections t’indiquent où placer tes Locators. Reproduis la même structure avec tes vrais sons.',
              onRetry: () => { location.hash = `#/arrange?challenge=${ARR_CHALLENGES[(ARR_CHALLENGES.indexOf(challenge) + 1) % ARR_CHALLENGES.length].id}&r=${Date.now()}`; } });
          },
        }, '✓ Vérifier le défi')
        : el('button.btn.small.primary', {
          onclick: () => {
            if (rewarded) return toast('Déjà validé — continue d’affiner !');
            const sigs = new Set(A().blocks.map((b) => JSON.stringify(b)));
            if (sigs.size < 4) return toast('Varie davantage tes blocs (au moins 4 configurations différentes)', 'bad');
            rewarded = true;
            stop();
            finishExercise({ key: 'arr:free', title: 'Arrangement créé', xp: 25, skill: 'autonomie', genre: P().genre, success: true,
              lesson: 'Un arrangement, c’est une histoire : installer, faire attendre, libérer, respirer, recommencer plus fort.',
              transfer: 'Dans Live : duplique ta boucle sur 64 mesures en vue Arrangement et supprime des clips en suivant ce plan.' });
          },
        }, '✓ Valider'),
    )),
    el('div.row.gap.wrap', { style: { margin: '6px 0 12px' } }, ARR_CHALLENGES.map((c) => el('a.btn.small.ghost', { href: `#/arrange?challenge=${c.id}` }, `🧩 ${c.title}`))),
  );
  drawTimeline();
  drawEditor();
  return () => stop();
}
