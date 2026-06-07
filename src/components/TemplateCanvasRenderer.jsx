import React from "react";

const sampleData = {
  programName: "Elocution English Kids",
  category: "General",
  programCategory: "General",
  resultNumber: "23",
  eventName: "SSF PANANGARA UNIT SAHITYOLSAV",
  organizerName: "Panangara Unit",
  organizer: "Panangara Unit",
  eventDate: "May 25",
  eventLocation: "Panangara",
  titleParts: ["Final", "Point", "Status"],
  titleValues: {},
  teams: [
    { name: "Nullamkulam", teamName: "Nullamkulam", score: "581" },
    { name: "Parappanangadi", teamName: "Parappanangadi", score: "581" },
    { name: "Hidayah Nagar", teamName: "Hidayah Nagar", score: "580" },
    { name: "Ottummal South", teamName: "Ottummal South", score: "579" },
  ],
  winners: [
    { id: "winner_1", position: "1", name: "Muhammed Saeed", team: "Vadi Badr" },
    { id: "winner_2", position: "2", name: "Jabbar Ibraheem", team: "Isfahan" },
    { id: "winner_3", position: "3", name: "Ali bin Muhammed", team: "Vadi Quba" },
  ],
  customFields: {},
};

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

function getPreviewableImageUrl(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    return value.dataUrl || value.dataURL || value.url || value.src || value.imageData || "";
  }
  return "";
}

function resolveText(element, data, winner = null) {
  const key = String(
    element?.dataKey ||
      element?.dataSource ||
      element?.field ||
      element?.key ||
      element?.name ||
      element?.id ||
      ""
  );
  const normalizedKey = key.toLowerCase();

  if (winner) {
    if (normalizedKey.includes("position")) return firstTextValue(winner.position, element.content, element.text, element.value);
    if (normalizedKey.includes("team")) return firstTextValue(winner.team, winner.teamName, element.content, element.text, element.value);
    if (normalizedKey.includes("name")) return firstTextValue(winner.name, element.content, element.text, element.value);
    return firstTextValue(element.content, element.text, element.value, element.label);
  }

  if (data?.titleValues && element?.id && Object.prototype.hasOwnProperty.call(data.titleValues, element.id)) {
    return firstTextValue(data.titleValues[element.id], element.value, element.text, element.content, element.label);
  }

  if (element?.custom || normalizedKey === "manual" || element?.dataSource === "manual") {
    return firstTextValue(data?.customFields?.[element.id], data?.[element.id], element.content, element.text, element.value, element.label);
  }

  if (normalizedKey.includes("programname") || normalizedKey.includes("program name") || normalizedKey === "program") {
    return firstTextValue(data.programName, element.content, element.text, element.value, element.label);
  }
  if (normalizedKey.includes("category")) return firstTextValue(data.category, data.programCategory, element.content, element.text, element.value, element.label);
  if (normalizedKey.includes("eventname") || normalizedKey.includes("event name")) return firstTextValue(data.eventName, element.content, element.text, element.value, element.label);
  if (normalizedKey.includes("organizer")) return firstTextValue(data.organizerName, data.organizer, element.content, element.text, element.value, element.label);
  if (normalizedKey.includes("eventdate") || normalizedKey.includes("event date")) return firstTextValue(data.eventDate, element.content, element.text, element.value, element.label);
  if (normalizedKey.includes("eventlocation") || normalizedKey.includes("event location")) return firstTextValue(data.eventLocation, element.content, element.text, element.value, element.label);
  if (normalizedKey.includes("resultnumber") || normalizedKey.includes("result number") || normalizedKey.includes("result")) {
    return `${element.prefix || ""}${firstTextValue(data.resultNumber, element.content, element.text, element.value, element.label)}`;
  }

  return firstTextValue(
    getObjectPathValue(data, key),
    data?.[key],
    data?.customFields?.[element?.id],
    element.content,
    element.text,
    element.value,
    element.label
  );
}

function teamFieldValue(team, childKey, child = {}) {
  const candidates =
    childKey === "name"
      ? [team?.name, team?.teamName, team?.title, child.value, child.text, child.content, child.label]
      : [team?.score, team?.points, team?.point, child.value, child.text, child.content, child.label];
  return firstTextValue(...candidates);
}

function absoluteTextStyle(element, offset = { x: 0, y: 0 }) {
  return {
    position: "absolute",
    boxSizing: "border-box",
    left: Number(element.x || 0) + offset.x,
    top: Number(element.y || 0) + offset.y,
    width: element.width !== undefined ? Number(element.width) : "auto",
    minHeight: element.height !== undefined ? Number(element.height) : "auto",
    fontFamily: element.fontFamily || "Inter",
    fontSize: Number(element.fontSize || 16),
    fontWeight: element.fontWeight || "400",
    color: element.color || "#111111",
    lineHeight: element.lineHeight || 1.2,
    textAlign: element.textAlign || element.align || "left",
    opacity: element.opacity === undefined ? 1 : Number(element.opacity),
    zIndex: Number(element.zIndex || 1),
    whiteSpace: "pre-wrap",
    overflow: "visible",
    background: element.showBg ? element.backgroundColor || "rgba(255,255,255,.55)" : "transparent",
    borderRadius: element.borderRadius,
    padding: element.showBg ? "0 4px" : undefined,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: element.transformOrigin || "top left",
  };
}

export default function TemplateCanvasRenderer({
  template,
  data,
  scale = 1,
  previewMode = true,
  selectedId = "",
  editable = false,
  onSelect,
  onBeginDrag,
  className = "",
}) {
  const source = template?.templateData || template?.template_data || template || {};
  const canvas = source.canvas || {};
  const width = Number(canvas.width || source.canvasWidth || source.width || 1080);
  const height = Number(canvas.height || source.canvasHeight || source.height || 1350);
  const previewData = { ...sampleData, ...(source.previewData || {}), ...(data || {}) };
  const elements = Array.isArray(source.elements) ? source.elements : [];
  const customFields = Array.isArray(source.customFields) ? source.customFields : [];
  const backgroundImage = getPreviewableImageUrl(
    canvas.backgroundImage ||
      source.backgroundImage ||
      source.frameImageUrl ||
      source.frameImage ||
      source.previewImage ||
      template?.backgroundImage ||
      template?.previewImage
  );
  const backgroundColor = canvas.backgroundColor || source.backgroundColor || "#eeeeee";

  const selectable = (id) => ({
    outline: selectedId === id ? "2px solid #26752C" : "none",
    outlineOffset: 0,
    cursor: editable ? "move" : "default",
    userSelect: "none",
  });

  const renderImage = (element, key, offset = { x: 0, y: 0 }, winner = null) => {
    const src = getPreviewableImageUrl(
      winner?.image ||
        winner?.imageUrl ||
        winner?.photo ||
        winner?.photoUrl ||
        element.src ||
        element.imageData ||
        element.image ||
        element.imageUrl ||
        element.url
    );
    if (!src) return null;
    return (
      <img
        key={key}
        src={src}
        alt=""
        draggable={false}
        style={{
          ...absoluteTextStyle(element, offset),
          height: element.height !== undefined ? Number(element.height) : Number(element.width || 80),
          objectFit: element.objectFit || "cover",
          display: "block",
        }}
      />
    );
  };

  const renderText = (element, key, offset = { x: 0, y: 0 }, winner = null) => (
    <div
      key={key}
      onPointerDown={(event) => editable && onBeginDrag?.(event, element.id)}
      onClick={(event) => {
        if (!editable) return;
        event.stopPropagation();
        onSelect?.(element.id);
      }}
      style={{ ...absoluteTextStyle(element, offset), ...selectable(element.id) }}
    >
      {resolveText(element, previewData, winner)}
    </div>
  );

  const renderTeamSlot = (slot, slotIdx) => {
    const teamIndex = Number(slot.teamIndex ?? slotIdx);
    const team = previewData.teams?.[teamIndex];
    if (!team && !editable && !previewMode) return null;
    const displayTeam = team || { name: "Team Name", score: "0" };

    return (
      <div
        key={slot.id || `team-slot-${slotIdx}`}
        onPointerDown={(event) => editable && onBeginDrag?.(event, slot.id)}
        onClick={(event) => {
          if (!editable) return;
          event.stopPropagation();
          onSelect?.(slot.id);
        }}
        style={{
          position: "absolute",
          display: "flex",
          boxSizing: "border-box",
          left: Number(slot.x || 0),
          top: Number(slot.y || 0),
          width: Number(slot.width || 360),
          height: Number(slot.height || 42),
          alignItems: slot.verticalAlign === "center" ? "center" : slot.verticalAlign === "bottom" ? "flex-end" : "flex-start",
          justifyContent: slot.horizontalAlign === "center" ? "center" : slot.horizontalAlign === "right" ? "flex-end" : "flex-start",
          gap: Number(slot.spacing || 0),
          zIndex: Number(slot.zIndex || 2),
          transform: slot.rotation ? `rotate(${slot.rotation}deg)` : undefined,
          transformOrigin: slot.transformOrigin || "top left",
          ...selectable(slot.id),
        }}
      >
        {["name", "score"].map((childKey) => {
          const child = slot[childKey] || {};
          const childId = `${slot.id}:${childKey}`;
          return (
            <span
              key={childKey}
              onPointerDown={(event) => editable && onBeginDrag?.(event, slot.id, childKey)}
              onClick={(event) => {
                if (!editable) return;
                event.stopPropagation();
                onSelect?.(childId);
              }}
              style={{
                ...absoluteTextStyle(child),
                ...selectable(childId),
              }}
            >
              {teamFieldValue(displayTeam, childKey, child)}
            </span>
          );
        })}
      </div>
    );
  };

  const winnerContainer =
    elements.find((element) => element.id === "winnerContainer") ||
    elements.find((element) => element.type === "winnerContainer");
  const winnerChildren = elements.filter((element) => element.type === "winnerText" || element.type === "winnerPhoto");

  const renderedElements = elements
    .filter((element) => element && element.visible !== false)
    .filter((element) => !["winnerContainer", "winnerText", "winnerPhoto"].includes(element.type))
    .slice()
    .sort((a, b) => Number(a.zIndex || 0) - Number(b.zIndex || 0))
    .map((element, index) => {
      if (element.kind === "teamSlot" || element.type === "teamSlot" || element.type === "slot") return renderTeamSlot(element, index);
      const key = element.id || `${element.kind || element.type || "element"}-${index}`;
      if (element.type === "image" || element.kind === "image") return renderImage(element, key);
      return renderText(element, key);
    });

  const renderedWinners =
    winnerContainer && winnerChildren.length
      ? (previewData.winners || []).flatMap((winner, index) => {
          const spacing = Number(winnerContainer.spacing || 70);
          const direction = winnerContainer.direction || "vertical";
          const offset =
            direction === "horizontal"
              ? { x: Number(winnerContainer.x || 0) + index * spacing, y: Number(winnerContainer.y || 0) }
              : { x: Number(winnerContainer.x || 0), y: Number(winnerContainer.y || 0) + index * spacing };
          return winnerChildren.map((child) => {
            const key = `${winner.id || index}-${child.id || child.type}`;
            return child.type === "winnerPhoto" ? renderImage(child, key, offset, winner) : renderText(child, key, offset, winner);
          });
        })
      : [];

  const renderedCustomFields = customFields
    .filter((field) => field && field.visible !== false)
    .map((field, index) => {
      const key = field.id || `custom-${index}`;
      if (field.type === "image") return renderImage(field, key);
      return renderText(field, key);
    });

  return (
    <div
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        width,
        height,
        backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        border: "1px solid #D9DEE6",
        borderRadius: 6,
        boxSizing: "border-box",
        colorScheme: "light",
      }}
    >
      {renderedElements}
      {renderedWinners}
      {renderedCustomFields}
    </div>
  );
}
