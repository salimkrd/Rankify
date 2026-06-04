import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Edit, FilePlus2, ImageIcon, Plus, Trash2, X } from "lucide-react";
import { getUserStorageKey } from "../utils/storage.js";
import NoActiveEventState from "../components/NoActiveEventState.jsx";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const TEMPLATES_KEY = "rankify_program_templates";

const fallbackEvents = [
  {
    id: "event_panangara",
    name: "SSF PANANGARA UNIT SAHITYOLSAV",
    organizer: "Panangara Unit",
    date: "May 25",
    location: "Panangara",
    created: "5/24/2026",
  },
  {
    id: "event_cherikallu",
    name: "SSF CHERIKALLU UNIT SAHITYOLSAV",
    organizer: "Cherikallu Unit",
    date: "May 22",
    location: "Nambram",
    created: "5/22/2026",
  },
];

function makePreview(seed, background, accent = "#26752C") {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="820" viewBox="0 0 640 820">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${background}" />
          <stop offset="1" stop-color="#ffffff" />
        </linearGradient>
      </defs>
      <rect width="640" height="820" fill="url(#g)" />
      <circle cx="520" cy="540" r="170" fill="${accent}" opacity=".18" />
      <circle cx="540" cy="590" r="110" fill="${accent}" opacity=".22" />
      <rect x="80" y="90" width="160" height="26" rx="6" fill="#111827" opacity=".9" />
      <rect x="80" y="132" width="240" height="18" rx="4" fill="#111827" opacity=".75" />
      <text x="80" y="230" font-family="Arial" font-size="30" font-weight="700" fill="#111827">Result No: ${seed}</text>
      <text x="80" y="285" font-family="Arial" font-size="34" font-weight="700" fill="#111827">General</text>
      <text x="80" y="332" font-family="Arial" font-size="32" font-weight="700" fill="#111827">Elocution English Kids</text>
      <g font-family="Arial" fill="#111827">
        <text x="88" y="455" font-size="24" font-weight="700">1  Muhammed Saeed</text>
        <text x="118" y="485" font-size="18" font-style="italic">Vadi Badr</text>
        <text x="88" y="540" font-size="24" font-weight="700">2  Jabbar Ibraheem</text>
        <text x="118" y="570" font-size="18" font-style="italic">Isfahan</text>
        <text x="88" y="625" font-size="24" font-weight="700">3  Ali bin Muhammed</text>
        <text x="118" y="655" font-size="18" font-style="italic">Vadi Quba</text>
      </g>
      <text x="80" y="760" font-family="Arial" font-size="28" font-weight="700" fill="${accent}">Sahityolsav</text>
    </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const createPublicTemplateSchema = (template) => {
  const canvas = template.canvas || {
    width: template.width || 1080,
    height: template.height || 1350,
    backgroundImage: template.backgroundImage || template.previewImage || "",
  };

  const elements = template.elements || [
    {
      id: "resultNumber",
      type: "text",
      field: "resultNumber",
      prefix: "Result No: ",
      x: 110,
      y: 130,
      width: 260,
      height: 42,
      fontFamily: "Arial",
      fontSize: 28,
      fontWeight: "500",
      color: "#111111",
      textAlign: "left",
      lineHeight: 1.2,
      opacity: 1,
      zIndex: 2,
    },
    {
      id: "category",
      type: "text",
      field: "category",
      x: 110,
      y: 190,
      width: 430,
      height: 54,
      fontFamily: "Arial",
      fontSize: 36,
      fontWeight: "700",
      color: "#111111",
      textAlign: "left",
      lineHeight: 1.2,
      opacity: 1,
      zIndex: 2,
    },
    {
      id: "programName",
      type: "text",
      field: "programName",
      x: 110,
      y: 250,
      width: 620,
      height: 74,
      fontFamily: "Arial",
      fontSize: 48,
      fontWeight: "800",
      color: "#111111",
      textAlign: "left",
      lineHeight: 1.15,
      opacity: 1,
      zIndex: 2,
    },
    {
      id: "winnerContainer",
      type: "winnerContainer",
      x: 110,
      y: 520,
      width: 640,
      height: 280,
      direction: "vertical",
      spacing: 82,
      zIndex: 2,
    },
    {
      id: "winnerPosition",
      type: "winnerText",
      field: "winner.position",
      x: 0,
      y: 0,
      width: 70,
      height: 38,
      fontFamily: "Arial",
      fontSize: 30,
      fontWeight: "700",
      color: "#111111",
      textAlign: "left",
      lineHeight: 1.2,
      opacity: 1,
      zIndex: 3,
    },
    {
      id: "winnerName",
      type: "winnerText",
      field: "winner.name",
      x: 78,
      y: 0,
      width: 360,
      height: 38,
      fontFamily: "Arial",
      fontSize: 30,
      fontWeight: "700",
      color: "#111111",
      textAlign: "left",
      lineHeight: 1.2,
      opacity: 1,
      zIndex: 3,
    },
    {
      id: "winnerTeam",
      type: "winnerText",
      field: "winner.team",
      x: 78,
      y: 38,
      width: 240,
      height: 30,
      fontFamily: "Arial",
      fontSize: 22,
      fontWeight: "500",
      color: "#333333",
      textAlign: "left",
      lineHeight: 1.2,
      opacity: 1,
      zIndex: 3,
    },
  ];

  return {
    canvas,
    elements,
    previewData: template.previewData || { canvas, elements },
    previewImage:
      template.previewImage ||
      schemaToPreviewImage({ ...template, canvas, elements, previewData: template.previewData || defaultTemplatePreviewData }) ||
      template.backgroundImage ||
      "",
  };
};

const defaultTemplatePreviewData = {
  programName: "Elocution English Kids",
  category: "General",
  resultNumber: "22",
  winners: [
    { position: "1", name: "Muhammed Saeed", team: "Alpha" },
    { position: "2", name: "Jabbar Ibraheem", team: "Beta" },
    { position: "3", name: "Ali bin Muhammed", team: "Gamma" },
  ],
};

const escapeSvgText = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const templatePreviewValue = (element, previewData, winner = null) => {
  const key = String(
    element?.field || element?.dataKey || element?.key || element?.name || element?.id || element?.label || element?.content || ""
  ).toLowerCase();

  if (winner) {
    if (key.includes("position")) return winner.position || "";
    if (key.includes("team")) return winner.team || "";
    if (key.includes("name")) return winner.name || "";
    return element?.content || element?.label || "";
  }

  if (key.includes("programname") || key.includes("program name") || key === "program") {
    return previewData.programName || "";
  }
  if (key.includes("category")) return previewData.category || "";
  if (key.includes("resultnumber") || key.includes("result number") || key.includes("result")) {
    return `${element?.prefix || ""}${previewData.resultNumber || ""}`;
  }
  return element?.content || element?.label || "";
};

const elementSvgStyle = (element, offset = { x: 0, y: 0 }) => ({
  x: Number(element.x || 0) + offset.x,
  y: Number(element.y || 0) + offset.y,
  width: Number(element.width || 0),
  height: Number(element.height || 0),
  fontFamily: element.fontFamily || "Arial",
  fontSize: Number(element.fontSize || 24),
  fontWeight: element.fontWeight || "400",
  color: element.color || "#111111",
  opacity: element.opacity ?? 1,
  textAlign: element.textAlign || "left",
  radius: Number(element.borderRadius || 0),
});

const schemaToPreviewImage = (template) => {
  if (!template?.canvas || !Array.isArray(template?.elements)) return template?.previewImage || "";

  const canvas = template.canvas;
  const width = Number(canvas.width || 1080);
  const height = Number(canvas.height || 1350);
  const previewData = { ...defaultTemplatePreviewData, ...(template.previewData || {}) };
  const backgroundImage = canvas.backgroundImage;
  const backgroundColor = canvas.backgroundColor || template.backgroundColor || "#ffffff";
  const winnerContainer =
    template.elements.find((element) => element.id === "winnerContainer") ||
    template.elements.find((element) => element.type === "winnerContainer");
  const winnerChildren = template.elements.filter(
    (element) => element.type === "winnerText" || element.type === "winnerPhoto"
  );
  const baseElements = template.elements.filter(
    (element) => !["winnerContainer", "winnerText", "winnerPhoto"].includes(element.type)
  );

  const renderText = (element, winner = null, offset = { x: 0, y: 0 }) => {
    const style = elementSvgStyle(element, offset);
    const anchor = style.textAlign === "center" ? "middle" : style.textAlign === "right" ? "end" : "start";
    const x = anchor === "middle" ? style.x + style.width / 2 : anchor === "end" ? style.x + style.width : style.x;
    const y = style.y + style.fontSize;
    return `<text x="${x}" y="${y}" font-family="${escapeSvgText(style.fontFamily)}" font-size="${style.fontSize}" font-weight="${escapeSvgText(style.fontWeight)}" fill="${escapeSvgText(style.color)}" opacity="${style.opacity}" text-anchor="${anchor}">${escapeSvgText(templatePreviewValue(element, previewData, winner))}</text>`;
  };

  const renderImage = (element, winner = null, offset = { x: 0, y: 0 }) => {
    const style = elementSvgStyle(element, offset);
    const src =
      element.type === "winnerPhoto"
        ? winner?.image || winner?.imageUrl || winner?.photo || winner?.photoUrl || element.src || element.imageUrl
        : element.src || element.url || element.image || element.imageUrl;
    return src
      ? `<image href="${escapeSvgText(src)}" x="${style.x}" y="${style.y}" width="${style.width}" height="${style.height}" opacity="${style.opacity}" preserveAspectRatio="${element.objectFit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}" />`
      : "";
  };

  const renderElement = (element, winner = null, offset = { x: 0, y: 0 }) => {
    if (element.type === "image" || element.type === "winnerPhoto") return renderImage(element, winner, offset);
    if (element.type === "text" || element.type === "winnerText") return renderText(element, winner, offset);
    return "";
  };

  const baseMarkup = baseElements.map((element) => renderElement(element)).join("");
  const winnerMarkup =
    winnerContainer && winnerChildren.length
      ? (previewData.winners || [])
          .flatMap((winner, index) => {
            const spacing = Number(winnerContainer.spacing || 0);
            const direction = winnerContainer.direction || "vertical";
            const offset =
              direction === "horizontal"
                ? { x: Number(winnerContainer.x || 0) + index * spacing, y: Number(winnerContainer.y || 0) }
                : { x: Number(winnerContainer.x || 0), y: Number(winnerContainer.y || 0) + index * spacing };
            return winnerChildren.map((child) => renderElement(child, winner, offset));
          })
          .join("")
      : "";

  const bgMarkup = backgroundImage
    ? `<image href="${escapeSvgText(backgroundImage)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" />`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${escapeSvgText(backgroundColor)}" />${bgMarkup}${baseMarkup}${winnerMarkup}</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const normalizePublicProgramTemplate = (template) => {
  if (!template || typeof template !== "object") return template;
  const isPublicProgram =
    template.source === "public" || template.type === "program" || template.previewImage;
  if (!isPublicProgram) return template;
  if (template.canvas && Array.isArray(template.elements)) {
    return {
      ...template,
      previewImage: schemaToPreviewImage(template) || template.previewImage,
      previewData: template.previewData || defaultTemplatePreviewData,
    };
  }

  const editableSchema = createPublicTemplateSchema(template);
  return {
    ...template,
    type: "program",
    canvas: editableSchema.canvas,
    elements: editableSchema.elements,
    previewData: editableSchema.previewData,
    previewImage: schemaToPreviewImage({ ...template, ...editableSchema }),
    source: template.source || "public",
  };
};

const normalizeTemplateStorageValue = (value) => {
  const parsed = JSON.parse(value);
  if (Array.isArray(parsed)) {
    return JSON.stringify(parsed.map(normalizePublicProgramTemplate));
  }
  if (parsed && typeof parsed === "object") {
    const next = {};
    Object.entries(parsed).forEach(([key, item]) => {
      next[key] = Array.isArray(item)
        ? item.map(normalizePublicProgramTemplate)
        : normalizePublicProgramTemplate(item);
    });
    return JSON.stringify(next);
  }
  return value;
};

if (typeof window !== "undefined" && !window.__rankifyPublicTemplateSchemaPatch) {
  window.__rankifyPublicTemplateSchemaPatch = true;
  const originalSetItem = window.localStorage.setItem.bind(window.localStorage);
  window.localStorage.setItem = (key, value) => {
    const shouldNormalize = String(key || "").toLowerCase().includes("template");
    if (shouldNormalize && typeof value === "string") {
      try {
        originalSetItem(key, normalizeTemplateStorageValue(value));
        return;
      } catch {
        originalSetItem(key, value);
        return;
      }
    }
    originalSetItem(key, value);
  };
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!String(key || "").toLowerCase().includes("template")) continue;
    const value = window.localStorage.getItem(key);
    if (typeof value !== "string") continue;
    try {
      const normalized = normalizeTemplateStorageValue(value);
      if (normalized !== value) originalSetItem(key, normalized);
    } catch {
      // Ignore unrelated template-like storage keys.
    }
  }
}

const PUBLIC_TEMPLATES = [];

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function getStoredEvents() {
  const storedEvents = safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []);
  return Array.isArray(storedEvents) ? storedEvents : [];
}

function getActiveEventId(events) {
  const storedActiveId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY));
  const isValid = events.some((event) => event.id === storedActiveId);

  if (isValid) return storedActiveId;

  localStorage.removeItem(getUserStorageKey(ACTIVE_EVENT_KEY));
  return "";
}

function getTemplatesByEvent() {
  const stored = safeJsonParse(localStorage.getItem(getUserStorageKey(TEMPLATES_KEY)), {});

  if (Array.isArray(stored)) {
    return stored.reduce((grouped, template) => {
      if (!template?.eventId) return grouped;
      grouped[template.eventId] = [...(grouped[template.eventId] || []), template];
      return grouped;
    }, {});
  }

  return stored && typeof stored === "object" ? stored : {};
}

function getCurrentDate() {
  return new Date().toLocaleDateString("en-US");
}

export default function ProgramTemplatesPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [activeEventId, setActiveEventId] = useState("");
  const [templatesByEvent, setTemplatesByEvent] = useState({});
  const [publicModalOpen, setPublicModalOpen] = useState(false);

  useEffect(() => {
    function syncTemplates() {
      const storedEvents = getStoredEvents();
      const validActiveId = getActiveEventId(storedEvents);
      const storedTemplates = getTemplatesByEvent();

      setEvents(storedEvents);
      setActiveEventId(validActiveId);
      setTemplatesByEvent(storedTemplates);
    }

    syncTemplates();

    window.addEventListener("storage", syncTemplates);
    window.addEventListener("rankify-data-changed", syncTemplates);
    window.addEventListener("rankify-active-event-changed", syncTemplates);

    return () => {
      window.removeEventListener("storage", syncTemplates);
      window.removeEventListener("rankify-data-changed", syncTemplates);
      window.removeEventListener("rankify-active-event-changed", syncTemplates);
    };
  }, []);

  const visibleTemplates = useMemo(
    () => (activeEventId ? templatesByEvent[activeEventId] || [] : []),
    [activeEventId, templatesByEvent]
  );

  const activeEvent = useMemo(
    () => events.find((event) => event.id === activeEventId) || null,
    [activeEventId, events]
  );

  function persistTemplates(nextTemplatesByEvent) {
    localStorage.setItem(getUserStorageKey(TEMPLATES_KEY), JSON.stringify(nextTemplatesByEvent));
    setTemplatesByEvent(nextTemplatesByEvent);
    window.dispatchEvent(new Event("rankify-data-changed"));
  }

  function getActiveTemplates() {
    return activeEventId ? templatesByEvent[activeEventId] || [] : [];
  }

  function handleCreateTemplate() {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    navigate("/dashboard/program-templates/new");
  }

  function handleUsePublicTemplate(publicTemplate) {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const template = {
      id: `template_${Date.now()}`,
      eventId: activeEventId,
      name: `${publicTemplate.name} (from Public)`,
      previewImage: publicTemplate.previewImage,
      createdAt: getCurrentDate(),
      updatedAt: getCurrentDate(),
      source: "public",
      type: "program",
    };

    persistTemplates({
      ...templatesByEvent,
      [activeEventId]: [...getActiveTemplates(), template],
    });
    setPublicModalOpen(false);
  }

  function handleDuplicateTemplate(template) {
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const duplicatedTemplate = {
      ...template,
      id: `template_${Date.now()}`,
      eventId: activeEventId,
      name: `${template.name} Copy`,
      createdAt: getCurrentDate(),
      updatedAt: getCurrentDate(),
    };

    persistTemplates({
      ...templatesByEvent,
      [activeEventId]: [...getActiveTemplates(), duplicatedTemplate],
    });
  }

  function handleDeleteTemplate(templateId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this template?"
    );
    if (!confirmed || !activeEventId) return;

    persistTemplates({
      ...templatesByEvent,
      [activeEventId]: getActiveTemplates().filter(
        (template) => template.id !== templateId
      ),
    });
  }

  return (
    <div className="app-page overflow-x-hidden px-6 py-6 max-sm:px-4">
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="app-heading text-2xl font-bold tracking-tight">
              Poster Templates
            </h1>
            <p className="app-muted mt-1">
              Design and manage reusable poster templates
              {activeEvent?.name ? ` for event: ${activeEvent.name}` : ""}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={handleCreateTemplate}
              disabled={!activeEventId}
              className="app-success-btn inline-flex min-h-10 w-full max-w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 sm:w-auto"
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Create New Template
            </button>
            <button
              type="button"
              onClick={() => {
                if (!activeEventId) {
                  alert("Please select an active event first.");
                  return;
                }
                setPublicModalOpen(true);
              }}
              disabled={!activeEventId}
              className="app-card inline-flex min-h-10 w-full max-w-full items-center justify-center rounded-md border px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[var(--app-surface-elevated)] sm:w-auto"
            >
              Explore Public Templates
            </button>
          </div>
        </div>

        {!activeEventId ? (
          <NoActiveEventState />
        ) : visibleTemplates.length === 0 ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-surface-elevated)] text-[var(--app-muted)]">
              <FilePlus2 size={42} strokeWidth={1.8} aria-hidden="true" />
            </div>
            <h2 className="app-heading text-xl font-medium">
              No templates found.
            </h2>
            <p className="app-muted mt-4">
              Get started by creating your first poster template
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 2xl:grid-cols-3">
            {visibleTemplates.map((template) => (
              <div
                key={template.id}
                className="app-card overflow-hidden rounded-xl border shadow-sm"
              >
                <div className="flex h-[340px] items-center justify-center bg-[var(--app-surface-elevated)] p-6">
                  {template.previewImage ? (
                    <img
                      src={template.previewImage}
                      alt={template.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--app-muted)]">
                      <ImageIcon size={52} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                  )}
                </div>

                <div className="p-6">
                  <h2 className="app-heading line-clamp-2 min-h-[56px] text-xl font-bold">
                    {template.name}
                  </h2>

                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(template)}
                      className="app-card inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]"
                    >
                      <Copy size={16} strokeWidth={1.9} aria-hidden="true" />
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/dashboard/program-templates/${template.id}/edit`)
                      }
                      className="app-card inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]"
                    >
                      <Edit size={16} strokeWidth={1.9} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="app-danger-btn inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-semibold hover:opacity-90"
                    >
                      <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeEvent && (
          <p className="sr-only">Current event: {activeEvent.name}</p>
        )}
      </div>

      {publicModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="app-modal relative max-h-[80vh] w-full max-w-[600px] overflow-hidden rounded-xl p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setPublicModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md border border-[var(--app-success)] text-2xl leading-none text-[var(--app-muted)] hover:bg-[var(--app-sidebar-active-bg)]"
              aria-label="Close modal"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>

            <h2 className="app-heading text-xl font-bold">
              Explore Public Templates
            </h2>

            <div className="mt-5 max-h-[66vh] overflow-y-auto pr-2">
              {PUBLIC_TEMPLATES.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface)] px-6 text-center">
                  <h3 className="app-heading text-xl font-extrabold">No Public Templates Available</h3>
                  <p className="app-muted mt-3 max-w-[420px] text-sm">
                    Public templates will appear here after admin publishes them.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {PUBLIC_TEMPLATES.map((template) => (
                    <div
                      key={template.id}
                      className="app-card overflow-hidden rounded-xl border shadow-sm"
                    >
                      <div className="flex h-[270px] items-center justify-center bg-[var(--app-surface-elevated)] p-2">
                        <img
                          src={template.previewImage}
                          alt={template.name}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="p-4">
                        <h3 className="app-heading truncate text-lg font-bold">
                          {template.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() => handleUsePublicTemplate(template)}
                          className="app-success-btn mt-4 h-9 w-full rounded-md text-sm font-bold hover:opacity-90"
                        >
                          USE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
