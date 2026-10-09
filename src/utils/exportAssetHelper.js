import { storage } from "../lib/firebase";
import { ref, getBytes } from "firebase/storage";

/**
 * exportAssetHelper.js
 *
 * Robust utilities for preparing templates, images, and fonts for high-fidelity,
 * cross-origin safe canvas exports and downloads across Rankify poster & certificate templates.
 */

/**
 * Converts a Blob or File to a Base64 data URL.
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err || new Error("Failed to read blob as data URL."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Safely fetches a remote image URL (including Firebase Storage) and converts it
 * to a base64 Data URL so html2canvas can draw it without CORS restrictions or tainted canvas.
 */
export async function urlToDataUrl(url) {
  if (!url || typeof url !== "string") return "";
  if (url.startsWith("data:")) return url;

  // 1. Restricted first-party storage proxy (works on Vercel production, local Vite dev, and Node server)
  if (url.includes("firebasestorage.googleapis.com")) {
    try {
      const proxiedUrl = url.replace("https://firebasestorage.googleapis.com", "/api/storage-proxy");
      const res = await fetch(proxiedUrl);
      if (res.ok) {
        const blob = await res.blob();
        return await blobToDataUrl(blob);
      }
    } catch (proxyErr) {
      console.warn("[ExportAsset] First-party storage proxy fetch failed, trying direct methods...", proxyErr);
    }

    // Direct Firebase SDK getBytes attempt
    if (storage) {
      try {
        const storageRef = ref(storage, url);
        const arrayBuffer = await getBytes(storageRef);
        const blob = new Blob([arrayBuffer]);
        return await blobToDataUrl(blob);
      } catch {
        // Continue to standard fetch
      }
    }
  }

  // 2. Standard direct CORS fetch
  try {
    const response = await fetch(url, { mode: "cors" });
    if (response.ok) {
      const blob = await response.blob();
      return await blobToDataUrl(blob);
    }
  } catch {
    // continue
  }

  // 3. Cache-busting fetch (bypasses browser disk cache that may lack CORS headers)
  try {
    const separator = url.includes("?") ? "&" : "?";
    const cacheBustUrl = `${url}${separator}nocache=${Date.now()}`;
    const retryResponse = await fetch(cacheBustUrl, { mode: "cors" });
    if (retryResponse.ok) {
      const blob = await retryResponse.blob();
      return await blobToDataUrl(blob);
    }
  } catch {
    // continue
  }

  console.error(`[ExportAsset] Failed to load image asset for export: ${url}`);
  throw new Error(
    `Unable to load required image asset for export. Please verify the asset exists.\nURL: ${url}`
  );
}

/**
 * Recursively scans any arbitrary template or data structure (objects, arrays, strings),
 * finds all remote HTTP(S) image URLs, fetches them all concurrently as base64 Data URLs,
 * and replaces them in a deep clone of the objects.
 */
export async function prepareTemplateForExport(template, data = null) {
  if (!template) return { safeTemplate: template, safeData: data };

  const safeTemplate = JSON.parse(JSON.stringify(template));
  const safeData = data ? JSON.parse(JSON.stringify(data)) : null;

  // Unpack stringified templateData if present
  let hasParsedTemplateData = false;
  if (typeof safeTemplate.templateData === "string") {
    try {
      safeTemplate.templateData = JSON.parse(safeTemplate.templateData);
      hasParsedTemplateData = true;
    } catch {
      // ignore
    }
  }
  let hasParsedTemplateDataUnderscore = false;
  if (typeof safeTemplate.template_data === "string") {
    try {
      safeTemplate.template_data = JSON.parse(safeTemplate.template_data);
      hasParsedTemplateDataUnderscore = true;
    } catch {
      // ignore
    }
  }

  const urlMap = new Map();

  const isImageField = (key) => /^(src|image.*|backgroundimage|frameimage.*|photo.*)$/i.test(key || "");

  function scanNode(node, key = "") {
    if (!node) return;
    if (typeof node === "string") {
      if (isImageField(key) && (node.startsWith("http://") || node.startsWith("https://"))) {
        if (!urlMap.has(node)) urlMap.set(node, null);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) scanNode(item, key);
      return;
    }
    if (typeof node === "object") {
      for (const [childKey, value] of Object.entries(node)) {
        scanNode(value, childKey);
      }
    }
  }

  scanNode(safeTemplate);
  scanNode(safeData);

  const uniqueUrls = Array.from(urlMap.keys());
  if (uniqueUrls.length > 0) {
    console.log(`[ExportAsset] Converting ${uniqueUrls.length} image URLs to DataURLs for clean export...`);
    await Promise.allSettled(
      uniqueUrls.map(async (url) => {
        try {
          const dataUrl = await urlToDataUrl(url);
          urlMap.set(url, dataUrl);
        } catch (err) {
          console.error(`[ExportAsset] Error converting URL: ${url}`, err);
          urlMap.set(url, url);
        }
      })
    );
  }

  function replaceNode(node, key = "") {
    if (!node) return node;
    if (typeof node === "string") {
      if (isImageField(key) && urlMap.has(node)) {
        return urlMap.get(node) || node;
      }
      return node;
    }
    if (Array.isArray(node)) {
      return node.map((item) => replaceNode(item, key));
    }
    if (typeof node === "object") {
      const copy = {};
      for (const [k, v] of Object.entries(node)) {
        copy[k] = replaceNode(v, k);
      }
      return copy;
    }
    return node;
  }

  const fullySafeTemplate = replaceNode(safeTemplate);
  const fullySafeData = safeData ? replaceNode(safeData) : null;

  return { safeTemplate: fullySafeTemplate, safeData: fullySafeData };
}

/**
 * Creates an invisible, isolated offscreen container for html2canvas capture.
 * Positioned at left: 0, top: 0 with zIndex: -99999 so html2canvas computes
 * coordinates accurately without clipping, while user never sees it.
 */
export function createOffscreenContainer(width, height, backgroundColor = "#ffffff") {
  const offscreen = document.createElement("div");
  offscreen.setAttribute("data-rankify-export-container", "true");
  offscreen.style.position = "fixed";
  offscreen.style.left = "0px";
  offscreen.style.top = "0px";
  offscreen.style.width = `${width}px`;
  offscreen.style.height = `${height}px`;
  offscreen.style.zIndex = "-99999";
  offscreen.style.pointerEvents = "none";
  offscreen.style.overflow = "hidden";
  offscreen.style.colorScheme = "light";
  offscreen.style.backgroundColor = backgroundColor;
  offscreen.style.margin = "0";
  offscreen.style.padding = "0";
  offscreen.style.border = "none";
  offscreen.style.opacity = "1";
  document.body.appendChild(offscreen);
  return offscreen;
}

/**
 * Ensures all image elements inside a container have loaded and decoded properly.
 * Also ensures document fonts are loaded before html2canvas capture.
 */
export async function waitForAllAssets(containerNode) {
  if (!containerNode) return;

  // 1. Wait for document fonts
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch (fontErr) {
      console.warn("[ExportAsset] Warning waiting for document fonts:", fontErr);
    }
  }

  // 2. Query all <img> tags inside containerNode
  const images = Array.from(containerNode.querySelectorAll("img"));

  await Promise.all(
    images.map(async (img) => {
      // Only set crossOrigin for external HTTP URLs (not data URLs)
      if (!img.crossOrigin && !img.src.startsWith("data:") && !img.src.startsWith("blob:")) {
        img.crossOrigin = "anonymous";
      }

      // If not already complete, wait for load
      if (!img.complete) {
        await new Promise((resolve) => {
          const onFinish = () => resolve();
          img.addEventListener("load", onFinish, { once: true });
          img.addEventListener("error", onFinish, { once: true });
        });
      }

      // Try decode() if supported
      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          // ignore decode errors for unsupported SVG or small icons
        }
      }
    })
  );

  // 3. Small RAF wait to guarantee browser layout flush
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Robust cross-browser canvas download helper.
 * Uses toBlob + URL.createObjectURL + append to body + deferred revokeObjectURL.
 */
export function triggerCanvasDownload(canvas, filename, format = "jpg", quality = 0.95) {
  const isPng = format.toLowerCase() === "png";
  const mimeType = isPng ? "image/png" : "image/jpeg";
  const ext = isPng ? ".png" : ".jpg";
  const safeFilename = filename.endsWith(ext) ? filename : `${filename}${ext}`;

  try {
    const dataUrl = canvas.toDataURL(mimeType, quality);
    if (typeof window !== "undefined") {
      window.__RANKIFY_LAST_EXPORT__ = {
        filename: safeFilename,
        dataUrl,
        mimeType,
        timestamp: Date.now(),
      };
    }
  } catch (err) {
    console.warn("[ExportAsset] Failed to cache dataUrl on window:", err);
  }

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback to toDataURL
            try {
              const dataUrl = canvas.toDataURL(mimeType, quality);
              const link = document.createElement("a");
              link.href = dataUrl;
              link.download = safeFilename;
              document.body.appendChild(link);
              link.click();
              setTimeout(() => {
                link.remove();
                resolve();
              }, 100);
            } catch (fallbackErr) {
              reject(fallbackErr);
            }
            return;
          }

          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = safeFilename;
          document.body.appendChild(link);
          link.click();

          // Retain blobUrl for 60s so Chrome/Firefox background download workers complete safely
          setTimeout(() => {
            link.remove();
            URL.revokeObjectURL(blobUrl);
            resolve();
          }, 60000);

          resolve();
        },
        mimeType,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}
