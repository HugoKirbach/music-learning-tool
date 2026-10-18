import { el, card, header, segmented, select, hintBox, finishExercise, downloadMidi, playButton, toast, shuffle } from '../ui.js';
import { getState, update, projectFromGenre } from '../store.js';
import { SCALES, HEPTATONIC, NOTE_NAMES, slotChord, borrowOptions, detectChord, romanFor, mod } from '../core/theory.js';
import { CHORD_RHYTHMS, BASS_RHYTHMS, projectToSong, voiceProgression } from '../core/arrange.js';
import { playProject, previewChord, stopAll, presetParams, onPlayhead } from '../player.js';
import { playSynth, ensureAudio, now } from '../core/audio.js';
import { presetOptions } from '../data/presets.js';
import { slider } from '../ui.js';
import { GENRES, genreById } from '../data/genres.js';
import { onMidi } from '../midiin.js';

const FN = ['T', 'S', 'T', 'S', 'D', 'T', 'D'];
const FN_LABEL = { T: 'Tonique (repos)', S: 'Sous-dominante (départ)', D: 'Dominante (tension)' };

export const FAMOUS = [
  { name: 'Pop « Axis »', scale: 'major', prog: [0, 4, 5, 3], note: 'I–V–vi–IV : des centaines de hits (Let It Be, With or Without You…).' },
  { name: 'Sensible', scale: 'major', prog: [5, 3, 0, 4], note: 'vi–IV–I–V : la même, démarrée sur le vi → plus mélancolique.' },
  { name: 'Années 50', scale: 'major', prog: [0, 5, 3, 4], note: 'I–vi–IV–V : doo-wop, Stand By Me.' },
  { name: 'Jazz ii–V–I', scale: 'major', prog: [1, 4, 0, 0], note: 'La cadence du jazz, du lo-fi et de la bossa. Essaie en 7e !' },
  { name: 'Trance épique', scale: 'minor', prog: [0, 5, 2, 6], note: 'i–VI–III–VII : euphorique et triste à la fois.' },
  { name: 'Andalouse', scale: 'minor', prog: [0, 6, 5, { deg: 4, mode: 'harmonicMinor' }], note: 'i–VII–VI–V : flamenco, Hit the Road Jack, trap.' },
  { name: 'Royal Road', scale: 'major', prog: [3, 4, 2, 5], note: 'IV–V–iii–vi : la progression reine de la J-pop et de la future bass.' },
  { name: 'Deep dorien', scale: 'dorian', prog: [0, 3, 0, 3], note: 'i–IV : deux accords, toute la couleur du dorien (So What, deep house).' },
  { name: 'Mineur dramatique', scale: 'minor', prog: [0, 3, { deg: 4, mode: 'harmonicMinor' }, 0], note: 'i–iv–V–i : le V majeur emprunté crée une vraie résolution.' },
  { name: 'Lydien rêveur', scale: 'lydian', prog: [0, 1, 0, 1], note: 'I–II : la 4te augmentée rend tout flottant (musiques de film, ambient).' },
];

const RECIPES = [
  { text: 'Commence sur le vi (ou i en mineur) et termine sur le V.', check: (p) => [5, 0].includes(p.chords[0]?.deg) && p.chords[3]?.deg === 4, lesson: 'Finir sur V crée une tension qui appelle le retour au début : idéal pour une boucle.' },
  { text: 'Utilise au moins un accord emprunté (bouton « Emprunts »).', check: (p) => p.chords.some((c) => c?.mode && c.mode !== p.scale), lesson: 'L’échange modal ajoute de l’émotion sans quitter la tonalité : le iv mineur en majeur, le V majeur en mineur…' },
  { text: '4 accords tous différents, dont un IV (ou iv) et un V (ou v).', check: (p) => new Set(p.chords.map((c) => c && `${c.deg}${c.mode || ''}`)).size === 4 && p.chords.some((c) => c?.deg === 3) && p.chords.some((c) => c?.deg === 4), lesson: 'IV et V sont les deux « moteurs » de l’harmonie tonale : départ et tension.' },
  { text: 'Une descente : chaque accord est 1 ou 2 degrés plus bas que le précédent.', check: (p) => p.chords.every((c, i) => i === 0 || (c && p.chords[i - 1] && [1, 2].includes(mod(p.chords[i - 1].deg - c.deg, 7)))), lesson: 'Les basses descendantes (i–VII–VI–V) donnent un sentiment d’inévitable. Très efficace en intro et en break.' },
  { text: 'Une cadence parfaite : un V (ou V7) directement suivi du I/i.', check: (p) => p.chords.some((c, i) => c?.deg === 4 && p.chords[(i + 1) % 4]?.deg === 0), lesson: 'V → I est la résolution la plus forte de la musique tonale. Le V majeur (même en mineur) la renforce.' },
  { text: 'Utilise un accord de 7e ou 9e (Extensions) et au moins 3 accords différents.', check: (p) => p.ext >= 4 && new Set(p.chords.map((c) => c && c.deg)).size >= 3, lesson: 'Les extensions (7e, 9e) adoucissent et « jazzifient » : deep house, lo-fi, neo-soul.' },
  { text: 'Une progression qui ne contient PAS l’accord I/i.', check: (p) => p.chords.every((c) => c && c.deg !== 0), lesson: 'Éviter la tonique garde la boucle en suspens : l’auditeur attend une résolution qui ne vient jamais (très utilisé en house).' },
];

export function render(root, params) {
  const mode = params.mode || 'free';
  if (params.genre) {
    const g = genreById(params.genre);
    update((s) => {
      const fresh = projectFromGenre(g.id);
      Object.assign(s.project, { genre: g.id, rootPc: fresh.rootPc, scale: fresh.scale, chords: fresh.chords, ext: fresh.ext, chordStyle: fresh.chordStyle, bassStyle: fresh.bassStyle, sounds: fresh.sounds, bpm: fresh.bpm, swing: fresh.swing, kit: fresh.kit, drums: fresh.drums });
    });
  }
  const P = () => getState().project;
  const recipe = mode === 'recipe' ? RECIPES[Math.floor(Math.random() * RECIPES.length)] : null;
  if (recipe) update((s) => { s.project.chords = [{ deg: 0 }, null, null, null]; });
  let sel = recipe ? 1 : 0;
  let borrowMode = null;
  let hintUsed = false;
  let rating = 2;
  let layers = { drums: true, bass: true, melody: false, chords: true };

  root.append(header('Lab Accords', recipe ? 'Recette : construis une progression qui respecte la règle' : 'Construis des progressions par degrés'));
  root.append(el('div.row.gap.wrap', { style: { marginBottom: '10px' } },
    segmented([{ value: 'free', label: '🎨 Libre' }, { value: 'recipe', label: '🧩 Recette' }], mode, (v) => { location.hash = `#/chords?mode=${v}&genre=${P().genre}`; }),
    el('a.btn.small.ghost', { href: '#/ear?mode=progressions&n=5' }, '👂 Quiz progressions')));

  const slotsEl = el('div.slots');
  const palette = el('div.palette');
  const info = el('p.small.muted');
  const midiInfo = el('div', el('p.small.muted', '🎹 Avec ton MPC Key 37 branché : joue un accord, il est reconnu et tu peux l’ajouter à la progression.'));

  const voiced = () => voiceProgression(P());

  const renderSlots = (playing = -1) => {
    const v = voiced();
    slotsEl.replaceChildren(...P().chords.map((c, i) => {
      const ch = v[i];
      return el('div.slot' + (i === sel ? '.sel' : '') + (i === playing ? '.play' : '') + (ch?.borrowed ? '.borrowed' : ''), {
        onclick: () => { sel = i; renderSlots(); if (ch) previewChord(ch.notes, P().sounds.chords); },
      }, ch ? [el('div.roman', ch.roman), el('div.sym', ch.symbol)] : [el('div.roman.muted', '+'), el('div.sym', `accord ${i + 1}`)]);
    }));
  };

  const renderPalette = () => {
    const p = P();
    const modeId = borrowMode || p.scale;
    palette.replaceChildren(...Array.from({ length: 7 }, (_, deg) => {
      const c = slotChord(p.rootPc, p.scale, { deg, mode: borrowMode || undefined }, p.ext);
      return el('button.pchip' + (borrowMode ? '.borrowed' : `.fn-${FN[deg]}`), {
        type: 'button',
        title: borrowMode ? `Emprunté à ${SCALES[modeId].name}` : FN_LABEL[FN[deg]],
        onclick: () => {
          update((s) => { s.project.chords[sel] = borrowMode ? { deg, mode: borrowMode } : { deg }; });
          const v = voiced();
          if (v[sel]) previewChord(v[sel].notes, p.sounds.chords);
          sel = (sel + 1) % 4;
          renderSlots();
        },
      }, el('b', c.roman), el('small', c.symbol));
    }));
    info.textContent = borrowMode
      ? `Accords du mode ${SCALES[borrowMode].name} (même tonique) : en bleu, ce sont des emprunts.`
      : `${NOTE_NAMES[p.rootPc]} ${SCALES[p.scale].name} — ${SCALES[p.scale].mood}. Couleurs : vert = repos, jaune = départ, rouge = tension.`;
  };

  const rootSel = select(NOTE_NAMES.map((n, i) => ({ value: i, label: n })), P().rootPc, (v) => { update((s) => { s.project.rootPc = +v; }); renderAll(); });
  const scaleSel = select(HEPTATONIC.map((k) => ({ value: k, label: SCALES[k].name })), P().scale, (v) => { update((s) => { s.project.scale = v; }); borrowMode = null; renderBorrow(); renderAll(); });
  const borrowWrap = el('div');
  const renderBorrow = () => {
    borrowWrap.replaceChildren(segmented([{ value: '', label: 'Diatonique' }, ...borrowOptions(P().scale).map((m) => ({ value: m, label: `Emprunt : ${SCALES[m].name.split(' ')[0]}` }))], borrowMode || '', (v) => { borrowMode = v || null; renderPalette(); }));
  };
  renderBorrow();

  const renderAll = () => { renderSlots(); renderPalette(); };

  const play = playButton(
    () => playProject(P, { layers, onVisual: (step) => { if (step % 16 === 0) renderSlots(Math.floor(step / 16) % 4); } }),
    () => { stopAll(); renderSlots(); },
  );

  const famousSel = select([{ value: '', label: '📚 Progressions célèbres…' }, ...FAMOUS.map((f, i) => ({ value: i, label: f.name }))], '', (v) => {
    if (v === '') return;
    const f = FAMOUS[+v];
    update((s) => { s.project.scale = f.scale; s.project.chords = f.prog.map((x) => (typeof x === 'number' ? { deg: x } : { ...x })); });
    scaleSel.value = f.scale;
    toast(f.note, 'info', 5000);
    renderBorrow(); renderAll();
  });

  // Clavier MIDI : joue avec le son des accords, reconnaît l'accord et permet de l'ajouter à la progression.
  const voices = new Map();
  const offMidi = onMidi({
    noteOn: (n, v, held) => {
      ensureAudio();
      voices.get(n)?.release();
      voices.set(n, playSynth(presetParams(P().sounds.chords), n, now(), null, v, { send: 0.3 }));
      showDetected(held);
    },
    noteOff: (n, held) => { voices.get(n)?.release(); voices.delete(n); if (held.length) showDetected(held); },
  });
  /** Retrouve le degré (diatonique ou emprunté) correspondant à un accord joué. */
  function slotFor(d) {
    const p = P();
    const fam = (q) => (q === 'dom' ? 'maj' : q);
    for (const mode of [undefined, ...borrowOptions(p.scale)]) {
      for (let deg = 0; deg < 7; deg++) {
        const c = slotChord(p.rootPc, p.scale, { deg, mode }, 3);
        if (c.rootPc === d.rootPc && fam(c.quality?.q) === fam(d.quality.q)) return mode ? { deg, mode } : { deg };
      }
    }
    return null;
  }
  function showDetected(held) {
    if (held.length < 3) return;
    const d = detectChord(held);
    if (!d) { midiInfo.replaceChildren(el('p.small.muted', 'Accord non reconnu — essaie une triade ou une 7e.')); return; }
    const roman = romanFor(P().rootPc, d.rootPc, d.quality, P().scale);
    const slot = slotFor(d);
    midiInfo.replaceChildren(el('div.lesson', el('div.lesson-title', '🎹 Accord joué'),
      el('p', el('b', d.symbol), ` — ${d.quality.label} — ${roman} en ${NOTE_NAMES[P().rootPc]}`),
      slot
        ? el('button.btn.small.primary', {
          onclick: () => {
            update((s) => { s.project.chords[sel] = slot; });
            toast(`${d.symbol} → accord ${sel + 1}`, 'good');
            sel = (sel + 1) % 4;
            renderSlots();
          },
        }, `➕ Mettre en accord ${sel + 1}`)
        : el('p.small.muted', 'Cet accord n’est pas dans la gamme (ni dans les emprunts proposés) : change la tonalité ou essaie une autre fondamentale.')));
  }

  const pumpSl = slider({ label: 'Pompe (sidechain)', min: 0, max: 1, step: 0.01, value: P().pump ?? 0, format: (v) => `${Math.round(v * 100)}%`, onInput: (v) => update((s) => { s.project.pump = v; }) });
  const tools = card(
    el('div.ctrl-row', play, rootSel, scaleSel),
    el('div.ctrl-row',
      el('label', 'Notes'), segmented([{ value: 3, label: 'Triades' }, { value: 4, label: '7e' }, { value: 5, label: '9e' }], P().ext, (v) => { update((s) => { s.project.ext = v; }); renderAll(); }),
    ),
    el('div.ctrl-row',
      el('label', 'Voicing'), segmented([{ value: 'lead', label: 'Voice leading' }, { value: 'close', label: 'Serré' }, { value: 'spread', label: 'Écarté' }], P().voicing, (v) => { update((s) => { s.project.voicing = v; }); renderAll(); }),
    ),
    el('div.ctrl-row',
      el('label', 'Rythme'), select(Object.entries(CHORD_RHYTHMS).map(([k, r]) => ({ value: k, label: r.name })), P().chordStyle, (v) => update((s) => { s.project.chordStyle = v; })),
      el('label', 'Son'), select(presetOptions((p) => p.role !== 'bass'), P().sounds.chords, (v) => update((s) => { s.project.sounds.chords = v; })),
    ),
    el('div.ctrl-row',
      el('label', 'Basse'), select(Object.entries(BASS_RHYTHMS).map(([k, r]) => ({ value: k, label: r.name })), P().bassStyle, (v) => update((s) => { s.project.bassStyle = v; })),
      select(presetOptions((p) => p.role === 'bass'), P().sounds.bass, (v) => update((s) => { s.project.sounds.bass = v; })),
      el('label', 'Pistes'), segmented([{ value: 'all', label: 'Tout' }, { value: 'chords', label: 'Accords seuls' }], 'all', (v) => { layers = v === 'all' ? { drums: true, bass: true, melody: false, chords: true } : { drums: false, bass: false, melody: false, chords: true }; }),
    ),
  );

  tools.append(pumpSl, el('p.small.muted', 'Pompe : les accords et la basse « respirent » sur chaque kick, comme un compresseur en sidechain dans Live.'));
  root.append(
    recipe ? card(el('div.lesson', el('div.lesson-title', '🧩 Recette'), el('p', el('b', recipe.text)))) : null,
    card(slotsEl, el('h3', { style: { marginTop: '12px' } }, 'Palette'), borrowWrap, el('div', { style: { height: '8px' } }), palette, info, midiInfo,
      el('div.row.gap.wrap', { style: { marginTop: '8px' } },
        recipe ? null : famousSel,
        el('button.btn.small', { onclick: () => { update((s) => { s.project.chords = shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 4).map((deg) => ({ deg })); }); renderAll(); } }, '🎲 Aléatoire'),
        el('button.btn.small', { onclick: () => downloadMidi(`accords-${NOTE_NAMES[P().rootPc]}-${P().scale}`, projectToSong(P(), { chords: true, bass: true })) }, '⬇ MIDI accords + basse'),
        el('button.btn.small', {
          onclick: () => {
            const v = voiced();
            update((s) => { s.notebook.unshift({ id: Date.now(), type: 'chords', title: v.map((c) => c?.symbol || '–').join(' · '), note: v.map((c) => c?.roman || '–').join(' – '), date: Date.now(), genre: s.project.genre, rootPc: s.project.rootPc, scale: s.project.scale, chords: JSON.parse(JSON.stringify(s.project.chords)), ext: s.project.ext }); });
            toast('Progression sauvée 📓', 'good');
          },
        }, '📓 Sauver'),
      )),
    tools,
    hintBox(el('div',
      el('p', 'Une progression = un voyage : repos (T) → départ (S) → tension (D) → retour. Mais en électro, on reste souvent en suspens pour que la boucle tourne.'),
      el('p', '« Voice leading » garde les notes communes et bouge les autres au plus près : c’est le secret d’accords qui « coulent ». Dans Live 12, active Scale sur le clip et empile une note sur deux.')), () => { hintUsed = true; }),
    recipe ? card(
      el('p', 'Ton ressenti :'),
      segmented([{ value: 1, label: '😐 Bof' }, { value: 2, label: '🙂 Pas mal' }, { value: 3, label: '🔥 Frissons' }], rating, (v) => { rating = v; }),
      el('button.btn.primary.wide', {
        onclick: () => {
          const p = P();
          if (p.chords.some((c) => !c)) return toast('Remplis les 4 accords', 'bad');
          if (!recipe.check(p)) return toast('La recette n’est pas respectée 🧐', 'bad');
          stopAll();
          finishExercise({
            key: 'chords:recipe', title: 'Recette réussie', xp: 30 + rating * 5, skill: 'harmonie', genre: p.genre, hintUsed, success: true,
            lesson: recipe.lesson,
            transfer: 'Sur le MPC Key 37 : Pad Perform > Chords, enregistre cette progression et joue-la avec un autre rythme. Dans Live : exporte le MIDI et ouvre-le avec Serum 2.',
            onRetry: () => { location.hash = `#/chords?mode=recipe&genre=${shuffle(GENRES)[0].id}&r=${Date.now()}`; },
          });
        },
      }, '✓ Valider la recette')) : el('a.btn.wide', { href: '#/melody' }, '→ Écrire une mélodie par-dessus'),
  );
  renderAll();
  const offPh = onPlayhead((step) => { if (step < 0) renderSlots(); else if (step % 16 === 0) renderSlots(Math.floor(step / 16) % 4); });
  return () => { stopAll(); offMidi(); offPh(); voices.forEach((x) => x.release()); };
}
