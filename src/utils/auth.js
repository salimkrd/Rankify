import { supabase } from "../lib/supabaseClient.js";

export function saveUserSession({ name, email }) {
  localStorage.setItem("rankify_user", JSON.stringify({ name, email }));
  localStorage.setItem("rankify_is_logged_in", "true");
}

export function clearUserSession() {
  localStorage.removeItem("rankify_user");
  localStorage.removeItem("rankify_is_logged_in");
}

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

export function userFromSupabaseUser(user, fallback = {}) {
  const metadata = user?.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    fallback.name ||
    user?.email?.split("@")[0] ||
    "User";

  return {
    name,
    email: user?.email || fallback.email || "",
  };
}

export async function registerWithSupabase({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: name,
      },
    },
  });

  if (error) throw error;

  const user = userFromSupabaseUser(data.user, { name, email });
  saveUserSession(user);
  return user;
}

export async function loginWithSupabase({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  const user = userFromSupabaseUser(data.user, { email });
  saveUserSession(user);
  return user;
}
