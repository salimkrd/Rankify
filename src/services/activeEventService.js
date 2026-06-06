import { getEvents } from "./eventsService.js";
import { getCurrentUserId } from "./dashboardSupabase.js";

export const ACTIVE_EVENT_KEY_PREFIX = "rankify-active-event-id";
export const ACTIVE_EVENT_KEY = ACTIVE_EVENT_KEY_PREFIX;
const LEGACY_ACTIVE_EVENT_KEYS = ["activeEventId", "active_event_id"];
const LEGACY_ACTIVE_EVENT_OBJECT_KEYS = ["rankify_active_event", "activeEvent"];

function safeJsonParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getStoredUserId() {
  const storedUser = safeJsonParse(localStorage.getItem("rankify_user"), null);
  return storedUser?.id ? String(storedUser.id) : "";
}

export function getActiveEventStorageKey(userId = getStoredUserId()) {
  return userId ? `${ACTIVE_EVENT_KEY_PREFIX}-${userId}` : "";
}

export function getStoredActiveEventId(userId = getStoredUserId()) {
  const storageKey = getActiveEventStorageKey(userId);
  return storageKey ? localStorage.getItem(storageKey) || "" : "";
}

export async function getStoredActiveEventIdForCurrentUser() {
  const userId = await getCurrentUserId();
  return getStoredActiveEventId(userId);
}

export function setStoredActiveEventId(eventId, userId = getStoredUserId()) {
  if (!eventId) {
    clearStoredActiveEventId(userId);
    return;
  }

  const storageKey = getActiveEventStorageKey(userId);
  if (storageKey) localStorage.setItem(storageKey, String(eventId));
  clearLegacyActiveEventStorage();
}

export async function setStoredActiveEventIdForCurrentUser(eventId) {
  const userId = await getCurrentUserId();
  setStoredActiveEventId(eventId, userId);
  return userId;
}

export function clearLegacyActiveEventStorage() {
  localStorage.removeItem("rankify_active_event_id");
  localStorage.removeItem("rankify-active-event-id");
  LEGACY_ACTIVE_EVENT_KEYS.forEach((key) => localStorage.removeItem(key));
  LEGACY_ACTIVE_EVENT_OBJECT_KEYS.forEach((key) => {
    localStorage.removeItem(key);
  });
}

export function clearStoredActiveEventId(userId = getStoredUserId()) {
  const storageKey = getActiveEventStorageKey(userId);
  if (storageKey) localStorage.removeItem(storageKey);
  clearLegacyActiveEventStorage();
}

export async function clearStoredActiveEventIdForCurrentUser() {
  const userId = await getCurrentUserId();
  clearStoredActiveEventId(userId);
  return userId;
}

export function resolveActiveEventFromEvents(events, userId = getStoredUserId()) {
  const activeEventId = getStoredActiveEventId(userId);
  const activeEvent = Array.isArray(events)
    ? events.find((event) => String(event.id) === String(activeEventId))
    : null;

  if (!activeEvent) {
    if (activeEventId) clearStoredActiveEventId(userId);
    return { activeEventId: "", activeEvent: null };
  }

  setStoredActiveEventId(String(activeEvent.id), userId);
  return { activeEventId: String(activeEvent.id), activeEvent };
}

export async function resolveActiveEventFromEventsForCurrentUser(events) {
  const userId = await getCurrentUserId();
  return resolveActiveEventFromEvents(events, userId);
}

export async function resolveActiveEvent() {
  const events = await getEvents();
  return {
    events,
    ...(await resolveActiveEventFromEventsForCurrentUser(events)),
  };
}
