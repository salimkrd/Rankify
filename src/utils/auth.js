import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase.js";
import { clearStoredActiveEventId } from "../services/activeEventService.js";

export function saveUserSession({ id, name, email }) {
  localStorage.setItem("rankify_user", JSON.stringify({ id, name, email }));
  localStorage.setItem("rankify_is_logged_in", "true");
}

export function clearUserSession() {
  clearStoredActiveEventId();
  localStorage.removeItem("rankify_user");
  localStorage.removeItem("rankify_is_logged_in");
}

export async function logoutWithFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.warn("Firebase sign out error:", error);
  } finally {
    clearUserSession();
  }
}

export const logoutWithSupabase = logoutWithFirebase;

export function getInitials(user) {
  const name = String(
    user?.name || user?.displayName || user?.fullName || user?.username || ""
  ).trim();

  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  const email = String(user?.email || "").trim();
  if (email) {
    const emailName = email.split("@")[0];
    const clean = emailName.replace(/[^a-zA-Z]/g, "");
    if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
    if (clean.length === 1) return clean[0].toUpperCase();
  }

  return "U";
}

export async function hashPassword(password) {
  if (!password) return "";
  if (!window.crypto || !window.crypto.subtle) {
    return password;
  }

  const data = new TextEncoder().encode(password);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function userFromFirebaseUser(user, fallback = {}) {
  const name =
    user?.displayName ||
    fallback.name ||
    user?.email?.split("@")[0] ||
    "User";

  return {
    id: user?.uid || user?.id || fallback.id || "",
    name,
    email: user?.email || fallback.email || "",
  };
}

export const userFromSupabaseUser = userFromFirebaseUser;

export async function registerWithFirebase({ name, email, password }) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  if (name) {
    try {
      await updateProfile(user, { displayName: name });
    } catch (e) {
      console.warn("Could not set display name on Firebase user:", e);
    }
  }

  const sessionUser = userFromFirebaseUser(user, { name, email });
  saveUserSession(sessionUser);
  return sessionUser;
}

export const registerWithSupabase = registerWithFirebase;

export async function loginWithFirebase({ email, password }) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  const sessionUser = userFromFirebaseUser(user, { email });
  saveUserSession(sessionUser);
  return sessionUser;
}

export const loginWithSupabase = loginWithFirebase;

export function getFriendlyAuthErrorMessage(error) {
  if (!error) return "An unexpected error occurred.";
  const code = error.code || "";

  switch (code) {
    case "auth/configuration-not-found":
      return "Firebase Authentication is not enabled yet. Please enable Email/Password under Authentication > Sign-in method in your Firebase Console.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Please sign in instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in provider is disabled in Firebase Console.";
    case "auth/too-many-requests":
      return "Access temporarily disabled due to many failed attempts. Try again later or reset password.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return error.message || "An authentication error occurred. Please try again.";
  }
}
