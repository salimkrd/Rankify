import React from 'react';

const requiredElementIds = new Set(['programName', 'category', 'resultNumber', 'winnerContainer', 'winnerPosition', 'winnerName', 'winnerTeam', 'winnerPhoto']);

function ToolbarNumber({ label, value, onChange, step = '1' }) {
  return <label>{label}<input className="event-input" type="number" step={step} value={Number(value || 0)} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function ExistingChips({ setSelectedId }) {
  return (
    <div className="toolbar-chips">
      {[
        ['programName', 'Program'],
        ['category', 'Category'],
        ['resultNumber', 'Result #'],
        ['winnerContainer', 'Winners'],
        ['winnerPosition', 'Position'],
        ['winnerName', 'Name'],
        ['winnerTeam', 'Team'],
        ['winnerPhoto', 'Image'],
      ].map(([id, label]) => <button key={id} onClick={() => setSelectedId(id)}>{label}</button>)}
    </div>
  );
}

function GeneralToolbar({ setSelectedId, addCustomText, addImageElement }) {
  return (
    <div className="element-toolbar general-toolbar">
      <div>
        <strong>TOOLS</strong>
        <p>Click the canvas, or pick an element below.</p>
      </div>
      <div>
        <strong>ADD NEW</strong>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={addCustomText}>+ Custom Field</button>
          <button className="btn-secondary" onClick={addImageElement}>+ Image Element</button>
        </div>
      </div>
      <div>
        <strong>EXISTING ELEMENTS</strong>
        <ExistingChips setSelectedId={setSelectedId} />
      </div>
    </div>
  );
}

function ElementSettingsToolbar({ element, updateElement, uploadElementImage, removeElement, setSelectedId }) {
  const isContainer = element.type === 'winnerContainer';
  const isImage = element.type === 'image' || element.type === 'winnerPhoto';
  const canRemove = !requiredElementIds.has(element.id);

  return (
    <div className="element-toolbar">
      {isContainer ? (
        <>
          <ToolbarNumber label="X Position" value={element.x} onChange={(value) => updateElement({ x: value })} />
          <ToolbarNumber label="Y Position" value={element.y} onChange={(value) => updateElement({ y: value })} />
          <ToolbarNumber label="Width" value={element.width} onChange={(value) => updateElement({ width: value })} />
          <ToolbarNumber label="Spacing" value={element.spacing || 28} onChange={(value) => updateElement({ spacing: value })} />
          <ToolbarNumber label="Pos to Name Padding" value={element.positionNamePadding || 10} onChange={(value) => updateElement({ positionNamePadding: value })} />
          <label>Direction<select className="event-input" value={element.direction || 'vertical'} onChange={(event) => updateElement({ direction: event.target.value })}><option>vertical</option><option>horizontal</option></select></label>
        </>
      ) : isImage ? (
        <>
          <ToolbarNumber label="X Position" value={element.x} onChange={(value) => updateElement({ x: value })} />
          <ToolbarNumber label="Y Position" value={element.y} onChange={(value) => updateElement({ y: value })} />
          <label><input type="checkbox" checked={element.visible !== false} onChange={(event) => updateElement({ visible: event.target.checked })} /> Show</label>
          <ToolbarNumber label="Width" value={element.width} onChange={(value) => updateElement({ width: value })} />
          <ToolbarNumber label="Height" value={element.height} onChange={(value) => updateElement({ height: value })} />
          <ToolbarNumber label="Opacity" value={element.opacity ?? 1} step="0.1" onChange={(value) => updateElement({ opacity: value })} />
          <ToolbarNumber label="Border Radius" value={element.borderRadius || 0} onChange={(value) => updateElement({ borderRadius: value })} />
          <label>Object Fit<select className="event-input" value={element.objectFit || 'Fill'} onChange={(event) => updateElement({ objectFit: event.target.value })}><option>Fill</option><option>Contain</option><option>Cover</option></select></label>
          <label>Image Source<select className="event-input" value={element.imageSource || 'Manual Upload'} onChange={(event) => updateElement({ imageSource: event.target.value })}><option>Manual Upload</option><option>Winner Photo</option><option>Event Logo</option></select></label>
          <label>Upload Image<input className="event-input" type="file" accept="image/*" onChange={uploadElementImage} /></label>
          {canRemove && <button className="remove-element-btn" onClick={removeElement}>× Remove Element</button>}
        </>
      ) : (
        <>
          {element.id === 'resultNumber' && <label>Prefix<input className="event-input" value={element.prefix || 'Result'} onChange={(event) => updateElement({ prefix: event.target.value })} /></label>}
          <label>Font Family<select className="event-input" value={element.fontFamily || 'Arial'} onChange={(event) => updateElement({ fontFamily: event.target.value })}><option>Arial</option><option>Roboto</option><option>Bebas Neue</option><option>Fjalla One</option></select></label>
          <ToolbarNumber label="Font Size" value={element.fontSize || 18} onChange={(value) => updateElement({ fontSize: value })} />
          <label>Font Weight<select className="event-input" value={element.fontWeight || '400'} onChange={(event) => updateElement({ fontWeight: event.target.value })}><option value="400">400 - Regular</option><option value="700">700 - Bold</option><option value="900">900 - Black</option></select></label>
          <label>Text Align<select className="event-input" value={element.textAlign || 'left'} onChange={(event) => updateElement({ textAlign: event.target.value })}><option>left</option><option>center</option><option>right</option></select></label>
          <label>Color<input className="event-input" type="color" value={element.color || '#0D1B2A'} onChange={(event) => updateElement({ color: event.target.value })} /></label>
          <ToolbarNumber label="Line Height" value={element.lineHeight || 1.2} step="0.1" onChange={(value) => updateElement({ lineHeight: value })} />
          <ToolbarNumber label="Width" value={element.width || 100} onChange={(value) => updateElement({ width: value })} />
          <ToolbarNumber label="X Position" value={element.x || 0} onChange={(value) => updateElement({ x: value })} />
          <ToolbarNumber label="Y Position" value={element.y || 0} onChange={(value) => updateElement({ y: value })} />
          {element.id === 'winnerPosition' && (
            <>
              <label><input type="checkbox" checked={Boolean(element.ordinalSuffix)} onChange={(event) => updateElement({ ordinalSuffix: event.target.checked })} /> Show “st, nd, rd, th”</label>
              <label>Indicator Type<select className="event-input" value={element.indicatorType || 'None'} onChange={(event) => updateElement({ indicatorType: event.target.value })}><option>None</option><option>Number</option><option>Dots</option><option>Medal</option></select></label>
              <label><input type="checkbox" checked={Boolean(element.showBackground)} onChange={(event) => updateElement({ showBackground: event.target.checked })} /> Show Background</label>
              <label>Background Color<input className="event-input" type="color" value={element.backgroundColor || '#2563EB'} onChange={(event) => updateElement({ backgroundColor: event.target.value })} /></label>
              <label>Background Type<select className="event-input" value={element.backgroundType || 'Circle'} onChange={(event) => updateElement({ backgroundType: event.target.value })}><option>Circle</option><option>Rounded</option><option>Square</option></select></label>
              <ToolbarNumber label="Background Padding" value={element.backgroundPadding || 8} onChange={(value) => updateElement({ backgroundPadding: value })} />
              <label><input type="checkbox" checked={Boolean(element.showStroke)} onChange={(event) => updateElement({ showStroke: event.target.checked })} /> Show Stroke</label>
              <label>Stroke Color<input className="event-input" type="color" value={element.strokeColor || '#FFC107'} onChange={(event) => updateElement({ strokeColor: event.target.value })} /></label>
              <ToolbarNumber label="Stroke Width" value={element.strokeWidth || 1} onChange={(value) => updateElement({ strokeWidth: value })} />
            </>
          )}
          {canRemove && <button className="remove-element-btn" onClick={removeElement}>× Remove Element</button>}
        </>
      )}
    </div>
  );
}

export default function ElementToolbar({ element, updateElement, uploadElementImage, removeElement, setSelectedId, addCustomText, addImageElement }) {
  if (!element) {
    return <GeneralToolbar setSelectedId={setSelectedId} addCustomText={addCustomText} addImageElement={addImageElement} />;
  }

  return (
    <ElementSettingsToolbar
      element={element}
      updateElement={updateElement}
      uploadElementImage={uploadElementImage}
      removeElement={removeElement}
      setSelectedId={setSelectedId}
    />
  );
}
