// Calibrage de la latence : tape avec le clic (écran, barre Espace ou pad MIDI) ; le décalage mesuré est corrigé dans
// Piano Rush, Pad Rush et le test de la semaine, séparément pour chaque façon de jouer.
import { el, card, header, toast } from '../ui.js';
import { getState, update } from '../store.js';
import { ensureAudio, now, playClick, outputLatency } from '../core/audio.js';
import { onMidi } from '../midiin.js';
import { viewKeys } from '../shortcuts.js';
import { INPUTS, analyzeTaps } from '../core/latency.js';

const BPM = 90, COUNT_IN = 4, CLICKS = 16;

export function render(root) {
  let stopRun = null;
  const body = el('div');
  root.append(header('⏱️ Calibrer la latence', 'Chaque appareil a un petit retard (écran tactile, Bluetooth, MIDI). On le mesure une fois, les jeux le corrigent.', '#/profile'), body);

  const lat = () => getState().settings.latency || {};
  const fmt = (v) => (v == null ? 'non calibré' : `${v > 0 ? '+' : ''}${v} ms`);

  function home(msg) {
    const L = lat();
    body.replaceChildren(el('div',
      msg || null,
      card(el('h3', 'Tes réglages'),
        Object.entries(INPUTS).map(([k, x]) => el('div.row.between.review-row',
          el('div', el('b', `${x.emoji} ${x.name}`), el('div.small.muted', fmt(L[k]))),
          L[k] != null ? el('button.btn.small.ghost', { onclick: () => { update((s) => { const n = { ...(s.settings.latency || {}) }; delete n[k]; s.settings.latency = n; }); home(); } }, 'Remettre à 0') : null)),
        el('p.small.muted', `Sortie audio de cet appareil : ${Math.round(outputLatency() * 1000)} ms (déjà compensée automatiquement).`)),
      card(el('h3', 'Comment ça marche'),
        el('ol.clean.small',
          el('li', `4 clics de décompte, puis ${CLICKS} clics à ${BPM} BPM.`),
          el('li', 'Tape EN MÊME TEMPS que chaque clic, avec ce que tu utilises pour jouer : le gros bouton (doigt), la barre Espace, ou un pad / une touche MIDI.'),
          el('li', 'Mets le son assez fort, avec ton casque ou tes enceintes habituels (le Bluetooth ajoute du retard).')),
        el('button.btn.primary.big.wide', { onclick: run }, '▶ Lancer la mesure'))));
  }

  function run() {
    ensureAudio();
    const spb = 60 / BPM;
    const outLat = outputLatency();
    const t0 = now() + 0.5;
    const beats = Array.from({ length: CLICKS }, (_, k) => t0 + (COUNT_IN + k) * spb);
    for (let k = 0; k < COUNT_IN + CLICKS; k++) playClick(t0 + k * spb, k % 4 === 0);
    const taps = { touch: [], key: [], midi: [] };
    const status = el('p.muted', { style: { textAlign: 'center' } }, 'Écoute le décompte…');
    const pad = el('button.tap-pad', { type: 'button' }, 'TAPE ICI');
    const tap = (kind) => {
      taps[kind].push(now() - outLat);
      pad.classList.remove('hit'); void pad.offsetWidth; pad.classList.add('hit');
    };
    pad.addEventListener('pointerdown', (e) => { e.preventDefault(); tap('touch'); });
    viewKeys({ space: () => tap('key') });
    const offMidi = onMidi({ noteOn: () => tap('midi') });
    body.replaceChildren(card(el('h3', '🥁 Tape avec le clic'), status, pad,
      el('button.btn.small.ghost', { style: { marginTop: '10px' }, onclick: () => { stop(); home(); } }, 'Annuler')));
    const timer = setInterval(() => {
      const k = Math.floor((now() - t0) / spb);
      status.textContent = k < COUNT_IN ? `Décompte : ${Math.max(1, COUNT_IN - k)}…` : k < COUNT_IN + CLICKS ? `Tape ! ${k - COUNT_IN + 1}/${CLICKS}` : 'Analyse…';
      if (now() > beats.at(-1) + 0.7) { stop(); result(taps, beats); }
    }, 80);
    const stop = () => { clearInterval(timer); offMidi(); viewKeys({ space: null }); stopRun = null; };
    stopRun = stop;
  }

  function result(taps, beats) {
    const kind = Object.keys(taps).sort((a, b) => taps[b].length - taps[a].length)[0];
    const r = analyzeTaps(taps[kind], beats);
    const x = INPUTS[kind];
    if (!taps[kind].length) { home(card(el('p', '🤔 Aucune frappe reçue. Tape sur le gros bouton, la barre Espace ou un pad MIDI pendant les clics.'))); return; }
    if (!r.ok) { home(card(el('h3', `${x.emoji} Mesure impossible`), el('p', r.reason))); return; }
    const prev = lat()[kind];
    const txt = Math.abs(r.offset) < 10 ? 'Tu tapes pile sur le clic.' : `Tu tapes en moyenne ${Math.abs(r.offset)} ms ${r.offset > 0 ? 'après' : 'avant'} le clic.`;
    body.replaceChildren(card(
      el('h3', `${x.emoji} ${x.name}`),
      el('div.stat-grid',
        el('div', el('b', `${r.offset > 0 ? '+' : ''}${r.offset} ms`), el('span', 'décalage')),
        el('div', el('b', `±${r.spread} ms`), el('span', r.quality)),
        el('div', el('b', r.n), el('span', 'frappes utilisées'))),
      el('p', txt, ' ', Math.abs(r.offset) >= 10 ? 'Les jeux vont décaler leur jugement d’autant, pour que « dans le temps » corresponde à ce que tu entends.' : ''),
      prev != null ? el('p.small.muted', `Réglage précédent : ${fmt(prev)}.`) : null,
      r.spread > 35 ? el('p.small', '💡 Frappes un peu irrégulières : refais la mesure une ou deux fois pour confirmer.') : null,
      el('div.row.gap.wrap',
        el('button.btn.primary', { onclick: () => { update((s) => { s.settings.latency = { ...(s.settings.latency || {}), [kind]: r.offset }; }); toast(`Correction enregistrée pour ${x.name} ✅`, 'good'); home(); } }, '✅ Enregistrer'),
        el('button.btn', { onclick: run }, '↻ Refaire'),
        el('button.btn.ghost', { onclick: () => home() }, 'Annuler'))));
  }

  home();
  return () => stopRun?.();
}
