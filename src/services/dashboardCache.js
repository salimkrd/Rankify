const CACHE_EVENT = "rankify-supabase-cache-updated";

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function cacheKey(parts) {
  return parts.filter(Boolean).join("-");
}

export function dashboardCacheKey(type, userId, eventId = "") {
  return cacheKey(["rankify-cache", type, userId, eventId]);
}

export function getDashboardCache(type, userId, eventId = "") {
  if (!userId) return null;
  return safeJsonParse(localStorage.getItem(dashboardCacheKey(type, userId, eventId)), null);
}

export function setDashboardCache(type, userId, eventId = "", value = []) {
  if (!userId) return;
  localStorage.setItem(dashboardCacheKey(type, userId, eventId), JSON.stringify(value));
}

export function clearDashboardCache(type, userId, eventId = "") {
  if (!userId) return;
  localStorage.removeItem(dashboardCacheKey(type, userId, eventId));
}

export function notifyDashboardCacheUpdated(type, eventId = "") {
  window.dispatchEvent(
    new CustomEvent(CACHE_EVENT, {
      detail: { type, eventId },
    })
  );
}

export const DASHBOARD_CACHE_EVENT = CACHE_EVENT;
