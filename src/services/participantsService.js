import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";
import { getDashboardCache, notifyDashboardCacheUpdated, setDashboardCache } from "./dashboardCache.js";

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

async function fetchParticipantsFromSupabase(userId, eventId) {
  const rows = await runSupabaseQuery(
    supabase
      .from("participants")
      .select("id,user_id,event_id,team_id,team_name,category_id,category_name,name,created_at,updated_at")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapParticipant);
}

export async function getParticipantsByEvent(eventId, options = {}) {
  const { background = true } = options;
  if (!eventId) return [];
  const userId = await getCurrentUserId();
  const cached = getDashboardCache("participants", userId, eventId);

  if (cached) {
    if (background) {
      fetchParticipantsFromSupabase(userId, eventId)
        .then((fresh) => {
          setDashboardCache("participants", userId, eventId, fresh);
          notifyDashboardCacheUpdated("participants", eventId);
        })
        .catch((error) => console.error("Unable to refresh cached participants.", error));
    }
    return cached;
  }

  const fresh = await fetchParticipantsFromSupabase(userId, eventId);
  setDashboardCache("participants", userId, eventId, fresh);
  return fresh;
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
  const participant = mapParticipant(row);
  const cached = getDashboardCache("participants", userId, eventId) || [];
  setDashboardCache("participants", userId, eventId, [participant, ...cached.filter((item) => item.id !== participant.id)]);
  notifyDashboardCacheUpdated("participants", eventId);
  return participant;
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
  const participant = mapParticipant(row);
  const eventId = participant.eventId || participantData.eventId;
  if (eventId) {
    const cached = getDashboardCache("participants", userId, eventId) || [];
    setDashboardCache("participants", userId, eventId, cached.map((item) => (item.id === participant.id ? participant : item)));
    notifyDashboardCacheUpdated("participants", eventId);
  }
  return participant;
}

export async function deleteParticipant(id) {
  const userId = await getCurrentUserId();
  const existing = await runSupabaseQuery(
    supabase.from("participants").select("event_id").eq("id", id).eq("user_id", userId).maybeSingle()
  );
  await runSupabaseQuery(supabase.from("participants").delete().eq("id", id).eq("user_id", userId));
  if (existing?.event_id) {
    const cached = getDashboardCache("participants", userId, existing.event_id) || [];
    setDashboardCache("participants", userId, existing.event_id, cached.filter((item) => item.id !== id));
    notifyDashboardCacheUpdated("participants", existing.event_id);
  }
  return true;
}
