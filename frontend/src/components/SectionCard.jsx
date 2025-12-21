import React from 'react';

function SectionCard({ title, children, style }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      {title ? <h3 style={{ margin: '0 0 10px 0' }}>{title}</h3> : null}
      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: '6px',
          backgroundColor: 'white',
          padding: '10px',
          ...(style || {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default SectionCard;

