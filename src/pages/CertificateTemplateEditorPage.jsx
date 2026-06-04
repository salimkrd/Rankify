import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Plus, Save, Trash2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import FontFamilySelect from "../components/FontFamilySelect.jsx";
import { getUserStorageKey } from "../utils/storage.js";

const STORAGE_KEY = "rankify_certificate_templates";
const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

const scaleOptions = [40, 50, 60, 75, 100];
const dataSourceOptions = [
  ["manual", "Manual Input"],
  ["candidateName", "Candidate Name"],
  ["programName", "Program Name"],
  ["candidatePosition", "Candidate Position"],
  ["candidateTeam", "Candidate Team"],
  ["programCategory", "Program Category"],
  ["candidateGrade", "Candidate Grade"],
  ["issueDate", "Issue Date"],
  ["organizerName", "Organizer Name"],
  ["eventDate", "Event Date"],
  ["eventLocation", "Event Location"],
];

const defaultPreviewData = {
  programName: "Web Development Bootcamp",
  candidateName: "John Doe",
  candidatePosition: "Top Scorer",
  candidateTeam: "Team Alpha",
  programCategory: "[Program Category]",
  candidateGrade: "A+",
  issueDate: "December 31, 2024",
  organizerName: "Rankify",
  eventDate: "May 25",
  eventLocation: "Panangara",
  certificateTitle: "Certificate",
  achievementText: "of Achievement",
};

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed ?? fallback;
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

function uid(prefix = "certificate_element") {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readTemplates() {
  return asArray(safeJsonParse(localStorage.getItem(STORAGE_KEY), []));
}

function readEvents() {
  return asArray(safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []));
}

function getActiveEvent() {
  const events = readEvents();
  const activeId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
  return events.find((event) => String(event.id) === String(activeId)) || events[0] || { id: activeId || "default", name: "Active Event" };
}

function saveTemplates(templates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  window.dispatchEvent(new Event("rankify-data-changed"));
}

function textElement(label, dataSource, text, x, y, overrides = {}) {
  return {
    id: uid("cert_text"),
    type: "text",
    label,
    dataSource,
    content: text,
    x,
    y,
    width: overrides.width || 440,
    fontFamily: overrides.fontFamily || "Inter",
    fontSize: overrides.fontSize || 28,
    fontWeight: overrides.fontWeight || "400",
    align: overrides.align || "left",
    color: overrides.color || "#111827",
    lineHeight: overrides.lineHeight || 1.2,
    showBg: Boolean(overrides.showBg),
    backgroundColor: overrides.backgroundColor || "#ffffff",
  };
}

function defaultElements() {
  return [
    textElement("Certificate", "manual", "Certificate", 95, 76, { fontSize: 54, color: "#6D0AD6", width: 520 }),
    textElement("Of Achievement", "manual", "of Achievement", 98, 142, { fontSize: 36, width: 520 }),
    textElement("[Candidate Name]", "candidateName", "", 98, 250, { fontSize: 24, fontWeight: "500" }),
    textElement("[Program Name]", "programName", "", 98, 292, { fontSize: 15, color: "#4B5563" }),
    textElement("[Candidate Position]", "candidatePosition", "", 98, 338, { fontSize: 14, color: "#4B5563" }),
    textElement("[Candidate Team]", "candidateTeam", "", 98, 382, { fontSize: 14, color: "#4B5563" }),
    textElement("[Program Category]", "programCategory", "", 98, 426, { fontSize: 14, color: "#4B5563" }),
    textElement("[Candidate Grade]", "candidateGrade", "", 98, 470, { fontSize: 14, color: "#4B5563" }),
    textElement("[Issue Date]", "issueDate", "", 98, 560, { fontSize: 12, color: "#6B7280" }),
  ];
}

function createDefaultTemplate(activeEvent) {
  const now = new Date().toISOString();
  return {
    id: uid("certificate_template"),
    eventId: activeEvent.id,
    name: "New Certificate Template",
    positionFilter: "",
    canvasWidth: 842,
    canvasHeight: 596,
    backgroundImage: "",
    elements: defaultElements(),
    previewData: defaultPreviewData,
    createdAt: now,
    updatedAt: now,
    isPublic: false,
  };
}

function normalizeTemplate(template, activeEvent) {
  const fallback = createDefaultTemplate(activeEvent);
  return {
    ...fallback,
    ...template,
    eventId: template?.eventId || activeEvent.id,
    canvasWidth: Number(template?.canvasWidth || template?.canvas?.width || fallback.canvasWidth),
    canvasHeight: Number(template?.canvasHeight || template?.canvas?.height || fallback.canvasHeight),
    backgroundImage: template?.backgroundImage || template?.canvas?.backgroundImage || "",
    elements: Array.isArray(template?.elements) && template.elements.length ? template.elements : fallback.elements,
    previewData: { ...defaultPreviewData, ...(template?.previewData || {}) },
  };
}

function getElementText(element, previewData) {
  if (element.dataSource === "manual") return element.content || element.label || "";
  return previewData[element.dataSource] || element.label || "";
}

function NumberInput({ value, onChange, className = "" }) {
  return (
    <input
      type="number"
      value={Number.isFinite(Number(value)) ? value : 0}
      onChange={(event) => onChange(Number(event.target.value) || 0)}
      className={`app-input h-9 rounded-md border px-2 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)] ${className}`}
    />
  );
}

function nearestSafeScale(width, height) {
  const fitPercent = Math.floor(Math.min(900 / Math.max(width, 1), 560 / Math.max(height, 1), 1) * 100);
  const fittingOptions = scaleOptions.filter((option) => option <= fitPercent);
  return fittingOptions.length ? fittingOptions[fittingOptions.length - 1] : scaleOptions[0];
}

function ToolbarField({ label, children }) {
  return (
    <label className="app-text grid min-w-[112px] gap-1 text-xs font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}

export default function CertificateTemplateEditorPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const isEditMode = Boolean(templateId);
  const [activeEvent, setActiveEvent] = useState(() => getActiveEvent());
  const [template, setTemplate] = useState(() => createDefaultTemplate(getActiveEvent()));
  const [selectedId, setSelectedId] = useState("");
  const [scalePercent, setScalePercent] = useState(60);
  const [exampleOpen, setExampleOpen] = useState(true);
  const dragRef = useRef(null);

  useEffect(() => {
    const currentEvent = getActiveEvent();
    setActiveEvent(currentEvent);
    const existing = isEditMode
      ? readTemplates().find((item) => String(item.id) === String(templateId) && String(item.eventId) === String(currentEvent.id))
      : null;
    const nextTemplate = normalizeTemplate(existing, currentEvent);
    setTemplate(nextTemplate);
    setSelectedId(nextTemplate.elements[0]?.id || "");
  }, [isEditMode, templateId]);

  const selectedElement = useMemo(
    () => template.elements.find((element) => element.id === selectedId) || null,
    [selectedId, template.elements]
  );

  const scale = scalePercent / 100;

  useEffect(() => {
    function onKeyDown(event) {
      if (!selectedId) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        if (["INPUT", "TEXTAREA", "SELECT"].includes(tagName) || target.isContentEditable) return;
      }
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (!keys.includes(event.key)) return;

      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;

      setTemplate((current) => ({
        ...current,
        elements: current.elements.map((element) =>
          element.id === selectedId
            ? {
                ...element,
                x: Math.max(0, Math.round((Number(element.x || 0) + dx) * 10) / 10),
                y: Math.max(0, Math.round((Number(element.y || 0) + dy) * 10) / 10),
              }
            : element
        ),
      }));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  function updateTemplate(patch) {
    setTemplate((current) => ({ ...current, ...patch }));
  }

  function updateSelected(patch) {
    if (!selectedElement) return;
    setTemplate((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === selectedElement.id ? { ...element, ...patch } : element
      ),
    }));
  }

  function beginDrag(event, elementId) {
    event.preventDefault();
    event.stopPropagation();
    const element = template.elements.find((item) => item.id === elementId);
    if (!element) return;

    setSelectedId(elementId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      id: elementId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originalX: Number(element.x || 0),
      originalY: Number(element.y || 0),
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;
    event.preventDefault();
    const drag = dragRef.current;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;

    setTemplate((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === drag.id
          ? {
              ...element,
              x: Math.max(0, Math.round((drag.originalX + dx) * 10) / 10),
              y: Math.max(0, Math.round((drag.originalY + dy) * 10) / 10),
            }
          : element
      ),
    }));
  }

  function endDrag(event) {
    if (dragRef.current && event?.currentTarget?.hasPointerCapture?.(dragRef.current.pointerId)) {
      event.currentTarget.releasePointerCapture(dragRef.current.pointerId);
    }
    dragRef.current = null;
  }

  function addTextElement() {
    const element = textElement("Text element", "manual", "Text element", 120, 120, { fontSize: 24 });
    setTemplate((current) => ({ ...current, elements: [...current.elements, element] }));
    setSelectedId(element.id);
  }

  function duplicateElement(element) {
    const copy = { ...element, id: uid("cert_text"), label: `${element.label} Copy`, x: element.x + 18, y: element.y + 18 };
    setTemplate((current) => ({ ...current, elements: [...current.elements, copy] }));
    setSelectedId(copy.id);
  }

  function removeElement(element) {
    const confirmed = window.confirm(`Remove ${element.label}?`);
    if (!confirmed) return;
    setTemplate((current) => {
      const nextElements = current.elements.filter((item) => item.id !== element.id);
      if (selectedId === element.id) setSelectedId(nextElements[0]?.id || "");
      return { ...current, elements: nextElements };
    });
  }

  function updatePreviewData(key, value) {
    setTemplate((current) => ({
      ...current,
      previewData: { ...current.previewData, [key]: value },
    }));
  }

  function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image is too large. Please compress the image below 1MB and upload again.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        setTemplate((current) => ({
          ...current,
          backgroundImage: reader.result,
          canvasWidth: image.naturalWidth || current.canvasWidth,
          canvasHeight: image.naturalHeight || current.canvasHeight,
        }));
        setScalePercent(nearestSafeScale(image.naturalWidth || template.canvasWidth, image.naturalHeight || template.canvasHeight));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const templates = readTemplates();
    const now = new Date().toISOString();
    const cleanTemplate = {
      ...template,
      eventId: activeEvent.id,
      updatedAt: now,
      createdAt: template.createdAt || now,
    };

    if (isEditMode) {
      saveTemplates(templates.map((item) => (String(item.id) === String(templateId) ? cleanTemplate : item)));
    } else {
      saveTemplates([...templates, { ...cleanTemplate, id: cleanTemplate.id || uid("certificate_template") }]);
    }

    navigate("/dashboard/certificate-templates");
  }

  async function copyTemplateJson() {
    const exportTemplate = {
      ...template,
      id: template.id || "certificate_template_export",
      type: "certificate",
      canvas: {
        width: Number(template.canvasWidth) || 1,
        height: Number(template.canvasHeight) || 1,
        backgroundImage: template.backgroundImage || "",
      },
    };

    await navigator.clipboard.writeText(JSON.stringify(exportTemplate, null, 2));
    alert("Template JSON copied to clipboard.");
  }

  const inputClass = "app-input h-9 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)]";

  return (
    <section className="certificate-editor-page app-page min-h-screen overflow-x-hidden pb-[82px]">
      <style>{certificateEditorThemeStyles}</style>
      <header className="app-header flex min-h-[74px] items-center justify-between gap-4 border-b px-7">
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/dashboard/certificate-templates")}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)] hover:text-[var(--app-heading)]"
            aria-label="Back to certificate templates"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="min-w-0">
            <p className="app-muted text-sm font-medium">Certificate Templates</p>
            <h1 className="app-heading truncate text-[21px] font-extrabold leading-tight">
              {isEditMode ? `Edit - ${template.name}` : "Create certificate template"}
            </h1>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={copyTemplateJson}
            className="app-card inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-bold shadow-sm hover:bg-[var(--app-surface-elevated)]"
          >
            <Copy size={16} />
            Copy Template JSON
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="app-success-btn inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-bold shadow-sm hover:opacity-90"
          >
            <Save size={16} />
            {isEditMode ? "Save changes" : "Create template"}
          </button>
        </div>
      </header>

      <div className="grid w-full max-w-full min-h-[calc(100vh-156px)] grid-cols-[minmax(240px,280px)_minmax(420px,1fr)_minmax(320px,380px)] gap-6 overflow-x-hidden p-5 max-[1180px]:grid-cols-1">
        <aside className="app-card min-w-0 overflow-hidden rounded-lg border p-3">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 className="app-muted text-xs font-bold uppercase tracking-wide">Layers</h2>
          </div>
          <div className="space-y-2">
            {template.elements.map((element) => {
              const selected = element.id === selectedId;
              return (
                <button
                  key={element.id}
                  type="button"
                  onClick={() => setSelectedId(element.id)}
                  className={`group flex h-[30px] w-full min-w-0 items-center gap-2 rounded-md px-2 text-left text-sm font-medium transition ${
                    selected ? "bg-[var(--app-success)] text-[var(--app-success-text)]" : "app-text hover:bg-[var(--app-surface-elevated)]"
                  }`}
                >
                  <span className={selected ? "text-[var(--app-success-text)]" : "text-[var(--app-muted)]"}>T</span>
                  <span className="min-w-0 flex-1 truncate">{element.label}</span>
                  <span className={`flex shrink-0 gap-1 ${selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        duplicateElement(element);
                      }}
                      className={`flex h-5 w-5 items-center justify-center rounded ${selected ? "text-[var(--app-success-text)] hover:bg-white/15" : "hover:bg-[var(--app-surface-elevated)]"}`}
                    >
                      <Copy size={13} />
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeElement(element);
                      }}
                      className={`flex h-5 w-5 items-center justify-center rounded ${selected ? "text-[var(--app-success-text)] hover:bg-white/15" : "text-[var(--app-danger)] hover:bg-[var(--app-surface-elevated)]"}`}
                    >
                      <Trash2 size={13} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-5 border-t border-[var(--app-border)] pt-3">
            <button
              type="button"
              onClick={addTextElement}
              className="app-text inline-flex h-8 items-center gap-2 rounded-md px-2 text-sm font-medium hover:bg-[var(--app-surface-elevated)]"
            >
              <Plus size={15} />
              Add text element
            </button>
          </div>
        </aside>

        <main className="app-card min-w-0 max-w-full overflow-hidden rounded-lg border">
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <h2 className="app-heading text-xl font-bold">Live Preview</h2>
            <label className="app-muted flex items-center gap-2 text-sm font-medium">
              <span>Canvas: {template.canvasWidth}×{template.canvasHeight}px</span>
              <select value={scalePercent} onChange={(event) => setScalePercent(Number(event.target.value))} className={inputClass}>
                {scaleOptions.map((option) => (
                  <option key={option} value={option}>Scaled to {option}%</option>
                ))}
              </select>
            </label>
          </div>

          <div
            className="h-[calc(100vh-314px)] w-full max-w-full overflow-auto border-t border-[var(--app-border)] px-6 py-5"
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={endDrag}
          >
            <div className="flex w-max min-w-full items-start justify-center">
              <div
                className="shrink-0"
                style={{
                  width: template.canvasWidth * scale,
                  height: template.canvasHeight * scale,
                }}
              >
                <div
                  className="relative overflow-hidden bg-[#ECECEC] shadow-lg"
                  onPointerDown={() => setSelectedId("")}
                  style={{
                    width: template.canvasWidth,
                    height: template.canvasHeight,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
                    backgroundSize: "100% 100%",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {template.elements.map((element) => (
                    <button
                      key={element.id}
                      type="button"
                      onPointerDown={(event) => beginDrag(event, element.id)}
                      className="absolute m-0 border-0 bg-transparent p-0 text-left whitespace-pre-wrap"
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
                        outline: element.id === selectedId ? "2px solid #26752C" : "1px solid transparent",
                        overflow: "visible",
                        minHeight: element.fontSize * element.lineHeight,
                        cursor: element.id === selectedId ? "move" : "grab",
                        touchAction: "none",
                        userSelect: "none",
                        zIndex: element.id === selectedId ? 10 : 1,
                      }}
                    >
                      {getElementText(element, template.previewData)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <section className="border-t border-[var(--app-border)] bg-[var(--app-surface)] shadow-[0_-8px_18px_rgba(15,23,42,0.04)]">
            <button
              type="button"
              onClick={() => setExampleOpen((value) => !value)}
              className="flex h-14 w-full items-center justify-between px-5 text-left text-lg font-bold"
            >
              Example Data for Preview
              {exampleOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {exampleOpen && (
              <div className="grid w-full max-w-full grid-cols-1 gap-x-6 gap-y-[18px] overflow-x-hidden px-5 pb-5 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                {[
                  ["programName", "Program Name"],
                  ["candidateName", "Candidate Name"],
                  ["candidatePosition", "Candidate Position"],
                  ["candidateTeam", "Candidate Team"],
                  ["programCategory", "Program Category"],
                  ["candidateGrade", "Candidate Grade"],
                  ["issueDate", "Issue Date string"],
                  ["organizerName", "Organizer Name"],
                  ["eventDate", "Event Date string"],
                  ["eventLocation", "Event Location"],
                  ["certificateTitle", "Certificate"],
                  ["achievementText", "of Achievement"],
                ].map(([key, label]) => (
                  <label key={key} className="app-text grid min-w-0 gap-1 text-xs font-semibold">
                    {label}
                    <input
                      value={template.previewData[key] || ""}
                      onChange={(event) => updatePreviewData(key, event.target.value)}
                      className={`${inputClass} box-border w-full max-w-full min-w-0`}
                    />
                  </label>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="app-card min-w-0 max-w-[380px] overflow-hidden overflow-y-auto rounded-lg border p-4 max-[1180px]:max-w-full">
          <h2 className="app-heading mb-8 text-2xl font-bold">Template Configuration</h2>
          <div className="min-w-0 space-y-4 overflow-x-hidden">
            <label className="app-text grid min-w-0 gap-1 text-sm font-medium">
              Template Name
              <input value={template.name} onChange={(event) => updateTemplate({ name: event.target.value })} className={`${inputClass} box-border w-full max-w-full min-w-0`} />
            </label>
            <label className="app-text grid min-w-0 gap-1 text-sm font-medium">
              Position Filter Optional, e.g., 1 for 1st place
              <input value={template.positionFilter || ""} placeholder="1, 2, 3" onChange={(event) => updateTemplate({ positionFilter: event.target.value })} className={`${inputClass} box-border w-full max-w-full min-w-0`} />
            </label>
            <label className="app-text grid min-w-0 gap-1 text-sm font-medium">
              Background Image
              <input
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className={`${inputClass} min-w-0 max-w-full truncate overflow-hidden whitespace-nowrap px-2`}
              />
            </label>
            {template.backgroundImage && (
              <>
                <div
                  className="h-[220px] rounded-md bg-[#0D1B2A] bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${template.backgroundImage})` }}
                />
                <button
                  type="button"
                  onClick={() => updateTemplate({ backgroundImage: "" })}
                  className="app-danger-btn h-9 rounded-md px-4 text-sm font-bold hover:opacity-90"
                >
                  Clear Image
                </button>
              </>
            )}
            <div className="grid w-full grid-cols-1 gap-4 min-[1380px]:grid-cols-[repeat(2,minmax(0,1fr))]">
              <label className="app-text grid min-w-0 gap-1 text-sm font-medium">
                Canvas Width (px)
                <NumberInput value={template.canvasWidth} onChange={(canvasWidth) => updateTemplate({ canvasWidth })} className="box-border w-full max-w-full min-w-0" />
              </label>
              <label className="app-text grid min-w-0 gap-1 text-sm font-medium">
                Canvas Height (px)
                <NumberInput value={template.canvasHeight} onChange={(canvasHeight) => updateTemplate({ canvasHeight })} className="box-border w-full max-w-full min-w-0" />
              </label>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="app-success-btn h-11 w-full rounded-md text-sm font-bold shadow-sm hover:opacity-90"
            >
              {isEditMode ? "Update Template" : "Create Template"}
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed bottom-0 left-[260px] right-0 z-40 overflow-x-auto border-t border-[var(--app-border)] bg-[var(--app-bg)]/95 px-3 py-2 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur max-[900px]:left-0">
        {selectedElement ? (
          <div className="flex min-w-max items-end gap-2">
            <ToolbarField label="Font Family">
              <FontFamilySelect value={selectedElement.fontFamily} onChange={(fontFamily) => updateSelected({ fontFamily })} className={`${inputClass} w-44`} />
            </ToolbarField>
            <ToolbarField label="Font Size"><NumberInput value={selectedElement.fontSize} onChange={(fontSize) => updateSelected({ fontSize })} className="w-24" /></ToolbarField>
            <ToolbarField label="Font Weight">
              <select value={selectedElement.fontWeight} onChange={(event) => updateSelected({ fontWeight: event.target.value })} className={`${inputClass} w-28`}>
                {["300", "400", "500", "600", "700", "800", "900"].map((weight) => <option key={weight}>{weight}</option>)}
              </select>
            </ToolbarField>
            <ToolbarField label="Align">
              <select value={selectedElement.align} onChange={(event) => updateSelected({ align: event.target.value })} className={`${inputClass} w-28`}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </ToolbarField>
            <ToolbarField label="Color"><input type="color" value={selectedElement.color || "#000000"} onChange={(event) => updateSelected({ color: event.target.value })} className="app-input h-9 w-16 rounded-md border p-1" /></ToolbarField>
            <ToolbarField label="Line Height"><NumberInput value={selectedElement.lineHeight} onChange={(lineHeight) => updateSelected({ lineHeight })} className="w-24" /></ToolbarField>
            <ToolbarField label="Width"><NumberInput value={selectedElement.width} onChange={(width) => updateSelected({ width })} className="w-24" /></ToolbarField>
            <ToolbarField label="Background">
              <input type="checkbox" checked={Boolean(selectedElement.showBg)} onChange={(event) => updateSelected({ showBg: event.target.checked })} className="h-9 w-5" />
            </ToolbarField>
            <ToolbarField label="X Position"><NumberInput value={selectedElement.x} onChange={(x) => updateSelected({ x })} className="w-24" /></ToolbarField>
            <ToolbarField label="Y Position"><NumberInput value={selectedElement.y} onChange={(y) => updateSelected({ y })} className="w-24" /></ToolbarField>
            <ToolbarField label="Data Source">
              <select value={selectedElement.dataSource} onChange={(event) => updateSelected({ dataSource: event.target.value })} className={`${inputClass} w-48`}>
                {dataSourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </ToolbarField>
            <ToolbarField label="Content / Label">
              <input
                value={selectedElement.dataSource === "manual" ? selectedElement.content || "" : selectedElement.label || ""}
                onChange={(event) =>
                  updateSelected(selectedElement.dataSource === "manual" ? { content: event.target.value, label: event.target.value } : { label: event.target.value })
                }
                className={`${inputClass} w-56`}
              />
            </ToolbarField>
            <button type="button" onClick={() => removeElement(selectedElement)} className="app-danger-btn h-9 rounded-md px-4 text-sm font-bold hover:opacity-90">
              Remove Element
            </button>
          </div>
        ) : (
          <div className="app-muted py-3 text-sm font-semibold">Select an element to edit its controls.</div>
        )}
      </div>
    </section>
  );
}

const certificateEditorThemeStyles = `
.certificate-editor-page h2,
.certificate-editor-page h3{color:var(--app-heading)}
.certificate-editor-page input,
.certificate-editor-page select{background:var(--app-input-bg);color:var(--app-text);border-color:var(--app-border)}
.certificate-editor-page input:focus,
.certificate-editor-page select:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-focus-ring);outline:none}
.certificate-editor-page .app-card{background:var(--app-surface);border-color:var(--app-border);color:var(--app-text)}
.certificate-editor-page .text-gray-500,
.certificate-editor-page .text-gray-600,
.certificate-editor-page .text-gray-700{color:var(--app-muted)}
`;
