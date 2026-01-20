import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// --- PASTE YOUR KEYS FROM FIREBASE CONSOLE HERE ---
const firebaseConfig = {
  apiKey: "AIzaSy...", // Paste your actual apiKey inside the quotes
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = "tm-clone-prod"; 


