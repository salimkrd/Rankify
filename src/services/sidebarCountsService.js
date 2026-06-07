import { supabase } from "../lib/supabaseClient.js";
import { getCurrentUserId } from "./dashboardSupabase.js";

async function countRows(userId, tableName, filters = {}) {
  let query = supabase
    .from(tableName)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  Object.entries(filters).forEach(([column, value]) => {
    query = query.eq(column, value);
  });

  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
}

export async function getSidebarCounts(activeEventId) {
  const userId = await getCurrentUserId();
  const events = await countRows(userId, "events");

  if (!activeEventId) {
    return {
      events,
      teams: 0,
      participants: 0,
      categories: 0,
      programTemplates: 0,
      programResults: 0,
      teamStatusTemplates: 0,
      teamStatusResults: 0,
      framedPostTemplates: 0,
      framedPosts: 0,
      certificateTemplates: 0,
      certificateResults: 0,
    };
  }

  const eventFilter = { event_id: activeEventId };
  const [
    teams,
    participants,
    categories,
    programTemplates,
    programResults,
    teamStatusTemplates,
    teamStatusResults,
    framedPostTemplates,
    framedPosts,
    certificateTemplates,
    certificateResults,
  ] = await Promise.all([
    countRows(userId, "teams", eventFilter),
    countRows(userId, "participants", eventFilter),
    countRows(userId, "categories", eventFilter),
    countRows(userId, "program_templates", eventFilter),
    countRows(userId, "program_results", eventFilter),
    countRows(userId, "team_status_templates", eventFilter),
    countRows(userId, "team_status_results", eventFilter),
    countRows(userId, "framed_post_templates", eventFilter),
    countRows(userId, "framed_posts", eventFilter),
    countRows(userId, "certificate_templates", eventFilter),
    countRows(userId, "certificate_results", eventFilter),
  ]);

  return {
    events,
    teams,
    participants,
    categories,
    programTemplates,
    programResults,
    teamStatusTemplates,
    teamStatusResults,
    framedPostTemplates,
    framedPosts,
    certificateTemplates,
    certificateResults,
  };
}
