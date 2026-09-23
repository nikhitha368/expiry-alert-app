import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDiuhZglcLpRT8eNBS0QmfgHyUBAiBT6P0",
  authDomain: "product-expiry-alert-860f7.firebaseapp.com",
  projectId: "product-expiry-alert-860f7",
  storageBucket: "product-expiry-alert-860f7.firebasestorage.app",
  messagingSenderId: "211249697936",
  appId: "1:211249697936:web:035a70eacf5b5936cef415",
};

const app = initializeApp(firebaseConfig);

// 🔥 Firestore
export const db = getFirestore(app);

// 🔐 Authentication
export const auth = getAuth(app);

// ── Session only — logs out when browser/tab is closed ──
setPersistence(auth, browserSessionPersistence);