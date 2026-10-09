import { auth } from "../lib/firebase.js";
import { onAuthStateChanged } from "firebase/auth";

export async function getCurrentUserId() {
  if (!auth) {
    try {
      const storedUser = JSON.parse(localStorage.getItem("rankify_user") || "null");
      if (storedUser?.id) return storedUser.id;
    } catch {}
    throw new Error("Firebase Authentication is not configured or you are not signed in.");
  }

  if (typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
    } catch {}
  }

  let user = auth.currentUser;

  if (!user) {
    user = await new Promise((resolve) => {
      let resolved = false;
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve(u);
        }
      });
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsubscribe();
          resolve(auth.currentUser || null);
        }
      }, 3000);
    });
  }

  if (user?.uid) {
    try {
      const storedUser = JSON.parse(localStorage.getItem("rankify_user") || "null");
      localStorage.setItem(
        "rankify_user",
        JSON.stringify({
          ...(storedUser && typeof storedUser === "object" ? storedUser : {}),
          id: user.uid,
          email: user.email || storedUser?.email || "",
        })
      );
    } catch {
      localStorage.setItem("rankify_user", JSON.stringify({ id: user.uid, email: user.email || "" }));
    }
    return user.uid;
  }

  try {
    const storedUser = JSON.parse(localStorage.getItem("rankify_user") || "null");
    if (storedUser?.id) {
      return storedUser.id;
    }
  } catch {}

  throw new Error("Please sign in again to continue.");
}

export function formatFirebaseDate(value) {
  if (!value) return "Unknown";
  if (value && typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString("en-US");
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US");
}

export const formatSupabaseDate = formatFirebaseDate;

export async function runFirebaseQuery(query) {
  const result = await query;
  if (!result) return null;
  const { data, error } = result;
  if (error) throw error;
  return data;
}

export const runSupabaseQuery = runFirebaseQuery;
