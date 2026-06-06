import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";
import { getDashboardCache, notifyDashboardCacheUpdated, setDashboardCache } from "./dashboardCache.js";

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

async function fetchTeamsFromSupabase(userId, eventId) {
  const rows = await runSupabaseQuery(
    supabase
      .from("teams")
      .select("id,user_id,event_id,name,created_at,updated_at")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapTeam);
}

export async function getTeamsByEvent(eventId, options = {}) {
  const { background = true } = options;
  if (!eventId) return [];
  const userId = await getCurrentUserId();
  const cached = getDashboardCache("teams", userId, eventId);

  if (cached) {
    if (background) {
      fetchTeamsFromSupabase(userId, eventId)
        .then((fresh) => {
          setDashboardCache("teams", userId, eventId, fresh);
          notifyDashboardCacheUpdated("teams", eventId);
        })
        .catch((error) => console.error("Unable to refresh cached teams.", error));
    }
    return cached;
  }

  const fresh = await fetchTeamsFromSupabase(userId, eventId);
  setDashboardCache("teams", userId, eventId, fresh);
  return fresh;
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
  const team = mapTeam(row);
  const cached = getDashboardCache("teams", userId, eventId) || [];
  setDashboardCache("teams", userId, eventId, [team, ...cached.filter((item) => item.id !== team.id)]);
  notifyDashboardCacheUpdated("teams", eventId);
  return team;
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
  const team = mapTeam(row);
  const eventId = team.eventId || teamData.eventId;
  if (eventId) {
    const cached = getDashboardCache("teams", userId, eventId) || [];
    setDashboardCache("teams", userId, eventId, cached.map((item) => (item.id === team.id ? team : item)));
    notifyDashboardCacheUpdated("teams", eventId);
  }
  return team;
}

export async function deleteTeam(id) {
  const userId = await getCurrentUserId();
  const existing = await runSupabaseQuery(
    supabase.from("teams").select("event_id").eq("id", id).eq("user_id", userId).maybeSingle()
  );
  await runSupabaseQuery(supabase.from("teams").delete().eq("id", id).eq("user_id", userId));
  if (existing?.event_id) {
    const cached = getDashboardCache("teams", userId, existing.event_id) || [];
    setDashboardCache("teams", userId, existing.event_id, cached.filter((item) => item.id !== id));
    notifyDashboardCacheUpdated("teams", existing.event_id);
  }
  return true;
}
