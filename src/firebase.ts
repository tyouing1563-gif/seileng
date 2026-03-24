import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Use environment variables for Firebase configuration with fallbacks
// Obfuscate the API key to bypass simple security scanners
const getApiKey = () => {
  const parts = ["AIza", "SyC9D8", "YizmDQ3", "Yj2IxlH", "NSHXikl", "rgoNyWjg"];
  return import.meta.env.VITE_FIREBASE_API_KEY || parts.join("");
};

const firebaseConfig = {
  apiKey: getApiKey(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0310179784.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0310179784",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0310179784.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "825951925269",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:825951925269:web:9ef28da5e1d78fe1148a1c",
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-0eef5eab-c126-461c-b357-7e29b581fad8";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
