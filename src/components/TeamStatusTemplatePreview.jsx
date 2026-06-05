import React from "react";

function titleValue(element, previewData) {
  const firstTextValue = (...values) => {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value) !== "") return String(value);
    }
    return "";
  };
  if (previewData?.titleValues && element?.id && Object.prototype.hasOwnProperty.call(previewData.titleValues, element.id)) {
    return firstTextValue(previewData.titleValues[element.id], element.value, element.text, element.content, element.label);
  }
  const key = element.dataSource || element.dataKey || element.field || element.key;
  if (key === "eventName") return firstTextValue(previewData.eventName, element.value, element.text, element.content, element.label);
  if (key === "organizerName") return firstTextValue(previewData.organizerName, element.value, element.text, element.content, element.label);
  if (key === "eventDate") return firstTextValue(previewData.eventDate, element.value, element.text, element.content, element.label);
  if (key === "eventLocation") return firstTextValue(previewData.eventLocation, element.value, element.text, element.content, element.label);
  if (key && previewData?.[key] !== undefined) return firstTextValue(previewData[key], element.value, element.text, element.content, element.label);
  return firstTextValue(element.value, element.text, element.content, element.label);
}

function teamFieldValue(team, childKey, child = {}) {
  const candidates =
    childKey === "name"
      ? [team?.name, team?.teamName, team?.title, child.value, child.text, child.content, child.label]
      : [team?.score, team?.points, team?.point, child.value, child.text, child.content, child.label];
  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value) !== "") return String(value);
  }
  return "";
}

function childStyle(style) {
  return {
    position: "absolute",
    left: style.x,
    top: style.y,
    width: style.width,
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    textAlign: style.align,
    color: style.color,
    lineHeight: style.lineHeight,
    background: style.showBg ? "rgba(255,255,255,.65)" : "transparent",
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
    minHeight: 24,
    padding: "0 4px",
  };
}

export default function TeamStatusTemplatePreview({
  template,
  scale = 1,
  selectedId = "",
  editable = false,
  onSelect,
  onBeginDrag,
}) {
  const canvas = template.canvas || {};
  const previewData = template.previewData || {};
  const elements = template.elements || [];
  const titles = elements.filter((element) => element.kind === "title");
  const slots = elements.filter((element) => element.kind === "teamSlot");

  const selectable = (id) => ({
    outline: selectedId === id ? "2px solid #26752C" : "none",
    outlineOffset: 0,
    cursor: editable ? "move" : "default",
    userSelect: "none",
  });

  return (
    <div
      className="team-status-template-canvas"
      style={{
        position: "relative",
        overflow: "hidden",
        width: canvas.width,
        height: canvas.height,
        backgroundColor: canvas.backgroundColor || "#eeeeee",
        backgroundImage: canvas.backgroundImage ? `url(${canvas.backgroundImage})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        border: "1px solid #D9DEE6",
        borderRadius: 6,
        boxSizing: "border-box",
      }}
    >
      {titles.map((element) => (
        <div
          key={element.id}
          onPointerDown={(event) => editable && onBeginDrag?.(event, element.id)}
          onClick={(event) => {
            if (!editable) return;
            event.stopPropagation();
            onSelect?.(element.id);
          }}
          style={{
            position: "absolute",
            boxSizing: "border-box",
            whiteSpace: "pre-wrap",
            left: element.x,
            top: element.y,
            width: element.width,
            fontFamily: element.fontFamily,
            fontSize: element.fontSize,
            fontWeight: element.fontWeight,
            textAlign: element.align,
            color: element.color,
            lineHeight: element.lineHeight,
            background: element.showBg ? "rgba(255,255,255,.55)" : "transparent",
            ...selectable(element.id),
          }}
        >
          {titleValue(element, previewData)}
        </div>
      ))}

      {slots.map((slot, slotIdx) => {
        const teamIndex = Number(slot.teamIndex ?? slotIdx);
        const team = previewData.teams?.[teamIndex];
        if (!team && !editable) return null;
        const displayTeam = team || { name: "Team Name", score: "0" };

        return (
          <div
            key={slot.id}
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
              left: slot.x,
              top: slot.y,
              width: slot.width,
              height: 42,
              alignItems:
                slot.verticalAlign === "center"
                  ? "center"
                  : slot.verticalAlign === "bottom"
                    ? "flex-end"
                    : "flex-start",
              justifyContent:
                slot.horizontalAlign === "center"
                  ? "center"
                  : slot.horizontalAlign === "right"
                    ? "flex-end"
                    : "flex-start",
              gap: slot.spacing,
              ...selectable(slot.id),
            }}
          >
            {["name", "score"].map((childKey) => {
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
                    ...childStyle(slot[childKey] || {}),
                    ...selectable(childId),
                  }}
                >
                  {teamFieldValue(displayTeam, childKey, slot[childKey] || {})}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
