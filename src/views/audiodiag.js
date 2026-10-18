// Carte « Moteur audio » du Profil : choix du mode + diagnostic en direct.
import { el, card, segmented, toast } from '../ui.js';
import { getState, update } from '../store.js';
import { audioInfo, resetAudioStats, ensureAudio } from '../core/audio.js';
import { AUDIO_MODES, applyAudioMode, wantsStable } from '../audiomode.js';

export function audioCard() {
  const desc = el('p.small.muted');
  const diag = el('div.diag');
  const cur = getState().settings.audioMode || 'auto';
  const setDesc = (v) => { desc.textContent = AUDIO_MODES.find((m) => m.value === v).desc + (v === 'auto' ? ` Ici : ${wantsStable(v) ? 'Stable' : 'Performance'}.` : ''); };
  setDesc(cur);

  const row = (k, v, warn = false) => el('div.diag-row' + (warn ? '.warn' : ''), el('span', k), el('b', v));
  function paint() {
    const a = audioInfo();
    diag.replaceChildren(
      row('Mode actif', a.mode === 'stable' ? '🛡️ Stable' : '⚡ Performance'),
      row('Moteur', a.state === 'off' ? 'pas encore démarré' : `${a.state} · ${a.sampleRate} Hz`),
      row('Latence (réserve + sortie)', `${a.baseLatency} + ${a.outputLatency} ms`),
      row('Notes de synthé actives', `${a.voices} / ${a.maxVoices}`, a.voices >= a.maxVoices),
      row('Notes jouées en retard', String(a.late), a.late > 5),
      row('Voix coupées (polyphonie)', String(a.stolen)),
      row('Sons nettoyés · en attente', `${a.cleaned} · ${a.pending}`, a.pending > 400),
      row('Plus long trou du minuteur', `${a.maxTickGap} ms`, a.maxTickGap > 150),
    );
  }
  const timer = setInterval(paint, 500);
  paint();

  const report = () => {
    const a = audioInfo();
    return [`BeatForge — diagnostic audio (${new Date().toLocaleString('fr-FR')})`, navigator.userAgent,
      ...Object.entries(a).map(([k, v]) => `${k}: ${v}`)].join('\n');
  };
  const node = card(el('h3', '🔊 Moteur audio'),
    segmented(AUDIO_MODES.map(({ value, label }) => ({ value, label })), cur, (v) => {
      update((s) => { s.settings.audioMode = v; });
      applyAudioMode();
      setDesc(v);
      toast('Mode audio appliqué au prochain son', 'good');
    }),
    desc,
    el('details', el('summary', '🔧 Diagnostic en direct'),
      el('p.small.muted', 'Si le son grésille, lance une boucle quelques minutes puis copie ce rapport : les lignes en orange indiquent ce qui sature.'),
      diag,
      el('div.row.gap.wrap', { style: { marginTop: '8px' } },
        el('button.btn.small', {
          onclick: async () => {
            try { await navigator.clipboard.writeText(report()); toast('Rapport copié 📋', 'good'); } catch (e) { toast('Copie impossible : fais une capture d’écran', 'bad'); }
          },
        }, '📋 Copier le rapport'),
        el('button.btn.small.ghost', { onclick: () => { ensureAudio(); resetAudioStats(); paint(); } }, '↺ Remettre à zéro'))),
  );
  return { node, destroy: () => clearInterval(timer) };
}
