import React from 'react';
import ObjectListSection from './ObjectListSection';

const defaultMakeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const labelStyle = { display: 'flex', flexDirection: 'column', gap: '6px' };
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #ccc' };
const textareaStyle = { ...inputStyle, width: '100%', resize: 'vertical' };

function CandidateEducationSection({
  education,
  onChange,
  makeId = defaultMakeId,
  containerStyle,
  addButtonStyle,
  buttonStyle,
  dangerButtonStyle,
}) {
  return (
    <ObjectListSection
      title={null}
      items={education || []}
      onChange={onChange}
      addLabel="Add Education"
      containerStyle={{ border: 'none', padding: 0, background: 'transparent', marginBottom: 0, ...(containerStyle || {}) }}
      addButtonStyle={addButtonStyle}
      buttonStyle={buttonStyle}
      dangerButtonStyle={dangerButtonStyle}
      makeNewItem={() => ({
        id: makeId('edu'),
        school: '',
        degree: '',
        field: '',
        location: '',
        startDate: '',
        endDate: '',
        gpa: '',
        highlights: [],
      })}
      renderSummary={(entry) => {
        const school = entry.school || 'School';
        const degree = entry.degree || 'Degree';
        const field = entry.field ? `, ${entry.field}` : '';
        const dates = (entry.startDate || entry.endDate) ? ` (${entry.startDate || ''}–${entry.endDate || ''})` : '';
        return `${degree}${field} — ${school}${dates}`;
      }}
      renderEditor={(entry, updateEntry) => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>School</span>
            <input
              type="text"
              value={entry.school || ''}
              onChange={(e) => updateEntry({ ...entry, school: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Location</span>
            <input
              type="text"
              value={entry.location || ''}
              onChange={(e) => updateEntry({ ...entry, location: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Degree</span>
            <input
              type="text"
              value={entry.degree || ''}
              onChange={(e) => updateEntry({ ...entry, degree: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Field / Major</span>
            <input
              type="text"
              value={entry.field || ''}
              onChange={(e) => updateEntry({ ...entry, field: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>Start Date</span>
            <input
              type="text"
              value={entry.startDate || ''}
              onChange={(e) => updateEntry({ ...entry, startDate: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>End Date</span>
            <input
              type="text"
              value={entry.endDate || ''}
              onChange={(e) => updateEntry({ ...entry, endDate: e.target.value })}
              style={inputStyle}
            />
          </label>
          <label style={labelStyle}>
            <span style={{ fontWeight: 600 }}>GPA (optional)</span>
            <input
              type="text"
              value={entry.gpa || ''}
              onChange={(e) => updateEntry({ ...entry, gpa: e.target.value })}
              style={inputStyle}
            />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>
              <span style={{ fontWeight: 600 }}>Highlights (one per line)</span>
              <textarea
                value={Array.isArray(entry.highlights) ? entry.highlights.join('\n') : (entry.highlights || '')}
                onChange={(e) =>
                  updateEntry({
                    ...entry,
                    highlights: e.target.value
                      .split('\n')
                      .map((line) => line.trim())
                      .filter(Boolean),
                  })
                }
                rows={4}
                style={textareaStyle}
              />
            </label>
          </div>
        </div>
      )}
    />
  );
}

export default CandidateEducationSection;
