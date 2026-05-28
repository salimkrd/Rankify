import React from 'react';

function textStyle(element) {
  return {
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
    fontWeight: element.fontWeight,
    color: element.color,
    lineHeight: element.lineHeight,
    textAlign: element.textAlign,
  };
}

function formatPosition(position, element) {
  if (!element.ordinalSuffix) return position;
  const value = Number(position);
  if (Number.isNaN(value)) return position;
  const suffix = value % 10 === 1 && value % 100 !== 11 ? 'st' : value % 10 === 2 && value % 100 !== 12 ? 'nd' : value % 10 === 3 && value % 100 !== 13 ? 'rd' : 'th';
  return `${value}${suffix}`;
}

export default function DraggableElement({ element, selectedId, setSelectedId, startDrag, previewData, elements }) {
  const isSelected = selectedId === element.id;
  const baseStyle = {
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    opacity: element.opacity,
    transform: `rotate(${element.rotation || 0}deg)`,
  };

  if (element.type === 'winnerContainer') {
    const position = elements.find((item) => item.id === 'winnerPosition');
    const name = elements.find((item) => item.id === 'winnerName');
    const team = elements.find((item) => item.id === 'winnerTeam');
    const photo = elements.find((item) => item.id === 'winnerPhoto');

    return (
      <div className={isSelected ? 'canvas-element winner-box selected' : 'canvas-element winner-box'} style={baseStyle} onMouseDown={(event) => startDrag(event, element)} onClick={(event) => { event.stopPropagation(); setSelectedId(element.id); }}>
        {previewData.winners.map((winner, index) => (
          <div key={index} className="winner-row-preview" style={{ top: element.direction === 'horizontal' ? 0 : index * (Number(element.spacing || 28) + 34), left: element.direction === 'horizontal' ? index * 190 : 0 }}>
            {photo && winner.photo && (
              <span
                style={{
                  position: 'absolute',
                  left: photo.x,
                  top: photo.y,
                  width: photo.width,
                  height: photo.height,
                  overflow: 'hidden',
                  borderRadius: Number(photo.borderRadius || 0),
                }}
              >
                <img
                  src={winner.photo}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: (photo.objectFit || 'cover').toLowerCase(),
                    display: 'block',
                  }}
                />
              </span>
            )}
            {position && <span style={{ ...positionStyle(position), position: 'absolute', left: position.x, top: position.y }}>{formatPosition(winner.position, position)}</span>}
            {name && <strong style={{ ...textStyle(name), position: 'absolute', left: name.x, top: name.y, width: name.width }}>{winner.name}</strong>}
            {team && <em style={{ ...textStyle(team), position: 'absolute', left: team.x, top: team.y, width: team.width }}>{winner.team}</em>}
          </div>
        ))}
      </div>
    );
  }

  if (element.type === 'winnerText' || element.type === 'winnerPhoto') return null;

  if (element.type === 'image') {
    return (
      <div
        className={isSelected ? 'canvas-element image-element selected' : 'canvas-element image-element'}
        style={{
          ...baseStyle,
          overflow: 'hidden',
          borderRadius: Number(element.borderRadius || 0),
        }}
        onMouseDown={(event) => startDrag(event, element)}
        onClick={(event) => { event.stopPropagation(); setSelectedId(element.id); }}
      >
        {element.src ? (
          <img
            src={element.src}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: (element.objectFit || 'cover').toLowerCase(),
              display: 'block',
            }}
          />
        ) : <span>No Image</span>}
      </div>
    );
  }

  const text = element.dataKey === 'programName' ? previewData.programName
    : element.dataKey === 'category' ? previewData.category
      : element.dataKey === 'resultNumber' ? `${element.prefix || 'Result'} ${previewData.resultNumber}`
        : previewData[element.dataKey] || element.label;

  return (
    <div className={isSelected ? 'canvas-element text-element selected' : 'canvas-element text-element'} style={{ ...baseStyle, ...textStyle(element) }} onMouseDown={(event) => startDrag(event, element)} onClick={(event) => { event.stopPropagation(); setSelectedId(element.id); }}>
      {text}
    </div>
  );
}

function positionStyle(element) {
  const radius = element.backgroundType === 'Circle' ? 999 : element.backgroundType === 'Rounded' ? 8 : 0;
  return {
    ...textStyle(element),
    display: 'inline-grid',
    placeItems: 'center',
    padding: element.showBackground ? Number(element.backgroundPadding || 0) : 0,
    background: element.showBackground ? element.backgroundColor : 'transparent',
    borderRadius: radius,
    WebkitTextStroke: element.showStroke ? `${Number(element.strokeWidth || 1)}px ${element.strokeColor || '#FFC107'}` : undefined,
  };
}
