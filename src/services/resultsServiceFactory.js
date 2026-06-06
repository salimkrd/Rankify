import { supabase } from "../lib/supabaseClient.js";
import { getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";

function cleanJson(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidOrNull(value) {
  const candidate = String(value || "");
  return UUID_PATTERN.test(candidate) ? candidate : null;
}

function mapResultRow(row) {
  const resultData = row.result_data || {};
  return {
    ...resultData,
    id: row.id,
    eventId: row.event_id,
    templateId: row.template_id || resultData.templateId || "",
    title: row.title || resultData.title || resultData.name || resultData.programName || resultData.statusName || resultData.candidateName || "Untitled",
    previewImage: row.preview_image || resultData.previewImage || "",
    createdAt: resultData.createdAt || row.created_at,
    created: resultData.created || row.created_at,
    updatedAt: row.updated_at,
  };
}

function resultTitle(resultData = {}) {
  return (
    resultData.title ||
    resultData.name ||
    resultData.programName ||
    resultData.statusName ||
    resultData.candidateName ||
    resultData.templateName ||
    "Untitled"
  );
}

function resultPayload(userId, eventId, resultData) {
  return {
    user_id: userId,
    event_id: eventId,
    template_id: uuidOrNull(resultData.templateId),
    title: resultTitle(resultData),
    result_data: cleanJson({ ...resultData, eventId }),
    preview_image: resultData.previewImage || "",
  };
}

export function createResultService(tableName) {
  async function listResultsByEvent(eventId) {
    if (!eventId) return [];
    const userId = await getCurrentUserId();
    const rows = await runSupabaseQuery(
      supabase
        .from(tableName)
        .select("*")
        .eq("user_id", userId)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
    );
    return rows.map(mapResultRow);
  }

  async function getResultById(id) {
    const userId = await getCurrentUserId();
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single()
    );
    return mapResultRow(row);
  }

  async function createResult(eventId, resultData) {
    const userId = await getCurrentUserId();
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .insert(resultPayload(userId, eventId, resultData))
        .select("*")
        .single()
    );
    return mapResultRow(row);
  }

  async function updateResult(id, resultData) {
    const userId = await getCurrentUserId();
    const eventId = resultData.eventId || resultData.event_id;
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .update(resultPayload(userId, eventId, resultData))
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single()
    );
    return mapResultRow(row);
  }

  async function deleteResult(id) {
    const userId = await getCurrentUserId();
    await runSupabaseQuery(supabase.from(tableName).delete().eq("id", id).eq("user_id", userId));
    return true;
  }

  return {
    listResultsByEvent,
    getResultById,
    createResult,
    updateResult,
    deleteResult,
  };
}
