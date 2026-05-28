import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import FontFamilySelect from "../components/FontFamilySelect";

const GREEN = "#26752C";
const TEMPLATE_KEY = "rankify_program_templates";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const EVENTS_KEY = "rankify_events";

function safeParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function makeId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

function readEvents() {
  return safeParse(localStorage.getItem(EVENTS_KEY), []);
}

function getActiveEventId() {
  const events = readEvents();
  const stored = localStorage.getItem(ACTIVE_EVENT_KEY);
  if (stored && events.some((event) => event.id === stored)) return stored;
  if (events[0]?.id) {
    localStorage.setItem(ACTIVE_EVENT_KEY, events[0].id);
    return events[0].id;
  }
  return "";
}

function normalizeTemplates() {
  const raw = safeParse(localStorage.getItem(TEMPLATE_KEY), []);
  if (Array.isArray(raw)) return { shape: "array", templates: raw };
  if (raw && typeof raw === "object") {
    return {
      shape: "object",
      templates: Object.entries(raw).flatMap(([eventId, items]) =>
        Array.isArray(items) ? items.map((item) => ({ ...item, eventId: item.eventId || eventId })) : []
      ),
    };
  }
  return { shape: "array", templates: [] };
}

function saveTemplates(templates, shape) {
  if (shape === "object") {
    const grouped = templates.reduce((acc, template) => {
      const eventId = template.eventId || "default";
      acc[eventId] = acc[eventId] || [];
      acc[eventId].push(template);
      return acc;
    }, {});
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(grouped));
  } else {
    localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
  }
  window.dispatchEvent(new Event("rankify-data-changed"));
}

function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function makePreviewImage(name, canvas) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
      <rect width="640" height="480" fill="#e5e7eb"/>
      <rect x="80" y="70" width="480" height="340" rx="18" fill="#f8fafc" stroke="#d1d5db"/>
      <text x="120" y="150" font-family="Arial" font-size="26" font-weight="700" fill="#0D1B2A">${name}</text>
      <text x="120" y="195" font-family="Arial" font-size="18" fill="#4b5563">Canvas ${canvas.width}x${canvas.height}px</text>
      <text x="120" y="245" font-family="Arial" font-size="20" fill="#111827">1. Muhammed Saeed</text>
      <text x="120" y="280" font-family="Arial" font-size="20" fill="#111827">2. Jabbar Ibraheem</text>
      <text x="120" y="315" font-family="Arial" font-size="20" fill="#111827">3. Ali bin Muhammed</text>
    </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const defaultPreviewData = {
  programName: "Elocution English Kids",
  category: "General",
  resultNumber: "23",
  eventName: "SSF PANANGARA UNIT SAHITYOLSAV",
  organizerName: "Panangara Unit",
  eventDate: "May 25",
  eventLocation: "Panangara",
  customField1: "[Custom Field 1]",
  winners: [
    { id: "winner_1", position: "1", name: "Muhammed Saeed", team: "Vadi Badr", image: "" },
    { id: "winner_2", position: "2", name: "Jabbar Ibraheem", team: "Isfahan", image: "" },
    { id: "winner_3", position: "3", name: "Ali bin Muhammed", team: "Vadi Quba", image: "" },
  ],
};

const defaultElements = [
  {
    id: "programName",
    type: "text",
    label: "Program Name",
    dataKey: "programName",
    x: 50,
    y: 50,
    width: 260,
    height: 28,
    fontFamily: "Roboto",
    fontSize: 24,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 1.2,
    textAlign: "left",
    visible: true,
  },
  {
    id: "category",
    type: "text",
    label: "Category",
    dataKey: "category",
    x: 50,
    y: 80,
    width: 200,
    height: 24,
    fontFamily: "Roboto",
    fontSize: 24,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 1.2,
    textAlign: "left",
    visible: true,
  },
  {
    id: "resultNumber",
    type: "text",
    label: "Result Number",
    dataKey: "resultNumber",
    prefix: "Result #",
    x: 50,
    y: 110,
    width: 180,
    height: 24,
    fontFamily: "Roboto",
    fontSize: 24,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 1.2,
    textAlign: "left",
    visible: true,
  },
  {
    id: "winnerContainer",
    type: "winnerContainer",
    label: "Winner Container",
    x: 50,
    y: 200,
    width: 700,
    height: 250,
    spacing: 70,
    posToNamePadding: 10,
    direction: "vertical",
    visible: true,
  },
  {
    id: "winnerPosition",
    type: "winnerText",
    label: "Position",
    dataKey: "winner.position",
    x: 0,
    y: 0,
    width: 42,
    height: 34,
    fontFamily: "Fjalla One",
    fontSize: 30,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 1.2,
    textAlign: "left",
    visible: true,
    ordinalSuffix: false,
    indicatorType: "Number",
    showBackground: false,
    showStroke: false,
  },
  {
    id: "winnerName",
    type: "winnerText",
    label: "Name",
    dataKey: "winner.name",
    x: 50,
    y: 18,
    width: 230,
    height: 24,
    fontFamily: "Bebas Neue",
    fontSize: 28,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 1,
    textAlign: "left",
    visible: true,
  },
  {
    id: "winnerTeam",
    type: "winnerText",
    label: "Team",
    dataKey: "winner.team",
    x: 50,
    y: 42,
    width: 180,
    height: 20,
    fontFamily: "Open Sans",
    fontSize: 20,
    fontWeight: "400",
    color: "#000000",
    lineHeight: 1,
    textAlign: "left",
    visible: true,
  },
  {
    id: "winnerPhoto",
    type: "winnerPhoto",
    label: "Photo",
    x: 330,
    y: 0,
    width: 80,
    height: 80,
    objectFit: "fill",
    opacity: 1,
    borderRadius: 0,
    visible: true,
  },
];

function inputClass(extra = "") {
  return `h-10 rounded-md border border-gray-300 bg-white px-3 text-sm outline-none focus:border-[#26752C] focus:ring-2 focus:ring-green-100 ${extra}`;
}

function ToolbarField({ label, children }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[#0D1B2A]">
      <span className="whitespace-nowrap font-medium">{label}</span>
      {children}
    </label>
  );
}

export default function TemplateEditorPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const canvasRef = useRef(null);
  const canvasScrollRef = useRef(null);
  const dragRef = useRef(null);
  const templateShapeRef = useRef("array");
  const [templateName, setTemplateName] = useState("New Template");
  const [canvas, setCanvas] = useState({ width: 800, height: 600, backgroundImage: "" });
  const [backgroundName, setBackgroundName] = useState("");
  const [scalePercent, setScalePercent] = useState(60);
  const [showGrid, setShowGrid] = useState(false);
  const [elements, setElements] = useState(defaultElements);
  const [selectedElementId, setSelectedElementId] = useState("programName");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(defaultPreviewData);
  const [removeTarget, setRemoveTarget] = useState(null);

  const scale = scalePercent / 100;
  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedElementId),
    [elements, selectedElementId]
  );
  const winnerContainer = elements.find((element) => element.id === "winnerContainer");
  const winnerChildren = elements.filter((element) => element.type === "winnerText" || element.type === "winnerPhoto");

  useEffect(() => {
    const { shape, templates } = normalizeTemplates();
    templateShapeRef.current = shape;
    if (!templateId) return;
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;

    setTemplateName(template.name || "New Template");
    setCanvas({
      width: Number(template.canvas?.width) || 800,
      height: Number(template.canvas?.height) || 600,
      backgroundImage: template.canvas?.backgroundImage || "",
    });
    setElements(Array.isArray(template.elements) && template.elements.length ? template.elements : defaultElements);
    setPreviewData(template.previewData || defaultPreviewData);
  }, [templateId]);

  useEffect(() => {
    function onKeyDown(event) {
      if (!selectedElementId) return;
      const keys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
      if (!keys.includes(event.key)) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      updateElement(selectedElementId, (element) => ({
        x: Math.max(0, Number(element.x || 0) + dx),
        y: Math.max(0, Number(element.y || 0) + dy),
      }));
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedElementId]);

  function updateElement(id, patchOrUpdater) {
    setElements((current) =>
      current.map((element) => {
        if (element.id !== id) return element;
        const patch = typeof patchOrUpdater === "function" ? patchOrUpdater(element) : patchOrUpdater;
        return { ...element, ...patch };
      })
    );
  }

  function updateSelected(patch) {
    if (!selectedElement) return;
    updateElement(selectedElement.id, patch);
  }

  function elementText(element, winner) {
    if (element.custom) return element.content || element.label;
    if (element.id === "resultNumber") return `${element.prefix || "Result #"}${previewData.resultNumber}`;
    if (element.dataKey === "winner.position") return winner?.position || "";
    if (element.dataKey === "winner.name") return winner?.name || "";
    if (element.dataKey === "winner.team") return winner?.team || "";
    return previewData[element.dataKey] || element.label;
  }

  function addCustomTextField() {
    const count = elements.filter((element) => element.custom && element.type === "text").length + 1;
    const newElement = {
      id: makeId("custom_text"),
      type: "text",
      label: `Custom Field ${count}`,
      dataKey: `customField${count}`,
      x: 100,
      y: 150,
      width: 240,
      height: 28,
      fontFamily: "Roboto",
      fontSize: 24,
      fontWeight: "400",
      color: "#000000",
      lineHeight: 1.2,
      textAlign: "left",
      visible: true,
      custom: true,
      content: `[Custom Field ${count}]`,
    };
    setElements((current) => [...current, newElement]);
    setSelectedElementId(newElement.id);
  }

  function addImageElement() {
    const newElement = {
      id: makeId("custom_image"),
      type: "image",
      label: "manual-upload",
      x: 265.4,
      y: 203.3,
      width: 100,
      height: 100,
      objectFit: "fill",
      opacity: 1,
      borderRadius: 0,
      visible: true,
      custom: true,
      imageData: "",
    };
    setElements((current) => [...current, newElement]);
    setSelectedElementId(newElement.id);
  }

  function duplicateElement(element) {
    if (!element?.custom) return;
    const copy = {
      ...element,
      id: makeId("copy"),
      label: `${element.label} Copy`,
      x: Number(element.x || 0) + 20,
      y: Number(element.y || 0) + 20,
    };
    setElements((current) => [...current, copy]);
    setSelectedElementId(copy.id);
  }

  function removeElement(element) {
    if (!element?.custom) return;
    setElements((current) => current.filter((item) => item.id !== element.id));
    setSelectedElementId("programName");
    setRemoveTarget(null);
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await dataUrlFromFile(file);
    const image = new Image();
    image.onload = () => {
      const nextCanvas = { width: image.naturalWidth, height: image.naturalHeight, backgroundImage: dataUrl };
      setCanvas(nextCanvas);
      setBackgroundName(file.name);

      const previewWidth = canvasScrollRef.current?.clientWidth || 900;
      const previewHeight = canvasScrollRef.current?.clientHeight || 520;
      const fitScale = Math.min(previewWidth / image.naturalWidth, previewHeight / image.naturalHeight, 1);
      setScalePercent(Math.round(Math.max(fitScale, 0.25) * 100));
    };
    image.src = dataUrl;
  }

  async function handleImageUpload(event, elementId) {
    const file = event.target.files?.[0];
    if (!file) return;
    const dataUrl = await dataUrlFromFile(file);
    updateElement(elementId, { imageData: dataUrl, imageName: file.name });
  }

  function saveTemplate() {
    const activeEventId = getActiveEventId();
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }
    if (!templateName.trim()) {
      alert("Template name is required.");
      return;
    }

    const { shape, templates } = normalizeTemplates();
    const now = new Date().toISOString();
    const template = {
      id: templateId || makeId("template"),
      eventId: activeEventId,
      name: templateName.trim(),
      type: "program",
      canvas,
      elements,
      previewData,
      previewImage: canvas.backgroundImage || makePreviewImage(templateName.trim(), canvas),
      createdAt: templateId ? templates.find((item) => item.id === templateId)?.createdAt || today() : today(),
      updatedAt: now,
    };

    const updated = templateId
      ? templates.map((item) => (item.id === templateId ? template : item))
      : [...templates, template];

    saveTemplates(updated, shape || templateShapeRef.current);
    navigate("/dashboard/program-templates");
  }

  function beginDrag(event, elementId) {
    event.stopPropagation();
    setSelectedElementId(elementId);
    const element = elements.find((item) => item.id === elementId);
    if (!element) return;
    dragRef.current = {
      id: elementId,
      startX: event.clientX,
      startY: event.clientY,
      originalX: Number(element.x || 0),
      originalY: Number(element.y || 0),
    };
  }

  function handlePointerMove(event) {
    if (!dragRef.current) return;
    const drag = dragRef.current;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    updateElement(drag.id, {
      x: Math.max(0, Math.round((drag.originalX + dx) * 10) / 10),
      y: Math.max(0, Math.round((drag.originalY + dy) * 10) / 10),
    });
  }

  function endDrag() {
    dragRef.current = null;
  }

  function renderTextElement(element, winner, offset = { x: 0, y: 0 }) {
    if (element.visible === false) return null;
    return (
      <div
        key={`${element.id}_${winner?.id || "single"}`}
        onPointerDown={(event) => beginDrag(event, element.id)}
        className={selectedElementId === element.id ? "ring-2 ring-blue-600" : ""}
        style={{
          position: "absolute",
          left: Number(element.x || 0) + offset.x,
          top: Number(element.y || 0) + offset.y,
          width: element.width || "auto",
          minHeight: element.height || "auto",
          color: element.color,
          fontFamily: element.fontFamily,
          fontSize: Number(element.fontSize || 16),
          fontWeight: element.fontWeight || "400",
          lineHeight: element.lineHeight || 1.2,
          textAlign: element.textAlign || "left",
          cursor: "move",
          userSelect: "none",
          whiteSpace: "pre-line",
        }}
      >
        {elementText(element, winner)}
      </div>
    );
  }

  function renderImageElement(element, winner, offset = { x: 0, y: 0 }) {
    if (element.visible === false) return null;
    const imageData = element.type === "winnerPhoto" ? winner?.image : element.imageData;
    return (
      <div
        key={`${element.id}_${winner?.id || "single"}`}
        onPointerDown={(event) => beginDrag(event, element.id)}
        className={selectedElementId === element.id ? "ring-2 ring-blue-600" : ""}
        style={{
          position: "absolute",
          left: Number(element.x || 0) + offset.x,
          top: Number(element.y || 0) + offset.y,
          width: Number(element.width || 80),
          height: Number(element.height || 80),
          overflow: "hidden",
          borderRadius: Number(element.borderRadius || 0),
          opacity: Number(element.opacity ?? 1),
          cursor: "move",
          background: "#f3f4f6",
          border: imageData ? "0" : "1px dashed #cbd5e1",
        }}
      >
        {imageData ? (
          <img
            src={imageData}
            alt={element.label}
            style={{
              width: "100%",
              height: "100%",
              objectFit: element.objectFit || "cover",
              display: "block",
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No Image</div>
        )}
      </div>
    );
  }

  function renderWinnerContainer() {
    if (!winnerContainer || winnerContainer.visible === false) return null;
    const isHorizontal = winnerContainer.direction === "horizontal";
    return (
      <div
        key="winnerContainer"
        onPointerDown={(event) => beginDrag(event, winnerContainer.id)}
        className={selectedElementId === "winnerContainer" ? "border border-dashed border-violet-500" : ""}
        style={{
          position: "absolute",
          left: Number(winnerContainer.x || 0),
          top: Number(winnerContainer.y || 0),
          width: Number(winnerContainer.width || 700),
          height: Number(winnerContainer.height || 250),
          cursor: "move",
        }}
      >
        {previewData.winners.map((winner, index) => {
          const offset = isHorizontal
            ? { x: index * Number(winnerContainer.spacing || 70), y: 0 }
            : { x: 0, y: index * Number(winnerContainer.spacing || 70) };
          return winnerChildren.map((child) =>
            child.type === "winnerPhoto"
              ? renderImageElement(child, winner, offset)
              : renderTextElement(child, winner, offset)
          );
        })}
      </div>
    );
  }

  const regularElements = elements.filter(
    (element) => !["winnerContainer", "winnerText", "winnerPhoto"].includes(element.type)
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-28 text-[#0D1B2A]">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-[#F8FAFC] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/program-templates")}
              className="rounded-md px-2 py-1 text-2xl text-gray-600 hover:bg-gray-100"
            >
              &larr;
            </button>
            <div>
              <p className="text-sm text-gray-500">Poster Templates</p>
              <h1 className="text-2xl font-bold">{templateId ? `Edit - ${templateName || "New Template"}` : "Create poster template"}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={saveTemplate}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
          >
            &#9635; {templateId ? "Save changes" : "Create template"}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-[260px_minmax(0,1fr)_360px] gap-4 p-4">
        <aside className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-600">Layers</h2>
          <LayerButton element={elements.find((item) => item.id === "programName")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "category")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "resultNumber")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={winnerContainer} selected={selectedElementId} onSelect={setSelectedElementId} icon="⌘" />

          <p className="mb-2 mt-5 text-xs font-bold uppercase tracking-wide text-gray-400">Winner Item (All)</p>
          <LayerButton element={elements.find((item) => item.id === "winnerPosition")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "winnerName")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "winnerTeam")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "winnerPhoto")} selected={selectedElementId} onSelect={setSelectedElementId} icon="▧" />

          {elements.some((item) => item.custom) && <div className="my-4 border-t border-gray-200" />}
          {elements
            .filter((item) => item.custom)
            .map((element) => (
              <div
                key={element.id}
                className={`mb-1 flex items-center gap-1 rounded-md px-2 py-2 text-sm ${
                  selectedElementId === element.id ? "bg-[#26752C] text-white" : "hover:bg-gray-50"
                }`}
              >
                <button type="button" onClick={() => setSelectedElementId(element.id)} className="min-w-0 flex-1 truncate text-left">
                  {element.type === "image" ? "▧" : "T"} {element.label}
                </button>
                <button type="button" title="Duplicate" onClick={() => duplicateElement(element)} className="rounded px-1 hover:bg-white/20">
                  □
                </button>
                <button type="button" title="Remove" onClick={() => setRemoveTarget(element)} className="rounded px-1 hover:bg-white/20">
                  ×
                </button>
              </div>
            ))}

          <div className="mt-4 border-t border-gray-200 pt-4">
            <button type="button" onClick={addCustomTextField} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50">
              + Add custom text field
            </button>
            <button type="button" onClick={addImageElement} className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50">
              + Add image element
            </button>
          </div>

          <p className="mt-40 text-xs text-gray-400">↑↓ Arrow keys nudge selected element<br />(Shift = 10 px)</p>
        </aside>

        <section className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="whitespace-nowrap text-2xl font-bold">Live Preview</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">Canvas: {canvas.width}x{canvas.height}px</span>
              <select
                value={scalePercent}
                onChange={(event) => setScalePercent(Number(event.target.value))}
                className="h-9 rounded-md border border-gray-300 bg-white px-3"
              >
                {[40, 60, 75, 100].map((value) => (
                  <option key={value} value={value}>Scaled to {value}%</option>
                ))}
              </select>
              <label className="flex items-center gap-2">
                Grid
                <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />
              </label>
            </div>
          </div>

          <div
            ref={canvasScrollRef}
            className="max-h-[520px] overflow-auto rounded-lg bg-white p-4"
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
          >
            <div className="flex min-w-full justify-center">
              <div
                style={{
                  width: canvas.width * scale,
                  height: canvas.height * scale,
                  position: "relative",
                  flex: "0 0 auto",
                }}
              >
                <div
                  ref={canvasRef}
                  onPointerDown={() => setSelectedElementId("")}
                  style={{
                    width: canvas.width,
                    height: canvas.height,
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    position: "relative",
                    overflow: "hidden",
                    background: "#e5e7eb",
                    border: "1px solid #d1d5db",
                    borderRadius: 6,
                    backgroundImage: showGrid
                      ? "linear-gradient(rgba(37,99,235,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.16) 1px, transparent 1px)"
                      : undefined,
                    backgroundSize: showGrid ? "40px 40px" : undefined,
                  }}
                >
                  {canvas.backgroundImage && (
                    <img
                      src={canvas.backgroundImage}
                      alt=""
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  )}
                  {regularElements.map((element) =>
                    element.type === "image" ? renderImageElement(element) : renderTextElement(element)
                  )}
                  {renderWinnerContainer()}
                </div>
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-lg bg-white/70 p-4">
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              className="flex w-full items-center justify-between text-left text-lg font-semibold"
            >
              Example Poster Data for Preview <span>{previewOpen ? "⌃" : "⌄"}</span>
            </button>
            {previewOpen && (
              <PreviewDataPanel previewData={previewData} setPreviewData={setPreviewData} />
            )}
          </section>
        </section>

        <aside className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-8 text-2xl font-bold">Template Configuration</h2>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-semibold">Template Name</span>
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className={inputClass("w-full text-base")} />
          </label>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-semibold">Background Image</span>
            <input type="file" accept="image/*" onChange={handleBackgroundUpload} className={inputClass("w-full")} />
          </label>
          {backgroundName && (
            <div className="mb-5 flex items-start justify-between gap-3 text-sm text-gray-500">
              <span className="min-w-0 truncate">Image loaded. Canvas dimensions set to image size. {backgroundName}</span>
              <button type="button" onClick={() => { setCanvas((current) => ({ ...current, backgroundImage: "" })); setBackgroundName(""); }} className="shrink-0 text-red-600">
                Clear Image
              </button>
            </div>
          )}
          <h3 className="mb-3 text-sm font-bold">Canvas Dimensions</h3>
          <div className="grid grid-cols-2 gap-3">
            <ToolbarField label="Width (px)">
              <input
                type="number"
                value={canvas.width}
                onChange={(event) => setCanvas((current) => ({ ...current, width: Number(event.target.value) || 1 }))}
                className={inputClass("w-full")}
              />
            </ToolbarField>
            <ToolbarField label="Height (px)">
              <input
                type="number"
                value={canvas.height}
                onChange={(event) => setCanvas((current) => ({ ...current, height: Number(event.target.value) || 1 }))}
                className={inputClass("w-full")}
              />
            </ToolbarField>
          </div>
          <div className="mt-48 border-t border-gray-200 pt-6">
            <button type="button" onClick={saveTemplate} className="h-14 w-full rounded-md bg-[#26752C] text-lg font-bold text-white hover:bg-[#1f6425]">
              {templateId ? "Save Template Changes" : "Create New Template"}
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">Tip: you can also save from the sticky bar at the top.</p>
          </div>
        </aside>
      </main>

      <ElementToolbar
        selectedElement={selectedElement}
        updateSelected={updateSelected}
        setRemoveTarget={setRemoveTarget}
        addCustomTextField={addCustomTextField}
        addImageElement={addImageElement}
        setSelectedElementId={setSelectedElementId}
        handleImageUpload={handleImageUpload}
      />

      {removeTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-[560px] rounded-lg bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Remove "{removeTarget.label}"?</h2>
            <p className="mt-3 text-gray-500">This element will be permanently removed from the template.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setRemoveTarget(null)} className="h-10 rounded-md border border-gray-300 px-4 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={() => removeElement(removeTarget)} className="h-10 rounded-md bg-red-600 px-5 font-semibold text-white hover:bg-red-700">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayerButton({ element, selected, onSelect, icon = "T" }) {
  if (!element) return null;
  return (
    <button
      type="button"
      onClick={() => onSelect(element.id)}
      className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
        selected === element.id ? "bg-[#26752C] text-white" : "hover:bg-gray-50"
      }`}
    >
      <span className="mr-2">{icon}</span>{element.label}
    </button>
  );
}

function NumberInput({ value, onChange, className = "w-20" }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
      className={inputClass(className)}
    />
  );
}

function AlignButtons({ value, onChange }) {
  return (
    <div className="flex h-10 overflow-hidden rounded-md border border-gray-300">
      {["left", "center", "right"].map((align) => (
        <button
          type="button"
          key={align}
          onClick={() => onChange(align)}
          className={`w-10 ${value === align ? "bg-green-100" : "bg-white"}`}
        >
          {align === "left" ? "≡" : align === "center" ? "≣" : "≡"}
        </button>
      ))}
    </div>
  );
}

function ElementToolbar({
  selectedElement,
  updateSelected,
  setRemoveTarget,
  addCustomTextField,
  addImageElement,
  setSelectedElementId,
  handleImageUpload,
}) {
  const chip = (label, id) => (
    <button key={id} type="button" onClick={() => setSelectedElementId(id)} className="rounded-md bg-green-50 px-4 py-2 text-green-800">
      {label}
    </button>
  );

  if (!selectedElement) {
    return (
      <div className="fixed bottom-0 left-[260px] right-0 z-40 border-t border-gray-200 bg-[#F8FAFC]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] backdrop-blur">
        <div className="flex min-w-max items-center gap-8 overflow-x-auto">
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Tools</p>
            <p className="text-sm text-gray-500">Click the canvas, or pick an element below.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Add New</p>
            <div className="flex gap-2">
              <button type="button" onClick={addCustomTextField} className="h-10 rounded-md border border-gray-300 bg-white px-4 hover:bg-gray-50">
                + Custom Field
              </button>
              <button type="button" onClick={addImageElement} className="h-10 rounded-md border border-gray-300 bg-white px-4 hover:bg-gray-50">
                + Image Element
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500">Existing Elements</p>
            <div className="flex gap-2">
              {[
                ["Program", "programName"],
                ["Category", "category"],
                ["Result #", "resultNumber"],
                ["Winners", "winnerContainer"],
                ["Position", "winnerPosition"],
                ["Name", "winnerName"],
                ["Team", "winnerTeam"],
                ["Image", "winnerPhoto"],
              ].map(([label, id]) => chip(label, id))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isImage = selectedElement.type === "image" || selectedElement.type === "winnerPhoto";
  const isWinnerContainer = selectedElement.type === "winnerContainer";
  const isResult = selectedElement.id === "resultNumber";

  return (
    <div className="fixed bottom-0 left-[260px] right-0 z-40 overflow-x-auto border-t border-gray-200 bg-[#F8FAFC]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.04)] backdrop-blur">
      <div className="flex min-w-max items-end gap-3">
        {isWinnerContainer ? (
          <>
            <ToolbarField label="X Position"><NumberInput value={selectedElement.x} onChange={(x) => updateSelected({ x })} /></ToolbarField>
            <ToolbarField label="Y Position"><NumberInput value={selectedElement.y} onChange={(y) => updateSelected({ y })} /></ToolbarField>
            <ToolbarField label="Width"><NumberInput value={selectedElement.width} onChange={(width) => updateSelected({ width })} /></ToolbarField>
            <ToolbarField label="Spacing"><NumberInput value={selectedElement.spacing} onChange={(spacing) => updateSelected({ spacing })} /></ToolbarField>
            <ToolbarField label="Pos to Name Padding"><NumberInput value={selectedElement.posToNamePadding} onChange={(posToNamePadding) => updateSelected({ posToNamePadding })} /></ToolbarField>
            <ToolbarField label="Direction">
              <select value={selectedElement.direction || "vertical"} onChange={(event) => updateSelected({ direction: event.target.value })} className={inputClass("w-36")}>
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </ToolbarField>
          </>
        ) : isImage ? (
          <>
            <ToolbarField label="X Position"><NumberInput value={selectedElement.x} onChange={(x) => updateSelected({ x })} /></ToolbarField>
            <ToolbarField label="Y Position"><NumberInput value={selectedElement.y} onChange={(y) => updateSelected({ y })} /></ToolbarField>
            <label className="flex flex-col gap-2 text-sm font-medium">Show<input type="checkbox" checked={selectedElement.visible !== false} onChange={(event) => updateSelected({ visible: event.target.checked })} /></label>
            <ToolbarField label="Width"><NumberInput value={selectedElement.width} onChange={(width) => updateSelected({ width })} /></ToolbarField>
            <ToolbarField label="Height"><NumberInput value={selectedElement.height} onChange={(height) => updateSelected({ height })} /></ToolbarField>
            <ToolbarField label="Opacity"><NumberInput value={selectedElement.opacity} onChange={(opacity) => updateSelected({ opacity })} /></ToolbarField>
            <ToolbarField label="Border Radius"><NumberInput value={selectedElement.borderRadius} onChange={(borderRadius) => updateSelected({ borderRadius })} /></ToolbarField>
            <ToolbarField label="Object Fit">
              <select value={selectedElement.objectFit || "fill"} onChange={(event) => updateSelected({ objectFit: event.target.value })} className={inputClass("w-32")}>
                <option value="fill">Fill</option>
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
              </select>
            </ToolbarField>
            {selectedElement.custom && (
              <>
                <ToolbarField label="Image Source">
                  <select className={inputClass("w-44")}><option>Manual Upload</option><option>Winner Photo</option><option>Event Logo</option></select>
                </ToolbarField>
                <ToolbarField label="Upload Image">
                  <input type="file" accept="image/*" onChange={(event) => handleImageUpload(event, selectedElement.id)} className={inputClass("w-96")} />
                </ToolbarField>
                <button type="button" onClick={() => setRemoveTarget(selectedElement)} className="h-10 rounded-md bg-red-600 px-4 font-semibold text-white hover:bg-red-700">
                  × Remove Element
                </button>
              </>
            )}
          </>
        ) : (
          <>
            {isResult && (
              <ToolbarField label="Prefix">
                <input value={selectedElement.prefix || ""} onChange={(event) => updateSelected({ prefix: event.target.value })} className={inputClass("w-28")} />
              </ToolbarField>
            )}
            <ToolbarField label="Font Family">
              <FontFamilySelect
                value={selectedElement.fontFamily || "Roboto"}
                onChange={(fontFamily) => updateSelected({ fontFamily })}
                className={inputClass("w-48")}
              />
            </ToolbarField>
            <ToolbarField label="Font Size"><NumberInput value={selectedElement.fontSize} onChange={(fontSize) => updateSelected({ fontSize })} /></ToolbarField>
            <ToolbarField label="Font Weight">
              <select value={selectedElement.fontWeight || "400"} onChange={(event) => updateSelected({ fontWeight: event.target.value })} className={inputClass("w-36")}>
                <option value="400">400 - Regular</option>
                <option value="600">600 - Semibold</option>
                <option value="700">700 - Bold</option>
              </select>
            </ToolbarField>
            <ToolbarField label="Align"><AlignButtons value={selectedElement.textAlign || "left"} onChange={(textAlign) => updateSelected({ textAlign })} /></ToolbarField>
            <ToolbarField label="Color"><input type="color" value={selectedElement.color || "#000000"} onChange={(event) => updateSelected({ color: event.target.value })} className={inputClass("w-20 p-1")} /></ToolbarField>
            <ToolbarField label="Line Height"><NumberInput value={selectedElement.lineHeight} onChange={(lineHeight) => updateSelected({ lineHeight })} /></ToolbarField>
            <ToolbarField label="Width"><NumberInput value={selectedElement.width} onChange={(width) => updateSelected({ width })} /></ToolbarField>
            <ToolbarField label="X Position"><NumberInput value={selectedElement.x} onChange={(x) => updateSelected({ x })} /></ToolbarField>
            <ToolbarField label="Y Position"><NumberInput value={selectedElement.y} onChange={(y) => updateSelected({ y })} /></ToolbarField>
            {isResult && (
              <>
                <label className="flex flex-col gap-2 text-sm font-medium">Ordinal Suffix<input type="checkbox" checked={Boolean(selectedElement.ordinalSuffix)} onChange={(event) => updateSelected({ ordinalSuffix: event.target.checked })} /></label>
                <ToolbarField label="Indicator Type">
                  <select value={selectedElement.indicatorType || "Number"} onChange={(event) => updateSelected({ indicatorType: event.target.value })} className={inputClass("w-32")}>
                    <option>None</option>
                    <option>Number</option>
                    <option>Dots</option>
                    <option>Medal</option>
                  </select>
                </ToolbarField>
                <label className="flex flex-col gap-2 text-sm font-medium">Background<input type="checkbox" checked={Boolean(selectedElement.showBackground)} onChange={(event) => updateSelected({ showBackground: event.target.checked })} /></label>
                <label className="flex flex-col gap-2 text-sm font-medium">Stroke<input type="checkbox" checked={Boolean(selectedElement.showStroke)} onChange={(event) => updateSelected({ showStroke: event.target.checked })} /></label>
              </>
            )}
            {selectedElement.custom && (
              <>
                <ToolbarField label="Label"><input value={selectedElement.label} onChange={(event) => updateSelected({ label: event.target.value })} className={inputClass("w-64")} /></ToolbarField>
                <ToolbarField label="Data Source"><select className={inputClass("w-40")}><option>Manual Input</option></select></ToolbarField>
                <ToolbarField label="Content"><input value={selectedElement.content || ""} onChange={(event) => updateSelected({ content: event.target.value })} className={inputClass("w-64")} /></ToolbarField>
                <button type="button" onClick={() => setRemoveTarget(selectedElement)} className="h-10 rounded-md bg-red-600 px-4 font-semibold text-white hover:bg-red-700">
                  × Remove Element
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PreviewDataPanel({ previewData, setPreviewData }) {
  function updateField(key, value) {
    setPreviewData((current) => ({ ...current, [key]: value }));
  }

  function updateWinner(index, key, value) {
    setPreviewData((current) => ({
      ...current,
      winners: current.winners.map((winner, winnerIndex) =>
        winnerIndex === index ? { ...winner, [key]: value } : winner
      ),
    }));
  }

  async function updateWinnerImage(index, file) {
    if (!file) return;
    const image = await dataUrlFromFile(file);
    updateWinner(index, "image", image);
  }

  return (
    <div className="mt-5">
      <p className="mb-4 text-sm text-gray-500">
        Adjust these values to see how your template elements will look with real data. These values are NOT saved with the template.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <ToolbarField label="Program Name"><input value={previewData.programName} onChange={(event) => updateField("programName", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
        <ToolbarField label="Program Category"><input value={previewData.category} onChange={(event) => updateField("category", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
        <ToolbarField label="Result Number"><input value={previewData.resultNumber} onChange={(event) => updateField("resultNumber", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
        <ToolbarField label="Event Name"><input value={previewData.eventName} onChange={(event) => updateField("eventName", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
        <ToolbarField label="Organizer Name"><input value={previewData.organizerName} onChange={(event) => updateField("organizerName", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
        <ToolbarField label="Event Date (string)"><input value={previewData.eventDate} onChange={(event) => updateField("eventDate", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
        <ToolbarField label="Event Location"><input value={previewData.eventLocation} onChange={(event) => updateField("eventLocation", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
      </div>

      <h3 className="mt-6 font-semibold">Example Winners</h3>
      <div className="mt-3 space-y-3">
        {previewData.winners.map((winner, index) => (
          <div key={winner.id} className="rounded-lg border border-gray-100 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Winner {index + 1} Example Data</p>
              <button
                type="button"
                onClick={() => setPreviewData((current) => ({ ...current, winners: current.winners.filter((_, itemIndex) => itemIndex !== index) }))}
                className="h-7 w-7 rounded-full bg-red-600 text-white"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-[160px_1fr_1fr_1fr] gap-2">
              <ToolbarField label="Position"><input value={winner.position} onChange={(event) => updateWinner(index, "position", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
              <ToolbarField label="Name"><input value={winner.name} onChange={(event) => updateWinner(index, "name", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
              <ToolbarField label="Team"><input value={winner.team} onChange={(event) => updateWinner(index, "team", event.target.value)} className={inputClass("w-full")} /></ToolbarField>
              <ToolbarField label="Image File"><input type="file" accept="image/*" onChange={(event) => updateWinnerImage(index, event.target.files?.[0])} className={inputClass("w-full")} /></ToolbarField>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() =>
          setPreviewData((current) => ({
            ...current,
            winners: [...current.winners, { id: makeId("winner"), position: String(current.winners.length + 1), name: "New Winner", team: "Team", image: "" }],
          }))
        }
        className="mt-4 h-10 rounded-md border border-gray-300 bg-white px-4 hover:bg-gray-50"
      >
        + Add Example Winner
      </button>
    </div>
  );
}
