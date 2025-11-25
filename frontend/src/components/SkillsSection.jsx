import React, { useState } from 'react';
import EditSkillCategoryForm from './EditSkillCategoryForm';

function SkillsSection({ skillCategories, onUpdateSkillCategory, onRemoveSkillCategory, onAddSkillCategory }) {
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
            <h3>Skills</h3>
            <button onClick={onAddSkillCategory} style={{ marginBottom: '10px' }}>Add New Skill Category</button>
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
                                    <button onClick={() => setEditingSkillCatId(skillCat.id)}>Edit</button>
                                    <button onClick={() => onRemoveSkillCategory(skillCat.id)} style={{ marginLeft: '10px' }}>Remove</button>
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
