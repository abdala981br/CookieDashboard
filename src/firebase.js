import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBSih7dkMmGmYg2NUcM7a_ki-PQtKJ2504",
  authDomain: "cookiedash.firebaseapp.com",
  projectId: "cookiedash",
  storageBucket: "cookiedash.firebasestorage.app",
  messagingSenderId: "165689377990",
  appId: "1:165689377990:web:266b6edaed2a8aee48c3c7"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { experimentalForceLongPolling: true });
