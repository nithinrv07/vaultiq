// Firebase Auth (Google + email) and Firestore sync.
// The SDK is loaded lazily so guests and unconfigured builds don't pay for it.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

let ready = null;
function load() {
  if (!firebaseConfigured) return Promise.reject(new Error('Sign-in is not configured yet.'));
  ready ||= (async () => {
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
    const app = initializeApp(config);
    const auth = authMod.getAuth(app);
    await authMod.setPersistence(auth, authMod.browserLocalPersistence);
    const db = fsMod.getFirestore(app);
    return { auth, db, a: authMod, f: fsMod };
  })();
  return ready;
}

const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone;

export async function watchAuth(cb) {
  if (!firebaseConfigured) { cb(null); return () => {}; }
  const { auth, a } = await load();
  a.getRedirectResult(auth).catch(() => {});
  return a.onAuthStateChanged(auth, (u) => cb(u ? { uid: u.uid, name: u.displayName || u.email?.split('@')[0] || 'You', email: u.email, photo: u.photoURL } : null));
}

export async function signInWithGoogle() {
  const { auth, a } = await load();
  const provider = new a.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Popups are unreliable inside installed (standalone) apps, so use a redirect there.
  if (standalone()) return a.signInWithRedirect(auth, provider);
  try { return await a.signInWithPopup(auth, provider); }
  catch (e) {
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') return a.signInWithRedirect(auth, provider);
    throw e;
  }
}

export async function emailSignIn(email, password, create) {
  const { auth, a } = await load();
  return create ? a.createUserWithEmailAndPassword(auth, email, password) : a.signInWithEmailAndPassword(auth, email, password);
}

export async function resetPassword(email) {
  const { auth, a } = await load();
  return a.sendPasswordResetEmail(auth, email);
}

export async function signOutUser() {
  if (!firebaseConfigured) return;
  const { auth, a } = await load();
  return a.signOut(auth);
}

/* ---- Cloud sync: one document per user at users/{uid} ---- */
export async function loadCloudState(uid) {
  const { db, f } = await load();
  const snap = await f.getDoc(f.doc(db, 'users', uid));
  return snap.exists() ? JSON.parse(snap.data().state || 'null') : null;
}

export async function saveCloudState(uid, state) {
  const { db, f } = await load();
  await f.setDoc(f.doc(db, 'users', uid), { state: JSON.stringify(state), updatedAt: f.serverTimestamp() });
}

export function friendlyAuthError(e) {
  const map = {
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/wrong-password': 'Email or password is incorrect.',
    'auth/user-not-found': 'No account with that email — try creating one.',
    'auth/email-already-in-use': 'That email already has an account. Sign in instead.',
    'auth/weak-password': 'Use at least 6 characters for your password.',
    'auth/invalid-email': 'That email address looks wrong.',
    'auth/popup-closed-by-user': 'Sign-in window was closed.',
    'auth/unauthorized-domain': 'This domain isn\'t authorised in Firebase yet (Authentication → Settings → Authorized domains).',
    'auth/network-request-failed': 'Network error — check your connection.',
    'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  };
  return map[e?.code] || e?.message || 'Something went wrong.';
}
