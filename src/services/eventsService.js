import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";

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

export async function getEvents() {
  const userId = await getCurrentUserId();
  const rows = await runSupabaseQuery(
    supabase
      .from("events")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapEvent);
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
  return mapEvent(row);
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
  return mapEvent(row);
}

export async function deleteEvent(id) {
  const userId = await getCurrentUserId();
  await runSupabaseQuery(supabase.from("events").delete().eq("id", id).eq("user_id", userId));
  return true;
}

