import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePill({ id, label, onRemove, ariaLabel }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: '999px',
        backgroundColor: '#e7f1ff',
        marginBottom: '6px',
        marginRight: '6px',
        cursor: 'grab',
    };

    const safeListeners = {
        ...listeners,
        onPointerDown: (e) => {
            if (e?.target?.closest?.('button, input, textarea, select, a')) return;
            listeners?.onPointerDown?.(e);
        },
    };

    return (
        <span ref={setNodeRef} style={style} {...attributes} {...safeListeners} aria-label={ariaLabel}>
            <span>{label}</span>
            <button
                type="button"
                onClick={onRemove}
                onPointerDown={(e) => e.stopPropagation()}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
                ×
            </button>
        </span>
    );
}

function SortablePointRow({ id, label, onRemove, onChange }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: '#eef3ff',
        padding: '8px',
        borderRadius: '6px',
        marginBottom: '6px',
    };

    return (
        <div ref={setNodeRef} style={style}>
            <span
                {...attributes}
                {...listeners}
                style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    background: '#c7d6f7',
                    cursor: 'grab',
                    display: 'inline-block',
                    flexShrink: 0,
                }}
                title="Drag to reorder"
            />
            <input
                type="text"
                value={label}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                style={{
                    flexGrow: 1,
                    border: '1px solid #ccd',
                    borderRadius: '4px',
                    padding: '4px 6px',
                }}
            />
            <button
                type="button"
                onClick={onRemove}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
            >
                ×
            </button>
        </div>
    );
}

function EditProjectForm({ project, onSave, onCancel }) {
    const [projectTitle, setProjectTitle] = useState('');
    const [projectTechList, setProjectTechList] = useState([]);
    const [newTech, setNewTech] = useState('');
    const [projectDate, setProjectDate] = useState('');
    const [projectPoints, setProjectPoints] = useState([]);
    const [newPoint, setNewPoint] = useState('');

    useEffect(() => {
        if (project) {
            setProjectTitle(project.projectTitle);
            setProjectDate(project.projectDate);
            const techs = Array.isArray(project.projectTech)
                ? project.projectTech
                : (project.projectTech || '').split(',').map((t) => t.trim()).filter(Boolean);
            setProjectTechList(techs);
            const points = Array.isArray(project.projectPoints)
                ? project.projectPoints
                : (project.projectPoints || '').split('\n').map((p) => p.trim()).filter(Boolean);
            setProjectPoints(points);
        }
    }, [project]);

    const handleAddTech = () => {
        const trimmed = newTech.trim();
        if (!trimmed) return;
        setProjectTechList((prev) => [...prev, trimmed]);
        setNewTech('');
    };

    const handleRemoveTech = (index) => {
        setProjectTechList((prev) => prev.filter((_, i) => i !== index));
    };

    const handleTechDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setProjectTechList((prev) => {
            const oldIndex = parseInt(active.id.replace('tech-', ''), 10);
            const newIndex = parseInt(over.id.replace('tech-', ''), 10);
            if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleAddPoint = () => {
        const trimmed = newPoint.trim();
        if (!trimmed) return;
        setProjectPoints((prev) => [...prev, trimmed]);
        setNewPoint('');
    };

    const handleRemovePoint = (index) => {
        setProjectPoints((prev) => prev.filter((_, i) => i !== index));
    };

    const handleUpdatePoint = (index, value) => {
        setProjectPoints((prev) => prev.map((point, i) => (i === index ? value : point)));
    };

    const handlePointDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setProjectPoints((prev) => {
            const oldIndex = parseInt(active.id.replace('point-', ''), 10);
            const newIndex = parseInt(over.id.replace('point-', ''), 10);
            if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleSave = () => {
        onSave({
            ...project,
            projectTitle,
            projectTech: projectTechList.join(', '),
            projectDate,
            projectPoints,
        });
    };

    return (
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Project Title" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
                <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="Add a technology"
                            value={newTech}
                            onChange={(e) => setNewTech(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddTech();
                                }
                            }}
                            style={{ flexGrow: 1 }}
                        />
                        <button type="button" onClick={handleAddTech} className="btn btn--add">Add</button>
                    </div>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleTechDragEnd}>
                        <SortableContext
                            items={projectTechList.map((_, idx) => `tech-${idx}`)}
                            strategy={rectSortingStrategy}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {projectTechList.map((tech, idx) => (
                                    <SortablePill
                                        key={`tech-${idx}`}
                                        id={`tech-${idx}`}
                                        label={tech}
                                        ariaLabel="Drag to reorder technology"
                                        onRemove={() => handleRemoveTech(idx)}
                                    />
                                ))}
                                {projectTechList.length === 0 && <span style={{ color: '#777' }}>No technologies yet. Add one above.</span>}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
                <input type="text" placeholder="Date" value={projectDate} onChange={(e) => setProjectDate(e.target.value)} />
                <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="Add a project impact point"
                            value={newPoint}
                            onChange={(e) => setNewPoint(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddPoint();
                                }
                            }}
                            style={{ flexGrow: 1 }}
                        />
                        <button type="button" onClick={handleAddPoint} className="btn btn--add">Add</button>
                    </div>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handlePointDragEnd}>
                        <SortableContext
                            items={projectPoints.map((_, idx) => `point-${idx}`)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {projectPoints.map((point, idx) => (
                                    <SortablePointRow
                                        key={`point-${idx}`}
                                        id={`point-${idx}`}
                                        label={point}
                                        onChange={(value) => handleUpdatePoint(idx, value)}
                                        onRemove={() => handleRemovePoint(idx)}
                                    />
                                ))}
                                {projectPoints.length === 0 && <span style={{ color: '#777' }}>No points yet. Add one above.</span>}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
            <div style={{ marginTop: '10px' }}>
                <button type="button" onClick={handleSave} className="btn btn--add">Save</button>
                <button type="button" onClick={onCancel} className="btn" style={{ marginLeft: '10px' }}>Cancel</button>
            </div>
        </div>
    );
}

export default EditProjectForm;
