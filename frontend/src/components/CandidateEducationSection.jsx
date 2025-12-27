import React from 'react';
import ObjectListSection from './ObjectListSection';

const defaultMakeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function CandidateEducationSection({
  education,
  onChange,
  makeId = defaultMakeId,
  containerStyle,
}) {
  return (
    <ObjectListSection
      title={null}
      items={education || []}
      onChange={onChange}
      addLabel="Add Education"
      containerStyle={{ border: 'none', padding: 0, background: 'transparent', marginBottom: 0, ...(containerStyle || {}) }}
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
          <label className="label">
            <span className="labelText">School</span>
            <input
              type="text"
              value={entry.school || ''}
              onChange={(e) => updateEntry({ ...entry, school: e.target.value })}
              className="input"
            />
          </label>
          <label className="label">
            <span className="labelText">Location</span>
            <input
              type="text"
              value={entry.location || ''}
              onChange={(e) => updateEntry({ ...entry, location: e.target.value })}
              className="input"
            />
          </label>
          <label className="label">
            <span className="labelText">Degree</span>
            <input
              type="text"
              value={entry.degree || ''}
              onChange={(e) => updateEntry({ ...entry, degree: e.target.value })}
              className="input"
            />
          </label>
          <label className="label">
            <span className="labelText">Field / Major</span>
            <input
              type="text"
              value={entry.field || ''}
              onChange={(e) => updateEntry({ ...entry, field: e.target.value })}
              className="input"
            />
          </label>
          <label className="label">
            <span className="labelText">Start Date</span>
            <input
              type="text"
              value={entry.startDate || ''}
              onChange={(e) => updateEntry({ ...entry, startDate: e.target.value })}
              className="input"
            />
          </label>
          <label className="label">
            <span className="labelText">End Date</span>
            <input
              type="text"
              value={entry.endDate || ''}
              onChange={(e) => updateEntry({ ...entry, endDate: e.target.value })}
              className="input"
            />
          </label>
          <label className="label">
            <span className="labelText">GPA (optional)</span>
            <input
              type="text"
              value={entry.gpa || ''}
              onChange={(e) => updateEntry({ ...entry, gpa: e.target.value })}
              className="input"
            />
          </label>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">
              <span className="labelText">Highlights (one per line)</span>
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
                className="textarea"
              />
            </label>
          </div>
        </div>
      )}
    />
  );
}

export default CandidateEducationSection;
