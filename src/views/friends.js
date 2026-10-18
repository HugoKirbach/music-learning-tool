// Amis : comparer niveau, XP de la semaine et séries. Choix du pseudo.
import { el, header, card, modal, toast } from '../ui.js';
import { cloudStatus } from '../cloud.js';
import {
  getMyProfile, loadProfile, setPseudo, validPseudo, addFriend, incomingRequests, acceptRequest, refuseRequest,
  removeFriend, friendsProfiles, publicStats, publishProfile,
} from '../social.js';

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
        try { const p = await setPseudo(input.value); close(); toast(`Bienvenue ${p} 🎧`, 'good'); resolve(p); } catch (x) { err.textContent = x.message; btn.disabled = false; }
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
  root.append(header('👥 Amis', 'Compare ton niveau, ton XP de la semaine et tes séries avec tes amis.', '#/profile'), body);

  async function paint() {
    const st = cloudStatus();
    if (!st.user) {
      body.replaceChildren(card(el('p', 'Connecte-toi pour ajouter des amis : ta progression reste privée, seuls ton pseudo, ton niveau, ton XP et tes séries sont visibles par tes amis.'),
        el('a.btn.primary', { href: '#/profile?account=1' }, '👤 Se connecter')));
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
      body.replaceChildren(card(el('p.bad', `Impossible de charger les amis : ${e.code === 'permission-denied' ? 'règles Firestore à mettre à jour (voir README)' : e.message}`)));
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
        try { const r = await addFriend(input.value); toast(r === 'accepted' ? 'Vous êtes maintenant amis 🤝' : 'Demande envoyée 📨', 'good'); paint(); } catch (x) { toast(x.message, 'bad', 3500); }
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
            el('button.btn.small.primary', { onclick: async () => { await acceptRequest(r.from); toast(`${r.fromPseudo} ajouté 🤝`, 'good'); paint(); } }, 'Accepter'),
            el('button.btn.small.ghost', { onclick: async () => { await refuseRequest(r.from); paint(); } }, 'Refuser'))))) : null,
      card(el('h3', '🏆 Classement de la semaine'),
        el('div.friends-table',
          el('div.ft-row.ft-head', el('span', '#'), el('span', 'Pseudo'), el('span', 'Niveau'), el('span', 'XP sem.'), el('span', '🔥 Série')),
          ranked.map((p, i) => el('div.ft-row' + (p.me ? '.me' : ''),
            el('span', i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1)),
            el('span.ft-name', p.pseudo, p.me ? el('small', ' (toi)') : null),
            el('span', `Niv. ${p.level || 1}`, el('small', p.title || '')),
            el('b', String(p.weekXp || 0)),
            el('span', `${p.streak || 0} j`, el('small', `record ${p.best || 0} j`))))),
        ranked.length === 1 ? el('p.small.muted', 'Ajoute un ami pour lancer la compétition 😉') : null,
        el('p.small.muted', 'La semaine commence le lundi. Les statistiques se mettent à jour à chaque synchronisation.')),
      waiting.length ? card(el('h3', '⏳ En attente'), waiting.map((p) => el('div.friend-req', el('span', p.pseudo), el('small.muted', 'demande envoyée')))) : null,
      friends.filter((f) => !f.waiting).length ? el('details.card', el('summary', 'Gérer mes amis'),
        friends.filter((f) => !f.waiting).map((p) => el('div.friend-req', el('span', p.pseudo),
          el('button.btn.small.ghost', { onclick: async () => { if (confirm(`Retirer ${p.pseudo} de tes amis ?`)) { await removeFriend(p.uid); paint(); } } }, 'Retirer')))) : null,
    );
  }
  paint().catch((e) => { body.replaceChildren(card(el('p.bad', e.message))); });
  return () => { alive = false; };
}
