import React, { useState, useEffect } from 'react';

const ApplicationStatusOptions = [
    'applied',
    'rejected',
    'interview',
    'offer',
    'accepted',
];

function JobDetailsForm({ application, onSave }) {
    const [jobTitle, setJobTitle] = useState('');
    const [company, setCompany] = useState('');
    const [applicationStatus, setApplicationStatus] = useState(ApplicationStatusOptions[0]);
    const [jobDescription, setJobDescription] = useState('');

    useEffect(() => {
        if (application) {
            setJobTitle(application.jobTitle);
            setCompany(application.company);
            setApplicationStatus(application.applicationStatus);
            setJobDescription(application.jobDescription);
        }
    }, [application]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...application, // Keep existing data like ID
            jobTitle,
            company,
            applicationStatus,
            jobDescription,
        });
    };

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
                <label htmlFor="jobTitle" style={{ display: 'block', marginBottom: '5px' }}>Job Title:</label>
                <input
                    type="text"
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
            </div>
            <div>
                <label htmlFor="company" style={{ display: 'block', marginBottom: '5px' }}>Company:</label>
                <input
                    type="text"
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                />
            </div>
            <div>
                <label htmlFor="applicationStatus" style={{ display: 'block', marginBottom: '5px' }}>Status:</label>
                <select
                    id="applicationStatus"
                    value={applicationStatus}
                    onChange={(e) => setApplicationStatus(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                >
                    {ApplicationStatusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="jobDescription" style={{ display: 'block', marginBottom: '5px' }}>Job Description:</label>
                <textarea
                    id="jobDescription"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows="10"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                ></textarea>
            </div>
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Save Details
            </button>
        </form>
    );
}

export default JobDetailsForm;
