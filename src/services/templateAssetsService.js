import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase.js";
import { getCurrentUserId } from "./dashboardSupabase.js";

export const MAX_FIRESTORE_DOC_BYTES = 1048576; // 1 MiB hard Firestore limit
export const SAFE_PAYLOAD_LIMIT_BYTES = 1000000; // 1,000,000 bytes safe threshold (~976 KB)

/**
 * Checks if a string is a base64 / data URL
 */
export function isDataUrl(val) {
  return typeof val === "string" && val.startsWith("data:");
}

/**
 * Checks if a string is a remote URL (HTTP/HTTPS/Firebase Storage)
 */
export function isRemoteUrl(val) {
  return typeof val === "string" && (/^https?:\/\//i.test(val) || /^gs:\/\//i.test(val));
}

export function dataUrlToBlob(dataUrl) {
  if (!isDataUrl(dataUrl)) return null;
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex === -1) return null;
  const header = dataUrl.slice(0, commaIndex);
  const rawData = dataUrl.slice(commaIndex + 1);

  const mimeMatch = header.match(/^data:(.*?)(;|$)/);
  const mime = mimeMatch && mimeMatch[1] ? mimeMatch[1] : "image/png";

  if (header.includes(";base64")) {
    try {
      const cleanData = rawData.trim();
      const binary = atob(cleanData);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      return new Blob([array], { type: mime });
    } catch (e) {
      console.warn("Failed to decode base64 data URL:", e);
      return null;
    }
  } else {
    try {
      const decoded = decodeURIComponent(rawData);
      return new Blob([decoded], { type: mime });
    } catch (e) {
      return new Blob([rawData], { type: mime });
    }
  }
}

/**
 * Calculates UTF-8 byte size of any object when serialized to JSON
 */
export function calculatePayloadSizeBytes(payload) {
  if (!payload) return 0;
  try {
    const jsonString = JSON.stringify(payload);
    return new TextEncoder().encode(jsonString).length;
  } catch (err) {
    console.warn("Failed to calculate payload size:", err);
    return 0;
  }
}

/**
 * Validates Firestore payload size and throws a user-friendly error if exceeded
 */
export function validateTemplatePayloadSize(payload, maxBytes = SAFE_PAYLOAD_LIMIT_BYTES) {
  const sizeBytes = calculatePayloadSizeBytes(payload);
  if (sizeBytes > maxBytes) {
    const sizeKB = (sizeBytes / 1024).toFixed(1);
    const limitKB = (MAX_FIRESTORE_DOC_BYTES / 1024).toFixed(0);
    throw new Error(
      `Template document size (${sizeKB} KB) exceeds the maximum allowed Firestore limit (${limitKB} KB). ` +
      `Image assets must be uploaded to Firebase Storage rather than embedded directly as base64.`
    );
  }
  return { valid: true, sizeBytes };
}

/**
 * Sanitizes preview data so large sample images or test photos are not embedded in Firestore
 */
export function sanitizePreviewData(previewData) {
  if (!previewData || typeof previewData !== "object") return previewData;
  const clean = JSON.parse(JSON.stringify(previewData));
  if (Array.isArray(clean.winners)) {
    clean.winners = clean.winners.map((winner) => ({
      ...winner,
      photo: isDataUrl(winner?.photo) ? "" : winner?.photo || "",
      image: isDataUrl(winner?.image) ? "" : winner?.image || "",
    }));
  }
  return clean;
}

/**
 * Generates a lightweight fallback SVG preview image data URL (~500 bytes)
 */
export function makeLightweightSvgPreview(title = "Template", width = 800, height = 600) {
  const safeTitle = String(title).replace(/[<>&"]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#f1f5f9"/><rect x="40" y="30" width="520" height="340" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/><text x="60" y="90" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#1e293b">${safeTitle}</text><text x="60" y="130" font-family="Arial, sans-serif" font-size="14" fill="#64748b">Canvas ${width}x${height}px</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Upload an image file or data URL to Firebase Storage.
 * Follows ownership access rule: users/${userId}/templates/${templateId}/${fileName}
 */
export async function uploadTemplateAsset({
  file,
  dataUrl,
  userId,
  templateId = "draft",
  assetType = "background",
  originalName = "",
}) {
  if (!storage) {
    throw new Error(
      "Firebase Storage is not initialized. Please verify your Firebase configuration in your deployment environment."
    );
  }

  const effectiveUserId = userId || (await getCurrentUserId());
  if (!effectiveUserId) {
    throw new Error("You must be signed in to upload template assets.");
  }

  let blobToUpload = null;
  let contentType = "image/png";
  let extension = "png";

  if (file instanceof File || file instanceof Blob) {
    blobToUpload = file;
    contentType = file.type || "image/png";
    const nameExt = file.name ? file.name.split(".").pop() : "";
    if (nameExt && nameExt.length <= 4) {
      extension = nameExt.toLowerCase();
    }
  } else if (isDataUrl(dataUrl)) {
    blobToUpload = dataUrlToBlob(dataUrl);
    if (!blobToUpload) {
      throw new Error("Unable to parse image data URL for upload.");
    }
    contentType = blobToUpload.type || "image/png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) extension = "jpg";
    else if (contentType.includes("webp")) extension = "webp";
    else if (contentType.includes("svg")) extension = "svg";
  } else {
    throw new Error("No valid file or data URL provided for upload.");
  }

  const cleanBaseName = originalName
    ? originalName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30)
    : assetType;
  const uniqueId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  const fileName = `${cleanBaseName}_${Date.now()}_${uniqueId}.${extension}`;

  // Ownership scoped path: users/{userId}/templates/{templateId}/{fileName}
  const storagePath = `users/${effectiveUserId}/templates/${templateId}/${fileName}`;
  const storageRef = ref(storage, storagePath);

  try {
    const uploadResult = await uploadBytes(storageRef, blobToUpload, {
      contentType,
      customMetadata: {
        userId: effectiveUserId,
        assetType,
        uploadedAt: new Date().toISOString(),
      },
    });

    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return {
      url: downloadUrl,
      storagePath: uploadResult.ref.fullPath,
    };
  } catch (error) {
    console.error(`[FirebaseStorage] Failed to upload ${storagePath}:`, error);
    if (error?.code === "storage/unauthorized") {
      throw new Error(
        "Storage permission denied. Ensure you are signed in and have permission to upload assets."
      );
    }
    if (error?.code === "storage/unknown" || error?.message?.includes("404") || error?.code === "storage/bucket-not-found") {
      throw new Error(
        "Firebase Storage bucket is not available or has not been initialized in Firebase Console. " +
        "Please ensure Cloud Storage is activated for project 'rankify-4b819' in the Firebase Console (Console > Storage > Get Started)."
      );
    }
    throw new Error(`Failed to upload image to Firebase Storage: ${error.message || "Unknown error"}`);
  }
}

/**
 * Prepares and uploads all template images to Firebase Storage before writing to Firestore.
 * Replaces heavy Base64 data URLs with public Firebase Storage download URLs.
 * Validates final payload size before returning.
 */
export async function processTemplateForSave({
  template,
  userId,
  pendingBackgroundFile = null,
  pendingElementFiles = {},
}) {
  const effectiveUserId = userId || (await getCurrentUserId());
  const templateId = template.id || "new";
  const processedTemplate = JSON.parse(JSON.stringify(template));

  // 1. Process Canvas Background Image
  let backgroundUrl = processedTemplate.canvas?.backgroundImage || processedTemplate.backgroundImage || "";
  
  if (pendingBackgroundFile) {
    const upload = await uploadTemplateAsset({
      file: pendingBackgroundFile,
      userId: effectiveUserId,
      templateId,
      assetType: "background",
      originalName: pendingBackgroundFile.name || "background",
    });
    backgroundUrl = upload.url;
    if (processedTemplate.canvas) {
      processedTemplate.canvas.backgroundImage = upload.url;
      processedTemplate.canvas.backgroundStoragePath = upload.storagePath;
    }
    processedTemplate.backgroundImage = upload.url;
  } else if (isDataUrl(backgroundUrl)) {
    const upload = await uploadTemplateAsset({
      dataUrl: backgroundUrl,
      userId: effectiveUserId,
      templateId,
      assetType: "background",
      originalName: processedTemplate.backgroundName || "background",
    });
    backgroundUrl = upload.url;
    if (processedTemplate.canvas) {
      processedTemplate.canvas.backgroundImage = upload.url;
      processedTemplate.canvas.backgroundStoragePath = upload.storagePath;
    }
    processedTemplate.backgroundImage = upload.url;
  }

  // 2. Process Elements Image Layers
  if (Array.isArray(processedTemplate.elements)) {
    for (let i = 0; i < processedTemplate.elements.length; i++) {
      const el = processedTemplate.elements[i];
      const pendingFile = pendingElementFiles[el.id];

      if (pendingFile) {
        const upload = await uploadTemplateAsset({
          file: pendingFile,
          userId: effectiveUserId,
          templateId,
          assetType: "element_image",
          originalName: pendingFile.name || el.label || "layer",
        });
        processedTemplate.elements[i] = {
          ...el,
          imageData: upload.url,
          src: upload.url,
          imageUrl: upload.url,
          storagePath: upload.storagePath,
        };
      } else if (isDataUrl(el.imageData) || isDataUrl(el.src) || isDataUrl(el.imageUrl)) {
        const sourceDataUrl = el.imageData || el.src || el.imageUrl;
        const upload = await uploadTemplateAsset({
          dataUrl: sourceDataUrl,
          userId: effectiveUserId,
          templateId,
          assetType: "element_image",
          originalName: el.imageName || el.label || "layer",
        });
        processedTemplate.elements[i] = {
          ...el,
          imageData: upload.url,
          src: upload.url,
          imageUrl: upload.url,
          storagePath: upload.storagePath,
        };
      }
    }
  }

  // 3. Process Preview Image (Ensure never embedding a massive data URL)
  if (isRemoteUrl(backgroundUrl)) {
    processedTemplate.previewImage = backgroundUrl;
  } else if (isDataUrl(processedTemplate.previewImage) && processedTemplate.previewImage.length > 10000) {
    const width = processedTemplate.canvas?.width || 800;
    const height = processedTemplate.canvas?.height || 600;
    processedTemplate.previewImage = makeLightweightSvgPreview(processedTemplate.name, width, height);
  }

  // 4. Sanitize Preview Data (Strip large example winner test photos)
  if (processedTemplate.previewData) {
    processedTemplate.previewData = sanitizePreviewData(processedTemplate.previewData);
  }

  // 5. Validate final payload size
  validateTemplatePayloadSize(processedTemplate);

  return processedTemplate;
}
