// Amis : comparer niveau, XP de la semaine et séries. Choix du pseudo.
import { el, header, card, modal, toast } from '../ui.js';
import { genreById } from '../data/genres.js';
import { cloudStatus } from '../cloud.js';
import {
  getMyProfile, loadProfile, setPseudo, validPseudo, addFriend, incomingRequests, acceptRequest, refuseRequest,
  removeFriend, friendsProfiles, publicStats, publishProfile,
} from '../social.js';

/** Erreur du service en ligne lisible par tous : le détail technique (code Firebase) part dans la console. */
export function cloudErrorText(x) {
  if (x?.code && x.code !== 'taken') {
    console.warn('BeatForge · service en ligne :', x.code, x.message);
    return 'Service momentanément indisponible, réessaie plus tard.';
  }
  return x?.message || String(x);
}

/** Aperçu d'un classement (données d'exemple) pour donner envie de se connecter. */
const EXAMPLE = [
  { pseudo: 'nina_loops', level: 7, title: 'Productrice', weekXp: 1240, streak: 12, best: 21 },
  { pseudo: 'toi', level: 6, title: 'Beatmaker', weekXp: 980, streak: 5, best: 9, me: true },
  { pseudo: 'max.808', level: 4, title: 'Groover', weekXp: 610, streak: 3, best: 7 },
];

function ranking(list, example = false) {
  return el('div.friends-table' + (example ? '.example' : ''), example ? { 'aria-hidden': 'true' } : {},
    el('div.ft-row.ft-head', el('span', '#'), el('span', 'Pseudo'), el('span', 'Niveau'), el('span', 'XP sem.'), el('span', '🔥 Série')),
    list.map((p, i) => el('div.ft-row' + (p.me ? '.me' : ''),
      el('span', i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1)),
      el('span.ft-name', p.pseudo, p.me && !example ? el('small', ' (toi)') : null, (p.fav || []).length ? el('small.ft-fav', { title: `Styles préférés : ${p.fav.map((id) => genreById(id).name).join(', ')}` }, p.fav.map((id) => genreById(id).emoji).join(' ')) : null),
      el('span', `Niv. ${p.level || 1}`, el('small', p.title || '')),
      el('b', String(p.weekXp || 0)),
      el('span', `${p.streak || 0} j`, el('small', `record ${p.best || 0} j`)))));
}

/** Fenêtre de choix du pseudo (1re connexion, ou changement). Résout avec le pseudo choisi ou null. */
export function askPseudo({ current = '', canLater = true } = {}) {
  return new Promise((resolve) => {
    const input = el('input', { type: 'text', value: current, placeholder: 'ex. hugo_beats', maxlength: 20, autocomplete: 'nickname' });
    const err = el('p.small.bad', '');
    const btn = el('button.btn.primary.wide', { type: 'submit' }, 'Valider');
    const form = el('form.acct-form', {
      onsubmit: async (e) => {
        e.preventDefault();
        const v = validPseudo(input.value);
        if (v) { err.textContent = v; return; }
        btn.disabled = true; err.textContent = '';
        try { const p = await setPseudo(input.value); close(); toast(`Bienvenue ${p} 🎧`, 'good'); resolve(p); } catch (x) { err.textContent = cloudErrorText(x); btn.disabled = false; }
      },
    }, input, err, btn);
    const close = modal(el('div',
      el('h2', current ? '✏️ Changer de pseudo' : '👋 Choisis ton pseudo'),
      el('p', 'C’est le nom que verront tes amis quand vous comparerez vos niveaux et vos séries.'),
      form,
      canLater ? el('button.btn.ghost.wide', { type: 'button', onclick: () => { close(); resolve(null); } }, 'Plus tard') : null,
    ), { dismissable: canLater });
    setTimeout(() => input.focus(), 50);
  });
}

export function render(root) {
  let alive = true;
  const body = el('div');
  root.append(header('👥 Amis', 'Compare ton niveau, ton XP de la semaine et tes séries avec tes amis.'), body);

  /** Action en ligne (accepter, refuser, retirer) : erreur affichée en toast, puis on rafraîchit. */
  const safe = async (fn) => { try { await fn(); } catch (x) { toast(cloudErrorText(x), 'bad', 3500); } paint(); };

  async function paint() {
    const st = cloudStatus();
    if (!st.user) {
      body.replaceChildren(
        el('div.card.glow',
          el('h3', '🤝 Progresser à plusieurs'),
          el('ul.friends-perks',
            el('li', el('span', { 'aria-hidden': 'true' }, '🏆'), el('div', el('b', 'Un classement chaque semaine'), el('span', 'L’XP repart de zéro le lundi : tout le monde peut gagner.'))),
            el('li', el('span', { 'aria-hidden': 'true' }, '🔥'), el('div', el('b', 'Des séries qui motivent'), el('span', 'Voir la série d’un ami donne envie de ne pas casser la sienne.'))),
            el('li', el('span', { 'aria-hidden': 'true' }, '🔒'), el('div', el('b', 'Ta progression reste privée'), el('span', 'Tes amis ne voient que ton pseudo, ton niveau, ton XP et tes séries.')))),
          el('a.btn.primary.wide', { href: '#/settings?sec=account' }, '👤 Se connecter ou créer un compte'),
          el('p.small.muted', 'Gratuit, et ton compte synchronise aussi ta progression entre ton téléphone et ton PC.')),
        card(el('div.row.between', el('h3', '🏆 Classement de la semaine'), el('span.tag.example-tag', 'Exemple')),
          ranking(EXAMPLE, true),
          el('p.small.muted', 'Aperçu avec des pseudos fictifs : connecte-toi pour voir tes vrais amis ici.')));
      return;
    }
    body.replaceChildren(card(el('p.small.muted', '⏳ Chargement…')));
    let me = getMyProfile() || await loadProfile();
    if (!alive) return;
    if (!me?.pseudo) {
      body.replaceChildren(card(el('p', 'Choisis d’abord un pseudo.'), el('button.btn.primary', { onclick: async () => { if (await askPseudo()) paint(); } }, 'Choisir mon pseudo')));
      return;
    }
    await publishProfile(true).catch(() => {});
    let friends = [], requests = [];
    try { [friends, requests] = await Promise.all([friendsProfiles(), incomingRequests()]); } catch (e) {
      body.replaceChildren(card(el('p.bad', `Impossible de charger les amis : ${cloudErrorText(e)}`), el('button.btn.small', { onclick: () => paint() }, '🔄 Réessayer')));
      return;
    }
    if (!alive) return;
    me = getMyProfile();
    const mine = { ...me, ...publicStats(), me: true };
    const ranked = [mine, ...friends.filter((f) => !f.waiting)].sort((a, b) => (b.weekXp || 0) - (a.weekXp || 0) || (b.xp || 0) - (a.xp || 0));
    const waiting = friends.filter((f) => f.waiting);

    const input = el('input', { type: 'text', placeholder: 'Pseudo de ton ami', maxlength: 20 });
    const addForm = el('form.row.gap', {
      onsubmit: async (e) => {
        e.preventDefault();
        if (!input.value.trim()) return;
        try { const r = await addFriend(input.value); toast(r === 'accepted' ? 'Vous êtes maintenant amis 🤝' : 'Demande envoyée 📨', 'good'); paint(); } catch (x) { toast(cloudErrorText(x), 'bad', 3500); }
      },
    }, input, el('button.btn.primary', { type: 'submit' }, 'Ajouter'));

    body.replaceChildren(
      el('div.card.glow',
        el('div.row.between', el('div', el('div.small.muted', 'Ton pseudo'), el('b.friends-me', me.pseudo)),
          el('div.row.gap', el('button.btn.small', { onclick: () => paint() }, '🔄 Actualiser'),
            el('button.btn.small.ghost', { onclick: async () => { if (await askPseudo({ current: me.pseudo })) paint(); } }, '✏️ Changer'))),
        el('h3', { style: { marginTop: '12px' } }, 'Ajouter un ami'), addForm,
        el('p.small.muted', 'Ton ami doit avoir un compte BeatForge avec un pseudo. Il recevra ta demande ici, dans « Amis ».')),
      requests.length ? card(el('h3', `📨 Demandes reçues (${requests.length})`),
        requests.map((r) => el('div.friend-req', el('b', r.fromPseudo),
          el('div.row.gap',
            el('button.btn.small.primary', { onclick: () => safe(async () => { await acceptRequest(r.from); toast(`${r.fromPseudo} ajouté 🤝`, 'good'); }) }, 'Accepter'),
            el('button.btn.small.ghost', { onclick: () => safe(() => refuseRequest(r.from)) }, 'Refuser'))))) : null,
      card(el('h3', '🏆 Classement de la semaine'),
        ranking(ranked),
        ranked.length === 1 ? el('p.small.muted', 'Ajoute un ami pour lancer la compétition 😉') : null,
        el('p.small.muted', 'La semaine commence le lundi. Les statistiques se mettent à jour à chaque synchronisation.')),
      waiting.length ? card(el('h3', '⏳ En attente'), waiting.map((p) => el('div.friend-req', el('span', p.pseudo), el('small.muted', 'demande envoyée')))) : null,
      friends.filter((f) => !f.waiting).length ? el('details.card', el('summary', 'Gérer mes amis'),
        friends.filter((f) => !f.waiting).map((p) => el('div.friend-req', el('span', p.pseudo),
          el('button.btn.small.ghost', { onclick: () => { if (confirm(`Retirer ${p.pseudo} de tes amis ?`)) safe(() => removeFriend(p.uid)); } }, 'Retirer')))) : null,
    );
  }
  paint().catch((e) => { body.replaceChildren(card(el('p.bad', cloudErrorText(e)))); });
  return () => { alive = false; };
}
