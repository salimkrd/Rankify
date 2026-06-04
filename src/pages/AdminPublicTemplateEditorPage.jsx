import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Eye, FileJson, Save, Wand2 } from "lucide-react";
import {
  createPublicTemplate,
  getAllPublicTemplates,
  updatePublicTemplate,
} from "../services/publicTemplatesService.js";

const templateTypes = [
  ["program_template", "Program Template"],
  ["team_status_template", "Team Status Template"],
  ["framed_post_template", "Framed Post Template"],
  ["certificate_template", "Certificate Template"],
];

const defaultTemplateData = {
  name: "New Public Template",
  canvas: {
    width: 1080,
    height: 1350,
    backgroundImage: "",
  },
  elements: [],
};

const emptyForm = () => ({
  name: "",
  type: "program_template",
  description: "",
  canvasWidth: 1080,
  canvasHeight: 1350,
  templateDataText: JSON.stringify(defaultTemplateData, null, 2),
  previewImage: "",
  backgroundImage: "",
  isPublished: false,
});

function extractTemplateData(row) {
  return row?.templateData || row?.template_data || {};
}

function getCanvasDimensions(templateData = {}) {
  const canvas = templateData.canvas || {};
  const width = Number(templateData.canvasWidth || templateData.width || canvas.width || templateData.size?.width || 0);
  const height = Number(templateData.canvasHeight || templateData.height || canvas.height || templateData.size?.height || 0);
  return {
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
  };
}

function getBackgroundImage(templateData = {}) {
  return (
    templateData.backgroundImage ||
    templateData.frameImageUrl ||
    templateData.frameImage ||
    templateData.canvas?.backgroundImage ||
    templateData.canvas?.background ||
    ""
  );
}

function getElementCount(templateData = {}) {
  if (Array.isArray(templateData.elements)) return templateData.elements.length;
  if (Array.isArray(templateData.customFields)) return templateData.customFields.length;
  if (Array.isArray(templateData.fields)) return templateData.fields.length;
  return 0;
}

export default function AdminPublicTemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);
  const [form, setForm] = useState(emptyForm());
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [jsonMessage, setJsonMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;

    let active = true;
    async function loadTemplate() {
      setLoading(true);
      setError("");
      try {
        const templates = await getAllPublicTemplates();
        const template = templates.find((item) => String(item.id) === String(id));
        if (!template) throw new Error("Public template not found.");
        const templateData = extractTemplateData(template);
        if (!active) return;
        setForm({
          name: template.name || "",
          type: template.type || "program_template",
          description: template.description || "",
          canvasWidth: Number(template.canvasWidth || template.canvas_width || templateData?.canvas?.width || 1080),
          canvasHeight: Number(template.canvasHeight || template.canvas_height || templateData?.canvas?.height || 1350),
          templateDataText: JSON.stringify(templateData || {}, null, 2),
          previewImage: template.previewImage || template.preview_image || "",
          backgroundImage: template.backgroundImage || template.background_image || templateData?.canvas?.backgroundImage || "",
          isPublished: Boolean(template.isPublished ?? template.is_published),
        });
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load public template.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTemplate();
    return () => {
      active = false;
    };
  }, [id, isEditMode]);

  const parsedTemplateData = useMemo(() => {
    try {
      return { value: JSON.parse(form.templateDataText || "{}"), error: "" };
    } catch (jsonError) {
      return { value: null, error: jsonError.message };
    }
  }, [form.templateDataText]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function applyJsonText(value, options = {}) {
    const { format = false, showMessage = false } = options;

    try {
      const parsed = JSON.parse(value || "{}");
      const dimensions = getCanvasDimensions(parsed);
      const backgroundImage = getBackgroundImage(parsed);
      setForm((current) => ({
        ...current,
        templateDataText: format ? JSON.stringify(parsed, null, 2) : value,
        canvasWidth: dimensions.width || current.canvasWidth,
        canvasHeight: dimensions.height || current.canvasHeight,
        backgroundImage: backgroundImage || current.backgroundImage,
        name: current.name || parsed.name || parsed.title || current.name,
      }));
      setJsonMessage(showMessage ? "JSON is valid." : "");
      setError("");
      return parsed;
    } catch (jsonError) {
      setForm((current) => ({ ...current, templateDataText: value }));
      setJsonMessage("");
      if (showMessage) setError(`Template data JSON is invalid: ${jsonError.message}`);
      return null;
    }
  }

  function handleFormatJson() {
    applyJsonText(form.templateDataText, { format: true, showMessage: true });
  }

  function handleValidateJson() {
    applyJsonText(form.templateDataText, { showMessage: true });
  }

  function handlePreviewTemplate() {
    const parsed = applyJsonText(form.templateDataText, { showMessage: true });
    if (parsed) setPreviewOpen(true);
  }

  function handleJsonFileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      applyJsonText(String(reader.result || ""), { format: true, showMessage: true });
    };
    reader.onerror = () => setError("Unable to read the selected JSON file.");
    reader.readAsText(file);
    event.target.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (parsedTemplateData.error) {
      setError(`Template data JSON is invalid: ${parsedTemplateData.error}`);
      return;
    }

    setSaving(true);
    try {
      const templateData = {
        ...parsedTemplateData.value,
        canvas: {
          ...(parsedTemplateData.value?.canvas || {}),
          width: Number(form.canvasWidth) || 1080,
          height: Number(form.canvasHeight) || 1350,
          backgroundImage: form.backgroundImage.trim(),
        },
      };

      const payload = {
        name: form.name.trim(),
        type: form.type,
        description: form.description.trim(),
        canvasWidth: Number(form.canvasWidth) || 1080,
        canvasHeight: Number(form.canvasHeight) || 1350,
        templateData,
        previewImage: form.previewImage.trim(),
        backgroundImage: form.backgroundImage.trim(),
        isPublished: form.isPublished,
      };

      if (isEditMode) await updatePublicTemplate(id, payload);
      else await createPublicTemplate(payload);
      navigate("/admin/public-templates");
    } catch (saveError) {
      setError(saveError.message || "Unable to save public template.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="app-page min-h-screen overflow-x-hidden px-6 py-8 max-sm:px-4">
      <div className="mx-auto max-w-[980px]">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link to="/admin/public-templates" className="app-muted inline-flex items-center gap-2 text-sm font-semibold hover:text-[var(--app-heading)]">
              <ArrowLeft size={16} strokeWidth={1.9} aria-hidden="true" />
              Back to public templates
            </Link>
            <h1 className="app-heading mt-3 text-3xl font-extrabold">
              {isEditMode ? "Edit Public Template" : "New Public Template"}
            </h1>
            <p className="app-muted mt-2 text-base">Templates saved here are available to Explore Public Templates once published.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="app-card rounded-xl border p-6 shadow-sm max-sm:p-4">
          {loading ? (
            <div className="py-10 text-center text-sm font-semibold text-[var(--app-muted)]">Loading template...</div>
          ) : (
            <>
              {error ? <div className="mb-5 rounded-md border border-[var(--app-danger)] bg-[var(--app-danger-bg-soft)] px-4 py-3 text-sm text-[var(--app-danger)]">{error}</div> : null}

              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)]">
                  Title
                  <input
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    required
                    className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)]">
                  Type
                  <select
                    value={form.type}
                    onChange={(event) => updateField("type", event.target.value)}
                    required
                    className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  >
                    {templateTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)] md:col-span-2">
                  Description
                  <textarea
                    value={form.description}
                    onChange={(event) => updateField("description", event.target.value)}
                    rows={3}
                    className="app-input min-h-[92px] rounded-md border px-3 py-2 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)]">
                  Canvas Width
                  <input
                    type="number"
                    min="1"
                    value={form.canvasWidth}
                    onChange={(event) => updateField("canvasWidth", event.target.value)}
                    required
                    className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)]">
                  Canvas Height
                  <input
                    type="number"
                    min="1"
                    value={form.canvasHeight}
                    onChange={(event) => updateField("canvasHeight", event.target.value)}
                    required
                    className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)] md:col-span-2">
                  Preview Image URL
                  <input
                    type="url"
                    value={form.previewImage}
                    onChange={(event) => updateField("previewImage", event.target.value)}
                    placeholder="https://..."
                    className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)] md:col-span-2">
                  Background Image URL
                  <input
                    type="url"
                    value={form.backgroundImage}
                    onChange={(event) => updateField("backgroundImage", event.target.value)}
                    placeholder="https://..."
                    className="app-input h-11 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-bold text-[var(--app-text)] md:col-span-2">
                  Template Data JSON
                  <textarea
                    value={form.templateDataText}
                    onChange={(event) => applyJsonText(event.target.value)}
                    rows={16}
                    spellCheck="false"
                    className="app-input min-h-[320px] rounded-md border px-3 py-2 font-mono text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]"
                  />
                  {parsedTemplateData.error ? <span className="text-xs font-semibold text-[var(--app-danger)]">Invalid JSON: {parsedTemplateData.error}</span> : null}
                  {jsonMessage ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--app-success)]"><CheckCircle2 size={14} />{jsonMessage}</span> : null}
                </label>

                <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-elevated)] p-4 md:col-span-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="app-card inline-flex min-h-[40px] cursor-pointer items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold hover:bg-[var(--app-surface-elevated)]">
                      <FileJson size={17} strokeWidth={1.9} aria-hidden="true" />
                      Import JSON File
                      <input type="file" accept="application/json,.json" onChange={handleJsonFileUpload} className="sr-only" />
                    </label>
                    <button type="button" onClick={handleFormatJson} className="app-card inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold hover:bg-[var(--app-surface-elevated)]">
                      <Wand2 size={17} strokeWidth={1.9} aria-hidden="true" />
                      Format JSON
                    </button>
                    <button type="button" onClick={handleValidateJson} className="app-card inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold hover:bg-[var(--app-surface-elevated)]">
                      <CheckCircle2 size={17} strokeWidth={1.9} aria-hidden="true" />
                      Validate JSON
                    </button>
                    <button type="button" onClick={handlePreviewTemplate} className="app-card inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border px-4 text-sm font-bold hover:bg-[var(--app-surface-elevated)]">
                      <Eye size={17} strokeWidth={1.9} aria-hidden="true" />
                      Preview Template
                    </button>
                  </div>
                  <p className="app-muted mt-3 text-sm">Paste JSON from a Rankify template editor, upload a JSON file, or keep editing manually.</p>
                </div>

                <label className="flex items-center gap-3 text-sm font-bold text-[var(--app-text)] md:col-span-2">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(event) => updateField("isPublished", event.target.checked)}
                    className="h-5 w-5"
                  />
                  Published
                </label>
              </div>

              <div className="mt-7 flex flex-wrap justify-end gap-3">
                <Link to="/admin/public-templates" className="app-card inline-flex min-h-[42px] items-center justify-center rounded-md border px-5 text-sm font-bold hover:bg-[var(--app-surface-elevated)]">
                  Cancel
                </Link>
                <button type="submit" disabled={saving || Boolean(parsedTemplateData.error)} className="app-success-btn inline-flex min-h-[42px] items-center justify-center gap-2 rounded-md px-5 text-sm font-bold shadow-sm disabled:cursor-not-allowed disabled:opacity-60">
                  <Save size={17} strokeWidth={1.9} aria-hidden="true" />
                  {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </>
          )}
        </form>

        {previewOpen && !parsedTemplateData.error ? (
          <div className="app-card mt-6 rounded-xl border p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="app-heading text-xl font-extrabold">Template Preview</h2>
                <p className="app-muted mt-1 text-sm">Preview based on the current JSON and metadata fields.</p>
              </div>
              <button type="button" onClick={() => setPreviewOpen(false)} className="app-card rounded-md border px-3 py-2 text-sm font-bold hover:bg-[var(--app-surface-elevated)]">
                Close
              </button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
              <div className="flex min-h-[320px] items-center justify-center overflow-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-4">
                <div
                  className="relative overflow-hidden bg-[#f4f4f4] shadow-sm"
                  style={{
                    width: Math.min(Number(form.canvasWidth) || 1080, 520),
                    aspectRatio: `${Number(form.canvasWidth) || 1080} / ${Number(form.canvasHeight) || 1350}`,
                    backgroundImage: form.previewImage ? `url(${form.previewImage})` : form.backgroundImage ? `url(${form.backgroundImage})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    colorScheme: "light",
                  }}
                >
                  {!form.previewImage && !form.backgroundImage ? (
                    <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm font-bold text-[#4b5563]">
                      {form.name || "Public Template"}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-elevated)] p-4">
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="app-muted font-bold">Canvas</dt>
                    <dd className="app-heading font-extrabold">{form.canvasWidth} x {form.canvasHeight}px</dd>
                  </div>
                  <div>
                    <dt className="app-muted font-bold">Elements</dt>
                    <dd className="app-heading font-extrabold">{getElementCount(parsedTemplateData.value)}</dd>
                  </div>
                  <div>
                    <dt className="app-muted font-bold">Type</dt>
                    <dd className="app-heading font-extrabold">{templateTypes.find(([value]) => value === form.type)?.[1]}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
