// Analyse de référence → « Extraire & recréer » : isoler la basse ou le lead, relever ses notes,
// comprendre son timbre, puis s'entraîner à le reproduire dans Serum 2 avec indices et preset de correction.
import { el, card, segmented, finishExercise, toast, downloadMidi } from '../ui.js';
import { update } from '../store.js';
import { extractLine, analyzeTimbre, timbreHints, serumRecipe } from '../core/extract.js';
import { playBuffer, playSynth, ensureAudio, transport } from '../core/audio.js';
import { midiToName, NOTE_NAMES } from '../core/theory.js';
import { similarity, normalizeParams, paramById, getPath, formatParam } from '../core/synthparams.js';
import { presetParams } from '../player.js';
import { PRESETS } from '../data/presets.js';
import { INIT, paramControl } from './synth.js';

const BANDS = { bass: { low: 30, high: 300, name: 'Ligne de basse', emoji: '🎸' }, lead: { low: 280, high: 5000, name: 'Lead / mélodie', emoji: '🎵' } };
const TRY_IDS = ['wave1', 'voices', 'cutoff', 'envAmt', 'fdecay', 'attack', 'decay', 'sustain', 'release', 'lfoTarget'];

/**
 * @param {{getBuffer:()=>AudioBuffer|null, getMono:()=>Float32Array|null, getBpm:()=>number|null, getKey:()=>object|null,
 *          getRegionStart:()=>number|null, pauseMain:()=>void}} host
 */
export function extractionCard(host) {
  const out = el('div');
  let stopFn = () => {};
  const stopAudio = () => { stopFn(); stopFn = () => {}; transport.stop(); };

  const run = async (kind) => {
    const buffer = host.getBuffer(), bpm = host.getBpm();
    if (!buffer || !bpm) return toast('Importe d’abord un morceau (le tempo doit être détecté)', 'bad');
    host.pauseMain();
    stopAudio();
    const sd = 60 / bpm / 4;
    let start = host.getRegionStart();
    start = Math.max(0, Math.min(start, buffer.duration - 64 * sd - 0.05));
    out.replaceChildren(el('p', `⏳ Extraction ${kind === 'bass' ? 'de la basse' : 'du lead'} sur 4 mesures…`));
    await new Promise((r) => setTimeout(r, 30));
    const key = host.getKey();
    const scale = key?.mode === 'major' ? 'major' : 'minor';
    const opts = { start, stepDur: sd, rootPc: key?.rootPc ?? null, scale };
    // Pour le lead : on relève d'abord la basse pour neutraliser ses harmoniques
    const avoid = kind === 'lead' ? extractLine(host.getMono(), buffer.sampleRate, { ...opts, kind: 'bass' }).notes : null;
    const line = extractLine(host.getMono(), buffer.sampleRate, { ...opts, kind, avoid });
    if (line.notes.length < 2) {
      out.replaceChildren(el('div.lesson', el('div.lesson-title', 'Rien de net dans cette bande'),
        el('p', 'Place la lecture (ou une boucle de 4 mesures) sur un passage où cet élément est bien audible et seul, puis réessaie.')));
      return;
    }
    const R = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
    const tim = analyzeTimbre(buffer.getChannelData(0), R, buffer.sampleRate, { notes: line.notes, start, stepDur: sd, kind, avoid });
    renderElement({ kind, line, tim, start, sd, bpm, key, scale, buffer });
  };

  // ---------- Rendu d'un élément extrait ----------
  function renderElement({ kind, line, tim, start, sd, bpm, key, scale, buffer }) {
    const B = BANDS[kind];
    const correction = tim.params;
    const feats = tim.features;
    const hints = timbreHints(feats, correction, kind);
    let hintsShown = 0, rating = 2, revealed = false, tryScore = null;
    const mine = normalizeParams(INIT);
    if (kind === 'bass') { mine.osc[0].wave = 'sawtooth'; mine.filter.cutoff = 1200; mine.width = 0; mine.reverb = 0; }

    const lanes = el('div', [0, 1, 2, 3].map((bar) => el('div.cr-lane', el('span.cr-lane-title', `M${bar + 1}`),
      Array.from({ length: 16 }, (_, s) => {
        const g = bar * 16 + s;
        const n = line.notes.find((x) => g >= x.s && g < x.s + x.len);
        const head = n && n.s === g;
        return el('span.cr-cell' + (s % 4 === 0 ? '.beat' : '') + (n ? '.on' : ''), { style: n && !head ? { opacity: 0.5 } : null }, head ? midiToName(n.n).replace(/-?\d+$/, '') : '');
      }))));

    const playOriginal = () => {
      stopAudio(); ensureAudio();
      const p = playBuffer(buffer, start, { loopStart: start, loopEnd: start + 64 * sd, low: B.low, high: B.high });
      stopFn = () => p.stop();
    };
    const playNotes = (params, label) => {
      stopAudio(); ensureAudio();
      let last = null;
      transport.start((step, time) => {
        const s = step % 64;
        line.notes.filter((n) => n.s === s).forEach((n) => {
          playSynth(params, n.n, time, n.len * sd * 0.95, 0.85, { fromMidi: last, send: kind === 'bass' ? 0 : undefined });
          last = n.n;
        });
      }, null, { bpm, swing: 0 });
      toast(`▶ ${label}`, 'info', 1500);
    };

    const hintBox = el('div');
    const nextHintBtn = el('button.btn.small', {
      onclick: () => {
        if (hintsShown >= hints.length) return;
        const h = hints[hintsShown++];
        hintBox.append(el('div.lesson', el('div.lesson-title', `💡 Indice ${hintsShown} — ${h.title}`), el('p', h.text)));
        nextHintBtn.textContent = hintsShown < hints.length ? `💡 Indice suivant (${hintsShown}/${hints.length})` : 'Tous les indices sont affichés';
      },
    }, `💡 Indice (0/${hints.length})`);

    // Essai dans le synthé de l'app
    const scoreEl = el('b', '');
    const tryBox = el('details', el('summary', el('b', '🎚️ S’entraîner aussi dans le synthé de l’app (score automatique)')),
      el('p.small.muted', 'Serum 2 ne peut pas être noté par l’app : ici, ajuste ces réglages pour approcher l’original, l’app compare avec le preset de correction.'),
      TRY_IDS.map((id) => paramControl(paramById(id), () => mine, () => {})),
      el('div.row.gap.wrap',
        el('button.btn.small', { onclick: () => playNotes(mine, 'Ma version (app)') }, '▶ Ma version'),
        el('button.btn.small', { onclick: playOriginal }, '▶ Original isolé'),
        el('button.btn.small', {
          onclick: () => { tryScore = similarity(mine, correction, TRY_IDS).score; scoreEl.textContent = `${tryScore}% de ressemblance`; },
        }, '🔍 Comparer'),
        scoreEl));

    const reveal = el('div');
    const revealBtn = el('button.btn', {
      onclick: () => {
        revealed = true;
        revealBtn.remove();
        const nearest = Object.entries(PRESETS).filter(([, p]) => (kind === 'bass' ? p.role === 'bass' : p.role !== 'bass'))
          .map(([id, p]) => ({ id, s: similarity(normalizeParams(p.params), correction, ['wave1', 'voices', 'cutoff', 'envAmt', 'attack', 'decay', 'sustain']).score }))
          .sort((a, b) => b.s - a.s)[0];
        reveal.replaceChildren(el('div.lesson.transfer', el('div.lesson-title', '🔓 Preset de correction (Serum 2)'),
          el('ol.mission-steps', serumRecipe(correction, kind).map((t) => el('li', t))),
          el('p.small.muted', `Joué sur les notes relevées${key ? ` en ${NOTE_NAMES[key.rootPc]} ${scale === 'major' ? 'majeur' : 'mineur'}` : ''}. Le plus proche dans la banque de l’app : « ${PRESETS[nearest.id].name} ».`),
          el('p.small', TRY_IDS.map((id) => { const d = paramById(id); return `${d.label} : ${formatParam(d, getPath(correction, d.path))}`; }).join(' · ')),
          el('div.row.gap.wrap',
            el('button.btn.small.primary', { onclick: () => playNotes(correction, 'Preset de correction') }, '▶ Correction'),
            el('button.btn.small', { onclick: playOriginal }, '▶ Original isolé'),
            el('button.btn.small', {
              onclick: () => {
                const id = Date.now();
                update((s) => { s.notebook.unshift({ id, type: 'sound', title: `${B.name} recréée (${midiToName(feats.note)})`, note: `Notes : ${line.notes.map((n) => midiToName(n.n)).join(' ')}\n${serumRecipe(correction, kind).join('\n')}`, date: id, params: JSON.parse(JSON.stringify(correction)) }); });
                location.hash = `#/synth?load=${id}`;
              },
            }, '🎛️ Ouvrir dans le Lab Synthé'))));
      },
    }, '🔓 Révéler le preset de correction');

    out.replaceChildren(card(
      el('div.row.between', el('h3', `${B.emoji} ${B.name} extraite`), el('span.small.muted', `fiabilité ~${Math.round(line.conf * 100)} %`)),
      el('p.small.muted', `${line.notes.length} notes relevées sur 4 mesures${key ? `, calées sur la gamme de ${NOTE_NAMES[key.rootPc]} ${scale === 'major' ? 'majeur' : 'mineur'}` : ''}. Extraction approximative : vérifie à l’oreille (A/B).`),
      lanes,
      el('div.row.gap.wrap', { style: { marginTop: '8px' } },
        el('button.btn.small', { onclick: playOriginal }, '▶ Original isolé'),
        el('button.btn.small', { onclick: () => playNotes(presetParams(kind === 'bass' ? 'sub' : 'piano'), 'Notes relevées (son neutre)') }, '▶ Notes relevées'),
        el('button.btn.small', { onclick: stopAudio }, '■ Stop'),
        el('button.btn.small', { onclick: () => downloadMidi(`${kind}-extrait-${Math.round(bpm)}bpm`, { bpm, tracks: [{ name: B.name, notes: line.notes.map((n) => ({ pitch: n.n, start: n.s / 4, dur: n.len / 4, vel: 100 })) }] }) }, '⬇ MIDI de la ligne')),
      el('hr'),
      el('h3', '🎛️ Exercice : reproduis ce son dans Serum 2'),
      el('ol.mission-steps',
        el('li', 'Écoute l’original isolé en boucle (au casque) : attaque, brillance, largeur, mouvement.'),
        el('li', 'Dans Live : glisse le MIDI de la ligne sur une piste Serum 2, Init Preset.'),
        el('li', 'Reproduis le son en partant de l’oscillateur, puis le filtre, l’enveloppe, les effets.'),
        el('li', 'Compare en A/B avec l’original (même hauteur, même gamme) : ajuste un réglage à la fois.')),
      el('div.row.gap.wrap', nextHintBtn), hintBox,
      tryBox,
      el('p', { style: { marginTop: '10px' } }, 'Ton résultat dans Serum 2 :'),
      segmented([{ value: 1, label: '😐 Loin' }, { value: 2, label: '🙂 Proche' }, { value: 3, label: '🎯 Bluffant' }], rating, (v) => { rating = v; }),
      el('div.row.gap.wrap', { style: { marginTop: '10px' } }, revealBtn,
        el('button.btn.primary', {
          onclick: () => {
            stopAudio();
            const xp = Math.max(15, 30 + rating * 8 + (tryScore != null ? tryScore * 0.2 : 0) - hintsShown * 5 - (revealed ? 10 : 0));
            finishExercise({
              key: 'recreate', title: `${B.name} recréée`, score: tryScore ?? undefined, xp, skill: 'sound', hintUsed: hintsShown > 0 || revealed, success: rating >= 2,
              lesson: 'Recréer un son entendu suit toujours le même ordre : la source (forme d’onde, unison), la couleur (filtre), la forme (enveloppes), puis le mouvement et l’espace (LFO, effets). Une seule variable à la fois.',
              transfer: 'Sauve ton preset Serum 2 en le nommant d’après le morceau de référence. Reprends ce son dans ta prochaine idée en changeant UN réglage pour te l’approprier.',
            });
          },
        }, '✓ Terminer l’exercice')),
      reveal,
    ));
  }

  const node = card(
    el('h3', '6. Extraire un élément & le recréer'),
    el('p.small.muted', 'Place une boucle de 4 mesures (ou la lecture) sur un passage où l’élément est bien audible. L’app isole la bande de fréquences, relève les notes, mesure le timbre (harmoniques, brillance, enveloppe, largeur, vibrato) et en déduit un preset de correction.'),
    el('div.row.gap.wrap',
      el('button.btn.small.primary', { onclick: () => run('bass') }, '🎸 Extraire la basse'),
      el('button.btn.small.primary', { onclick: () => run('lead') }, '🎵 Extraire le lead')),
    el('p.small.muted', 'Limite : sans séparation par IA, un élément qui partage sa zone de fréquences avec d’autres (accords, voix) sera moins bien isolé. Choisis un passage où il ressort.'),
    out,
  );
  return { node, stop: stopAudio };
}
