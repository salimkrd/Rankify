import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";
import { getDashboardCache, notifyDashboardCacheUpdated, setDashboardCache } from "./dashboardCache.js";

function mapEvent(row) {
  return {
    id: row.id,
    name: row.name || "",
    organizer: row.description || "",
    description: row.description || "",
    date: row.date || "",
    location: row.location || "",
    created: formatSupabaseDate(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchEventsFromSupabase(userId) {
  const rows = await runSupabaseQuery(
    supabase
      .from("events")
      .select("id,user_id,name,date,location,description,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapEvent);
}

export async function getEvents(options = {}) {
  const { background = true } = options;
  const userId = await getCurrentUserId();
  const cached = getDashboardCache("events", userId);

  if (cached) {
    if (background) {
      fetchEventsFromSupabase(userId)
        .then((fresh) => {
          setDashboardCache("events", userId, "", fresh);
          notifyDashboardCacheUpdated("events");
        })
        .catch((error) => console.error("Unable to refresh cached events.", error));
    }
    return cached;
  }

  const fresh = await fetchEventsFromSupabase(userId);
  setDashboardCache("events", userId, "", fresh);
  return fresh;
}

export async function createEvent(eventData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("events")
      .insert({
        user_id: userId,
        name: eventData.name,
        date: eventData.date || "",
        location: eventData.location || "",
        description: eventData.description || eventData.organizer || "",
      })
      .select("*")
      .single()
  );
  const event = mapEvent(row);
  const cached = getDashboardCache("events", userId) || [];
  setDashboardCache("events", userId, "", [event, ...cached.filter((item) => item.id !== event.id)]);
  notifyDashboardCacheUpdated("events");
  return event;
}

export async function updateEvent(id, eventData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("events")
      .update({
        name: eventData.name,
        date: eventData.date || "",
        location: eventData.location || "",
        description: eventData.description || eventData.organizer || "",
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single()
  );
  const event = mapEvent(row);
  const cached = getDashboardCache("events", userId) || [];
  setDashboardCache(
    "events",
    userId,
    "",
    cached.map((item) => (item.id === event.id ? event : item))
  );
  notifyDashboardCacheUpdated("events");
  return event;
}

export async function deleteEvent(id) {
  const userId = await getCurrentUserId();
  await runSupabaseQuery(supabase.from("events").delete().eq("id", id).eq("user_id", userId));
  const cached = getDashboardCache("events", userId) || [];
  setDashboardCache("events", userId, "", cached.filter((item) => item.id !== id));
  notifyDashboardCacheUpdated("events");
  return true;
}
