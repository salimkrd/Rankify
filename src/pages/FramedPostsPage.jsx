import React, { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";

const EVENTS_KEY = "rankify_events";
const ACTIVE_EVENT_KEY = "rankify_active_event_id";
const TEMPLATE_KEY = "rankify_framed_post_templates";
const STORAGE_KEY = "rankify_framed_posts";

const STATUS_OPTIONS = ["All Status", "Published", "Draft", "Archived"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

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

function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value || "");
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function normalizeStored(raw) {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    return Object.values(raw).flat();
  }
  return [];
}

function getStoredEvents() {
  const stored = safeJsonParse(localStorage.getItem(EVENTS_KEY), []);
  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }
  return fallbackEvents;
}

function getValidActiveEventId(events) {
  const storedId = localStorage.getItem(ACTIVE_EVENT_KEY);
  const hasStored = events.some((event) => String(event.id) === String(storedId));
  if (hasStored) return storedId;
  const next = events[0]?.id || "";
  if (next) {
    localStorage.setItem(ACTIVE_EVENT_KEY, next);
  }
  return next;
}

function getActiveEvent(activeEventId) {
  const events = getStoredEvents();
  return (
    events.find((event) => String(event.id) === String(activeEventId)) ||
    events[0] ||
    { id: "", name: "Active Event" }
  );
}

function getEventTemplates(activeEventId) {
  const raw = safeJsonParse(localStorage.getItem(TEMPLATE_KEY), []);
  const templates = normalizeStored(raw);
  return templates.filter((template) => String(template.eventId) === String(activeEventId));
}

function getEventPosts(activeEventId) {
  const raw = safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
  if (Array.isArray(raw)) {
    return raw.filter((post) => String(post.eventId) === String(activeEventId));
  }
  if (raw && typeof raw === "object") {
    return Array.isArray(raw[activeEventId]) ? raw[activeEventId] : [];
  }
  return [];
}

function getRawPosts() {
  return safeJsonParse(localStorage.getItem(STORAGE_KEY), []);
}

function getPostsStorageShape(raw) {
  if (Array.isArray(raw)) return "array";
  if (raw && typeof raw === "object") return "object";
  return "array";
}

function persistPosts(activeEventId, posts) {
  const raw = getRawPosts();
  const shape = getPostsStorageShape(raw);

  if (shape === "object") {
    const next = { ...(raw || {}) };
    if (posts.length) next[activeEventId] = posts;
    else delete next[activeEventId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("rankify-data-changed"));
    return;
  }

  const existing = Array.isArray(raw) ? raw : [];
  const filtered = existing.filter((post) => String(post.eventId) !== String(activeEventId));
  const merged = [...filtered, ...posts.map((post) => ({ ...post, eventId: activeEventId }))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  window.dispatchEvent(new Event("rankify-data-changed"));
}

function makeId(prefix = "post") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function resolveFramedFieldText(field, fieldValues, activeEvent) {
  const value = fieldValues?.[field.id];
  const event = activeEvent || {};
  switch (field.dataSource) {
    case "eventName":
      return event.name || value || "Event Name";
    case "organizerName":
      return event.organizer || value || "Organizer Name";
    case "eventDate":
      return event.date || value || "May 25";
    case "eventLocation":
      return event.location || value || "Event Location";
    case "manual":
    default:
      return value ?? field.value ?? field.label ?? "Custom Field";
  }
}

function getTemplateById(templates, id) {
  return templates.find((template) => String(template.id) === String(id));
}

function initialFieldValues(template) {
  const values = {};
  (template?.customFields || []).forEach((field) => {
    if (field.dataSource === "manual") {
      values[field.id] = field.value || "";
    }
  });
  return values;
}

function buildFormState(template) {
  return {
    name: "New Framed Post",
    templateId: template?.id || "",
    templateName: template?.name || "",
    contentImageSrc: "",
    zoom: 1,
    rotation: 0,
    aspectRatio: 1.33,
    status: "Published",
    fieldValues: initialFieldValues(template),
  };
}

function getTemplatePreviewSize(template) {
  return {
    width: Number(template?.canvasWidth || template?.width || 800),
    height: Number(template?.canvasHeight || template?.height || 600),
  };
}

export default function FramedPostsPage() {
  const [events, setEvents] = useState(getStoredEvents());
  const [activeEventId, setActiveEventId] = useState(getValidActiveEventId(events));
  const [activeEvent, setActiveEvent] = useState(getActiveEvent(activeEventId));
  const [templates, setTemplates] = useState(getEventTemplates(activeEventId));
  const [posts, setPosts] = useState(getEventPosts(activeEventId));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);
  const [formState, setFormState] = useState(buildFormState(templates[0]));
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = useRef(null);

  const templateOptions = templates;

  useEffect(() => {
    function sync() {
      const storedEvents = getStoredEvents();
      const validActiveId = getValidActiveEventId(storedEvents);
      setEvents(storedEvents);
      setActiveEventId(validActiveId);
      setActiveEvent(getActiveEvent(validActiveId));
      setTemplates(getEventTemplates(validActiveId));
      setPosts(getEventPosts(validActiveId));
    }

    sync();

    window.addEventListener("storage", sync);
    window.addEventListener("rankify-active-event-changed", sync);
    window.addEventListener("rankify-data-changed", sync);
    window.addEventListener("rankify-events-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("rankify-active-event-changed", sync);
      window.removeEventListener("rankify-data-changed", sync);
      window.removeEventListener("rankify-events-changed", sync);
    };
  }, []);

  useEffect(() => {
    setActiveEvent(getActiveEvent(activeEventId));
  }, [activeEventId]);

  const filteredPosts = useMemo(() => {
    let items = [...posts];
    if (searchTerm.trim()) {
      const lowered = searchTerm.toLowerCase();
      items = items.filter(
        (item) =>
          String(item.name).toLowerCase().includes(lowered) ||
          String(item.templateName || "").toLowerCase().includes(lowered)
      );
    }
    if (statusFilter !== "All Status") {
      items = items.filter((item) => String(item.status || "Published") === statusFilter);
    }
    items.sort((a, b) => {
      const left = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const right = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return sortOrder === "oldest" ? left - right : right - left;
    });
    return items;
  }, [posts, searchTerm, statusFilter, sortOrder]);

  const selectedTemplate = useMemo(
    () => getTemplateById(templates, formState.templateId),
    [templates, formState.templateId]
  );

  const currentViewTemplate = useMemo(
    () => getTemplateById(templates, viewingPost?.templateId),
    [templates, viewingPost]
  );

  function resetForm(templateId) {
    const template = getTemplateById(templates, templateId) || templates[0];
    setFormState(buildFormState(template));
  }

  function openCreateModal() {
    const firstTemplate = templates[0];
    setEditingPost(null);
    setFormState(buildFormState(firstTemplate));
    setIsFormOpen(true);
  }

  function openEditModal(post) {
    const template = getTemplateById(templates, post.templateId) || templates[0];
    setEditingPost(post);
    setFormState({
      name: post.name || "New Framed Post",
      templateId: post.templateId || template?.id || "",
      templateName: post.templateName || template?.name || "",
      contentImageSrc: post.contentImageSrc || "",
      zoom: post.zoom || 1,
      rotation: post.rotation || 0,
      aspectRatio: post.aspectRatio || 1.33,
      status: post.status || "Published",
      fieldValues: post.fieldValues || initialFieldValues(template),
    });
    setEditingPost(post);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingPost(null);
  }

  function openViewModal(post) {
    setViewingPost(post);
    setIsViewing(true);
  }

  function closeViewModal() {
    setIsViewing(false);
    setViewingPost(null);
  }

  function handleTemplateChange(event) {
    const templateId = event.target.value;
    const template = getTemplateById(templates, templateId);
    setFormState((prev) => ({
      ...prev,
      templateId: template?.id || "",
      templateName: template?.name || "",
      fieldValues: template ? initialFieldValues(template) : {},
    }));
  }

  function handleFormFieldChange(key, value) {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }

  function handleCustomFieldChange(fieldId, value) {
    setFormState((prev) => ({
      ...prev,
      fieldValues: {
        ...prev.fieldValues,
        [fieldId]: value,
      },
    }));
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleFormFieldChange("contentImageSrc", reader.result || "");
    };
    reader.readAsDataURL(file);
  }

  function savePost() {
    if (!formState.name.trim()) {
      alert("Result name is required.");
      return;
    }
    if (!formState.templateId) {
      alert("Please select a frame template.");
      return;
    }

    const now = new Date().toISOString();
    const nextPost = {
      id: editingPost?.id || makeId("framed_post"),
      eventId: activeEventId,
      name: formState.name.trim(),
      templateId: formState.templateId,
      templateName: formState.templateName,
      contentImageSrc: formState.contentImageSrc,
      zoom: formState.zoom,
      rotation: formState.rotation,
      aspectRatio: formState.aspectRatio,
      status: formState.status,
      fieldValues: formState.fieldValues,
      createdAt: editingPost?.createdAt || now,
      updatedAt: now,
    };

    const nextPosts = editingPost
      ? posts.map((post) => (String(post.id) === String(editingPost.id) ? nextPost : post))
      : [nextPost, ...posts];

    persistPosts(activeEventId, nextPosts);
    setPosts(nextPosts);
    closeForm();
  }

  function deletePost(postId) {
    const confirmed = window.confirm("Are you sure you want to delete this framed post?");
    if (!confirmed) return;
    const nextPosts = posts.filter((post) => String(post.id) !== String(postId));
    persistPosts(activeEventId, nextPosts);
    setPosts(nextPosts);
    if (viewingPost?.id === postId) closeViewModal();
  }

  async function handleDownload() {
    if (!exportRef.current || !viewingPost) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `${viewingPost.name || "framed-post"}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
      alert("Unable to download the framed post. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function renderPreview(template, contentImageSrc, fieldValues, zoom, rotation, aspectRatio, scale = 0.65) {
    if (!template) {
      return (
        <div className="h-[320px] rounded-3xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
          Select a frame template to preview your framed post here.
        </div>
      );
    }

    const { width, height } = getTemplatePreviewSize(template);
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);
    const frameSrc = template.frameImageUrl;

    return (
      <div
        style={{ width: scaledWidth, height: scaledHeight }}
        className="relative overflow-hidden rounded-[24px] border border-gray-200 bg-[#f8f2ff] shadow-sm"
      >
        <div className="absolute inset-0 overflow-hidden bg-[#f8f2ff]">
          {contentImageSrc ? (
            <img
              src={contentImageSrc}
              alt="Content"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
              className="absolute left-1/2 top-1/2 max-h-none max-w-none -translate-x-1/2 -translate-y-1/2"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <div className="h-16 w-16 rounded-full bg-[#e9d6ff]" />
              <div>Add a content image to preview inside the frame.</div>
            </div>
          )}
        </div>

        {template.customFields?.map((field, index) => {
          const left = (Number(field.x) || 0) * scale;
          const top = (Number(field.y) || 0) * scale;
          const widthValue = field.width ? Number(field.width) * scale : undefined;
          const fontSize = (Number(field.fontSize) || 24) * scale;
          const fontFamily = field.fontFamily || "Inter";
          const fontWeight = field.fontWeight || "400";
          const color = field.color || "#000";
          const textAlign = field.textAlign || "left";
          const lineHeight = field.lineHeight || 1.2;
          const displayText = resolveFramedFieldText(field, fieldValues, activeEvent);

          return (
            <div
              key={field.id || `${field.label}-${index}`}
              className="absolute break-words"
              style={{
                left,
                top,
                width: widthValue,
                fontSize,
                fontFamily,
                fontWeight,
                color,
                textAlign,
                lineHeight,
                whiteSpace: "pre-wrap",
                zIndex: 30,
                padding: 2,
                boxSizing: "border-box",
              }}
            >
              {displayText}
            </div>
          );
        })}

        {frameSrc ? (
          <img
            src={frameSrc}
            alt={template.name}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ zIndex: 40 }}
          />
        ) : (
          <div className="absolute inset-0 border border-dashed border-gray-300 bg-white/70" style={{ zIndex: 40 }} />
        )}
      </div>
    );
  }

  function renderExportPreview(template, post) {
    if (!template || !post) return null;
    const fieldValues = post.fieldValues || {};
    const { width, height } = getTemplatePreviewSize(template);

    return (
      <div
        ref={exportRef}
        className="hidden"
        style={{
          position: "fixed",
          left: -9999,
          top: 0,
          width,
          height,
          opacity: 0,
          pointerEvents: "none",
          overflow: "hidden",
          background: "white",
        }}
      >
        <div style={{ width, height, position: "relative", overflow: "hidden", background: "#f8f2ff" }}>
          {post.contentImageSrc ? (
            <img
              src={post.contentImageSrc}
              alt="Content"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${post.zoom || 1}) rotate(${post.rotation || 0}deg)`,
                transformOrigin: "center center",
                position: "absolute",
                left: "50%",
                top: "50%",
                translate: "-50% -50%",
              }}
            />
          ) : null}

          {(template.customFields || []).map((field, index) => {
            const left = Number(field.x || 0);
            const top = Number(field.y || 0);
            const widthValue = field.width ? Number(field.width) : undefined;
            const fontSize = Number(field.fontSize || 24);
            const fontFamily = field.fontFamily || "Inter";
            const fontWeight = field.fontWeight || "400";
            const color = field.color || "#000";
            const textAlign = field.textAlign || "left";
            const lineHeight = field.lineHeight || 1.2;
            const displayText = resolveFramedFieldText(field, fieldValues, activeEvent);

            return (
              <div
                key={field.id || `${field.label}-${index}`}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: widthValue,
                  fontSize,
                  fontFamily,
                  fontWeight,
                  color,
                  textAlign,
                  lineHeight,
                  whiteSpace: "pre-wrap",
                  zIndex: 30,
                  padding: 2,
                  boxSizing: "border-box",
                }}
              >
                {displayText}
              </div>
            );
          })}

          {template.frameImageUrl ? (
            <img
              src={template.frameImageUrl}
              alt={template.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 40 }}
            />
          ) : null}
        </div>
      </div>
    );
  }

  const activeEventName = activeEvent?.name || "Active Event";
  const hasPosts = filteredPosts.length > 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0D1B2A]">
      <div className="mx-auto max-w-[1360px] px-6 py-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Framed Posts</h1>
            <p className="mt-2 text-sm text-gray-600">
              View, create, edit, and generate framed posts for event: {activeEventName}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex h-12 items-center justify-center rounded-md bg-[#26752C] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1f6425]"
          >
            + Create New Framed Post
          </button>
        </div>

        <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr_0.8fr]">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Search your framed posts...</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                placeholder="Search your framed posts..."
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">All Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Sort by Date</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {hasPosts ? (
          <div className="grid gap-6 xl:grid-cols-2">
            {filteredPosts.map((post) => {
              const template = getTemplateById(templates, post.templateId);
              return (
                <div key={post.id} className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm">
                  <div className="rounded-t-[28px] bg-gradient-to-br from-[#f4e5ff] via-[#f7dcff] to-[#fef7ff] px-6 py-8 text-center">
                    <div className="mx-auto mb-3 flex h-24 w-full max-w-[520px] items-center justify-center rounded-[24px] bg-white/80 px-4 text-center text-lg font-semibold text-[#5b2ee1]">
                      <div>
                        <div className="text-xl font-semibold text-[#4f2593]">{post.name}</div>
                        <div className="mt-1 text-sm text-[#7d62c9]">{post.templateName || "No template selected"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-4">
                    <p className="text-sm text-gray-500">Created: {formatDate(post.createdAt)}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openViewModal(post)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50"
                      >
                        👁 View Framed Post
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(post)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50"
                      >
                        ✎ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex min-h-[52vh] items-center justify-center rounded-[32px] border border-dashed border-gray-200 bg-white p-10 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#EAF5EA] text-2xl text-[#26752C]">
                +
              </div>
              <h2 className="text-2xl font-semibold text-[#0D1B2A]">No Framed Posts Yet</h2>
              <p className="mt-2 text-sm text-gray-500">
                You haven't created any framed posts yet. Get started by creating your first one!
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-6 inline-flex items-center justify-center rounded-md bg-[#26752C] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#1f6425]"
              >
                Create Your First Framed Post
              </button>
            </div>
          </div>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-white p-6 shadow-2xl md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {editingPost ? "Edit Framed Post Result" : "Create New Framed Post Result"}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {editingPost
                    ? "Update your framed post details and preview the result."
                    : "Select a template, upload your image, and preview your framed post."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="rounded-full bg-gray-100 px-3 py-2 text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Result Name</span>
                  <input
                    type="text"
                    value={formState.name}
                    onChange={(e) => handleFormFieldChange("name", e.target.value)}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Frame Template</span>
                  <select
                    value={formState.templateId}
                    onChange={handleTemplateChange}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                  >
                    <option value="">Select a frame template</option>
                    {templateOptions.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name || "Untitled Template"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Content Image (to be placed inside frame)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none"
                  />
                </label>

                {!selectedTemplate ? (
                  <div className="rounded-3xl border border-dashed border-gray-300 bg-[#f9fafb] p-4 text-sm text-gray-600">
                    <div className="font-semibold text-gray-900">Select a Template</div>
                    <div>Please select a Frame Template to see its custom fields and preview.</div>
                  </div>
                ) : (
                  <div className="space-y-5 rounded-[28px] border border-gray-200 bg-[#faf7ff] p-5">
                    <h3 className="text-lg font-semibold text-[#2d1867]">Template Custom Fields</h3>
                    {(selectedTemplate.customFields || []).length === 0 ? (
                      <p className="text-sm text-gray-600">This template has no custom text fields.</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedTemplate.customFields.map((field) => (
                          <div key={field.id} className="rounded-2xl border border-gray-200 bg-white p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <div>
                                <p className="font-semibold text-gray-900">{field.label}</p>
                                <p className="text-xs text-gray-500">Data Source: {field.dataSource || "manual"}</p>
                              </div>
                              {field.dataSource !== "manual" && (
                                <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">
                                  {field.dataSource}
                                </span>
                              )}
                            </div>
                            {field.dataSource === "manual" ? (
                              <input
                                type="text"
                                value={formState.fieldValues[field.id] || ""}
                                onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                                placeholder={`Enter ${field.label}`}
                              />
                            ) : (
                              <div className="rounded-xl bg-[#f3f4f6] p-4 text-sm text-gray-600">
                                {resolveFramedFieldText(field, formState.fieldValues, activeEvent)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Zoom</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.05"
                          value={formState.zoom}
                          onChange={(e) => handleFormFieldChange("zoom", Number(e.target.value))}
                          className="mt-2 w-full"
                        />
                        <div className="text-sm text-gray-500">{formState.zoom.toFixed(2)}x</div>
                      </label>
                      <label className="block">
                        <span className="text-sm font-medium text-gray-700">Rotation</span>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="1"
                          value={formState.rotation}
                          onChange={(e) => handleFormFieldChange("rotation", Number(e.target.value))}
                          className="mt-2 w-full"
                        />
                        <div className="text-sm text-gray-500">{formState.rotation}°</div>
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-sm font-medium text-gray-700">Aspect Ratio</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.5"
                        max="3"
                        value={formState.aspectRatio}
                        onChange={(e) => handleFormFieldChange("aspectRatio", Number(e.target.value))}
                        className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#26752C] focus:ring-2 focus:ring-green-100"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setFormState((prev) => ({ ...prev, zoom: 1, rotation: 0, aspectRatio: 1.33 }))}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50"
                    >
                      Reset Crop/Zoom
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0D1B2A]">Live Preview</h3>
                      <p className="text-sm text-gray-500">Preview the framed post render before saving.</p>
                    </div>
                    <div className="rounded-full bg-[#eef9f1] px-3 py-1 text-xs font-semibold text-[#167f42]">
                      View only
                    </div>
                  </div>
                  <div className="flex justify-center">
                    {renderPreview(selectedTemplate, formState.contentImageSrc, formState.fieldValues, formState.zoom, formState.rotation, formState.aspectRatio, 0.65)}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={savePost}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-[#26752C] px-5 text-sm font-semibold text-white hover:bg-[#1f6425]"
                  >
                    {editingPost ? "Update Framed Post" : "Create Framed Post"}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isViewing && viewingPost && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto max-w-4xl rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Framed Posts for: {viewingPost.name}</h2>
                <p className="mt-1 text-sm text-gray-600">View and download generated framed posts.</p>
              </div>
              <button
                type="button"
                onClick={closeViewModal}
                className="rounded-full bg-gray-100 px-3 py-2 text-gray-600 hover:bg-gray-200"
              >
                ×
              </button>
            </div>
            <div className="rounded-[24px] border border-gray-200 bg-[#f8f2ff] p-6">
              <div className="flex justify-center">
                {renderPreview(currentViewTemplate, viewingPost.contentImageSrc, viewingPost.fieldValues, viewingPost.zoom, viewingPost.rotation, viewingPost.aspectRatio, 0.75)}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#26752C] px-5 text-sm font-semibold text-white hover:bg-[#1f6425] disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isExporting ? "Preparing download..." : "Download Framed Post"}
              </button>
              <button
                type="button"
                onClick={closeViewModal}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="sr-only">
              {renderExportPreview(currentViewTemplate, viewingPost)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
