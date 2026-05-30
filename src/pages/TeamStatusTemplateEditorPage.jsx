import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Copy, Save, Trash2 } from "lucide-react";
import FontFamilySelect from "../components/FontFamilySelect";
import TeamStatusTemplatePreview from "../components/TeamStatusTemplatePreview";
import { getUserStorageKey } from "../utils/storage.js";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const STORAGE_KEY = "rankify_team_status_templates";
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

const defaultTeams = [
  { name: "Nullamkulam", score: "581" },
  { name: "Parappanangadi", score: "581" },
  { name: "Hidayah Nagar", score: "580" },
  { name: "Ottummal South", score: "579" },
];

function uid(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function validateImageFile(file) {
  if (!file) return true;
  if (file.size > MAX_IMAGE_SIZE) {
    alert("Image is too large. Please compress the image below 1MB and upload again.");
    return false;
  }
  return true;
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

function getTemplatesByEvent() {
  const stored = safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), {});
  return stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
}

function getActiveEvent() {
  const events = safeJsonParse(localStorage.getItem(getUserStorageKey(EVENTS_KEY)), []);
  const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
  const activeEvent = Array.isArray(events)
    ? events.find((event) => String(event.id) === String(activeEventId))
    : null;

  return activeEvent || {
    id: activeEventId || "default",
    name: "Active Event",
    organizer: "",
    date: "",
    location: "",
  };
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
    width: 380,
    fontFamily: "Inter",
    fontSize: 72,
    fontWeight: "400",
    align: "left",
    color: "#6d00b9",
    lineHeight: 1.2,
    showBg: false,
  };
}

function defaultSlot(index) {
  return {
    id: uid("slot"),
    kind: "teamSlot",
    label: `Slot ${index}`,
    teamIndex: index - 1,
    x: 100,
    y: 300 + (index - 1) * 40,
    width: 400,
    spacing: 0,
    horizontalAlign: "left",
    verticalAlign: "top",
    name: {
      x: 0,
      y: 0,
      width: 250,
      fontFamily: "Inter",
      fontSize: 30,
      fontWeight: "700",
      align: "left",
      color: "#222222",
      lineHeight: 1.2,
      showBg: true,
    },
    score: {
      x: 235,
      y: 0,
      width: 90,
      fontFamily: "Inter",
      fontSize: 30,
      fontWeight: "800",
      align: "left",
      color: "#6d00b9",
      lineHeight: 1.2,
      showBg: false,
    },
  };
}

function publicBackgroundImage(variant = "green") {
  const isLight = variant === "light";
  const background = isLight
    ? `<rect width="1080" height="1350" fill="#ffffff"/><path d="M0 0 C420 160 600 20 1080 160 V1350 H0Z" fill="#f6f3ed"/><path d="M90 960 C170 760 210 620 170 430" stroke="#4E0D65" stroke-width="18" fill="none"/><g fill="#6D1684"><ellipse cx="122" cy="830" rx="42" ry="18" transform="rotate(-35 122 830)"/><ellipse cx="185" cy="720" rx="42" ry="18" transform="rotate(-35 185 720)"/><ellipse cx="230" cy="610" rx="42" ry="18" transform="rotate(-35 230 610)"/></g>`
    : `<defs><radialGradient id="g" cx="72%" cy="30%" r="72%"><stop stop-color="#0c6a50"/><stop offset="1" stop-color="#063a55"/></radialGradient></defs><rect width="1080" height="1350" fill="url(#g)"/><path d="M620 260 C780 120 1050 160 1220 360" stroke="#2c7b1f" stroke-width="92" fill="none" opacity=".75"/><path d="M660 360 C820 230 1030 280 1190 470" stroke="#2458a2" stroke-width="78" fill="none" opacity=".7"/><circle cx="760" cy="775" r="150" fill="#48b8e8" opacity=".78"/><rect x="0" y="0" width="1080" height="1350" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="20"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">${background}<text x="110" y="1200" font-family="Arial" font-size="42" font-weight="700" fill="${isLight ? "#111827" : "#ffffff"}">Sahityolsav</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function publicTemplateDefaults(template = {}) {
  const isLight = template.variant === "light";
  return {
    canvas: {
      width: template.canvas?.width || 1080,
      height: template.canvas?.height || 1350,
      backgroundImage: template.canvas?.backgroundImage || template.previewImage || publicBackgroundImage(template.variant),
      backgroundColor: template.canvas?.backgroundColor || (isLight ? "#ffffff" : "#07543F"),
    },
    elements: [
      defaultTitle("title_final", "Final", 110, 120),
      defaultTitle("title_point", "Point", 110, 180),
      defaultTitle("title_status", "Status", 110, 240),
      defaultSlot(1),
      defaultSlot(2),
      defaultSlot(3),
      defaultSlot(4),
    ].map((element) =>
      element.kind === "title"
        ? { ...element, color: isLight ? "#4E0D65" : "#ffffff", fontSize: 52, width: 360 }
        : element
    ),
  };
}

function normalizePreviewData(template = {}, activeEvent = {}) {
  const existing = template.previewData || {};
  const previewData = {
    eventName: existing.eventName ?? activeEvent.name ?? "",
    organizerName: existing.organizerName ?? activeEvent.organizer ?? "",
    eventDate: existing.eventDate ?? activeEvent.date ?? "",
    eventLocation: existing.eventLocation ?? activeEvent.location ?? "",
    titleValues: { ...(existing.titleValues || {}) },
    teams: Array.isArray(existing.teams) ? [...existing.teams] : [],
  };

  const titleElements = Array.isArray(template.elements) ? template.elements.filter((element) => element.kind === "title") : [];
  const titleParts = Array.isArray(existing.titleParts) ? [...existing.titleParts] : [];
  titleElements.forEach((title) => {
    if (previewData.titleValues[title.id] == null) {
      previewData.titleValues[title.id] = titleParts.length
        ? titleParts.shift()
        : title.text || title.label || "";
    }
  });

  const slotElements = Array.isArray(template.elements) ? template.elements.filter((element) => element.kind === "teamSlot") : [];
  const defaultTeam = (index) => defaultTeams[index] || { name: `Team ${index + 1}`, score: "0" };
  slotElements.forEach((slot, index) => {
    const teamIndex = Number(slot.teamIndex ?? index);
    if (previewData.teams[teamIndex] == null) {
      previewData.teams[teamIndex] = defaultTeam(teamIndex);
    }
  });

  return previewData;
}

function defaultTemplate(activeEvent, existing = {}) {
  const publicDefaults =
    existing.source === "public" && !Array.isArray(existing.elements)
      ? publicTemplateDefaults(existing)
      : existing.source === "public" && Array.isArray(existing.elements) && existing.elements.length === 0
        ? publicTemplateDefaults(existing)
        : null;
  const fallbackElements = publicDefaults?.elements || [
    defaultTitle("title_final", "Final", 100, 100),
    defaultTitle("title_point", "Point", 100, 175),
    defaultTitle("title_status", "Status", 100, 250),
    defaultSlot(1),
    defaultSlot(2),
    defaultSlot(3),
  ];
  const elements = Array.isArray(existing.elements) && existing.elements.length ? existing.elements : fallbackElements;

  return {
    id: existing.id || uid("team_status_template"),
    eventId: existing.eventId || activeEvent.id,
    type: "team-status",
    name: existing.name || "New Team Status Template",
    canvas: {
      width: publicDefaults?.canvas.width || existing.canvas?.width || 1080,
      height: publicDefaults?.canvas.height || existing.canvas?.height || 1080,
      backgroundImage: publicDefaults?.canvas.backgroundImage || existing.canvas?.backgroundImage || "",
      backgroundColor: publicDefaults?.canvas.backgroundColor || existing.canvas?.backgroundColor || "#eeeeee",
    },
    elements,
    previewData: normalizePreviewData({ ...existing, elements }, activeEvent),
    previewImage: existing.previewImage || "",
    createdAt: existing.createdAt || today(),
    updatedAt: existing.updatedAt || today(),
    source: existing.source || "custom",
  };
}

function normalizeTemplate(template, activeEvent) {
  return defaultTemplate(activeEvent, template || {});
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
  const titleValues = previewData.titleValues || {};
  if (element.dataSource === "eventName") return previewData.eventName;
  if (element.dataSource === "organizerName") return previewData.organizerName;
  if (element.dataSource === "eventDate") return previewData.eventDate;
  if (element.dataSource === "eventLocation") return previewData.eventLocation;
  if (titleValues[element.id] != null) return titleValues[element.id];
  return element.text;
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
            return `${bg}<text x="${x}" y="${y}" font-family="${escapeSvg(child.fontFamily || "Inter")}" font-size="${Number(child.fontSize || 16)}" font-weight="${escapeSvg(child.fontWeight || "400")}" text-anchor="${svgTextAnchor(child.align)}" fill="${escapeSvg(child.color || "#111111")}">${escapeSvg(team[childKey])}</text>`;
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

function LayerRow({ active, label, onSelect, onDuplicate, onDelete }) {
  return (
    <button type="button" className={active ? "active layer-row" : "layer-row"} onClick={onSelect}>
      <span className="layer-label">{label}</span>
      <span className="layer-icons">
        <Copy
          size={13}
          onClick={(event) => {
            event.stopPropagation();
            onDuplicate();
          }}
        />
        <Trash2
          size={13}
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        />
      </span>
    </button>
  );
}

export default function TeamStatusTemplateEditorPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const previewContainerRef = useRef(null);
  const previewRef = useRef(null);
  const dragRef = useRef(null);
  const [activeEvent, setActiveEvent] = useState(() => getActiveEvent());
  const [template, setTemplate] = useState(() => defaultTemplate(getActiveEvent()));
  const [selectedId, setSelectedId] = useState("title_final");
  const [exampleOpen, setExampleOpen] = useState(false);
  const [scalePercent, setScalePercent] = useState(60);

  const isEdit = Boolean(templateId);
  const titles = template.elements.filter((element) => element.kind === "title");
  const slots = template.elements.filter((element) => element.kind === "teamSlot");
  const selected = useMemo(() => {
    const { elementId, child } = selectedParts(selectedId);
    const element = template.elements.find((item) => item.id === elementId);
    return { element, child };
  }, [selectedId, template.elements]);

  const scale = scalePercent / 100;

  useEffect(() => {
    const node = previewContainerRef.current;
    if (!node) return;

    function updateFitScale() {
      const previewWidth = node.clientWidth;
      const previewHeight = node.clientHeight;
      const fitScale = Math.min(previewWidth / template.canvas.width, previewHeight / template.canvas.height, 1);
      const fitPercent = Math.max(1, Math.round(fitScale * 100));
      if (scalePercent > fitPercent) {
        setScalePercent(fitPercent);
      }
    }

    updateFitScale();
    window.addEventListener("resize", updateFitScale);
    return () => window.removeEventListener("resize", updateFitScale);
  }, [template.canvas.height, template.canvas.width, scalePercent]);

  useEffect(() => {
    const event = getActiveEvent();
    const stored = getTemplatesByEvent();
    const found = templateId
      ? Object.values(stored)
          .flat()
          .find((item) => String(item.id) === String(templateId))
      : null;

    setActiveEvent(event);
    setTemplate(normalizeTemplate(found, event));
  }, [templateId]);

  function updateTemplate(patch) {
    setTemplate((current) => ({ ...current, ...patch }));
  }

  function updateCanvas(patch) {
    setTemplate((current) => ({ ...current, canvas: { ...current.canvas, ...patch } }));
  }

  function updateElement(elementId, patch) {
    setTemplate((current) => {
      const target = current.elements.find((element) => element.id === elementId);
      const nextElements = current.elements.map((element) =>
        element.id === elementId ? { ...element, ...patch } : element
      );
      let nextPreviewData = current.previewData;

      if (target?.kind === "title" && patch.text != null) {
        const currentTitleValue = current.previewData?.titleValues?.[elementId];
        if (currentTitleValue === undefined || currentTitleValue === target.text) {
          nextPreviewData = {
            ...current.previewData,
            titleValues: {
              ...(current.previewData?.titleValues || {}),
              [elementId]: patch.text,
            },
          };
        }
      }

      return {
        ...current,
        elements: nextElements,
        previewData: nextPreviewData,
      };
    });
  }

  function updateSlotChild(elementId, child, patch) {
    setTemplate((current) => ({
      ...current,
      elements: current.elements.map((element) =>
        element.id === elementId
          ? { ...element, [child]: { ...element[child], ...patch } }
          : element
      ),
    }));
  }

  function updatePreviewData(patch) {
    setTemplate((current) => ({
      ...current,
      previewData: { ...current.previewData, ...patch },
    }));
  }

  function nextTeamIndex(elements = []) {
    const slotIndices = elements
      .filter((element) => element.kind === "teamSlot")
      .map((slot) => Number(slot.teamIndex ?? 0));
    return slotIndices.length ? Math.max(...slotIndices) + 1 : 0;
  }

  function addTitle() {
    const title = defaultTitle(uid("title"), "Title", 120, 120);
    setTemplate((current) => {
      const titleValues = { ...(current.previewData?.titleValues || {}), [title.id]: title.text };
      return {
        ...current,
        elements: [...current.elements, title],
        previewData: { ...current.previewData, titleValues },
      };
    });
    setSelectedId(title.id);
  }

  function addSlot() {
    const index = nextTeamIndex(template.elements);
    const slot = defaultSlot(index + 1);
    slot.teamIndex = index;

    setTemplate((current) => {
      const teams = Array.isArray(current.previewData?.teams) ? [...current.previewData.teams] : [];
      if (teams[slot.teamIndex] == null) {
        teams[slot.teamIndex] = { name: `Team ${slot.teamIndex + 1}`, score: "0" };
      }
      return {
        ...current,
        elements: [...current.elements, slot],
        previewData: { ...current.previewData, teams },
      };
    });
    setSelectedId(slot.id);
  }

  function duplicateTitle(title) {
    const copy = {
      ...title,
      id: uid("title"),
      label: `${title.label || title.text || "Title"} Copy`,
      text: `${title.text || title.label || "Title"} Copy`,
      x: Number(title.x || 0) + 20,
      y: Number(title.y || 0) + 20,
    };

    setTemplate((current) => {
      const titleValues = { ...(current.previewData?.titleValues || {}), [copy.id]: copy.text };
      return {
        ...current,
        elements: [...current.elements, copy],
        previewData: { ...current.previewData, titleValues },
      };
    });
    setSelectedId(copy.id);
  }

  function deleteTitle(titleId) {
    const confirmed = window.confirm("Are you sure you want to delete this title layer?");
    if (!confirmed) return;

    setTemplate((current) => {
      const nextElements = current.elements.filter((element) => element.id !== titleId);
      const nextPreviewData = { ...current.previewData };
      if (nextPreviewData?.titleValues) {
        const titleValues = { ...nextPreviewData.titleValues };
        delete titleValues[titleId];
        nextPreviewData.titleValues = titleValues;
      }
      const nextSelection = nextElements[0]?.id || "";
      setSelectedId(nextSelection);
      return { ...current, elements: nextElements, previewData: nextPreviewData };
    });
  }

  function duplicateSlot(slot) {
    const nextIndex = nextTeamIndex(template.elements);
    const copy = {
      ...slot,
      id: uid("slot"),
      label: `Slot ${nextIndex + 1}`,
      y: Number(slot.y || 0) + 40,
      teamIndex: nextIndex,
    };

    setTemplate((current) => {
      const teams = Array.isArray(current.previewData?.teams) ? [...current.previewData.teams] : [];
      if (teams[copy.teamIndex] == null) {
        teams[copy.teamIndex] = { name: `Team ${copy.teamIndex + 1}`, score: "0" };
      }
      return {
        ...current,
        elements: [...current.elements, copy],
        previewData: { ...current.previewData, teams },
      };
    });
    setSelectedId(copy.id);
  }

  function deleteSlot(slotId) {
    setTemplate((current) => ({
      ...current,
      elements: current.elements.filter((element) => element.id !== slotId),
    }));
    setSelectedId("");
  }

  function handleBackgroundUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file)) return;

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const nextWidth = image.naturalWidth;
        const nextHeight = image.naturalHeight;
        updateCanvas({
          backgroundImage: reader.result,
          width: nextWidth,
          height: nextHeight,
        });

        const node = previewContainerRef.current;
        if (node) {
          const fitScale = Math.min(node.clientWidth / nextWidth, node.clientHeight / nextHeight, 1);
          setScalePercent(Math.max(1, Math.round(fitScale * 100)));
        }
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
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
      x: Math.round((drag.originalX + dx) * 100) / 100,
      y: Math.round((drag.originalY + dy) * 100) / 100,
    };
    if (drag.child) updateSlotChild(drag.elementId, drag.child, patch);
    else updateElement(drag.elementId, patch);
  }

  function endDrag() {
    dragRef.current = null;
    window.removeEventListener("pointermove", handleDrag);
    window.removeEventListener("pointerup", endDrag);
  }

  function saveTemplate() {
    try {
      const activeEventId = localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || activeEvent?.id;
      
      if (!activeEventId) {
        alert("Please create or select an event first before creating a template.");
        return;
      }

      const stored = getTemplatesByEvent();
      const currentList = stored[activeEventId] || [];
      const nextTemplate = {
        ...template,
        id: isEdit ? template.id : template.id || uid("team_status_template"),
        eventId: activeEventId,
        type: "team-status",
        previewImage: makePreviewImage(template),
        updatedAt: today(),
        createdAt: template.createdAt || today(),
      };

      const nextList = isEdit
        ? currentList.map((item) => (String(item.id) === String(nextTemplate.id) ? nextTemplate : item))
        : [...currentList, nextTemplate];

      localStorage.setItem(getUserStorageKey(STORAGE_KEY), JSON.stringify({ ...stored, [activeEventId]: nextList }));

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

  function renderToolbar() {
    if (!selected.element) {
      return (
        <div className="toolbar empty-toolbar">
          <strong className="empty-message">No element selected.</strong>
          <div className="toolbar-group">
            <span>Add New Elements:</span>
            <button type="button" onClick={addTitle}>+ Title Part</button>
            <button type="button" onClick={addSlot}>+ Team Score Slot</button>
          </div>
          <div className="toolbar-group existing-group">
            <span>Existing Elements:</span>
            {titles.map((title, index) => (
              <button type="button" key={title.id} onClick={() => setSelectedId(title.id)}>Title {index + 1}</button>
            ))}
            {slots.map((slot, index) => (
              <button type="button" key={slot.id} onClick={() => setSelectedId(slot.id)}>Team Slot {index + 1}</button>
            ))}
          </div>
        </div>
      );
    }

    if (selected.element.kind === "teamSlot" && !selected.child) {
      return (
        <div className="toolbar">
          {numberControl("X (Slot)", selected.element.x, (value) => updateElement(selected.element.id, { x: value }))}
          {numberControl("Y (Slot)", selected.element.y, (value) => updateElement(selected.element.id, { y: value }))}
          {numberControl("Width", selected.element.width, (value) => updateElement(selected.element.id, { width: value }))}
          {numberControl("Spacing", selected.element.spacing, (value) => updateElement(selected.element.id, { spacing: value }))}
          {selectControl("H. Align", selected.element.horizontalAlign, ["left", "center", "right"], (value) => updateElement(selected.element.id, { horizontalAlign: value }))}
          {selectControl("V. Align", selected.element.verticalAlign, ["top", "center", "bottom"], (value) => updateElement(selected.element.id, { verticalAlign: value }))}
        </div>
      );
    }

    const target = selected.child ? selected.element[selected.child] : selected.element;
    const update = selected.child
      ? (patch) => updateSlotChild(selected.element.id, selected.child, patch)
      : (patch) => updateElement(selected.element.id, patch);

    return (
      <div className="toolbar">
        {numberControl("X Position", target.x, (value) => update({ x: value }))}
        {numberControl("Y Position", target.y, (value) => update({ y: value }))}
        {!selected.child && selectControl("Data Source", target.dataSource, ["manual", "eventName", "organizerName", "eventDate", "eventLocation"], (value) => update({ dataSource: value }))}
        {!selected.child && textControl("Example Text", target.text, (value) => update({ text: value, label: value }))}
        {fontFamilyControl("Font Family", target.fontFamily, (value) => update({ fontFamily: value }))}
        {numberControl("Font Size", target.fontSize, (value) => update({ fontSize: value }))}
        {selectControl("Font Weight", target.fontWeight, ["400", "500", "600", "700", "800"], (value) => update({ fontWeight: value }))}
        {selectControl("Align", target.align, ["left", "center", "right"], (value) => update({ align: value }))}
        {colorControl("Color", target.color, (value) => update({ color: value }))}
        {numberControl("Line Height", target.lineHeight, (value) => update({ lineHeight: value }), 0.1)}
        {numberControl("Width", target.width, (value) => update({ width: value }))}
        {checkboxControl("Show BG", target.showBg, (value) => update({ showBg: value }))}
      </div>
    );
  }

  return (
    <section className="team-editor-page">
      <style>{styles}</style>
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-[#F8FAFC] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/team-status-templates")}
              className="rounded-md px-2 py-1 text-2xl text-gray-600 hover:bg-gray-100"
            >
              &larr;
            </button>
            <div>
              <p className="text-sm text-gray-500">Team Point Status Templates</p>
              <h1 className="text-2xl font-bold">{isEdit ? `Edit — ${template.name}` : "Create team status template"}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={saveTemplate}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
          >
            <Save size={17} />
            {isEdit ? "Save changes" : "Create template"}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-[260px_minmax(0,1fr)_360px] gap-4 p-4">
        <aside className="layers-panel rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2>LAYERS</h2>
          {titles.map((title) => (
            <LayerRow
              key={title.id}
              active={selectedId === title.id}
              label={`T ${title.label}`}
              onSelect={() => setSelectedId(title.id)}
              onDuplicate={() => duplicateTitle(title)}
              onDelete={() => deleteTitle(title.id)}
            />
          ))}
          <h3>TEAM SCORE SLOTS</h3>
          {slots.map((slot, index) => (
            <div key={slot.id} className="slot-layer">
              <LayerRow
                active={selectedId === slot.id}
                label={`▦ Slot ${index + 1}`}
                onSelect={() => setSelectedId(slot.id)}
                onDuplicate={() => duplicateSlot(slot)}
                onDelete={() => deleteSlot(slot.id)}
              />
              <button type="button" className={selectedId === `${slot.id}:name` ? "active child" : "child"} onClick={() => setSelectedId(`${slot.id}:name`)}>
                T Team Name
              </button>
              <button type="button" className={selectedId === `${slot.id}:score` ? "active child" : "child"} onClick={() => setSelectedId(`${slot.id}:score`)}>
                T Score
              </button>
            </div>
          ))}
          <div className="layer-actions">
            <button type="button" onClick={addTitle}>+ Add title part</button>
            <button type="button" onClick={addSlot}>+ Add team score slot</button>
          </div>
          <p className="hint">↑↓ Arrow keys nudge selected element (Shift = 10 px)</p>
        </aside>

        <section className="preview-panel min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="whitespace-nowrap text-2xl font-bold">Live Preview</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">Canvas: {template.canvas.width}×{template.canvas.height}px</span>
              <span className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm">Scaled to {Math.round(scale * 100)}%</span>
            </div>
          </div>
          <div className="max-h-[520px] overflow-auto rounded-lg bg-white p-4" ref={previewContainerRef}>
            <div
              className="canvas-outer"
              ref={previewRef}
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

          <section className="mt-6 rounded-lg bg-white/70 p-4">
            <button type="button" onClick={() => setExampleOpen((open) => !open)} className="flex w-full items-center justify-between text-left text-lg font-semibold">
              Example Data for Preview <span>{exampleOpen ? "⌃" : "⌄"}</span>
            </button>
            {exampleOpen && (
              <div className="example-fields">
                <p>Adjust these values to see how your template elements will look with real data. These values are NOT saved with the template.</p>
                <h3>Event Data (for dynamic elements)</h3>
                <div className="two-col">
                  {textInput("Event Name", template.previewData.eventName, (value) => updatePreviewData({ eventName: value }))}
                  {textInput("Organizer Name", template.previewData.organizerName, (value) => updatePreviewData({ organizerName: value }))}
                  {textInput("Event Date (string)", template.previewData.eventDate, (value) => updatePreviewData({ eventDate: value }))}
                  {textInput("Event Location", template.previewData.eventLocation, (value) => updatePreviewData({ eventLocation: value }))}
                </div>
                <h3>Manual Title Parts</h3>
                {titles
                  .filter((title) => title.dataSource === "manual")
                  .map((title) =>
                    textInput(
                      title.label || title.text || "Title",
                      template.previewData.titleValues?.[title.id] ?? title.text ?? "",
                      (value) => updatePreviewData({
                        titleValues: {
                          ...(template.previewData.titleValues || {}),
                          [title.id]: value,
                        },
                      })
                    )
                  )}
                <h3>Example Teams & Scores</h3>
                {slots.map((slot, index) => {
                  const teamIndex = Number(slot.teamIndex ?? index);
                  const team = template.previewData.teams?.[teamIndex] || { name: `Team ${teamIndex + 1}`, score: "0" };
                  return (
                    <div className="team-row" key={slot.id}>
                      <input value={team.name} onChange={(event) => {
                        const teams = [...(template.previewData.teams || [])];
                        teams[teamIndex] = { ...teams[teamIndex], name: event.target.value };
                        updatePreviewData({ teams });
                      }} />
                      <input value={team.score} onChange={(event) => {
                        const teams = [...(template.previewData.teams || [])];
                        teams[teamIndex] = { ...teams[teamIndex], score: event.target.value };
                        updatePreviewData({ teams });
                      }} />
                    </div>
                  );
                })}
                <button type="button" className="add-example" onClick={() => addSlot()}>
                  + Add Team Score Slot
                </button>
              </div>
            )}
          </section>
        </section>

        <aside className="config-panel rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-8 text-2xl font-bold">Template Configuration</h2>
          {textInput("Template Name", template.name, (value) => updateTemplate({ name: value }))}
          <label>
            Background Image
            <input type="file" accept="image/*" onChange={handleBackgroundUpload} />
          </label>
          {template.canvas.backgroundImage && (
            <>
              <img className="bg-preview" src={template.canvas.backgroundImage} alt="" />
              <button type="button" className="clear-btn" onClick={() => updateCanvas({ backgroundImage: "" })}>Clear Image</button>
            </>
          )}
          <div className="two-col">
            {numberInput("Canvas Width (px)", template.canvas.width, (value) => updateCanvas({ width: value }))}
            {numberInput("Canvas Height (px)", template.canvas.height, (value) => updateCanvas({ height: value }))}
          </div>
          <button type="button" className="big-save-btn" onClick={saveTemplate}>
            {isEdit ? "Save Template Changes" : "Create Template"}
          </button>
        </aside>
      </main>

      {renderToolbar()}
    </section>
  );
}

function textInput(label, value, onChange) {
  return (
    <label>
      {label}
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function numberInput(label, value, onChange) {
  return (
    <label>
      {label}
      <input type="number" value={value ?? ""} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function numberControl(label, value, onChange, step = 1) {
  return (
    <label>
      {label}
      <input type="number" step={step} value={value ?? ""} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function textControl(label, value, onChange) {
  return (
    <label>
      {label}
      <input value={value || ""} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function fontFamilyControl(label, value, onChange) {
  return (
    <label>
      {label}
      <FontFamilySelect value={value} onChange={onChange} />
    </label>
  );
}

function selectControl(label, value, options, onChange) {
  return (
    <label>
      {label}
      <select value={value || options[0]} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function colorControl(label, value, onChange) {
  return (
    <label>
      {label}
      <input type="color" value={value || "#000000"} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function checkboxControl(label, value, onChange) {
  return (
    <label className="check-control">
      {label}
      <input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

const styles = `
.team-editor-page{min-height:100vh;background:#F8FAFC;color:#020817;padding-bottom:112px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.editor-header{height:76px;border-bottom:1px solid #D9DEE6;display:flex;align-items:center;gap:14px;padding:0 20px 0 28px;background:#F8FAFC}
.back-btn{border:0;background:transparent;color:#4B5563;display:flex;cursor:pointer}.editor-header p{margin:0;color:#667085;font-size:13px}.editor-header h1{margin:2px 0 0;font-size:21px;line-height:1.2;font-weight:800}.save-btn{margin-left:auto;height:40px;border:0;border-radius:7px;background:#26752C;color:#fff;padding:0 14px;display:flex;align-items:center;gap:8px;font-weight:800;cursor:pointer}
.editor-grid{display:grid;grid-template-columns:260px minmax(0,1fr) 360px;gap:16px;padding:16px;align-items:start}
.layers-panel,.preview-panel,.config-panel{border:1px solid #D9DEE6;border-radius:8px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.06)}
.layers-panel{padding:16px;min-height:620px;max-height:calc(100vh - 196px);overflow:auto}.layers-panel h2,.layers-panel h3{margin:0 0 10px;color:#667085;font-size:12px;font-weight:800;letter-spacing:.02em}.layers-panel h3{margin-top:26px}.layers-panel button{width:100%;min-height:32px;border:0;border-radius:6px;background:transparent;display:flex;align-items:center;justify-content:space-between;text-align:left;padding:0 10px;cursor:pointer}.layers-panel button.active{background:#26752C;color:#fff;font-weight:700}.layers-panel button.child{padding-left:22px}.layer-row{gap:8px}.layer-label{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.layer-icons{margin-left:auto;display:flex;align-items:center;justify-content:flex-end;gap:10px;flex:0 0 auto}.layer-icons svg{display:block;border-radius:4px}.layer-icons svg:hover{background:rgba(15,23,42,.08)}.active .layer-icons svg:hover{background:rgba(255,255,255,.18)}.layer-actions{border-top:1px solid #D9DEE6;margin-top:18px;padding-top:12px;display:grid;gap:4px}.layer-actions button{color:#475467}.hint{margin:14px 0 0;color:#98A2B3;font-size:12px;line-height:1.35}
.preview-panel{padding:0;min-height:620px;overflow:hidden}.panel-title{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.panel-title h2{margin:0;font-size:22px;line-height:1.2}.panel-title p{margin:2px 0 0;color:#344054;font-size:13px;white-space:nowrap}.panel-title span{border:1px solid #D9DEE6;border-radius:6px;padding:4px 9px;background:#fff}
.canvas-outer{margin:22px auto 34px;position:relative;overflow:hidden}.canvas-inner{position:relative;overflow:hidden;background-size:cover;background-position:center;transform-origin:top left;border:1px solid #D9DEE6;border-radius:6px}
.canvas-element,.slot-element,.slot-child{position:absolute;box-sizing:border-box;cursor:move;user-select:none;white-space:pre-wrap}.canvas-element.selected,.slot-element.selected,.slot-child.selected{outline:2px solid #26752C;outline-offset:0}.slot-element{height:42px;display:flex;position:absolute}.slot-child{min-height:24px;padding:0 4px}
.example-panel{background:#fff;border-top:1px solid #F1F3F6}.example-panel>button{width:100%;height:56px;border:0;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 18px;font-size:18px;cursor:pointer}.example-fields{padding:0 18px 18px}.example-fields p{color:#344054}.example-fields h3{font-size:16px}.two-col{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.team-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;margin-bottom:8px}.add-example{height:36px;border:1px solid #D9DEE6;border-radius:6px;background:#fff;padding:0 14px;font-size:16px;cursor:pointer}
.config-panel{padding:20px 16px;display:flex;flex-direction:column;gap:12px;min-height:620px;max-height:calc(100vh - 196px);overflow:auto}.config-panel h2{margin:0 0 18px;font-size:24px;font-weight:500}label{display:grid;gap:6px;font-size:15px;min-width:0}input,select{width:100%;min-width:0;height:38px;border:1px solid #D9DEE6;border-radius:6px;background:#fff;padding:0 12px;font-size:15px;outline:none;box-sizing:border-box}input:focus,select:focus{border-color:#26752C;box-shadow:0 0 0 3px rgba(38,117,44,.16)}.bg-preview{width:100%;max-height:360px;object-fit:contain;border-radius:6px;background:#F3F4F6}.clear-btn{align-self:flex-start;height:36px;border:0;border-radius:6px;background:#DC2626;color:#fff;padding:0 14px;font-weight:700;cursor:pointer}.big-save-btn{margin-top:auto;height:52px;min-height:52px;border:0;border-radius:7px;background:#26752C;color:#fff;font-size:20px;font-weight:800;cursor:pointer}
.toolbar{position:fixed;left:260px;right:0;bottom:0;z-index:30;min-height:82px;border-top:1px solid #D9DEE6;background:#F8FAFC;display:flex;align-items:center;gap:10px;padding:10px 14px;box-shadow:0 -2px 10px rgba(15,23,42,.06);overflow-x:auto;overflow-y:hidden;white-space:nowrap}.toolbar label{min-width:90px;display:grid;gap:6px;color:#344054;font-size:13px;font-weight:600}.toolbar input,.toolbar select{height:38px;border-radius:7px}.toolbar button{height:38px;border:1px solid #D9DEE6;border-radius:7px;background:#fff;padding:0 14px;font-size:16px;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.06)}.toolbar.empty-toolbar{gap:16px}.empty-message{color:#667085;white-space:nowrap;font-size:15px}.toolbar-group{display:flex;align-items:center;gap:10px;white-space:nowrap}.toolbar-group span{color:#667085;font-size:15px;font-weight:500}.existing-group button{background:#EAF5EA;border-color:#DDEBDD;color:#176B22;box-shadow:none}.check-control{min-width:70px;display:flex!important;align-items:center;gap:8px}.check-control input{width:18px;height:18px;min-width:18px;padding:0}.toolbar label:has(input[type="color"]){min-width:86px}.toolbar input[type="color"]{width:56px;padding:4px}.toolbar label:has(select){min-width:120px}.toolbar label:nth-child(4){min-width:230px}.toolbar label:nth-child(5){min-width:200px}
@media(max-width:1320px){.editor-grid{grid-template-columns:minmax(210px,230px) minmax(500px,1fr) minmax(320px,360px)}}
@media(max-width:1100px){.editor-grid{grid-template-columns:1fr}.toolbar{left:0}.layers-panel,.preview-panel,.config-panel{max-height:none;min-height:auto}.config-panel{min-height:420px}}
`;
