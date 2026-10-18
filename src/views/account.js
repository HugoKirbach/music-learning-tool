// Carte « Compte & synchro » du Profil.
import { el, card, toast } from '../ui.js';
import { onCloud, cloudStatus, signInGoogle, signInEmail, signUpEmail, resetPassword, signOutCloud, sync } from '../cloud.js';

const STATE_TXT = {
  loading: '⏳ Connexion au compte…',
  syncing: '🔄 Synchronisation…',
  synced: '✅ Synchronisé',
  pending: '⏳ Modifications en attente d’envoi…',
  offline: '📴 Hors-ligne : la synchro reprendra au retour du réseau',
  error: '⚠️ Problème de synchro',
};

function ago(t) {
  if (!t) return '';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'à l’instant' : m < 60 ? `il y a ${m} min` : `il y a ${Math.round(m / 60)} h`;
}

export function accountCard() {
  const body = el('div');
  const node = card(el('h3', '☁️ Compte & synchro'), body);
  let busy = false;
  let errMsg = '';

  const act = async (fn, okMsg) => {
    if (busy) return;
    busy = true; errMsg = ''; paint();
    try { await fn(); if (okMsg) toast(okMsg, 'good'); } catch (e) { errMsg = e.message; }
    busy = false; paint();
  };

  function paint() {
    const st = cloudStatus();
    if (st.user) {
      body.replaceChildren(
        el('div.row.gap', st.user.photo ? el('img.acct-photo', { src: st.user.photo, alt: '', referrerpolicy: 'no-referrer' }) : el('span.acct-photo', '👤'),
          el('div', el('b', st.user.name || st.user.email), st.user.name ? el('div.small.muted', st.user.email) : null)),
        el('p.acct-status.' + st.state, STATE_TXT[st.state] || '', st.state === 'synced' && st.lastSync ? ` · ${ago(st.lastSync)}` : ''),
        st.error ? el('p.small.bad', st.error) : null,
        el('p.small.muted', 'Ta progression est sauvegardée en ligne et reste aussi sur cet appareil (hors-ligne compris). Connecte-toi avec le même compte sur ton téléphone et ton PC.'),
        el('div.row.gap.wrap',
          el('button.btn.small', { disabled: busy, onclick: () => act(() => sync(), 'Synchronisé ✅') }, '🔄 Synchroniser maintenant'),
          el('button.btn.small.ghost', { disabled: busy, onclick: () => act(() => signOutCloud(), 'Déconnecté : tes données restent sur cet appareil') }, 'Se déconnecter')),
      );
      return;
    }
    const email = el('input', { type: 'email', placeholder: 'E-mail', autocomplete: 'email', value: body.querySelector('input[type=email]')?.value || '' });
    const pw = el('input', { type: 'password', placeholder: 'Mot de passe (6 caractères min.)', autocomplete: 'current-password', value: body.querySelector('input[type=password]')?.value || '' });
    const need = () => { if (!email.value.trim()) throw new Error('Entre ton adresse e-mail.'); };
    body.replaceChildren(
      el('p.small.muted', 'Facultatif et gratuit : un compte retrouve ta progression (XP, carnet, Piano Rush…) sur ton téléphone et ton PC. Sans compte, tout reste sur cet appareil.'),
      st.state === 'loading' || busy ? el('p.small', '⏳ Un instant…') : null,
      el('button.btn.wide.acct-google', { disabled: busy, onclick: () => act(() => signInGoogle()) }, el('b', 'G'), ' Continuer avec Google'),
      el('div.acct-or', el('span', 'ou par e-mail')),
      el('form.acct-form', { onsubmit: (e) => { e.preventDefault(); act(async () => { need(); await signInEmail(email.value, pw.value); }); } },
        email, pw,
        el('div.row.gap.wrap',
          el('button.btn.primary', { type: 'submit', disabled: busy }, 'Se connecter'),
          el('button.btn', { type: 'button', disabled: busy, onclick: () => act(async () => { need(); await signUpEmail(email.value, pw.value); }, 'Compte créé ✅') }, 'Créer un compte'),
          el('button.btn.small.ghost', { type: 'button', disabled: busy, onclick: () => act(async () => { need(); await resetPassword(email.value); }, 'E-mail de réinitialisation envoyé 📬') }, 'Mot de passe oublié ?'))),
      errMsg || st.error ? el('p.small.bad', errMsg || st.error) : null,
    );
  }

  const off = onCloud(() => paint());
  paint();
  return { node, destroy: off };
}
