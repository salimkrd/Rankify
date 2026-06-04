import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";

function mapCategory(row) {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name || "",
    createdAt: formatSupabaseDate(row.created_at),
    createdDate: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCategoriesByEvent(eventId) {
  if (!eventId) return [];
  const userId = await getCurrentUserId();
  const rows = await runSupabaseQuery(
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapCategory);
}

export async function createCategory(eventId, categoryData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("categories")
      .insert({ user_id: userId, event_id: eventId, name: categoryData.name })
      .select("*")
      .single()
  );
  return mapCategory(row);
}

export async function updateCategory(id, categoryData) {
  const userId = await getCurrentUserId();
  const row = await runSupabaseQuery(
    supabase
      .from("categories")
      .update({ name: categoryData.name })
      .eq("id", id)
      .eq("user_id", userId)
      .select("*")
      .single()
  );
  return mapCategory(row);
}

export async function deleteCategory(id) {
  const userId = await getCurrentUserId();
  await runSupabaseQuery(supabase.from("categories").delete().eq("id", id).eq("user_id", userId));
  return true;
}

