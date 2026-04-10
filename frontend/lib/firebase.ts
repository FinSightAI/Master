/**
 * Firebase Auth — shared config for WizeLife ecosystem
 * Project: finzilla-7f1f9
 */
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

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

/** Returns the current user's ID token, or null if not logged in */
export async function getIdToken(): Promise<string | null> {
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
