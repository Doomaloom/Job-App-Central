import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import WorkExperienceSection from './WorkExperienceSection';
import ProjectsSection from './ProjectsSection';
import SkillsSection from './SkillsSection';
import ObjectiveSection from './ObjectiveSection'; // Import the new component
import EducationSection from './EducationSection'; // Import the new component

function ResumeEditor({ application, onResumeChange, initKey }) {
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
