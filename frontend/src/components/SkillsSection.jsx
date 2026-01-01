import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import EditSkillCategoryForm from './EditSkillCategoryForm';

const normalizeSkills = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    return value.split(',').map((v) => v.trim()).filter(Boolean);
};

function SkillsSection({
    skillCategories,
    onUpdateSkillCategory,
    onRemoveSkillCategory,
    onAddSkillCategory,
    baseSkillCategories = [],
    onImportSkillCategory,
    isSkillCategoryImported,
    showTitle = true,
    addButtonStyle,
    buttonStyle,
    dangerButtonStyle,
}) {
    const [editingSkillCatId, setEditingSkillCatId] = useState(null);
    const [expandedCats, setExpandedCats] = useState(() => new Set());

    const handleSaveSkillCategory = (updatedSkillCat) => {
        onUpdateSkillCategory(updatedSkillCat);
        setEditingSkillCatId(null);
    };

    const handleCancelEdit = () => {
        setEditingSkillCatId(null);
    };
    
    if (!skillCategories) {
        return <div>Loading skills...</div>;
    }

    return (
        <div>
            {showTitle ? <h3>Skills</h3> : null}
            {baseSkillCategories.length > 0 && onImportSkillCategory && (
                <div style={{ marginBottom: '10px', padding: '8px', border: '1px dashed #ccc', borderRadius: '8px', background: '#fafafa' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>Import from Profile</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {baseSkillCategories.map((cat) => {
                            const alreadyAdded = isSkillCategoryImported ? isSkillCategoryImported(cat) : false;
                            return (
                                <div key={cat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{cat.catTitle || 'Untitled Category'}</div>
                                        <div style={{ color: '#555', fontSize: '0.9em' }}>
                                            {(Array.isArray(cat.catSkills) ? cat.catSkills : []).slice(0, 3).join(', ')}
                                            {(Array.isArray(cat.catSkills) && cat.catSkills.length > 3) ? '…' : ''}
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => onImportSkillCategory(cat)} disabled={alreadyAdded} className="btn btn--add btn--sm">
                                        {alreadyAdded ? 'Added' : 'Add'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <button type="button" onClick={onAddSkillCategory} className="btn btn--add" style={{ marginBottom: '10px' }}>Add New Skill Category</button>
            <div>
                <SortableContext
                    items={(skillCategories || []).map((cat) => cat.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {(skillCategories || []).map(skillCat => (
                        <SortableItem key={skillCat.id} id={skillCat.id}>
                            <div className="panel panel--padded" style={{ marginBottom: '10px' }}>
                                {editingSkillCatId === skillCat.id ? (
                                    <EditSkillCategoryForm
                                        skillCategory={skillCat}
                                        onSave={handleSaveSkillCategory}
                                        onCancel={handleCancelEdit}
                                    />
                                ) : (
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 700 }}>{skillCat.catTitle || 'Skills'}</div>
                                            <div className="btnRow" style={{ justifyContent: 'flex-end' }}>
                                                <button type="button" onClick={() => setEditingSkillCatId(skillCat.id)} className="btn btn--sm">Edit</button>
                                                <button type="button" onClick={() => onRemoveSkillCategory(skillCat.id)} className="btn btn--danger btn--sm">Remove</button>
                                            </div>
                                        </div>

                                        {(() => {
                                            const skills = normalizeSkills(skillCat.catSkills);
                                            if (skills.length === 0) return <div className="muted" style={{ marginTop: '10px' }}>No skills listed.</div>;
                                            const expanded = expandedCats.has(skillCat.id);
                                            const maxVisible = 12;
                                            const visible = expanded ? skills : skills.slice(0, maxVisible);
                                            const hiddenCount = skills.length - visible.length;
                                            return (
                                                <div style={{ marginTop: '10px' }}>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {visible.map((skill) => (
                                                            <span key={`${skillCat.id}-${skill}`} style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#e7f1ff', fontSize: '0.9em' }}>
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    {hiddenCount > 0 && (
                                                        <button
                                                            type="button"
                                                            className="btn btn--sm"
                                                            style={{ marginTop: '8px' }}
                                                            onClick={() => {
                                                                setExpandedCats((prev) => {
                                                                    const next = new Set(prev);
                                                                    if (next.has(skillCat.id)) next.delete(skillCat.id);
                                                                    else next.add(skillCat.id);
                                                                    return next;
                                                                });
                                                            }}
                                                        >
                                                            {expanded ? 'Show less' : `Show ${hiddenCount} more`}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </SortableItem>
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

export default SkillsSection;
