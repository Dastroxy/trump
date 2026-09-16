import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyDFuEDNdC-mIaoNnS0olnrAiRuXiFHGO28",
  authDomain: "one-night-werewolf-9d651.firebaseapp.com",
  projectId: "one-night-werewolf-9d651",
  storageBucket: "one-night-werewolf-9d651.firebasestorage.app",
  messagingSenderId: "947973359664",
  appId: "1:947973359664:web:d6624d8349f970e6d805f5"
};

// Initialize Firebase safely (avoid multiple initializations in HMR / dev)
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let authInitPromise: Promise<User | null> | null = null;
export async function ensureAuth(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          unsubscribe();
          resolve(user);
        } else {
          try {
            const cred = await signInAnonymously(auth);
            unsubscribe();
            resolve(cred.user);
          } catch (err) {
            console.warn('Anonymous sign-in note:', err);
            unsubscribe();
            resolve(null);
          }
        }
      });
    });
  }
  return authInitPromise;
}

export default app;
