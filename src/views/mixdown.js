// Mixdown express : une boucle volontairement mal mixée, à corriger à l'oreille avec des gestes de mixage simples.
import { el, card, header, finishExercise, slider, segmented, playButton, showsHints } from '../ui.js';
import { getState, level, projectFromGenre } from '../store.js';
import { CHANNELS, makeScenario, scoreMix } from '../core/mixdown.js';
import { voiceProgression, eventsAt } from '../core/arrange.js';
import { transport, createChannel, playDrum, playSynth, setPump, ensureAudio } from '../core/audio.js';
import { presetParams } from '../player.js';
import { GENRES, genreById } from '../data/genres.js';

/** Boucle d'exercice : l'idée en cours si elle a une mélodie, sinon le style choisi avec une mélodie simple. */
function loopProject(params) {
  const cur = getState().project;
  let p = params.genre ? projectFromGenre(params.genre) : JSON.parse(JSON.stringify(cur));
  if (!p.melody.some(Boolean)) {
    const v = voiceProgression(p);
    v.forEach((c, bar) => {
      if (!c) return;
      const top = [...c.notes].sort((a, b) => b - a);
      [[0, 0, 3], [3, 1, 3], [6, 0, 2], [10, 2, 4]].forEach(([s, i, len]) => { p.melody[bar * 16 + s] = { n: top[i % top.length] + 12, len }; });
    });
  }
  return p;
}

export function render(root, params) {
  const p = loopProject(params);
  const g = genreById(p.genre);
  const sc = makeScenario(p.genre, level());
  const mine = JSON.parse(JSON.stringify(sc.broken));
  let listenRef = false, solo = null, hintsUsed = 0, checked = false;
  const chans = {};

  root.append(header('🎚️ Mixdown express', `Une boucle ${g.emoji} ${g.name} mal mixée : ${sc.problems.length} problèmes à trouver et corriger à l’oreille`));

  const apply = () => {
    if (!chans.kick) return;
    const m = listenRef ? sc.ref : mine;
    CHANNELS.forEach((c) => {
      const st = m.ch[c.id];
      chans[c.id].set({ ...st, vol: solo && solo !== c.id ? -80 : st.vol });
    });
  };

  const start = () => {
    ensureAudio();
    CHANNELS.forEach((c) => { if (!chans[c.id]) chans[c.id] = createChannel(c.id === 'kick' || c.id === 'drums' ? 'drum' : 'synth'); });
    apply();
    const voiced = voiceProgression(p), sd = 60 / p.bpm / 4;
    let last = null;
    transport.start((step, time) => {
      setPump((listenRef ? sc.ref : mine).pump);
      const ev = eventsAt(p, voiced, step % 64);
      ev.drums.forEach((d) => playDrum(d.id, time, d.vel, p.kit, (d.id === 'kick' ? chans.kick : chans.drums).input));
      ev.chords.forEach((c) => c.notes.forEach((n) => playSynth(presetParams(p.sounds.chords), n, time, c.len * sd * 0.95, 0.6, { out: chans.chords.input, send: 0 })));
      ev.bass.forEach((b) => { playSynth(presetParams(p.sounds.bass), b.note, time, b.len * sd * 0.92, 0.8, { out: chans.bass.input, send: 0, fromMidi: last }); last = b.note; });
      ev.melody.forEach((m) => playSynth(presetParams(p.sounds.lead), m.note, time, m.len * sd * 0.9, 0.8, { out: chans.lead.input, send: 0 }));
    }, null, { bpm: p.bpm, swing: p.swing });
  };

  // ---------- Console ----------
  const abSeg = segmented([{ value: false, label: '🎧 Ton mix' }, { value: true, label: 'Référence' }], false, (v) => { listenRef = v; apply(); });
  abSeg.setAttribute('aria-label', 'Écouter ton mix ou la référence');
  const soloBtns = [];
  const strips = CHANNELS.map((c) => {
    const st = mine.ch[c.id];
    const soloBtn = el('button.btn.small', {
      'aria-pressed': 'false', title: `Écouter ${c.name} seul`,
      onclick: () => { solo = solo === c.id ? null : c.id; soloBtns.forEach((b) => { const on = b.dataset.id === solo; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }); apply(); },
    }, '🎧 Solo');
    soloBtn.dataset.id = c.id;
    soloBtns.push(soloBtn);
    return el('div.strip',
      el('div.row.between', el('b', `${c.emoji} ${c.name}`), soloBtn),
      slider({ label: 'Volume', min: -24, max: 12, step: 0.5, value: st.vol, format: (v) => `${v > 0 ? '+' : ''}${String(v).replace('.', ',')}\u00a0dB`, onInput: (v) => { st.vol = v; apply(); } }),
      slider({ label: 'Passe-haut', min: 0, max: 1, step: 0.01, value: Math.log(st.hpf / 20) / Math.log(50), format: (x) => `${Math.round(20 * Math.pow(50, x))}\u00a0Hz`, onInput: (x) => { st.hpf = Math.round(20 * Math.pow(50, x)); apply(); } }),
      slider({ label: 'Pan', min: -1, max: 1, step: 0.05, value: st.pan, format: (v) => (Math.abs(v) < 0.03 ? 'Centre' : v < 0 ? `G ${Math.round(-v * 100)}` : `D ${Math.round(v * 100)}`), onInput: (v) => { st.pan = v; apply(); } }),
      slider({ label: 'Reverb', min: 0, max: 1, step: 0.01, value: st.verb, format: (v) => `${Math.round(v * 100)}\u00a0%`, onInput: (v) => { st.verb = v; apply(); } }),
    );
  });
  const pumpSl = slider({ label: 'Sidechain', min: 0, max: 1, step: 0.01, value: mine.pump, format: (v) => `${Math.round(v * 100)}\u00a0%`, onInput: (v) => { mine.pump = v; } });

  // Indices progressifs, au même format que les autres labs (coût affiché ; offerts aux débutants)
  const free = showsHints(), n = sc.problems.length;
  const hintWrap = el('div.hint');
  const hintBody = el('div.hint-body');
  const hintBtn = el('button.btn.ghost.small', {
    onclick: () => {
      if (hintsUsed >= n) return;
      const pr = sc.problems[hintsUsed++];
      if (hintsUsed === 1) { hintWrap.classList.add('open'); hintWrap.prepend(el('div.hint-title', '💡 Indices'), hintBody); }
      hintBody.append(el('p', el('b', `${hintsUsed}. `), pr.hint));
      if (hintsUsed >= n) hintBtn.remove();
      else hintBtn.textContent = `💡 Indice suivant (${hintsUsed}/${n})`;
    },
  }, free ? '💡 Voir un indice' : '💡 Voir un indice (−20 % XP)');
  hintWrap.append(hintBtn);

  const resultEl = el('div');
  const play = playButton(() => start(), () => transport.stop());
  root.append(
    card(
      el('div.lesson', el('div.lesson-title', '🎯 Mission'), el('p', `Ce mix a ${n} défauts. Écoute, compare avec la référence, isole les pistes (🎧 Solo) et corrige avec les réglages. Mixe d’abord le kick, puis le reste par rapport à lui.`)),
      el('div.ctrl-row.mix-transport', play, abSeg),
      hintWrap,
      el('div.mixer', strips, el('div.strip', el('b', '🔀 Bus'), pumpSl, el('p.small.muted', 'Pompe des synthés sur le kick (sidechain).'))),
      el('div.action-bar',
        el('span.small.muted', 'Réglé à l’oreille ? Compare avec la mesure.'),
        el('button.btn.small.primary', {
          onclick: () => {
            const r = scoreMix(mine, sc.ref, sc.problems);
            checked = true;
            resultEl.replaceChildren(card(el('h3', `Résultat : ${r.score} %`),
              sc.problems.map((pr) => {
                const ok = r.perProblem.find((x) => x.id === pr.id).ok;
                return el('div.lesson' + (ok ? '' : '.transfer'), el('div.lesson-title', `${ok ? '✅' : '❌'} ${pr.title}`), el('p', pr.rule), el('p.small', el('b', 'Dans Ableton : '), pr.ableton));
              }),
              el('div.action-bar',
                el('button.btn.small', { onclick: () => { location.hash = `#/mixdown?genre=${GENRES[Math.floor(Math.random() * GENRES.length)].id}&r=${Date.now()}`; } }, '↻ Autre mix'),
                el('button.btn.small.primary', {
                  onclick: () => {
                    transport.stop(); play.reset();
                    finishExercise({ key: 'mix:express', title: 'Mixdown express', score: r.score, xp: Math.max(10, 15 + r.score * 0.4), skill: 'sound', genre: p.genre, hintUsed: hintsUsed > 0 && !free, success: r.score >= 70,
                      lesson: 'Mixer, c’est faire de la place : un seul élément par zone de fréquences, une hiérarchie claire (kick, basse, lead devant), et l’espace (réverbe, panoramique) au service de la lisibilité.',
                      transfer: 'Sur ta prochaine boucle dans Live : groupe kick+basse, coupe le grave de tout le reste (EQ Eight), et compare à un morceau de référence au même volume.' });
                  },
                }, '✓ Valider'))));
            resultEl.scrollIntoView({ behavior: 'smooth' });
          },
        }, '🔍 Vérifier mon mix')),
    ),
    resultEl,
  );
  return () => {
    transport.stop();
    setPump(0);
    Object.values(chans).forEach((c) => c.destroy());
    if (!checked) { /* rien à sauver */ }
  };
}
