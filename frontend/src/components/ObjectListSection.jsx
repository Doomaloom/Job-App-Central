import React, { useState } from 'react';

const sectionStyle = { padding: '10px', border: '1px solid #ccc', marginBottom: '10px', backgroundColor: 'white', borderRadius: '6px' };
const cardStyle = { padding: '10px', border: '1px solid #ddd', borderRadius: '8px', background: '#fafafa' };
const buttonStyle = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' };
const dangerButtonStyle = { ...buttonStyle, borderColor: '#c00', color: '#c00', background: '#fff0f0' };
const addButtonStyle = { ...buttonStyle, borderColor: '#1b7c2f', color: '#1b7c2f', background: '#f2fff6' };

function ObjectListSection({
  title,
  items,
  onChange,
  addLabel,
  makeNewItem,
  renderSummary,
  renderEditor,
  containerStyle,
  addButtonStyle: addButtonStyleProp,
  buttonStyle: buttonStyleProp,
  dangerButtonStyle: dangerButtonStyleProp,
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
    <div style={{ ...sectionStyle, ...(containerStyle || {}) }}>
      {title ? <h3>{title}</h3> : null}
      <button type="button" onClick={handleAdd} style={{ ...(addButtonStyleProp || addButtonStyle), marginBottom: '10px' }}>
        {addLabel}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {(items || []).map((entry) => (
          <div key={entry.id} style={cardStyle}>
            {editingId === entry.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {renderEditor(entry, handleUpdate)}
                <div>
                  <button type="button" onClick={() => setEditingId(null)} style={buttonStyleProp || buttonStyle}>
                    Done
                  </button>
                  <button type="button" onClick={() => handleRemove(entry.id)} style={{ ...(dangerButtonStyleProp || dangerButtonStyle), marginLeft: '10px' }}>
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
                  <button type="button" onClick={() => setEditingId(entry.id)} style={buttonStyleProp || buttonStyle}>
                    Edit
                  </button>
                  <button type="button" onClick={() => handleRemove(entry.id)} style={{ ...(dangerButtonStyleProp || dangerButtonStyle), marginLeft: '10px' }}>
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
