import React, { useCallback, useEffect, useState } from 'react';
import { Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import JobDetailsForm from './components/JobDetailsForm';
import ResumeEditor from './components/ResumeEditor'; // Import the new component
import ProfilePage from './components/ProfilePage';
import CoverLetterEditor from './components/CoverLetterEditor';
import { supabase } from './supabaseClient';

const defaultResume = () => ({
    objective: '',
    relevantCourses: [],
    jobs: [],
    projects: [],
    skillCategories: [],
});

const defaultCoverLetter = () => ({
    hiringManagerName: '',
    company: '',
    location: '',
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
    hiringManagerName: coverLetter?.hiringManagerName || '',
    company: coverLetter?.company || '',
    location: coverLetter?.location || '',
    address: coverLetter?.address || '',
    greeting: coverLetter?.greeting || '',
    paragraphs: Array.isArray(coverLetter?.paragraphs) && coverLetter.paragraphs.length > 0 ? coverLetter.paragraphs : [''],
    closing: coverLetter?.closing || '',
});

const parseCoverLetterParagraphs = (text) => {
    const safe = typeof text === 'string' ? text : '';
    const trimmed = safe.replace(/^```/, '').replace(/```$/, '').trim();
    return trimmed
        .split('|')
        .map((p) => p.trim().replace(/^["']|["']$/g, ''))
        .map((p) => p.trim())
        .filter(Boolean);
};

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
        <div className="profileCard">
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
                className="btn btn--primary"
                style={{ marginTop: '12px', width: '100%', padding: '8px' }}
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
    const [authLoading, setAuthLoading] = useState(true);
    const [session, setSession] = useState(null);
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

    useEffect(() => {
        let mounted = true;
        setAuthLoading(true);
        supabase.auth.getSession().then(({ data, error }) => {
            if (!mounted) return;
            if (error) console.warn('Failed to get Supabase session', error);
            setSession(data?.session || null);
            setAuthLoading(false);
        });
        const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            if (!mounted) return;
            setSession(nextSession);
        });
        return () => {
            mounted = false;
            data?.subscription?.unsubscribe();
        };
    }, []);

    const authedFetch = useCallback(
        async (url, options = {}) => {
            const token = session?.access_token;
            const headers = new Headers(options.headers || {});
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return fetch(url, { ...options, headers });
        },
        [session?.access_token],
    );

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) {
            alert(error.message || 'Failed to start Google sign-in');
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setSession(null);
        setApplications([]);
        setLoading(false);
    };

    const fetchGithubProjects = async (githubValue = profile?.github || '') => {
        const username = extractGithubUsername(githubValue);
        if (!username) throw new Error('Set your GitHub URL in Profile first.');
        const response = await authedFetch(`/api/github-projects?username=${encodeURIComponent(username)}`);
        if (!response.ok) throw new Error(`Failed to fetch GitHub projects (${response.status})`);
        return response.json();
    };
    const navigate = useNavigate();

    const loadProfileFromServer = useCallback(async () => {
        if (!session?.access_token) return;
        try {
            const resp = await authedFetch('/api/profile');
            if (resp.status === 404) return;
            if (!resp.ok) {
                const text = await resp.text().catch(() => '');
                throw new Error(text || `HTTP error! status: ${resp.status}`);
            }
            const data = await resp.json();
            const migratedCandidate = data?.candidate
                ? hydrateCandidateForEditor(data.candidate)
                : (data?.resume ? hydrateCandidateForEditor(data.resume) : hydrateCandidateForEditor(defaultCandidate()));
            setProfile({ ...defaultProfile(), ...data, candidate: migratedCandidate });
            localStorage.setItem('jobapp_profile', JSON.stringify({ ...defaultProfile(), ...data, candidate: migratedCandidate }));
        } catch (e) {
            console.error('Failed to load profile from server', e);
        }
    }, [authedFetch, session?.access_token]);

    const fetchApplications = async () => {
        if (!session?.access_token) return;
        try {
            const response = await authedFetch('/api/applications');
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
            const response = await authedFetch('/api/applications', {
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

    const handleProfileUpdate = async (updatedProfile) => {
        const nextProfile = {
            ...updatedProfile,
            candidate: hydrateCandidateForEditor(updatedProfile.candidate || defaultCandidate()),
        };
        setProfile(nextProfile);

        try {
            if (session?.access_token) {
                const resp = await authedFetch('/api/profile', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(nextProfile),
                });
                if (!resp.ok) {
                    const text = await resp.text().catch(() => '');
                    throw new Error(text || `HTTP error! status: ${resp.status}`);
                }
                const saved = await resp.json();
                setProfile({
                    ...defaultProfile(),
                    ...saved,
                    candidate: saved?.candidate
                        ? hydrateCandidateForEditor(saved.candidate)
                        : (saved?.resume ? hydrateCandidateForEditor(saved.resume) : hydrateCandidateForEditor(defaultCandidate())),
                });
            }
            localStorage.setItem('jobapp_profile', JSON.stringify(nextProfile));
        } catch (e) {
            console.error('Failed to save profile', e);
            alert(e?.message || 'Failed to save profile');
        }
    };

    const handleDeleteApplication = async (appId) => {
        const confirmed = window.confirm('Are you sure you want to delete this application? This cannot be undone.');
        if (!confirmed) return;
        try {
            const response = await authedFetch(`/api/applications/${appId}`, {
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
        if (authLoading) return;
        if (!session?.access_token) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        loadProfileFromServer().finally(() => {
            fetchApplications();
        });
    }, [authLoading, session?.access_token, loadProfileFromServer]);

    if (authLoading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
    if (!session) {
        return (
            <div className="appLayout" style={{ justifyContent: 'center', alignItems: 'center' }}>
                <div className="panel panel--padded" style={{ width: 'min(520px, 92vw)' }}>
                    <h2 style={{ marginTop: 0 }}>Sign in to Job App Central</h2>
                    <p style={{ color: '#555' }}>Use Google to sign in and sync your profile/applications.</p>
                    <button className="btn btn--primary" onClick={signInWithGoogle} style={{ width: '100%', padding: '10px 14px' }}>
                        Continue with Google
                    </button>
                </div>
            </div>
        );
    }

    if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading applications...</div>;
    if (error) return <div style={{ textAlign: 'center', marginTop: '50px', color: 'red' }}>Error: {error.message}</div>;

    return (
        <div className="appLayout">
            {/* Sidebar */}
            <div className="sidebar">
                <ProfileCard profile={profile} onEdit={() => navigate('/profile')} />
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.85em', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {session?.user?.email || ''}
                    </div>
                    <button onClick={signOut} className="btn" style={{ padding: '6px 10px' }}>
                        Sign out
                    </button>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>Job Applications</h2>
                    <button onClick={handleCreateApplication} className="btn" style={{ padding: '5px 10px' }}>+</button>
                </div>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {(applications || []).map((app) => (
                        <li key={app.id} style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
                                <Link to={`/application/${app.id}`} style={{ textDecoration: 'none', color: '#333', flexGrow: 1 }}>
                                    <div className="panel panel--padded" style={{ backgroundColor: '#e0e0e0' }}>
                                        <strong>{app.jobTitle}</strong>
                                        <p style={{ margin: 0, fontSize: '0.9em' }}>{app.company}</p>
                                        <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>Status: {app.applicationStatus}</p>
                                    </div>
                                </Link>
                                <button
                                    onClick={() => handleDeleteApplication(app.id)}
                                    className="btn btn--danger"
                                    style={{ minWidth: '32px' }}
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
            <div className="mainContent">
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
                                authedFetch={authedFetch}
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
function ApplicationDetail({ activeTab, setActiveTab, onApplicationUpdate, profileResume, profileHeader, authedFetch }) {
    const { id } = useParams();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [optimizing, setOptimizing] = useState(false);
    const [optError, setOptError] = useState(null);
    const [optimizingCover, setOptimizingCover] = useState(false);
    const [optCoverError, setOptCoverError] = useState(null);
    const [resumeEditorInitKey, setResumeEditorInitKey] = useState(0);

    useEffect(() => {
        const fetchApplicationDetail = async () => {
            setLoading(true);
            try {
                const response = await authedFetch(`/api/applications/${id}`);
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
            const response = await authedFetch(`/api/applications/${updatedApp.id}`, {
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

            const response = await authedFetch('/api/generate-pdf', {
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
            a.download = `documents_${application.company || 'application'}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            alert('Documents generated and downloaded!');

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
            const response = await authedFetch('/api/optimize-resume', {
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

    const handleOptimizeCoverLetter = async () => {
        if (!application) return;
        setOptCoverError(null);
        setOptimizingCover(true);
        try {
            const payload = {
                jobTitle: application.jobTitle,
                company: application.company,
                jobDescription: application.jobDescription,
                resume: mergeProfileHeader(profileResume, profileHeader),
                coverLetter: application.coverLetter || null,
            };
            const response = await authedFetch('/api/optimize-coverletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const text = await response.text().catch(() => '');
                throw new Error(text || `HTTP ${response.status}`);
            }
            const optimizedText = await response.text();
            const paragraphs = parseCoverLetterParagraphs(optimizedText);
            if (paragraphs.length === 0) throw new Error('No paragraphs returned from AI');
            setApplication((prev) => ({
                ...prev,
                coverLetter: normalizeCoverLetter({ ...(prev.coverLetter || {}), paragraphs }),
            }));
        } catch (e) {
            console.error('Failed to optimize cover letter', e);
            setOptCoverError(e);
            alert('Failed to optimize cover letter.');
        } finally {
            setOptimizingCover(false);
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
                    className="btn btn--add"
                    style={{ padding: '10px 20px' }}
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
                                className="btn"
                                style={{ padding: '8px 12px', background: optimizing ? '#eee' : undefined }}
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
                                onClick={handleOptimizeCoverLetter}
                                disabled={optimizingCover}
                                className="btn"
                                style={{ padding: '8px 12px', background: optimizingCover ? '#eee' : undefined }}
                            >
                                {optimizingCover ? 'Optimizing…' : 'Optimize Cover Letter'}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSaveApplication(application)}
                                className="btn btn--add"
                                style={{ padding: '8px 12px' }}
                            >
                                Save Cover Letter
                            </button>
                            {optCoverError && <span style={{ color: 'red' }}>AI optimize failed</span>}
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
