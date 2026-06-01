import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, FileText, Plus, Trash2, X } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const STORAGE_KEY = "rankify_certificate_templates";

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([eventId, items]) =>
      Array.isArray(items) ? items.map((item) => ({ ...item, eventId: item.eventId || eventId })) : []
    );
  }
  return [];
}

function readEvents() {
  return asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []));
}

function readTemplates() {
  const baseTemplates = asArray(safeJsonParse(localStorage.getItem(STORAGE_KEY), []));
  if (baseTemplates.length > 0) return baseTemplates;
  return asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []));
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new Event("rankify-data-changed"));
}

function getActiveEvent(events) {
  const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
  if (!activeEventId) return null;
  return events.find((event) => String(event.id) === String(activeEventId)) || null;
}

function newId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `certificate_template_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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
  if (element.dataSource === "manual") return element.content || element.label || "";
  return previewData[element.dataSource] || element.label || "";
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
  const [activeEvent, setActiveEvent] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [publicModalOpen, setPublicModalOpen] = useState(false);

  useEffect(() => {
    function load() {
      const events = readEvents();
      setActiveEvent(getActiveEvent(events));
      setTemplates(readTemplates());
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
  }, []);

  const eventTemplates = useMemo(
    () => (activeEvent?.id ? templates.filter((template) => String(template.eventId) === String(activeEvent.id)) : []),
    [activeEvent?.id, templates]
  );

  const publicTemplates = useMemo(
    () => templates.filter((template) => template.isPublic === true),
    [templates]
  );

  function handleCreate() {
    if (!activeEvent?.id) {
      navigate("/dashboard/events");
      return;
    }
    navigate("/dashboard/certificate-templates/new");
  }

  function handleDuplicate(template) {
    if (!activeEvent?.id) return;
    const duplicate = {
      ...template,
      id: newId(),
      eventId: activeEvent.id,
      name: `${template.name || "Untitled Template"} Copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
    };
    const nextTemplates = [...templates, duplicate];
    setTemplates(nextTemplates);
    saveTemplates(nextTemplates);
  }

  function handleDelete(templateId) {
    if (!activeEvent?.id) return;
    const confirmed = window.confirm("Delete this certificate template?");
    if (!confirmed) return;

    const nextTemplates = templates.filter(
      (template) => !(String(template.id) === String(templateId) && String(template.eventId) === String(activeEvent.id))
    );
    setTemplates(nextTemplates);
    saveTemplates(nextTemplates);
  }

  return (
    <section className="min-h-screen w-full overflow-x-hidden bg-[#F8FAFC] px-6 py-7 text-[#020817] max-sm:px-4">
      <div className="mb-10 flex w-full max-w-full min-w-0 flex-wrap items-start justify-between gap-4 overflow-hidden">
        <h1 className="min-w-0 flex-1 break-words text-[30px] font-extrabold leading-tight text-[#020817]">
          {activeEvent?.name ? `Certificate Templates for ${activeEvent.name}` : "Certificate Templates"}
        </h1>

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex min-h-[46px] max-w-full items-center justify-center gap-3 rounded-md bg-[#26752C] px-5 py-2 text-base font-bold text-white shadow-sm transition hover:bg-[#1f6425]"
          >
            <Plus size={20} />
            Create New Template
          </button>
          <button
            type="button"
            onClick={() => setPublicModalOpen(true)}
            className="inline-flex min-h-[46px] max-w-full items-center justify-center rounded-md bg-[#26752C] px-6 py-2 text-base font-bold text-white shadow-sm transition hover:bg-[#1f6425]"
          >
            Explore Public Templates
          </button>
        </div>
      </div>

      {!activeEvent?.id ? (
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center text-center">
          <div className="mx-auto max-w-[720px] px-4">
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF1F5] text-[#5F6B7A]">
              <FileText size={34} strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-extrabold leading-tight text-[#020817]">
              No active event selected
            </h2>
            <p className="mt-4 text-lg text-[#4B5563]">
              Please select or create an event before creating certificate templates.
            </p>
            <button
              type="button"
              onClick={() => navigate("/dashboard/events")}
              className="mt-9 inline-flex min-h-[50px] items-center justify-center rounded-md bg-[#26752C] px-6 text-base font-bold text-white shadow-sm transition hover:bg-[#1f6425]"
            >
              Go to Events
            </button>
          </div>
        </div>
      ) : eventTemplates.length === 0 ? (
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center text-center">
          <div className="mx-auto max-w-[820px] px-4">
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-full bg-[#EEF1F5] text-[#5F6B7A]">
              <FileText size={34} strokeWidth={1.8} />
            </div>
            <h2 className="text-2xl font-extrabold leading-tight text-[#020817]">
              No Certificate Templates Yet
            </h2>
            <p className="mt-4 text-lg text-[#4B5563]">
              You haven't created any certificate templates yet. Get started by creating your first one!
            </p>
            <button
              type="button"
              onClick={handleCreate}
              className="mt-9 inline-flex min-h-[50px] items-center justify-center rounded-md bg-[#26752C] px-6 text-base font-bold text-white shadow-sm transition hover:bg-[#1f6425]"
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
                className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60"
              >
                <div className="h-[512px] max-h-[70vh] border-b border-gray-100 bg-[#F1F3F5] p-3">
                  <CertificatePreview template={template} />
                </div>
                <div className="p-5">
                  <h2 className="break-words text-2xl font-extrabold leading-tight text-[#020817]">
                    {template.name || "Untitled Template"}
                  </h2>
                  <p className="mt-2 text-lg text-[#4B5563]">
                    Elements: {elementCount} text {elementCount === 1 ? "element" : "elements"}
                  </p>
                  <p className="mt-7 text-sm text-gray-400">Created: {formatDate(template.createdAt)}</p>

                  <div className="mt-16 flex flex-wrap items-center justify-end gap-3 max-sm:mt-8">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(template)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md border border-gray-200 bg-[#F8FAFC] px-4 text-base font-medium text-[#020817] shadow-sm transition hover:bg-gray-100"
                    >
                      <Copy size={18} />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/certificate-templates/${template.id}/edit`)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md px-1 text-base font-medium text-[#020817] transition hover:text-[#26752C]"
                    >
                      <Edit size={18} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-md px-1 text-base font-medium text-red-600 transition hover:text-red-700"
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
          <div className="relative flex min-h-[70vh] w-full max-w-[730px] flex-col rounded-lg border border-gray-200 bg-[#F8FAFC] p-8 shadow-2xl max-sm:min-h-[60vh] max-sm:p-5">
            <button
              type="button"
              onClick={() => setPublicModalOpen(false)}
              aria-label="Close modal"
              className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-md border-2 border-[#6FA578] bg-white text-gray-600 transition hover:bg-[#E8F3EA] hover:text-[#0D1B2A]"
            >
              <X size={20} />
            </button>
            <h2 className="pr-10 text-2xl font-extrabold leading-tight text-[#111827]">
              Explore Public Certificate Templates
            </h2>

            {publicTemplates.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center text-lg text-gray-500">
                No public templates available yet.
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {publicTemplates.map((template) => (
                  <article key={template.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-bold text-[#0D1B2A]">{template.name || "Untitled Template"}</h3>
                    <p className="mt-1 text-sm text-gray-500">Public certificate template</p>
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
