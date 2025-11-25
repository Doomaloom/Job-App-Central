import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import EditProjectForm from './EditProjectForm';

function ProjectsSection({ projects, onUpdateProject, onRemoveProject, onAddProject }) {
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
            <h3>Projects</h3>
            <button onClick={onAddProject} style={{ marginBottom: '10px' }}>Add New Project</button>
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
                                    <button onClick={() => setEditingProjectId(project.id)}>Edit</button>
                                    <button onClick={() => onRemoveProject(project.id)} style={{ marginLeft: '10px' }}>Remove</button>
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
