import {
  getUserStorageItem,
  removeUserStorageItem,
  setUserStorageItem,
} from "../utils/storage.js";
import { getEvents } from "./eventsService.js";

export const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const STABLE_ACTIVE_EVENT_KEY = "rankify-active-event-id";
const LEGACY_ACTIVE_EVENT_KEYS = ["activeEventId", "active_event_id"];
const LEGACY_ACTIVE_EVENT_OBJECT_KEYS = ["rankify_active_event", "activeEvent"];

function readJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function getStoredActiveEventId() {
  const primaryId = getUserStorageItem(ACTIVE_EVENT_KEY);
  if (primaryId) return primaryId;

  const stableId = localStorage.getItem(STABLE_ACTIVE_EVENT_KEY);
  if (stableId) return stableId;

  for (const key of LEGACY_ACTIVE_EVENT_KEYS) {
    const id = localStorage.getItem(key);
    if (id) return id;
  }

  for (const key of LEGACY_ACTIVE_EVENT_OBJECT_KEYS) {
    const scopedValue = readJson(getUserStorageItem(key));
    const globalValue = readJson(localStorage.getItem(key));
    const value = scopedValue || globalValue;

    if (typeof value === "string") return value;
    if (value?.id) return String(value.id);
  }

  return "";
}

export function setStoredActiveEventId(eventId) {
  if (!eventId) {
    clearStoredActiveEventId();
    return;
  }

  setUserStorageItem(ACTIVE_EVENT_KEY, eventId);
  localStorage.setItem(STABLE_ACTIVE_EVENT_KEY, eventId);
}

export function clearStoredActiveEventId() {
  removeUserStorageItem(ACTIVE_EVENT_KEY);
  localStorage.removeItem(STABLE_ACTIVE_EVENT_KEY);
  LEGACY_ACTIVE_EVENT_KEYS.forEach((key) => localStorage.removeItem(key));
  LEGACY_ACTIVE_EVENT_OBJECT_KEYS.forEach((key) => {
    removeUserStorageItem(key);
    localStorage.removeItem(key);
  });
}

export function resolveActiveEventFromEvents(events) {
  const activeEventId = getStoredActiveEventId();
  const activeEvent = Array.isArray(events)
    ? events.find((event) => String(event.id) === String(activeEventId))
    : null;

  if (!activeEvent) {
    if (activeEventId) clearStoredActiveEventId();
    return { activeEventId: "", activeEvent: null };
  }

  setStoredActiveEventId(String(activeEvent.id));
  return { activeEventId: String(activeEvent.id), activeEvent };
}

export async function resolveActiveEvent() {
  const events = await getEvents();
  return {
    events,
    ...resolveActiveEventFromEvents(events),
  };
}
