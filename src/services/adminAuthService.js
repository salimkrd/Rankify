import { firebaseClient } from "../lib/firebaseClient.js";
import { auth, db } from "../lib/firebase.js";
import { doc, getDoc } from "firebase/firestore";

/**
 * Verifies backend admin authorization for the current user.
 * Checks Firebase custom claims and Firestore admin_users directory collection.
 * Does NOT rely on hardcoded email or client-side bypass.
 */
export async function getCurrentAdminUser() {
  const {
    data: { user },
    error: userError,
  } = await firebaseClient.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  // 1. Check custom claim if set by Firebase Admin SDK
  if (user.admin === true || user.role === "admin") {
    return { ...user, admin: true, role: "admin" };
  }

  if (auth?.currentUser) {
    try {
      const tokenResult = await auth.currentUser.getIdTokenResult();
      if (tokenResult?.claims?.admin === true || tokenResult?.claims?.role === "admin") {
        return {
          ...user,
          admin: true,
          role: "admin",
        };
      }
    } catch (claimErr) {
      console.warn("Unable to check ID token claims:", claimErr);
    }
  }

  // 2. Check direct document lookup in admin_users/{user.id}
  if (db && user.id) {
    try {
      const docRef = doc(db, "admin_users", user.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.role === "admin" || data.user_id === user.id) {
          return {
            ...user,
            ...data,
            admin: true,
            role: "admin",
          };
        }
      }
    } catch {
      // If direct doc lookup throws permission-denied or doc not found, continue to query check
    }
  }

  // 3. Check query in admin_users collection where user_id == user.id
  if (user.id) {
    try {
      const { data, error } = await firebaseClient
        .from("admin_users")
        .select("id,user_id,email,role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data && (data.role === "admin" || data.user_id === user.id)) {
        return {
          ...user,
          ...data,
          admin: true,
          role: "admin",
        };
      }
    } catch {
      // Not an admin
    }
  }

  return null;
}

/**
 * Signs in an admin user.
 * Enforces that the authenticated user must be confirmed by backend authorization.
 * If the user is authenticated in Firebase Auth but NOT an admin, they are immediately signed out.
 */
export async function signInAdmin(email, password) {
  const { error } = await firebaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const adminUser = await getCurrentAdminUser();
  if (!adminUser) {
    await firebaseClient.auth.signOut();
    throw new Error("This account is not authorized for Rankify admin.");
  }

  return adminUser;
}

export async function signOutAdmin() {
  const { error } = await firebaseClient.auth.signOut();
  if (error) throw error;
}
