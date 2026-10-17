import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Production Firebase configuration for sms-router-797c4
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBw70XRn2hX2A6MHSyY_lrL8BZXqkzjbVU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sms-router-797c4.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sms-router-797c4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sms-router-797c4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "60478932597",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:60478932597:web:2670b041d6a20aac6e1a3c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XTH39XC0LF"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
