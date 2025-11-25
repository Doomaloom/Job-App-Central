import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        padding: '10px',
        border: '1px solid #ccc',
        marginBottom: '10px',
        backgroundColor: 'white',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{ flexGrow: 1 }}>
                    {children}
                </div>
                <button
                    type="button"
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    aria-label="Drag to reorder"
                    style={{ cursor: 'grab', border: '1px solid #ccc', background: '#f5f5f5', padding: '6px', borderRadius: '6px' }}
                >
                    ↕
                </button>
            </div>
        </div>
    );
}

export default SortableItem;
