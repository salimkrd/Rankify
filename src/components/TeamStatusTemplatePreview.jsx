import React from "react";
import TemplateCanvasRenderer from "./TemplateCanvasRenderer.jsx";

export default function TeamStatusTemplatePreview({
  template,
  scale = 1,
  selectedId = "",
  editable = false,
  onSelect,
  onBeginDrag,
}) {
  return (
    <TemplateCanvasRenderer
      template={template}
      data={template?.previewData}
      scale={scale}
      selectedId={selectedId}
      editable={editable}
      previewMode
      onSelect={onSelect}
      onBeginDrag={onBeginDrag}
      className="team-status-template-canvas"
    />
  );
}
