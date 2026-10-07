import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported, logEvent } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.warn("Firebase configuration environment variables are missing.");
}

// Initialize Firebase App singleton
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication
export const auth = getAuth(app);

// Cloud Firestore Database
export const db = getFirestore(app);

// Firebase Cloud Storage
export const storage = getStorage(app);

// Analytics singleton & safe promise resolver
export let analytics = null;

export const analyticsPromise = (async () => {
  if (typeof window === "undefined") return null;

  try {
    const supported = await isSupported();
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
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
