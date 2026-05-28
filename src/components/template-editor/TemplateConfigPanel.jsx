import React from 'react';

export default function TemplateConfigPanel({ templateName, setTemplateName, canvas, setCanvas, uploadBackground, saveTemplate, isEdit }) {
  return (
    <aside className="editor-panel config-panel">
      <h2>Template Configuration</h2>
      <label>Template Name<input className="event-input" value={templateName} onChange={(event) => setTemplateName(event.target.value)} /></label>
      <label>Background Image<input className="event-input" type="file" accept="image/*" onChange={uploadBackground} /></label>
      {canvas.backgroundImage && <p className="config-note">Image loaded. Canvas dimensions set to image size.{canvas.backgroundName ? ` ${canvas.backgroundName}` : ''} <button onClick={() => setCanvas((current) => ({ ...current, backgroundImage: null, backgroundName: '' }))}>Clear Image</button></p>}
      <h3>Canvas Dimensions</h3>
      <div className="grid grid-cols-2 gap-2">
        <label>Width (px)<input className="event-input" type="number" value={canvas.width} onChange={(event) => setCanvas({ ...canvas, width: Number(event.target.value) })} /></label>
        <label>Height (px)<input className="event-input" type="number" value={canvas.height} onChange={(event) => setCanvas({ ...canvas, height: Number(event.target.value) })} /></label>
      </div>
      <button className="btn-primary mt-auto w-full" onClick={saveTemplate}>{isEdit ? 'Save Template Changes' : 'Create New Template'}</button>
      <p className="text-center text-xs text-rank-primary/60">Tip: you can also save from the sticky bar at the top.</p>
    </aside>
  );
}
