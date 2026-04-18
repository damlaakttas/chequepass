import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, inMemoryPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyBEaaMrP0JvHF6nTC1H0t9XPJiedDdiRhU',
  authDomain:        'chequepassapp.firebaseapp.com',
  projectId:         'chequepassapp',
  storageBucket:     'chequepassapp.firebasestorage.app',
  messagingSenderId: '447770212411',
  appId:             '1:447770212411:web:fed47a87869f78ab80c41e',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: inMemoryPersistence,
  });
} catch {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
