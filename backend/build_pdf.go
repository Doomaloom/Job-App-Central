package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

var latexEscaper = strings.NewReplacer(
	`\\`, `\textbackslash{}`,
	"&", `\&`,
	"%", `\%`,
	"$", `\$`,
	"#", `\#`,
	"_", `\_`,
	"{", `\{`,
	"}", `\}`,
	"~", `\textasciitilde{}`,
	"^", `\textasciicircum{}`,
)

func esc(s string) string {
	return latexEscaper.Replace(s)
}

func handleGeneratePDF(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	latexPath, err := exec.LookPath("pdflatex")
	if err != nil {
		http.Error(w, "pdflatex not found in PATH; please install TeX Live (package name on Arch/Manjaro: texlive-bin) and ensure pdflatex is available", http.StatusInternalServerError)
		return
	}

	var app Application
	err2 := json.NewDecoder(r.Body).Decode(&app)
	if err2 != nil {
		http.Error(w, err2.Error(), http.StatusBadRequest)
		return
	}

	latexContent, err := generateLatexContent(app.Resume)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create a temporary directory for LaTeX compilation
	tmpDir, err := ioutil.TempDir("", "resume-latex")
	if err != nil {
		http.Error(w, "Failed to create temp directory: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer os.RemoveAll(tmpDir) // Clean up the temporary directory

	// Write the generated LaTeX content to a .tex file
	texFilePath := filepath.Join(tmpDir, "resume.tex")
	err = ioutil.WriteFile(texFilePath, []byte(latexContent), 0644)
	if err != nil {
		http.Error(w, "Failed to write .tex file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Copy all stub files to the temporary directory
	stubFiles, err := ioutil.ReadDir("./Resume-Stubs")
	if err != nil {
		http.Error(w, "Failed to read Resume-Stubs directory: "+err.Error(), http.StatusInternalServerError)
		return
	}

	for _, file := range stubFiles {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".tex") {
			srcPath := filepath.Join("./Resume-Stubs", file.Name())
			destPath := filepath.Join(tmpDir, file.Name())
			input, err := ioutil.ReadFile(srcPath)
			if err != nil {
				http.Error(w, "Failed to read stub file: "+err.Error(), http.StatusInternalServerError)
				return
			}
			err = ioutil.WriteFile(destPath, input, 0644)
			if err != nil {
				http.Error(w, "Failed to copy stub file: "+err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}

	// Compile the LaTeX file to PDF
	cmd := exec.Command(latexPath, "-output-directory="+tmpDir, texFilePath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("pdflatex compilation failed: %v\nOutput:\n%s", err, string(output))
		http.Error(w, "pdflatex compilation failed: "+err.Error()+"\n"+string(output), http.StatusInternalServerError)
		return
	}

	pdfFilePath := filepath.Join(tmpDir, "resume.pdf")
	pdfContent, err := ioutil.ReadFile(pdfFilePath)
	if err != nil {
		http.Error(w, "Failed to read generated PDF: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", "attachment; filename=\"resume.pdf\"")
	w.Write(pdfContent)
}

// readTemplate reads a LaTeX template file from the Resume-Stubs directory.
func readTemplate(filename string) (string, error) {
	path := filepath.Join("Resume-Stubs", filename)
	content, err := ioutil.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("failed to read template %s: %w", filename, err)
	}
	return string(content), nil
}

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

	var courses bytes.Buffer
	for _, course := range data.RelevantCourses {
		courses.WriteString(esc(course) + ", ")
	}
	courses.UnreadByte()
	courses.UnreadByte()

	education := educationTemplate + courses.String() + "} \n \\resumeSubHeadingListEnd"

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

		points := job.JobPoints
		for _, point := range points {
			currentJob.WriteString("\\resumeItem{")
			currentJob.WriteString(esc(point))
			currentJob.WriteString("}\n")
		}
		currentJob.WriteString("\\resumeItemListEnd \n")

		jobList.WriteString(currentJob.String())

	}

	jobsCompiled := workTemplate + jobList.String() + "\\resumeSubHeadingListEnd \n"

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
		for _, skill := range skillCat.CatSkills {
			currentSkillCat.WriteString(esc(skill) + ", ")
		}
		currentSkillCat.UnreadByte()
		currentSkillCat.UnreadByte()
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

	finalLatex := headTemplate + applicantHeader + objective + education + skills + projects + work + "\\end{document}"
	fmt.Println(finalLatex)

	return finalLatex, nil
}

