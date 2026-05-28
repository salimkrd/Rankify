import React from 'react';
import { Copy, Image, Trash2 } from 'lucide-react';

const requiredElementIds = new Set(['programName', 'category', 'resultNumber', 'winnerContainer', 'winnerPosition', 'winnerName', 'winnerTeam', 'winnerPhoto']);

export default function LayersPanel({ elements, selectedId, setSelectedId, addCustomText, addImageElement, duplicateElement, removeElement }) {
  const mainLayers = elements.filter((element) => !['winnerPosition', 'winnerName', 'winnerTeam', 'winnerPhoto'].includes(element.id));

  return (
    <aside className="editor-panel layers-panel">
      <h2>LAYERS</h2>
      {mainLayers.map((element) => (
        <button key={element.id} className={selectedId === element.id ? 'layer-row active' : 'layer-row'} onClick={() => setSelectedId(element.id)}>
          {element.type === 'image' ? <Image size={14} /> : <span>T</span>} {element.label}
          {!requiredElementIds.has(element.id) && (
            <span className="layer-actions">
              <Copy size={13} onClick={(event) => { event.stopPropagation(); duplicateElement(element.id); }} />
              <Trash2 size={13} onClick={(event) => { event.stopPropagation(); removeElement(element.id); }} />
            </span>
          )}
        </button>
      ))}
      <p className="layer-subtitle">WINNER ITEM (ALL)</p>
      {[
        ['winnerPosition', 'Position'],
        ['winnerName', 'Name'],
        ['winnerTeam', 'Team'],
        ['winnerPhoto', 'Photo'],
      ].map(([id, label]) => (
        <button key={id} className={selectedId === id ? 'layer-row active child' : 'layer-row child'} onClick={() => setSelectedId(id)}>
          {id === 'winnerPhoto' ? <Image size={14} /> : <span>T</span>} {label}
        </button>
      ))}
      <div className="layer-footer">
        <button onClick={addCustomText}>+ Add custom text field</button>
        <button onClick={addImageElement}>+ Add image element</button>
      </div>
      <p className="helper-text">↑↓←→ Arrow keys nudge selected element (Shift = 10 px)</p>
    </aside>
  );
}
