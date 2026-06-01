import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Image, PlusCircle, Save, Trash2, X } from "lucide-react";
import FontFamilySelect from "../components/FontFamilySelect.jsx";
import { getUserStorageKey } from "../utils/storage.js";

const STORAGE_KEY = "rankify_framed_post_templates";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const MAX_IMAGE_SIZE = 1024 * 1024; // 1MB

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function getActiveEventId() {
  return localStorage.getItem(getUserStorageKey(ACTIVE_EVENT_KEY)) || "";
}

function normalizeTemplates(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    return Object.values(raw).flat();
  }
  return [];
}

function getStorageShape(raw) {
  if (Array.isArray(raw)) return "array";
  if (raw && typeof raw === "object") return "object";
  return "array";
}

function loadAllTemplates() {
  return normalizeTemplates(safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []));
}

function createGroupedTemplates(rawArray) {
  return rawArray.reduce((acc, item) => {
    const eventId = item?.eventId || "default";
    acc[eventId] = acc[eventId] || [];
    acc[eventId].push(item);
    return acc;
  }, {});
}

function saveTemplates(allTemplates, shape) {
  try {
    if (shape === "object") {
      const grouped = createGroupedTemplates(allTemplates);
      localStorage.setItem(getUserStorageKey(STORAGE_KEY), JSON.stringify(grouped));
      return true;
    }

    localStorage.setItem(getUserStorageKey(STORAGE_KEY), JSON.stringify(allTemplates));
    return true;
  } catch (error) {
    if (error?.name === "QuotaExceededError") {
      alert("Storage limit exceeded. Please use a smaller/compressed image.");
    } else {
      alert("Unable to save template. Please try again.");
    }
    console.error("Failed to save framed post template", error);
    return false;
  }
}

function makeId(prefix = "field") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function today() {
  return new Date().toLocaleDateString("en-US");
}

function getSavedFrameImage(template) {
  if (!template || typeof template !== "object") return "";
  return (
    template.frameImage ||
    template.frameImageUrl ||
    template.frameOverlay ||
    template.overlayImage ||
    template.overlayUrl ||
    template.overlaySrc ||
    template.backgroundImage ||
    template.previewImage ||
    template.imageUrl ||
    template.imageSrc ||
    template.image ||
    template.src ||
    template.frameSrc ||
    template.frame_image_url ||
    template.frame_image ||
    template.frame_overlay ||
    template.overlay_image ||
    template.overlay_src ||
    template.image_url ||
    template.image_src ||
    ""
  );
}

export default function FramedPostTemplateEditorPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const [activeEventId, setActiveEventId] = useState(getActiveEventId());
  const [templateName, setTemplateName] = useState("");
  const [frameImageUrl, setFrameImageUrl] = useState("");
  const [canvasWidth, setCanvasWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(600);
  const [customFields, setCustomFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [exampleOpen, setExampleOpen] = useState(false);
  const [exampleData, setExampleData] = useState({
    eventName: "",
    organizerName: "",
    eventDate: "",
    eventLocation: "",
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const previewWrapperRef = useRef(null);
  const [previewScale, setPreviewScale] = useState(() => {
    const maxWidth = 520;
    const maxHeight = 570;
    return Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight, 1);
  });

  useEffect(() => {
    const node = previewWrapperRef.current;
    if (!node) return;

    const previewWidth = node.clientWidth;
    const previewHeight = node.clientHeight;
    setPreviewScale(Math.min(previewWidth / canvasWidth, previewHeight / canvasHeight, 1));
  }, [canvasWidth, canvasHeight]);

  const storageRaw = useMemo(() => safeJsonParse(localStorage.getItem(getUserStorageKey(STORAGE_KEY)), []), []);
  const storageShape = getStorageShape(storageRaw);
  const allTemplates = useMemo(() => normalizeTemplates(storageRaw), [storageRaw]);
  const existingTemplate = useMemo(
    () => allTemplates.find((item) => String(item.id) === String(templateId)),
    [allTemplates, templateId]
  );

  const isEdit = Boolean(templateId && existingTemplate);
  const selectedField = customFields.find((f) => f.id === selectedFieldId);
  const selectedIndex = customFields.findIndex((f) => f.id === selectedFieldId);

  function resolveFramedFieldText(field, preview) {
    const pd = preview || {};
    switch (field.dataSource) {
      case "eventName":
        if (pd.eventName || pd.event) return pd.eventName || pd.event;
        try {
          const eventsRaw = safeJsonParse(localStorage.getItem(getUserStorageKey("rankify_events")), []);
          const activeId = getActiveEventId();
          const found = (eventsRaw || []).find((ev) => String(ev.id) === String(activeId));
          if (found && found.name) return found.name;
        } catch (e) {
          // ignore
        }
        return "Event Name";
      case "organizerName":
        return pd.organizerName || pd.organizer || "Organizer Name";
      case "eventDate":
        return pd.eventDate || "May 25";
      case "eventLocation":
        return pd.eventLocation || "Event Location";
      case "manual":
      default:
        // check customFields map first, then top-level id key, then field.value/label
        if (pd.customFields && pd.customFields[field.id] !== undefined) return pd.customFields[field.id];
        if (pd[field.id] !== undefined) return pd[field.id];
        return field.value || field.label || `[${field.label || "Custom Field"}]`;
    }
  }

  const normalizedPreview = useMemo(() => {
    const customMap = {};
    (customFields || []).forEach((f) => {
      customMap[f.id] = (exampleData && (exampleData[f.id] ?? (exampleData.customFields && exampleData.customFields[f.id]))) ?? "";
    });
    return {
      eventName: (exampleData && (exampleData.eventName || exampleData.event)) || "",
      organizerName: (exampleData && (exampleData.organizerName || exampleData.organizer)) || "",
      eventDate: (exampleData && exampleData.eventDate) || "",
      eventLocation: (exampleData && exampleData.eventLocation) || "",
      customFields: customMap,
    };
  }, [exampleData, customFields]);
  const dragState = useRef(null);

  useEffect(() => {
    setActiveEventId(getActiveEventId());
    if (isEdit && existingTemplate) {
      setTemplateName(existingTemplate.name || "");
      setFrameImageUrl(getSavedFrameImage(existingTemplate));
      setCanvasWidth(existingTemplate.canvasWidth || 800);
      setCanvasHeight(existingTemplate.canvasHeight || 600);
      setCustomFields(existingTemplate.customFields || []);
      // restore preview/example data when editing
      const pd = existingTemplate.previewData || {};
      setExampleData({
        eventName: pd.eventName || pd.event || "",
        organizerName: pd.organizerName || pd.organizer || "",
        eventDate: pd.eventDate || "",
        eventLocation: pd.eventLocation || "",
        ...pd.customFields,
      });
    } else {
      setTemplateName("New Framed Post Template");
      setFrameImageUrl("");
      setCanvasWidth(800);
      setCanvasHeight(600);
      setCustomFields([]);
    }
    setIsLoaded(true);
  }, [existingTemplate, isEdit]);

  useEffect(() => {
    function syncActiveEvent() {
      setActiveEventId(getActiveEventId());
    }

    window.addEventListener("storage", syncActiveEvent);
    window.addEventListener("rankify-active-event-changed", syncActiveEvent);
    window.addEventListener("rankify-data-changed", syncActiveEvent);
    window.addEventListener("rankify-events-changed", syncActiveEvent);

    return () => {
      window.removeEventListener("storage", syncActiveEvent);
      window.removeEventListener("rankify-active-event-changed", syncActiveEvent);
      window.removeEventListener("rankify-data-changed", syncActiveEvent);
      window.removeEventListener("rankify-events-changed", syncActiveEvent);
    };
  }, []);

  useEffect(() => {
    function onPointerMove(e) {
      if (!dragState.current) return;
      const { id, startX, startY, originalX, originalY } = dragState.current;
      const dx = (e.clientX - startX) / previewScale;
      const dy = (e.clientY - startY) / previewScale;
      const nx = Math.round(originalX + dx);
      const ny = Math.round(originalY + dy);
      updateField(id, { x: nx, y: ny });
    }

    function onPointerUp() {
      dragState.current = null;
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [previewScale, updateField, customFields]);

  useEffect(() => {
    function onKeyDown(e) {
      if (!selectedFieldId) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const f = customFields.find((c) => c.id === selectedFieldId);
        if (f) updateField(selectedFieldId, { y: Number(f.y || 0) - step });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const f = customFields.find((c) => c.id === selectedFieldId);
        if (f) updateField(selectedFieldId, { y: Number(f.y || 0) + step });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const f = customFields.find((c) => c.id === selectedFieldId);
        if (f) updateField(selectedFieldId, { x: Number(f.x || 0) - step });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const f = customFields.find((c) => c.id === selectedFieldId);
        if (f) updateField(selectedFieldId, { x: Number(f.x || 0) + step });
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedFieldId, customFields]);

  function startDrag(e, field) {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFieldId(field.id);
    dragState.current = {
      id: field.id,
      startX: e.clientX,
      startY: e.clientY,
      originalX: Number(field.x || 0),
      originalY: Number(field.y || 0),
    };
  }

  function addCustomField() {
    const newField = {
      id: makeId("field"),
      label: `Custom Field ${customFields.length + 1}`,
      x: 100,
      y: 150 + customFields.length * 50,
      width: undefined,
      fontFamily: "Inter",
      fontSize: 24,
      fontWeight: "400",
      color: "#000000",
      textAlign: "left",
      lineHeight: 1.2,
      value: `[${`Custom Field ${customFields.length + 1}`}]`,
      dataSource: "manual",
    };
    setCustomFields([...customFields, newField]);
    setSelectedFieldId(newField.id);
    setExampleData((prev) => ({ ...(prev || {}), [newField.id]: newField.value }));
  }

  function addImageElement() {
    const imageCount = (customFields || []).filter((f) => f.type === "image").length;
    const newImage = {
      id: makeId("image"),
      type: "image",
      label: `Image ${imageCount + 1}`,
      src: "",
      x: 100,
      y: 150 + (customFields.length + 1) * 20,
      width: 200,
      height: 160,
      opacity: 1,
      borderRadius: 0,
      objectFit: "cover",
    };
    setCustomFields([...customFields, newImage]);
    setSelectedFieldId(newImage.id);
  }

  function updateField(fieldId, patch) {
    setCustomFields(customFields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)));
  }

  function deleteField(fieldId) {
    setCustomFields(customFields.filter((f) => f.id !== fieldId));
    setExampleData((prev) => {
      const copy = { ...(prev || {}) };
      if (copy && Object.prototype.hasOwnProperty.call(copy, fieldId)) {
        delete copy[fieldId];
      }
      return copy;
    });
    if (selectedFieldId === fieldId) setSelectedFieldId("");
  }

  function duplicateField(field) {
    if (field.type === "image") {
      const copy = {
        ...field,
        id: makeId("image"),
        label: `${field.label || "Image"} Copy`,
        x: Number(field.x || 0) + 20,
        y: Number(field.y || 0) + 20,
      };
      setCustomFields((current) => [...current, copy]);
      setSelectedFieldId(copy.id);
      return;
    }

    const copy = {
      ...field,
      id: makeId("field"),
      label: `${field.label || "Custom Field"} Copy`,
      x: Number(field.x || 0) + 20,
      y: Number(field.y || 0) + 20,
      dataSource: field.dataSource || "manual",
    };
    setCustomFields((current) => [...current, copy]);
    setSelectedFieldId(copy.id);
    setExampleData((prev) => ({ ...(prev || {}), [copy.id]: prev?.[field.id] || "" }));
  }

  function handleSave() {
    if (!templateName.trim()) {
      alert("Template name is required.");
      return;
    }

    const activeEvent = getActiveEventId();
    const all = loadAllTemplates();
    const nextTemplate = {
      id: isEdit && existingTemplate ? existingTemplate.id : makeId("framed_post_template"),
      name: templateName.trim(),
      eventId: activeEvent,
      frameImage: frameImageUrl,
      frameImageUrl: frameImageUrl,
      frameSrc: frameImageUrl,
      canvasWidth,
      canvasHeight,
      customFields,
      previewData: normalizedPreview,
      createdAt: isEdit && existingTemplate ? existingTemplate.createdAt || today() : today(),
      updatedAt: today(),
    };

    const updated = isEdit
      ? all.map((item) => (String(item.id) === String(nextTemplate.id) ? nextTemplate : item))
      : [...all, nextTemplate];

    if (!saveTemplates(updated, storageShape)) {
      return;
    }
    window.dispatchEvent(new Event("rankify-data-changed"));
    navigate("/dashboard/framed-posts");
  }

  if (!isLoaded) {
    return null;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] pb-28 font-[Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe_UI,sans-serif] [&_input]:box-border [&_input]:max-w-full [&_label]:min-w-0 [&_select]:box-border [&_select]:max-w-full">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-[#F8FAFC] px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/dashboard/framed-posts")}
              className="rounded-md px-2 py-1 text-2xl text-gray-600 hover:bg-gray-100"
            >
              <ArrowLeft size={22} strokeWidth={1.9} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Framed Post Templates</p>
              <h1 className="truncate text-2xl font-bold">
                {isEdit ? `Edit — ${templateName}` : "Create framed post template"}
              </h1>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#26752C] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
          >
            <Save size={16} />
            {isEdit ? "Save changes" : "Create template"}
          </button>
        </div>
      </header>

      <main className="grid w-full max-w-full grid-cols-[260px_minmax(0,1fr)_360px] gap-4 overflow-x-hidden p-4 max-[1180px]:grid-cols-1">
        <aside className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-600">Layers</h2>
          
          <div className="space-y-1">
            {customFields.map((field) => (
              <div key={field.id} className="mb-1">
                <div
                  onClick={() => setSelectedFieldId(field.id)}
                  className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm cursor-pointer ${
                    selectedFieldId === field.id
                      ? "bg-[#26752C] text-white font-medium"
                      : "hover:bg-gray-50 text-gray-700"
                  }`}
                >
                  <span className="shrink-0">{field.type === "image" ? "🖼" : "T"}</span>
                  <span className="min-w-0 flex-1 truncate">{field.label}</span>

                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateField(field);
                      }}
                      title="Duplicate"
                      className={`flex h-8 w-8 items-center justify-center rounded-md ${selectedFieldId === field.id ? 'text-white/90 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <Copy size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(field.type === "image" ? 'Delete this image?' : 'Delete this custom field?')) deleteField(field.id);
                      }}
                      title="Delete"
                      className={`flex h-8 w-8 items-center justify-center rounded-md ${selectedFieldId === field.id ? 'text-white/90 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-200 pt-4">
            <div className="mb-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="font-semibold">Frame Image</div>
              <div className="text-xs text-gray-500">Overlay saved with the template</div>
            </div>
            <button
              type="button"
              onClick={addCustomField}
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700"
            >
              <PlusCircle className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
              Add custom text field
            </button>
            <button
              type="button"
              onClick={addImageElement}
              className="mt-2 block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 text-gray-700"
            >
              <Image className="mr-2 inline-block align-[-2px]" size={15} strokeWidth={1.9} aria-hidden="true" />
              Add image element
            </button>
          </div>

          <p className="mt-6 text-xs text-gray-400">↑↓ Arrow keys nudge selected element (Shift = 10 px)</p>
        </aside>

        <section className="min-w-0 max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="whitespace-nowrap text-2xl font-bold">Live Preview</h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-600">Canvas: {canvasWidth}×{canvasHeight}px</span>
              <span className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm">Scaled to {Math.round(previewScale * 100)}%</span>
            </div>
          </div>

          <div className="max-h-[520px] w-full max-w-full overflow-auto rounded-lg bg-white p-4">
            <div className="flex w-max min-w-full justify-center" ref={previewWrapperRef}>
              <div
                className="canvas-outer"
                style={{
                  width: canvasWidth * previewScale,
                  height: canvasHeight * previewScale,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: canvasWidth,
                    height: canvasHeight,
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: canvasWidth,
                      height: canvasHeight,
                      position: "relative",
                    }}
                    className="border border-gray-200 rounded-lg bg-gray-100"
                  >
                    {frameImageUrl ? (
                      <img
                        src={frameImageUrl}
                        alt="frame"
                        className="absolute inset-0 w-full h-full rounded-lg"
                        style={{ objectFit: "contain", opacity: 1, display: "block" }}
                        draggable={false}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        <span>Frame Preview</span>
                      </div>
                    )}
                    {/* render custom fields and images */}
                    {customFields.map((field, idx) => {
                      const scale = 1;
                      const left = Number(field.x) || 0;
                      const top = Number(field.y) || 0;
                      const zIndex = 20 + idx;

                      if (field.type === "image") {
                        const width = Number(field.width) || 200;
                        const height = Number(field.height) || 160;
                        const opacity = field.opacity === undefined ? 1 : Number(field.opacity);
                        const borderRadius = Number(field.borderRadius) || 0;
                        const objectFit = field.objectFit || "cover";

                        return (
                          <div
                            key={field.id}
                            onPointerDown={(e) => startDrag(e, field)}
                            style={{
                              position: "absolute",
                              left,
                              top,
                              width,
                              height,
                              zIndex,
                              boxSizing: "border-box",
                              cursor: "pointer",
                              padding: 0,
                            }}
                            className={selectedFieldId === field.id ? "rounded-sm ring-2 ring-offset-1 ring-[#26752C] bg-white/10" : ""}
                          >
                            {field.src ? (
                              <img
                                src={field.src}
                                alt={field.label}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit,
                                  opacity,
                                  borderRadius: borderRadius,
                                  display: "block",
                                }}
                                draggable={false}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  background: "#f3f4f6",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#9ca3af",
                                  borderRadius: borderRadius,
                                  border: "1px dashed #e5e7eb",
                                }}
                              >
                                Image
                              </div>
                            )}
                          </div>
                        );
                      }

                      const width = field.width ? Number(field.width) * scale : undefined;
                      const fontSize = (Number(field.fontSize) || 16) * scale;
                      const fontFamily = field.fontFamily || "Inter";
                      const fontWeight = field.fontWeight || "400";
                      const color = field.color || "#000";
                      const textAlign = field.textAlign || "left";
                      const lineHeight = field.lineHeight || 1.2;

                      const displayText = String(resolveFramedFieldText(field, normalizedPreview) || "");

                      return (
                        <div
                          key={field.id}
                          onPointerDown={(e) => startDrag(e, field)}
                          style={{
                            position: "absolute",
                            left,
                            top,
                            width: width,
                            fontSize,
                            fontFamily,
                            fontWeight,
                            color,
                            textAlign,
                            lineHeight,
                            whiteSpace: "normal",
                            overflowWrap: "break-word",
                            zIndex,
                            padding: 2,
                            boxSizing: "border-box",
                            cursor: "pointer",
                          }}
                          className={selectedFieldId === field.id ? "rounded-sm ring-2 ring-offset-1 ring-[#26752C] bg-white/30" : ""}
                        >
                          <div style={{ pointerEvents: "none" }}>{displayText}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-6 rounded-lg bg-white/70 p-4">
            <button
              type="button"
              onClick={() => setExampleOpen(!exampleOpen)}
              className="flex w-full items-center justify-between text-left text-lg font-semibold"
            >
              Example Framed Post Data for Preview <span>{exampleOpen ? <ChevronUp size={18} strokeWidth={1.9} aria-hidden="true" /> : <ChevronDown size={18} strokeWidth={1.9} aria-hidden="true" />}</span>
            </button>
            {exampleOpen && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-gray-600">Adjust these values to see how your template will look with real data.</p>
                <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">Event Name</span>
                    <input
                      type="text"
                        value={exampleData.eventName || ""}
                        onChange={(e) => setExampleData({ ...exampleData, eventName: e.target.value })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-gray-700">Organizer</span>
                    <input
                      type="text"
                        value={exampleData.organizerName || exampleData.organizer || ""}
                        onChange={(e) => setExampleData({ ...exampleData, organizerName: e.target.value, organizer: e.target.value })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-gray-700">Event Date</span>
                      <input
                        type="text"
                        value={exampleData.eventDate || ""}
                        onChange={(e) => setExampleData({ ...exampleData, eventDate: e.target.value })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium text-gray-700">Event Location</span>
                      <input
                        type="text"
                        value={exampleData.eventLocation || ""}
                        onChange={(e) => setExampleData({ ...exampleData, eventLocation: e.target.value })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Custom Fields</p>
                  {customFields.map((field) => (
                    <div key={field.id}>
                      <label className="flex flex-col gap-1 text-sm">
                        <span className="font-medium text-gray-700">{field.label}</span>
                        {field.dataSource === "manual" || !field.dataSource ? (
                          <input
                            type="text"
                            value={exampleData[field.id] || ""}
                            onChange={(e) => setExampleData({ ...exampleData, [field.id]: e.target.value })}
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                          />
                        ) : (
                          <div className="rounded-md border border-gray-100 bg-gray-50 px-2 py-2 text-sm text-gray-600">
                            Using <strong>{field.dataSource}</strong>: {resolveFramedFieldText(field, normalizedPreview)}
                          </div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </section>

        <aside className="min-w-0 overflow-x-hidden rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-8 text-2xl font-bold">Template Configuration</h2>

          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-semibold">Template Name</span>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-1 block text-sm font-semibold">Frame Image (Overlay)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_IMAGE_SIZE) {
                  alert("Image is too large. Please compress the image below 1MB and upload again.");
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = reader.result;
                  if (typeof dataUrl !== "string") return;
                  const img = new Image();
                  img.onload = () => {
                    setFrameImageUrl(dataUrl);
                    setCanvasWidth(img.naturalWidth || 800);
                    setCanvasHeight(img.naturalHeight || 600);
                  };
                  img.src = dataUrl;
                };
                reader.readAsDataURL(file);
              }}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            />
          </label>

          {frameImageUrl && (
            <button
              type="button"
              onClick={() => setFrameImageUrl("")}
              className="mb-5 inline-flex h-8 items-center rounded-md bg-red-600 px-3 text-xs font-semibold text-white hover:bg-red-700"
            >
              Clear Image
            </button>
          )}

          <div className="mb-6">
            <h3 className="mb-3 text-sm font-bold">Canvas Dimensions</h3>
            <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-gray-700">Width (px)</span>
                <input
                  type="number"
                  value={canvasWidth}
                  onChange={(e) => setCanvasWidth(Number(e.target.value) || 1)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-gray-700">Height (px)</span>
                <input
                  type="number"
                  value={canvasHeight}
                  onChange={(e) => setCanvasHeight(Number(e.target.value) || 1)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">Canvas dimensions remain editable. Adjust width/height manually as needed.</p>
          </div>

          {selectedField && (
            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{selectedField.type === 'image' ? `Image ${selectedIndex + 1} Settings` : `Custom Field ${selectedIndex + 1} Settings`}</h3>
                <button
                  type="button"
                  onClick={() => deleteField(selectedField.id)}
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs text-white hover:bg-red-700"
                >
                  <X size={16} strokeWidth={2} aria-hidden="true" />
                </button>
              </div>

              {selectedField.type === 'image' ? (
                <div className="space-y-3 text-sm">
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-gray-700">Image Label</span>
                    <input
                      type="text"
                      value={selectedField.label}
                      onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-gray-700">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > MAX_IMAGE_SIZE) {
                          alert("Image is too large. Please compress the image below 1MB and upload again.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = () => updateField(selectedField.id, { src: reader.result });
                        reader.readAsDataURL(file);
                      }}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>

                  <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">X</span>
                      <input
                        type="number"
                        value={selectedField.x}
                        onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Y</span>
                      <input
                        type="number"
                        value={selectedField.y}
                        onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Width (px)</span>
                      <input
                        type="number"
                        value={selectedField.width}
                        onChange={(e) => updateField(selectedField.id, { width: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Height (px)</span>
                      <input
                        type="number"
                        value={selectedField.height}
                        onChange={(e) => updateField(selectedField.id, { height: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Opacity</span>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="1"
                        value={selectedField.opacity}
                        onChange={(e) => updateField(selectedField.id, { opacity: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Border Radius (px)</span>
                      <input
                        type="number"
                        value={selectedField.borderRadius}
                        onChange={(e) => updateField(selectedField.id, { borderRadius: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-gray-700">Object Fit</span>
                    <select
                      value={selectedField.objectFit || "cover"}
                      onChange={(e) => updateField(selectedField.id, { objectFit: e.target.value })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="cover">cover</option>
                      <option value="contain">contain</option>
                      <option value="fill">fill</option>
                    </select>
                  </label>

                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-gray-700">Data Source</span>
                    <select
                      value={selectedField.dataSource || "manual"}
                      onChange={(e) => {
                        const next = e.target.value;
                        updateField(selectedField.id, { dataSource: next });
                        setExampleData((prev) => {
                          const nextObj = { ...(prev || {}) };
                          if (next === "manual") {
                            nextObj[selectedField.id] = nextObj[selectedField.id] ?? selectedField.value ?? selectedField.label;
                          }
                          return nextObj;
                        });
                      }}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    >
                      <option value="manual">Manual Input</option>
                      <option value="eventName">Event Name</option>
                      <option value="organizerName">Organizer Name</option>
                      <option value="eventDate">Event Date</option>
                      <option value="eventLocation">Event Location</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-gray-700">Field Label</span>
                    <input
                      type="text"
                      value={selectedField.label}
                      onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>

                  <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">X</span>
                      <input
                        type="number"
                        value={selectedField.x}
                        onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Y</span>
                      <input
                        type="number"
                        value={selectedField.y}
                        onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Width (px)</span>
                      <input
                        type="number"
                        placeholder="e.g., 200"
                        value={selectedField.width || ""}
                        onChange={(e) => updateField(selectedField.id, { width: e.target.value === "" ? undefined : Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Font Size (px)</span>
                      <input
                        type="number"
                        value={selectedField.fontSize}
                        onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>

                  <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Font Family</span>
                      <FontFamilySelect
                        value={selectedField.fontFamily}
                        onChange={(val) => updateField(selectedField.id, { fontFamily: val })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Font Weight</span>
                      <select
                        value={selectedField.fontWeight || "400"}
                        onChange={(e) => updateField(selectedField.id, { fontWeight: e.target.value })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        <option value="normal">normal</option>
                        <option value="100">100</option>
                        <option value="300">300</option>
                        <option value="400">400</option>
                        <option value="500">500</option>
                        <option value="600">600</option>
                        <option value="700">700</option>
                        <option value="900">900</option>
                        <option value="bold">bold</option>
                      </select>
                    </label>
                  </div>

                  <div className="grid w-full max-w-full grid-cols-1 gap-3 min-[900px]:grid-cols-[repeat(2,minmax(0,1fr))]">
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Color</span>
                      <input
                        type="color"
                        value={selectedField.color}
                        onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                        className="h-8 rounded-md border border-gray-300 px-1"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-medium text-gray-700">Text Align</span>
                      <select
                        value={selectedField.textAlign || "left"}
                        onChange={(e) => updateField(selectedField.id, { textAlign: e.target.value })}
                        className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                  </div>

                  <label className="flex flex-col gap-1">
                    <span className="font-medium text-gray-700">Line Height</span>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedField.lineHeight || 1.2}
                      onChange={(e) => updateField(selectedField.id, { lineHeight: Number(e.target.value) })}
                      className="rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>

                  <div className="text-xs text-gray-500">Preview value: {resolveFramedFieldText(selectedField, normalizedPreview)}</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={handleSave}
              className="h-12 w-full rounded-md bg-[#26752C] text-lg font-bold text-white hover:bg-[#1f6425]"
            >
              {isEdit ? "Save Template Changes" : "Create New Template"}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
