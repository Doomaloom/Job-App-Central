import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSkillPill({ id, label, onRemove }) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({ id });
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
    };
    return (
        <span ref={setNodeRef} style={style}>
            <span>{label}</span>
            <button type="button" onClick={onRemove} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
            <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder skill"
                style={{ cursor: 'grab', border: '1px solid #ccc', background: '#f5f5f5', padding: '4px 6px', borderRadius: '6px' }}
            >
                ↕
            </button>
        </span>
    );
}

function EditSkillCategoryForm({ skillCategory, onSave, onCancel }) {
    const [catTitle, setCatTitle] = useState('');
    const [newSkill, setNewSkill] = useState('');
    const [skills, setSkills] = useState([]);

    useEffect(() => {
        if (skillCategory) {
            setCatTitle(skillCategory.catTitle);
            const parsedSkills = Array.isArray(skillCategory.catSkills)
                ? skillCategory.catSkills
                : (skillCategory.catSkills || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
            setSkills(parsedSkills);
        }
    }, [skillCategory]);

    const handleAddSkill = () => {
        const trimmed = newSkill.trim();
        if (!trimmed) return;
        setSkills((prev) => [...prev, trimmed]);
        setNewSkill('');
    };

    const handleRemoveSkill = (index) => {
        setSkills((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        setSkills((prev) => {
            const oldIndex = parseInt(active.id.replace('skill-', ''), 10);
            const newIndex = parseInt(over.id.replace('skill-', ''), 10);
            if (Number.isNaN(oldIndex) || Number.isNaN(newIndex)) return prev;
            return arrayMove(prev, oldIndex, newIndex);
        });
    };

    const handleSave = () => {
        onSave({
            ...skillCategory,
            catTitle,
            catSkills: skills,
        });
    };

    return (
        <div style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '5px', backgroundColor: '#f9f9f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" placeholder="Category Title" value={catTitle} onChange={(e) => setCatTitle(e.target.value)} />
                <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                            type="text"
                            placeholder="Add a skill"
                            value={newSkill}
                            onChange={(e) => setNewSkill(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddSkill();
                                }
                            }}
                            style={{ flexGrow: 1 }}
                        />
                        <button type="button" onClick={handleAddSkill} className="btn btn--add">Add</button>
                    </div>
                    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext
                            items={skills.map((_, idx) => `skill-${idx}`)}
                            strategy={rectSortingStrategy}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {skills.map((skill, idx) => (
                                    <SortableSkillPill
                                        key={`skill-${idx}`}
                                        id={`skill-${idx}`}
                                        label={skill}
                                        onRemove={() => handleRemoveSkill(idx)}
                                    />
                                ))}
                                {skills.length === 0 && <span style={{ color: '#777' }}>No skills yet. Add one above.</span>}
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

export default EditSkillCategoryForm;
