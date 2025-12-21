import React, { useMemo, useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import WorkExperienceSection from './WorkExperienceSection';
import ProjectsSection from './ProjectsSection';
import SkillsSection from './SkillsSection';
import ObjectListSection from './ObjectListSection';
import CandidateEducationSection from './CandidateEducationSection';

const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
const inputStyle = { padding: '10px', borderRadius: '6px', border: '1px solid #ccc' };
const textareaStyle = { ...inputStyle, resize: 'vertical' };
const buttonStyle = { padding: '8px 10px', borderRadius: '6px', border: '1px solid #ccc', background: 'white', cursor: 'pointer' };

function normalizeStringList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== 'string') return [];
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

function ChipsListEditor({ title, value, onChange, placeholder = 'Add an item…', addLabel = 'Add' }) {
    const items = useMemo(() => normalizeStringList(value), [value]);
    const [draft, setDraft] = useState('');

    const addItem = () => {
        const trimmed = draft.trim();
        if (!trimmed) return;
        const next = [...items, trimmed];
        onChange(next);
        setDraft('');
    };

    const removeItem = (index) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <div style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px', backgroundColor: 'white' }}>
            <h3>{title}</h3>
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
                <button type="button" onClick={addItem} style={buttonStyle}>
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
        </div>
    );
}

function CandidateProfileEditor({ candidate, onCandidateChange }) {
    const safeCandidate = candidate || {};
    const preferences = safeCandidate.preferences || {};
    const links = safeCandidate.links || {};

    const update = (patch) => onCandidateChange({ ...safeCandidate, ...patch });

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) return;
        if (active.id === over.id) return;

        if (String(active.id).startsWith('job-')) {
            const jobs = Array.isArray(safeCandidate.jobs) ? safeCandidate.jobs : [];
            const oldIndex = jobs.findIndex((job) => job.id === active.id);
            const newIndex = jobs.findIndex((job) => job.id === over.id);
            if (oldIndex >= 0 && newIndex >= 0) update({ jobs: arrayMove(jobs, oldIndex, newIndex) });
            return;
        }

        if (String(active.id).startsWith('project-')) {
            const projects = Array.isArray(safeCandidate.projects) ? safeCandidate.projects : [];
            const oldIndex = projects.findIndex((proj) => proj.id === active.id);
            const newIndex = projects.findIndex((proj) => proj.id === over.id);
            if (oldIndex >= 0 && newIndex >= 0) update({ projects: arrayMove(projects, oldIndex, newIndex) });
        }
    };

    const handleJobsChange = (jobs) => update({ jobs });
    const handleProjectsChange = (projects) => update({ projects });
    const handleSkillCategoriesChange = (skillCategories) => update({ skillCategories });

    const handleAddJob = () => {
        const jobs = Array.isArray(safeCandidate.jobs) ? safeCandidate.jobs : [];
        handleJobsChange([
            ...jobs,
            {
                id: makeId('job'),
                jobTitle: 'New Job',
                jobEmployer: '',
                jobLocation: '',
                jobStartDate: '',
                jobEndDate: '',
                jobPoints: [],
            },
        ]);
    };

    const handleUpdateJob = (updatedJob) => {
        const jobs = Array.isArray(safeCandidate.jobs) ? safeCandidate.jobs : [];
        handleJobsChange(jobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
    };

    const handleRemoveJob = (jobId) => {
        const jobs = Array.isArray(safeCandidate.jobs) ? safeCandidate.jobs : [];
        handleJobsChange(jobs.filter((job) => job.id !== jobId));
    };

    const handleGetProjects = async () => {
        const projects = await fetch('/api/projects');
        handleProjectsChange([

        ])

    }

    const handleAddProject = () => {
        const projects = Array.isArray(safeCandidate.projects) ? safeCandidate.projects : [];
        handleProjectsChange([
            ...projects,
            {
                id: makeId('project'),
                projectTitle: 'New Project',
                projectTech: '',
                projectDate: '',
                projectPoints: [],
            },
        ]);
    };

    const handleUpdateProject = (updatedProject) => {
        const projects = Array.isArray(safeCandidate.projects) ? safeCandidate.projects : [];
        handleProjectsChange(projects.map((proj) => (proj.id === updatedProject.id ? updatedProject : proj)));
    };

    const handleRemoveProject = (projectId) => {
        const projects = Array.isArray(safeCandidate.projects) ? safeCandidate.projects : [];
        handleProjectsChange(projects.filter((proj) => proj.id !== projectId));
    };

    const handleAddSkillCategory = () => {
        const existing = Array.isArray(safeCandidate.skillCategories) ? safeCandidate.skillCategories : [];
        handleSkillCategoriesChange([
            ...existing,
            {
                id: makeId('skill'),
                catTitle: 'New Category',
                catSkills: [],
            },
        ]);
    };

    const handleUpdateSkillCategory = (updatedSkillCat) => {
        const cats = Array.isArray(safeCandidate.skillCategories) ? safeCandidate.skillCategories : [];
        handleSkillCategoriesChange(cats.map((cat) => (cat.id === updatedSkillCat.id ? updatedSkillCat : cat)));
    };

    const handleRemoveSkillCategory = (skillCatId) => {
        const cats = Array.isArray(safeCandidate.skillCategories) ? safeCandidate.skillCategories : [];
        handleSkillCategoriesChange(cats.filter((cat) => cat.id !== skillCatId));
    };

    return (
        <div>
            <CandidateEducationSection
                education={safeCandidate.education || []}
                onChange={(education) => update({ education })}
                makeId={makeId}
            />
            <ChipsListEditor
                title="Relevant Courses"
                value={safeCandidate.relevantCourses || []}
                onChange={(relevantCourses) => update({ relevantCourses })}
                placeholder="e.g., Operating Systems"
            />

            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <WorkExperienceSection
                    jobs={safeCandidate.jobs || []}
                    onUpdateJob={handleUpdateJob}
                    onRemoveJob={handleRemoveJob}
                    onAddJob={handleAddJob}
                />
                <ProjectsSection
                    projects={safeCandidate.projects || []}
                    onUpdateProject={handleUpdateProject}
                    onRemoveProject={handleRemoveProject}
                    onAddProject={handleAddProject}
                />
            </DndContext>

            <SkillsSection
                skillCategories={safeCandidate.skillCategories || []}
                onUpdateSkillCategory={handleUpdateSkillCategory}
                onRemoveSkillCategory={handleRemoveSkillCategory}
                onAddSkillCategory={handleAddSkillCategory}
            />

            <ObjectListSection
                title="Certifications"
                items={safeCandidate.certifications || []}
                onChange={(certifications) => update({ certifications })}
                addLabel="Add Certification"
                makeNewItem={() => ({ id: makeId('cert'), name: '', issuer: '', date: '', url: '' })}
                renderSummary={(entry) => `${entry.name || 'Certification'}${entry.issuer ? ` — ${entry.issuer}` : ''}`}
                renderEditor={(entry, onUpdate) => (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input type="text" value={entry.name || ''} onChange={(e) => onUpdate({ ...entry, name: e.target.value })} placeholder="Name" style={inputStyle} />
                        <input type="text" value={entry.issuer || ''} onChange={(e) => onUpdate({ ...entry, issuer: e.target.value })} placeholder="Issuer" style={inputStyle} />
                        <input type="text" value={entry.date || ''} onChange={(e) => onUpdate({ ...entry, date: e.target.value })} placeholder="Date (optional)" style={inputStyle} />
                        <input type="text" value={entry.url || ''} onChange={(e) => onUpdate({ ...entry, url: e.target.value })} placeholder="URL (optional)" style={inputStyle} />
                    </div>
                )}
            />

            <ObjectListSection
                title="Awards"
                items={safeCandidate.awards || []}
                onChange={(awards) => update({ awards })}
                addLabel="Add Award"
                makeNewItem={() => ({ id: makeId('award'), title: '', issuer: '', date: '', details: '' })}
                renderSummary={(entry) => `${entry.title || 'Award'}${entry.issuer ? ` — ${entry.issuer}` : ''}`}
                renderEditor={(entry, onUpdate) => (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input type="text" value={entry.title || ''} onChange={(e) => onUpdate({ ...entry, title: e.target.value })} placeholder="Title" style={inputStyle} />
                        <input type="text" value={entry.issuer || ''} onChange={(e) => onUpdate({ ...entry, issuer: e.target.value })} placeholder="Issuer" style={inputStyle} />
                        <input type="text" value={entry.date || ''} onChange={(e) => onUpdate({ ...entry, date: e.target.value })} placeholder="Date (optional)" style={inputStyle} />
                        <textarea
                            value={entry.details || ''}
                            onChange={(e) => onUpdate({ ...entry, details: e.target.value })}
                            placeholder="Details (optional)"
                            rows={3}
                            style={{ ...textareaStyle, gridColumn: '1 / -1' }}
                        />
                    </div>
                )}
            />

            <ObjectListSection
                title="Languages"
                items={safeCandidate.languages || []}
                onChange={(languages) => update({ languages })}
                addLabel="Add Language"
                makeNewItem={() => ({ id: makeId('lang'), language: '', proficiency: '' })}
                renderSummary={(entry) => `${entry.language || 'Language'}${entry.proficiency ? ` — ${entry.proficiency}` : ''}`}
                renderEditor={(entry, onUpdate) => (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input
                            type="text"
                            value={entry.language || ''}
                            onChange={(e) => onUpdate({ ...entry, language: e.target.value })}
                            placeholder="Language"
                            style={inputStyle}
                        />
                        <input
                            type="text"
                            value={entry.proficiency || ''}
                            onChange={(e) => onUpdate({ ...entry, proficiency: e.target.value })}
                            placeholder="Proficiency (e.g., Native, Fluent)"
                            style={inputStyle}
                        />
                    </div>
                )}
            />

            <div style={{ padding: '10px', border: '1px solid #ccc', marginBottom: '10px', backgroundColor: 'white' }}>
                <h3>Links</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                        type="text"
                        value={links.website || ''}
                        onChange={(e) => update({ links: { ...links, website: e.target.value } })}
                        placeholder="Website (optional)"
                        style={inputStyle}
                    />
                    <input
                        type="text"
                        value={links.portfolio || ''}
                        onChange={(e) => update({ links: { ...links, portfolio: e.target.value } })}
                        placeholder="Portfolio (optional)"
                        style={inputStyle}
                    />
                </div>
                <div style={{ marginTop: '10px' }}>
                    <ChipsListEditor
                        title="Other Links"
                        value={links.other || []}
                        onChange={(other) => update({ links: { ...links, other } })}
                        placeholder="e.g., https://example.com/project"
                        addLabel="Add link"
                    />
                </div>
            </div>

        </div>
    );
}

export default CandidateProfileEditor;
