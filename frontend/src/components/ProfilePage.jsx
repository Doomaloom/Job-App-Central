import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import CandidateEducationSection from './CandidateEducationSection';
import ObjectListSection from './ObjectListSection';
import ProjectsSection from './ProjectsSection';
import SectionCard from './SectionCard';
import SkillsSection from './SkillsSection';
import WorkExperienceSection from './WorkExperienceSection';

const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #ccc' };
const textareaStyle = { ...inputStyle, resize: 'vertical' };
const buttonStyle = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' };
const dangerButtonStyle = { ...buttonStyle, borderColor: '#c00', color: '#c00', background: '#fff0f0' };
const addButtonStyle = { ...buttonStyle, borderColor: '#1b7c2f', color: '#1b7c2f', background: '#f2fff6' };

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
                <button type="button" onClick={addItem} style={addButtonStyle}>
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

function ProfilePage({ profile, onUpdate, onFetchGithubProjects, defaultProfile, defaultCandidate, hydrateCandidateForEditor }) {
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
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Full Name</span>
                    <input type="text" name="name" value={localProfile.name} onChange={handleChange} required style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Role / Title</span>
                    <input type="text" name="role" value={localProfile.role} onChange={handleChange} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Phone</span>
                    <input type="text" name="number" value={localProfile.number} onChange={handleChange} style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Email</span>
                    <input type="email" name="email" value={localProfile.email} onChange={handleChange} required style={inputStyle} />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>LinkedIn URL</span>
                    <input
                        type="text"
                        name="linkedin"
                        value={localProfile.linkedin}
                        onChange={handleChange}
                        placeholder="https://linkedin.com/in/your-handle"
                        style={inputStyle}
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
                        style={inputStyle}
                    />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontWeight: 600 }}>Location</span>
                    <input type="text" name="location" value={localProfile.location} onChange={handleChange} placeholder="City, Country" style={inputStyle} />
                </label>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button type="submit" style={{ ...addButtonStyle, padding: '10px 14px' }}>
                        Save Profile
                    </button>
                </div>

                <SectionCard title="Education">
                    <CandidateEducationSection
                        education={candidate.education || []}
                        onChange={(education) => updateCandidate({ education })}
                        makeId={makeId}
                        addButtonStyle={addButtonStyle}
                        buttonStyle={buttonStyle}
                        dangerButtonStyle={dangerButtonStyle}
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
                            addButtonStyle={addButtonStyle}
                            buttonStyle={buttonStyle}
                            dangerButtonStyle={dangerButtonStyle}
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
                            addButtonStyle={addButtonStyle}
                            buttonStyle={buttonStyle}
                            dangerButtonStyle={dangerButtonStyle}
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
                </DndContext>

                <SectionCard title="Skills">
                    <SkillsSection
                        showTitle={false}
                        skillCategories={candidate.skillCategories || []}
                        addButtonStyle={addButtonStyle}
                        buttonStyle={buttonStyle}
                        dangerButtonStyle={dangerButtonStyle}
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
                                <input type="text" value={entry.name || ''} onChange={(e) => onUpdateEntry({ ...entry, name: e.target.value })} placeholder="Name" style={inputStyle} />
                                <input type="text" value={entry.issuer || ''} onChange={(e) => onUpdateEntry({ ...entry, issuer: e.target.value })} placeholder="Issuer" style={inputStyle} />
                                <input type="text" value={entry.date || ''} onChange={(e) => onUpdateEntry({ ...entry, date: e.target.value })} placeholder="Date (optional)" style={inputStyle} />
                                <input type="text" value={entry.url || ''} onChange={(e) => onUpdateEntry({ ...entry, url: e.target.value })} placeholder="URL (optional)" style={inputStyle} />
                            </div>
                        )}
                        containerStyle={{ border: 'none', padding: 0, background: 'transparent', marginBottom: 0 }}
                        addButtonStyle={addButtonStyle}
                        buttonStyle={buttonStyle}
                        dangerButtonStyle={dangerButtonStyle}
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
