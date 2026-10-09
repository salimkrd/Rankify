import { supabase } from "../lib/supabaseClient.js";
import { formatSupabaseDate, getCurrentUserId, runSupabaseQuery } from "./dashboardSupabase.js";
import { getEvents } from "./eventsService.js";

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

import {
  isDataUrl,
  makeLightweightSvgPreview,
  sanitizePreviewData,
  validateTemplatePayloadSize,
} from "./templateAssetsService.js";

function templatePayload(userId, eventId, templateData) {
  const canvas = pickCanvas(templateData);
  const title = templateData.name || templateData.title || "Untitled Template";
  let previewImage = templateData.previewImage || templateData.preview || "";

  // Guard against massive data URLs in preview_image (strip or replace with lightweight SVG)
  if (isDataUrl(previewImage) && previewImage.length > 10000) {
    previewImage = makeLightweightSvgPreview(
      title,
      Number(canvas.width) || 800,
      Number(canvas.height) || 600
    );
  }

  const cleanTemplateData = JSON.parse(JSON.stringify(templateData || {}));

  // Ensure cleanTemplateData.previewImage does not duplicate a massive base64 string
  if (cleanTemplateData.previewImage && isDataUrl(cleanTemplateData.previewImage) && cleanTemplateData.previewImage.length > 10000) {
    cleanTemplateData.previewImage = previewImage;
  }

  // Sanitize previewData to prevent dummy winner photos from inflating the document
  if (cleanTemplateData.previewData) {
    cleanTemplateData.previewData = sanitizePreviewData(cleanTemplateData.previewData);
  }

  const payload = {
    user_id: userId,
    event_id: eventId,
    title,
    template_data: cleanTemplateData,
    canvas_width: Number(canvas.width || templateData.canvasWidth || templateData.width) || null,
    canvas_height: Number(canvas.height || templateData.canvasHeight || templateData.height) || null,
    preview_image: previewImage,
  };

  // Validate payload size before returning
  validateTemplatePayloadSize(payload);

  return payload;
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
    if (!id) throw new Error("Template ID is required.");
    const userId = await getCurrentUserId();
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .select("*")
        .eq("id", id)
        .single()
    );

    if (!row) {
      const notFoundErr = new Error("Template not found.");
      notFoundErr.code = "not-found";
      throw notFoundErr;
    }

    // Direct user ownership check
    if ((row.user_id && row.user_id === userId) || (row.userId && row.userId === userId)) {
      return mapTemplateRow(row);
    }

    // Older documents with missing ownership fields: determine ownership from trusted existing records
    const eventId = row.event_id || row.eventId;
    if ((!row.user_id && !row.userId) && eventId) {
      const userEvents = await getEvents().catch(() => []);
      const ownsEvent = userEvents.some((e) => String(e.id) === String(eventId));
      if (ownsEvent) {
        return mapTemplateRow(row);
      }
    }

    // Permission denied: do not assign ownership automatically to whoever opens the template
    const permError = new Error("Missing or insufficient permissions.");
    permError.code = "permission-denied";
    throw permError;
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
    if (!id) throw new Error("Template ID is required.");
    const userId = await getCurrentUserId();
    const existing = await getTemplateById(id);
    const eventId = templateData.eventId || templateData.event_id || existing.eventId;

    // Prevent unauthorized changes to event association
    if (existing.eventId && eventId && String(existing.eventId) !== String(eventId)) {
      throw new Error("Cannot change event association for existing template.");
    }

    const payload = templatePayload(userId, eventId, { ...templateData, eventId });
    const row = await runSupabaseQuery(
      supabase
        .from(tableName)
        .update(payload)
        .eq("id", id)
        .select("*")
        .single()
    );
    return mapTemplateRow(row);
  }

  async function deleteTemplate(id) {
    if (!id) throw new Error("Template ID is required.");
    const userId = await getCurrentUserId();
    await getTemplateById(id);
    await runSupabaseQuery(
      supabase.from(tableName).delete().eq("id", id)
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
