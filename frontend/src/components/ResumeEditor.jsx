import React, { useState, useEffect, useMemo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import WorkExperienceSection from './WorkExperienceSection';
import ProjectsSection from './ProjectsSection';
import SkillsSection from './SkillsSection';
import ObjectiveSection from './ObjectiveSection'; // Import the new component
import EducationSection from './EducationSection'; // Import the new component

function ResumeEditor({ application, onResumeChange, initKey, baseResume }) {
    const [resumeData, setResumeData] = useState(null);
    const [loadedKey, setLoadedKey] = useState(null);
    const [relevantCourses, setRelevantCourses] = useState([]);
    const [newCourse, setNewCourse] = useState('');

    useEffect(() => {
        if (application && application.resume) {
            const key = initKey || application.id || 'default';
            if (loadedKey === key && resumeData) {
                return; // Avoid resetting while editing the same resume
            }
            const courses = Array.isArray(application.resume.relevantCourses)
                ? application.resume.relevantCourses.filter(Boolean)
                : (application.resume.relevantCourses || '').split(',').map((c) => c.trim()).filter(Boolean);
            const resumeWithIds = {
                ...{
                    name: '',
                    number: '',
                    email: '',
                    linkedin: '',
                    github: '',
                },
                ...application.resume,
                relevantCourses: courses,
                jobs: application.resume.jobs
                    ? application.resume.jobs.map((job, index) => ({
                        ...job,
                        jobPoints: Array.isArray(job.jobPoints)
                            ? job.jobPoints.filter(Boolean)
                            : (job.jobPoints || '').split('\n').map((p) => p.trim()).filter(Boolean),
                        id: job.id || `job-${index}`,
                    }))
                    : [],
                projects: application.resume.projects
                    ? application.resume.projects.map((proj, index) => ({
                        ...proj,
                        projectTech: Array.isArray(proj.projectTech)
                            ? proj.projectTech.filter(Boolean)
                            : (proj.projectTech || ''),
                        projectPoints: Array.isArray(proj.projectPoints)
                            ? proj.projectPoints.filter(Boolean)
                            : (proj.projectPoints || '').split('\n').map((p) => p.trim()).filter(Boolean),
                        id: proj.id || `project-${index}`,
                    }))
                    : [],
                skillCategories: (application.resume.skillCategories || []).map((cat, index) => ({
                    ...cat,
                    catSkills: Array.isArray(cat.catSkills)
                        ? cat.catSkills.filter(Boolean)
                        : (cat.catSkills || '').split(',').map((s) => s.trim()).filter(Boolean),
                    id: cat.id || `skill-${index}`,
                })),
            };
            setLoadedKey(key);
            setResumeData(resumeWithIds);
            setRelevantCourses(courses);
        }
    }, [application, initKey, loadedKey, resumeData]);

    const normalizedBaseResume = useMemo(() => {
        if (!baseResume) {
            return {
                name: '',
                number: '',
                email: '',
                linkedin: '',
                github: '',
                objective: '',
                relevantCourses: [],
                jobs: [],
                projects: [],
                skillCategories: [],
            };
        }
        const courses = Array.isArray(baseResume.relevantCourses)
            ? baseResume.relevantCourses
            : (baseResume.relevantCourses || '').split(',').map((c) => c.trim()).filter(Boolean);
        const jobs = (baseResume.jobs || []).map((job, idx) => ({
            jobTitle: job.jobTitle || '',
            jobEmployer: job.jobEmployer || '',
            jobLocation: job.jobLocation || '',
            jobStartDate: job.jobStartDate || '',
            jobEndDate: job.jobEndDate || '',
            jobPoints: Array.isArray(job.jobPoints)
                ? job.jobPoints.filter(Boolean)
                : (job.jobPoints || '').split('\n').map((p) => p.trim()).filter(Boolean),
            id: job.id || `base-job-${idx}`,
        }));
        const projects = (baseResume.projects || []).map((proj, idx) => ({
            projectTitle: proj.projectTitle || '',
            projectTech: Array.isArray(proj.projectTech)
                ? proj.projectTech.filter(Boolean)
                : (proj.projectTech || '').split(',').map((t) => t.trim()).filter(Boolean),
            projectDate: proj.projectDate || '',
            projectPoints: Array.isArray(proj.projectPoints)
                ? proj.projectPoints.filter(Boolean)
                : (proj.projectPoints || '').split('\n').map((p) => p.trim()).filter(Boolean),
            id: proj.id || `base-project-${idx}`,
        }));
        const skills = (baseResume.skillCategories || []).map((cat, idx) => ({
            catTitle: cat.catTitle || '',
            catSkills: Array.isArray(cat.catSkills)
                ? cat.catSkills.filter(Boolean)
                : (cat.catSkills || '').split(',').map((s) => s.trim()).filter(Boolean),
            id: cat.id || `base-skill-${idx}`,
        }));
        return {
            name: baseResume.name || '',
            number: baseResume.number || '',
            email: baseResume.email || '',
            linkedin: baseResume.linkedin || '',
            github: baseResume.github || '',
            objective: baseResume.objective || '',
            relevantCourses: courses,
            jobs,
            projects,
            skillCategories: skills,
        };
    }, [baseResume]);

    const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const handleAddCourseFromBase = (course) => {
        if (!course) return;
        setRelevantCourses((prev) => {
            if (prev.map((c) => c.toLowerCase()).includes(course.toLowerCase())) return prev;
            const updated = [...prev, course];
            setResumeData((prevData) => {
                const newData = { ...prevData, relevantCourses: updated };
                onResumeChange(newData);
                return newData;
            });
            return updated;
        });
    };

    const isJobImported = (job) => {
        return (resumeData.jobs || []).some((existing) =>
            (existing.jobTitle || '').toLowerCase() === (job.jobTitle || '').toLowerCase() &&
            (existing.jobEmployer || '').toLowerCase() === (job.jobEmployer || '').toLowerCase() &&
            (existing.jobStartDate || '') === (job.jobStartDate || '') &&
            (existing.jobEndDate || '') === (job.jobEndDate || '')
        );
    };

    const isProjectImported = (proj) => {
        return (resumeData.projects || []).some((existing) =>
            (existing.projectTitle || '').toLowerCase() === (proj.projectTitle || '').toLowerCase() &&
            (existing.projectDate || '') === (proj.projectDate || '')
        );
    };

    const isSkillCategoryImported = (cat) => {
        return (resumeData.skillCategories || []).some((existing) =>
            (existing.catTitle || '').toLowerCase() === (cat.catTitle || '').toLowerCase()
        );
    };

    const handleAddJobFromBase = (job) => {
        if (!job) return;
        setResumeData((prev) => {
            const copy = {
                ...job,
                id: makeId('job'),
                jobPoints: (job.jobPoints || []).slice(),
            };
            const existing = Array.isArray(prev.jobs) ? prev.jobs : [];
            const newData = { ...prev, jobs: [...existing, copy] };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleAddProjectFromBase = (proj) => {
        if (!proj) return;
        setResumeData((prev) => {
            const copy = {
                ...proj,
                id: makeId('project'),
                projectPoints: (proj.projectPoints || []).slice(),
                projectTech: Array.isArray(proj.projectTech) ? proj.projectTech.slice() : [],
            };
            const existing = Array.isArray(prev.projects) ? prev.projects : [];
            const newData = { ...prev, projects: [...existing, copy] };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleAddSkillCatFromBase = (cat) => {
        if (!cat) return;
        setResumeData((prev) => {
            const copy = {
                ...cat,
                id: makeId('skill'),
                catSkills: Array.isArray(cat.catSkills) ? cat.catSkills.slice() : [],
            };
            const existing = Array.isArray(prev.skillCategories) ? prev.skillCategories : [];
            const newData = { ...prev, skillCategories: [...existing, copy] };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over) {
            // Dropped outside any sortable container; nothing to do
            return;
        }
        if (active.id === over.id) return;

        setResumeData((prevData) => {
            if (!prevData) return null;
            let newData = { ...prevData };

            if (active.id.startsWith('job-')) {
                const oldIndex = prevData.jobs.findIndex(job => job.id === active.id);
                const newIndex = prevData.jobs.findIndex(job => job.id === over.id);
                newData.jobs = arrayMove(prevData.jobs, oldIndex, newIndex);
            } else if (active.id.startsWith('project-')) {
                const oldIndex = prevData.projects.findIndex(proj => proj.id === active.id);
                const newIndex = prevData.projects.findIndex(proj => proj.id === over.id);
                newData.projects = arrayMove(prevData.projects, oldIndex, newIndex);
            }
            
            onResumeChange(newData);
            return newData;
        });
    };

    // --- General field handlers ---
    const handleUpdateObjective = (newObjective) => {
        setResumeData(prevData => {
            const newData = { ...prevData, objective: newObjective };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleAddCourse = () => {
        const trimmed = newCourse.trim();
        if (!trimmed) return;
        setRelevantCourses((prev) => {
            const updated = [...prev, trimmed];
            setResumeData((prevData) => {
                const newData = { ...prevData, relevantCourses: updated };
                onResumeChange(newData);
                return newData;
            });
            return updated;
        });
        setNewCourse('');
    };

    const handleRemoveCourse = (index) => {
        setRelevantCourses((prev) => {
            const updated = prev.filter((_, i) => i !== index);
            setResumeData((prevData) => {
                const newData = { ...prevData, relevantCourses: updated };
                onResumeChange(newData);
                return newData;
            });
            return updated;
        });
    };

    // --- Job Handlers ---
    const handleUpdateJob = (updatedJob) => {
        setResumeData(prevData => {
            const updatedJobs = prevData.jobs.map(job => job.id === updatedJob.id ? updatedJob : job);
            const newData = { ...prevData, jobs: updatedJobs };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleRemoveJob = (jobId) => {
        setResumeData(prevData => {
            const updatedJobs = prevData.jobs.filter(job => job.id !== jobId);
            const newData = { ...prevData, jobs: updatedJobs };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleAddJob = () => {
        setResumeData(prevData => {
            const newJob = { 
                id: `job-${Date.now()}`,
                jobTitle: 'New Job', jobEmployer: '', jobLocation: '', jobStartDate: '', jobEndDate: '', jobPoints: [] 
            };
            const newData = { ...prevData, jobs: [...prevData.jobs, newJob] };
            onResumeChange(newData);
            return newData;
        });
    };

    // --- Project Handlers ---
    const handleUpdateProject = (updatedProject) => {
        setResumeData(prevData => {
            const updatedProjects = prevData.projects.map(proj => proj.id === updatedProject.id ? updatedProject : proj);
            const newData = { ...prevData, projects: updatedProjects };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleRemoveProject = (projectId) => {
        setResumeData(prevData => {
            const updatedProjects = prevData.projects.filter(proj => proj.id !== projectId);
            const newData = { ...prevData, projects: updatedProjects };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleAddProject = () => {
        setResumeData(prevData => {
            const newProject = {
                id: `project-${Date.now()}`,
                projectTitle: 'New Project', projectTech: '', projectDate: '', projectPoints: []
            };
            const newData = { ...prevData, projects: [...prevData.projects, newProject] };
            onResumeChange(newData);
            return newData;
        });
    };

    // --- Skill Category Handlers ---
    const handleUpdateSkillCategory = (updatedSkillCat) => {
        setResumeData(prevData => {
            const updatedSkillCategories = prevData.skillCategories.map(cat => cat.id === updatedSkillCat.id ? updatedSkillCat : cat);
            const newData = { ...prevData, skillCategories: updatedSkillCategories };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleRemoveSkillCategory = (skillCatId) => {
        setResumeData(prevData => {
            const updatedSkillCategories = prevData.skillCategories.filter(cat => cat.id !== skillCatId);
            const newData = { ...prevData, skillCategories: updatedSkillCategories };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleAddSkillCategory = () => {
        setResumeData(prevData => {
            const newSkillCat = {
                id: `skill-${Date.now()}`,
                catTitle: 'New Category',
                catSkills: [],
            };
            const existing = Array.isArray(prevData.skillCategories) ? prevData.skillCategories : [];
            const newData = { ...prevData, skillCategories: [...existing, newSkillCat] };
            onResumeChange(newData);
            return newData;
        });
    };


    if (!resumeData) {
        return <div>Loading resume editor...</div>;
    }

    return (
        <div>
            <h2>Resume Editor</h2>
            <ObjectiveSection
                objective={resumeData.objective}
                onUpdateObjective={handleUpdateObjective}
                baseObjective={normalizedBaseResume.objective}
            />
            <div style={{ marginBottom: '16px' }}>
                <h3>Relevant Courses</h3>
                {normalizedBaseResume.relevantCourses.length > 0 && (
                    <div style={{ marginBottom: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {normalizedBaseResume.relevantCourses.map((course, idx) => {
                            const alreadyAdded = relevantCourses.map((c) => c.toLowerCase()).includes(course.toLowerCase());
                            return (
                                <span key={`base-course-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: '#eef3ff' }}>
                                    {course}
                                    <button
                                        type="button"
                                        onClick={() => handleAddCourseFromBase(course)}
                                        className="btn btn--sm btn--add"
                                        disabled={alreadyAdded}
                                    >
                                        {alreadyAdded ? 'Added' : 'Add'}
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                        type="text"
                        placeholder="Add a course"
                        value={newCourse}
                        onChange={(e) => setNewCourse(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCourse();
                            }
                        }}
                        style={{ flexGrow: 1 }}
                    />
                    <button type="button" onClick={handleAddCourse} className="btn btn--add">Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {relevantCourses.map((course, idx) => (
                        <span key={`${course}-${idx}`} style={{ padding: '6px 10px', borderRadius: '999px', backgroundColor: '#e7f1ff', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {course}
                            <button type="button" onClick={() => handleRemoveCourse(idx)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>×</button>
                        </span>
                    ))}
                    {relevantCourses.length === 0 && <span style={{ color: '#777' }}>No courses yet. Add one above.</span>}
                </div>
            </div>
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <WorkExperienceSection 
                    jobs={resumeData.jobs} 
                    onUpdateJob={handleUpdateJob}
                    onRemoveJob={handleRemoveJob}
                    onAddJob={handleAddJob}
                    baseJobs={normalizedBaseResume.jobs}
                    onImportJob={handleAddJobFromBase}
                    isJobImported={isJobImported}
                />
                <ProjectsSection
                    projects={resumeData.projects}
                    onUpdateProject={handleUpdateProject}
                    onRemoveProject={handleRemoveProject}
                    onAddProject={handleAddProject}
                    baseProjects={normalizedBaseResume.projects}
                    onImportProject={handleAddProjectFromBase}
                    isProjectImported={isProjectImported}
                />
                {/* Other resume sections will go here */}
            </DndContext>
            <SkillsSection
                skillCategories={resumeData.skillCategories}
                onUpdateSkillCategory={handleUpdateSkillCategory}
                onRemoveSkillCategory={handleRemoveSkillCategory}
                onAddSkillCategory={handleAddSkillCategory}
                baseSkillCategories={normalizedBaseResume.skillCategories}
                onImportSkillCategory={handleAddSkillCatFromBase}
                isSkillCategoryImported={isSkillCategoryImported}
            />
        </div>
    );
}

export default ResumeEditor;
