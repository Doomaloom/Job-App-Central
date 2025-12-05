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
            const resumeWithIds = {
                ...application.resume,
                jobs: application.resume.jobs ? application.resume.jobs.map((job, index) => ({ ...job, id: `job-${index}` })) : [],
                projects: application.resume.projects ? application.resume.projects.map((proj, index) => ({ ...proj, id: `project-${index}` })) : [],
                skillCategories: (application.resume.skillCategories || []).map((cat, index) => ({
                    ...cat,
                    catSkills: Array.isArray(cat.catSkills)
                        ? cat.catSkills
                        : (cat.catSkills || '').split(',').map((s) => s.trim()).filter(Boolean),
                    id: cat.id || `skill-${index}`,
                })),
            };
            setLoadedKey(key);
            setResumeData(resumeWithIds);
            const courses = Array.isArray(application.resume.relevantCourses)
                ? application.resume.relevantCourses
                : (application.resume.relevantCourses || '').split(',').map((c) => c.trim()).filter(Boolean);
            setRelevantCourses(courses);
        }
    }, [application, initKey, loadedKey, resumeData]);

    const normalizedBaseResume = useMemo(() => {
        if (!baseResume) {
            return {
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
            objective: baseResume.objective || '',
            relevantCourses: courses,
            jobs,
            projects,
            skillCategories: skills,
        };
    }, [baseResume]);

    const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    const handleUseBaseObjective = () => {
        setResumeData((prev) => {
            const newData = { ...prev, objective: normalizedBaseResume.objective };
            onResumeChange(newData);
            return newData;
        });
    };

    const handleAddCourseFromBase = (course) => {
        if (!course) return;
        setRelevantCourses((prev) => {
            if (prev.map((c) => c.toLowerCase()).includes(course.toLowerCase())) return prev;
            const updated = [...prev, course];
            setResumeData((prevData) => {
                const newData = { ...prevData, relevantCourses: updated.join(', ') };
                onResumeChange(newData);
                return newData;
            });
            return updated;
        });
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
                const newData = { ...prevData, relevantCourses: updated.join(', ') };
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
                const newData = { ...prevData, relevantCourses: updated.join(', ') };
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
            />
            <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid #ddd', borderRadius: '10px', background: '#f9fbff' }}>
                <h3 style={{ marginTop: 0 }}>Import From Profile Resume</h3>
                <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <strong>Objective</strong>
                        <div style={{ color: '#555', fontSize: '0.95em' }}>{normalizedBaseResume.objective || 'No objective saved in profile.'}</div>
                    </div>
                    <button type="button" onClick={handleUseBaseObjective} disabled={!normalizedBaseResume.objective}>Use Objective</button>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Relevant Courses</strong>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {normalizedBaseResume.relevantCourses.length === 0 && <span style={{ color: '#777' }}>No courses saved.</span>}
                        {normalizedBaseResume.relevantCourses.map((course, idx) => (
                            <span key={`base-course-${idx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: '#eef3ff' }}>
                                {course}
                                <button type="button" onClick={() => handleAddCourseFromBase(course)} style={{ border: '1px solid #ccc', background: '#fff', borderRadius: '6px', padding: '2px 6px', cursor: 'pointer' }}>Add</button>
                            </span>
                        ))}
                    </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Work Experience</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {normalizedBaseResume.jobs.length === 0 && <span style={{ color: '#777' }}>No jobs saved.</span>}
                        {normalizedBaseResume.jobs.map((job) => (
                            <div key={job.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '8px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{job.jobTitle || 'Untitled Job'}</div>
                                    <div style={{ color: '#555', fontSize: '0.9em' }}>{job.jobEmployer}</div>
                                </div>
                                <button type="button" onClick={() => handleAddJobFromBase(job)}>Add</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ marginBottom: '10px' }}>
                    <strong>Projects</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {normalizedBaseResume.projects.length === 0 && <span style={{ color: '#777' }}>No projects saved.</span>}
                        {normalizedBaseResume.projects.map((proj) => (
                            <div key={proj.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '8px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{proj.projectTitle || 'Untitled Project'}</div>
                                    <div style={{ color: '#555', fontSize: '0.9em' }}>{proj.projectDate}</div>
                                </div>
                                <button type="button" onClick={() => handleAddProjectFromBase(proj)}>Add</button>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <strong>Skill Categories</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {normalizedBaseResume.skillCategories.length === 0 && <span style={{ color: '#777' }}>No skill categories saved.</span>}
                        {normalizedBaseResume.skillCategories.map((cat) => (
                            <div key={cat.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '8px', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 600 }}>{cat.catTitle || 'Untitled Category'}</div>
                                    <div style={{ color: '#555', fontSize: '0.9em' }}>
                                        {(Array.isArray(cat.catSkills) ? cat.catSkills : []).slice(0, 3).join(', ')}
                                        {(Array.isArray(cat.catSkills) && cat.catSkills.length > 3) ? '…' : ''}
                                    </div>
                                </div>
                                <button type="button" onClick={() => handleAddSkillCatFromBase(cat)}>Add</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
                <h3>Relevant Courses</h3>
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
                    <button type="button" onClick={handleAddCourse}>Add</button>
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
                />
                <ProjectsSection
                    projects={resumeData.projects}
                    onUpdateProject={handleUpdateProject}
                    onRemoveProject={handleRemoveProject}
                    onAddProject={handleAddProject}
                />
                {/* Other resume sections will go here */}
            </DndContext>
            <SkillsSection
                skillCategories={resumeData.skillCategories}
                onUpdateSkillCategory={handleUpdateSkillCategory}
                onRemoveSkillCategory={handleRemoveSkillCategory}
                onAddSkillCategory={handleAddSkillCategory}
            />
        </div>
    );
}

export default ResumeEditor;
