import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";

function pickCanvas(templateData = {}) {
  return templateData.canvas || {
    width: templateData.canvasWidth || templateData.width || 0,
    height: templateData.canvasHeight || templateData.height || 0,
  };
}

export function mapTemplateRow(row) {
  const templateData = row.template_data || {};
  return {
    ...templateData,
    templateData,
    template_data: templateData,
    id: row.id,
    eventId: row.event_id,
    name: row.title || templateData.name || templateData.title || "Untitled Template",
    title: row.title || templateData.title || templateData.name || "Untitled Template",
    previewImage: row.preview_image || templateData.previewImage || "",
    canvasWidth: row.canvas_width ?? templateData.canvasWidth ?? templateData.width,
    canvasHeight: row.canvas_height ?? templateData.canvasHeight ?? templateData.height,
    createdAt: templateData.createdAt || formatSupabaseDate(row.created_at),
    createdDate: row.created_at,
    updatedAt: row.updated_at,
  };
}

function templatePayload(userId, eventId, templateData) {
  const canvas = pickCanvas(templateData);
  const title = templateData.name || templateData.title || "Untitled Template";
  const previewImage = templateData.previewImage || templateData.preview || "";
  const cleanTemplateData = JSON.parse(JSON.stringify(templateData || {}));

  return {
    user_id: userId,
    event_id: eventId,
    title,
    template_data: cleanTemplateData,
    canvas_width: Number(canvas.width || templateData.canvasWidth || templateData.width) || null,
    canvas_height: Number(canvas.height || templateData.canvasHeight || templateData.height) || null,
    preview_image: previewImage,
  };
}

export function createTemplateService(tableName) {
  async function listTemplatesByEvent(eventId) {
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
    return rows.map(mapTemplateRow);
  }

  async function getTemplateById(id) {
    const userId = await getCurrentUserId();
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .single()
    );
    return mapTemplateRow(row);
  }

  async function createTemplate(eventId, templateData) {
    const userId = await getCurrentUserId();
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .insert(templatePayload(userId, eventId, { ...templateData, eventId }))
        .select("*")
        .single()
    );
    return mapTemplateRow(row);
  }

  async function updateTemplate(id, templateData) {
    const userId = await getCurrentUserId();
    const eventId = templateData.eventId || templateData.event_id;
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .update(templatePayload(userId, eventId, templateData))
        .eq("id", id)
        .eq("user_id", userId)
        .select("*")
        .single()
    );
    return mapTemplateRow(row);
  }

  async function deleteTemplate(id) {
    const userId = await getCurrentUserId();
    await runSupabaseQuery(
      supabase.from(tableName).delete().eq("id", id).eq("user_id", userId)
    );
    return true;
  }

  async function duplicateTemplate(template, overrides = {}) {
    const copy = {
      ...template,
      ...overrides,
      name: overrides.name || `${template.name || template.title || "Template"} Copy`,
    };
    delete copy.id;
    delete copy.createdAt;
    delete copy.updatedAt;
    return createTemplate(overrides.eventId || template.eventId, copy);
  }

  return {
    listTemplatesByEvent,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
}
