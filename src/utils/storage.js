export function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("rankify_user") || "null");
  } catch {
    return null;
  }
}

export function getUserStorageKey(baseKey) {
  const user = getCurrentUser();
  const email = user?.email?.toLowerCase()?.trim();

  if (!email || !String(baseKey).startsWith("rankify_")) {
    return baseKey;
  }

  return `${baseKey}_${email}`;
}

function safeJsonParse(value, fallback) {
  try {
    if (value === null || value === undefined) {
      return fallback;
    }
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getUserStorageItem(baseKey) {
  return localStorage.getItem(getUserStorageKey(baseKey));
}

export function getUserStorageJson(baseKey, fallback = null) {
  return safeJsonParse(getUserStorageItem(baseKey), fallback);
}

export function setUserStorageItem(baseKey, value) {
  return localStorage.setItem(getUserStorageKey(baseKey), value);
}

export function setUserStorageJson(baseKey, value) {
  return setUserStorageItem(baseKey, JSON.stringify(value));
}

export function removeUserStorageItem(baseKey) {
  return localStorage.removeItem(getUserStorageKey(baseKey));
}
