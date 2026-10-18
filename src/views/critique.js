// Critique de ma prod : j'importe mon export Ableton (et une référence), l'app compare et donne 3 conseils concrets.
import { el, header, card, segmented, toast } from '../ui.js';
import { recordExercise } from '../store.js';
import { decodeFile } from '../core/audio.js';
import { analyzeTrack, compareTracks, TARGETS, BANDS } from '../core/critique.js';

export function render(root) {
  const st = { mine: null, ref: null, mineName: '', refName: '', target: 'club' };
  root.append(header('🩺 Critique de ma prod', 'Importe ton export (WAV/MP3) et, si tu veux, un morceau de référence : l’app compare niveau, équilibre, stéréo et arrangement, puis te donne 3 actions dans Live.', '#/labs'));
  const out = el('div');

  const picker = (label, key) => {
    const name = el('span.small.muted', 'Aucun fichier');
    const input = el('input', {
      type: 'file', accept: 'audio/*,.wav,.mp3,.m4a,.aac,.flac,.ogg', style: { display: 'none' },
      onchange: async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        name.textContent = '⏳ Analyse…';
        try {
          const buf = await decodeFile(f);
          st[key] = analyzeTrack(buf.getChannelData(0), buf.numberOfChannels > 1 ? buf.getChannelData(1) : buf.getChannelData(0), buf.sampleRate);
          st[key + 'Name'] = f.name;
          name.textContent = `✓ ${f.name} (${Math.round(buf.duration)} s)`;
          paint();
        } catch (x) { name.textContent = 'Fichier illisible'; toast('Impossible de lire ce fichier audio', 'bad'); }
      },
    });
    return el('div.crit-pick', el('button.btn', { onclick: () => input.click() }, label), name, input);
  };

  root.append(
    card(
      el('h3', '1. Ton morceau'), picker('🎵 Importer mon export', 'mine'),
      el('h3', { style: { marginTop: '14px' } }, '2. Référence (facultatif)'),
      el('p.small.muted', 'Un titre du même style que tu aimes : c’est la meilleure comparaison. Sinon, l’app utilise des valeurs typiques du style choisi.'),
      picker('🎧 Importer une référence', 'ref'),
      el('div.ctrl-row', el('label', 'Sans référence'), segmented(Object.entries(TARGETS).map(([id, t]) => ({ value: id, label: t.name.split(' (')[0] })), st.target, (v) => { st.target = v; paint(); })),
      el('p.small.muted', 'Tout est analysé sur ton appareil : rien n’est envoyé sur internet. Exporte ton morceau en WAV depuis Live (Fichier › Exporter audio).'),
    ),
    out,
  );

  let recorded = false;
  function paint() {
    if (!st.mine) { out.replaceChildren(); return; }
    const ref = st.ref || TARGETS[st.target];
    const refLabel = st.ref ? `ta référence (${st.refName})` : `valeurs typiques « ${TARGETS[st.target].name} » (approximatives)`;
    const tips = compareTracks(st.mine, ref);
    if (!recorded) { recorded = true; recordExercise({ key: 'critique', title: 'Critique de prod', xp: 25, skill: 'sound', success: true }); }
    const row = (label, a, b, unit = '') => el('div.crit-row', el('span', label), el('b', `${a}${unit}`), el('span.muted', `${b}${unit}`));
    out.replaceChildren(
      el('div.card.glow',
        el('h3', tips.length ? '🎯 Les 3 actions prioritaires' : '✅ Rien de majeur à corriger'),
        el('p.small.muted', `Comparé à ${refLabel}.`),
        tips.length ? el('ol.crit-tips', tips.slice(0, 3).map((t) => el('li', el('b', t.title), el('p', t.detail), el('p.crit-how', '🎛️ ', t.how)))) : el('p', 'Ton morceau est proche de la référence sur tous les critères mesurés. Fais confiance à tes oreilles pour la suite !'),
        tips.length > 3 ? el('details', el('summary', `Voir les ${tips.length - 3} autres remarques`), el('ul.rush-points', tips.slice(3).map((t) => el('li', el('b', t.title), ' — ', t.how)))) : null),
      card(el('h3', '📊 Mesures'),
        el('div.crit-table',
          el('div.crit-row.head', el('span', ''), el('b', 'Toi'), el('span', st.ref ? 'Référence' : 'Typique')),
          row('Niveau (≈ LUFS)', st.mine.loudness, ref.loudness, ' dB'),
          row('Dynamique (crête / moyenne)', st.mine.crest, ref.crest, ' dB'),
          row('Largeur stéréo (côtés / centre)', st.mine.width, ref.width, ' dB'),
          row('Contraste de l’arrangement', st.mine.contrast, ref.contrast, ' dB'),
          row('Attaques par seconde', st.mine.density, ref.density),
          ...BANDS.map((b) => row(b.name, st.mine.bands[b.id], ref.bands[b.id], ' dB'))),
        el('p.small.muted', 'Bandes de fréquence : part de l’énergie totale (plus c’est proche de 0, plus la bande domine). Les écarts de moins de 3 dB sont normaux.')),
    );
  }
}
