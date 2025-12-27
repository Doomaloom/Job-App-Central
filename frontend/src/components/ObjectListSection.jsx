import React, { useState } from 'react';

function ObjectListSection({
  title,
  items,
  onChange,
  addLabel,
  makeNewItem,
  renderSummary,
  renderEditor,
  containerStyle,
}) {
  const [editingId, setEditingId] = useState(null);

  const handleAdd = () => {
    const next = [...(items || []), makeNewItem()];
    onChange(next);
    setEditingId(next[next.length - 1]?.id || null);
  };

  const handleRemove = (id) => onChange((items || []).filter((entry) => entry.id !== id));

  const handleUpdate = (updated) =>
    onChange((items || []).map((entry) => (entry.id === updated.id ? updated : entry)));

  return (
    <div className="panel panel--padded" style={containerStyle || undefined}>
      {title ? <h3>{title}</h3> : null}
      <button type="button" onClick={handleAdd} className="btn btn--add" style={{ marginBottom: '10px' }}>
        {addLabel}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(items || []).map((entry) => (
          <div key={entry.id} className="listCard">
            {editingId === entry.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {renderEditor(entry, handleUpdate)}
                <div>
                  <button type="button" onClick={() => setEditingId(null)} className="btn">
                    Done
                  </button>
                  <button type="button" onClick={() => handleRemove(entry.id)} className="btn btn--danger" style={{ marginLeft: '10px' }}>
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{renderSummary(entry)}</div>
                </div>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" onClick={() => setEditingId(entry.id)} className="btn">
                    Edit
                  </button>
                  <button type="button" onClick={() => handleRemove(entry.id)} className="btn btn--danger" style={{ marginLeft: '10px' }}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {(items || []).length === 0 && <div style={{ color: '#777' }}>No entries yet.</div>}
      </div>
    </div>
  );
}

export default ObjectListSection;
