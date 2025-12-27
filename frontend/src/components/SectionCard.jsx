import React from 'react';

function SectionCard({ title, children, style }) {
  return (
    <div className="sectionCard">
      {title ? <h3 className="sectionCard__title">{title}</h3> : null}
      <div
        className="sectionCard__body"
        style={style || undefined}
      >
        {children}
      </div>
    </div>
  );
}

export default SectionCard;
