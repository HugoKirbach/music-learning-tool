// Défi de la semaine : une contrainte commune, ma version, et celles des autres à écouter.
import { el, header, card, toast, plural } from '../ui.js';
import { getState, update, projectFromGenre, recordExercise } from '../store.js';
import { transport, ensureAudio } from '../core/audio.js';
import { playProject } from '../player.js';
import { cloudStatus } from '../cloud.js';
import { publishEntry, listEntries, removeEntry } from '../social.js';
import { challengeOfWeek, checkRules } from '../core/challenge.js';
import { sanitizeProject } from '../core/sharecode.js';
import { weekId } from '../core/pedagogy.js';
import { genreById } from '../data/genres.js';
import { cloudErrorText } from './friends.js';

/** Où corriger une règle non respectée (d'après son libellé) : accords et gamme, batterie et tempo, sinon mélodie. */
const FIXES = [
  { re: /accord|progression|gamme/i, href: '#/chords', lab: '🎼 Lab Accords' },
  { re: /hi-hat|kick|snare|clap|ghost|batterie|tempo/i, href: '#/beat', lab: '🥁 Lab Beat' },
  { re: /./, href: '#/melody', lab: '🎵 Lab Mélodie' },
];
export const fixFor = (label) => FIXES.find((f) => f.re.test(label));

export function render(root) {
  const week = weekId();
  const ch = challengeOfWeek(week);
  const g = genreById(ch.genre);
  const rulesBox = el('div');
  const othersBox = el('div');
  let offT = null;

  root.append(
    header('🏆 Défi de la semaine', 'La même contrainte pour tout le monde, du lundi au dimanche. Publie ta version et écoute celles des autres.'),
    el('div.card.glow',
      el('div.small.muted', `Semaine du ${new Date(`${week}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`),
      el('h2', `${ch.emoji} ${ch.title}`),
      el('p', ch.desc),
      el('p.small.muted', `Style conseillé : ${g.emoji} ${g.name}`),
      rulesBox),
    othersBox,
  );

  const newIdea = () => el('button.btn', {
    onclick: () => {
      if (!confirm(`Démarrer une nouvelle idée ${g.name} ? Ton idée en cours est d’abord rangée dans le Carnet.`)) return;
      update((s) => {
        s.notebook.unshift({ id: Date.now(), type: 'idea', title: `Idée ${genreById(s.project.genre).name} (avant le défi)`, date: Date.now(), genre: s.project.genre, project: JSON.parse(JSON.stringify(s.project)) });
        s.project = projectFromGenre(ch.genre);
      });
      location.hash = '#/melody';
    },
  }, `✨ Repartir d’une idée ${g.name}`);

  function paintRules() {
    const res = checkRules(ch, getState().project);
    const ok = res.every((r) => r.ok);
    const todo = res.find((r) => !r.ok);
    const st = cloudStatus();
    // Bouton principal = la prochaine chose à faire : corriger la 1re règle, se connecter, ou publier
    const main = !ok ? el('a.btn.primary', { href: fixFor(todo.label).href }, `Étape suivante : ${fixFor(todo.label).lab} →`)
      : !st.user ? el('a.btn.primary', { href: '#/settings?sec=account' }, '👤 Connecte-toi pour publier')
        : el('button.btn.primary', {
          onclick: async (e) => {
            e.target.disabled = true;
            try {
              await publishEntry(week, ch.id, getState().project);
              recordExercise({ key: 'challenge', title: `Défi : ${ch.title}`, xp: 40, skill: 'autonomie', success: true });
              toast('Ta version est publiée 🎉', 'good');
              paintOthers();
            } catch (x) { toast(cloudErrorText(x), 'bad', 4000); }
            e.target.disabled = false;
          },
        }, '📤 Publier ma version');
    rulesBox.replaceChildren(
      el('h3.ch-rules-title', 'Ton idée en cours'),
      el('ul.sn-proofs.ch-rules', res.map((r) => (r.ok
        ? el('li.ok', '✓ ', r.label)
        : el('li', '○ ', el('a', { href: fixFor(r.label).href }, r.label), el('span.ch-fix', ` · ${fixFor(r.label).lab}`))))),
      el('div.row.gap.wrap.ch-actions', main, newIdea()),
      ok ? null : el('p.small.muted', `${plural(res.filter((r) => !r.ok).length, 'règle')} à respecter avant de publier : touche-en une pour ouvrir l’atelier où la régler.`),
      st.user || ok ? null : el('p.small', el('a', { href: '#/settings?sec=account' }, '👤 Connecte-toi'), ' pour publier ta version et écouter celles des autres.'),
    );
  }

  async function paintOthers() {
    if (!cloudStatus().user) { othersBox.replaceChildren(); return; }
    othersBox.replaceChildren(card(el('p.small.muted', '⏳ Chargement des participations…')));
    let list = [];
    try { list = await listEntries(week); } catch (x) {
      othersBox.replaceChildren(card(el('p.small.bad', cloudErrorText(x))));
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
