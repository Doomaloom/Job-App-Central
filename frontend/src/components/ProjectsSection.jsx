import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import EditProjectForm from './EditProjectForm';

function ProjectsSection({
    projects,
    onUpdateProject,
    onRemoveProject,
    onAddProject,
    onGetProjects,
    baseProjects = [],
    onImportProject,
    isProjectImported,
    showTitle = true,
    addButtonStyle,
    buttonStyle,
    dangerButtonStyle,
}) {
    const [editingProjectId, setEditingProjectId] = useState(null);

    const handleSaveProject = (updatedProject) => {
        onUpdateProject(updatedProject);
        setEditingProjectId(null);
    };

    const handleCancelEdit = () => {
        setEditingProjectId(null);
    };

    if (!projects) {
        return <div>Loading projects...</div>;
    }

    return (
        <div>
            {showTitle ? <h3>Projects</h3> : null}
            {baseProjects.length > 0 && onImportProject && (
                <div style={{ marginBottom: '10px', padding: '8px', border: '1px dashed #ccc', borderRadius: '8px', background: '#fafafa' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>Import from Profile</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {baseProjects.map((proj) => {
                            const alreadyAdded = isProjectImported ? isProjectImported(proj) : false;
                            return (
                                <div key={proj.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{proj.projectTitle || 'Untitled Project'}</div>
                                        <div style={{ color: '#555', fontSize: '0.9em' }}>{proj.projectDate}</div>
                                    </div>
                                    <button type="button" onClick={() => onImportProject(proj)} disabled={alreadyAdded} style={buttonStyle}>
                                        {alreadyAdded ? 'Added' : 'Add'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <button type="button" onClick={onGetProjects} style={{ ...(addButtonStyle || buttonStyle), marginBottom: '10px', marginRight: '10px' }}>Get Github Projects</button>
            <button type="button" onClick={onAddProject} style={{ ...(addButtonStyle || buttonStyle), marginBottom: '10px' }}>Add New Project</button>
            <SortableContext
                items={projects.map(p => p.id)}
                strategy={verticalListSortingStrategy}
            >
                {projects.map(project => (
                    <SortableItem key={project.id} id={project.id}>
                        {editingProjectId === project.id ? (
                            <EditProjectForm
                                project={project}
                                onSave={handleSaveProject}
                                onCancel={handleCancelEdit}
                            />
                        ) : (
                            <div>
                                <h4>{project.projectTitle}</h4>
                                <div style={{ marginTop: '10px' }}>
                                    <button type="button" onClick={() => setEditingProjectId(project.id)} style={buttonStyle}>Edit</button>
                                    <button type="button" onClick={() => onRemoveProject(project.id)} style={{ ...(dangerButtonStyle || buttonStyle), marginLeft: '10px' }}>Remove</button>
                                </div>
                            </div>
                        )}
                    </SortableItem>
                ))}
            </SortableContext>
        </div>
    );
}

export default ProjectsSection;
