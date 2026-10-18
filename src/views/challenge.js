// Défi de la semaine : une contrainte commune, ma version, et celles des autres à écouter.
import { el, header, card, toast } from '../ui.js';
import { getState, update, projectFromGenre, recordExercise } from '../store.js';
import { transport, ensureAudio } from '../core/audio.js';
import { playProject } from '../player.js';
import { cloudStatus } from '../cloud.js';
import { publishEntry, listEntries, removeEntry } from '../social.js';
import { challengeOfWeek, checkRules } from '../core/challenge.js';
import { sanitizeProject } from '../core/sharecode.js';
import { weekId } from '../core/pedagogy.js';
import { genreById } from '../data/genres.js';

export function render(root) {
  const week = weekId();
  const ch = challengeOfWeek(week);
  const g = genreById(ch.genre);
  const rulesBox = el('div');
  const othersBox = el('div');
  let offT = null;

  root.append(
    header('🏆 Défi de la semaine', 'La même contrainte pour tout le monde, du lundi au dimanche. Publie ta version et écoute celles des autres.', '#/home'),
    el('div.card.glow',
      el('div.small.muted', `Semaine du ${new Date(`${week}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`),
      el('h2', `${ch.emoji} ${ch.title}`),
      el('p', ch.desc),
      el('p.small.muted', `Style conseillé : ${g.emoji} ${g.name}`),
      rulesBox,
      el('div.row.gap.wrap', { style: { marginTop: '10px' } },
        el('button.btn', {
          onclick: () => {
            if (!confirm(`Démarrer une nouvelle idée ${g.name} ? Ton idée en cours est d’abord rangée dans le Carnet.`)) return;
            update((s) => {
              s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Idée ${genreById(s.project.genre).name} (avant le défi)`, date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)) });
              s.project = projectFromGenre(ch.genre);
            });
            location.hash = '#/melody';
          },
        }, `✨ Nouvelle idée ${g.name}`),
        el('a.btn', { href: '#/beat' }, '🥁 Beat'), el('a.btn', { href: '#/chords' }, '🎼 Accords'), el('a.btn', { href: '#/melody' }, '🎵 Mélodie'))),
    othersBox,
  );

  function paintRules() {
    const res = checkRules(ch, getState().project);
    const ok = res.every((r) => r.ok);
    const st = cloudStatus();
    rulesBox.replaceChildren(
      el('h3', { style: { marginTop: '10px' } }, 'Ton idée en cours'),
      el('ul.sn-proofs', res.map((r) => el('li' + (r.ok ? '.ok' : ''), r.ok ? '✓ ' : '○ ', r.label))),
      st.user
        ? el('button.btn.primary', {
          disabled: !ok,
          onclick: async (e) => {
            e.target.disabled = true;
            try {
              await publishEntry(week, ch.id, getState().project);
              recordExercise({ key: 'challenge', title: `Défi : ${ch.title}`, xp: 40, skill: 'autonomie', success: true });
              toast('Ta version est publiée 🎉', 'good');
              paintOthers();
            } catch (x) { toast(x.code === 'permission-denied' ? 'Règles Firestore à mettre à jour (voir README)' : x.message, 'bad', 4000); }
            e.target.disabled = !ok;
          },
        }, ok ? '📤 Publier ma version' : 'Respecte toutes les règles pour publier')
        : el('p.small', el('a', { href: '#/profile?account=1' }, '👤 Connecte-toi'), ' pour publier ta version et écouter celles des autres.'),
    );
  }

  async function paintOthers() {
    if (!cloudStatus().user) { othersBox.replaceChildren(); return; }
    othersBox.replaceChildren(card(el('p.small.muted', '⏳ Chargement des participations…')));
    let list = [];
    try { list = await listEntries(week); } catch (x) {
      othersBox.replaceChildren(card(el('p.small.bad', x.code === 'permission-denied' ? 'Règles Firestore à mettre à jour (voir README).' : x.message)));
      return;
    }
    const playBtns = [];
    othersBox.replaceChildren(card(el('h3', `🎧 Les participations (${list.length})`),
      list.length ? list.map((e) => {
        let p = null;
        try { p = sanitizeProject(JSON.parse(e.project), projectFromGenre(ch.genre)); } catch (x) { p = null; }
        const btn = el('button.btn.small', {
          disabled: !p,
          onclick: () => {
            ensureAudio();
            if (transport.playing && transport.owner === 'defi:' + e.uid) { transport.stop(); return; }
            playProject(() => p, { owner: 'defi:' + e.uid });
          },
        }, '▶');
        playBtns.push([btn, e.uid]);
        return el('div.friend-req',
          el('span', el('b', e.pseudo), e.mine ? el('small.muted', ' (toi)') : null, el('small.muted', ` · niv. ${e.level || 1} · ${p ? `${p.bpm} BPM` : 'idée illisible'}`)),
          el('div.row.gap', btn,
            p && !e.mine ? el('button.btn.small', { title: 'Garder dans mon carnet', onclick: () => { update((s) => { s.notebook.unshift({ id: Date.now(), type: 'idea', title: `🏆 Défi « ${ch.title} » par ${e.pseudo}`, date: Date.now(), genre: p.genre, project: p }); }); toast('Ajoutée au Carnet 📓', 'good'); } }, '📓') : null,
            e.mine ? el('button.btn.small.ghost', { onclick: async () => { if (confirm('Retirer ta participation ?')) { await removeEntry(week); paintOthers(); } } }, 'Retirer') : null));
      }) : el('p.small.muted', 'Personne n’a encore publié cette semaine : sois le premier !')));
    offT?.();
    offT = transport.subscribe((on, owner) => playBtns.forEach(([b, uid]) => { b.textContent = on && owner === 'defi:' + uid ? '■' : '▶'; }));
  }

  paintRules();
  paintOthers();
  return () => { offT?.(); if (String(transport.owner || '').startsWith('defi:')) transport.stop(); };
}
