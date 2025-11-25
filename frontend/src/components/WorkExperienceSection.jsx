import React, { useState } from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import SortableItem from './SortableItem';
import EditJobForm from './EditJobForm';

function WorkExperienceSection({ jobs, onUpdateJob, onRemoveJob, onAddJob }) {
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
            <h3>Work Experience</h3>
            <button onClick={onAddJob} style={{ marginBottom: '10px' }}>Add New Job</button>
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
                                    <button onClick={() => setEditingJobId(job.id)}>Edit</button>
                                    <button onClick={() => onRemoveJob(job.id)} style={{ marginLeft: '10px' }}>Remove</button>
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