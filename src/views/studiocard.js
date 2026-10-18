// Carte « Studio » du Profil : sortie MIDI vers Live / Serum / MPC et synchronisation sur le tempo de Live.
import { el, card, toast, segmented } from '../ui.js';
import { getState, update } from '../store.js';
import { midiSupported } from '../midiin.js';
import { applyMidiOut, listOutputs, panic } from '../midiout.js';
import { onClockBpm, clockBpm } from '../midisync.js';

export function studioCard() {
  const body = el('div');
  const node = card(el('h3', '🎛️ Studio : jouer avec tes vrais sons'), body);
  const clockEl = el('b', '');
  const offClock = onClockBpm((b) => { clockEl.textContent = `${b.toFixed(1)} BPM`; });

  async function paint() {
    const cfg = getState().settings.midiOut || {};
    const sync = getState().settings.midiSync || {};
    if (!midiSupported()) {
      body.replaceChildren(el('p.small.muted', 'Le MIDI n’est pas disponible dans ce navigateur : utilise Chrome ou Edge sur ordinateur.'));
      return;
    }
    const res = cfg.enabled ? await applyMidiOut() : { ok: false };
    const outs = listOutputs();
    const set = (patch) => { update((s) => { s.settings.midiOut = { ...(s.settings.midiOut || {}), ...patch }; }); paint(); };
    body.replaceChildren(
      el('p.small.muted', 'Les exercices, les jeux et ton idée jouent aussi leurs notes en MIDI : dans Live, une piste par canal — 1 mélodie, 2 accords, 3 basse, 10 batterie (notes Drum Rack).'),
      el('div.ctrl-row', el('label', 'Sortie MIDI'),
        el('button.btn.small' + (cfg.enabled ? '.primary' : ''), { onclick: () => set({ enabled: !cfg.enabled }) }, cfg.enabled ? '✓ Activée' : 'Activer'),
        cfg.enabled && outs.length ? el('select', { onchange: (e) => set({ id: e.target.value }) }, outs.map((o) => el('option', { value: o.id, selected: o.id === (cfg.id || '') }, o.name))) : null),
      cfg.enabled ? el('p.small', res.ok ? `✅ Envoi vers « ${res.name} »` : '⚠️ Aucune sortie MIDI trouvée : crée un port virtuel (voir ci-dessous) ou branche ton MPC.') : null,
      cfg.enabled ? el('div.ctrl-row', el('label', 'Son de l’app'), segmented([{ value: false, label: 'Garder' }, { value: true, label: 'Couper (seulement Live)' }], !!cfg.mute, (v) => set({ mute: v }))) : null,
      cfg.enabled ? el('button.btn.small.ghost', { onclick: () => { panic(); toast('Toutes les notes coupées', 'good'); } }, '🛑 Couper les notes bloquées') : null,
      el('h3', { style: { marginTop: '12px' } }, '⏱️ Suivre le tempo de Live'),
      el('div.ctrl-row', el('label', 'Synchro'),
        segmented([{ value: false, label: 'Non' }, { value: true, label: 'Suivre l’horloge MIDI' }], !!sync.follow, (v) => { update((s) => { s.settings.midiSync = { ...(s.settings.midiSync || {}), follow: v }; }); paint(); })),
      sync.follow ? el('p.small', 'Horloge reçue : ', clockEl.textContent ? clockEl : el('span.muted', 'en attente…'), ' — Play / Stop dans Live lancent et arrêtent ton idée.') : null,
      el('details', el('summary', 'Réglage dans Ableton Live 12 (une seule fois)'),
        el('ol.small',
          el('li', 'Windows : installe loopMIDI (gratuit) et crée un port « BeatForge ». macOS : Configuration audio et MIDI › Gestionnaire IAC › « Le gestionnaire est en ligne ».'),
          el('li', 'Live › Réglages › Lien, Tempo & MIDI : sur ce port, active « Piste » en entrée (pour recevoir les notes) et « Synchro » en sortie (pour envoyer le tempo).'),
          el('li', 'Crée une piste MIDI par canal (Entrée : BeatForge, canal 1, 2, 3 ou 10), mets-y Serum 2 ou un Drum Rack, Moniteur sur « In ».'),
          el('li', 'Ici : active la sortie MIDI, choisis le port, puis « Couper » le son de l’app pour n’entendre que Live.'),
          el('li', 'Avec le MPC Key 37 : choisis-le comme sortie pour jouer ses propres sons.'))),
    );
  }
  paint();
  node.destroy = offClock;
  return node;
}
