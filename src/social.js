// Pseudo, profil public et amis (Firestore). Le profil public ne contient que ce qu'on compare :
// pseudo, niveau, XP, XP de la semaine, série, record.
import { getState } from './store.js';
import { cloudCtx, onSynced, onCloud } from './cloud.js';
import { levelFromXp, titleFor, dayKey } from './core/progress.js';

const PROFILE_EVERY = 5 * 60 * 1000;
let myProfile = null;
let lastPublish = 0;
const listeners = new Set();
export function onSocial(fn) { listeners.add(fn); return () => listeners.delete(fn); }
const emit = () => listeners.forEach((f) => f(myProfile));

/** Pseudo : 3 à 20 caractères, lettres (accents compris), chiffres, . _ - */
export function validPseudo(p) {
  const s = (p || '').trim();
  if (s.length < 3 || s.length > 20) return 'Entre 3 et 20 caractères.';
  if (!/^[\p{L}\p{N}._-]+$/u.test(s)) return 'Lettres, chiffres, point, tiret ou souligné uniquement (sans espace).';
  return null;
}
const key = (p) => p.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Statistiques publiques calculées depuis la progression locale. */
export function publicStats(s = getState(), today = new Date()) {
  const lv = levelFromXp(s.xp);
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  let weekXp = 0;
  for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) weekXp += s.days[dayKey(d)]?.xp || 0;
  const alive = s.streak?.last && (s.streak.last === dayKey(today) || s.streak.last === dayKey(new Date(today.getTime() - 86400000)));
  return { level: lv.level, title: titleFor(lv.level), xp: s.xp, weekXp, streak: alive ? s.streak.count || 0 : 0, best: s.streak?.best || 0 };
}

const profRef = (c, uid) => c.F.doc(c.db, 'profiles', uid);

export function getMyProfile() { return myProfile; }

/** Charge (ou crée) mon profil public. */
export async function loadProfile() {
  const c = cloudCtx();
  if (!c) { myProfile = null; emit(); return null; }
  const snap = await c.F.getDoc(profRef(c, c.user.uid));
  myProfile = snap.exists() ? { uid: c.user.uid, friends: [], pending: [], ...snap.data() } : { uid: c.user.uid, pseudo: null, friends: [], pending: [] };
  emit();
  return myProfile;
}

/** Publie mes statistiques (au plus toutes les 5 min, ou tout de suite si force). */
export async function publishProfile(force = false) {
  const c = cloudCtx();
  if (!c || !myProfile?.pseudo) return;
  if (!force && Date.now() - lastPublish < PROFILE_EVERY) return;
  lastPublish = Date.now();
  const data = { pseudo: myProfile.pseudo, friends: myProfile.friends || [], pending: myProfile.pending || [], ...publicStats(), updatedAt: Date.now() };
  await c.F.setDoc(profRef(c, c.user.uid), data);
  myProfile = { ...myProfile, ...data };
  emit();
}

/** Choisit (ou change) le pseudo : réservé de façon unique grâce à une transaction. */
export async function setPseudo(pseudo) {
  const c = cloudCtx();
  if (!c) throw new Error('Connecte-toi d’abord');
  const err = validPseudo(pseudo);
  if (err) throw new Error(err);
  const name = pseudo.trim();
  const k = key(name);
  const old = myProfile?.pseudo ? key(myProfile.pseudo) : null;
  await c.F.runTransaction(c.db, async (tx) => {
    const ref = c.F.doc(c.db, 'pseudos', k);
    const cur = await tx.get(ref);
    if (cur.exists() && cur.data().uid !== c.user.uid) { const e = new Error('Ce pseudo est déjà pris, essaies-en un autre.'); e.code = 'taken'; throw e; }
    if (!cur.exists()) tx.set(ref, { uid: c.user.uid, pseudo: name });
  });
  if (old && old !== k) { try { await c.F.deleteDoc(c.F.doc(c.db, 'pseudos', old)); } catch (e) { /* déjà supprimé */ } }
  myProfile = { ...(myProfile || { friends: [], pending: [] }), uid: c.user.uid, pseudo: name };
  await publishProfile(true);
  return name;
}

// ---------- Amis ----------
const reqId = (from, to) => `${to}_${from}`;

/** Envoie une demande d'ami à un pseudo. */
export async function addFriend(pseudo) {
  const c = cloudCtx();
  if (!c || !myProfile?.pseudo) throw new Error('Choisis d’abord ton pseudo');
  const snap = await c.F.getDoc(c.F.doc(c.db, 'pseudos', key(pseudo || '')));
  if (!snap.exists()) throw new Error(`Aucun joueur nommé « ${pseudo} »`);
  const to = snap.data().uid;
  if (to === c.user.uid) throw new Error('C’est toi ! 😄');
  if ((myProfile.friends || []).includes(to)) throw new Error('Vous êtes déjà amis');
  // Demande croisée : si l'autre m'a déjà invité, on accepte directement
  const back = await c.F.getDoc(c.F.doc(c.db, 'requests', reqId(to, c.user.uid)));
  if (back.exists()) { await acceptRequest(to); return 'accepted'; }
  await c.F.setDoc(c.F.doc(c.db, 'requests', reqId(c.user.uid, to)), { from: c.user.uid, to, fromPseudo: myProfile.pseudo, at: Date.now() });
  myProfile.pending = [...new Set([...(myProfile.pending || []), to])];
  await publishProfile(true);
  return 'sent';
}

export async function incomingRequests() {
  const c = cloudCtx();
  if (!c) return [];
  const q = c.F.query(c.F.collection(c.db, 'requests'), c.F.where('to', '==', c.user.uid));
  const snap = await c.F.getDocs(q);
  return snap.docs.map((d) => d.data()).sort((a, b) => b.at - a.at);
}

export async function acceptRequest(fromUid) {
  const c = cloudCtx();
  myProfile.friends = [...new Set([...(myProfile.friends || []), fromUid])];
  myProfile.pending = (myProfile.pending || []).filter((u) => u !== fromUid);
  await publishProfile(true);
  try { await c.F.deleteDoc(c.F.doc(c.db, 'requests', reqId(fromUid, c.user.uid))); } catch (e) { /* déjà supprimée */ }
  emit();
}

export async function refuseRequest(fromUid) {
  const c = cloudCtx();
  await c.F.deleteDoc(c.F.doc(c.db, 'requests', reqId(fromUid, c.user.uid)));
}

export async function removeFriend(uid) {
  myProfile.friends = (myProfile.friends || []).filter((u) => u !== uid);
  await publishProfile(true);
  emit();
}

/**
 * Profils de mes amis. Met aussi à jour les liens : une demande acceptée de l'autre côté devient une amitié,
 * une amitié retirée par l'autre disparaît.
 */
export async function friendsProfiles() {
  const c = cloudCtx();
  if (!c || !myProfile) return [];
  const me = c.user.uid;
  const ids = [...new Set([...(myProfile.friends || []), ...(myProfile.pending || [])])];
  const out = [];
  let changed = false;
  for (const uid of ids) {
    const snap = await c.F.getDoc(profRef(c, uid));
    if (!snap.exists()) continue;
    const p = { uid, ...snap.data() };
    const theyHaveMe = (p.friends || []).includes(me);
    if ((myProfile.pending || []).includes(uid)) {
      if (theyHaveMe) { myProfile.pending = myProfile.pending.filter((u) => u !== uid); myProfile.friends = [...new Set([...(myProfile.friends || []), uid])]; changed = true; out.push(p); }
      else {
        const req = await c.F.getDoc(c.F.doc(c.db, 'requests', reqId(me, uid)));
        if (!req.exists()) { myProfile.pending = myProfile.pending.filter((u) => u !== uid); changed = true; } // refusée
        else out.push({ ...p, waiting: true });
      }
    } else if ((myProfile.friends || []).includes(uid)) {
      if (!theyHaveMe && p.updatedAt && !(p.pending || []).includes(me)) { myProfile.friends = myProfile.friends.filter((u) => u !== uid); changed = true; } // retiré
      else out.push(p);
    }
  }
  if (changed) await publishProfile(true);
  return out;
}

// Après chaque synchro : on (re)publie mes statistiques.
onSynced(() => {
  if (!myProfile) loadProfile().then(() => publishProfile()).catch((e) => console.warn(e));
  else publishProfile().catch((e) => console.warn(e));
});
onCloud((st) => { if (!st.user && myProfile) { myProfile = null; emit(); } });

// ---------- Défi de la semaine (participations publiques) ----------
const entryRef = (c, week, uid) => c.F.doc(c.db, 'challenges', week, 'entries', uid);

/** Publie (ou remplace) ma version du défi. */
export async function publishEntry(week, challengeId, project) {
  const c = cloudCtx();
  if (!c) throw new Error('Connecte-toi pour publier');
  if (!myProfile) await loadProfile();
  if (!myProfile?.pseudo) throw new Error('Choisis d’abord ton pseudo');
  const { mutes, ...p } = project;
  const data = JSON.stringify(p);
  if (data.length > 55000) throw new Error('Idée trop volumineuse');
  await c.F.setDoc(entryRef(c, week, c.user.uid), { pseudo: myProfile.pseudo, challenge: challengeId, project: data, at: Date.now(), level: publicStats().level });
}

/** Participations de la semaine (les plus récentes d'abord). */
export async function listEntries(week) {
  const c = cloudCtx();
  if (!c) return [];
  const snap = await c.F.getDocs(c.F.collection(c.db, 'challenges', week, 'entries'));
  return snap.docs.map((d) => ({ uid: d.id, mine: d.id === c.user.uid, ...d.data() })).sort((a, b) => b.at - a.at);
}

export async function removeEntry(week) {
  const c = cloudCtx();
  if (c) await c.F.deleteDoc(entryRef(c, week, c.user.uid));
}
