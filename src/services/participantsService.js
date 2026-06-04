import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";

function mapParticipant(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    teamId: row.team_id,
    teamName: row.team_name || "",
    categoryId: row.category_id,
    categoryName: row.category_name || "",
    name: row.name || "",
    createdAt: formatSupabaseDate(row.created_at),
    createdDate: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getParticipantsByEvent(eventId) {
  if (!eventId) return [];
  const userId = await getCurrentUserId();
  const rows = await runSupabaseQuery(
    supabase
      .from("participants")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapParticipant);
}

export async function createParticipant(eventId, participantData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("participants")
      .insert({
        user_id: userId,
        event_id: eventId,
        team_id: participantData.teamId,
        team_name: participantData.teamName || "",
        category_id: participantData.categoryId,
        category_name: participantData.categoryName || "",
        name: participantData.name,
      })
      .select("*")
      .single()
  );
  return mapParticipant(row);
}

export async function updateParticipant(id, participantData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("participants")
      .update({
        team_id: participantData.teamId,
        team_name: participantData.teamName || "",
        category_id: participantData.categoryId,
        category_name: participantData.categoryName || "",
        name: participantData.name,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single()
  );
  return mapParticipant(row);
}

export async function deleteParticipant(id) {
  const userId = await getCurrentUserId();
  await runSupabaseQuery(supabase.from("participants").delete().eq("id", id).eq("user_id", userId));
  return true;
}

