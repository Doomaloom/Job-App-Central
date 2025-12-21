import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import EditJobForm from './EditJobForm';

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
                                    <button type="button" onClick={() => onImportJob(job)} disabled={alreadyAdded} style={buttonStyle}>
                                        {alreadyAdded ? 'Added' : 'Add'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <button type="button" onClick={onAddJob} style={{ ...(addButtonStyle || buttonStyle), marginBottom: '10px' }}>Add New Job</button>
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
                            <div>
                                <h4>{job.jobTitle} at {job.jobEmployer}</h4>
                                <div style={{ marginTop: '10px' }}>
                                    <button type="button" onClick={() => setEditingJobId(job.id)} style={buttonStyle}>Edit</button>
                                    <button type="button" onClick={() => onRemoveJob(job.id)} style={{ ...(dangerButtonStyle || buttonStyle), marginLeft: '10px' }}>Remove</button>
                                </div>
                            </div>
                        )}
                    </SortableItem>
                ))}
            </SortableContext>
        </div>
    );
}

export default WorkExperienceSection;
