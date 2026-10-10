import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCmy_V4-2gKAcxnRV43l5zf9aOueqDtJeI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "conversor-3a487.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "conversor-3a487",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "conversor-3a487.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "203274428083",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:203274428083:web:ea4a8ae90ebe3d0a31dac6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-RKB55VT03S"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
