import { supabase } from "../lib/supabaseClient.js";
import { getCurrentUserId } from "./dashboardSupabase.js";

const EVENT_COUNT_TABLES = {
  teams: "teams",
  participants: "participants",
  categories: "categories",
  programTemplates: "program_templates",
  programResults: "program_results",
  teamStatusTemplates: "team_status_templates",
  teamStatusResults: "team_status_results",
  framedPostTemplates: "framed_post_templates",
  framedPosts: "framed_posts",
  certificateTemplates: "certificate_templates",
  certificateResults: "certificate_results",
};

const pendingCounts = new Map();

async function countRows(userId, tableName, eventId) {
  let query = supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (eventId) query = query.eq("event_id", eventId);

  const { count, error } = await query;
  if (error) throw error;
  if (typeof count !== "number") {
    throw new Error(`The count for ${tableName} was not returned.`);
  }
  return count;
}

async function readCount(counts, errors, key, userId, tableName, eventId) {
  try {
    counts[key] = await countRows(userId, tableName, eventId);
  } catch (error) {
    errors[key] = error;
    console.error(`Unable to load ${key} count from ${tableName}.`, error);
  }
}

async function fetchCounts(userId, activeEventId) {
  const counts = {};
  const errors = {};
  const tasks = [readCount(counts, errors, "events", userId, "events")];

  if (activeEventId) {
    for (const [key, tableName] of Object.entries(EVENT_COUNT_TABLES)) {
      tasks.push(readCount(counts, errors, key, userId, tableName, activeEventId));
    }
  } else {
    for (const key of Object.keys(EVENT_COUNT_TABLES)) counts[key] = 0;
  }

  await Promise.all(tasks);
  return { ...counts, errors };
}

export async function getSidebarCounts(activeEventId) {
  const userId = await getCurrentUserId();
  const eventId = activeEventId ? String(activeEventId) : "";
  const key = JSON.stringify([userId, eventId]);
  let request = pendingCounts.get(key);

  if (!request) {
    request = fetchCounts(userId, eventId);
    pendingCounts.set(key, request);
    request.then(
      () => {
        if (pendingCounts.get(key) === request) pendingCounts.delete(key);
      },
      () => {
        if (pendingCounts.get(key) === request) pendingCounts.delete(key);
      }
    );
  }

  return request;
}
