export const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || "";

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

export async function authRequest(action, payload) {
  if (!GOOGLE_SCRIPT_URL) {
    throw new Error("Google Script URL is not configured");
  }

  let response;

  try {
    response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({ action, ...payload }),
    });
  } catch (fetchError) {
    throw new Error(
      "Unable to connect to auth server. Please check Apps Script deployment URL."
    );
  }

  let data;
  try {
    data = await response.json();
  } catch (parseError) {
    throw new Error(
      "Unable to connect to auth server. Please check Apps Script deployment URL."
    );
  }

  if (!data || typeof data !== "object") {
    throw new Error(
      "Unable to connect to auth server. Please check Apps Script deployment URL."
    );
  }

  return data;
}
