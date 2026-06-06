import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BarChart3, Download, Edit, Eye, Plus, Trash2, X } from "lucide-react";
import NoActiveEventState from "../components/NoActiveEventState.jsx";
import { getEvents } from "../services/eventsService.js";
import { resolveActiveEventFromEvents } from "../services/activeEventService.js";
import { getTeamsByEvent } from "../services/teamsService.js";
import { getCategoriesByEvent } from "../services/categoriesService.js";
import { getParticipantsByEvent } from "../services/participantsService.js";
import { listProgramTemplatesByEvent } from "../services/programTemplatesService.js";
import {
  createProgramResult,
  deleteProgramResult,
  listProgramResultsByEvent,
  updateProgramResult,
} from "../services/programResultsService.js";

const FALLBACK_TEAMS = ["Alpha"];
const CUSTOM_WINNER_VALUE = "__custom__";
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const defaultWinners = () => [1, 2, 3].map((position) => ({
  id: uid(),
  position: String(position),
  name: `Winner ${position}`,
  team: "Alpha",
  grade: "",
  isGroupProgram: false,
  imageName: "",
}));
const emptyForm = () => ({
  programName: "New Program",
  category: "",
  categoryId: "",
  categoryName: "",
  resultNumber: "1",
  winners: defaultWinners(),
});
const getTemplateAccent = (template) =>
  template?.accentColor ||
  template?.primaryColor ||
  template?.color ||
  template?.backgroundColor ||
  template?.bgColor ||
  "#f7f7f7";
const getTemplateElements = (template) => {
  const candidates = [
    template?.elements,
    template?.objects,
    template?.layers,
    template?.items,
    template?.components,
    template?.fields,
    template?.textElements,
    template?.imageElements,
    template?.shapeElements,
    template?.canvasObjects,
    template?.fabricObjects,
    template?.konvaObjects,
    template?.layout?.elements,
    template?.layout?.objects,
    template?.layout?.items,
    template?.layout?.components,
    template?.canvas?.elements,
    template?.canvas?.objects,
    template?.canvas?.items,
    template?.design?.elements,
    template?.design?.objects,
    template?.design?.items,
    template?.template?.elements,
    template?.template?.objects,
    template?.template?.items,
  ];
  const direct = candidates.filter(Array.isArray).flat();
  if (direct.length) return direct;

  const found = [];
  const visit = (value, depth = 0) => {
    if (!value || typeof value !== "object" || depth > 5) return;
    if (Array.isArray(value)) {
      const elementLike = value.filter(
        (item) =>
          item &&
          typeof item === "object" &&
          (item.type ||
            item.kind ||
            item.x !== undefined ||
            item.y !== undefined ||
            item.left !== undefined ||
            item.top !== undefined ||
            item.text !== undefined ||
            item.content !== undefined ||
            item.src ||
            item.imageUrl)
      );
      if (elementLike.length) found.push(...elementLike);
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    Object.values(value).forEach((item) => visit(item, depth + 1));
  };
  visit(template);
  return found;
};
const getCanvasSize = (template) => ({
  width: Number(template?.width || template?.canvasWidth || template?.stageWidth || template?.size?.width || template?.canvas?.width || template?.layout?.width || template?.design?.width || template?.template?.width || 1080),
  height: Number(template?.height || template?.canvasHeight || template?.stageHeight || template?.size?.height || template?.canvas?.height || template?.layout?.height || template?.design?.height || template?.template?.height || 1350),
});
const getTemplateBackground = (template) => {
  const image =
    template?.backgroundImage ||
    template?.backgroundUrl ||
    template?.background ||
    template?.bgImage ||
    template?.bgUrl ||
    template?.canvas?.backgroundImage ||
    template?.canvas?.background ||
    template?.layout?.backgroundImage ||
    template?.layout?.background ||
    template?.design?.backgroundImage ||
    template?.previewImage ||
    template?.previewUrl ||
    template?.preview ||
    template?.thumbnail ||
    template?.thumbnailUrl ||
    template?.imageUrl;
  const color =
    template?.backgroundColor ||
    template?.bgColor ||
    template?.canvas?.backgroundColor ||
    template?.layout?.backgroundColor ||
    template?.design?.backgroundColor ||
    getTemplateAccent(template);
  return { image, color };
};
const replaceResultTokens = (markup, result) => {
  let output = String(markup || "");
  const winners = result.winners || [];
  const replacements = {
    "{{programName}}": result.programName,
    "{{program_name}}": result.programName,
    "{{category}}": result.category,
    "{{programCategory}}": result.category,
    "{{resultNumber}}": result.resultNumber,
    "{{result_number}}": result.resultNumber,
  };
  Object.entries(replacements).forEach(([token, value]) => {
    output = output.split(token).join(value || "");
  });
  winners.forEach((winner, index) => {
    const number = index + 1;
    output = output.split(`{{winner${number}Position}}`).join(winner.position || "");
    output = output.split(`{{winner${number}Name}}`).join(winner.name || "");
    output = output.split(`{{winner${number}Team}}`).join(winner.team || "");
  });
  const oldSamplePatterns = [
    /Elocution English Kids/gi,
    /Elocation Arabic/gi,
    /Elocution Arabic/gi,
    /Story writing/gi,
    /Result No:\s*\d+/gi,
    /Result #\s*\d+/gi,
    /Muhammed Saeed/gi,
    /Jabbar Ibraheem/gi,
    /Ali bin Muhammed/gi,
  ];
  const oldSampleValues = [
    result.programName,
    result.programName,
    result.programName,
    result.programName,
    `Result No: ${result.resultNumber}`,
    `Result #${result.resultNumber}`,
    winners[0]?.name || "",
    winners[1]?.name || "",
    winners[2]?.name || "",
  ];
  oldSamplePatterns.forEach((pattern, index) => {
    output = output.replace(pattern, oldSampleValues[index] || "");
  });
  return output;
};
const getRenderedTemplateMarkup = (template) =>
  pick(
    template?.renderedHtml,
    template?.previewHtml,
    template?.html,
    template?.markup,
    template?.svg,
    template?.renderedSvg,
    template?.design?.html,
    template?.design?.markup,
    template?.design?.svg,
    template?.preview?.html,
    template?.preview?.svg,
    template?.template?.html,
    template?.template?.markup
  );
const normalizeText = (value) => String(value || "").toLowerCase();
const pick = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");
const pxToPreview = (value, base, previewBase = 256) => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && value.includes("%")) return value;
  const numeric = Number(String(value).replace("px", ""));
  if (Number.isNaN(numeric)) return value;
  return `${((numeric / base) * previewBase).toFixed(2)}px`;
};
const getElementText = (element) =>
  pick(
    element?.text,
    element?.content,
    element?.value,
    element?.label,
    element?.props?.text,
    element?.props?.content,
    element?.attrs?.text,
    element?.data?.text
  );
const resultValueForElement = (element, result) => {
  const key = normalizeText(
    pick(
      element?.key,
      element?.field,
      element?.dataKey,
      element?.bindTo,
      element?.binding,
      element?.name,
      element?.id,
      element?.label,
      element?.type,
      element?.props?.field,
      element?.props?.dataKey
    )
  );
  const originalText = getElementText(element);
  const text = normalizeText(originalText || element?.placeholder);
  const source = `${key} ${text}`;

  const winnerIndex =
    Number(element?.winnerIndex ?? element?.winnerNumber ?? element?.index ?? 0) ||
    Number((source.match(/(?:winner|rank|position|name|team|photo|image)[^0-9]*(\d+)/) || [])[1] || 1);
  const winner = result.winners?.[Math.max(0, winnerIndex - 1)] || result.winners?.[0];

  if (source.includes("program") && !source.includes("group")) return result.programName;
  if (source.includes("category")) return result.category;
  if (source.includes("result")) return `Result No: ${result.resultNumber}`;
  if (source.includes("winner") || source.includes("name") || source.includes("position") || source.includes("team")) {
    if (!winner) return "";
    if (source.includes("position")) return winner.position;
    if (source.includes("team")) return winner.team;
    if (source.includes("winner") && !source.includes("name")) return `${winner.position || ""} ${winner.name || ""}`.trim();
    return winner.name;
  }

  if (text.includes("elocution") || text.includes("story") || text.includes("writing")) return result.programName;
  if (text.includes("general") || text.includes("lower") || text.includes("primary") || text.includes("school")) return result.category;
  return originalText ?? "";
};
const elementStyle = (element, canvas) => {
  const style = element?.style || element?.styles || element?.css || {};
  const position = element?.position || element?.pos || {};
  const size = element?.size || element?.dimensions || {};
  const attrs = element?.attrs || {};
  const scaleX = Number(element?.scaleX ?? style.scaleX ?? 1);
  const scaleY = Number(element?.scaleY ?? style.scaleY ?? 1);
  const left = Number(pick(element?.x, element?.left, position?.x, position?.left, attrs?.x, style.left, 0));
  const top = Number(pick(element?.y, element?.top, position?.y, position?.top, attrs?.y, style.top, 0));
  const width = pick(element?.width, element?.w, size?.width, attrs?.width, style.width);
  const height = pick(element?.height, element?.h, size?.height, attrs?.height, style.height);
  const fontSize = Number(String(pick(element?.fontSize, attrs?.fontSize, style.fontSize, 36)).replace("px", ""));
  const rotation = Number(pick(element?.rotation, element?.angle, attrs?.rotation, style.rotate, 0));
  const radius = element?.borderRadius ?? element?.radius ?? element?.rx ?? style.borderRadius;
  return {
    position: "absolute",
    left: `${(left / canvas.width) * 100}%`,
    top: `${(top / canvas.height) * 100}%`,
    width: width ? `${((Number(width) * scaleX) / canvas.width) * 100}%` : "auto",
    height: height ? `${((Number(height) * scaleY) / canvas.height) * 100}%` : "auto",
    color: pick(element?.color, element?.textColor, element?.fill, attrs?.fill, style.color),
    background: pick(element?.background, element?.backgroundColor, element?.fillColor, style.background, style.backgroundColor),
    border: element?.border || style.border,
    borderRadius: radius,
    fontFamily: pick(element?.fontFamily, attrs?.fontFamily, style.fontFamily),
    fontSize: pxToPreview(fontSize, canvas.width),
    fontWeight: pick(element?.fontWeight, attrs?.fontStyle, style.fontWeight),
    fontStyle: pick(element?.fontStyle, attrs?.fontStyle, style.fontStyle),
    lineHeight: pxToPreview(pick(element?.lineHeight, style.lineHeight), canvas.width) || element?.lineHeight || style.lineHeight,
    letterSpacing: element?.letterSpacing || style.letterSpacing,
    textAlign: pick(element?.textAlign, element?.align, attrs?.align, style.textAlign),
    transform: rotation ? `rotate(${rotation}deg)` : style.transform,
    transformOrigin: element?.transformOrigin || "top left",
    opacity: pick(element?.opacity, attrs?.opacity, style.opacity),
    objectFit: pick(element?.objectFit, style.objectFit, "cover"),
    zIndex: pick(element?.zIndex, element?.order, style.zIndex),
    whiteSpace: "pre-wrap",
    overflow: "hidden",
  };
};
const renderWinnerContainer = (element, result, canvas) => {
  const style = elementStyle(element, canvas);
  const rowStyle = element?.rowStyle || element?.winnerRowStyle || element?.styles?.row || {};
  const nameStyle = element?.nameStyle || element?.styles?.name || {};
  const teamStyle = element?.teamStyle || element?.styles?.team || {};
  const positionStyle = element?.positionStyle || element?.styles?.position || {};

  return (
    <div style={style}>
      {(result.winners || []).map((winner) => (
        <div key={winner.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 6, alignItems: "center", marginBottom: 4, ...rowStyle }}>
          <span style={positionStyle}>{winner.position}</span>
          <span style={nameStyle}>{winner.name}</span>
          <span style={teamStyle}>{winner.team}</span>
        </div>
      ))}
    </div>
  );
};
const hasEditorSchema = (template) =>
  template?.canvas &&
  Array.isArray(template?.elements) &&
  (template.elements.some((element) => element?.type === "winnerContainer") ||
    template.elements.some((element) => ["text", "image", "winnerText", "winnerPhoto"].includes(element?.type)));
const schemaTextValue = (element, result, winner = null) => {
  const firstTextValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value) !== "") return String(value);
    }
    return "";
  };
  const key = normalizeText(
    pick(element?.field, element?.dataKey, element?.dataSource, element?.key, element?.name, element?.id, element?.label, element?.content, element?.text, element?.value)
  );

  if (winner) {
    if (key.includes("position")) return firstTextValue(winner.position, element?.content, element?.text, element?.value, element?.label);
    if (key.includes("team")) return firstTextValue(winner.team, winner.teamName, element?.content, element?.text, element?.value, element?.label);
    if (key.includes("name")) return firstTextValue(winner.name, element?.content, element?.text, element?.value, element?.label);
    return firstTextValue(element?.content, element?.text, element?.value, element?.label);
  }

  if (key.includes("programname") || key.includes("program name") || key === "program") return firstTextValue(result.programName, element?.content, element?.text, element?.value, element?.label);
  if (key.includes("category")) return firstTextValue(result.category, result.programCategory, element?.content, element?.text, element?.value, element?.label);
  if (key.includes("eventname") || key.includes("event name")) return firstTextValue(result.eventName, result.event?.name, element?.content, element?.text, element?.value, element?.label);
  if (key.includes("organizer")) return firstTextValue(result.organizerName, result.organizer, element?.content, element?.text, element?.value, element?.label);
  if (key.includes("eventdate") || key.includes("event date")) return firstTextValue(result.eventDate, element?.content, element?.text, element?.value, element?.label);
  if (key.includes("eventlocation") || key.includes("event location")) return firstTextValue(result.eventLocation, element?.content, element?.text, element?.value, element?.label);
  if (key.includes("resultnumber") || key.includes("result number") || key.includes("result")) {
    return `${element?.prefix || ""}${firstTextValue(result.resultNumber, element?.content, element?.text, element?.value)}`;
  }

  return firstTextValue(result?.[element?.dataKey], result?.[element?.dataSource], result?.[element?.field], element?.content, element?.text, element?.value, element?.label);
};
const schemaElementStyle = (element, offset = { x: 0, y: 0 }) => ({
  position: "absolute",
  left: `${(Number(element.x || 0) + offset.x).toFixed(2)}px`,
  top: `${(Number(element.y || 0) + offset.y).toFixed(2)}px`,
  width: element.width !== undefined ? `${Number(element.width)}px` : "auto",
  height: element.height !== undefined ? `${Number(element.height)}px` : "auto",
  fontFamily: element.fontFamily,
  fontSize: element.fontSize !== undefined ? `${Number(element.fontSize)}px` : undefined,
  fontWeight: element.fontWeight,
  color: element.color,
  lineHeight: element.lineHeight,
  textAlign: element.textAlign,
  opacity: element.opacity,
  borderRadius: element.borderRadius !== undefined ? `${Number(element.borderRadius)}px` : undefined,
  objectFit: element.objectFit || "cover",
  transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
  zIndex: element.zIndex,
  whiteSpace: "pre-wrap",
  overflow: "hidden",
});
const renderEditorSchemaElement = (element, result, winner = null, offset = { x: 0, y: 0 }) => {
  const style = schemaElementStyle(element, offset);
  if (element.type === "image") {
    const src = element.src || element.url || element.image || element.imageUrl;
    return src ? <img key={element.id || `${element.type}-${element.x}-${element.y}`} src={src} alt="" style={style} /> : null;
  }
  if (element.type === "winnerPhoto") {
    const src = winner?.image || winner?.imageUrl || winner?.photo || winner?.photoUrl || element.src || element.url || element.imageUrl;
    return src ? <img key={`${winner?.id || "winner"}-${element.id}`} src={src} alt="" style={style} /> : null;
  }
  if (element.type === "text" || element.type === "winnerText") {
    return (
      <div
        key={`${winner?.id || "base"}-${element.id || element.field || element.x}`}
        style={{
          ...style,
          height: undefined,
          minHeight: style.height,
          whiteSpace: "pre-line",
          overflow: "visible",
          boxSizing: "border-box",
        }}
      >
        {schemaTextValue(element, result, winner)}
      </div>
    );
  }
  return null;
};
const PosterCanvas = ({ template, result, scale = 1, posterId }) => {
  const canvas = template.canvas || {};
  const width = Number(canvas.width || 1080);
  const height = Number(canvas.height || 1350);
  const backgroundImage = canvas.backgroundImage;
  const backgroundColor = canvas.backgroundColor || template.backgroundColor || "#ffffff";
  const winnerContainer =
    template.elements.find((element) => element.id === "winnerContainer") ||
    template.elements.find((element) => element.type === "winnerContainer");
  const winnerChildren = template.elements.filter((element) => element.type === "winnerText" || element.type === "winnerPhoto");
  const baseElements = template.elements.filter(
    (element) => !["winnerContainer", "winnerText", "winnerPhoto"].includes(element.type)
  );

  return (
    <div
      className="schema-template-preview poster-capture-wrapper"
      data-poster-id={posterId}
      style={{ width: width * scale, height: height * scale, position: "relative", overflow: "hidden" }}
    >
      <div
        className="schema-template-canvas"
        data-poster-canvas="true"
        style={{
          width,
          height,
          backgroundColor,
          transform: scale === 1 ? "none" : `scale(${scale})`,
          transformOrigin: "top left",
          margin: 0,
          padding: 0,
          border: 0,
          boxSizing: "border-box",
          maxWidth: "none",
          maxHeight: "none",
        }}
      >
        {backgroundImage ? <img className="schema-template-bg" src={backgroundImage} alt="" /> : null}
        {baseElements.map((element) => renderEditorSchemaElement(element, result))}
        {winnerContainer && winnerChildren.length
          ? (result.winners || []).flatMap((winner, index) => {
              const spacing = Number(winnerContainer.spacing || 0);
              const direction = winnerContainer.direction || "vertical";
              const offset =
                direction === "horizontal"
                  ? { x: Number(winnerContainer.x || 0) + index * spacing, y: Number(winnerContainer.y || 0) }
                  : { x: Number(winnerContainer.x || 0), y: Number(winnerContainer.y || 0) + index * spacing };
              return winnerChildren.map((child) => renderEditorSchemaElement(child, result, winner, offset));
            })
          : null}
      </div>
    </div>
  );
};
const renderEditorSchemaTemplate = (template, result) => {
  const width = Number(template.canvas?.width || 1080);
  return <PosterCanvas template={template} result={result} scale={256 / width} posterId={`${result.id}-${template.id}`} />;
};
const waitForImages = async (root) => {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.onload = resolve;
              image.onerror = resolve;
            })
    )
  );
};
const applyDomStyles = (node, styles) => {
  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") node.style[key] = value;
  });
};
const createExportElementNode = (element, result, winner = null, offset = { x: 0, y: 0 }) => {
  const style = schemaElementStyle(element, offset);
  const isImage = element.type === "image" || element.type === "winnerPhoto";
  const node = document.createElement(isImage ? "img" : "div");

  if (isImage) {
    applyDomStyles(node, style);
    const src =
      element.type === "winnerPhoto"
        ? winner?.image || winner?.imageUrl || winner?.photo || winner?.photoUrl || element.src || element.url || element.imageUrl
        : element.src || element.url || element.image || element.imageUrl;
    if (src) node.src = src;
    node.alt = "";
    node.crossOrigin = "anonymous";
  } else {
    applyDomStyles(node, {
      position: "absolute",
      left: style.left,
      top: style.top,
      width: style.width,
      minHeight: style.height,
      fontFamily: element.fontFamily,
      fontSize: element.fontSize !== undefined ? `${Number(element.fontSize)}px` : undefined,
      fontWeight: element.fontWeight,
      color: element.color,
      lineHeight: element.lineHeight,
      textAlign: element.textAlign,
      opacity: element.opacity,
      transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
      transformOrigin: "top left",
      zIndex: element.zIndex,
      whiteSpace: "pre-line",
      overflow: "visible",
      boxSizing: "border-box",
    });
    node.textContent = schemaTextValue(element, result, winner);
  }

  return node;
};
const createExportPosterElement = (template, result) => {
  const canvas = template.canvas || {};
  const width = Number(canvas.width || 1080);
  const height = Number(canvas.height || 1350);
  const wrapper = document.createElement("div");
  applyDomStyles(wrapper, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    pointerEvents: "none",
    opacity: "1",
  });

  const poster = document.createElement("div");
  applyDomStyles(poster, {
    position: "relative",
    width: `${width}px`,
    height: `${height}px`,
    overflow: "hidden",
    backgroundColor: canvas.backgroundColor || template.backgroundColor || "#ffffff",
  });

  if (canvas.backgroundImage) {
    const bg = document.createElement("img");
    bg.src = canvas.backgroundImage;
    bg.alt = "";
    bg.crossOrigin = "anonymous";
    applyDomStyles(bg, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      objectFit: "cover",
    });
    poster.appendChild(bg);
  }

  if (hasEditorSchema(template)) {
    const winnerContainer =
      template.elements.find((element) => element.id === "winnerContainer") ||
      template.elements.find((element) => element.type === "winnerContainer");
    const winnerChildren = template.elements.filter(
      (element) => element.type === "winnerText" || element.type === "winnerPhoto"
    );
    const baseElements = template.elements.filter(
      (element) => !["winnerContainer", "winnerText", "winnerPhoto"].includes(element.type)
    );

    baseElements.forEach((element) => {
      const node = createExportElementNode(element, result);
      if (node) poster.appendChild(node);
    });

    if (winnerContainer && winnerChildren.length) {
      (result.winners || []).forEach((winner, index) => {
        const spacing = Number(winnerContainer.spacing || 0);
        const direction = winnerContainer.direction || "vertical";
        const offset =
          direction === "horizontal"
            ? { x: Number(winnerContainer.x || 0) + index * spacing, y: Number(winnerContainer.y || 0) }
            : { x: Number(winnerContainer.x || 0), y: Number(winnerContainer.y || 0) + index * spacing };
        winnerChildren.forEach((child) => {
          const node = createExportElementNode(child, result, winner, offset);
          if (node) poster.appendChild(node);
        });
      });
    }
  }

  wrapper.appendChild(poster);
  return { wrapper, poster };
};
const renderTemplateWithResult = (template, result) => {
  const elements = getTemplateElements(template);
  const canvas = getCanvasSize(template);
  const background = getTemplateBackground(template);
  const savedMarkup = getRenderedTemplateMarkup(template);

  if (hasEditorSchema(template)) {
    return renderEditorSchemaTemplate(template, result);
  }

  if (savedMarkup && !elements.length) {
    return (
      <div
        className="poster-preview saved-template-preview"
        style={{ backgroundColor: background.color }}
        dangerouslySetInnerHTML={{ __html: replaceResultTokens(savedMarkup, result) }}
      />
    );
  }

  return (
    <div className="poster-preview saved-template-preview" style={{ backgroundColor: background.color }}>
      {background.image ? <img className="saved-template-bg" src={background.image} alt="" /> : null}
      {elements.length ? (
        elements.map((element, index) => {
          const type = normalizeText(element.type || element.kind);
          const source = normalizeText(element?.key || element?.field || element?.dataKey || element?.name || element?.id || element?.label || element?.text);
          const winnerIndex = Number((source.match(/(?:winner|photo|image)[^0-9]*(\d+)/) || [])[1] || 1);
          const winner = result.winners?.[Math.max(0, winnerIndex - 1)] || result.winners?.[0];
          const winnerImage = winner?.image || winner?.imageUrl || winner?.photo || winner?.photoUrl;
          const src = source.includes("winner") && source.includes("image") && winnerImage ? winnerImage : element.src || element.url || element.image || element.imageUrl || element.attrs?.src;
          if (type.includes("image") && src) {
            return <img key={element.id || index} src={src} alt="" style={elementStyle(element, canvas)} />;
          }
          if (source.includes("winner") && (source.includes("container") || source.includes("list") || type.includes("list"))) {
            return <React.Fragment key={element.id || index}>{renderWinnerContainer(element, result, canvas)}</React.Fragment>;
          }
          if (type.includes("shape") || type.includes("rect") || type.includes("circle")) {
            return <div key={element.id || index} style={{ ...elementStyle(element, canvas), background: element.fill || element.backgroundColor || element.color, borderRadius: type.includes("circle") ? "50%" : element.borderRadius }} />;
          }
          return (
            <div key={element.id || index} style={elementStyle(element, canvas)}>
              {resultValueForElement(element, result)}
            </div>
          );
        })
      ) : (
        <>
          <small>Result No: {result.resultNumber}</small>
          <strong>{result.category}</strong>
          <strong>{result.programName}</strong>
          <ol>{(result.winners || []).slice(0, 5).map((winner) => <li key={winner.id}>{winner.position} {winner.name}</li>)}</ol>
        </>
      )}
    </div>
  );
};

function ProgramResultsPage() {
  const [results, setResults] = useState([]);
  const [activeEvent, setActiveEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [teams, setTeams] = useState(FALLBACK_TEAMS);
  const [teamOptions, setTeamOptions] = useState(FALLBACK_TEAMS.map((name) => ({ id: name, name })));
  const [participants, setParticipants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All Status");
  const [sort, setSort] = useState("Sort by Date");
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const events = await getEvents();
        const { activeEvent: normalizedEvent } = resolveActiveEventFromEvents(events);

        if (!normalizedEvent?.id) {
          setActiveEvent(null);
          setCategories([]);
          setTeamOptions(FALLBACK_TEAMS.map((name) => ({ id: name, name })));
          setTeams(FALLBACK_TEAMS);
          setParticipants([]);
          setTemplates([]);
          setResults([]);
          return;
        }

        const [eventCategories, eventTeamOptions, eventParticipants, eventTemplates, eventResults] = await Promise.all([
          getCategoriesByEvent(normalizedEvent.id),
          getTeamsByEvent(normalizedEvent.id),
          getParticipantsByEvent(normalizedEvent.id),
          listProgramTemplatesByEvent(normalizedEvent.id),
          listProgramResultsByEvent(normalizedEvent.id),
        ]);

        setActiveEvent(normalizedEvent);
        setCategories(eventCategories);
        setTeamOptions(eventTeamOptions.length ? eventTeamOptions : FALLBACK_TEAMS.map((name) => ({ id: name, name })));
        setTeams(eventTeamOptions.length ? eventTeamOptions.map((team) => team.name) : FALLBACK_TEAMS);
        setParticipants(eventParticipants);
        setTemplates(eventTemplates);
        setResults(eventResults);
      } catch (loadError) {
        setError(loadError.message || "Unable to load program results.");
        setActiveEvent(null);
        setCategories([]);
        setTeamOptions(FALLBACK_TEAMS.map((name) => ({ id: name, name })));
        setTeams(FALLBACK_TEAMS);
        setParticipants([]);
        setTemplates([]);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }
    load();
    window.addEventListener("storage", load);
    window.addEventListener("rankify-data-changed", load);
    return () => {
      window.removeEventListener("storage", load);
      window.removeEventListener("rankify-data-changed", load);
    };
  }, []);

  const saveResults = (next) => {
    setResults(next);
    window.dispatchEvent(new Event("rankify-data-changed"));
  };
  const openView = (result) => {
    setViewing(result);
  };

  const hasActiveEvent = Boolean(activeEvent?.id);
  const eventResults = useMemo(() => (hasActiveEvent ? results.filter((item) => String(item.eventId) === String(activeEvent.id)) : []), [results, activeEvent?.id, hasActiveEvent]);
  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();
    let list = [...eventResults];
    if (query) {
      list = list.filter((item) => [item.programName, item.categoryName, item.category, item.resultNumber, ...(item.winners || []).flatMap((winner) => [winner.name, winner.team])].join(" ").toLowerCase().includes(query));
    }
    if (status === "Published") list = list.filter((item) => item.published);
    if (status === "Draft") list = list.filter((item) => !item.published);
    if (sort === "Oldest First") list.sort((a, b) => new Date(a.created) - new Date(b.created));
    else if (sort === "Program Name") list.sort((a, b) => String(a.programName).localeCompare(String(b.programName)));
    else list.sort((a, b) => new Date(b.created) - new Date(a.created));
    return list;
  }, [eventResults, search, status, sort]);

  const getTeamOption = (teamIdOrName) =>
    teamOptions.find(
      (team) =>
        String(team.id) === String(teamIdOrName) ||
        String(team.name) === String(teamIdOrName)
    ) || null;
  const getCategoryOption = (categoryIdOrName) =>
    categories.find(
      (category) =>
        String(category.id) === String(categoryIdOrName) ||
        String(category.name) === String(categoryIdOrName)
    ) || null;
  const getParticipantsForWinnerTeam = (winner) => {
    const selectedTeam = getTeamOption(winner.teamId || winner.team);
    if (!selectedTeam) return [];

    return participants.filter(
      (participant) =>
        String(participant.eventId) === String(activeEvent.id) &&
        String(participant.teamId) === String(selectedTeam.id)
    );
  };
  const normalizeWinnerForForm = (winner) => {
    const selectedTeam =
      getTeamOption(winner.teamId) ||
      getTeamOption(winner.teamName) ||
      getTeamOption(winner.team) ||
      teamOptions[0] ||
      { id: teams[0] || "Alpha", name: teams[0] || "Alpha" };
    const participant = winner.participantId
      ? participants.find(
          (item) =>
            String(item.id) === String(winner.participantId) &&
            String(item.teamId) === String(selectedTeam.id)
        )
      : null;
    const isCustomName = Boolean(!participant && String(winner.name || "").trim());

    return {
      id: winner.id || uid(),
      position: winner.position || "",
      name: participant?.name || winner.name || "",
      team: selectedTeam.name,
      teamId: selectedTeam.id,
      teamName: selectedTeam.name,
      participantId: participant?.id || "",
      isCustomName,
      grade: winner.grade || "",
      isGroupProgram: Boolean(winner.isGroupProgram),
      imageName: winner.imageName || "",
    };
  };

  const openCreate = () => {
    if (!hasActiveEvent) {
      alert("Please select an active event first.");
      return;
    }

    const next = emptyForm();
    const firstTeam = teamOptions[0] || { id: teams[0] || "Alpha", name: teams[0] || "Alpha" };
    const firstCategory = categories[0] || null;
    next.category = firstCategory?.name || "";
    next.categoryId = firstCategory?.id || "";
    next.categoryName = firstCategory?.name || "";
    next.winners = next.winners.map((winner) => ({
      ...winner,
      name: "",
      team: firstTeam.name,
      teamId: firstTeam.id,
      teamName: firstTeam.name,
      participantId: "",
      isCustomName: false,
    }));
    setForm(next);
    setEditingId(null);
    setModalMode("create");
  };
  const openEdit = (result) => {
    const selectedCategory =
      getCategoryOption(result.categoryId) ||
      getCategoryOption(result.categoryName) ||
      getCategoryOption(result.category);

    setForm({
      programName: result.programName || "",
      category: selectedCategory?.name || result.categoryName || result.category || "",
      categoryId: selectedCategory?.id || "",
      categoryName: selectedCategory?.name || result.categoryName || result.category || "",
      resultNumber: result.resultNumber || "",
      winners: (result.winners?.length ? result.winners : defaultWinners()).map(normalizeWinnerForForm),
    });
    setEditingId(result.id);
    setModalMode("edit");
  };
  const closeEditor = () => {
    setModalMode(null);
    setEditingId(null);
  };
  const updateWinner = (id, patch) => setForm((current) => ({ ...current, winners: current.winners.map((winner) => winner.id === id ? { ...winner, ...patch } : winner) }));
  const updateWinnerTeam = (id, teamId) => {
    const selectedTeam = getTeamOption(teamId);
    updateWinner(id, {
      team: selectedTeam?.name || "",
      teamId: selectedTeam?.id || "",
      teamName: selectedTeam?.name || "",
      participantId: "",
      name: "",
      isCustomName: false,
    });
  };
  const updateWinnerParticipant = (id, participantId) => {
    if (participantId === CUSTOM_WINNER_VALUE) {
      updateWinner(id, { participantId: "", name: "", isCustomName: true });
      return;
    }

    const participant = participants.find((item) => String(item.id) === String(participantId));
    updateWinner(id, {
      participantId: participant?.id || "",
      name: participant?.name || "",
      isCustomName: false,
    });
  };
  const removeWinner = (id) => setForm((current) => ({ ...current, winners: current.winners.length > 1 ? current.winners.filter((winner) => winner.id !== id) : current.winners }));
  const addWinner = () => setForm((current) => {
    const firstTeam = teamOptions[0] || { id: teams[0] || "Alpha", name: teams[0] || "Alpha" };
    return {
      ...current,
      winners: [
        ...current.winners,
        {
          id: uid(),
          position: String(current.winners.length + 1),
          name: "",
          team: firstTeam.name,
          teamId: firstTeam.id,
          teamName: firstTeam.name,
          participantId: "",
          isCustomName: false,
          grade: "",
          isGroupProgram: false,
          imageName: "",
        },
      ],
    };
  });

  const submitResult = async (event) => {
    event.preventDefault();
    const selectedCategory = getCategoryOption(form.categoryId);

    if (!selectedCategory) {
      alert("Please create or select a category first.");
      return;
    }

    const cleaned = {
      programName: form.programName.trim() || "Untitled Program",
      category: selectedCategory.name,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      resultNumber: String(form.resultNumber || "").trim() || "1",
      winners: form.winners.map((winner) => ({
        id: winner.id || uid(),
        position: String(winner.position || "").trim(),
        name: String(winner.name || "").trim(),
        team: winner.teamName || winner.team || teams[0] || "Alpha",
        teamId: winner.teamId || "",
        teamName: winner.teamName || winner.team || teams[0] || "Alpha",
        participantId: winner.isCustomName ? "" : winner.participantId || "",
        isCustomName: Boolean(winner.isCustomName),
        grade: String(winner.grade || "").trim(),
        isGroupProgram: Boolean(winner.isGroupProgram),
        imageName: winner.imageName || "",
      })),
    };
    try {
      if (modalMode === "edit") {
        const updated = await updateProgramResult(editingId, {
          ...results.find((item) => item.id === editingId),
          ...cleaned,
          eventId: activeEvent.id,
        });
        saveResults(results.map((item) => (item.id === editingId ? updated : item)));
      } else {
        const created = await createProgramResult(activeEvent.id, {
          eventId: activeEvent.id,
          ...cleaned,
          published: false,
          created: new Date().toISOString(),
        });
        saveResults([created, ...results]);
      }
      closeEditor();
    } catch (saveError) {
      setError(saveError.message || "Unable to save program result.");
    }
  };
  const togglePublished = async (id) => {
    const current = results.find((item) => item.id === id);
    if (!current) return;
    try {
      const updated = await updateProgramResult(id, { ...current, published: !current.published, eventId: activeEvent.id });
      saveResults(results.map((item) => (item.id === id ? updated : item)));
    } catch (saveError) {
      setError(saveError.message || "Unable to update result.");
    }
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProgramResult(deleting.id);
      saveResults(results.filter((item) => item.id !== deleting.id));
      setDeleting(null);
    } catch (deleteError) {
      setError(deleteError.message || "Unable to delete result.");
    }
  };
  const downloadPoster = async (template, result) => {
    let offscreen = null;
    let root = null;

    try {
      const canvasWidth = Number(template.canvas?.width || 1080);
      const canvasHeight = Number(template.canvas?.height || 1350);

      offscreen = document.createElement("div");
      offscreen.style.position = "fixed";
      offscreen.style.left = "-100000px";
      offscreen.style.top = "0";
      offscreen.style.width = `${canvasWidth}px`;
      offscreen.style.height = `${canvasHeight}px`;
      offscreen.style.opacity = "1";
      offscreen.style.pointerEvents = "none";
      offscreen.style.zIndex = "-1";
      document.body.appendChild(offscreen);

      root = createRoot(offscreen);
      root.render(
        <PosterCanvas
          template={template}
          result={result}
          scale={1}
          posterId="export-poster"
        />
      );

      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const poster = offscreen.querySelector('[data-poster-id="export-poster"]');
      if (!poster) throw new Error("Export poster was not rendered.");

      poster.style.border = "0";
      poster.style.borderRadius = "0";
      poster.style.width = `${canvasWidth}px`;
      poster.style.height = `${canvasHeight}px`;

      const { default: html2canvas } = await import("html2canvas");

      if (document.fonts?.ready) {
        await document.fonts.ready;
      }

      await waitForImages(poster);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const capturedCanvas = await html2canvas(poster, {
        backgroundColor: "#ffffff",
        scale: 2,
        width: canvasWidth,
        height: canvasHeight,
        windowWidth: canvasWidth,
        windowHeight: canvasHeight,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        allowTaint: true,
      });

      const image = capturedCanvas.toDataURL("image/jpeg", 0.95);

      const link = document.createElement("a");
      link.href = image;
      link.download = `${result.programName || "poster"}-${template.name || "template"}.jpg`
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, " ")
        .trim();

      link.click();
    } catch (error) {
      console.error("Unable to export poster as JPG.", error);
      alert("Unable to export JPG. Please check console.");
    } finally {
      if (root) root.unmount();
      if (offscreen) offscreen.remove();
    }
    return;
    const templateJson = JSON.stringify(template, null, 2).replace(/</g, "\\u003c");
    if (hasEditorSchema(template)) {
      const escape = (value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      const canvas = template.canvas || {};
      const width = Number(canvas.width || 1080);
      const height = Number(canvas.height || 1350);
      const winnerContainer =
        template.elements.find((element) => element.id === "winnerContainer") ||
        template.elements.find((element) => element.type === "winnerContainer");
      const winnerChildren = template.elements.filter((element) => element.type === "winnerText" || element.type === "winnerPhoto");
      const baseElements = template.elements.filter(
        (element) => !["winnerContainer", "winnerText", "winnerPhoto"].includes(element.type)
      );
      const cssFromStyle = (style) =>
        Object.entries(style)
          .filter(([, value]) => value !== undefined && value !== null && value !== "")
          .map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}`)
          .join(";");
      const elementHtml = (element, winner = null, offset = { x: 0, y: 0 }) => {
        const style = cssFromStyle(schemaElementStyle(element, offset));
        if (element.type === "image") {
          const src = element.src || element.url || element.image || element.imageUrl;
          return src ? `<img src="${escape(src)}" alt="" style="${style}">` : "";
        }
        if (element.type === "winnerPhoto") {
          const src = winner?.image || winner?.imageUrl || winner?.photo || winner?.photoUrl || element.src || element.url || element.imageUrl;
          return src ? `<img src="${escape(src)}" alt="" style="${style}">` : "";
        }
        return `<div style="${style}">${escape(schemaTextValue(element, result, winner))}</div>`;
      };
      const winnerHtml =
        winnerContainer && winnerChildren.length
          ? (result.winners || [])
              .flatMap((winner, index) => {
                const spacing = Number(winnerContainer.spacing || 0);
                const direction = winnerContainer.direction || "vertical";
                const offset =
                  direction === "horizontal"
                    ? { x: Number(winnerContainer.x || 0) + index * spacing, y: Number(winnerContainer.y || 0) }
                    : { x: Number(winnerContainer.x || 0), y: Number(winnerContainer.y || 0) + index * spacing };
                return winnerChildren.map((child) => elementHtml(child, winner, offset));
              })
              .join("")
          : "";
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escape(result.programName)}</title><style>body{margin:0;background:#eef2f6;display:grid;place-items:center;min-height:100vh;padding:32px}.poster{position:relative;width:${width}px;height:${height}px;background-color:${canvas.backgroundColor || template.backgroundColor || "#fff"};background-image:${canvas.backgroundImage ? `url(${canvas.backgroundImage})` : "none"};background-size:cover;background-position:center;overflow:hidden}</style></head><body><section class="poster">${baseElements.map((element) => elementHtml(element)).join("")}${winnerHtml}</section><details style="margin-top:24px;font:12px Arial;color:#555"><summary>Template data used</summary><pre>${templateJson}</pre></details></body></html>`;
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${result.programName || "poster"}-${template.name || "template"}.html`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const savedMarkup = getRenderedTemplateMarkup(template);
    if (savedMarkup) {
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${result.programName}</title><style>body{margin:0;background:#eef2f6;display:grid;place-items:center;min-height:100vh;padding:32px}</style></head><body>${replaceResultTokens(savedMarkup, result)}<details style="margin-top:24px;font:12px Arial;color:#555"><summary>Template data used</summary><pre>${templateJson}</pre></details></body></html>`;
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${result.programName || "poster"}-${template.name || "template"}.html`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    const canvas = getCanvasSize(template);
    const background = getTemplateBackground(template);
    const elements = getTemplateElements(template);
    const elementHtml = elements.length
      ? elements.map((element, index) => {
          const type = normalizeText(element.type || element.kind);
          const source = normalizeText(element?.key || element?.field || element?.dataKey || element?.name || element?.id || element?.label || element?.text);
          const winnerIndex = Number((source.match(/(?:winner|photo|image)[^0-9]*(\d+)/) || [])[1] || 1);
          const winner = result.winners?.[Math.max(0, winnerIndex - 1)] || result.winners?.[0];
          const winnerImage = winner?.image || winner?.imageUrl || winner?.photo || winner?.photoUrl;
          const src = source.includes("winner") && source.includes("image") && winnerImage ? winnerImage : element.src || element.url || element.image || element.imageUrl || element.attrs?.src;
          const style = elementStyle(element, canvas);
          const css = Object.entries(style).filter(([, value]) => value !== undefined && value !== null && value !== "").map(([key, value]) => `${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}:${value}`).join(";");
          if (type.includes("image") && src) return `<img src="${src}" style="${css}" alt="">`;
          if (source.includes("winner") && (source.includes("container") || source.includes("list") || type.includes("list"))) {
            return `<div style="${css}">${(result.winners || []).map((winner) => `<div style="display:grid;grid-template-columns:auto 1fr auto;gap:6px;align-items:center;margin-bottom:4px"><span>${winner.position || ""}</span><span>${winner.name || ""}</span><span>${winner.team || ""}</span></div>`).join("")}</div>`;
          }
          if (type.includes("shape") || type.includes("rect") || type.includes("circle")) return `<div style="${css};background:${element.fill || element.backgroundColor || element.color || "transparent"}"></div>`;
          return `<div style="${css}">${resultValueForElement(element, result)}</div>`;
        }).join("")
      : `<div class="fallback"><p>Result No: ${result.resultNumber}</p><h2>${result.category}</h2><h1>${result.programName}</h1><ol>${(result.winners || []).map((winner) => `<li>${winner.position ? `${winner.position}. ` : ""}${winner.name || "Winner"}${winner.team ? ` <small>(${winner.team})</small>` : ""}</li>`).join("")}</ol></div>`;
    const bgImage = background.image ? `<img class="bg" src="${background.image}" alt="">` : "";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${result.programName}</title><style>body{margin:0;background:#eef2f6;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh;padding:32px}.poster{position:relative;width:${canvas.width}px;height:${canvas.height}px;max-width:95vw;max-height:95vh;background:${background.color};border:1px solid #d7dce5;box-shadow:0 18px 45px rgba(15,23,42,.18);overflow:hidden}.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.fallback{padding:72px;color:#111}.fallback h1{font-size:42px}.fallback h2{font-size:26px}.fallback li{font-size:22px;margin:8px 0}details{margin-top:24px;font-size:12px;color:#555}</style></head><body><main><section class="poster">${bgImage}${elementHtml}</section><details><summary>Template data used</summary><pre>${templateJson}</pre></details></main></body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.programName || "poster"}-${template.name || "template"}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="program-results-page">
      <style>{styles}</style>
      <div className="results-header">
        <div>
          <h1>Manage Results</h1>
          <p>View, create, edit, and generate posters for event: {activeEvent?.name || "No active event"}</p>
        </div>
        <button className="primary-btn header-btn" onClick={openCreate} disabled={!hasActiveEvent}><Plus size={18} strokeWidth={2} aria-hidden="true" />Create New Result Poster</button>
      </div>

      {!hasActiveEvent ? (
        <NoActiveEventState />
      ) : <><section className="filter-card">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your results..." />
        <select value={status} onChange={(event) => setStatus(event.target.value)}><option>All Status</option><option>Published</option><option>Draft</option></select>
        <select value={sort} onChange={(event) => setSort(event.target.value)}><option>Sort by Date</option><option>Newest First</option><option>Oldest First</option><option>Program Name</option></select>
      </section>
      {error && <div className="empty-state"><p>{error}</p></div>}

      {loading && !filteredResults.length ? (
        <section className="empty-state"><p>Loading results...</p></section>
      ) : filteredResults.length ? (
        <section className="results-grid">
          {filteredResults.map((result) => (
            <article className="result-card" key={result.id}>
              <div className="card-top">
                <div><h2>{result.programName}</h2><p>{result.category} <span>·</span> Result #{result.resultNumber}</p></div>
                <span className={`status-badge ${result.published ? "published" : "draft"}`}>{result.published ? "Published" : "Draft"}</span>
              </div>
              <div className="result-meta"><span>{result.winners?.length || 0} winners</span><span>{new Date(result.created).toLocaleDateString()}</span></div>
              <button type="button" className="publish-toggle" onClick={() => togglePublished(result.id)} aria-pressed={result.published}><span className={`switch ${result.published ? "on" : ""}`} />{result.published ? "Published" : "Unpublished"}</button>
              <div className="card-actions">
                <div className="left-actions">
                  <button className="secondary-btn view-btn" onClick={() => openView(result)}><Eye size={18} strokeWidth={1.9} aria-hidden="true" />View</button>
                  <button className="secondary-btn" onClick={() => openEdit(result)}><Edit size={18} strokeWidth={1.9} aria-hidden="true" />Edit</button>
                </div>
                <button className="delete-icon" onClick={() => setDeleting(result)} aria-label="Delete result poster"><Trash2 size={18} strokeWidth={1.9} aria-hidden="true" /></button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <div className="empty-icon"><BarChart3 size={34} strokeWidth={1.8} aria-hidden="true" /></div>
          <h2>No Results Yet</h2>
          <p>You haven't created any result posters yet. Get started by creating your first one!</p>
          <button className="primary-btn" onClick={openCreate}>Create Your First Result Poster</button>
        </section>
      )}</>}

      {modalMode && (
        <div className="modal-overlay">
          <form className="editor-modal" onSubmit={submitResult}>
            <button type="button" className="close-btn" onClick={closeEditor} aria-label="Close"><X size={20} strokeWidth={2} aria-hidden="true" /></button>
            <h2>{modalMode === "edit" ? "Edit Result Poster" : "Create New Result Poster"}</h2>
            <p className="modal-subtitle">{modalMode === "edit" ? "Make changes to your result poster here." : "Create a new result poster by filling in the details below."}</p>
            <div className="form-grid">
              <label>Program Name<input value={form.programName} onChange={(event) => setForm((current) => ({ ...current, programName: event.target.value }))} autoFocus /></label>
              <label>
                Program Category
                <select
                  value={form.categoryId || ""}
                  onChange={(event) => {
                    const selectedCategory = getCategoryOption(event.target.value);
                    setForm((current) => ({
                      ...current,
                      category: selectedCategory?.name || "",
                      categoryId: selectedCategory?.id || "",
                      categoryName: selectedCategory?.name || "",
                    }));
                  }}
                  disabled={categories.length === 0}
                >
                  <option value="" disabled>
                    {categories.length ? "Select category" : "Create a category first"}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>Result Number<input value={form.resultNumber} onChange={(event) => setForm((current) => ({ ...current, resultNumber: event.target.value }))} /></label>
            </div>
            {categories.length === 0 && (
              <p className="modal-subtitle">Create a category first.</p>
            )}
            <h3>Winners</h3>
            <div className="winner-list">
              {form.winners.map((winner) => {
                const teamParticipants = getParticipantsForWinnerTeam(winner);
                const winnerNameValue = winner.isCustomName
                  ? CUSTOM_WINNER_VALUE
                  : winner.participantId || "";

                return (
                  <div className="winner-row" key={winner.id}>
                    <label>Position<input value={winner.position} onChange={(event) => updateWinner(winner.id, { position: event.target.value })} /></label>
                    <label>
                      Name
                      <select
                        value={winnerNameValue}
                        onChange={(event) => updateWinnerParticipant(winner.id, event.target.value)}
                        disabled={!winner.teamId}
                      >
                        <option value="" disabled>
                          {!winner.teamId
                            ? "Select team first"
                            : teamParticipants.length
                              ? "Select winner"
                              : "No participants found"}
                        </option>
                        {teamParticipants.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                          </option>
                        ))}
                        {winner.teamId && (
                          <option value={CUSTOM_WINNER_VALUE}>Custom</option>
                        )}
                      </select>
                      {winner.isCustomName && (
                        <input
                          value={winner.name}
                          onChange={(event) => updateWinner(winner.id, { name: event.target.value })}
                          placeholder="Type winner name"
                        />
                      )}
                    </label>
                    <label>Team<select value={winner.teamId || ""} onChange={(event) => updateWinnerTeam(winner.id, event.target.value)}>{teamOptions.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                    <label>Grade (Optional)<input value={winner.grade} onChange={(event) => updateWinner(winner.id, { grade: event.target.value })} /></label>
                    <label className="checkbox-label"><input type="checkbox" checked={winner.isGroupProgram} onChange={(event) => updateWinner(winner.id, { isGroupProgram: event.target.checked })} />Is Group Program?</label>
                    <label>Winner Image (Optional)<input type="file" onChange={(event) => updateWinner(winner.id, { imageName: event.target.files?.[0]?.name || "" })} /></label>
                    <button type="button" className="secondary-btn" onClick={() => removeWinner(winner.id)}>Remove</button>
                  </div>
                );
              })}
            </div>
            <button type="button" className="secondary-btn add-winner" onClick={addWinner}>Add Winner</button>
            <div className="modal-actions"><button type="submit" className="primary-btn" disabled={categories.length === 0}>{modalMode === "edit" ? "Update Result" : "Create Result"}</button><button type="button" className="secondary-btn" onClick={closeEditor}>Cancel</button></div>
          </form>
        </div>
      )}

      {deleting && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h2>Delete result poster?</h2>
            <p>This action cannot be undone.</p>
            <div className="modal-actions"><button className="secondary-btn" onClick={() => setDeleting(null)}>Cancel</button><button className="danger-btn" onClick={confirmDelete}>Delete</button></div>
          </div>
        </div>
      )}

      {viewing && (
        <div className="modal-overlay">
          <div className="view-modal">
            <button type="button" className="close-btn" onClick={() => setViewing(null)} aria-label="Close"><X size={20} strokeWidth={2} aria-hidden="true" /></button>
            <h2>Posters for: {viewing.programName}</h2>
            <p className="modal-subtitle">View and download generated posters for this result using available templates.</p>
            {templates.length ? (
              <div className="template-grid">
                {templates.map((template) => (
                  <article className="template-card" key={template.id}>
                    <h3>{template.name}</h3>
                    <div className="template-preview" id={`poster-preview-${template.id}`}>{renderTemplateWithResult(template, viewing)}</div>
                    <button className="primary-btn" onClick={() => downloadPoster(template, viewing)}><Download size={18} strokeWidth={1.9} aria-hidden="true" />Download Poster</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="template-empty-state">
                No templates available. Create a template first.
              </div>
            )}
            <div className="modal-actions"><button className="primary-btn" onClick={() => setViewing(null)}>Close</button></div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = `
.schema-template-preview{position:relative;overflow:hidden;background:#fff;border:1px solid #d9dee6;border-radius:6px;flex:0 0 auto;color-scheme:light}.schema-template-canvas{position:relative;left:0;top:0;overflow:hidden;color-scheme:light}.schema-template-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.saved-template-preview{position:relative;overflow:hidden;padding:0!important;box-sizing:border-box;color-scheme:light}.saved-template-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.program-results-page{min-height:100vh;overflow-x:hidden;background:var(--app-bg);color:var(--app-text);padding:32px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.results-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;max-width:1532px;margin:0 auto 34px}.results-header>div{min-width:0}.results-header h1{margin:0 0 8px;font-size:32px;line-height:1.15;font-weight:800;color:var(--app-heading)}.results-header p{margin:0;color:var(--app-muted);font-size:22px;line-height:1.4;font-weight:500;overflow-wrap:anywhere}.primary-btn,.secondary-btn,.danger-btn{border:0;border-radius:8px;min-height:40px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:10px;font-weight:700;font-size:15px;cursor:pointer;white-space:nowrap;box-shadow:var(--app-shadow-sm);transition:background .18s ease,color .18s ease,border-color .18s ease,opacity .18s ease}.primary-btn{background:var(--app-primary);color:var(--app-primary-text)}.primary-btn:hover{opacity:.92}.secondary-btn{background:var(--app-surface);color:var(--app-text);border:1px solid var(--app-border)}.secondary-btn:hover{background:var(--app-surface-elevated);color:var(--app-heading)}.danger-btn{background:var(--app-danger);color:var(--app-danger-text)}.danger-btn:hover{opacity:.9}.header-btn{min-height:48px;padding:0 22px;font-size:17px;background:var(--app-success);color:var(--app-success-text)}.filter-card{max-width:1532px;margin:0 auto 32px;background:var(--app-surface);border:1px solid var(--app-border);border-radius:14px;box-shadow:var(--app-shadow-sm);padding:24px;display:grid;grid-template-columns:minmax(0,1fr) 220px 220px;gap:18px}.program-results-page input,.program-results-page select{width:100%;height:44px;border:1px solid var(--app-border);border-radius:8px;background:var(--app-input-bg);color:var(--app-text);padding:0 14px;font-size:15px;outline:none;box-shadow:var(--app-shadow-sm);box-sizing:border-box}.program-results-page input::placeholder{color:var(--app-muted)}.program-results-page input:focus,.program-results-page select:focus{border-color:var(--app-primary);box-shadow:0 0 0 3px var(--app-focus-ring)}.results-grid{max-width:1532px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,360px),1fr));gap:22px}.result-card{min-height:286px;background:var(--app-surface);border:1px solid var(--app-border);border-radius:14px;padding:28px;box-shadow:var(--app-shadow-sm);display:flex;flex-direction:column;min-width:0}.card-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.card-top h2{margin:0 0 4px;font-size:22px;line-height:1.2;font-weight:800;color:var(--app-heading);overflow-wrap:anywhere}.card-top p,.result-meta,.publish-toggle{color:var(--app-muted);font-size:15px}.card-top p{margin:0}.status-badge{border-radius:999px;padding:6px 12px;font-size:13px;line-height:1;font-weight:800;white-space:nowrap}.status-badge.published{background:var(--app-success);color:var(--app-success-text)}.status-badge.draft{background:var(--app-sidebar-active-bg);color:var(--app-sidebar-active-text)}.result-meta{display:flex;justify-content:space-between;gap:18px;margin-top:auto;padding-top:44px}.publish-toggle{margin-top:16px;padding:0;border:0;background:transparent;display:inline-flex;align-items:center;gap:12px;align-self:flex-start;cursor:pointer;font-weight:600}.switch{width:42px;height:24px;border-radius:999px;background:var(--app-surface-elevated);border:1px solid var(--app-border);position:relative;transition:background .18s ease}.switch:after{content:"";position:absolute;width:20px;height:20px;left:1px;top:1px;border-radius:50%;background:var(--app-surface);border:1px solid var(--app-border);transition:transform .18s ease}.switch.on{background:var(--app-success);border-color:var(--app-success)}.switch.on:after{transform:translateX(18px);background:var(--app-success-text)}.card-actions{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:46px}.left-actions{display:flex;gap:8px;flex-wrap:wrap}.card-actions .secondary-btn{min-height:40px;font-size:16px;padding:0 14px}.view-btn{background:var(--app-trophy)!important;border-color:var(--app-trophy)!important;color:var(--app-trophy-text)!important}.view-btn:hover{opacity:.9}.delete-icon{border:0;background:transparent;color:var(--app-danger);width:42px;height:42px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;border-radius:8px}.delete-icon:hover{background:var(--app-danger-bg-soft)}.empty-state{max-width:1532px;min-height:430px;margin:0 auto;border:1px dashed var(--app-border);border-radius:16px;background:var(--app-surface);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--app-heading);padding:34px}.empty-icon{width:72px;height:72px;border-radius:50%;background:var(--app-surface-elevated);color:var(--app-muted);display:flex;align-items:center;justify-content:center;margin-bottom:22px}.empty-state h2{margin:0 0 12px;font-size:28px;font-weight:800;color:var(--app-heading)}.empty-state p{margin:0 0 34px;color:var(--app-muted);font-size:19px;max-width:680px}.empty-state .primary-btn{min-height:46px;font-size:17px;background:var(--app-success);color:var(--app-success-text)}.modal-overlay{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:28px;overflow-y:auto}.editor-modal,.view-modal,.confirm-modal{position:relative;background:var(--app-surface-elevated);color:var(--app-text);border:1px solid var(--app-border);border-radius:14px;box-shadow:var(--app-shadow-lg);width:min(100%,904px);max-height:calc(100vh - 56px);overflow:auto;padding:24px 28px 34px}.view-modal{width:min(100%,1314px)}.confirm-modal{width:min(100%,420px);padding:28px}.close-btn{position:absolute;top:16px;right:16px;border:1px solid var(--app-border);border-radius:8px;background:var(--app-surface);color:var(--app-muted);cursor:pointer;width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center}.close-btn:hover{color:var(--app-heading);background:var(--app-surface-elevated)}.editor-modal h2,.view-modal h2,.confirm-modal h2{margin:0 42px 6px 0;font-size:22px;font-weight:800;color:var(--app-heading)}.modal-subtitle,.confirm-modal p{margin:0 0 28px;color:var(--app-muted);font-size:16px}.form-grid{display:grid;grid-template-columns:minmax(0,1fr) 160px;gap:14px 16px;max-width:640px}.form-grid label:nth-child(3){grid-column:1/2}.program-results-page label{display:grid;gap:7px;color:var(--app-text);font-size:14px;font-weight:700;min-width:0}.editor-modal h3{margin:34px 0 18px;font-size:20px;color:var(--app-heading)}.winner-list{display:grid;gap:16px}.winner-row{border:1px solid var(--app-border);background:var(--app-surface);border-radius:10px;padding:12px;display:grid;grid-template-columns:96px minmax(150px,1fr) 120px 120px 130px minmax(130px,1fr) 96px;gap:10px;align-items:end;min-width:0}.winner-row input,.winner-row select{height:36px;font-size:14px;padding:0 10px}.winner-row input[type=file]{padding:6px 8px;overflow:hidden}.checkbox-label{grid-template-columns:16px 1fr;align-items:center;gap:8px;line-height:1.15;padding-bottom:6px}.checkbox-label input{width:14px;height:14px;box-shadow:none}.add-winner{margin-top:18px}.modal-actions{margin-top:22px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}.template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin-top:34px}.template-card{background:var(--app-surface);border:1px solid var(--app-border);border-radius:14px;min-height:560px;padding:28px 22px;display:flex;flex-direction:column;align-items:center;box-shadow:var(--app-shadow-sm);min-width:0}.template-card h3{align-self:stretch;margin:0 0 24px;font-size:22px;line-height:1.25;color:var(--app-heading);overflow-wrap:anywhere}.template-preview{width:100%;max-width:360px;min-height:340px;max-height:62vh;display:flex;align-items:center;justify-content:center;margin-bottom:24px;overflow:auto;border-radius:10px;background:var(--app-bg);padding:14px}.template-preview img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}.poster-preview{width:256px;height:320px;background:linear-gradient(135deg,#fff,#f2f2f2);border:1px solid #d9dee6;border-radius:6px;padding:48px 44px;font-size:11px;color:#111;box-shadow:inset 0 18px 34px rgba(0,0,0,.05);color-scheme:light}.poster-preview strong{display:block;margin-top:8px}.poster-preview ol{margin-top:36px;padding-left:14px}.template-empty-state{margin:56px 0 20px;min-height:220px;border:1px dashed var(--app-border);border-radius:14px;background:var(--app-surface);color:var(--app-muted);display:flex;align-items:center;justify-content:center;text-align:center;font-size:20px;font-weight:600;padding:24px}@media(max-width:1100px){.results-header{flex-direction:column;margin-bottom:28px}.filter-card{grid-template-columns:1fr;padding:20px}.results-grid{grid-template-columns:1fr}.winner-row{grid-template-columns:repeat(2,minmax(0,1fr))}.template-grid{grid-template-columns:1fr}.view-modal{width:min(100%,760px)}}@media(max-width:640px){.program-results-page{padding:20px}.results-header h1{font-size:28px}.results-header p{font-size:17px}.header-btn{width:100%;white-space:normal}.result-card{padding:20px;min-height:auto}.card-top{flex-direction:column}.result-meta,.card-actions{margin-top:28px;padding-top:0}.card-actions{align-items:flex-start;flex-direction:column}.left-actions,.left-actions button,.modal-actions button{width:100%}.form-grid{grid-template-columns:1fr}.form-grid label:nth-child(3){grid-column:auto}.winner-row{grid-template-columns:1fr}.editor-modal,.view-modal,.confirm-modal{padding:22px 18px 28px}.modal-overlay{padding:16px}.template-card{padding:20px 14px}.template-preview{max-width:100%;min-height:260px}.primary-btn,.secondary-btn,.danger-btn{white-space:normal}}
`;

export default ProgramResultsPage;
