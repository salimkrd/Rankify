import { supabase } from "../lib/supabaseClient.js";

const TABLE_NAME = "public_templates";

export const PUBLIC_TEMPLATE_TYPES = {
  PROGRAM: "program_template",
  TEAM_STATUS: "team_status_template",
  FRAMED_POST: "framed_post_template",
  CERTIFICATE: "certificate_template",
};

export function normalizePublicTemplateType(type) {
  const normalized = String(type || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases = {
    program: PUBLIC_TEMPLATE_TYPES.PROGRAM,
    program_template: PUBLIC_TEMPLATE_TYPES.PROGRAM,
    team_status: PUBLIC_TEMPLATE_TYPES.TEAM_STATUS,
    team_status_template: PUBLIC_TEMPLATE_TYPES.TEAM_STATUS,
    framed_post: PUBLIC_TEMPLATE_TYPES.FRAMED_POST,
    framed_post_template: PUBLIC_TEMPLATE_TYPES.FRAMED_POST,
    certificate: PUBLIC_TEMPLATE_TYPES.CERTIFICATE,
    certificate_template: PUBLIC_TEMPLATE_TYPES.CERTIFICATE,
  };

  return aliases[normalized] || normalized;
}

function toPublicTemplatePayload(templateData = {}) {
  const payload = {};

  if ("type" in templateData) payload.type = normalizePublicTemplateType(templateData.type);
  if ("name" in templateData) payload.name = templateData.name;
  if (!("name" in templateData) && "title" in templateData) payload.name = templateData.title;
  if ("description" in templateData) payload.description = templateData.description;
  if ("templateData" in templateData) payload.template_data = templateData.templateData;
  if ("template_data" in templateData) payload.template_data = templateData.template_data;
  if ("previewImage" in templateData) payload.preview_image_url = templateData.previewImage;
  if ("previewImageUrl" in templateData) payload.preview_image_url = templateData.previewImageUrl;
  if ("preview_image_url" in templateData) payload.preview_image_url = templateData.preview_image_url;
  if ("backgroundImage" in templateData) payload.background_image_url = templateData.backgroundImage;
  if ("backgroundImageUrl" in templateData) payload.background_image_url = templateData.backgroundImageUrl;
  if ("background_image_url" in templateData) payload.background_image_url = templateData.background_image_url;
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
  const displayTitle = row.name || "Untitled Template";
  return {
    ...row,
    name: displayTitle,
    title: displayTitle,
    displayTitle,
    templateData: row.template_data,
    previewImage: row.preview_image_url || row.preview_image || "",
    previewImageUrl: row.preview_image_url || row.preview_image || "",
    backgroundImage: row.background_image_url || row.background_image || "",
    backgroundImageUrl: row.background_image_url || row.background_image || "",
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
  const normalizedType = type ? normalizePublicTemplateType(type) : "";
  let query = supabase
    .from(TABLE_NAME)
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (normalizedType) query = query.eq("type", normalizedType);
  return runQuery(query);
}

export function buildUserTemplateFromPublicTemplate(publicTemplate, eventId, options = {}) {
  const sourceData = publicTemplate?.templateData || publicTemplate?.template_data || {};
  const copiedData = JSON.parse(JSON.stringify(sourceData || {}));
  const canvas = copiedData.canvas || {};
  const title =
    options.name ||
    publicTemplate?.displayTitle ||
    publicTemplate?.name ||
    publicTemplate?.title ||
    copiedData.name ||
    copiedData.title ||
    "Untitled Template";
  const previewImage =
    publicTemplate?.previewImage ||
    publicTemplate?.previewImageUrl ||
    copiedData.previewImage ||
    copiedData.preview ||
    "";
  const backgroundImage =
    publicTemplate?.backgroundImage ||
    publicTemplate?.backgroundImageUrl ||
    copiedData.backgroundImage ||
    canvas.backgroundImage ||
    "";
  const canvasWidth =
    publicTemplate?.canvasWidth ||
    copiedData.canvasWidth ||
    copiedData.width ||
    canvas.width;
  const canvasHeight =
    publicTemplate?.canvasHeight ||
    copiedData.canvasHeight ||
    copiedData.height ||
    canvas.height;

  delete copiedData.id;
  delete copiedData.createdAt;
  delete copiedData.createdDate;
  delete copiedData.updatedAt;
  delete copiedData.updatedDate;

  return {
    ...copiedData,
    eventId,
    name: title,
    title,
    source: "public",
    publicTemplateId: publicTemplate?.id,
    previewImage,
    backgroundImage,
    canvasWidth,
    canvasHeight,
    canvas: copiedData.canvas || {
      width: canvasWidth,
      height: canvasHeight,
      backgroundImage,
      backgroundColor: copiedData.backgroundColor || "#ffffff",
    },
    ...options.overrides,
  };
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
