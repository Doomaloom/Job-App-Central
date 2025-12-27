import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import JobDetailsForm from './components/JobDetailsForm';
import ResumeEditor from './components/ResumeEditor'; // Import the new component
import ProfilePage from './components/ProfilePage';
import CoverLetterEditor from './components/CoverLetterEditor';

const defaultResume = () => ({
    objective: '',
    relevantCourses: [],
    jobs: [],
    projects: [],
    skillCategories: [],
});

const defaultCoverLetter = () => ({
    address: '',
    greeting: '',
    paragraphs: [''],
    closing: '',
});

const defaultCandidate = () => ({
    headline: '',
    summary: '',
    objective: '',
    relevantCourses: [],
    jobs: [],
    projects: [],
    skillCategories: [],
    education: [],
    certifications: [],
    awards: [],
    languages: [],
    links: {
        website: '',
        portfolio: '',
        other: [],
    },
    additionalInfo: '',
});

const defaultProfile = () => ({
    name: 'Your Name',
    role: 'Applicant',
    email: 'you@example.com',
    number: '',
    linkedin: '',
    github: '',
    location: '',
    bio: '',
    candidate: defaultCandidate(),
});

const normalizeList = (value, delimiter = ',') => {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== 'string') return [];
    return value
        .split(delimiter)
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const hydrateCandidateForEditor = (candidate) => {
    const base = { ...defaultCandidate(), ...(candidate || {}) };
    const now = Date.now();
    const makeStableId = (prefix, index) => `${prefix}-${now}-${index}-${Math.random().toString(16).slice(2, 8)}`;

    const jobs = (base.jobs || []).map((job, idx) => ({
        id: job.id || makeStableId('job', idx),
        jobTitle: job.jobTitle || '',
        jobEmployer: job.jobEmployer || '',
        jobLocation: job.jobLocation || '',
        jobStartDate: job.jobStartDate || '',
        jobEndDate: job.jobEndDate || '',
        jobPoints: normalizeList(job.jobPoints, '\n'),
    }));

    const projects = (base.projects || []).map((proj, idx) => ({
        id: proj.id || makeStableId('project', idx),
        projectTitle: proj.projectTitle || '',
        projectTech: Array.isArray(proj.projectTech)
            ? proj.projectTech.filter(Boolean).join(', ')
            : (proj.projectTech || ''),
        projectDate: proj.projectDate || '',
        projectPoints: normalizeList(proj.projectPoints, '\n'),
    }));

    const skillCategories = (base.skillCategories || []).map((cat, idx) => ({
        id: cat.id || makeStableId('skill', idx),
        catTitle: cat.catTitle || '',
        catSkills: normalizeList(cat.catSkills, ','),
    }));

    const education = (base.education || []).map((entry, idx) => ({
        id: entry.id || makeStableId('edu', idx),
        school: entry.school || '',
        degree: entry.degree || '',
        field: entry.field || '',
        location: entry.location || '',
        startDate: entry.startDate || '',
        endDate: entry.endDate || '',
        gpa: entry.gpa || '',
        highlights: normalizeList(entry.highlights, '\n'),
    }));

    const certifications = (base.certifications || []).map((entry, idx) => ({
        id: entry.id || makeStableId('cert', idx),
        name: entry.name || '',
        issuer: entry.issuer || '',
        date: entry.date || '',
        url: entry.url || '',
    }));

    const awards = (base.awards || []).map((entry, idx) => ({
        id: entry.id || makeStableId('award', idx),
        title: entry.title || '',
        issuer: entry.issuer || '',
        date: entry.date || '',
        details: entry.details || '',
    }));

    const languages = (base.languages || []).map((entry, idx) => ({
        id: entry.id || makeStableId('lang', idx),
        language: entry.language || '',
        proficiency: entry.proficiency || '',
    }));

    return {
        ...base,
        objective: base.objective || '',
        relevantCourses: normalizeList(base.relevantCourses, ','),
        jobs,
        projects,
        skillCategories,
        education,
        certifications,
        awards,
        languages,
        links: {
            website: base.links?.website || '',
            portfolio: base.links?.portfolio || '',
            other: normalizeList(base.links?.other, ','),
        },
        preferences: {
            workAuthorization: base.preferences?.workAuthorization || '',
            sponsorshipRequired: Boolean(base.preferences?.sponsorshipRequired),
            remotePreference: base.preferences?.remotePreference || '',
            preferredLocations: normalizeList(base.preferences?.preferredLocations, ','),
            desiredTitles: normalizeList(base.preferences?.desiredTitles, ','),
            salaryRange: base.preferences?.salaryRange || '',
            startDate: base.preferences?.startDate || '',
        },
    };
};

const normalizeResumeForBackend = (resume = defaultResume()) => {
    const safeResume = resume || {};
    return {
        ...defaultResume(),
        ...safeResume,
        relevantCourses: normalizeList(safeResume.relevantCourses, ','),
        jobs: (safeResume.jobs || []).map((job) => ({
            ...job,
            jobPoints: normalizeList(job.jobPoints, '\n'),
        })),
        projects: (safeResume.projects || []).map((project) => ({
            ...project,
            projectTech: Array.isArray(project.projectTech)
                ? project.projectTech.filter(Boolean).join(', ')
                : (project.projectTech || ''),
            projectPoints: normalizeList(project.projectPoints, '\n'),
        })),
        skillCategories: (safeResume.skillCategories || []).map((cat) => ({
            ...cat,
            catSkills: normalizeList(cat.catSkills, ','),
        })),
    };
};

const stripEditorIds = (resume) => ({
    ...resume,
    jobs: (resume.jobs || []).map(({ id, ...rest }) => (void id, rest)),
    projects: (resume.projects || []).map(({ id, ...rest }) => (void id, rest)),
    skillCategories: (resume.skillCategories || []).map(({ id, ...rest }) => (void id, rest)),
});

const candidateToResume = (candidate) => ({
    ...(defaultResume()),
    objective: candidate?.objective || '',
    relevantCourses: candidate?.relevantCourses || [],
    jobs: candidate?.jobs || [],
    projects: candidate?.projects || [],
    skillCategories: candidate?.skillCategories || [],
});

const normalizeApplicationForBackend = (application) => ({
    ...application,
    resume: normalizeResumeForBackend(application?.resume),
});

const normalizeHandleOrUrl = (value, basePath) => {
    if (!value) return '';
    const trimmed = value.trim();
    const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
    const noProto = withoutAt.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    if (noProto.includes('linkedin.com')) return noProto;
    if (noProto.includes('github.com')) return noProto;
    return `${basePath}/${noProto}`;
};

const extractGithubUsername = (value) => {
    if (!value) return '';
    const trimmed = value.trim();
    const withoutProto = trimmed.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
    const withoutHost = withoutProto.startsWith('github.com/')
        ? withoutProto.slice('github.com/'.length)
        : withoutProto;
    const firstSegment = withoutHost.split(/[/?#]/)[0] || '';
    return firstSegment.trim();
};

const mergeProfileHeader = (resume, profile) => ({
    ...(resume || defaultResume()),
    name: profile?.name || '',
    number: profile?.number || '',
    email: profile?.email || '',
    linkedin: normalizeHandleOrUrl(profile?.linkedin || '', 'linkedin.com/in'),
    github: normalizeHandleOrUrl(profile?.github || '', 'github.com'),
});

const normalizeCoverLetter = (coverLetter) => ({
    address: coverLetter?.address || '',
    greeting: coverLetter?.greeting || '',
    paragraphs: Array.isArray(coverLetter?.paragraphs) && coverLetter.paragraphs.length > 0 ? coverLetter.paragraphs : [''],
    closing: coverLetter?.closing || '',
});

// Profile card shown at the top of the sidebar
const ProfileCard = ({ profile, onEdit }) => {
    const initials = profile.name
        ? profile.name
            .split(' ')
            .filter(Boolean)
            .map((part) => part[0].toUpperCase())
            .slice(0, 2)
            .join('')
        : 'U';

    return (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#007bff', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {initials}
                </div>
                <div>
                    <div style={{ fontWeight: 700 }}>{profile.name}</div>
                    <div style={{ fontSize: '0.9em', color: '#555' }}>{profile.role}</div>
                    <div style={{ fontSize: '0.85em', color: '#777' }}>{profile.email}</div>
                </div>
            </div>
            <button
                onClick={onEdit}
                style={{
                    marginTop: '12px',
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#0056b3',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                }}
            >
                View & Edit Profile
            </button>
        </div>
    );
};

// Component for Job Details Tab - now uses JobDetailsForm
const JobDetailsTab = ({ application, onSave }) => {
    if (!application) {
        return <div>Loading job details...</div>;
    }
    return <JobDetailsForm application={application} onSave={onSave} />;
};

// Main Application Component
function App() {
    const [activeTab, setActiveTab] = useState('details'); // 'details', 'resume', 'coverletter'
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profile, setProfile] = useState(() => {
        try {
            const stored = localStorage.getItem('jobapp_profile');
            if (stored) {
                const parsed = JSON.parse(stored);
                const migratedCandidate = parsed.candidate
                    ? hydrateCandidateForEditor(parsed.candidate)
                    : (parsed.resume ? hydrateCandidateForEditor(parsed.resume) : hydrateCandidateForEditor(defaultCandidate()));
                return { ...defaultProfile(), ...parsed, candidate: migratedCandidate };
            }
        } catch (e) {
            console.warn('Could not read profile from localStorage', e);
        }
        return defaultProfile();
    });

    const fetchGithubProjects = async (githubValue = profile?.github || '') => {
        const username = extractGithubUsername(githubValue);
        if (!username) throw new Error('Set your GitHub URL in Profile first.');
        const response = await fetch(`/api/github-projects?username=${encodeURIComponent(username)}`);
        if (!response.ok) throw new Error(`Failed to fetch GitHub projects (${response.status})`);
        return response.json();
    };
    const navigate = useNavigate();

    useEffect(() => {
        // Debounce + idle-save to avoid UI stalls while typing (localStorage is synchronous).
        let idleId = null;
        const timeoutId = setTimeout(() => {
            const save = () => {
                try {
                    localStorage.setItem('jobapp_profile', JSON.stringify(profile));
                } catch (e) {
                    console.warn('Could not save profile', e);
                }
            };

            if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                idleId = window.requestIdleCallback(save, { timeout: 2000 });
            } else {
                save();
            }
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
            if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
                window.cancelIdleCallback(idleId);
            }
        };
    }, [profile]);

    const fetchApplications = async () => {
        try {
            const response = await fetch('/api/applications');
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setApplications(data);
        } catch (e) {
            setError(e);
            console.error("Failed to fetch applications:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateApplication = async () => {
        const newApp = {
            jobTitle: "New Job Application",
            company: "New Company",
            applicationStatus: "applied",
            jobDescription: "",
            // Start with an empty resume; header is seeded from profile automatically
            resume: mergeProfileHeader(defaultResume(), profile),
            coverLetter: defaultCoverLetter(),
        };
        try {
            const payload = normalizeApplicationForBackend(newApp);
            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const createdApp = await response.json();
            fetchApplications(); // Refresh the list
            navigate(`/application/${createdApp.id}`);
        } catch (e) {
            console.error("Failed to create application:", e);
            alert("Failed to create new application.");
        }
    };

    const handleProfileUpdate = (updatedProfile) => {
        setProfile({
            ...updatedProfile,
            candidate: hydrateCandidateForEditor(updatedProfile.candidate || defaultCandidate()),
        });
    };

    const handleDeleteApplication = async (appId) => {
        const confirmed = window.confirm('Are you sure you want to delete this application? This cannot be undone.');
        if (!confirmed) return;
        try {
            const response = await fetch(`/api/applications/${appId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            setApplications((prev) => prev.filter((app) => app.id !== appId));
            // If currently viewing the deleted app, navigate home
            const currentId = window.location.pathname.split('/').pop();
            if (currentId === appId) {
                navigate('/');
            }
        } catch (e) {
            console.error("Failed to delete application:", e);
            alert('Failed to delete application.');
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading applications...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Error: {error.message}</div>;

    return (
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'Arial, sans-serif' }}>
            {/* Sidebar */}
            <div style={{ width: '250px', backgroundColor: '#f0f0f0', padding: '20px', borderRight: '1px solid #ccc', overflowY: 'auto' }}>
                <ProfileCard profile={profile} onEdit={() => navigate('/profile')} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Job Applications</h2>
                    <button onClick={handleCreateApplication} style={{ padding: '5px 10px' }}>+</button>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {applications.map((app) => (
                        <li key={app.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                <Link to={`/application/${app.id}`} style={{ textDecoration: 'none', color: '#333', flexGrow: 1 }}>
                                    <div style={{ padding: '10px', backgroundColor: '#e0e0e0', borderRadius: '5px' }}>
                                        <strong>{app.jobTitle}</strong>
                                        <p style={{ margin: 0, fontSize: '0.9em' }}>{app.company}</p>
                                        <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>Status: {app.applicationStatus}</p>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => handleDeleteApplication(app.id)}
                                    style={{
                                        minWidth: '32px',
                                        border: '1px solid #c00',
                                        background: '#fff0f0',
                                        color: '#c00',
                                        borderRadius: '5px',
                                        cursor: 'pointer',
                                    }}
                                    aria-label={`Delete ${app.jobTitle}`}
                                    title="Delete application"
                                >
                                    ×
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main Content */}
            <div style={{ flexGrow: 1, padding: '20px' }}>
                <Routes>
                    <Route path="/" element={<h2>Welcome! Select an application from the sidebar or create a new one.</h2>} />
                    <Route
                        path="/application/:id"
                        element={
                            <ApplicationDetail
                                activeTab={activeTab}
                                setActiveTab={setActiveTab}
                                onApplicationUpdate={fetchApplications} // Pass refresh function to update sidebar
                                profileResume={candidateToResume(profile.candidate)}
                                profileHeader={profile}
                            />
                        }
                    />
                    <Route
                        path="/profile"
                        element={
                            <ProfilePage
                                profile={profile}
                                onUpdate={handleProfileUpdate}
                                onFetchGithubProjects={fetchGithubProjects}
                                defaultProfile={defaultProfile}
                                defaultCandidate={defaultCandidate}
                                hydrateCandidateForEditor={hydrateCandidateForEditor}
                            />
                        }
                    />
                </Routes>
            </div>
        </div>
    );
}

// Component to display specific application details with tabs
function ApplicationDetail({ activeTab, setActiveTab, onApplicationUpdate, profileResume, profileHeader }) {
    const { id } = useParams();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [optimizing, setOptimizing] = useState(false);
    const [optError, setOptError] = useState(null);
    const [resumeEditorInitKey, setResumeEditorInitKey] = useState(0);

    useEffect(() => {
        const fetchApplicationDetail = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/applications/${id}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                // Always inject profile header into the resume so the backend gets it
                const mergedResume = mergeProfileHeader(data.resume, profileHeader);
                setApplication({ ...data, resume: mergedResume });
            } catch (e) {
                setError(e);
                console.error("Failed to fetch application detail:", e);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchApplicationDetail();
        }
    }, [id]); // Re-fetch when ID changes

    // Keep header in sync if profile changes while editing
    useEffect(() => {
        if (application) {
            setApplication((prev) => ({ ...prev, resume: mergeProfileHeader(prev.resume, profileHeader) }));
        }
    }, [profileHeader]);

    const handleSaveApplication = async (updatedApp) => {
        try {
            const resumeWithHeader = mergeProfileHeader(updatedApp.resume, profileHeader);
            const payload = normalizeApplicationForBackend({ ...updatedApp, resume: resumeWithHeader });
            const response = await fetch(`/api/applications/${updatedApp.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const savedApp = await response.json();
            setApplication(savedApp); // Update local state with saved data
            onApplicationUpdate(); // Refresh sidebar list
            alert('Application saved successfully!');
        } catch (e) {
            setError(e);
            console.error("Failed to save application:", e);
            alert('Failed to save application.');
        }
    };

    const handleGeneratePdf = async () => {
        if (!application) return;

        try {
            const resumeWithHeader = mergeProfileHeader(application.resume, profileHeader);
            const normalizedApp = normalizeApplicationForBackend({ ...application, resume: resumeWithHeader });
            const appForPdf = {
                ...normalizedApp,
                resume: stripEditorIds(normalizedApp.resume),
            };

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appForPdf),
            });

            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `resume_${application.company}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('PDF generated and downloaded!');

        } catch (e) {
            console.error("Failed to generate PDF:", e);
            alert('Failed to generate PDF: ' + e.message);
        }
    };


    const handleResumeChange = (newResumeData) => {
        setApplication(prevApp => ({ ...prevApp, resume: mergeProfileHeader(newResumeData, profileHeader) }))
    }

    const handleCoverLetterChange = (nextCoverLetter) => {
        setApplication((prev) => ({ ...prev, coverLetter: normalizeCoverLetter(nextCoverLetter) }));
    };

    const handleOptimizeResume = async () => {
        if (!application) return;
        setOptError(null);
        setOptimizing(true);
        try {
            const payload = {
                jobTitle: application.jobTitle,
                company: application.company,
                jobDescription: application.jobDescription,
                resume: mergeProfileHeader(profileResume, profileHeader),
            };
            const response = await fetch('/api/optimize-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `HTTP ${response.status}`);
            }
            const optimizedResume = await response.json();
            setApplication((prev) => ({ ...prev, resume: mergeProfileHeader(optimizedResume, profileHeader) }));
            // Force the ResumeEditor to reload its internal state from the optimized resume.
            setResumeEditorInitKey((prev) => prev + 1);
        } catch (e) {
            console.error('Failed to optimize resume', e);
            setOptError(e);
            alert('Failed to optimize resume.');
        } finally {
            setOptimizing(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading application details...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Error loading application: {error.message}</div>;
    if (!application) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Application not found.</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>{application.jobTitle} at {application.company}</h1>
                <button
                    onClick={handleGeneratePdf}
                    style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Generate PDF
                </button>
            </div>

            {/* Tabs Navigation */}
            <div style={{ borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
                <button
                    onClick={() => setActiveTab('details')}
                    style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'details' ? '2px solid blue' : 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                    Job Details
                </button>
                <button
                    onClick={() => setActiveTab('resume')}
                    style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'resume' ? '2px solid blue' : 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                    Resume Editor
                </button>
                <button
                    onClick={() => setActiveTab('coverletter')}
                    style={{ padding: '10px 20px', border: 'none', borderBottom: activeTab === 'coverletter' ? '2px solid blue' : 'none', backgroundColor: 'transparent', cursor: 'pointer' }}
                >
                    Cover Letter
                </button>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'details' && <JobDetailsTab application={application} onSave={handleSaveApplication} />}
                {activeTab === 'resume' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                            <button
                                type="button"
                                onClick={handleOptimizeResume}
                                disabled={optimizing}
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: optimizing ? '#eee' : '#f5f5f5' }}
                            >
                                {optimizing ? 'Optimizing…' : 'Optimize with AI'}
                            </button>
                            {optError && <span style={{ color: 'red' }}>AI optimize failed</span>}
                        </div>
                        <ResumeEditor
                            application={application}
                            onResumeChange={handleResumeChange}
                            baseResume={profileResume}
                            initKey={`${application.id || 'default'}-opt-${resumeEditorInitKey}`}
                        />
                    </div>
                )}
                {activeTab === 'coverletter' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '10px' }}>
                            <button
                                type="button"
                                onClick={() => handleSaveApplication(application)}
                                style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5' }}
                            >
                                Save Cover Letter
                            </button>
                        </div>
                        <CoverLetterEditor
                            coverLetter={application?.coverLetter || defaultCoverLetter()}
                            onChange={handleCoverLetterChange}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
