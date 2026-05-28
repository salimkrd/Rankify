import React from 'react';

export default function PreviewDataPanel({ previewData, setPreviewData, open, setOpen }) {
  const updateWinner = (index, patch) => {
    setPreviewData((current) => ({ ...current, winners: current.winners.map((winner, i) => (i === index ? { ...winner, ...patch } : winner)) }));
  };

  const uploadWinnerPhoto = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateWinner(index, { photo: reader.result });
    reader.readAsDataURL(file);
  };

  return (
    <div className="preview-data-panel">
      <button className="preview-data-toggle" onClick={() => setOpen(!open)}>Example Poster Data for Preview <span>{open ? '⌃' : '⌄'}</span></button>
      {open && (
        <div className="preview-data-body">
          <p>Adjust these values to see how your template elements will look with real data. These values are NOT saved with the template.</p>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['programName', 'Program Name'],
              ['category', 'Program Category'],
              ['resultNumber', 'Result Number'],
              ['eventName', 'Event Name'],
              ['organizerName', 'Organizer Name'],
              ['eventDate', 'Event Date (string)'],
              ['eventLocation', 'Event Location'],
              ['customField1', 'Custom Field 1'],
            ].map(([key, label]) => (
              <label key={key}>{label}<input className="event-input" value={previewData[key] || ''} onChange={(event) => setPreviewData({ ...previewData, [key]: event.target.value })} /></label>
            ))}
          </div>
          <h3>Example Winners</h3>
          {previewData.winners.map((winner, index) => (
            <div key={index} className="winner-data-row">
              <button className="remove-winner" onClick={() => setPreviewData({ ...previewData, winners: previewData.winners.filter((_, i) => i !== index) })}>×</button>
              <strong>Winner {index + 1} Example Data</strong>
              <div className="grid gap-2 md:grid-cols-4">
                <label>Position<input className="event-input" value={winner.position} onChange={(event) => updateWinner(index, { position: event.target.value })} /></label>
                <label>Name<input className="event-input" value={winner.name} onChange={(event) => updateWinner(index, { name: event.target.value })} /></label>
                <label>Team<input className="event-input" value={winner.team} onChange={(event) => updateWinner(index, { team: event.target.value })} /></label>
                <label>Image File<input className="event-input" type="file" accept="image/*" onChange={(event) => uploadWinnerPhoto(index, event)} /></label>
              </div>
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setPreviewData({ ...previewData, winners: [...previewData.winners, { position: String(previewData.winners.length + 1), name: 'New Winner', team: 'Team', photo: '' }] })}>+ Add Example Winner</button>
        </div>
      )}
    </div>
  );
}
