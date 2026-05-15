/**
 * Firebase Auth — shared config for WizeLife ecosystem
 * Project: finzilla-7f1f9
 */
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, User } from 'firebase/auth';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOut() {
  return fbSignOut(auth);
}

const firebaseConfig = {
  apiKey:            "AIzaSyDuzJHOMe89YmEFpKlaTgxT40BCNhK6PU0",
  authDomain:        "finzilla-7f1f9.firebaseapp.com",
  projectId:         "finzilla-7f1f9",
  storageBucket:     "finzilla-7f1f9.firebasestorage.app",
  messagingSenderId: "1027614800253",
  appId:             "1:1027614800253:web:ddfb62426252e0e8ebb414",
};

const app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Token passed via URL from WizeLife dashboard (#wl_token=xxx, query fallback)
let _urlToken: string | null = null;
if (typeof window !== 'undefined') {
  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
  const t = hashParams.get('wl_token') || params.get('wl_token');
  if (t) {
    _urlToken = t;
    // Remove token from URL bar (clean up — both query and fragment)
    params.delete('wl_token');
    hashParams.delete('wl_token');
    const queryStr = params.toString();
    const hashStr = hashParams.toString();
    const clean = window.location.pathname + (queryStr ? '?' + queryStr : '') + (hashStr ? '#' + hashStr : '');
    window.history.replaceState({}, '', clean);
  }
}

/** Returns the current user's ID token, or the URL-passed token, or null */
export async function getIdToken(): Promise<string | null> {
  if (_urlToken) return _urlToken;
  const user = auth.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch {
    return null;
  }
}

/** Subscribe to auth state changes */
export function onAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export { auth };
export type { User };
