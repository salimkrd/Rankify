import { supabase } from "../lib/supabaseClient.js";

const TABLE_NAME = "public_templates";

function toPublicTemplatePayload(templateData = {}) {
  const payload = {};

  if ("type" in templateData) payload.type = templateData.type;
  if ("name" in templateData) payload.name = templateData.name;
  if ("description" in templateData) payload.description = templateData.description;
  if ("templateData" in templateData) payload.template_data = templateData.templateData;
  if ("template_data" in templateData) payload.template_data = templateData.template_data;
  if ("previewImage" in templateData) payload.preview_image = templateData.previewImage;
  if ("preview_image" in templateData) payload.preview_image = templateData.preview_image;
  if ("backgroundImage" in templateData) payload.background_image = templateData.backgroundImage;
  if ("background_image" in templateData) payload.background_image = templateData.background_image;
  if ("canvasWidth" in templateData) payload.canvas_width = templateData.canvasWidth;
  if ("canvas_width" in templateData) payload.canvas_width = templateData.canvas_width;
  if ("canvasHeight" in templateData) payload.canvas_height = templateData.canvasHeight;
  if ("canvas_height" in templateData) payload.canvas_height = templateData.canvas_height;
  if ("isPublished" in templateData) payload.is_published = templateData.isPublished;
  if ("is_published" in templateData) payload.is_published = templateData.is_published;

  return payload;
}

function mapPublicTemplate(row) {
  if (!row) return row;
  return {
    ...row,
    templateData: row.template_data,
    previewImage: row.preview_image,
    backgroundImage: row.background_image,
    canvasWidth: row.canvas_width,
    canvasHeight: row.canvas_height,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

async function runQuery(query) {
  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data.map(mapPublicTemplate) : mapPublicTemplate(data);
}

export async function getPublishedPublicTemplates(type) {
  let query = supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (type) query = query.eq("type", type);
  return runQuery(query);
}

export async function getAllPublicTemplates() {
  return runQuery(
    supabase
      .from(TABLE_NAME)
      .select("*")
      .order("created_at", { ascending: false })
  );
}

export async function createPublicTemplate(templateData) {
  return runQuery(
    supabase
      .from(TABLE_NAME)
      .insert(toPublicTemplatePayload(templateData))
      .select("*")
      .single()
  );
}

export async function updatePublicTemplate(id, templateData) {
  return runQuery(
    supabase
      .from(TABLE_NAME)
      .update(toPublicTemplatePayload(templateData))
      .eq("id", id)
      .select("*")
      .single()
  );
}

export async function deletePublicTemplate(id) {
  const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function publishPublicTemplate(id, isPublished) {
  return runQuery(
    supabase
      .from(TABLE_NAME)
      .update({ is_published: Boolean(isPublished) })
      .eq("id", id)
      .select("*")
      .single()
  );
}
