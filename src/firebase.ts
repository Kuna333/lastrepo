import { initializeApp } from 'firebase/app';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAnebid3uNkPUydVAXuxKgBlyDoG6Xqrt8',
  authDomain: 'exam-simulator-464.firebaseapp.com',
  projectId: 'exam-simulator-464',
  storageBucket: 'exam-simulator-464.firebasestorage.app',
  messagingSenderId: '192137351599',
  appId: '1:192137351599:web:7cde8a2b2439171f561f5a',
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Persistent login across browser sessions
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase auth persistence failed:', err);
});

// Firestore with offline persistence enabled (IndexedDB cache)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
