import { useEffect, useMemo, useRef, useState } from "react";

const SCALE_OPTIONS = [25, 40, 50, 60, 75, 100];

function getElementText(element, previewData) {
  const firstTextValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value) !== "") return String(value);
    }
    return "";
  };
  const key = element.dataKey || element.dataSource || element.field || element.key || element.id;
  if (key === "programName") return firstTextValue(previewData?.programName, element.content, element.text, element.value, element.label, "Elocution English Kids");
  if (key === "category" || key === "programCategory") return firstTextValue(previewData?.category, previewData?.programCategory, element.content, element.text, element.value, element.label, "General");
  if (key === "resultNumber") return `${element.prefix || "Result #"}${firstTextValue(previewData?.resultNumber, element.content, element.text, element.value, "23")}`;
  if (key === "manual" || element.dataSource === "manual") {
    return firstTextValue(previewData?.customFields?.[element.id], previewData?.[element.id], element.content, element.text, element.value, element.label);
  }
  return firstTextValue(
    previewData?.customFields?.[element.id],
    previewData?.[key],
    previewData?.[element.id],
    element.content,
    element.text,
    element.value,
    element.label
  );
}

function getCanvasValue(canvas, key, fallback) {
  if (!canvas) return fallback;
  return canvas[key] ?? canvas?.canvas?.[key] ?? fallback;
}

function normalizeObjectFit(value) {
  const normalized = String(value || "cover").toLowerCase();
  if (["fill", "contain", "cover"].includes(normalized)) return normalized;
  return "cover";
}

export default function LivePreviewCanvas({
  canvasRef,
  previewContainerRef,
  canvas = {},
  elements = [],
  previewData = {},
  selectedElementId,
  setSelectedElementId,
  onSelectElement,
  updateElement,
  onUpdateElement,
  setElements,
  scale = 60,
  scalePercent,
  setScale,
  setScalePercent,
  showGrid,
  grid,
  setShowGrid,
  setGrid,
}) {
  const localPreviewRef = useRef(null);
  const dragState = useRef(null);
  const [internalScale, setInternalScale] = useState(Number(scalePercent ?? scale ?? 60));

  const previewRef = previewContainerRef || localPreviewRef;
  const scalePercentValue = Number(scalePercent ?? scale ?? internalScale ?? 60);
  const visualScale = Math.max(scalePercentValue / 100, 0.25);
  const canvasWidth = Number(getCanvasValue(canvas, "width", 800));
  const canvasHeight = Number(getCanvasValue(canvas, "height", 600));
  const backgroundImage = getCanvasValue(canvas, "backgroundImage", null);
  const gridEnabled = Boolean(showGrid ?? grid);

  const canvasStyle = useMemo(
    () => ({
      width: canvasWidth,
      height: canvasHeight,
      position: "relative",
      overflow: "hidden",
      background: backgroundImage ? "transparent" : "#e5e7eb",
      transform: `scale(${visualScale})`,
      transformOrigin: "top left",
      flex: "0 0 auto",
      backgroundImage: gridEnabled
        ? "linear-gradient(rgba(37,99,235,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.12) 1px, transparent 1px)"
        : undefined,
      backgroundSize: gridEnabled ? "24px 24px" : undefined,
    }),
    [backgroundImage, canvasHeight, canvasWidth, gridEnabled, visualScale],
  );

  function commitScale(nextScale) {
    const rounded = Math.max(25, Math.min(100, Math.round(nextScale)));
    setInternalScale(rounded);
    if (typeof setScale === "function") setScale(rounded);
    if (typeof setScalePercent === "function") setScalePercent(rounded);
  }

  function commitElement(id, patch) {
    if (typeof updateElement === "function") updateElement(id, patch);
    if (typeof onUpdateElement === "function") onUpdateElement(id, patch);
    if (typeof setElements === "function") {
      setElements((current) =>
        current.map((element) => (element.id === id ? { ...element, ...patch } : element)),
      );
    }
  }

  function selectElement(id) {
    if (typeof setSelectedElementId === "function") setSelectedElementId(id);
    if (typeof onSelectElement === "function") onSelectElement(id);
  }

  useEffect(() => {
    if (!canvasWidth || !canvasHeight) return;

    const frame = requestAnimationFrame(() => {
      const previewNode = previewRef.current;
      if (!previewNode) return;

      const previewContainerWidth = Math.max(previewNode.clientWidth - 32, 1);
      const previewContainerHeight = Math.max(previewNode.clientHeight - 32, 1);
      const fitScale = Math.min(
        previewContainerWidth / canvasWidth,
        previewContainerHeight / canvasHeight,
        1,
      );
      const safeScale = Math.max(fitScale, 0.25);
      commitScale(safeScale * 100);
    });

    return () => cancelAnimationFrame(frame);
  }, [backgroundImage, canvasHeight, canvasWidth]);

  useEffect(() => {
    function handlePointerMove(event) {
      if (!dragState.current) return;
      const { id, startX, startY, originalX, originalY } = dragState.current;
      const nextX = originalX + (event.clientX - startX) / visualScale;
      const nextY = originalY + (event.clientY - startY) / visualScale;
      commitElement(id, { x: Math.round(nextX), y: Math.round(nextY) });
    }

    function handlePointerUp() {
      dragState.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [visualScale]);

  function startDrag(event, element) {
    event.preventDefault();
    event.stopPropagation();
    selectElement(element.id);
    dragState.current = {
      id: element.id,
      startX: event.clientX,
      startY: event.clientY,
      originalX: Number(element.x || 0),
      originalY: Number(element.y || 0),
    };
  }

  function renderImageElement(element, winner) {
    const source =
      element.image ||
      element.src ||
      element.url ||
      element.preview ||
      winner?.image ||
      winner?.photo ||
      null;

    return (
      <div
        key={`${element.id}-${winner?.id || "single"}`}
        className={`image-element ${selectedElementId === element.id ? "selected" : ""}`}
        onPointerDown={(event) => startDrag(event, element)}
        style={{
          position: "absolute",
          left: Number(element.x || 0),
          top: Number(element.y || 0),
          width: Number(element.width || 80),
          height: Number(element.height || 80),
          opacity: element.opacity ?? 1,
          borderRadius: Number(element.borderRadius || 0),
          overflow: "hidden",
          outline: selectedElementId === element.id ? "2px solid #2563eb" : "none",
          cursor: "move",
        }}
      >
        {source ? (
          <img
            src={source}
            alt=""
            draggable="false"
            style={{
              width: "100%",
              height: "100%",
              objectFit: normalizeObjectFit(element.objectFit),
              display: "block",
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-white text-[10px] text-slate-500">
            No image
          </div>
        )}
      </div>
    );
  }

  function renderTextElement(element, text, extra = {}) {
    return (
      <div
        key={`${element.id}-${extra.key || "single"}`}
        onPointerDown={(event) => startDrag(event, element)}
        style={{
          position: "absolute",
          left: Number(element.x || 0) + Number(extra.x || 0),
          top: Number(element.y || 0) + Number(extra.y || 0),
          width: element.width || "auto",
          minHeight: element.height || "auto",
          fontFamily: element.fontFamily || "Inter, sans-serif",
          fontSize: Number(element.fontSize || 16),
          fontWeight: element.fontWeight || 500,
          color: element.color || "#0d1b2a",
          lineHeight: element.lineHeight || 1.2,
          textAlign: element.textAlign || "left",
          opacity: element.opacity ?? 1,
          transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
          outline: selectedElementId === element.id ? "2px solid #2563eb" : "none",
          cursor: "move",
          whiteSpace: "pre-wrap",
          userSelect: "none",
          ...extra.style,
        }}
      >
        {text}
      </div>
    );
  }

  function renderWinnerContainer(container) {
    const winners = previewData?.winners?.length
      ? previewData.winners
      : [
          { position: "1", name: "Muhammed Saeed", team: "Vadi Badr" },
          { position: "2", name: "Jabbar Ibraheem", team: "Isfahan" },
          { position: "3", name: "Ali bin Muhammed", team: "Vadi Quba" },
        ];
    const spacing = Number(container.spacing || 56);
    const positionElement = elements.find((element) => element.dataKey === "winner.position");
    const nameElement = elements.find((element) => element.dataKey === "winner.name");
    const teamElement = elements.find((element) => element.dataKey === "winner.team");
    const photoElement = elements.find((element) => element.dataKey === "winner.photo");

    return (
      <div
        key={container.id}
        onPointerDown={(event) => startDrag(event, container)}
        style={{
          position: "absolute",
          left: Number(container.x || 0),
          top: Number(container.y || 0),
          width: Number(container.width || 420),
          height: Math.max(Number(container.height || 0), winners.length * spacing),
          outline: selectedElementId === container.id ? "1px dashed #2563eb" : "none",
          cursor: "move",
        }}
      >
        {winners.map((winner, index) => {
          const rowY = index * spacing;
          return (
            <div key={winner.id || index}>
              {positionElement &&
                renderTextElement(positionElement, winner.position || String(index + 1), {
                  key: `pos-${index}`,
                  x: -Number(container.x || 0),
                  y: rowY - Number(container.y || 0),
                })}
              {nameElement &&
                renderTextElement(nameElement, winner.name || "", {
                  key: `name-${index}`,
                  x: -Number(container.x || 0),
                  y: rowY - Number(container.y || 0),
                })}
              {teamElement &&
                renderTextElement(teamElement, winner.team || "", {
                  key: `team-${index}`,
                  x: -Number(container.x || 0),
                  y: rowY - Number(container.y || 0),
                })}
              {photoElement && renderImageElement({ ...photoElement, y: Number(photoElement.y || 0) + rowY }, winner)}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <section className="preview-panel">
      <div className="preview-head">
        <h2>Live Preview</h2>
        <div className="preview-controls">
          <span className="text-xs text-slate-500">
            Canvas: {canvasWidth}x{canvasHeight}px
          </span>
          <select
            value={scalePercentValue}
            onChange={(event) => commitScale(Number(event.target.value))}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm"
          >
            {SCALE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Scaled to {option}%
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            Grid
            <input
              type="checkbox"
              checked={gridEnabled}
              onChange={(event) => {
                if (typeof setShowGrid === "function") setShowGrid(event.target.checked);
                if (typeof setGrid === "function") setGrid(event.target.checked);
              }}
            />
          </label>
        </div>
      </div>

      <div
        ref={previewRef}
        className="canvas-wrap canvas-scroll-area"
        style={{ overflow: "auto" }}
        onClick={() => selectElement(null)}
      >
        <div
          style={{
            width: canvasWidth * visualScale,
            height: canvasHeight * visualScale,
            position: "relative",
            flex: "0 0 auto",
          }}
        >
          <div ref={canvasRef} className="poster-canvas live-preview-canvas" style={canvasStyle}>
            {backgroundImage && (
              <img
                className="background-image"
                src={backgroundImage}
                alt=""
                draggable="false"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "fill",
                  display: "block",
                }}
              />
            )}

            {elements
              .filter((element) => element.visible !== false)
              .map((element) => {
                if (element.type === "winnerContainer" || element.dataKey === "winnerContainer") {
                  return renderWinnerContainer(element);
                }
                if (String(element.type || "").includes("image") || String(element.dataKey || "").includes("photo")) {
                  return renderImageElement(element);
                }
                if (String(element.dataKey || "").startsWith("winner.")) return null;
                return renderTextElement(element, getElementText(element, previewData));
              })}
          </div>
        </div>
      </div>
    </section>
  );
}
