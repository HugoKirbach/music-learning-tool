// Compte & synchronisation (Firebase Auth + Firestore). Facultatif : sans compte, l'app reste 100 % locale.
// Le SDK n'est chargé que si l'utilisateur ouvre le Compte ou s'est déjà connecté sur cet appareil.
import { getState, subscribe, replaceState } from './store.js';
import { mergeStates, isPristine } from './core/merge.js';
import { el, modal } from './ui.js';

// Configuration publique du projet (ces valeurs sont faites pour être visibles ; l'accès est protégé par les règles Firestore).
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBeJDooZkot6cynYHgc_lXDTCg95le2HlY',
  authDomain: 'beatforge-ccd25.firebaseapp.com',
  projectId: 'beatforge-ccd25',
  storageBucket: 'beatforge-ccd25.firebasestorage.app',
  messagingSenderId: '296496192722',
  appId: '1:296496192722:web:d564ae656b01359083a10b',
};
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
const META_KEY = 'beatforge.cloud';
const PUSH_DELAY = 4000;

let fb = null;
let loading = null;
let user = null;
let status = { state: 'off', error: '' };
let pushTimer = 0;
let busy = false;
let again = false;
let conflicts = 0;
const listeners = new Set();

const readMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch (e) { return {}; } };
const writeMeta = (m) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch (e) { /* stockage plein */ } };

export function onCloud(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function cloudStatus() { return { ...status, user, lastSync: readMeta().lastSync || null }; }
function setStatus(state, error = '') { status = { state, error }; listeners.forEach((f) => f(cloudStatus())); }

/** Un compte a déjà été connecté sur cet appareil → on relance la synchro au démarrage. */
export function cloudWanted() { return !!readMeta().uid; }

async function loadSdk() {
  if (fb) return fb;
  if (!loading) {
    loading = (async () => {
      const [app, auth, fs] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
      const a = app.initializeApp(FIREBASE_CONFIG);
      fb = { A: auth, F: fs, auth: auth.getAuth(a), db: fs.getFirestore(a) };
      auth.onAuthStateChanged(fb.auth, onAuth);
      return fb;
    })().catch((e) => { loading = null; throw e; });
  }
  return loading;
}

/** Démarre le module (chargement du SDK + session mémorisée). */
export async function startCloud() {
  if (fb) return true;
  if (!navigator.onLine) { setStatus('offline'); return false; }
  setStatus('loading');
  try { await loadSdk(); return true; } catch (e) {
    console.warn(e);
    setStatus(navigator.onLine ? 'error' : 'offline', 'Impossible de charger le module de compte (réseau ?)');
    return false;
  }
}

async function onAuth(u) {
  user = u ? { uid: u.uid, email: u.email, name: u.displayName, photo: u.photoURL } : null;
  if (!u) { setStatus('off'); return; }
  await sync({ firstLink: readMeta().uid !== u.uid });
}

const docRef = () => fb.F.doc(fb.db, 'users', user.uid);

/** Envoi transactionnel : refusé si la version en ligne a changé depuis la lecture (un autre appareil vient d'écrire). */
async function push(s, expectedAt) {
  const at = Date.now();
  const data = JSON.stringify(s);
  if (data.length > 900000) throw new Error('Sauvegarde trop volumineuse pour la synchro (carnet très rempli ?)');
  await fb.F.runTransaction(fb.db, async (tx) => {
    const cur = await tx.get(docRef());
    const curAt = cur.exists() ? cur.data().updatedAt || 0 : 0;
    if (curAt !== (expectedAt || 0)) { const e = new Error('conflit'); e.code = 'bf-conflict'; throw e; }
    tx.set(docRef(), { v: 1, data, updatedAt: at, device: navigator.userAgent.slice(0, 120) });
  });
  writeMeta({ ...readMeta(), uid: user.uid, email: user.email, localAt: s.updatedAt || 0, remoteAt: at, lastSync: Date.now() });
}

function adopt(remoteState, remoteAt) {
  replaceState(remoteState, { touch: false });
  writeMeta({ ...readMeta(), uid: user.uid, email: user.email, localAt: getState().updatedAt || 0, remoteAt, lastSync: Date.now() });
}

/** Récupère la version en ligne, fusionne si les deux ont changé, puis envoie si besoin. */
export async function sync({ firstLink = false } = {}) {
  if (!fb || !user) return;
  if (busy) { again = true; return; }
  if (!navigator.onLine) { setStatus('offline'); return; }
  busy = true;
  clearTimeout(pushTimer);
  setStatus('syncing');
  try {
    const snap = await fb.F.getDoc(docRef());
    const r = snap.exists() ? snap.data() : null;
    const remote = r ? JSON.parse(r.data) : null;
    const local = getState();
    const meta = readMeta();
    const rAt = r ? r.updatedAt || 0 : 0;
    if (!remote) {
      await push(local, 0);
    } else if (firstLink) {
      if (isPristine(local)) adopt(remote, r.updatedAt);
      else if (isPristine(remote)) await push(local, rAt);
      else {
        const choice = await askMerge();
        if (choice === 'remote') adopt(remote, r.updatedAt);
        else { adopt(mergeStates(local, remote), r.updatedAt); await push(getState(), rAt); }
      }
    } else {
      const localDirty = (local.updatedAt || 0) > (meta.localAt || 0);
      const remoteChanged = (r.updatedAt || 0) > (meta.remoteAt || 0);
      if (remoteChanged && !localDirty) adopt(remote, r.updatedAt);
      else if (remoteChanged && localDirty) { adopt(mergeStates(local, remote), r.updatedAt); await push(getState(), rAt); }
      else if (localDirty) await push(local, rAt);
      else writeMeta({ ...meta, lastSync: Date.now() });
    }
    setStatus('synced');
    conflicts = 0;
  } catch (e) {
    // un autre appareil a écrit entre notre lecture et notre envoi : on relit et on refusionne
    if ((e?.code === 'bf-conflict' || e?.code === 'aborted') && conflicts++ < 3) { again = true; return; }
    console.warn(e);
    setStatus(navigator.onLine ? 'error' : 'offline', fsError(e));
  } finally {
    busy = false;
    if (again) { again = false; schedulePush(500); }
  }
}

function schedulePush(ms = PUSH_DELAY) {
  if (!user) return;
  clearTimeout(pushTimer);
  if (status.state === 'synced') setStatus('pending');
  pushTimer = setTimeout(() => sync(), ms);
}

// Toute modification locale déclenche une sauvegarde différée.
subscribe((s) => {
  if (!user || busy) return;
  if ((s.updatedAt || 0) > (readMeta().localAt || 0)) schedulePush();
});
window.addEventListener('online', () => { if (user) sync(); else if (cloudWanted() && !fb) startCloud(); });
window.addEventListener('offline', () => { if (user) setStatus('offline'); });
let lastVisible = 0;
document.addEventListener('visibilitychange', () => {
  if (!user) return;
  if (document.visibilityState === 'hidden') { if (status.state === 'pending') sync(); return; }
  if (Date.now() - lastVisible > 20000) { lastVisible = Date.now(); sync(); }
});

function askMerge() {
  return new Promise((resolve) => {
    const s = getState();
    const close = modal(el('div',
      el('h2', '☁️ Ce compte a déjà une progression'),
      el('p', `Cet appareil contient aussi des données (${s.xp} XP, ${s.notebook.length} idée${s.notebook.length > 1 ? 's' : ''} au carnet). Que veux-tu faire ?`),
      el('button.btn.primary.wide', { onclick: () => { close(); resolve('merge'); } }, '🔀 Fusionner les deux (recommandé)'),
      el('p.small.muted', 'XP, jours, badges, idées et records sont réunis ; rien n’est perdu.'),
      el('button.btn.wide', { onclick: () => { close(); resolve('remote'); } }, '☁️ Garder seulement le compte'),
      el('p.small.muted', 'Les données de cet appareil sont remplacées par celles du compte.'),
    ), { dismissable: false });
  });
}

// ---------- Connexion ----------
async function ready() {
  if (!(await startCloud())) throw new Error(status.error || 'Pas de connexion internet');
  return fb;
}

export async function signInGoogle() {
  const { A, auth } = await ready();
  try { await A.signInWithPopup(auth, new A.GoogleAuthProvider()); } catch (e) { throw new Error(authError(e)); }
}
export async function signInEmail(email, pw) {
  const { A, auth } = await ready();
  try { await A.signInWithEmailAndPassword(auth, email.trim(), pw); } catch (e) { throw new Error(authError(e)); }
}
export async function signUpEmail(email, pw) {
  const { A, auth } = await ready();
  try { await A.createUserWithEmailAndPassword(auth, email.trim(), pw); } catch (e) { throw new Error(authError(e)); }
}
export async function resetPassword(email) {
  const { A, auth } = await ready();
  try { await A.sendPasswordResetEmail(auth, email.trim()); } catch (e) { throw new Error(authError(e)); }
}
/** Déconnexion : les données restent sur l'appareil, la synchro s'arrête. */
export async function signOutCloud() {
  if (status.state === 'pending') await sync();
  const { A, auth } = await ready();
  await A.signOut(auth);
  writeMeta({});
  user = null;
  setStatus('off');
}

function authError(e) {
  const code = e?.code || '';
  const msg = {
    'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
    'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
    'auth/user-not-found': 'Aucun compte avec cet e-mail : crée-le d’abord.',
    'auth/invalid-login-credentials': 'E-mail ou mot de passe incorrect.',
    'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail : connecte-toi.',
    'auth/weak-password': 'Mot de passe trop court (6 caractères minimum).',
    'auth/invalid-email': 'Adresse e-mail invalide.',
    'auth/missing-password': 'Entre un mot de passe.',
    'auth/popup-closed-by-user': 'Fenêtre Google fermée avant la fin.',
    'auth/cancelled-popup-request': 'Fenêtre Google fermée avant la fin.',
    'auth/popup-blocked': 'Fenêtre Google bloquée par le navigateur : autorise les pop-ups, ou utilise l’e-mail.',
    'auth/operation-not-supported-in-this-environment': 'Connexion Google impossible ici (app installée sur iPhone ?) : utilise l’e-mail.',
    'auth/network-request-failed': 'Pas de connexion internet.',
    'auth/too-many-requests': 'Trop d’essais : réessaie dans quelques minutes.',
    'auth/unauthorized-domain': `Domaine non autorisé : ajoute ${location.hostname} dans Firebase › Authentication › Paramètres › Domaines autorisés.`,
    'auth/operation-not-allowed': 'Méthode de connexion non activée dans Firebase › Authentication › Méthode de connexion.',
  }[code];
  return msg || `Connexion impossible (${code || e?.message || 'erreur inconnue'}).`;
}

function fsError(e) {
  const code = e?.code || '';
  if (code === 'permission-denied') return 'Accès refusé par la base : vérifie les règles Firestore.';
  if (code === 'unavailable') return 'Serveur injoignable : synchro à la prochaine connexion.';
  if (code === 'not-found' || code === 'failed-precondition') return 'Base Firestore introuvable : crée-la dans la console Firebase.';
  return e?.message || 'Erreur de synchronisation';
}
