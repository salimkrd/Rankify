import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Image,
  PlusCircle,
  Save,
  Trash2,
  Trophy,
  Type,
  X,
} from "lucide-react";
import FontFamilySelect from "../components/FontFamilySelect";
import { getStoredActiveEventIdForCurrentUser } from "../services/activeEventService.js";
import {
  createProgramTemplate,
  getProgramTemplateById,
  updateProgramTemplate,
} from "../services/programTemplatesService.js";

const GREEN = "#26752C";
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

function makeId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

function getPreviewableImageUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.dataUrl || value.dataURL || value.url || value.src || value.imageData || "";
  }
  return "";
}

function firstTextValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  }
  return "";
}

function getObjectPathValue(source, path) {
  if (!source || !path) return undefined;
  return String(path)
    .split(".")
    .reduce((current, part) => (current && current[part] !== undefined ? current[part] : undefined), source);
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

function asArray(...values) {
  for (const value of values) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
  }
  return null;
}

function normalizeTemplateForEditor(template) {
  const source = template?.templateData || template?.template_data || template?.data || template || {};
  const savedCanvas = source.canvas || template?.canvas || {};
  const width =
    Number(savedCanvas.width || source.canvasWidth || source.width || template?.canvasWidth || template?.width) ||
    800;
  const height =
    Number(savedCanvas.height || source.canvasHeight || source.height || template?.canvasHeight || template?.height) ||
    600;
  const backgroundImage = getPreviewableImageUrl(
    savedCanvas.backgroundImage ||
      source.backgroundImage ||
      source.background ||
      template?.backgroundImage ||
      template?.previewImage
  );
  const elements = asArray(
    source.elements,
    source.layers,
    source.objects,
    source.items,
    template?.elements,
    template?.layers,
    template?.objects,
    template?.items
  );

  const mergedPreviewData = {
    ...defaultPreviewData,
    ...(source.previewData || template?.previewData || {}),
  };

  return {
    name: firstTextValue(template?.name, template?.title, source.name, source.title, "Untitled Template"),
    eventId: template?.eventId || template?.event_id || source.eventId || source.event_id || "",
    canvas: {
      ...savedCanvas,
      width,
      height,
      backgroundImage,
    },
    elements: Array.isArray(elements) ? elements : [],
    previewData: {
      ...mergedPreviewData,
      winners: Array.isArray(mergedPreviewData.winners) ? mergedPreviewData.winners : defaultPreviewData.winners,
    },
    backgroundName: firstTextValue(source.backgroundName, source.imageName, template?.backgroundName, template?.imageName),
  };
}

function inputClass(extra = "") {
  return `app-input h-10 rounded-md border px-3 text-sm outline-none focus:border-[var(--app-primary)] focus:ring-2 focus:ring-[var(--app-focus-ring)] ${extra}`;
}

function ToolbarField({ label, children }) {
  return (
    <label className="app-text flex min-w-0 flex-col gap-1 text-sm">
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
  const isEditMode = Boolean(templateId);
  const [templateName, setTemplateName] = useState("New Template");
  const [templateEventId, setTemplateEventId] = useState("");
  const [canvas, setCanvas] = useState({ width: 800, height: 600, backgroundImage: "" });
  const [backgroundName, setBackgroundName] = useState("");
  const [editorLoading, setEditorLoading] = useState(Boolean(templateId));
  const [editorError, setEditorError] = useState("");
  const [scalePercent, setScalePercent] = useState(60);
  const [showGrid, setShowGrid] = useState(false);
  const [elements, setElements] = useState(defaultElements);
  const [selectedElementId, setSelectedElementId] = useState("programName");
  const [previewOpen, setPreviewOpen] = useState(false);
  const scaleOptions = [40, 60, 75, 100];
  const scaleSelectOptions = scaleOptions.includes(scalePercent)
    ? scaleOptions
    : [scalePercent, ...scaleOptions].sort((a, b) => a - b);
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
    templateShapeRef.current = "array";
    if (!templateId) {
      setTemplateName("New Template");
      setTemplateEventId("");
      setCanvas({ width: 800, height: 600, backgroundImage: "" });
      setBackgroundName("");
      setElements(defaultElements);
      setSelectedElementId("programName");
      setPreviewData(defaultPreviewData);
      setEditorLoading(false);
      setEditorError("");
      return;
    }

    let mounted = true;
    async function loadTemplate() {
      setEditorLoading(true);
      setEditorError("");
      try {
        const activeEventId = await getStoredActiveEventIdForCurrentUser();
        const template = await getProgramTemplateById(templateId);
        if (!mounted) return;
        const normalized = normalizeTemplateForEditor(template);

        if (normalized.eventId && (!activeEventId || String(normalized.eventId) !== String(activeEventId))) {
          throw new Error("This template does not belong to the current active event.");
        }

        setTemplateName(normalized.name);
        setTemplateEventId(normalized.eventId);
        setCanvas(normalized.canvas);
        setBackgroundName(normalized.backgroundName);
        setElements(normalized.elements);
        setSelectedElementId(
          normalized.elements.find((element) => element.id === "programName")?.id ||
            normalized.elements[0]?.id ||
            ""
        );
        setPreviewData(normalized.previewData);
      } catch (error) {
        if (!mounted) return;
        setEditorError(error.message || "Unable to load this template.");
      } finally {
        if (mounted) setEditorLoading(false);
      }
    }

    loadTemplate();
    return () => {
      mounted = false;
    };
  }, [templateId]);

  useEffect(() => {
    const node = canvasScrollRef.current;
    if (!node) return;

    function updateFitScale() {
      const previewWidth = node.clientWidth;
      const previewHeight = node.clientHeight;
      const fitScale = Math.min(previewWidth / canvas.width, previewHeight / canvas.height, 1);
      const fitPercent = Math.max(1, Math.round(fitScale * 100));
      if (scalePercent > fitPercent) {
        setScalePercent(fitPercent);
      }
    }

    updateFitScale();
    window.addEventListener("resize", updateFitScale);
    return () => window.removeEventListener("resize", updateFitScale);
  }, [canvas.width, canvas.height, scalePercent]);

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
    const key = element.dataKey || element.dataSource || element.field || element.key || element.id;
    if (winner) {
      if (key === "winner.position" || String(key).toLowerCase().includes("position")) {
        return firstTextValue(winner.position, element.content, element.text, element.value, element.label);
      }
      if (key === "winner.name" || String(key).toLowerCase().includes("name")) {
        return firstTextValue(winner.name, element.content, element.text, element.value, element.label);
      }
      if (key === "winner.team" || String(key).toLowerCase().includes("team")) {
        return firstTextValue(winner.team, winner.teamName, element.content, element.text, element.value, element.label);
      }
    }
    if (element.custom || key === "manual" || element.dataSource === "manual") {
      return firstTextValue(
        previewData?.customFields?.[element.id],
        previewData?.[element.id],
        element.content,
        element.text,
        element.value,
        element.label
      );
    }
    if (element.id === "resultNumber" || key === "resultNumber") {
      return `${element.prefix || "Result #"}${firstTextValue(previewData.resultNumber, element.content, element.text, element.value)}`;
    }
    return firstTextValue(
      getObjectPathValue(previewData, key),
      previewData?.[key],
      element.content,
      element.text,
      element.value,
      element.label
    );
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
    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image is too large. Please compress the image below 1MB and upload again.");
      event.target.value = "";
      return;
    }
    let dataUrl = "";
    try {
      dataUrl = await dataUrlFromFile(file);
    } catch (error) {
      alert("Unable to load this image. Please try another file.");
      console.error("Failed to read background image:", error);
      event.target.value = "";
      return;
    }
    setCanvas((current) => ({ ...current, backgroundImage: dataUrl }));
    setBackgroundName(file.name);

    const image = new Image();
    image.onload = () => {
      setCanvas((current) => ({
        ...current,
        width: Number(image.naturalWidth) || 1,
        height: Number(image.naturalHeight) || 1,
        backgroundImage: dataUrl,
      }));

      const previewWidth = canvasScrollRef.current?.clientWidth || 900;
      const previewHeight = canvasScrollRef.current?.clientHeight || 520;
      const fitScale = Math.min(previewWidth / image.naturalWidth, previewHeight / image.naturalHeight, 1);
      setScalePercent(Math.max(1, Math.round(fitScale * 100)));
    };
    image.onerror = () => {
      setCanvas((current) => ({ ...current, backgroundImage: dataUrl }));
    };
    image.src = dataUrl;
  }

  async function handleImageUpload(event, elementId) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image is too large. Please compress the image below 1MB and upload again.");
      return;
    }
    try {
      const dataUrl = await dataUrlFromFile(file);
      updateElement(elementId, { imageData: dataUrl, src: dataUrl, imageName: file.name });
    } catch (error) {
      alert("Unable to load this image. Please try another file.");
      console.error("Failed to read element image:", error);
      event.target.value = "";
    }
  }

  async function saveTemplate() {
    const activeEventId = await getStoredActiveEventIdForCurrentUser();
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }
    if (isEditMode && templateEventId && String(templateEventId) !== String(activeEventId)) {
      alert("This template does not belong to the current active event.");
      return;
    }
    if (!templateName.trim()) {
      alert("Template name is required.");
      return;
    }

    const normalizedCanvas = {
      ...canvas,
      width: Number(canvas.width) || 1,
      height: Number(canvas.height) || 1,
      backgroundImage: getPreviewableImageUrl(canvas.backgroundImage),
    };

    const now = new Date().toISOString();
    const eventId = isEditMode ? templateEventId || activeEventId : activeEventId;
    const template = {
      ...(isEditMode ? { id: templateId } : {}),
      eventId,
      name: templateName.trim(),
      type: "program",
      canvas: normalizedCanvas,
      elements,
      previewData,
      previewImage: normalizedCanvas.backgroundImage || makePreviewImage(templateName.trim(), normalizedCanvas),
      createdAt: today(),
      updatedAt: now,
    };

    try {
      if (isEditMode) {
        await updateProgramTemplate(templateId, template);
      } else {
        await createProgramTemplate(eventId, template);
      }
      window.dispatchEvent(new Event("rankify-data-changed"));
      navigate("/dashboard/program-templates");
    } catch (error) {
      alert(error.message || "Unable to save template.");
    }
  }

  async function copyTemplateJson() {
    const normalizedCanvas = {
      ...canvas,
      width: Number(canvas.width) || 1,
      height: Number(canvas.height) || 1,
      backgroundImage: getPreviewableImageUrl(canvas.backgroundImage),
    };
    const exportTemplate = {
      id: templateId || "program_template_export",
      name: templateName.trim() || "Program Template",
      type: "program",
      canvas: normalizedCanvas,
      elements,
      previewData,
      previewImage: normalizedCanvas.backgroundImage || makePreviewImage(templateName.trim() || "Program Template", normalizedCanvas),
    };

    await navigator.clipboard.writeText(JSON.stringify(exportTemplate, null, 2));
    alert("Template JSON copied to clipboard.");
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
    const imageData = getPreviewableImageUrl(
      element.type === "winnerPhoto" ? winner?.image || winner?.imageUrl || winner?.photo : element.imageData || element.src || element.imageUrl
    );
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
  const backgroundImageUrl = getPreviewableImageUrl(canvas.backgroundImage);

  if (editorLoading) {
    return (
      <div className="template-editor-page app-page min-h-screen overflow-x-hidden pb-28">
        <style>{templateEditorThemeStyles}</style>
        <header className="app-header sticky top-0 z-30 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/program-templates")}
              className="rounded-md px-2 py-1 text-2xl text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)]"
            >
              <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="app-muted text-sm">Poster Templates</p>
              <h1 className="app-heading truncate text-2xl font-bold">Loading template...</h1>
            </div>
          </div>
        </header>
        <main className="p-4">
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading template...</p>
          </div>
        </main>
      </div>
    );
  }

  if (editorError) {
    return (
      <div className="template-editor-page app-page min-h-screen overflow-x-hidden pb-28">
        <style>{templateEditorThemeStyles}</style>
        <header className="app-header sticky top-0 z-30 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/program-templates")}
              className="rounded-md px-2 py-1 text-2xl text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)]"
            >
              <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="app-muted text-sm">Poster Templates</p>
              <h1 className="app-heading truncate text-2xl font-bold">Template not found</h1>
            </div>
          </div>
        </header>
        <main className="p-4">
          <div className="app-card rounded-xl border border-[var(--app-danger)] p-6 text-sm text-[var(--app-danger)]">
            {editorError}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="template-editor-page app-page min-h-screen overflow-x-hidden pb-28">
      <style>{templateEditorThemeStyles}</style>
      <header className="app-header sticky top-0 z-30 border-b px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/program-templates")}
              className="rounded-md px-2 py-1 text-2xl text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)]"
            >
              <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="app-muted text-sm">Poster Templates</p>
              <h1 className="app-heading truncate text-2xl font-bold">{isEditMode ? `Edit - ${templateName || "Untitled Template"}` : "Create poster template"}</h1>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={copyTemplateJson}
              className="app-card inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold shadow-sm hover:bg-[var(--app-surface-elevated)]"
            >
              <Copy size={16} strokeWidth={1.9} aria-hidden="true" />
              Copy Template JSON
            </button>
            <button
              type="button"
              onClick={saveTemplate}
              className="app-success-btn inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold shadow-sm hover:opacity-90"
            >
              <Save size={16} strokeWidth={1.9} aria-hidden="true" />
              {isEditMode ? "Save changes" : "Create template"}
            </button>
          </div>
        </div>
      </header>

      <main className="grid w-full max-w-full grid-cols-[260px_minmax(0,1fr)_360px] gap-4 overflow-x-hidden p-4 max-[1180px]:grid-cols-1">
        <aside className="app-card min-w-0 rounded-lg border p-4 shadow-sm">
          <h2 className="app-muted mb-4 text-xs font-bold uppercase tracking-wide">Layers</h2>
          <LayerButton element={elements.find((item) => item.id === "programName")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "category")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "resultNumber")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={winnerContainer} selected={selectedElementId} onSelect={setSelectedElementId} icon={<Trophy size={15} strokeWidth={1.9} aria-hidden="true" />} />

          <p className="app-muted mb-2 mt-5 text-xs font-bold uppercase tracking-wide">Winner Item (All)</p>
          <LayerButton element={elements.find((item) => item.id === "winnerPosition")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "winnerName")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "winnerTeam")} selected={selectedElementId} onSelect={setSelectedElementId} />
          <LayerButton element={elements.find((item) => item.id === "winnerPhoto")} selected={selectedElementId} onSelect={setSelectedElementId} icon={<Image size={15} strokeWidth={1.9} aria-hidden="true" />} />

          {elements.some((item) => item.custom) && <div className="my-4 border-t border-[var(--app-border)]" />}
          {elements
            .filter((item) => item.custom)
            .map((element) => (
              <div
                key={element.id}
                className={`mb-1 flex items-center gap-1 rounded-md px-2 py-2 text-sm ${
                  selectedElementId === element.id ? "bg-[var(--app-success)] text-[var(--app-success-text)]" : "app-text hover:bg-[var(--app-surface-elevated)]"
                }`}
              >
                <button type="button" onClick={() => setSelectedElementId(element.id)} className="min-w-0 flex-1 truncate text-left">
                  {element.type === "image" ? <Image size={15} strokeWidth={1.9} aria-hidden="true" /> : <Type size={15} strokeWidth={1.9} aria-hidden="true" />} {element.label}
                </button>
                <button type="button" title="Duplicate" onClick={() => duplicateElement(element)} className="rounded px-1 hover:bg-white/20">
                  <Copy size={15} strokeWidth={1.9} aria-hidden="true" />
                </button>
                <button type="button" title="Remove" onClick={() => setRemoveTarget(element)} className="rounded px-1 hover:bg-white/20">
                  <Trash2 size={15} strokeWidth={1.9} aria-hidden="true" />
                </button>
              </div>
            ))}

          <div className="mt-4 border-t border-[var(--app-border)] pt-4">
            <button type="button" onClick={addCustomTextField} className="app-text block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--app-surface-elevated)]">
              <PlusCircle className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
              Add custom text field
            </button>
            <button type="button" onClick={addImageElement} className="app-text block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--app-surface-elevated)]">
              <Image className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
              Add image element
            </button>
          </div>

          <p className="mt-40 text-xs text-gray-400">↑↓ Arrow keys nudge selected element<br />(Shift = 10 px)</p>
        </aside>

        <section className="app-card min-w-0 max-w-full overflow-hidden rounded-lg border p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="whitespace-nowrap text-2xl font-bold">Live Preview</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="app-muted">Canvas: {canvas.width}x{canvas.height}px</span>
              <select
                value={scalePercent}
                onChange={(event) => setScalePercent(Number(event.target.value))}
                className="app-select h-9 rounded-md border px-3"
              >
                {scaleSelectOptions.map((value) => (
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
            className="max-h-[520px] w-full max-w-full overflow-auto rounded-lg bg-[var(--app-surface)] p-4"
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
          >
            <div className="flex w-max min-w-full justify-center">
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
                  {backgroundImageUrl && (
                    <img
                      src={backgroundImageUrl}
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

          <section className="app-surface-elevated mt-6 rounded-lg p-4">
            <button
              type="button"
              onClick={() => setPreviewOpen((open) => !open)}
              className="flex w-full items-center justify-between text-left text-lg font-semibold"
            >
              Example Poster Data for Preview <span>{previewOpen ? <ChevronUp size={18} strokeWidth={1.9} aria-hidden="true" /> : <ChevronDown size={18} strokeWidth={1.9} aria-hidden="true" />}</span>
            </button>
            {previewOpen && (
              <PreviewDataPanel previewData={previewData} setPreviewData={setPreviewData} />
            )}
          </section>
        </section>

        <aside className="app-card min-w-0 overflow-x-hidden rounded-lg border p-6 shadow-sm">
          <h2 className="app-heading mb-8 text-2xl font-bold">Template Configuration</h2>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-semibold">Template Name</span>
            <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0 text-base")} />
          </label>
          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-semibold">Background Image</span>
            <input type="file" accept="image/*" onChange={handleBackgroundUpload} className={inputClass("box-border w-full max-w-full min-w-0 truncate")} />
          </label>
          {backgroundName && (
            <div className="app-muted mb-5 flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">Image loaded. Canvas dimensions set to image size. {backgroundName}</span>
              <button type="button" onClick={() => { setCanvas((current) => ({ ...current, backgroundImage: "" })); setBackgroundName(""); }} className="shrink-0 text-red-600">
                Clear Image
              </button>
            </div>
          )}
          <h3 className="mb-3 text-sm font-bold">Canvas Dimensions</h3>
          <div className="grid w-full grid-cols-1 gap-3 min-[1380px]:grid-cols-[repeat(2,minmax(0,1fr))]">
            <ToolbarField label="Width (px)">
              <input
                type="number"
                value={canvas.width}
                onChange={(event) => setCanvas((current) => ({ ...current, width: Number(event.target.value) || 1 }))}
                className={inputClass("box-border w-full max-w-full min-w-0")}
              />
            </ToolbarField>
            <ToolbarField label="Height (px)">
              <input
                type="number"
                value={canvas.height}
                onChange={(event) => setCanvas((current) => ({ ...current, height: Number(event.target.value) || 1 }))}
                className={inputClass("box-border w-full max-w-full min-w-0")}
              />
            </ToolbarField>
          </div>
          <div className="mt-48 border-t border-[var(--app-border)] pt-6">
            <button type="button" onClick={saveTemplate} className="app-success-btn h-14 w-full rounded-md text-lg font-bold hover:opacity-90">
              {isEditMode ? "Save Template Changes" : "Create New Template"}
            </button>
            <p className="app-muted mt-3 text-center text-xs">Tip: you can also save from the sticky bar at the top.</p>
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
          <div className="app-modal w-full max-w-[560px] rounded-lg p-6 shadow-2xl">
            <h2 className="app-heading text-xl font-bold">Remove "{removeTarget.label}"?</h2>
            <p className="app-muted mt-3">This element will be permanently removed from the template.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setRemoveTarget(null)} className="app-card h-10 rounded-md border px-4 hover:bg-[var(--app-surface-elevated)]">
                Cancel
              </button>
              <button type="button" onClick={() => removeElement(removeTarget)} className="app-danger-btn h-10 rounded-md px-5 font-semibold hover:opacity-90">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LayerButton({ element, selected, onSelect, icon = <Type size={15} strokeWidth={1.9} aria-hidden="true" /> }) {
  if (!element) return null;
  return (
    <button
      type="button"
      onClick={() => onSelect(element.id)}
      className={`mb-1 block w-full rounded-md px-3 py-2 text-left text-sm ${
        selected === element.id ? "bg-[var(--app-success)] text-[var(--app-success-text)]" : "app-text hover:bg-[var(--app-surface-elevated)]"
      }`}
    >
      <span className="mr-2 inline-flex align-[-2px]">{icon}</span>{element.label}
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
    <div className="flex h-10 overflow-hidden rounded-md border border-[var(--app-border)]">
      {["left", "center", "right"].map((align) => (
        <button
          type="button"
          key={align}
          onClick={() => onChange(align)}
          className={`w-10 ${value === align ? "bg-[var(--app-sidebar-active-bg)] text-[var(--app-sidebar-active-text)]" : "bg-[var(--app-surface)]"}`}
        >
          {align === "left" ? (
            <AlignLeft className="mx-auto" size={16} strokeWidth={1.9} aria-hidden="true" />
          ) : align === "center" ? (
            <AlignCenter className="mx-auto" size={16} strokeWidth={1.9} aria-hidden="true" />
          ) : (
            <AlignRight className="mx-auto" size={16} strokeWidth={1.9} aria-hidden="true" />
          )}
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
    <button key={id} type="button" onClick={() => setSelectedElementId(id)} className="rounded-md bg-[var(--app-sidebar-active-bg)] px-4 py-2 text-[var(--app-sidebar-active-text)]">
      {label}
    </button>
  );

  if (!selectedElement) {
    return (
      <div className="fixed bottom-0 left-[260px] right-0 z-40 border-t border-[var(--app-border)] bg-[var(--app-bg)]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur max-[900px]:left-0">
        <div className="flex min-w-max items-center gap-8 overflow-x-auto">
          <div>
            <p className="app-muted text-xs font-bold uppercase">Tools</p>
            <p className="app-muted text-sm">Click the canvas, or pick an element below.</p>
          </div>
          <div>
            <p className="app-muted text-xs font-bold uppercase">Add New</p>
            <div className="flex gap-2">
              <button type="button" onClick={addCustomTextField} className="app-card h-10 rounded-md border px-4 hover:bg-[var(--app-surface-elevated)]">
                <PlusCircle className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                Custom Field
              </button>
              <button type="button" onClick={addImageElement} className="app-card h-10 rounded-md border px-4 hover:bg-[var(--app-surface-elevated)]">
                <Image className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                Image Element
              </button>
            </div>
          </div>
          <div>
            <p className="app-muted text-xs font-bold uppercase">Existing Elements</p>
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
    <div className="fixed bottom-0 left-[260px] right-0 z-40 overflow-x-auto border-t border-[var(--app-border)] bg-[var(--app-bg)]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur max-[900px]:left-0">
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
            <label className="app-text flex flex-col gap-2 text-sm font-medium">Show<input type="checkbox" checked={selectedElement.visible !== false} onChange={(event) => updateSelected({ visible: event.target.checked })} /></label>
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
                <button type="button" onClick={() => setRemoveTarget(selectedElement)} className="app-danger-btn h-10 rounded-md px-4 font-semibold hover:opacity-90">
                  <Trash2 className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                  Remove Element
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
                <label className="app-text flex flex-col gap-2 text-sm font-medium">Ordinal Suffix<input type="checkbox" checked={Boolean(selectedElement.ordinalSuffix)} onChange={(event) => updateSelected({ ordinalSuffix: event.target.checked })} /></label>
                <ToolbarField label="Indicator Type">
                  <select value={selectedElement.indicatorType || "Number"} onChange={(event) => updateSelected({ indicatorType: event.target.value })} className={inputClass("w-32")}>
                    <option>None</option>
                    <option>Number</option>
                    <option>Dots</option>
                    <option>Medal</option>
                  </select>
                </ToolbarField>
                <label className="app-text flex flex-col gap-2 text-sm font-medium">Background<input type="checkbox" checked={Boolean(selectedElement.showBackground)} onChange={(event) => updateSelected({ showBackground: event.target.checked })} /></label>
                <label className="app-text flex flex-col gap-2 text-sm font-medium">Stroke<input type="checkbox" checked={Boolean(selectedElement.showStroke)} onChange={(event) => updateSelected({ showStroke: event.target.checked })} /></label>
              </>
            )}
            {selectedElement.custom && (
              <>
                <ToolbarField label="Label"><input value={selectedElement.label} onChange={(event) => updateSelected({ label: event.target.value })} className={inputClass("w-64")} /></ToolbarField>
                <ToolbarField label="Data Source"><select className={inputClass("w-40")}><option>Manual Input</option></select></ToolbarField>
                <ToolbarField label="Content"><input value={selectedElement.content || ""} onChange={(event) => updateSelected({ content: event.target.value })} className={inputClass("w-64")} /></ToolbarField>
                <button type="button" onClick={() => setRemoveTarget(selectedElement)} className="app-danger-btn h-10 rounded-md px-4 font-semibold hover:opacity-90">
                  <Trash2 className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                  Remove Element
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
    if (file.size > MAX_IMAGE_SIZE) {
      alert("Image is too large. Please compress the image below 1MB and upload again.");
      return;
    }
    const image = await dataUrlFromFile(file);
    updateWinner(index, "image", image);
  }

  return (
    <div className="mt-5">
      <p className="app-muted mb-4 text-sm">
        Adjust these values to see how your template elements will look with real data. These values are NOT saved with the template.
      </p>
      <div className="grid w-full max-w-full grid-cols-1 gap-4 overflow-x-hidden min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
        <ToolbarField label="Program Name"><input value={previewData.programName} onChange={(event) => updateField("programName", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
        <ToolbarField label="Program Category"><input value={previewData.category} onChange={(event) => updateField("category", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
        <ToolbarField label="Result Number"><input value={previewData.resultNumber} onChange={(event) => updateField("resultNumber", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
        <ToolbarField label="Event Name"><input value={previewData.eventName} onChange={(event) => updateField("eventName", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
        <ToolbarField label="Organizer Name"><input value={previewData.organizerName} onChange={(event) => updateField("organizerName", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
        <ToolbarField label="Event Date (string)"><input value={previewData.eventDate} onChange={(event) => updateField("eventDate", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
        <ToolbarField label="Event Location"><input value={previewData.eventLocation} onChange={(event) => updateField("eventLocation", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
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
                <X size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 min-[900px]:grid-cols-[120px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <ToolbarField label="Position"><input value={winner.position} onChange={(event) => updateWinner(index, "position", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
              <ToolbarField label="Name"><input value={winner.name} onChange={(event) => updateWinner(index, "name", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
              <ToolbarField label="Team"><input value={winner.team} onChange={(event) => updateWinner(index, "team", event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} /></ToolbarField>
              <ToolbarField label="Image File"><input type="file" accept="image/*" onChange={(event) => updateWinnerImage(index, event.target.files?.[0])} className={inputClass("box-border w-full max-w-full min-w-0 truncate")} /></ToolbarField>
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
        <PlusCircle className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
        Add Example Winner
      </button>
    </div>
  );
}

const templateEditorThemeStyles = `
.template-editor-page h2,
.template-editor-page h3{color:var(--app-heading)}
.template-editor-page input,
.template-editor-page select{background:var(--app-input-bg);color:var(--app-text);border-color:var(--app-border)}
.template-editor-page input:focus,
.template-editor-page select:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-focus-ring)}
.template-editor-page .app-card{background:var(--app-surface);border-color:var(--app-border);color:var(--app-text)}
.template-editor-page .app-surface-elevated{background:var(--app-surface-elevated);color:var(--app-text)}
.template-editor-page button:not(.app-success-btn):not(.app-danger-btn){color:inherit}
`;
