import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        marginBottom: '10px',
        cursor: 'grab',
    };

    const safeListeners = {
        ...listeners,
        onPointerDown: (e) => {
            if (e?.target?.closest?.('button, input, textarea, select, a, [contenteditable="true"]')) return;
            listeners?.onPointerDown?.(e);
        },
        onKeyDown: (e) => {
            if (e?.target?.closest?.('button, input, textarea, select, a, [contenteditable="true"]')) return;
            listeners?.onKeyDown?.(e);
        },
        onKeyUp: (e) => {
            if (e?.target?.closest?.('button, input, textarea, select, a, [contenteditable="true"]')) return;
            listeners?.onKeyUp?.(e);
        },
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...safeListeners}>
            {children}
        </div>
    );
}

export default SortableItem;
