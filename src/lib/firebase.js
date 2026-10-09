import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDkV8rNAXkJOM33lfjygm_FpU9y045Cfn0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rankify-4b819.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rankify-4b819",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rankify-4b819.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "294489284076",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:294489284076:web:24f2ac3cc3307dbbceb4c9",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KJMNLNB4YR",
};

// Check for missing or placeholder environment variables
export const missingFirebaseEnvVars = [
  !firebaseConfig.apiKey && "VITE_FIREBASE_API_KEY",
  !firebaseConfig.authDomain && "VITE_FIREBASE_AUTH_DOMAIN",
  !firebaseConfig.projectId && "VITE_FIREBASE_PROJECT_ID",
  !firebaseConfig.storageBucket && "VITE_FIREBASE_STORAGE_BUCKET",
  !firebaseConfig.messagingSenderId && "VITE_FIREBASE_MESSAGING_SENDER_ID",
  !firebaseConfig.appId && "VITE_FIREBASE_APP_ID",
].filter(Boolean);

function isValidConfigValue(val) {
  return typeof val === "string" && val.trim().length > 0 && !val.includes("your_") && !val.includes("your-");
}

export const isFirebaseConfigured = Boolean(
  isValidConfigValue(firebaseConfig.apiKey) &&
  isValidConfigValue(firebaseConfig.projectId) &&
  isValidConfigValue(firebaseConfig.authDomain) &&
  isValidConfigValue(firebaseConfig.appId)
);

let appInstance = null;
let authInstance = null;
let dbInstance = null;
let storageInstance = null;

if (isFirebaseConfigured) {
  try {
    appInstance = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    storageInstance = getStorage(appInstance);
  } catch (error) {
    console.error("[Rankify] Firebase initialization failed:", error);
  }
} else {
  console.warn(
    `[Rankify] Firebase configuration environment variables are missing or incomplete (${missingFirebaseEnvVars.join(
      ", "
    )}). Authentication and Firestore features are disabled until environment variables are set in your deployment settings.`
  );
}

// Singletons for Firebase services
export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;

// Analytics singleton & safe promise resolver
export let analytics = null;

export const analyticsPromise = (async () => {
  if (typeof window === "undefined" || !appInstance || !isFirebaseConfigured) return null;

  try {
    const supported = await isSupported();
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(appInstance);
      return analytics;
    }
  } catch (error) {
    console.warn("Firebase Analytics could not be initialized:", error);
  }
  return null;
})();

/**
 * Safely log an event to Firebase Analytics if available
 * @param {string} eventName
 * @param {Record<string, any>} [eventParams]
 */
export async function trackEvent(eventName, eventParams = {}) {
  try {
    const instance = analytics || (await analyticsPromise);
    if (instance) {
      logEvent(instance, eventName, eventParams);
    }
  } catch (err) {
    console.debug(`[Analytics] Failed to track "${eventName}":`, err);
  }
}

export default app;
