import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, FileText, Plus, Trash2, X } from "lucide-react";
import NoActiveEventState from "../components/NoActiveEventState.jsx";
import { useActiveEvent } from "../contexts/ActiveEventContext.jsx";
import {
  deleteCertificateTemplate,
  duplicateCertificateTemplate,
  listCertificateTemplatesByEvent,
} from "../services/certificateTemplatesService.js";

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US");
}

function getElementCount(template) {
  if (Array.isArray(template.elements)) return template.elements.length;
  if (Array.isArray(template.textElements)) return template.textElements.length;
  return Number(template.elementCount || template.elementsCount || template.textElementsCount || 0);
}

function getPreviewImage(template) {
  return template.previewImage || template.thumbnail || template.image || template.canvas?.previewImage || "";
}

function getPreviewText(element, previewData = {}) {
  const firstTextValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value) !== "") return String(value);
    }
    return "";
  };
  const key = element.dataSource || element.dataKey || element.field || element.key;
  if (!key || key === "manual") return firstTextValue(previewData[element.id], element.content, element.text, element.value, element.label);
  return firstTextValue(previewData[key], previewData[element.id], element.content, element.text, element.value, element.label);
}

function CertificatePreview({ template }) {
  const previewImage = getPreviewImage(template);
  const elements = Array.isArray(template.elements) ? template.elements : [];
  const canvasWidth = Number(template.canvasWidth || template.canvas?.width || 842);
  const canvasHeight = Number(template.canvasHeight || template.canvas?.height || 596);
  const hasCanvasTemplate = elements.length > 0;
  const title = template.previewData?.title || template.title || "Certificate";
  const subtitle = template.previewData?.subtitle || "of Completion";
  const recipient = template.previewData?.recipientName || template.previewData?.name || "John Doe";
  const program = template.previewData?.programName || "Web Development Bootcamp";
  const award = template.previewData?.award || "Top Scorer";
  const team = template.previewData?.team || "Team Alpha";
  const category = template.previewData?.category || "[Program Category]";
  const date = template.previewData?.date || template.previewData?.eventDate || "December 31, 2024";

  if (previewImage) {
    return <img src={previewImage} alt="" className="h-full w-full object-contain" />;
  }

  if (hasCanvasTemplate) {
    const scale = Math.min(458 / canvasWidth, 488 / canvasHeight);

    return (
      <div className="flex h-full w-full items-center justify-center">
        <div style={{ width: canvasWidth * scale, height: canvasHeight * scale }}>
          <div
            className="relative overflow-hidden bg-[#ECECEC]"
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {elements.map((element) => (
              <div
                key={element.id}
                className="absolute whitespace-pre-wrap"
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  fontFamily: element.fontFamily,
                  fontSize: element.fontSize,
                  fontWeight: element.fontWeight,
                  color: element.color,
                  lineHeight: element.lineHeight,
                  textAlign: element.align,
                  background: element.showBg ? element.backgroundColor || "#ffffff" : "transparent",
                }}
              >
                {getPreviewText(element, template.previewData)}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-[#ECECEC] px-[12%] py-[7%] text-left text-[#111827]">
      <div className="mt-2 text-[30px] font-medium leading-tight text-[#6D0AD6]">{title}</div>
      <div className="mt-2 text-[22px] font-medium leading-tight">{subtitle}</div>
      <div className="mt-9 text-[15px] font-medium">{recipient}</div>
      <div className="mt-2 text-[10px] text-gray-600">{program}</div>
      <div className="mt-3 text-[10px] text-gray-600">{award}</div>
      <div className="mt-3 text-[10px] text-gray-600">{team}</div>
      <div className="mt-3 text-[10px] text-gray-600">{category}</div>
      <div className="mt-9 text-[9px] text-gray-500">{date}</div>
    </div>
  );
}

export default function CertificateTemplatesPage() {
  const navigate = useNavigate();
  const { activeEvent, loading: activeEventLoading } = useActiveEvent();
  const [templates, setTemplates] = useState([]);
  const [publicModalOpen, setPublicModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (activeEventLoading) return;

      setLoading(true);
      setError("");
      try {
        const eventTemplates = activeEvent?.id ? await listCertificateTemplatesByEvent(activeEvent.id) : [];

        setTemplates(eventTemplates);
      } catch (loadError) {
        setError(loadError.message || "Unable to load templates.");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    window.addEventListener("storage", load);
    window.addEventListener("rankify-active-event-changed", load);
    window.addEventListener("rankify-data-changed", load);
    window.addEventListener("rankify-events-changed", load);

    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("rankify-active-event-changed", load);
      window.removeEventListener("rankify-data-changed", load);
      window.removeEventListener("rankify-events-changed", load);
    };
  }, [activeEvent?.id, activeEventLoading]);

  const eventTemplates = useMemo(
    () => (activeEvent?.id ? templates.filter((template) => String(template.eventId) === String(activeEvent.id)) : []),
    [activeEvent?.id, templates]
  );

  const publicTemplates = useMemo(() => [], []);

  function handleCreate() {
    if (!activeEvent?.id) {
      alert("Please select an active event first.");
      return;
    }
    navigate("/dashboard/certificate-templates/new");
  }

  async function handleDuplicate(template) {
    if (!activeEvent?.id) return;
    try {
      const duplicate = await duplicateCertificateTemplate(template, {
        eventId: activeEvent.id,
        name: `${template.name || "Untitled Template"} Copy`,
        isPublic: false,
      });
      setTemplates((current) => [duplicate, ...current]);
    } catch (duplicateError) {
      setError(duplicateError.message || "Unable to duplicate template.");
    }
  }

  async function handleDelete(templateId) {
    if (!activeEvent?.id) return;
    const confirmed = window.confirm("Delete this certificate template?");
    if (!confirmed) return;

    try {
      await deleteCertificateTemplate(templateId);
      setTemplates((current) => current.filter((template) => template.id !== templateId));
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete template.");
    }
  }

  return (
    <section className="app-page min-h-screen w-full overflow-x-hidden px-6 py-7 max-sm:px-4">
      <div className="mb-10 flex w-full max-w-full min-w-0 flex-col gap-4 overflow-hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="app-heading break-words text-[30px] font-extrabold leading-tight">
            Certificate Templates
          </h1>
          <p className="app-muted mt-2 break-words text-sm">
            {activeEvent?.name
              ? `Create and manage certificate templates for event: ${activeEvent.name}`
              : "Create and manage certificate templates"}
          </p>
        </div>

        <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={handleCreate}
            disabled={!activeEvent?.id}
            className="app-success-btn inline-flex min-h-[46px] w-full max-w-full items-center justify-center gap-3 rounded-md px-5 py-2 text-base font-bold shadow-sm transition hover:opacity-90 sm:w-auto"
          >
            <Plus size={20} />
            Create New Template
          </button>
          <button
            type="button"
            onClick={() => {
              if (!activeEvent?.id) {
                alert("Please select an active event first.");
                return;
              }
              setPublicModalOpen(true);
            }}
            disabled={!activeEvent?.id}
            className="app-card inline-flex min-h-[46px] w-full max-w-full items-center justify-center rounded-md border px-6 py-2 text-base font-bold shadow-sm transition hover:bg-[var(--app-surface-elevated)] sm:w-auto"
          >
            Explore Public Templates
          </button>
        </div>
      </div>

      {error && (
        <div className="app-card mb-4 rounded-lg border border-[var(--app-danger)] p-4 text-sm text-[var(--app-danger)]">
          {error}
        </div>
      )}

      {!activeEvent?.id && activeEventLoading ? (
        <div className="app-card rounded-xl border p-8 text-center">
          <p className="app-muted text-sm font-semibold">Loading templates...</p>
        </div>
      ) : !activeEvent?.id ? (
        <NoActiveEventState />
      ) : loading ? (
        <div className="app-card rounded-xl border p-8 text-center">
          <p className="app-muted text-sm font-semibold">Loading templates...</p>
        </div>
      ) : eventTemplates.length === 0 ? (
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center text-center">
          <div className="mx-auto max-w-[820px] px-4">
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--app-surface-elevated)] text-[var(--app-muted)]">
              <FileText size={34} strokeWidth={1.8} />
            </div>
            <h2 className="app-heading text-2xl font-extrabold leading-tight">
              No Certificate Templates Yet
            </h2>
            <p className="app-muted mt-4 text-lg">
              You haven't created any certificate templates yet. Get started by creating your first one!
            </p>
            <button
              type="button"
              onClick={handleCreate}
              className="app-success-btn mt-9 inline-flex min-h-[50px] items-center justify-center rounded-md px-6 text-base font-bold shadow-sm transition hover:opacity-90"
            >
              Create Your First Template
            </button>
          </div>
        </div>
      ) : (
        <div className="grid max-w-full grid-cols-[repeat(auto-fill,minmax(min(100%,320px),482px))] gap-6">
          {eventTemplates.map((template) => {
            const elementCount = getElementCount(template);

            return (
              <article
                key={template.id}
                className="app-card min-w-0 overflow-hidden rounded-xl border shadow-lg"
              >
                <div className="h-[512px] max-h-[70vh] border-b border-[var(--app-border)] bg-[var(--app-surface-elevated)] p-3">
                  <CertificatePreview template={template} />
                </div>
                <div className="p-5">
                  <h2 className="app-heading break-words text-2xl font-extrabold leading-tight">
                    {template.name || "Untitled Template"}
                  </h2>
                  <p className="app-muted mt-2 text-lg">
                    Elements: {elementCount} text {elementCount === 1 ? "element" : "elements"}
                  </p>
                  <p className="app-muted mt-7 text-sm">Created: {formatDate(template.createdAt)}</p>

                  <div className="mt-16 flex flex-wrap items-center justify-end gap-3 max-sm:mt-8">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(template)}
                      className="app-card inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border px-4 text-base font-medium shadow-sm transition hover:bg-[var(--app-surface-elevated)]"
                    >
                      <Copy size={18} />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/certificate-templates/${template.id}/edit`)}
                      className="app-text inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md px-1 text-base font-medium transition hover:text-[var(--app-success)]"
                    >
                      <Edit size={18} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md px-1 text-base font-medium text-[var(--app-danger)] transition hover:opacity-80"
                    >
                      <Trash2 size={18} />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {publicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 px-4 py-8">
          <div className="app-modal relative flex min-h-[70vh] w-full max-w-[730px] flex-col rounded-lg border p-8 shadow-2xl max-sm:min-h-[60vh] max-sm:p-5">
            <button
              type="button"
              onClick={() => setPublicModalOpen(false)}
              aria-label="Close modal"
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-md border-2 border-[var(--app-success)] bg-[var(--app-surface)] text-[var(--app-muted)] transition hover:bg-[var(--app-sidebar-active-bg)] hover:text-[var(--app-heading)]"
            >
              <X size={20} />
            </button>
            <h2 className="app-heading pr-10 text-2xl font-extrabold leading-tight">
              Explore Public Certificate Templates
            </h2>

            {publicTemplates.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
                <h3 className="app-heading text-xl font-extrabold">No Public Templates Available</h3>
                <p className="app-muted mt-3 max-w-[420px] text-sm">
                  Public templates will appear here after admin publishes them.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {publicTemplates.map((template) => (
                  <article key={template.id} className="app-card rounded-lg border p-4 shadow-sm">
                    <h3 className="app-heading text-base font-bold">{template.name || "Untitled Template"}</h3>
                    <p className="app-muted mt-1 text-sm">Public certificate template</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
