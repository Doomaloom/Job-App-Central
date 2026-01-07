package main

import (
	"bytes"
	"fmt"
	"strings"
)

func generateApplicantHeader(data ResumeData) (string, error) {
	applicantHeader := fmt.Sprintf(`
	\begin{center}
    \textbf{\Huge \scshape %s} \\ \vspace{1pt}
    \small %s $|$ \href{mailto:%s}{\underline{%s}} $|$
    \href{https:/%s}{\underline{%s}} $|$
    \href{https:/%s}{\underline{%s}}
	\end{center}
		`, esc(data.Name), esc(data.Phone), esc(data.Email), esc(data.Email), esc(data.LinkedIn), esc(data.LinkedIn), esc(data.Github), esc(data.Github))

	return applicantHeader, nil
}

func generateObjective(data ResumeData) (string, error) {
	objectiveTemplate, err := readTemplate("resume_objective.tex")
	if err != nil {
		return "", err
	}
	objective := objectiveTemplate + esc(data.Objective) + "\n} \\end{itemize}\n"
	return objective, nil
}

func generateEducation(data ResumeData) (string, error) {
	educationTemplate, err := readTemplate("resume_education.tex")
	if err != nil {
		return "", err
	}

	var courseList []string

	for i, course := range data.RelevantCourses {
		courseList = append(courseList, esc(course))
		if i < len(data.RelevantCourses)-1 {
			courseList = append(courseList, ", ")
		}
	}

	courses := strings.Join(courseList, "")

	education := educationTemplate + courses + "} \n \\resumeSubHeadingListEnd"
	return education, nil
}

func generateProjects(data ResumeData) (string, error) {
	projectTemplate, err := readTemplate("resume_projects.tex")
	if err != nil {
		return "", err
	}

	var projects bytes.Buffer
	for _, project := range data.Projects {
		var currentProject bytes.Buffer
		currentProject.WriteString("\\resumeProjectHeading {\\textbf {")

		title := project.ProjectTitle
		tech := project.ProjectTech
		date := project.ProjectDate
		points := project.ProjectPoints

		currentProject.WriteString(esc(title))
		currentProject.WriteString("} $|$ \\emph{ \n")
		currentProject.WriteString(esc(tech))
		currentProject.WriteString("}}{ \n")
		currentProject.WriteString(esc(date))
		currentProject.WriteString("} \n")

		currentProject.WriteString("\\resumeItemListStart")
		for _, point := range points {
			currentProject.WriteString("\\resumeItem{")
			currentProject.WriteString(esc(point))
			currentProject.WriteString("}\n")
		}
		currentProject.WriteString("\\resumeItemListEnd \n")

		projects.WriteString(currentProject.String())
	}

	projectsCompiled := projectTemplate + projects.String() + "\\resumeSubHeadingListEnd \n"
	return projectsCompiled, nil
}

func generateWork(data ResumeData) (string, error) {
	workTemplate, err := readTemplate("resume_work.tex")
	if err != nil {
		return "", err
	}

	var jobList bytes.Buffer
	for _, job := range data.Jobs {
		var currentJob bytes.Buffer

		currentJob.WriteString("\\resumeSubheading \n {")
		currentJob.WriteString(esc(job.JobTitle))
		currentJob.WriteString("}{")
		currentJob.WriteString(esc(job.JobStartDate + " -- " + job.JobEndDate))
		currentJob.WriteString("}{")
		currentJob.WriteString(esc(job.JobEmployer))
		currentJob.WriteString("}{")
		currentJob.WriteString(esc(job.JobLocation))
		currentJob.WriteString("} \n \\resumeItemListStart")

		for _, point := range job.JobPoints {
			currentJob.WriteString("\\resumeItem{")
			currentJob.WriteString(esc(point))
			currentJob.WriteString("}\n")
		}
		currentJob.WriteString("\\resumeItemListEnd \n")

		jobList.WriteString(currentJob.String())
	}

	jobsCompiled := "\\vspace{-10pt}" + workTemplate + jobList.String() + "\\resumeSubHeadingListEnd \n"
	return jobsCompiled, nil
}

func generateSkills(data ResumeData) (string, error) {
	skillsTemplate, err := readTemplate("resume_skills.tex")
	if err != nil {
		return "", err
	}

	var skills bytes.Buffer
	for _, skillCat := range data.SkillCategories {
		var currentSkillCat bytes.Buffer

		currentSkillCat.WriteString("\\textbf{ ")
		currentSkillCat.WriteString(esc(skillCat.CatTitle))
		currentSkillCat.WriteString(" }{: ")
		for i, skill := range skillCat.CatSkills {
			currentSkillCat.WriteString(esc(skill))
			if i < len(skillCat.CatSkills)-1 {
				currentSkillCat.WriteString(", ")
			}
		}
		currentSkillCat.WriteString(" } \\\\ \n")

		skills.WriteString(currentSkillCat.String())
	}

	compiledSkills := skillsTemplate + skills.String() + "}} \n \\end{itemize}"
	return compiledSkills, nil
}

// generateLatexContent generates the full LaTeX content from ResumeData.
func generateLatexContent(data ResumeData) (string, error) {
	headTemplate, err := readTemplate("resume_head.tex")
	if err != nil {
		return "", err
	}

	applicantHeader, err := generateApplicantHeader(data)
	if err != nil {
		return "", err
	}
	objective, err := generateObjective(data)
	if err != nil {
		return "", err
	}
	education, err := generateEducation(data)
	if err != nil {
		return "", err
	}
	skills, err := generateSkills(data)
	if err != nil {
		return "", err
	}
	projects, err := generateProjects(data)
	if err != nil {
		return "", err
	}
	work, err := generateWork(data)
	if err != nil {
		return "", err
	}

	return headTemplate + applicantHeader + objective + education + skills + projects + work + "\\end{document}", nil
}
