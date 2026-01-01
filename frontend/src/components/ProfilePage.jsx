import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import CandidateEducationSection from './CandidateEducationSection';
import ObjectListSection from './ObjectListSection';
import ProjectsSection from './ProjectsSection';
import SectionCard from './SectionCard';
import SkillsSection from './SkillsSection';
import WorkExperienceSection from './WorkExperienceSection';

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '10px',
    border: '1px solid #d0d7de',
    fontSize: '14px',
    boxSizing: 'border-box',
};

const textareaStyle = {
    ...inputStyle,
    minHeight: '110px',
    resize: 'vertical',
};

const buttonStyle = {
    padding: '8px 12px',
    borderRadius: '10px',
    border: '1px solid #d0d7de',
    backgroundColor: '#f6f8fa',
    cursor: 'pointer',
    fontWeight: 600,
};

const addButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#0b5ed7',
    borderColor: '#0b5ed7',
    color: '#fff',
};

const dangerButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
    color: '#fff',
};

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

function normalizeStringList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== 'string') return [];
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function ChipsEditor({ value, onChange, placeholder = 'Add an item…', addLabel = 'Add' }) {
    const items = useMemo(() => normalizeStringList(value), [value]);
    const [draft, setDraft] = useState('');

    const addItem = () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        onChange([...items, trimmed]);
        setDraft('');
    };

    const removeItem = (index) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={placeholder}
                    style={{ ...inputStyle, flexGrow: 1 }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addItem();
                        }
                    }}
                />
                <button type="button" onClick={addItem} className="btn btn--add">
                    {addLabel}
                </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {items.map((item, idx) => (
                    <span
                        key={`${item}-${idx}`}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '999px',
                            backgroundColor: '#e7f1ff',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        {item}
                        <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                            aria-label={`Remove ${item}`}
                            title="Remove"
                        >
                            ×
                        </button>
                    </span>
                ))}
                {items.length === 0 && <span style={{ color: '#777' }}>None yet.</span>}
            </div>
        </>
    );
}

function ProfilePage({ profile, onUpdate, onFetchGithubProjects, geminiApiKey, onSaveGeminiApiKey, defaultProfile, defaultCandidate, hydrateCandidateForEditor }) {
    const [localProfile, setLocalProfile] = useState(() => {
        const baseProfile = typeof defaultProfile === 'function' ? defaultProfile() : {};
        const baseCandidate = typeof defaultCandidate === 'function' ? defaultCandidate() : {};
        const candidate = profile?.candidate || baseCandidate;
        return {
            ...baseProfile,
            ...profile,
            candidate: hydrateCandidateForEditor ? hydrateCandidateForEditor(candidate) : candidate,
        };
    });
    const [githubProjectsLoading, setGithubProjectsLoading] = useState(false);
    const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey || '');
    const [showGeminiKey, setShowGeminiKey] = useState(false);

    useEffect(() => {
        const baseProfile = typeof defaultProfile === 'function' ? defaultProfile() : {};
        const baseCandidate = typeof defaultCandidate === 'function' ? defaultCandidate() : {};
        const candidate = profile?.candidate || baseCandidate;
        setLocalProfile({
            ...baseProfile,
            ...profile,
            candidate: hydrateCandidateForEditor ? hydrateCandidateForEditor(candidate) : candidate,
        });
    }, [profile, defaultProfile, defaultCandidate, hydrateCandidateForEditor]);

    useEffect(() => {
        setLocalGeminiKey(geminiApiKey || '');
    }, [geminiApiKey]);

    const updateCandidate = (updater) => {
        setLocalProfile((prev) => {
            const baseCandidate = typeof defaultCandidate === 'function' ? defaultCandidate() : {};
            const current = prev.candidate || baseCandidate;
            const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
            return { ...prev, candidate: next };
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLocalProfile((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onUpdate(localProfile);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;
        if (active.id === over.id) return;

        if (String(active.id).startsWith('job-')) {
            updateCandidate((cand) => {
                const jobs = Array.isArray(cand.jobs) ? cand.jobs : [];
                const oldIndex = jobs.findIndex((job) => job.id === active.id);
                const newIndex = jobs.findIndex((job) => job.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return cand;
                return { ...cand, jobs: arrayMove(jobs, oldIndex, newIndex) };
            });
            return;
        }

        if (String(active.id).startsWith('project-')) {
            updateCandidate((cand) => {
                const projects = Array.isArray(cand.projects) ? cand.projects : [];
                const oldIndex = projects.findIndex((proj) => proj.id === active.id);
                const newIndex = projects.findIndex((proj) => proj.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return cand;
                return { ...cand, projects: arrayMove(projects, oldIndex, newIndex) };
            });
            return;
        }

        if (String(active.id).startsWith('skill-')) {
            updateCandidate((cand) => {
                const cats = Array.isArray(cand.skillCategories) ? cand.skillCategories : [];
                const oldIndex = cats.findIndex((cat) => cat.id === active.id);
                const newIndex = cats.findIndex((cat) => cat.id === over.id);
                if (oldIndex < 0 || newIndex < 0) return cand;
                return { ...cand, skillCategories: arrayMove(cats, oldIndex, newIndex) };
            });
        }
    };

    const candidate = localProfile.candidate || (typeof defaultCandidate === 'function' ? defaultCandidate() : {});
    const links = candidate.links || {};
    const preferences = candidate.preferences || {};

    const handleGetGithubProjects = async () => {
        if (!onFetchGithubProjects) return;
        setGithubProjectsLoading(true);
        try {
            const cards = await onFetchGithubProjects(localProfile?.github || '');
            const existing = new Set((candidate.projects || []).map((p) => (p.projectTitle || '').trim().toLowerCase()).filter(Boolean));
            const nextProjects = (Array.isArray(cards) ? cards : [])
                .map((card) => {
                    const languages = card?.languages ? Object.keys(card.languages).sort().join(', ') : '';
                    return {
                        id: makeId('project'),
                        projectTitle: card?.title || card?.fullName || card?.repo || 'Untitled Project',
                        projectTech: languages,
                        projectDate: card?.date || '',
                        projectPoints: Array.isArray(card?.points) ? card.points : [],
                    };
                })
                .filter((proj) => {
                    const key = (proj.projectTitle || '').trim().toLowerCase();
                    if (!key) return false;
                    if (existing.has(key)) return false;
                    existing.add(key);
                    return true;
                });

            updateCandidate((cand) => ({ ...cand, projects: [...(cand.projects || []), ...nextProjects] }));
        } catch (err) {
            alert(err?.message || 'Failed to fetch GitHub projects');
        } finally {
            setGithubProjectsLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2>Your Profile</h2>
            <p style={{ color: '#555', marginBottom: '20px' }}>Update your contact information and profile details, then press Save.</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <SectionCard title="AI (Bring Your Own Key)">
                    <p style={{ marginTop: 0, color: '#555' }}>
                        Your Gemini key is stored only in this browser and sent to the backend only for AI actions.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'end' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>Gemini API Key</span>
                            <input
                                type={showGeminiKey ? 'text' : 'password'}
                                value={localGeminiKey}
                                onChange={(e) => setLocalGeminiKey(e.target.value)}
                                placeholder="AIza... / your Gemini API key"
                                autoComplete="off"
                                className="input"
                            />
                        </label>
                        <button
                            type="button"
                            className="btn"
                            onClick={() => setShowGeminiKey((v) => !v)}
                            style={{ height: '40px' }}
                        >
                            {showGeminiKey ? 'Hide' : 'Show'}
                        </button>
                        <button
                            type="button"
                            className="btn btn--add"
                            onClick={() => onSaveGeminiApiKey && onSaveGeminiApiKey(localGeminiKey)}
                            style={{ height: '40px' }}
                        >
                            Save Key
                        </button>
                    </div>
                </SectionCard>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Full Name</span>
                    <input type="text" name="name" value={localProfile.name} onChange={handleChange} required className="input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Role / Title</span>
                    <input type="text" name="role" value={localProfile.role} onChange={handleChange} className="input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Phone</span>
                    <input type="text" name="number" value={localProfile.number} onChange={handleChange} className="input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Email</span>
                    <input type="email" name="email" value={localProfile.email} onChange={handleChange} required className="input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>LinkedIn URL</span>
                    <input
                        type="text"
                        name="linkedin"
                        value={localProfile.linkedin}
                        onChange={handleChange}
                        placeholder="https://linkedin.com/in/your-handle"
                        className="input"
                    />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>GitHub URL</span>
                    <input
                        type="text"
                        name="github"
                        value={localProfile.github}
                        onChange={handleChange}
                        placeholder="https://github.com/your-handle"
                        className="input"
                    />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Location</span>
                    <input type="text" name="location" value={localProfile.location} onChange={handleChange} placeholder="City, Country" className="input" />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button type="submit" className="btn btn--add" style={{ padding: '10px 14px' }}>
                        Save Profile
                    </button>
                </div>

                <SectionCard title="Education">
                    <CandidateEducationSection
                        education={candidate.education || []}
                        onChange={(education) => updateCandidate({ education })}
                        makeId={makeId}
                    />
                </SectionCard>

                <SectionCard title="Relevant Courses">
                    <ChipsEditor
                        value={candidate.relevantCourses || []}
                        onChange={(relevantCourses) => updateCandidate({ relevantCourses })}
                        placeholder="e.g., Operating Systems"
                    />
                </SectionCard>

                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SectionCard title="Work Experience">
                        <WorkExperienceSection
                            showTitle={false}
                            jobs={candidate.jobs || []}
                            addButtonStyle={undefined}
                            buttonStyle={undefined}
                            dangerButtonStyle={undefined}
                            onAddJob={() =>
                                updateCandidate((cand) => ({
                                    ...cand,
                                    jobs: [
                                        ...(cand.jobs || []),
                                        {
                                            id: makeId('job'),
                                            jobTitle: 'New Job',
                                            jobEmployer: '',
                                            jobLocation: '',
                                            jobStartDate: '',
                                            jobEndDate: '',
                                            jobPoints: [],
                                        },
                                    ],
                                }))
                            }
                            onUpdateJob={(updatedJob) =>
                                updateCandidate((cand) => ({
                                    ...cand,
                                    jobs: (cand.jobs || []).map((job) => (job.id === updatedJob.id ? updatedJob : job)),
                                }))
                            }
                            onRemoveJob={(jobId) =>
                                updateCandidate((cand) => ({ ...cand, jobs: (cand.jobs || []).filter((job) => job.id !== jobId) }))
                            }
                        />
                    </SectionCard>

                    <SectionCard title="Projects">
                        <ProjectsSection
                            showTitle={false}
                            projects={candidate.projects || []}
                            addButtonStyle={undefined}
                            buttonStyle={undefined}
                            dangerButtonStyle={undefined}
                            onGetProjects={githubProjectsLoading ? undefined : handleGetGithubProjects}
                            onAddProject={() =>
                                updateCandidate((cand) => ({
                                    ...cand,
                                    projects: [
                                        ...(cand.projects || []),
                                        {
                                            id: makeId('project'),
                                            projectTitle: 'New Project',
                                            projectTech: '',
                                            projectDate: '',
                                            projectPoints: [],
                                        },
                                    ],
                                }))
                            }
                            onUpdateProject={(updatedProject) =>
                                updateCandidate((cand) => ({
                                    ...cand,
                                    projects: (cand.projects || []).map((proj) => (proj.id === updatedProject.id ? updatedProject : proj)),
                                }))
                            }
                            onRemoveProject={(projectId) =>
                                updateCandidate((cand) => ({ ...cand, projects: (cand.projects || []).filter((proj) => proj.id !== projectId) }))
                            }
                        />
                    </SectionCard>
                    <SectionCard title="Skills">
                        <SkillsSection
                            showTitle={false}
                            skillCategories={candidate.skillCategories || []}
                            addButtonStyle={undefined}
                            buttonStyle={undefined}
                            dangerButtonStyle={undefined}
                            onAddSkillCategory={() =>
                                updateCandidate((cand) => ({
                                    ...cand,
                                    skillCategories: [
                                        ...(cand.skillCategories || []),
                                        { id: makeId('skill'), catTitle: 'New Category', catSkills: [] },
                                    ],
                                }))
                            }
                            onUpdateSkillCategory={(updatedSkillCat) =>
                                updateCandidate((cand) => ({
                                    ...cand,
                                    skillCategories: (cand.skillCategories || []).map((cat) => (cat.id === updatedSkillCat.id ? updatedSkillCat : cat)),
                                }))
                            }
                            onRemoveSkillCategory={(skillCatId) =>
                                updateCandidate((cand) => ({ ...cand, skillCategories: (cand.skillCategories || []).filter((cat) => cat.id !== skillCatId) }))
                            }
                        />
                    </SectionCard>
                </DndContext>

                <SectionCard title="Certifications">
                    <ObjectListSection
                        title={null}
                        items={candidate.certifications || []}
                        onChange={(certifications) => updateCandidate({ certifications })}
                        addLabel="Add Certification"
                        makeNewItem={() => ({ id: makeId('cert'), name: '', issuer: '', date: '', url: '' })}
                        renderSummary={(entry) => `${entry.name || 'Certification'}${entry.issuer ? ` — ${entry.issuer}` : ''}`}
                        renderEditor={(entry, onUpdateEntry) => (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input type="text" value={entry.name || ''} onChange={(e) => onUpdateEntry({ ...entry, name: e.target.value })} placeholder="Name" className="input" />
                                <input type="text" value={entry.issuer || ''} onChange={(e) => onUpdateEntry({ ...entry, issuer: e.target.value })} placeholder="Issuer" className="input" />
                                <input type="text" value={entry.date || ''} onChange={(e) => onUpdateEntry({ ...entry, date: e.target.value })} placeholder="Date (optional)" className="input" />
                                <input type="text" value={entry.url || ''} onChange={(e) => onUpdateEntry({ ...entry, url: e.target.value })} placeholder="URL (optional)" className="input" />
                            </div>
                        )}
                        containerStyle={{ border: 'none', padding: 0, background: 'transparent', marginBottom: 0 }}
                    />
                </SectionCard>

                <SectionCard title="Awards">
                    <ObjectListSection
                        title={null}
                        items={candidate.awards || []}
                        onChange={(awards) => updateCandidate({ awards })}
                        addLabel="Add Award"
                        makeNewItem={() => ({ id: makeId('award'), title: '', issuer: '', date: '', details: '' })}
                        renderSummary={(entry) => `${entry.title || 'Award'}${entry.issuer ? ` — ${entry.issuer}` : ''}`}
                        renderEditor={(entry, onUpdateEntry) => (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input type="text" value={entry.title || ''} onChange={(e) => onUpdateEntry({ ...entry, title: e.target.value })} placeholder="Title" style={inputStyle} />
                                <input type="text" value={entry.issuer || ''} onChange={(e) => onUpdateEntry({ ...entry, issuer: e.target.value })} placeholder="Issuer" style={inputStyle} />
                                <input type="text" value={entry.date || ''} onChange={(e) => onUpdateEntry({ ...entry, date: e.target.value })} placeholder="Date (optional)" style={inputStyle} />
                                <textarea
                                    value={entry.details || ''}
                                    onChange={(e) => onUpdateEntry({ ...entry, details: e.target.value })}
                                    placeholder="Details (optional)"
                                    rows={3}
                                    style={{ ...textareaStyle, gridColumn: '1 / -1' }}
                                />
                            </div>
                        )}
                        containerStyle={{ border: 'none', padding: 0, background: 'transparent', marginBottom: 0 }}
                        addButtonStyle={addButtonStyle}
                        buttonStyle={buttonStyle}
                        dangerButtonStyle={dangerButtonStyle}
                    />
                </SectionCard>

                <SectionCard title="Languages">
                    <ObjectListSection
                        title={null}
                        items={candidate.languages || []}
                        onChange={(languages) => updateCandidate({ languages })}
                        addLabel="Add Language"
                        makeNewItem={() => ({ id: makeId('lang'), language: '', proficiency: '' })}
                        renderSummary={(entry) => `${entry.language || 'Language'}${entry.proficiency ? ` — ${entry.proficiency}` : ''}`}
                        renderEditor={(entry, onUpdateEntry) => (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <input type="text" value={entry.language || ''} onChange={(e) => onUpdateEntry({ ...entry, language: e.target.value })} placeholder="Language" style={inputStyle} />
                                <input type="text" value={entry.proficiency || ''} onChange={(e) => onUpdateEntry({ ...entry, proficiency: e.target.value })} placeholder="Proficiency (e.g., Native, Fluent)" style={inputStyle} />
                            </div>
                        )}
                        containerStyle={{ border: 'none', padding: 0, background: 'transparent', marginBottom: 0 }}
                        addButtonStyle={addButtonStyle}
                        buttonStyle={buttonStyle}
                        dangerButtonStyle={dangerButtonStyle}
                    />
                </SectionCard>

                <SectionCard title="Links">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>Website</span>
                            <input
                                type="text"
                                value={links.website || ''}
                                onChange={(e) => updateCandidate((cand) => ({ ...cand, links: { ...(cand.links || {}), website: e.target.value } }))}
                                placeholder="https://example.com"
                                style={inputStyle}
                            />
                        </label>
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontWeight: 600 }}>Portfolio</span>
                            <input
                                type="text"
                                value={links.portfolio || ''}
                                onChange={(e) => updateCandidate((cand) => ({ ...cand, links: { ...(cand.links || {}), portfolio: e.target.value } }))}
                                placeholder="https://example.com/portfolio"
                                style={inputStyle}
                            />
                        </label>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ fontWeight: 600, marginBottom: '6px' }}>Other Links</div>
                        <ChipsEditor
                            value={links.other || []}
                            onChange={(other) => updateCandidate((cand) => ({ ...cand, links: { ...(cand.links || {}), other } }))}
                            placeholder="e.g., https://github.com/user/repo"
                            addLabel="Add link"
                        />
                    </div>
                </SectionCard>

                <button
                    type="submit"
                    style={{
                        padding: '12px 16px 12px 16px',
                        marginBottom: '16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                    }}
                >
                    Save Profile
                </button>
            </form>
        </div>
    );
}

export default ProfilePage;
