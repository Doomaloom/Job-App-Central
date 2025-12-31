import React, { useState } from 'react';
import EditSkillCategoryForm from './EditSkillCategoryForm';

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
                {(skillCategories || []).map(skillCat => (
                    <div key={skillCat.id} style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px', backgroundColor: 'white' }}>
                        {editingSkillCatId === skillCat.id ? (
                            <EditSkillCategoryForm
                                skillCategory={skillCat}
                                onSave={handleSaveSkillCategory}
                                onCancel={handleCancelEdit}
                            />
                        ) : (
                            <div>
                                <h4>{skillCat.catTitle}</h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {(Array.isArray(skillCat.catSkills)
                                        ? skillCat.catSkills
                                        : (skillCat.catSkills || '')
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter(Boolean)
                                    ).map((skill) => (
                                        <span key={skill} style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#e7f1ff', fontSize: '0.9em' }}>
                                            {skill}
                                        </span>
                                    ))}
                                    {!skillCat.catSkills && <span style={{ color: '#777' }}>No skills listed.</span>}
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <button type="button" onClick={() => setEditingSkillCatId(skillCat.id)} className="btn">Edit</button>
                                    <button type="button" onClick={() => onRemoveSkillCategory(skillCat.id)} className="btn btn--danger" style={{ marginLeft: '10px' }}>Remove</button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default SkillsSection;
