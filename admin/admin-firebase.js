import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js';
import { getFunctions, connectFunctionsEmulator } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-functions.js';

const firebaseConfig = {
  apiKey: 'AIzaSyD4fRxucKX7nWJKuwdT5RX7UFogvDsIXAo',
  authDomain: 'rynixtech-e0281.firebaseapp.com',
  projectId: 'rynixtech-e0281',
  storageBucket: 'rynixtech-e0281.appspot.com',
  messagingSenderId: '50627783379',
  appId: '1:50627783379:web:6041bcdf91e1bcbbfb0226',
  measurementId: 'G-6DVJWYB6ML'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

// Connect to emulators when running locally
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  import('https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js').then(m => m.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })).catch(() => {});
  import('https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js').then(m => m.connectFirestoreEmulator(db, '127.0.0.1', 8080)).catch(() => {});
  import('https://www.gstatic.com/firebasejs/12.17.1/firebase-storage.js').then(m => m.connectStorageEmulator(storage, '127.0.0.1', 9199)).catch(() => {});
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}
