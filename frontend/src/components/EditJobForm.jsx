import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortablePointRow({ id, label, onRemove }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });
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
            <span style={{ flexGrow: 1 }}>{label}</span>
            <button type="button" onClick={onRemove} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
            <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder point"
                style={{ cursor: 'grab', border: '1px solid #ccc', background: '#f5f5f5', padding: '6px', borderRadius: '6px' }}
            >
                ↕
            </button>
        </div>
    );
}

function EditJobForm({ job, onSave, onCancel }) {
    const [jobTitle, setJobTitle] = useState('');
    const [jobEmployer, setJobEmployer] = useState('');
    const [jobLocation, setJobLocation] = useState('');
    const [jobStartDate, setJobStartDate] = useState('');
    const [jobEndDate, setJobEndDate] = useState('');
    const [jobPoints, setJobPoints] = useState([]);
    const [newPoint, setNewPoint] = useState('');

    useEffect(() => {
        if (job) {
            setJobTitle(job.jobTitle);
            setJobEmployer(job.jobEmployer);
            setJobLocation(job.jobLocation);
            setJobStartDate(job.jobStartDate);
            setJobEndDate(job.jobEndDate);
            const points = Array.isArray(job.jobPoints)
                ? job.jobPoints
                : (job.jobPoints || '').split('\n').map((p) => p.trim()).filter(Boolean);
            setJobPoints(points);
        }
    }, [job]);

    const handleAddPoint = () => {
        const trimmed = newPoint.trim();
        if (!trimmed) return;
        setJobPoints((prev) => [...prev, trimmed]);
        setNewPoint('');
    };

    const handleRemovePoint = (index) => {
        setJobPoints((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setJobPoints((prev) => {
            const oldIndex = parseInt(active.id.replace('point-', ''), 10);
            const newIndex = parseInt(over.id.replace('point-', ''), 10);
            if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleSave = () => {
        onSave({
            ...job,
            jobTitle,
            jobEmployer,
            jobLocation,
            jobStartDate,
            jobEndDate,
            jobPoints,
        });
    };

    return (
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Job Title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
                <input type="text" placeholder="Employer" value={jobEmployer} onChange={(e) => setJobEmployer(e.target.value)} />
                <input type="text" placeholder="Location" value={jobLocation} onChange={(e) => setJobLocation(e.target.value)} />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="text" placeholder="Start Date" value={jobStartDate} onChange={(e) => setJobStartDate(e.target.value)} />
                    <input type="text" placeholder="End Date" value={jobEndDate} onChange={(e) => setJobEndDate(e.target.value)} />
                </div>
                <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="Add a job point"
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
                        <button type="button" onClick={handleAddPoint}>Add</button>
                    </div>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext
                            items={jobPoints.map((_, idx) => `point-${idx}`)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {jobPoints.map((point, idx) => (
                                    <SortablePointRow
                                        key={`point-${idx}`}
                                        id={`point-${idx}`}
                                        label={point}
                                        onRemove={() => handleRemovePoint(idx)}
                                    />
                                ))}
                                {jobPoints.length === 0 && <span style={{ color: '#777' }}>No points yet. Add one above.</span>}
                            </div>
                        </SortableContext>
                    </DndContext>
                </div>
            </div>
            <div style={{ marginTop: '10px' }}>
                <button type="button" onClick={handleSave}>Save</button>
                <button type="button" onClick={onCancel} style={{ marginLeft: '10px' }}>Cancel</button>
            </div>
        </div>
    );
}

export default EditJobForm;
