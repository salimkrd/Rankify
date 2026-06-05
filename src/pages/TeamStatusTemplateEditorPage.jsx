import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  ListOrdered,
  PlusCircle,
  Save,
  Trash2,
  Type,
} from "lucide-react";
import FontFamilySelect from "../components/FontFamilySelect";
import TeamStatusTemplatePreview from "../components/TeamStatusTemplatePreview";
import { getStoredActiveEventId } from "../services/activeEventService.js";
import {
  createTeamStatusTemplate,
  getTeamStatusTemplateById,
  updateTeamStatusTemplate,
} from "../services/teamStatusTemplatesService.js";

const MAX_IMAGE_SIZE = 1024 * 1024;

const defaultTeams = [
  { name: "Team A", score: "120" },
  { name: "Team B", score: "95" },
  { name: "Team C", score: "80" },
];

function makeId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

function getActiveEvent() {
  const activeEventId = getStoredActiveEventId();
  return {
    id: activeEventId,
    name: "Active Event",
    organizer: "",
    date: "",
    location: "",
  };
}

function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateImageFile(file) {
  if (!file) return true;
  if (file.size > MAX_IMAGE_SIZE) {
    alert("Image is too large. Please compress the image below 1MB and upload again.");
    return false;
  }
  return true;
}

function defaultTitle(id, text, x, y) {
  return {
    id,
    kind: "title",
    label: text,
    dataSource: "manual",
    text,
    x,
    y,
    width: 360,
    fontFamily: "Inter",
    fontSize: 52,
    fontWeight: "700",
    align: "left",
    color: "#111827",
    lineHeight: 1.2,
    showBg: false,
  };
}

function defaultSlot(index) {
  return {
    id: makeId("slot"),
    kind: "teamSlot",
    label: `Slot ${index}`,
    teamIndex: index - 1,
    x: 100,
    y: 330 + (index - 1) * 72,
    width: 560,
    spacing: 12,
    horizontalAlign: "left",
    verticalAlign: "top",
    name: {
      x: 0,
      y: 0,
      width: 330,
      fontFamily: "Inter",
      fontSize: 34,
      fontWeight: "700",
      align: "left",
      color: "#111827",
      lineHeight: 1.15,
      showBg: false,
    },
    score: {
      x: 380,
      y: 0,
      width: 120,
      fontFamily: "Inter",
      fontSize: 34,
      fontWeight: "800",
      align: "left",
      color: "#26752C",
      lineHeight: 1.15,
      showBg: false,
    },
  };
}

function defaultPreviewData(template = {}, activeEvent = {}) {
  const existing = template.previewData || {};
  const titles = Array.isArray(template.elements)
    ? template.elements.filter((element) => element.kind === "title")
    : [];
  const slots = Array.isArray(template.elements)
    ? template.elements.filter((element) => element.kind === "teamSlot")
    : [];
  const titleValues = { ...(existing.titleValues || {}) };

  titles.forEach((title, index) => {
    if (titleValues[title.id] == null) {
      titleValues[title.id] = existing.titleParts?.[index] || title.text || title.label || "";
    }
  });

  const teams = Array.isArray(existing.teams) ? [...existing.teams] : [];
  slots.forEach((slot, index) => {
    const teamIndex = Number(slot.teamIndex ?? index);
    if (!teams[teamIndex]) teams[teamIndex] = defaultTeams[teamIndex] || { name: `Team ${teamIndex + 1}`, score: "0" };
  });

  return {
    eventName: existing.eventName ?? activeEvent.name ?? "",
    organizerName: existing.organizerName ?? activeEvent.organizer ?? "",
    eventDate: existing.eventDate ?? activeEvent.date ?? "",
    eventLocation: existing.eventLocation ?? activeEvent.location ?? "",
    titleValues,
    teams,
  };
}

function normalizeTemplate(template, activeEvent) {
  const fallbackElements = [
    defaultTitle("title_final", "Final", 80, 90),
    defaultTitle("title_point", "Point", 80, 155),
    defaultTitle("title_status", "Status", 80, 220),
    defaultSlot(1),
    defaultSlot(2),
    defaultSlot(3),
  ];
  const elements = Array.isArray(template?.elements) && template.elements.length ? template.elements : fallbackElements;
  const canvas = template?.canvas || {};

  return {
    id: template?.id || makeId("team_status_template"),
    eventId: template?.eventId || activeEvent.id,
    type: "team-status",
    name: template?.name || "New Team Status Template",
    canvas: {
      width: Number(canvas.width) || 1080,
      height: Number(canvas.height) || 1080,
      backgroundImage: canvas.backgroundImage || template?.previewImage || "",
      backgroundColor: canvas.backgroundColor || "#eeeeee",
    },
    elements,
    previewData: defaultPreviewData({ ...template, elements }, activeEvent),
    previewImage: template?.previewImage || "",
    createdAt: template?.createdAt || today(),
    updatedAt: template?.updatedAt || today(),
    source: template?.source || "custom",
  };
}

function escapeSvg(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgTextAnchor(align) {
  if (align === "center") return "middle";
  if (align === "right") return "end";
  return "start";
}

function svgAlignedX(x, width, align) {
  if (align === "center") return Number(x || 0) + Number(width || 0) / 2;
  if (align === "right") return Number(x || 0) + Number(width || 0);
  return Number(x || 0);
}

function titleValue(element, previewData) {
  const firstTextValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value) !== "") return String(value);
    }
    return "";
  };
  const key = element.dataSource || element.dataKey || element.field || element.key;
  if (key === "eventName") return firstTextValue(previewData.eventName, element.value, element.text, element.content, element.label);
  if (key === "organizerName") return firstTextValue(previewData.organizerName, element.value, element.text, element.content, element.label);
  if (key === "eventDate") return firstTextValue(previewData.eventDate, element.value, element.text, element.content, element.label);
  if (key === "eventLocation") return firstTextValue(previewData.eventLocation, element.value, element.text, element.content, element.label);
  if (key && previewData?.[key] !== undefined) return firstTextValue(previewData[key], element.value, element.text, element.content, element.label);
  return firstTextValue(previewData.titleValues?.[element.id], element.value, element.text, element.content, element.label);
}

function teamFieldValue(team, childKey, child = {}) {
  const values =
    childKey === "name"
      ? [team?.name, team?.teamName, team?.title, child.value, child.text, child.content, child.label]
      : [team?.score, team?.points, team?.point, child.value, child.text, child.content, child.label];
  for (const value of values) {
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  }
  return "";
}

function makePreviewImage(template) {
  const width = Number(template.canvas.width) || 1080;
  const height = Number(template.canvas.height) || 1080;
  const background = template.canvas.backgroundImage
    ? `<image href="${escapeSvg(template.canvas.backgroundImage)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`
    : "";
  const elements = (template.elements || [])
    .map((element) => {
      if (element.kind === "title") {
        const x = svgAlignedX(element.x, element.width, element.align);
        const y = Number(element.y || 0) + Number(element.fontSize || 16);
        const bg = element.showBg
          ? `<rect x="${Number(element.x || 0)}" y="${Number(element.y || 0)}" width="${Number(element.width || 0)}" height="${Number(element.fontSize || 16) * Number(element.lineHeight || 1.2)}" fill="rgba(255,255,255,.55)"/>`
          : "";
        return `${bg}<text x="${x}" y="${y}" font-family="${escapeSvg(element.fontFamily || "Inter")}" font-size="${Number(element.fontSize || 16)}" font-weight="${escapeSvg(element.fontWeight || "400")}" text-anchor="${svgTextAnchor(element.align)}" fill="${escapeSvg(element.color || "#111111")}">${escapeSvg(titleValue(element, template.previewData || {}))}</text>`;
      }

      if (element.kind === "teamSlot") {
        const team = template.previewData?.teams?.[element.teamIndex] || { name: "Team Name", score: "0" };
        return ["name", "score"]
          .map((childKey) => {
            const child = element[childKey] || {};
            const x = Number(element.x || 0) + svgAlignedX(child.x, child.width, child.align);
            const y = Number(element.y || 0) + Number(child.y || 0) + Number(child.fontSize || 16);
            const bg = child.showBg
              ? `<rect x="${Number(element.x || 0) + Number(child.x || 0)}" y="${Number(element.y || 0) + Number(child.y || 0)}" width="${Number(child.width || 0)}" height="${Number(child.fontSize || 16) * Number(child.lineHeight || 1.2)}" fill="rgba(255,255,255,.65)"/>`
              : "";
            return `${bg}<text x="${x}" y="${y}" font-family="${escapeSvg(child.fontFamily || "Inter")}" font-size="${Number(child.fontSize || 16)}" font-weight="${escapeSvg(child.fontWeight || "400")}" text-anchor="${svgTextAnchor(child.align)}" fill="${escapeSvg(child.color || "#111111")}">${escapeSvg(teamFieldValue(team, childKey, child))}</text>`;
          })
          .join("");
      }

      return "";
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${escapeSvg(template.canvas.backgroundColor || "#eeeeee")}"/>${background}${elements}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function selectedParts(selectedId) {
  if (!selectedId) return {};
  const [elementId, child] = selectedId.split(":");
  return { elementId, child };
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

function NumberInput({ value, onChange, className = "w-24" }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(event) => onChange(Number(event.target.value))}
      className={inputClass(className)}
    />
  );
}

function TextInput({ label, value, onChange }) {
  return (
    <ToolbarField label={label}>
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} className={inputClass("box-border w-full max-w-full min-w-0")} />
    </ToolbarField>
  );
}

function LayerButton({ active, label, icon, onSelect, onDuplicate, onDelete }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`layer-row mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${
        active ? "layer-row-active" : "app-text hover:bg-[var(--app-surface-elevated)]"
      }`}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2">
        <Copy
          size={14}
          strokeWidth={1.9}
          aria-hidden="true"
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate?.();
          }}
        />
        <Trash2
          size={14}
          strokeWidth={1.9}
          aria-hidden="true"
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.();
          }}
        />
      </span>
    </button>
  );
}

export default function TeamStatusTemplateEditorPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const canvasScrollRef = useRef(null);
  const dragRef = useRef(null);
  const [activeEvent, setActiveEvent] = useState(() => getActiveEvent());
  const [template, setTemplate] = useState(() => normalizeTemplate(null, getActiveEvent()));
  const [selectedId, setSelectedId] = useState("title_final");
  const [exampleOpen, setExampleOpen] = useState(true);
  const [scalePercent, setScalePercent] = useState(60);

  const isEdit = Boolean(templateId);
  const titles = template.elements.filter((element) => element.kind === "title");
  const slots = template.elements.filter((element) => element.kind === "teamSlot");
  const selected = useMemo(() => {
    const { elementId, child } = selectedParts(selectedId);
    const element = template.elements.find((item) => item.id === elementId);
    return { element, child };
  }, [selectedId, template.elements]);

  const scaleOptions = [40, 60, 75, 100];
  const scaleSelectOptions = scaleOptions.includes(scalePercent)
    ? scaleOptions
    : [scalePercent, ...scaleOptions].sort((a, b) => a - b);
  const scale = scalePercent / 100;

  useEffect(() => {
    const event = getActiveEvent();
    setActiveEvent(event);

    if (!templateId) {
      setTemplate(normalizeTemplate(null, event));
      return;
    }

    let mounted = true;
    async function loadTemplate() {
      try {
        const found = await getTeamStatusTemplateById(templateId);
        if (!mounted) return;
        setTemplate(normalizeTemplate(found, event));
      } catch (error) {
        alert(error.message || "Unable to load template.");
        navigate("/dashboard/team-status-templates");
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
      const fitScale = Math.min(previewWidth / template.canvas.width, previewHeight / template.canvas.height, 1);
      const fitPercent = Math.max(1, Math.round(fitScale * 100));
      if (scalePercent > fitPercent) setScalePercent(fitPercent);
    }

    updateFitScale();
    window.addEventListener("resize", updateFitScale);
    return () => window.removeEventListener("resize", updateFitScale);
  }, [template.canvas.width, template.canvas.height, scalePercent]);

  useEffect(() => {
    function onKeyDown(event) {
      if (!selectedId) return;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (["input", "select", "textarea"].includes(activeTag)) return;

      const { element, child } = selected;
      if (!element) return;
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx = event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0;
      const dy = event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      const target = child ? element[child] : element;
      const patch = {
        x: Math.max(0, Number(target?.x || 0) + dx),
        y: Math.max(0, Number(target?.y || 0) + dy),
      };
      if (child) updateSlotChild(element.id, child, patch);
      else updateElement(element.id, patch);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, selectedId]);

  function updateTemplate(patch) {
    setTemplate((current) => ({ ...current, ...patch }));
  }

  function updateCanvas(patch) {
    setTemplate((current) => ({ ...current, canvas: { ...current.canvas, ...patch } }));
  }

  function updateElement(elementId, patch) {
    setTemplate((current) => {
      const target = current.elements.find((element) => element.id === elementId);
      const elements = current.elements.map((element) => (element.id === elementId ? { ...element, ...patch } : element));
      let previewData = current.previewData;
      if (target?.kind === "title" && patch.text != null) {
        previewData = {
          ...current.previewData,
          titleValues: {
            ...(current.previewData.titleValues || {}),
            [elementId]: patch.text,
          },
        };
      }
      return { ...current, elements, previewData };
    });
  }

  function updateSlotChild(elementId, child, patch) {
    setTemplate((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === elementId ? { ...element, [child]: { ...element[child], ...patch } } : element
      ),
    }));
  }

  function updatePreviewData(patch) {
    setTemplate((current) => ({ ...current, previewData: { ...current.previewData, ...patch } }));
  }

  function updateTeam(teamIndex, patch) {
    setTemplate((current) => {
      const teams = Array.isArray(current.previewData.teams) ? [...current.previewData.teams] : [];
      teams[teamIndex] = { ...(teams[teamIndex] || { name: `Team ${teamIndex + 1}`, score: "0" }), ...patch };
      return { ...current, previewData: { ...current.previewData, teams } };
    });
  }

  function nextTeamIndex(elements = template.elements) {
    const indices = elements
      .filter((element) => element.kind === "teamSlot")
      .map((slot) => Number(slot.teamIndex ?? 0));
    return indices.length ? Math.max(...indices) + 1 : 0;
  }

  function addTitle() {
    const count = titles.length + 1;
    const title = defaultTitle(makeId("title"), `Title ${count}`, 120, 120);
    setTemplate((current) => ({
      ...current,
      elements: [...current.elements, title],
      previewData: {
        ...current.previewData,
        titleValues: { ...(current.previewData.titleValues || {}), [title.id]: title.text },
      },
    }));
    setSelectedId(title.id);
  }

  function duplicateTitle(title) {
    const copy = {
      ...title,
      id: makeId("title"),
      label: `${title.label || title.text || "Title"} Copy`,
      text: `${title.text || title.label || "Title"} Copy`,
      x: Number(title.x || 0) + 20,
      y: Number(title.y || 0) + 20,
    };
    setTemplate((current) => ({
      ...current,
      elements: [...current.elements, copy],
      previewData: {
        ...current.previewData,
        titleValues: { ...(current.previewData.titleValues || {}), [copy.id]: copy.text },
      },
    }));
    setSelectedId(copy.id);
  }

  function deleteTitle(titleId) {
    if (!window.confirm("Delete this title layer?")) return;
    setTemplate((current) => {
      const elements = current.elements.filter((element) => element.id !== titleId);
      const titleValues = { ...(current.previewData.titleValues || {}) };
      delete titleValues[titleId];
      setSelectedId(elements[0]?.id || "");
      return { ...current, elements, previewData: { ...current.previewData, titleValues } };
    });
  }

  function addSlot() {
    const index = nextTeamIndex();
    const slot = defaultSlot(index + 1);
    slot.teamIndex = index;
    setTemplate((current) => {
      const teams = Array.isArray(current.previewData.teams) ? [...current.previewData.teams] : [];
      if (!teams[index]) teams[index] = defaultTeams[index] || { name: `Team ${index + 1}`, score: "0" };
      return { ...current, elements: [...current.elements, slot], previewData: { ...current.previewData, teams } };
    });
    setSelectedId(slot.id);
  }

  function duplicateSlot(slot) {
    const index = nextTeamIndex();
    const copy = {
      ...slot,
      id: makeId("slot"),
      label: `Slot ${index + 1}`,
      teamIndex: index,
      y: Number(slot.y || 0) + 72,
    };
    setTemplate((current) => {
      const teams = Array.isArray(current.previewData.teams) ? [...current.previewData.teams] : [];
      if (!teams[index]) teams[index] = defaultTeams[index] || { name: `Team ${index + 1}`, score: "0" };
      return { ...current, elements: [...current.elements, copy], previewData: { ...current.previewData, teams } };
    });
    setSelectedId(copy.id);
  }

  function deleteSlot(slotId) {
    if (!window.confirm("Delete this team score slot?")) return;
    setTemplate((current) => ({ ...current, elements: current.elements.filter((element) => element.id !== slotId) }));
    setSelectedId("");
  }

  async function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file)) {
      event.target.value = "";
      return;
    }
    const dataUrl = await dataUrlFromFile(file);
    const image = new Image();
    image.onload = () => {
      updateCanvas({
        backgroundImage: dataUrl,
        width: Number(image.naturalWidth) || template.canvas.width,
        height: Number(image.naturalHeight) || template.canvas.height,
      });
      const node = canvasScrollRef.current;
      if (node) {
        const fitScale = Math.min(node.clientWidth / image.naturalWidth, node.clientHeight / image.naturalHeight, 1);
        setScalePercent(Math.max(1, Math.round(fitScale * 100)));
      }
    };
    image.src = dataUrl;
  }

  function beginDrag(event, elementId, child = "") {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(child ? `${elementId}:${child}` : elementId);
    const element = template.elements.find((item) => item.id === elementId);
    if (!element) return;
    const childStyle = child ? element[child] : null;
    dragRef.current = {
      elementId,
      child,
      startX: event.clientX,
      startY: event.clientY,
      originalX: Number(childStyle?.x ?? element.x ?? 0),
      originalY: Number(childStyle?.y ?? element.y ?? 0),
    };
    window.addEventListener("pointermove", handleDrag);
    window.addEventListener("pointerup", endDrag);
  }

  function handleDrag(event) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (event.clientX - drag.startX) / scale;
    const dy = (event.clientY - drag.startY) / scale;
    const patch = {
      x: Math.max(0, Math.round((drag.originalX + dx) * 10) / 10),
      y: Math.max(0, Math.round((drag.originalY + dy) * 10) / 10),
    };
    if (drag.child) updateSlotChild(drag.elementId, drag.child, patch);
    else updateElement(drag.elementId, patch);
  }

  function endDrag() {
    dragRef.current = null;
    window.removeEventListener("pointermove", handleDrag);
    window.removeEventListener("pointerup", endDrag);
  }

  async function saveTemplate() {
    try {
      const activeEventId = getStoredActiveEventId();
      if (!activeEventId) {
        alert("Please create or select an event first before creating a template.");
        return;
      }
      if (!template.name.trim()) {
        alert("Template name is required.");
        return;
      }

      const nextTemplate = {
        ...template,
        ...(isEdit ? { id: template.id } : {}),
        eventId: activeEventId,
        type: "team-status",
        canvas: {
          ...template.canvas,
          width: Number(template.canvas.width) || 1,
          height: Number(template.canvas.height) || 1,
        },
        previewImage: makePreviewImage(template),
        createdAt: template.createdAt || today(),
        updatedAt: today(),
      };
      if (isEdit) {
        await updateTeamStatusTemplate(templateId, nextTemplate);
      } else {
        await createTeamStatusTemplate(activeEventId, nextTemplate);
      }
      window.dispatchEvent(new Event("rankify-data-changed"));
      window.dispatchEvent(new Event("rankify-team-status-templates-changed"));
      navigate("/dashboard/team-status-templates");
    } catch (error) {
      if (error?.name === "QuotaExceededError") {
        alert("Storage limit exceeded. Please use a smaller/compressed image.");
      } else {
        alert("Failed to save template. Please try again.");
      }
      console.error("Error saving team status template:", error);
    }
  }

  async function copyTemplateJson() {
    const exportTemplate = {
      ...template,
      id: template.id || "team_status_template_export",
      type: "team-status",
      canvas: {
        ...template.canvas,
        width: Number(template.canvas.width) || 1,
        height: Number(template.canvas.height) || 1,
      },
      previewImage: makePreviewImage(template),
    };

    await navigator.clipboard.writeText(JSON.stringify(exportTemplate, null, 2));
    alert("Template JSON copied to clipboard.");
  }

  function renderToolbar() {
    if (!selected.element) {
      return (
        <div className="fixed bottom-0 left-[260px] right-0 z-40 overflow-x-auto border-t border-[var(--app-border)] bg-[var(--app-bg)]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur max-[900px]:left-0">
          <div className="flex min-w-max items-center gap-8">
            <div>
              <p className="app-muted text-xs font-bold uppercase">Tools</p>
              <p className="app-muted text-sm">Select a title part or team score layer to edit it.</p>
            </div>
            <div>
              <p className="app-muted text-xs font-bold uppercase">Add New</p>
              <div className="flex gap-2">
                <button type="button" onClick={addTitle} className="app-card h-10 rounded-md border px-4 hover:bg-[var(--app-surface-elevated)]">
                  <PlusCircle className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                  Title Part
                </button>
                <button type="button" onClick={addSlot} className="app-card h-10 rounded-md border px-4 hover:bg-[var(--app-surface-elevated)]">
                  <ListOrdered className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                  Team Score Slot
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (selected.element.kind === "teamSlot" && !selected.child) {
      return (
        <div className="fixed bottom-0 left-[260px] right-0 z-40 overflow-x-auto border-t border-[var(--app-border)] bg-[var(--app-bg)]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur max-[900px]:left-0">
          <div className="flex min-w-max items-end gap-3">
            <ToolbarField label="X Position"><NumberInput value={selected.element.x} onChange={(x) => updateElement(selected.element.id, { x })} /></ToolbarField>
            <ToolbarField label="Y Position"><NumberInput value={selected.element.y} onChange={(y) => updateElement(selected.element.id, { y })} /></ToolbarField>
            <ToolbarField label="Width"><NumberInput value={selected.element.width} onChange={(width) => updateElement(selected.element.id, { width })} /></ToolbarField>
            <ToolbarField label="Spacing"><NumberInput value={selected.element.spacing} onChange={(spacing) => updateElement(selected.element.id, { spacing })} /></ToolbarField>
            <ToolbarField label="Horizontal Align">
              <select value={selected.element.horizontalAlign || "left"} onChange={(event) => updateElement(selected.element.id, { horizontalAlign: event.target.value })} className={inputClass("w-36")}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </ToolbarField>
            <ToolbarField label="Vertical Align">
              <select value={selected.element.verticalAlign || "top"} onChange={(event) => updateElement(selected.element.id, { verticalAlign: event.target.value })} className={inputClass("w-36")}>
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </ToolbarField>
          </div>
        </div>
      );
    }

    const target = selected.child ? selected.element[selected.child] : selected.element;
    const update = selected.child
      ? (patch) => updateSlotChild(selected.element.id, selected.child, patch)
      : (patch) => updateElement(selected.element.id, patch);

    return (
      <div className="fixed bottom-0 left-[260px] right-0 z-40 overflow-x-auto border-t border-[var(--app-border)] bg-[var(--app-bg)]/95 px-4 py-3 shadow-[0_-8px_20px_rgba(15,23,42,0.08)] backdrop-blur max-[900px]:left-0">
        <div className="flex min-w-max items-end gap-3">
          {!selected.child && (
            <ToolbarField label="Data Source">
              <select value={target.dataSource || "manual"} onChange={(event) => update({ dataSource: event.target.value })} className={inputClass("w-40")}>
                <option value="manual">Manual</option>
                <option value="eventName">Event Name</option>
                <option value="organizerName">Organizer Name</option>
                <option value="eventDate">Event Date</option>
                <option value="eventLocation">Event Location</option>
              </select>
            </ToolbarField>
          )}
          {!selected.child && (
            <ToolbarField label="Text">
              <input value={target.text || ""} onChange={(event) => update({ text: event.target.value, label: event.target.value })} className={inputClass("w-48")} />
            </ToolbarField>
          )}
          <ToolbarField label="Font Family">
            <FontFamilySelect value={target.fontFamily || "Inter"} onChange={(fontFamily) => update({ fontFamily })} className={inputClass("w-48")} />
          </ToolbarField>
          <ToolbarField label="Font Size"><NumberInput value={target.fontSize} onChange={(fontSize) => update({ fontSize })} /></ToolbarField>
          <ToolbarField label="Font Weight">
            <select value={target.fontWeight || "700"} onChange={(event) => update({ fontWeight: event.target.value })} className={inputClass("w-36")}>
              <option value="400">400</option>
              <option value="500">500</option>
              <option value="600">600</option>
              <option value="700">700</option>
              <option value="800">800</option>
            </select>
          </ToolbarField>
          <ToolbarField label="Align">
            <select value={target.align || "left"} onChange={(event) => update({ align: event.target.value })} className={inputClass("w-32")}>
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </ToolbarField>
          <ToolbarField label="Color"><input type="color" value={target.color || "#000000"} onChange={(event) => update({ color: event.target.value })} className={inputClass("w-20 p-1")} /></ToolbarField>
          <ToolbarField label="Line Height"><NumberInput value={target.lineHeight} onChange={(lineHeight) => update({ lineHeight })} /></ToolbarField>
          <ToolbarField label="Width"><NumberInput value={target.width} onChange={(width) => update({ width })} /></ToolbarField>
          <ToolbarField label="X Position"><NumberInput value={target.x} onChange={(x) => update({ x })} /></ToolbarField>
          <ToolbarField label="Y Position"><NumberInput value={target.y} onChange={(y) => update({ y })} /></ToolbarField>
          <label className="app-text flex min-w-[84px] items-center gap-2 text-sm font-medium">
            <span>Show BG</span>
            <input type="checkbox" checked={Boolean(target.showBg)} onChange={(event) => update({ showBg: event.target.checked })} className="h-4 w-4" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="template-editor-page app-page min-h-screen overflow-x-hidden pb-28">
      <style>{teamStatusEditorThemeStyles}</style>
      <header className="app-header sticky top-0 z-30 border-b px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/team-status-templates")}
              className="rounded-md px-2 py-1 text-2xl text-[var(--app-muted)] hover:bg-[var(--app-surface-elevated)]"
            >
              <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="app-muted text-sm">Team Status Templates</p>
              <h1 className="app-heading truncate text-2xl font-bold">{isEdit ? "Edit Team Status Template" : "Create Team Status Template"}</h1>
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
              {isEdit ? "Save changes" : "Create template"}
            </button>
          </div>
        </div>
      </header>

      <main className="grid w-full max-w-full grid-cols-[260px_minmax(0,1fr)_360px] gap-4 overflow-x-hidden p-4 max-[1180px]:grid-cols-1">
        <aside className="app-card min-w-0 rounded-lg border p-4 shadow-sm">
          <h2 className="app-muted mb-3 text-xs font-bold uppercase tracking-wide">Layers</h2>
          {titles.map((title) => (
            <LayerButton
              key={title.id}
              active={selectedId === title.id}
              label={title.label || title.text || "Title"}
              icon={<Type size={15} strokeWidth={1.9} aria-hidden="true" />}
              onSelect={() => setSelectedId(title.id)}
              onDuplicate={() => duplicateTitle(title)}
              onDelete={() => deleteTitle(title.id)}
            />
          ))}

          <h3 className="app-muted mb-3 mt-6 text-xs font-bold uppercase tracking-wide">Team Score Slots</h3>
          {slots.map((slot, index) => (
            <div key={slot.id} className="mb-2">
              <LayerButton
                active={selectedId === slot.id}
                label={`Slot ${index + 1}`}
                icon={<ListOrdered size={15} strokeWidth={1.9} aria-hidden="true" />}
                onSelect={() => setSelectedId(slot.id)}
                onDuplicate={() => duplicateSlot(slot)}
                onDelete={() => deleteSlot(slot.id)}
              />
              <button
                type="button"
                onClick={() => setSelectedId(`${slot.id}:name`)}
                className={`mb-1 block w-full rounded-md px-8 py-2 text-left text-sm ${
                  selectedId === `${slot.id}:name`
                    ? "layer-row-active"
                    : "app-text hover:bg-[var(--app-surface-elevated)]"
                }`}
              >
                T Team Name
              </button>
              <button
                type="button"
                onClick={() => setSelectedId(`${slot.id}:score`)}
                className={`mb-1 block w-full rounded-md px-8 py-2 text-left text-sm ${
                  selectedId === `${slot.id}:score`
                    ? "layer-row-active"
                    : "app-text hover:bg-[var(--app-surface-elevated)]"
                }`}
              >
                T Score
              </button>
            </div>
          ))}

          <div className="mt-5 grid gap-2 border-t border-[var(--app-border)] pt-4">
            <button type="button" onClick={addTitle} className="app-card flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-[var(--app-surface-elevated)]">
              <PlusCircle size={16} strokeWidth={1.9} aria-hidden="true" />
              Add title part
            </button>
            <button type="button" onClick={addSlot} className="app-card flex h-10 items-center gap-2 rounded-md border px-3 text-sm hover:bg-[var(--app-surface-elevated)]">
              <ListOrdered size={16} strokeWidth={1.9} aria-hidden="true" />
              Add team score slot
            </button>
          </div>
          <p className="app-muted mt-4 text-xs">Arrow keys nudge selected element. Hold Shift for 10 px.</p>
        </aside>

        <section className="app-card min-w-0 max-w-full overflow-hidden rounded-lg border p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="app-heading whitespace-nowrap text-2xl font-bold">Live Preview</h2>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-3 text-sm">
              <span className="app-muted">Canvas: {template.canvas.width}x{template.canvas.height}px</span>
              <select value={scalePercent} onChange={(event) => setScalePercent(Number(event.target.value))} className={inputClass("w-36")}>
                {scaleSelectOptions.map((value) => (
                  <option key={value} value={value}>Scaled to {value}%</option>
                ))}
              </select>
            </div>
          </div>
          <div ref={canvasScrollRef} className="max-h-[520px] w-full max-w-full overflow-auto rounded-lg bg-[var(--app-surface)] p-4">
            <div className="flex w-max min-w-full justify-center">
              <div
                className="relative flex-[0_0_auto] overflow-hidden"
                style={{ width: template.canvas.width * scale, height: template.canvas.height * scale }}
                onClick={() => setSelectedId("")}
              >
                <TeamStatusTemplatePreview
                  template={template}
                  scale={scale}
                  selectedId={selectedId}
                  editable
                  onSelect={setSelectedId}
                  onBeginDrag={beginDrag}
                />
              </div>
            </div>
          </div>

          <section className="app-surface-elevated mt-6 rounded-lg border border-[var(--app-border)] p-4">
            <button type="button" onClick={() => setExampleOpen((open) => !open)} className="app-heading flex w-full items-center justify-between text-left text-lg font-semibold">
              Example Data for Preview
              {exampleOpen ? <ChevronUp size={18} strokeWidth={1.9} aria-hidden="true" /> : <ChevronDown size={18} strokeWidth={1.9} aria-hidden="true" />}
            </button>
            {exampleOpen && (
              <div className="mt-4 max-w-full overflow-x-hidden">
                <p className="app-muted mb-4 text-sm">
                  Adjust these values to see how your team status template will look with real data. These values are NOT saved with the template.
                </p>

                <h3 className="app-heading mb-3 mt-4 font-semibold">Event Data</h3>
                <div className="example-grid">
                  <TextInput label="Event Name" value={template.previewData.eventName} onChange={(eventName) => updatePreviewData({ eventName })} />
                  <TextInput label="Organizer Name" value={template.previewData.organizerName} onChange={(organizerName) => updatePreviewData({ organizerName })} />
                  <TextInput label="Event Date" value={template.previewData.eventDate} onChange={(eventDate) => updatePreviewData({ eventDate })} />
                  <TextInput label="Event Location" value={template.previewData.eventLocation} onChange={(eventLocation) => updatePreviewData({ eventLocation })} />
                </div>

                <h3 className="app-heading mb-3 mt-6 font-semibold">Title Parts</h3>
                <div className="example-grid">
                  {titles.map((title) => (
                    <TextInput
                      key={title.id}
                      label={title.label || title.text || "Title"}
                      value={template.previewData.titleValues?.[title.id] ?? title.text ?? ""}
                      onChange={(value) =>
                        updatePreviewData({
                          titleValues: { ...(template.previewData.titleValues || {}), [title.id]: value },
                        })
                      }
                    />
                  ))}
                </div>

                <h3 className="app-heading mb-3 mt-6 font-semibold">Teams and Scores</h3>
                <div className="space-y-3">
                  {slots.map((slot, index) => {
                    const teamIndex = Number(slot.teamIndex ?? index);
                    const team = template.previewData.teams?.[teamIndex] || { name: `Team ${teamIndex + 1}`, score: "0" };
                    return (
                      <div key={slot.id} className="team-example-row">
                        <TextInput label={`Slot ${index + 1} Team`} value={team.name} onChange={(name) => updateTeam(teamIndex, { name })} />
                        <TextInput label="Score" value={team.score} onChange={(score) => updateTeam(teamIndex, { score })} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </section>

        <aside className="app-card min-w-0 overflow-x-hidden rounded-lg border p-6 shadow-sm">
          <h2 className="app-heading mb-8 text-2xl font-bold">Template Configuration</h2>
          <TextInput label="Template Name" value={template.name} onChange={(name) => updateTemplate({ name })} />
          <ToolbarField label="Background Image">
            <input type="file" accept="image/*" onChange={handleBackgroundUpload} className={inputClass("box-border h-auto min-h-10 w-full max-w-full min-w-0 truncate py-2")} />
          </ToolbarField>
          {template.canvas.backgroundImage && (
            <>
              <img className="bg-preview" src={template.canvas.backgroundImage} alt="" />
              <button type="button" className="app-danger-btn h-10 self-start rounded-md px-4 font-semibold hover:opacity-90" onClick={() => updateCanvas({ backgroundImage: "" })}>
                Clear Image
              </button>
            </>
          )}
          <h3 className="mb-3 mt-5 text-sm font-bold">Canvas Dimensions</h3>
          <div className="grid w-full grid-cols-1 gap-3 min-[1380px]:grid-cols-[repeat(2,minmax(0,1fr))]">
            <ToolbarField label="Canvas Width (px)"><NumberInput value={template.canvas.width} onChange={(width) => updateCanvas({ width })} className="box-border w-full max-w-full min-w-0" /></ToolbarField>
            <ToolbarField label="Canvas Height (px)"><NumberInput value={template.canvas.height} onChange={(height) => updateCanvas({ height })} className="box-border w-full max-w-full min-w-0" /></ToolbarField>
          </div>
          <div className="mt-48 border-t border-[var(--app-border)] pt-6">
            <button type="button" className="app-success-btn h-14 w-full rounded-md text-lg font-bold hover:opacity-90" onClick={saveTemplate}>
              {isEdit ? "Save Template Changes" : "Create New Template"}
            </button>
            <p className="app-muted mt-3 text-center text-xs">Tip: you can also save from the sticky bar at the top.</p>
          </div>
        </aside>
      </main>

      {renderToolbar()}
    </div>
  );
}

const teamStatusEditorThemeStyles = `
.template-editor-page h2,
.template-editor-page h3{color:var(--app-heading)}
.template-editor-page input,
.template-editor-page select,
.template-editor-page textarea{background:var(--app-input-bg);color:var(--app-text);border-color:var(--app-border)}
.template-editor-page input::placeholder,
.template-editor-page textarea::placeholder{color:var(--app-muted)}
.template-editor-page input:focus,
.template-editor-page select:focus,
.template-editor-page textarea:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-focus-ring)}
.template-editor-page input[type=file]::file-selector-button{border:1px solid var(--app-border);border-radius:6px;background:var(--app-surface-elevated);color:var(--app-text);margin-right:10px;padding:5px 10px}
.template-editor-page .app-card{background:var(--app-surface);border-color:var(--app-border);color:var(--app-text)}
.template-editor-page .app-surface-elevated{background:var(--app-surface-elevated);color:var(--app-text)}
.template-editor-page button:not(.app-success-btn):not(.app-danger-btn){color:inherit}
.template-editor-page .layer-row-active{background:var(--app-sidebar-active-bg);color:var(--app-sidebar-active-text);font-weight:700}
.template-editor-page .layer-row-active:hover{background:var(--app-sidebar-active-bg);color:var(--app-sidebar-active-text)}
.template-editor-page .layer-row-active svg{color:var(--app-sidebar-active-text)}
.team-status-template-canvas{color-scheme:light}
.bg-preview{width:100%;max-height:300px;object-fit:contain;border-radius:8px;background:var(--app-surface-elevated);border:1px solid var(--app-border);color-scheme:light}
.example-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;width:100%;max-width:100%}
.team-example-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,.35fr);gap:12px;width:100%;max-width:100%}
@media(max-width:900px){.example-grid,.team-example-row{grid-template-columns:minmax(0,1fr)}.template-editor-page header h1{white-space:normal}}
`;
