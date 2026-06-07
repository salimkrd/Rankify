import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Edit, Eye, FilePlus2, Plus, RefreshCw, Trash2, X } from "lucide-react";
import NoActiveEventState from "../components/NoActiveEventState.jsx";
import { useActiveEvent } from "../contexts/ActiveEventContext.jsx";
import { listFramedPostTemplatesByEvent } from "../services/framedPostTemplatesService.js";
import { DASHBOARD_CACHE_EVENT } from "../services/dashboardCache.js";
import {
  createFramedPost,
  deleteFramedPost,
  listFramedPostsByEvent,
  updateFramedPost,
} from "../services/framedPostsService.js";

const STATUS_OPTIONS = ["All Status", "Published", "Draft", "Archived"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];
const MAX_CONTENT_IMAGE_DIMENSION = 1080;
const CONTENT_IMAGE_QUALITY = 0.92;
const DOWNLOAD_IMAGE_QUALITY = 0.9;

const framedPostsThemeStyles = `
.framed-posts-page h1,
.framed-posts-page h2,
.framed-posts-page h3{color:var(--app-heading)}
.framed-posts-page label,
.framed-posts-page .text-\\[\\#0D1B2A\\],
.framed-posts-page .text-gray-700,
.framed-posts-page .text-gray-900{color:var(--app-text)}
.framed-posts-page .text-gray-500,
.framed-posts-page .text-gray-600{color:var(--app-muted)}
.framed-posts-page input:not([type="range"]),
.framed-posts-page select{background:var(--app-input-bg);color:var(--app-text);border-color:var(--app-border)}
.framed-posts-page input:not([type="range"])::placeholder{color:var(--app-muted)}
.framed-posts-page input[type=file]::file-selector-button{border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface-elevated);color:var(--app-text);margin-right:10px;padding:6px 12px}
.framed-posts-page input:focus,
.framed-posts-page select:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-focus-ring);outline:none}
.framed-posts-page .bg-white{background:var(--app-surface)}
.framed-posts-page .bg-gray-50,
.framed-posts-page .bg-gray-100,
.framed-posts-page .bg-\\[\\#f9fafb\\],
.framed-posts-page .bg-\\[\\#faf7ff\\],
.framed-posts-page .bg-\\[\\#f3f4f6\\],
.framed-posts-page .bg-\\[\\#eef2ff\\],
.framed-posts-page .bg-\\[\\#eef9f1\\],
.framed-posts-page .bg-\\[\\#EAF5EA\\]{background:var(--app-surface-elevated)}
.framed-posts-page .border-gray-200,
.framed-posts-page .border-gray-300{border-color:var(--app-border)}
.framed-posts-page .text-\\[\\#2d1867\\],
.framed-posts-page .text-\\[\\#4f2593\\],
.framed-posts-page .text-\\[\\#5b2ee1\\]{color:var(--app-heading)}
.framed-posts-page .text-\\[\\#7d62c9\\],
.framed-posts-page .text-\\[\\#4338ca\\],
.framed-posts-page .text-\\[\\#167f42\\]{color:var(--app-muted)}
.framed-posts-page .bg-\\[\\#26752C\\]{background:var(--app-success);color:var(--app-success-text)}
.framed-posts-page .hover\\:bg-\\[\\#1f6425\\]:hover{opacity:.9}
.framed-posts-page .app-modal{background:var(--app-surface-elevated);border-color:var(--app-border);color:var(--app-text)}
.framed-posts-page .framed-post-canvas,
.framed-posts-page .framed-post-canvas .bg-white,
.framed-posts-page .framed-post-canvas .bg-\\[\\#f8f2ff\\],
.framed-posts-page .bg-\\[\\#f8f2ff\\]{color-scheme:light}
`;

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
  const firstTextValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value) !== "") return String(value);
    }
    return "";
  };
  const value = fieldValues?.[field.id] ?? fieldValues?.customFields?.[field.id];
  const event = activeEvent || {};
  switch (field.dataSource) {
    case "eventName":
      return firstTextValue(event.name, value, field.value, field.text, field.content, field.label, "Event Name");
    case "organizerName":
      return firstTextValue(event.organizer, value, field.value, field.text, field.content, field.label, "Organizer Name");
    case "eventDate":
      return firstTextValue(event.date, value, field.value, field.text, field.content, field.label, "May 25");
    case "eventLocation":
      return firstTextValue(event.location, value, field.value, field.text, field.content, field.label, "Event Location");
    case "manual":
    default:
      return firstTextValue(value, field.value, field.text, field.content, field.label, "Custom Field");
  }
}

function getTemplateById(templates, id) {
  return templates.find((template) => String(template.id) === String(id));
}

function initialFieldValues(template) {
  const values = {};
  (template?.customFields || []).forEach((field) => {
    if (field.dataSource === "manual") {
      values[field.id] = field.value || field.text || field.content || "";
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
    contentImageWidth: 0,
    contentImageHeight: 0,
    zoom: 1,
    rotation: 0,
    aspectRatio: 1.33,
    cropX: 0,
    cropY: 0,
    imageFit: "cover",
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

function getContentImageTargetSize(template) {
  const { width, height } = getTemplatePreviewSize(template || {});
  const safeWidth = Number.isFinite(width) && width > 0 ? width : MAX_CONTENT_IMAGE_DIMENSION;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : MAX_CONTENT_IMAGE_DIMENSION;
  const scale = Math.min(1, MAX_CONTENT_IMAGE_DIMENSION / Math.max(safeWidth, safeHeight));

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = src;
  });
}

async function resizeImageToFrame(file, targetWidth, targetHeight, quality = CONTENT_IMAGE_QUALITY) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Please upload a valid image file.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;

    if (!sourceWidth || !sourceHeight) {
      throw new Error("Unable to read image dimensions.");
    }

    const maxDimension = Math.max(targetWidth, targetHeight, 1);
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const outputWidth = Math.max(1, Math.round(sourceWidth * scale));
    const outputHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const context = canvas.getContext("2d", { alpha: false });

    if (!context) {
      throw new Error("Unable to process image.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, outputWidth, outputHeight);
    context.drawImage(
      image,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return {
      dataUrl: canvas.toDataURL("image/jpeg", quality),
      width: outputWidth,
      height: outputHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function waitForImages(root) {
  const images = Array.from(root?.querySelectorAll?.("img") || []);
  return Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth > 0) return Promise.resolve();
      return new Promise((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    })
  );
}

export default function FramedPostsPage() {
  const { activeEvent, activeEventId, loading: activeEventLoading } = useActiveEvent();
  const [templates, setTemplates] = useState([]);
  const [posts, setPosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewing, setIsViewing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);
  const [formState, setFormState] = useState(buildFormState(templates[0]));
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const exportRef = useRef(null);
  const adjustDragState = useRef({ isDragging: false, startX: 0, startY: 0, startCropX: 0, startCropY: 0 });

  const templateOptions = templates;

  useEffect(() => {
    let cancelled = false;

    async function sync(options = {}) {
      if (activeEventLoading) return;

      setError("");
      setLoading(true);
      try {
        let eventTemplates = [];
        let eventPosts = [];

        if (activeEventId) {
          [eventTemplates, eventPosts] = await Promise.all([
            listFramedPostTemplatesByEvent(activeEventId),
            listFramedPostsByEvent(activeEventId),
          ]);
        }

        if (cancelled) return;
        setTemplates(eventTemplates);
        setPosts(eventPosts);
      } catch (err) {
        console.error("Failed to load framed posts.", err);
        if (!cancelled) {
          setError(err?.message || "Unable to load framed posts. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    sync();

    const syncFromCache = () => sync({ background: false });
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("rankify-active-event-changed", sync);
    window.addEventListener("rankify-data-changed", sync);
    window.addEventListener("rankify-events-changed", sync);
    window.addEventListener(DASHBOARD_CACHE_EVENT, syncFromCache);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("rankify-active-event-changed", sync);
      window.removeEventListener("rankify-data-changed", sync);
      window.removeEventListener("rankify-events-changed", sync);
      window.removeEventListener(DASHBOARD_CACHE_EVENT, syncFromCache);
    };
  }, [activeEventId, activeEventLoading]);

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
    if (!activeEventId) {
      alert("Please select an active event first.");
      return;
    }

    const firstTemplate = templates[0];
    setEditingPost(null);
    setFormState(buildFormState(firstTemplate));
    setImageUploadError("");
    setIsProcessingImage(false);
    setIsFormOpen(true);
  }

  function openEditModal(post) {
    const template = getTemplateById(templates, post.templateId) || templates[0];
    setEditingPost(post);
    setImageUploadError("");
    setIsProcessingImage(false);
    setFormState({
      name: post.name || "New Framed Post",
      templateId: post.templateId || template?.id || "",
      templateName: post.templateName || template?.name || "",
      contentImageSrc: post.contentImageSrc || "",
      contentImageWidth: Number(post.contentImageWidth || post.imageWidth || 0),
      contentImageHeight: Number(post.contentImageHeight || post.imageHeight || 0),
      zoom: post.imageZoom || post.zoom || 1,
      rotation: post.imageRotation || post.rotation || 0,
      aspectRatio: post.aspectRatio || 1.33,
      cropX: post.imageOffsetX ?? post.cropX ?? 0,
      cropY: post.imageOffsetY ?? post.cropY ?? 0,
      imageFit: post.imageFit || "cover",
      status: post.status || "Published",
      fieldValues: post.fieldValues || initialFieldValues(template),
    });
    setEditingPost(post);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setEditingPost(null);
    setImageUploadError("");
    setIsProcessingImage(false);
    setIsDraggingImage(false);
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

  function clampAspectRatio(value) {
    if (!Number.isFinite(value) || value <= 0) return 1.33;
    return Math.min(Math.max(value, 0.5), 3);
  }

  function handleFormFieldChange(key, value) {
    if (key === "aspectRatio") {
      value = clampAspectRatio(value);
    }
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

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingImage(true);
    setImageUploadError("");

    try {
      const template = selectedTemplate || getTemplateById(templates, formState.templateId) || templates[0];
      const { width, height } = getContentImageTargetSize(template);
      const resizedImage = await resizeImageToFrame(file, width, height);

      setFormState((prev) => ({
        ...prev,
        contentImageSrc: resizedImage.dataUrl,
        contentImageWidth: resizedImage.width,
        contentImageHeight: resizedImage.height,
        zoom: 1,
        rotation: 0,
        cropX: 0,
        cropY: 0,
        imageFit: "cover",
      }));
    } catch (error) {
      console.error("Failed to process content image.", error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to process this image. Please try another image.";
      setImageUploadError(message);
      alert(message);
    } finally {
      setIsProcessingImage(false);
      event.target.value = "";
    }
  }

  function getContentImageStyle({
    zoom,
    rotation,
    cropX,
    cropY,
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    scale,
  }) {
    const safeImageWidth = Number(imageWidth) > 0 ? Number(imageWidth) : frameWidth;
    const safeImageHeight = Number(imageHeight) > 0 ? Number(imageHeight) : frameHeight;
    const imageAspect = safeImageWidth / safeImageHeight;
    const frameAspect = frameWidth / frameHeight;
    const baseHeight = imageAspect > frameAspect ? frameHeight * scale : (frameWidth * scale) / imageAspect;
    const baseWidth = imageAspect > frameAspect ? baseHeight * imageAspect : frameWidth * scale;

    return {
      position: "absolute",
      left: "50%",
      top: "50%",
      width: `${baseWidth}px`,
      height: `${baseHeight}px`,
      maxWidth: "none",
      maxHeight: "none",
      objectFit: "contain",
      transform: `translate(-50%, -50%) translate(${(cropX || 0) * scale}px, ${(cropY || 0) * scale}px) scale(${zoom || 1}) rotate(${rotation || 0}deg)`,
      transformOrigin: "center center",
      opacity: 1,
      mixBlendMode: "normal",
      filter: "none",
      zIndex: 1,
      userSelect: "none",
      WebkitUserDrag: "none",
      pointerEvents: "none",
    };
  }

  function handleAdjustPointerDown(event) {
    if (!formState.contentImageSrc) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingImage(true);
    adjustDragState.current = {
      isDragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startCropX: formState.cropX || 0,
      startCropY: formState.cropY || 0,
    };
  }

  function handleAdjustPointerMove(event) {
    if (!adjustDragState.current.isDragging) return;
    event.preventDefault();
    const template = selectedTemplate || templates[0];
    const { width } = getTemplatePreviewSize(template || {});
    const rect = event.currentTarget.getBoundingClientRect();
    const coordinateScale = rect.width > 0 ? width / rect.width : 1;
    const deltaX = event.clientX - adjustDragState.current.startX;
    const deltaY = event.clientY - adjustDragState.current.startY;
    setFormState((prev) => ({
      ...prev,
      cropX: adjustDragState.current.startCropX + deltaX * coordinateScale,
      cropY: adjustDragState.current.startCropY + deltaY * coordinateScale,
    }));
  }

  function handleAdjustPointerUp(event) {
    if (!adjustDragState.current.isDragging) return;
    adjustDragState.current.isDragging = false;
    setIsDraggingImage(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function savePost() {
    if (isProcessingImage) {
      alert("Please wait for the image to finish processing.");
      return;
    }

    if (!formState.name.trim()) {
      alert("Result name is required.");
      return;
    }
    if (!formState.templateId) {
      alert("Please select a frame template.");
      return;
    }
    if (!formState.contentImageSrc) {
      alert("Please upload a content image.");
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
      contentImageWidth: formState.contentImageWidth || 0,
      contentImageHeight: formState.contentImageHeight || 0,
      zoom: formState.zoom,
      imageZoom: formState.zoom,
      rotation: formState.rotation,
      imageRotation: formState.rotation,
      aspectRatio: formState.aspectRatio,
      cropX: formState.cropX || 0,
      cropY: formState.cropY || 0,
      imageOffsetX: formState.cropX || 0,
      imageOffsetY: formState.cropY || 0,
      imageFit: formState.imageFit || "cover",
      status: formState.status,
      fieldValues: formState.fieldValues,
      createdAt: editingPost?.createdAt || now,
      updatedAt: now,
    };

    try {
      if (editingPost) {
        const saved = await updateFramedPost(editingPost.id, nextPost);
        setPosts((current) => current.map((post) => (String(post.id) === String(editingPost.id) ? saved : post)));
      } else {
        const saved = await createFramedPost(activeEventId, nextPost);
        setPosts((current) => [saved, ...current]);
      }
      window.dispatchEvent(new Event("rankify-data-changed"));
      closeForm();
    } catch (error) {
      console.error("Failed to save framed post.", error);
      alert(
        error?.message || "Unable to save this framed post. Please try again."
      );
    }
  }

  async function deletePost(postId) {
    const confirmed = window.confirm("Are you sure you want to delete this framed post?");
    if (!confirmed) return;
    try {
      await deleteFramedPost(postId);
      setPosts((current) => current.filter((post) => String(post.id) !== String(postId)));
      window.dispatchEvent(new Event("rankify-data-changed"));
      if (viewingPost?.id === postId) closeViewModal();
    } catch (error) {
      console.error("Failed to delete framed post.", error);
      alert(error?.message || "Unable to delete this framed post. Please try again.");
    }
  }

  async function handleDownload() {
    if (!exportRef.current || !viewingPost) return;
    setIsExporting(true);
    try {
      const exportNode =
        exportRef.current.querySelector('[data-framed-post-export="true"]') ||
        exportRef.current;

      await waitForImages(exportNode);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const templateSize = getTemplatePreviewSize(currentViewTemplate || {});
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(exportNode, {
        backgroundColor: "#f8f2ff",
        scale: 1,
        width: templateSize.width,
        height: templateSize.height,
        windowWidth: templateSize.width,
        windowHeight: templateSize.height,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 15000,
        onclone: (clonedDocument) => {
          const clonedExportNode = clonedDocument.querySelector(
            '[data-framed-post-export="true"]'
          );
          if (!clonedExportNode) return;

          clonedExportNode.style.border = "0";
          clonedExportNode.style.outline = "0";
          clonedExportNode.style.boxShadow = "none";
          clonedExportNode
            .querySelectorAll("[data-export-guide]")
            .forEach((node) => {
              node.style.display = "none";
          });
        },
      });

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (nextBlob) => {
            if (nextBlob) resolve(nextBlob);
            else reject(new Error("Unable to create JPEG download."));
          },
          "image/jpeg",
          DOWNLOAD_IMAGE_QUALITY
        );
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${viewingPost.name || "framed-post"}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Unable to download the framed post. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  function resolveImageSource(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      return value.dataUrl || value.dataURL || value.url || value.src || value.imageData || value.data || "";
    }
    return "";
  }

  function getTemplateFrameSource(template) {
    if (!template || typeof template !== "object") return "";
    return (
      resolveImageSource(template.frameImage) ||
      resolveImageSource(template.frameImageUrl) ||
      resolveImageSource(template.frameOverlay) ||
      resolveImageSource(template.overlayImage) ||
      resolveImageSource(template.overlayUrl) ||
      resolveImageSource(template.overlaySrc) ||
      resolveImageSource(template.backgroundImage) ||
      resolveImageSource(template.previewImage) ||
      resolveImageSource(template.imageUrl) ||
      resolveImageSource(template.imageSrc) ||
      resolveImageSource(template.image) ||
      resolveImageSource(template.src) ||
      resolveImageSource(template.frameSrc) ||
      resolveImageSource(template.frame_image_url) ||
      resolveImageSource(template.frame_image) ||
      resolveImageSource(template.frame_overlay) ||
      resolveImageSource(template.overlay_image) ||
      resolveImageSource(template.overlay_src) ||
      resolveImageSource(template.image_url) ||
      resolveImageSource(template.image_src) ||
      ""
    );
  }

  function renderFramedPostCanvas({
    template,
    contentImageSrc,
    contentImageWidth = 0,
    contentImageHeight = 0,
    fieldValues,
    zoom = 1,
    rotation = 0,
    aspectRatio = 1.33,
    cropX = 0,
    cropY = 0,
    imageFit = "cover",
    scale = 1,
    isExport = false,
  }) {
    if (!template) {
      return (
    <div className="app-surface-elevated h-[320px] rounded-3xl border border-dashed border-[var(--app-border)] p-6 text-center text-sm text-[var(--app-muted)]">
          Select a frame template to preview your framed post here.
        </div>
      );
    }

    const width = Number(template.canvasWidth || template.width || 800);
    const height = Number(template.canvasHeight || template.height || 600);
    const scaledWidth = Math.round(width * scale);
    const scaledHeight = Math.round(height * scale);
    const frameSrc = getTemplateFrameSource(template);

    return (
      <div
        data-framed-post-export={isExport ? "true" : undefined}
        style={{
          width: scaledWidth,
          height: scaledHeight,
          border: isExport ? 0 : undefined,
          outline: isExport ? 0 : undefined,
          boxShadow: isExport ? "none" : undefined,
        }}
        className={isExport ? "framed-post-canvas relative overflow-hidden bg-[#f8f2ff]" : "framed-post-canvas relative overflow-hidden rounded-[24px] border border-gray-200 bg-[#f8f2ff] shadow-sm"}
      >
        <div className="absolute inset-0 overflow-hidden bg-[#f8f2ff]">
          {contentImageSrc ? (
            <img
              src={contentImageSrc}
              alt="Content"
              style={getContentImageStyle({
                zoom,
                rotation,
                cropX,
                cropY,
                imageWidth: contentImageWidth,
                imageHeight: contentImageHeight,
                frameWidth: width,
                frameHeight: height,
                scale,
              })}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500">
              <div className="h-16 w-16 rounded-full bg-[#e9d6ff]" />
              <div>Add a content image to preview inside the frame.</div>
            </div>
          )}
        </div>

        {frameSrc ? (
          <img
            src={frameSrc}
            alt={template.name}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ zIndex: 2, opacity: 1, mixBlendMode: "normal", filter: "none" }}
          />
        ) : !isExport ? (
          <div
            data-export-guide="true"
            className="absolute inset-0 border border-dashed border-gray-300"
            style={{ zIndex: 2, background: "transparent" }}
          />
        ) : (
          <div className="absolute inset-0" style={{ zIndex: 2, background: "transparent" }} />
        )}

        {(template.customFields || []).map((field, index) => {
          const left = (Number(field.x) || 0) * scale;
          const top = (Number(field.y) || 0) * scale;
          const widthValue = field.width ? Number(field.width) * scale : undefined;
          const heightValue = field.height ? Number(field.height) * scale : undefined;
          const zIndex = 3 + index;

          if (field.type === "image") {
            const imageSrc =
              resolveImageSource(fieldValues?.[field.id]) ||
              resolveImageSource(field.src) ||
              resolveImageSource(field.imageData) ||
              resolveImageSource(field.imageUrl) ||
              resolveImageSource(field.url) ||
              resolveImageSource(field.dataUrl) ||
              resolveImageSource(field.dataURL);

            if (!imageSrc) return null;

            return (
              <img
                key={field.id || `${field.label}-${index}`}
                src={imageSrc}
                alt=""
                className="absolute"
                style={{
                  left,
                  top,
                  width: widthValue || 200 * scale,
                  height: heightValue || 160 * scale,
                  objectFit: field.objectFit || "cover",
                  opacity: field.opacity === undefined ? 1 : Number(field.opacity),
                  borderRadius: (Number(field.borderRadius) || 0) * scale,
                  zIndex,
                  display: "block",
                }}
                draggable={false}
              />
            );
          }

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
                zIndex,
                padding: 2,
                boxSizing: "border-box",
              }}
            >
              {displayText}
            </div>
          );
        })}
      </div>
    );
  }

  function renderPreview(template, contentImageSrc, fieldValues, zoom, rotation, aspectRatio, cropX, cropY, imageFit = "cover", scale = 0.65, contentImageWidth = 0, contentImageHeight = 0) {
    return renderFramedPostCanvas({
      template,
      contentImageSrc,
      contentImageWidth,
      contentImageHeight,
      fieldValues,
      zoom,
      rotation,
      aspectRatio,
      cropX,
      cropY,
      imageFit,
      scale,
    });
  }

  function renderExportPreview(template, post) {
    if (!template || !post) return null;
    const fieldValues = post.fieldValues || {};
    const { width, height } = getTemplatePreviewSize(template);

    return (
      <div
        ref={exportRef}
        style={{
          position: "fixed",
          left: -9999,
          top: -9999,
          width,
          height,
          opacity: 1,
          pointerEvents: "none",
          overflow: "hidden",
          background: "transparent",
          zIndex: -1,
        }}
      >
        {renderFramedPostCanvas({
          template,
          contentImageSrc: post.contentImageSrc,
          contentImageWidth: post.contentImageWidth || post.imageWidth || 0,
          contentImageHeight: post.contentImageHeight || post.imageHeight || 0,
          fieldValues,
          zoom: post.imageZoom ?? post.zoom ?? 1,
          rotation: post.imageRotation ?? post.rotation ?? 0,
          aspectRatio: post.aspectRatio ?? 1.33,
          cropX: post.imageOffsetX ?? post.cropX ?? 0,
          cropY: post.imageOffsetY ?? post.cropY ?? 0,
          imageFit: post.imageFit || "cover",
          scale: 1,
          isExport: true,
        })}
      </div>
    );
  }

  const activeEventName = activeEvent?.name || "No active event";
  const hasActiveEvent = Boolean(activeEventId);
  const hasPosts = filteredPosts.length > 0;

  return (
    <div className="framed-posts-page app-page min-h-screen overflow-x-hidden pb-24">
      <style>{framedPostsThemeStyles}</style>
      <div className="mx-auto max-w-[1360px] px-6 py-6 max-sm:px-4">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h1 className="app-heading break-words text-3xl font-bold">Manage Framed Posts</h1>
            <p className="app-muted mt-2 text-sm">
              View, create, edit, and generate framed posts for event: {activeEventName}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!hasActiveEvent}
            className="app-success-btn inline-flex h-12 items-center justify-center rounded-md px-5 text-sm font-semibold shadow-sm transition hover:opacity-90"
          >
            <Plus className="mr-2" size={18} strokeWidth={2} aria-hidden="true" />
            Create New Framed Post
          </button>
        </div>

        {!hasActiveEvent && activeEventLoading ? (
          <div className="app-card rounded-xl border p-8 text-center">
            <p className="app-muted text-sm font-semibold">Loading framed posts...</p>
          </div>
        ) : !hasActiveEvent ? (
          <NoActiveEventState />
        ) : <>
        <div className="app-card mb-6 rounded-3xl border p-5 shadow-sm">
          <div className="grid gap-4 xl:grid-cols-[1.5fr_0.8fr_0.8fr]">
            <label className="block">
              <span className="app-text text-sm font-medium">Search your framed posts...</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="app-input mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
                placeholder="Search your framed posts..."
              />
            </label>
            <label className="block">
              <span className="app-text text-sm font-medium">All Status</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="app-select mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="app-text text-sm font-medium">Sort by Date</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="app-select mt-2 w-full rounded-xl border px-4 py-3 text-sm outline-none transition"
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

        {error ? (
          <div className="app-card mb-6 rounded-3xl border border-red-200 p-5 text-center text-sm font-semibold text-red-600 shadow-sm">
            {error}
          </div>
        ) : null}

        {loading && !hasPosts ? (
          <div className="app-card flex min-h-[52vh] items-center justify-center rounded-[32px] border border-dashed p-10 shadow-sm">
            <div className="text-center">
              <h2 className="app-heading text-2xl font-semibold">Loading framed posts...</h2>
            </div>
          </div>
        ) : hasPosts ? (
          <div className="grid min-w-0 gap-6 xl:grid-cols-2">
            {filteredPosts.map((post) => {
              const template = getTemplateById(templates, post.templateId);
              return (
                <div key={post.id} className="app-card min-w-0 overflow-hidden rounded-[28px] border shadow-sm">
                  <div className="rounded-t-[28px] bg-[var(--app-surface-elevated)] px-6 py-8 text-center">
                    <div className="mx-auto mb-3 flex h-24 w-full max-w-[520px] items-center justify-center rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] px-4 text-center text-lg font-semibold text-[var(--app-heading)]">
                      <div>
                        <div className="text-xl font-semibold">{post.name}</div>
                        <div className="app-muted mt-1 text-sm">{post.templateName || "No template selected"}</div>
                      </div>
                    </div>
                  </div>
                  <div className="px-6 pb-6 pt-4">
                    <p className="app-muted text-sm">Created: {formatDate(post.createdAt)}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openViewModal(post)}
                        className="app-card inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]"
                      >
                        <Eye size={16} strokeWidth={1.9} aria-hidden="true" />
                        View Framed Post
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(post)}
                        className="app-card inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-sm font-semibold hover:bg-[var(--app-surface-elevated)]"
                      >
                        <Edit size={16} strokeWidth={1.9} aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePost(post.id)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        <Trash2 size={16} strokeWidth={1.9} aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="app-card flex min-h-[52vh] items-center justify-center rounded-[32px] border border-dashed p-10 shadow-sm">
            <div className="text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--app-surface-elevated)] text-2xl text-[var(--app-success)]">
                <FilePlus2 size={36} strokeWidth={1.8} aria-hidden="true" />
              </div>
              <h2 className="app-heading text-2xl font-semibold">No Framed Posts Yet</h2>
              <p className="app-muted mt-2 text-sm">
                You haven't created any framed posts yet. Get started by creating your first one!
              </p>
              <button
                type="button"
                onClick={openCreateModal}
                className="app-success-btn mt-6 inline-flex items-center justify-center rounded-md px-5 py-2 text-sm font-semibold shadow-sm hover:opacity-90"
              >
                Create Your First Framed Post
              </button>
            </div>
          </div>
        )}
        </>}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="app-modal w-full rounded-[28px] border shadow-2xl" style={{ maxWidth: "min(1100px, calc(100vw - 48px))", maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}>
            <div className="p-6 md:p-8">
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
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_500px]">
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
                    disabled={isProcessingImage}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {isProcessingImage
                      ? "Resizing image to fit the frame..."
                      : "Large images will be automatically resized to fit the frame."}
                  </p>
                  {imageUploadError && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      {imageUploadError}
                    </p>
                  )}
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
                      onClick={() =>
                        setFormState((prev) => ({
                          ...prev,
                          zoom: 1,
                          rotation: 0,
                          aspectRatio: 1.33,
                          cropX: 0,
                          cropY: 0,
                        }))
                      }
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-[#0D1B2A] hover:bg-gray-50"
                    >
                      <RefreshCw className="mr-2 inline-block align-[-2px]" size={16} strokeWidth={1.9} aria-hidden="true" />
                      Reset Crop/Zoom
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-5">
                <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm min-w-0">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-[#0D1B2A]">Adjust Content Image</h3>
                      <p className="text-sm text-gray-500">Drag to position, zoom, rotate, and crop your content image.</p>
                    </div>
                    <div className="rounded-full bg-[#eef9f1] px-3 py-1 text-xs font-semibold text-[#167f42] shrink-0">
                      Editable
                    </div>
                  </div>
                  <div className="rounded-[32px] bg-[#e5e7eb] p-4 overflow-hidden">
                    <div
                      className="flex justify-center overflow-auto"
                      onPointerDown={handleAdjustPointerDown}
                      onPointerMove={handleAdjustPointerMove}
                      onPointerUp={handleAdjustPointerUp}
                      onPointerCancel={handleAdjustPointerUp}
                      onPointerLeave={handleAdjustPointerUp}
                      style={{
                        touchAction: "none",
                        cursor: formState.contentImageSrc
                          ? isDraggingImage
                            ? "grabbing"
                            : "grab"
                          : "default",
                      }}
                    >
                      {selectedTemplate ? (
                        renderPreview(
                          selectedTemplate,
                          formState.contentImageSrc,
                          formState.fieldValues,
                          formState.zoom,
                          formState.rotation,
                          formState.aspectRatio,
                          formState.cropX,
                          formState.cropY,
                          formState.imageFit,
                          0.35,
                          formState.contentImageWidth,
                          formState.contentImageHeight
                        )
                      ) : (
                        <div className="flex h-[240px] w-full flex-col items-center justify-center gap-3 rounded-[24px] bg-white text-sm text-gray-500">
                          <div className="h-16 w-16 rounded-full bg-[#e9d6ff]" />
                          <div>Select a template and upload a content image.</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>Crop ratio: {clampAspectRatio(formState.aspectRatio).toFixed(2)}:1</div>
                    <div className="text-right">Drag the image to reposition it inside the crop area.</div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm min-w-0 flex flex-col">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-[#0D1B2A]">Live Preview</h3>
                      <p className="text-sm text-gray-500">Preview the framed post render before saving.</p>
                    </div>
                    <div className="rounded-full bg-[#eef9f1] px-3 py-1 text-xs font-semibold text-[#167f42] shrink-0">
                      View only
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center overflow-auto" style={{ minHeight: "240px", maxHeight: "400px" }}>
                    {selectedTemplate ? (
                      <div style={{ maxWidth: "100%", width: "100%", overflow: "auto" }}>
                        {renderPreview(
                          selectedTemplate,
                          formState.contentImageSrc,
                          formState.fieldValues,
                          formState.zoom,
                          formState.rotation,
                          formState.aspectRatio,
                          formState.cropX,
                          formState.cropY,
                          formState.imageFit,
                          0.35,
                          formState.contentImageWidth,
                          formState.contentImageHeight
                        )}
                      </div>
                    ) : (
                      <div className="h-[240px] rounded-3xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500 flex items-center justify-center">
                        Select a template to preview
                      </div>
                    )}
                  </div>
                </div>

                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={savePost}
                    disabled={isProcessingImage}
                    className="inline-flex h-12 items-center justify-center rounded-xl bg-[#26752C] px-5 text-sm font-semibold text-white hover:bg-[#1f6425] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessingImage
                      ? "Processing Image..."
                      : editingPost
                        ? "Update Framed Post"
                        : "Create Framed Post"}
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4">
          <div className="app-modal mx-auto max-w-4xl rounded-[28px] border p-6 shadow-2xl">
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
                <X size={18} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div className="rounded-[24px] border border-gray-200 bg-[#f8f2ff] p-6">
              <div className="flex justify-center">
                {renderPreview(
                  currentViewTemplate,
                  viewingPost.contentImageSrc,
                  viewingPost.fieldValues,
                  viewingPost.imageZoom ?? viewingPost.zoom,
                  viewingPost.imageRotation ?? viewingPost.rotation,
                  viewingPost.aspectRatio,
                  viewingPost.imageOffsetX ?? viewingPost.cropX,
                  viewingPost.imageOffsetY ?? viewingPost.cropY,
                  viewingPost.imageFit || "cover",
                  0.75,
                  viewingPost.contentImageWidth || viewingPost.imageWidth || 0,
                  viewingPost.contentImageHeight || viewingPost.imageHeight || 0
                )}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isExporting}
                className="inline-flex h-12 items-center justify-center rounded-xl bg-[#26752C] px-5 text-sm font-semibold text-white hover:bg-[#1f6425] disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {!isExporting && <Download className="mr-2" size={17} strokeWidth={1.9} aria-hidden="true" />}
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
            {renderExportPreview(currentViewTemplate, viewingPost)}
          </div>
        </div>
      )}
    </div>
  );
}


