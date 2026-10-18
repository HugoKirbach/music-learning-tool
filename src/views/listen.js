// Écoute d'une idée partagée par lien : lecture, ajout au carnet, ou reprise comme idée en cours.
import { el, header, card, toast } from '../ui.js';
import { update, projectFromGenre } from '../store.js';
import { transport, ensureAudio } from '../core/audio.js';
import { playProject } from '../player.js';
import { decodeProject } from '../core/sharecode.js';
import { voiceProgression } from '../core/arrange.js';
import { NOTE_NAMES, SCALES } from '../core/theory.js';
import { genreById } from '../data/genres.js';

export function render(root, params = {}) {
  root.append(header('🔗 Idée partagée', 'Quelqu’un t’a envoyé une idée BeatForge : écoute-la, garde-la ou développe-la.', '#/home'));
  const body = el('div', card(el('p.muted', '⏳ Ouverture de l’idée…')));
  root.append(body);
  (async () => {
    let p;
    try {
      const base = projectFromGenre('house');
      p = await decodeProject(params.i, base);
      if (p.genre !== 'house') p = await decodeProject(params.i, projectFromGenre(p.genre));
    } catch (e) {
      body.replaceChildren(card(el('p.bad', 'Ce lien est incomplet ou abîmé : demande à ton ami de le renvoyer.')));
      return;
    }
    const g = genreById(p.genre);
    const chords = voiceProgression(p).map((c) => c?.symbol || '–').join(' · ');
    const notes = p.melody.filter(Boolean).length;
    const play = el('button.btn.play.primary', {
      onclick: () => {
        ensureAudio();
        if (transport.playing && transport.owner === 'listen') { transport.stop(); return; }
        playProject(() => p, { owner: 'listen' });
      },
    }, '▶ Écouter');
    const offT = transport.subscribe((on, owner) => { play.textContent = on && owner === 'listen' ? '■ Stop' : '▶ Écouter'; });
    body.replaceChildren(
      el('div.card.glow',
        el('h2', `${g.emoji} Idée ${g.name}`),
        el('p', `${p.bpm} BPM · ${NOTE_NAMES[p.rootPc]} ${SCALES[p.scale].name.split(' ')[0]} · ${chords}`),
        el('p.small.muted', `Batterie, accords, basse${notes ? ` et une mélodie de ${notes} notes` : ''}.`),
        el('div.row.gap.wrap', play,
          el('button.btn', {
            onclick: () => {
              update((s) => { s.notebook.unshift({ id: Date.now(), type: 'idea', title: `🔗 Idée partagée (${g.name})`, date: Date.now(), genre: p.genre, project: p }); });
              toast('Ajoutée à ton Carnet 📓', 'good');
            },
          }, '📓 Ajouter au Carnet'),
          el('button.btn', {
            onclick: () => {
              if (!confirm('Remplacer ton idée en cours par celle-ci ? (la tienne est d’abord rangée dans le Carnet)')) return;
              update((s) => {
                s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Idée ${genreById(s.project.genre).name} (avant import)`, date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)) });
                s.project = p;
              });
              location.hash = '#/melody';
            },
          }, '✍️ La développer'))),
    );
    root.cleanupListen = offT;
  })();
  return () => { root.cleanupListen?.(); if (transport.owner === 'listen') transport.stop(); };
}
