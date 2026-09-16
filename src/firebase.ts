import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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

export default app;
