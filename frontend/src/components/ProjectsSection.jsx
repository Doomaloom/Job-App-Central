import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import EditProjectForm from './EditProjectForm';

const normalizePoints = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    return value.split('\n').map((v) => v.trim()).filter(Boolean);
};

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
    const [expandedProjects, setExpandedProjects] = useState(() => new Set());

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
                                    <button type="button" onClick={() => onImportProject(proj)} disabled={alreadyAdded} className="btn btn--add btn--sm">
                                        {alreadyAdded ? 'Added' : 'Add'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <div className="btnRow" style={{ marginBottom: '10px' }}>
                <button type="button" onClick={onGetProjects} className="btn btn--primary">Get GitHub Projects</button>
                <button type="button" onClick={onAddProject} className="btn btn--add">Add New Project</button>
            </div>
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
                            <div className="panel panel--padded">
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ fontWeight: 700 }}>{project.projectTitle || 'Untitled Project'}</div>
                                        <div className="muted" style={{ fontSize: '0.9em', marginTop: '2px' }}>
                                            {[project.projectTech, project.projectDate].filter(Boolean).join(' • ')}
                                        </div>
                                    </div>
                                    <div className="btnRow" style={{ justifyContent: 'flex-end' }}>
                                        <button type="button" onClick={() => setEditingProjectId(project.id)} className="btn btn--sm">Edit</button>
                                        <button type="button" onClick={() => onRemoveProject(project.id)} className="btn btn--danger btn--sm">Remove</button>
                                    </div>
                                </div>

                                {(() => {
                                    const points = normalizePoints(project.projectPoints);
                                    if (points.length === 0) return <div className="muted" style={{ marginTop: '10px' }}>No points yet.</div>;
                                    const expanded = expandedProjects.has(project.id);
                                    const maxVisible = 4;
                                    const visible = expanded ? points : points.slice(0, maxVisible);
                                    const hiddenCount = points.length - visible.length;
                                    return (
                                        <div style={{ marginTop: '10px' }}>
                                            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {visible.map((p, idx) => (
                                                    <li key={`${project.id}-pt-${idx}`} style={{ color: '#333' }}>{p}</li>
                                                ))}
                                            </ul>
                                            {hiddenCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="btn btn--sm"
                                                    style={{ marginTop: '8px' }}
                                                    onClick={() => {
                                                        setExpandedProjects((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(project.id)) next.delete(project.id);
                                                            else next.add(project.id);
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
                    </SortableItem>
                ))}
            </SortableContext>
        </div>
    );
}

export default ProjectsSection;
