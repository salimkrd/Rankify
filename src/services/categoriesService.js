import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";
import { getDashboardCache, notifyDashboardCacheUpdated, setDashboardCache } from "./dashboardCache.js";

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

async function fetchCategoriesFromSupabase(userId, eventId) {
  const rows = await runSupabaseQuery(
    supabase
      .from("categories")
      .select("id,user_id,event_id,name,created_at,updated_at")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
  );
  return rows.map(mapCategory);
}

export async function getCategoriesByEvent(eventId, options = {}) {
  const { background = true } = options;
  if (!eventId) return [];
  const userId = await getCurrentUserId();
  const cached = getDashboardCache("categories", userId, eventId);

  if (cached) {
    if (background) {
      fetchCategoriesFromSupabase(userId, eventId)
        .then((fresh) => {
          setDashboardCache("categories", userId, eventId, fresh);
          notifyDashboardCacheUpdated("categories", eventId);
        })
        .catch((error) => console.error("Unable to refresh cached categories.", error));
    }
    return cached;
  }

  const fresh = await fetchCategoriesFromSupabase(userId, eventId);
  setDashboardCache("categories", userId, eventId, fresh);
  return fresh;
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
  const category = mapCategory(row);
  const cached = getDashboardCache("categories", userId, eventId) || [];
  setDashboardCache("categories", userId, eventId, [category, ...cached.filter((item) => item.id !== category.id)]);
  notifyDashboardCacheUpdated("categories", eventId);
  return category;
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
  const category = mapCategory(row);
  const eventId = category.eventId || categoryData.eventId;
  if (eventId) {
    const cached = getDashboardCache("categories", userId, eventId) || [];
    setDashboardCache("categories", userId, eventId, cached.map((item) => (item.id === category.id ? category : item)));
    notifyDashboardCacheUpdated("categories", eventId);
  }
  return category;
}

export async function deleteCategory(id) {
  const userId = await getCurrentUserId();
  const existing = await runSupabaseQuery(
    supabase.from("categories").select("event_id").eq("id", id).eq("user_id", userId).maybeSingle()
  );
  await runSupabaseQuery(supabase.from("categories").delete().eq("id", id).eq("user_id", userId));
  if (existing?.event_id) {
    const cached = getDashboardCache("categories", userId, existing.event_id) || [];
    setDashboardCache("categories", userId, existing.event_id, cached.filter((item) => item.id !== id));
    notifyDashboardCacheUpdated("categories", existing.event_id);
  }
  return true;
}
