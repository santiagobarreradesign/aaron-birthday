import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'firebase/firestore';

// ============================================================
// Firebase config (from Firebase Console → Project settings → Web app)
// ============================================================

const firebaseConfig = {
  apiKey: 'AIzaSyByeHaJxNErRM9pN5XNXccQRnT7C6a1_sk',
  authDomain: 'aaron-birthday-dba6e.firebaseapp.com',
  projectId: 'aaron-birthday-dba6e',
  storageBucket: 'aaron-birthday-dba6e.firebasestorage.app',
  messagingSenderId: '53347558618',
  appId: '1:53347558618:web:f69b4a80b94fa5921a71e3',
  measurementId: 'G-4LJYW6NGDC',
};

const hasConfig = !!firebaseConfig.apiKey;

let db = null;

if (hasConfig) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  isSupported()
    .then((yes) => {
      if (yes) getAnalytics(app);
    })
    .catch(() => {});
}

export function isFirebaseConfigured() {
  return hasConfig;
}

// --- Guestbook ---

export function subscribeToGuestbook(callback) {
  if (!db) return () => {};
  const q = query(
    collection(db, 'guestbook'),
    orderBy('createdAt', 'desc'),
    limit(50),
  );
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));
    callback(entries);
  });
}

export async function addGuestbookEntry(name, message) {
  if (!db) return null;
  return addDoc(collection(db, 'guestbook'), {
    name,
    message,
    createdAt: serverTimestamp(),
  });
}

// --- Visitor Counter ---

const VISITED_KEY = 'aaron-bday-visited';

export async function trackVisitor() {
  if (!db) return null;

  const alreadyCounted = sessionStorage.getItem(VISITED_KEY);
  const ref = doc(db, 'stats', 'visitors');
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, { count: 1 });
    sessionStorage.setItem(VISITED_KEY, '1');
    return 1;
  }

  if (!alreadyCounted) {
    await updateDoc(ref, { count: increment(1) });
    sessionStorage.setItem(VISITED_KEY, '1');
  }

  const updated = await getDoc(ref);
  return updated.data().count;
}

export function subscribeToVisitorCount(callback) {
  if (!db) return () => {};
  const ref = doc(db, 'stats', 'visitors');
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data().count);
    }
  });
}
