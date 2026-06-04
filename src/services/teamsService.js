import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";

function mapTeam(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name || "",
    created: formatSupabaseDate(row.created_at),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getTeamsByEvent(eventId) {
  if (!eventId) return [];
  const userId = await getCurrentUserId();
  const rows = await runSupabaseQuery(
    supabase
      .from("teams")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapTeam);
}

export async function createTeam(eventId, teamData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("teams")
      .insert({ user_id: userId, event_id: eventId, name: teamData.name })
      .select("*")
      .single()
  );
  return mapTeam(row);
}

export async function updateTeam(id, teamData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("teams")
      .update({ name: teamData.name })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single()
  );
  return mapTeam(row);
}

export async function deleteTeam(id) {
  const userId = await getCurrentUserId();
  await runSupabaseQuery(supabase.from("teams").delete().eq("id", id).eq("user_id", userId));
  return true;
}

