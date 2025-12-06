import { initializeApp } from "firebase/app";
import { getFirestore, Firestore, enableIndexedDbPersistence } from "firebase/firestore";

// --- CONFIGURATION ---
// Data is read from the .env file
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
let app;
let dbInstance: Firestore | null = null;
let initialized = false;

try {
  // Check if keys exist in the environment
  if (firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("paste_your")) {
    app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    
    // ENABLE OFFLINE PERSISTENCE
    enableIndexedDbPersistence(dbInstance).catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('Persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
            console.warn('Persistence not supported by browser');
        }
    });

    initialized = true;
    console.log("Firebase initialized successfully");
  } else {
    console.warn("Firebase Keys are missing in .env file. App running in Local Demo Mode.");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

// Export db
export const db = dbInstance;
export const isFirebaseInitialized = initialized;