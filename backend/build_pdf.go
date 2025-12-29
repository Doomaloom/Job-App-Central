package main

import (
	"archive/zip"
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

	resumePDF, coverPDF, err := generateResumeAndCoverPDFs(latexPath, app)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	zipBytes, err := zipDocuments(resumePDF, coverPDF)
	if err != nil {
		http.Error(w, "Failed to package PDFs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", "attachment; filename=\"documents.zip\"")
	w.Write(zipBytes)
}

func handlePreviewPDF(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	doc := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("doc")))
	if doc == "" {
		doc = "resume"
	}
	if doc != "resume" && doc != "cover" && doc != "cover_letter" && doc != "coverletter" {
		http.Error(w, "invalid doc (use doc=resume or doc=cover)", http.StatusBadRequest)
		return
	}

	latexPath, err := exec.LookPath("pdflatex")
	if err != nil {
		http.Error(w, "pdflatex not found in PATH; please install TeX Live and ensure pdflatex is available", http.StatusInternalServerError)
		return
	}

	var app Application
	if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	pdfBytes, filename, err := generateSinglePDF(latexPath, app, doc)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=%q", filename))
	w.Header().Set("Cache-Control", "no-store")
	w.Write(pdfBytes)
}

func compileLatexToPDF(latexPath, tmpDir, texPath string) error {
	cmd := exec.Command(latexPath, "-interaction=nonstopmode", "-halt-on-error", "-output-directory="+tmpDir, texPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("pdflatex compilation failed: %v\nOutput:\n%s", err, string(output))
		return fmt.Errorf("pdflatex compilation failed: %v\n%s", err, string(output))
	}
	return nil
}

func zipDocuments(resumePDF, coverPDF []byte) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	w1, err := zw.Create("resume.pdf")
	if err != nil {
		_ = zw.Close()
		return nil, err
	}
	if _, err := w1.Write(resumePDF); err != nil {
		_ = zw.Close()
		return nil, err
	}

	w2, err := zw.Create("cover_letter.pdf")
	if err != nil {
		_ = zw.Close()
		return nil, err
	}
	if _, err := w2.Write(coverPDF); err != nil {
		_ = zw.Close()
		return nil, err
	}

	if err := zw.Close(); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func generateResumeAndCoverPDFs(latexPath string, app Application) ([]byte, []byte, error) {
	latexContent, err := generateLatexContent(app.Resume)
	if err != nil {
		return nil, nil, err
	}

	coverLetterLatex := generateCoverLetterLatex(app.Resume, app.CoverLetter)
	if strings.TrimSpace(coverLetterLatex) == "" {
		// Always generate a cover letter PDF; if missing content, emit an empty document.
		head, _ := readTemplate("coverletter_head.tex")
		coverLetterLatex = head + "\\end{document}\n"
	}

	tmpDir, err := ioutil.TempDir("", "resume-latex")
	if err != nil {
		return nil, nil, fmt.Errorf("Failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	resumeTexPath := filepath.Join(tmpDir, "resume.tex")
	if err := ioutil.WriteFile(resumeTexPath, []byte(latexContent), 0644); err != nil {
		return nil, nil, fmt.Errorf("Failed to write resume .tex file: %w", err)
	}
	coverTexPath := filepath.Join(tmpDir, "cover_letter.tex")
	if err := ioutil.WriteFile(coverTexPath, []byte(coverLetterLatex), 0644); err != nil {
		return nil, nil, fmt.Errorf("Failed to write cover letter .tex file: %w", err)
	}

	if err := copyStubTexFiles(tmpDir); err != nil {
		return nil, nil, err
	}

	if err := compileLatexToPDF(latexPath, tmpDir, resumeTexPath); err != nil {
		return nil, nil, err
	}
	if err := compileLatexToPDF(latexPath, tmpDir, coverTexPath); err != nil {
		return nil, nil, err
	}

	resumePDF, err := ioutil.ReadFile(filepath.Join(tmpDir, "resume.pdf"))
	if err != nil {
		return nil, nil, fmt.Errorf("Failed to read generated resume PDF: %w", err)
	}
	coverPDF, err := ioutil.ReadFile(filepath.Join(tmpDir, "cover_letter.pdf"))
	if err != nil {
		return nil, nil, fmt.Errorf("Failed to read generated cover letter PDF: %w", err)
	}

	return resumePDF, coverPDF, nil
}

func generateSinglePDF(latexPath string, app Application, doc string) ([]byte, string, error) {
	tmpDir, err := ioutil.TempDir("", "resume-latex")
	if err != nil {
		return nil, "", fmt.Errorf("Failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	if err := copyStubTexFiles(tmpDir); err != nil {
		return nil, "", err
	}

	switch doc {
	case "resume":
		latexContent, err := generateLatexContent(app.Resume)
		if err != nil {
			return nil, "", err
		}
		resumeTexPath := filepath.Join(tmpDir, "resume.tex")
		if err := ioutil.WriteFile(resumeTexPath, []byte(latexContent), 0644); err != nil {
			return nil, "", fmt.Errorf("Failed to write resume .tex file: %w", err)
		}
		if err := compileLatexToPDF(latexPath, tmpDir, resumeTexPath); err != nil {
			return nil, "", err
		}
		pdfBytes, err := ioutil.ReadFile(filepath.Join(tmpDir, "resume.pdf"))
		if err != nil {
			return nil, "", fmt.Errorf("Failed to read generated resume PDF: %w", err)
		}
		return pdfBytes, "resume.pdf", nil

	default:
		coverLetterLatex := generateCoverLetterLatex(app.Resume, app.CoverLetter)
		if strings.TrimSpace(coverLetterLatex) == "" {
			head, _ := readTemplate("coverletter_head.tex")
			coverLetterLatex = head + "\\end{document}\n"
		}
		coverTexPath := filepath.Join(tmpDir, "cover_letter.tex")
		if err := ioutil.WriteFile(coverTexPath, []byte(coverLetterLatex), 0644); err != nil {
			return nil, "", fmt.Errorf("Failed to write cover letter .tex file: %w", err)
		}
		if err := compileLatexToPDF(latexPath, tmpDir, coverTexPath); err != nil {
			return nil, "", err
		}
		pdfBytes, err := ioutil.ReadFile(filepath.Join(tmpDir, "cover_letter.pdf"))
		if err != nil {
			return nil, "", fmt.Errorf("Failed to read generated cover letter PDF: %w", err)
		}
		return pdfBytes, "cover_letter.pdf", nil
	}
}

func copyStubTexFiles(tmpDir string) error {
	stubFiles, err := ioutil.ReadDir("./Resume-Stubs")
	if err != nil {
		return fmt.Errorf("Failed to read Resume-Stubs directory: %w", err)
	}

	for _, file := range stubFiles {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".tex") {
			srcPath := filepath.Join("./Resume-Stubs", file.Name())
			destPath := filepath.Join(tmpDir, file.Name())
			input, err := ioutil.ReadFile(srcPath)
			if err != nil {
				return fmt.Errorf("Failed to read stub file: %w", err)
			}
			if err := ioutil.WriteFile(destPath, input, 0644); err != nil {
				return fmt.Errorf("Failed to copy stub file: %w", err)
			}
		}
	}
	return nil
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
