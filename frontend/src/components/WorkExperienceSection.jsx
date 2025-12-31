import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import EditJobForm from './EditJobForm';

const normalizePoints = (value) => {
    if (Array.isArray(value)) return value.filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
    if (typeof value !== 'string') return [];
    return value.split('\n').map((v) => v.trim()).filter(Boolean);
};

function WorkExperienceSection({
    jobs,
    onUpdateJob,
    onRemoveJob,
    onAddJob,
    baseJobs = [],
    onImportJob,
    isJobImported,
    showTitle = true,
    addButtonStyle,
    buttonStyle,
    dangerButtonStyle,
}) {
    const [editingJobId, setEditingJobId] = useState(null);
    const [expandedJobs, setExpandedJobs] = useState(() => new Set());

    const handleSaveJob = (updatedJob) => {
        onUpdateJob(updatedJob);
        setEditingJobId(null);
    };

    const handleCancelEdit = () => {
        setEditingJobId(null);
    };
    
    if (!jobs) {
        return <div>Loading work experience...</div>;
    }

    return (
        <div>
            {showTitle ? <h3>Work Experience</h3> : null}
            {baseJobs.length > 0 && onImportJob && (
                <div style={{ marginBottom: '10px', padding: '8px', border: '1px dashed #ccc', borderRadius: '8px', background: '#fafafa' }}>
                    <div style={{ fontWeight: 600, marginBottom: '6px' }}>Import from Profile</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {baseJobs.map((job) => {
                            const alreadyAdded = isJobImported ? isJobImported(job) : false;
                            return (
                                <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{job.jobTitle || 'Untitled Job'}</div>
                                        <div style={{ color: '#555', fontSize: '0.9em' }}>{job.jobEmployer}</div>
                                    </div>
                                    <button type="button" onClick={() => onImportJob(job)} disabled={alreadyAdded} className="btn btn--add btn--sm">
                                        {alreadyAdded ? 'Added' : 'Add'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <button type="button" onClick={onAddJob} className="btn btn--add" style={{ marginBottom: '10px' }}>Add New Job</button>
            <SortableContext
                items={jobs.map(j => j.id)}
                strategy={verticalListSortingStrategy}
            >
                {jobs.map(job => (
                    <SortableItem key={job.id} id={job.id}>
                        {editingJobId === job.id ? (
                            <EditJobForm
                                job={job}
                                onSave={handleSaveJob}
                                onCancel={handleCancelEdit}
                            />
                        ) : (
                            <div className="panel panel--padded">
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                                    <div style={{ flexGrow: 1 }}>
                                        <div style={{ fontWeight: 700 }}>
                                            {job.jobTitle || 'Untitled Role'}
                                            {job.jobEmployer ? ` — ${job.jobEmployer}` : ''}
                                        </div>
                                        <div className="muted" style={{ fontSize: '0.9em', marginTop: '2px' }}>
                                            {[job.jobLocation, [job.jobStartDate, job.jobEndDate].filter(Boolean).join(' – ')].filter(Boolean).join(' • ')}
                                        </div>
                                    </div>
                                    <div className="btnRow" style={{ justifyContent: 'flex-end' }}>
                                        <button type="button" onClick={() => setEditingJobId(job.id)} className="btn btn--sm">Edit</button>
                                        <button type="button" onClick={() => onRemoveJob(job.id)} className="btn btn--danger btn--sm">Remove</button>
                                    </div>
                                </div>

                                {(() => {
                                    const points = normalizePoints(job.jobPoints);
                                    if (points.length === 0) return <div className="muted" style={{ marginTop: '10px' }}>No points yet.</div>;
                                    const expanded = expandedJobs.has(job.id);
                                    const maxVisible = 4;
                                    const visible = expanded ? points : points.slice(0, maxVisible);
                                    const hiddenCount = points.length - visible.length;
                                    return (
                                        <div style={{ marginTop: '10px' }}>
                                            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {visible.map((p, idx) => (
                                                    <li key={`${job.id}-pt-${idx}`} style={{ color: '#333' }}>{p}</li>
                                                ))}
                                            </ul>
                                            {hiddenCount > 0 && (
                                                <button
                                                    type="button"
                                                    className="btn btn--sm"
                                                    style={{ marginTop: '8px' }}
                                                    onClick={() => {
                                                        setExpandedJobs((prev) => {
                                                            const next = new Set(prev);
                                                            if (next.has(job.id)) next.delete(job.id);
                                                            else next.add(job.id);
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

export default WorkExperienceSection;
