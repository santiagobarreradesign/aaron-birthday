import { initializeApp } from 'firebase/app';
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
// SETUP INSTRUCTIONS:
//
// 1. Go to https://console.firebase.google.com
// 2. Click "Create a project" (name it anything, e.g. "aaron-birthday")
// 3. Once created, click the web icon </> to add a web app
// 4. Copy the firebaseConfig object and paste it below
// 5. Go to Firestore Database in the sidebar → "Create database"
// 6. Choose "Start in TEST MODE" → pick any region → Done
// 7. That's it! The guestbook + visitor counter will work.
//
// ============================================================

const firebaseConfig = {
  // PASTE YOUR FIREBASE CONFIG HERE:
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "...",
};

const hasConfig = !!firebaseConfig.apiKey;

let db = null;

if (hasConfig) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
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
    limit(50)
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

const COUNTER_DOC = 'stats/visitors';
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
