package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

const applicationsDir = "applications"

// ResumeData represents the overall structure of the resume data.
type ResumeData struct {
	Objective       string          `json:"objective"`
	RelevantCourses string          `json:"relevantCourses"`
	Jobs            []Job           `json:"jobs"`
	Projects        []Project       `json:"projects"`
	SkillCategories []SkillCategory `json:"skillCategories"`
}

// Job represents a single job entry in the resume.
type Job struct {
	JobTitle     string   `json:"jobTitle"`
	JobStartDate string   `json:"jobStartDate"`
	JobEndDate   string   `json:"jobEndDate"`
	JobEmployer  string   `json:"jobEmployer"`
	JobLocation  string   `json:"jobLocation"`
	JobPoints    []string `json:"jobPoints"`
}

// Project represents a single project entry in the resume.
type Project struct {
	ProjectTitle  string   `json:"projectTitle"`
	ProjectTech   string   `json:"projectTech"`
	ProjectDate   string   `json:"projectDate"`
	ProjectPoints []string `json:"projectPoints"`
}

// SkillCategory represents a category of skills.
type SkillCategory struct {
	CatTitle  string `json:"catTitle"`
	CatSkills string `json:"catSkills"`
}

// Application represents a full job application, including resume data.
type Application struct {
	ID                string     `json:"id"`
	JobTitle          string     `json:"jobTitle"`
	Company           string     `json:"company"`
	ApplicationStatus string     `json:"applicationStatus"`
	JobDescription    string     `json:"jobDescription"`
	Resume            ResumeData `json:"resume"`
}

// ApplicationSummary represents a brief overview of a job application for listing.
type ApplicationSummary struct {
	ID                string `json:"id"`
	JobTitle          string `json:"jobTitle"`
	Company           string `json:"company"`
	ApplicationStatus string `json:"applicationStatus"`
}

func main() {
	// Ensure the applications directory exists
	if _, err := os.Stat(applicationsDir); os.IsNotExist(err) {
		os.Mkdir(applicationsDir, 0755)
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Welcome to the Job Application Backend!")
	})

	http.HandleFunc("/api/generate-pdf", handleGeneratePDF)
	http.HandleFunc("/api/applications", handleApplications)
	http.HandleFunc("/api/applications/", handleApplicationByID) // For GET, PUT, DELETE by ID

	fmt.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handleGeneratePDF(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	var app Application
	err := json.NewDecoder(r.Body).Decode(&app)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
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
	cmd := exec.Command("pdflatex", "-output-directory="+tmpDir, texFilePath)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err = cmd.Run()
	if err != nil {
		http.Error(w, "pdflatex compilation failed: "+err.Error(), http.StatusInternalServerError)
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

// handleApplications handles GET to list all applications and POST to create a new application.
func handleApplications(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		files, err := ioutil.ReadDir(applicationsDir)
		if err != nil {
			http.Error(w, "Failed to read applications directory: "+err.Error(), http.StatusInternalServerError)
			return
		}

		summaries := make([]ApplicationSummary, 0)
		for _, file := range files {
			if file.IsDir() || !strings.HasSuffix(file.Name(), ".json") {
				continue
			}

			filePath := filepath.Join(applicationsDir, file.Name())
			content, err := ioutil.ReadFile(filePath)
			if err != nil {
				log.Printf("Error reading application file %s: %v", file.Name(), err)
				continue
			}

			var app Application
			if err := json.Unmarshal(content, &app); err != nil {
				log.Printf("Error unmarshaling application file %s: %v", file.Name(), err)
				continue
			}
			summaries = append(summaries, ApplicationSummary{
				ID:                app.ID,
				JobTitle:          app.JobTitle,
				Company:           app.Company,
				ApplicationStatus: app.ApplicationStatus,
			})
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(summaries)

	case http.MethodPost:
		var app Application
		if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		app.ID = uuid.New().String()
		if err := saveApplication(app); err != nil {
			http.Error(w, "Failed to save application: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(app)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// handleApplicationByID handles GET to retrieve a single application and PUT to update it.
func handleApplicationByID(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/applications/")
	if id == "" || id == "applications/" { // Handle case where id is not provided after /api/applications/
		http.Error(w, "Application ID is required", http.StatusBadRequest)
		return
	}
	// Remove trailing slash if present
	id = strings.TrimSuffix(id, "/")

	switch r.Method {
	case http.MethodGet:
		app, err := getApplication(id)
		if err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "Application not found", http.StatusNotFound)
			} else {
				http.Error(w, "Failed to retrieve application: "+err.Error(), http.StatusInternalServerError)
			}
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(app)

	case http.MethodPut:
		var updatedApp Application
		if err := json.NewDecoder(r.Body).Decode(&updatedApp); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		if updatedApp.ID != id {
			http.Error(w, "Application ID in URL and body do not match", http.StatusBadRequest)
			return
		}

		// Check if the application exists before attempting to save
		if _, err := getApplication(id); err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "Application not found for update", http.StatusNotFound)
			} else {
				http.Error(w, "Failed to check existing application: "+err.Error(), http.StatusInternalServerError)
			}
			return
		}

		if err := saveApplication(updatedApp); err != nil {
			http.Error(w, "Failed to update application: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(updatedApp)

	case http.MethodDelete:
		// Verify it exists before delete to return proper status
		if _, err := getApplication(id); err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "Application not found", http.StatusNotFound)
			} else {
				http.Error(w, "Failed to check existing application: "+err.Error(), http.StatusInternalServerError)
			}
			return
		}

		if err := deleteApplication(id); err != nil {
			http.Error(w, "Failed to delete application: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// saveApplication saves an Application struct to a JSON file.
func saveApplication(app Application) error {
	filePath := filepath.Join(applicationsDir, app.ID+".json")
	data, err := json.MarshalIndent(app, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal application: %w", err)
	}
	return ioutil.WriteFile(filePath, data, 0644)
}

// getApplication retrieves an Application struct from a JSON file.
func getApplication(id string) (Application, error) {
	filePath := filepath.Join(applicationsDir, id+".json")
	content, err := ioutil.ReadFile(filePath)
	if err != nil {
		return Application{}, fmt.Errorf("failed to read application file: %w", err)
	}
	var app Application
	if err := json.Unmarshal(content, &app); err != nil {
		return Application{}, fmt.Errorf("failed to unmarshal application: %w", err)
	}
	return app, nil
}

// deleteApplication removes the JSON file for the given application ID.
func deleteApplication(id string) error {
	filePath := filepath.Join(applicationsDir, id+".json")
	if err := os.Remove(filePath); err != nil {
		if os.IsNotExist(err) {
			return err
		}
		return fmt.Errorf("failed to delete application file: %w", err)
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

// generateLatexContent generates the full LaTeX content from ResumeData.
func generateLatexContent(data ResumeData) (string, error) {
	headTemplate, err := readTemplate("resume_head.tex")
	if err != nil {
		return "", err
	}
	objectiveTemplate, err := readTemplate("resume_objective.tex")
	if err != nil {
		return "", err
	}
	educationTemplate, err := readTemplate("resume_education.tex")
	if err != nil {
		return "", err
	}
	jobTemplate, err := readTemplate("resume_job.tex")
	if err != nil {
		return "", err
	}
	projectTemplate, err := readTemplate("resume_project.tex")
	if err != nil {
		return "", err
	}
	projectsTemplate, err := readTemplate("resume_projects.tex")
	if err != nil {
		return "", err
	}
	skillsTemplate, err := readTemplate("resume_skills.tex")
	if err != nil {
		return "", err
	}
	skillCatTemplate, err := readTemplate("resume_skill_cat.tex")
	if err != nil {
		return "", err
	}
	workTemplate, err := readTemplate("resume_work.tex")
	if err != nil {
		return "", err
	}

	// Helper function to replace content within begin/end tags using regex
	replaceContent := func(template, beginTag, endTag, content string) string {
		re := regexp.MustCompile(fmt.Sprintf(`(?s)%s.*?%s`, regexp.QuoteMeta(beginTag), regexp.QuoteMeta(endTag)))
		return re.ReplaceAllString(template, beginTag+content+endTag)
	}

	// Fill Objective
	objectiveSection := replaceContent(objectiveTemplate, "%begin-objective%", "%end-objective%", data.Objective)

	// Fill Education (relevant courses)
	educationSection := replaceContent(educationTemplate, "%begin-relavent-courses%", "%end-relavent-courses%", data.RelevantCourses)

	// Fill Jobs
	jobsContent := ""
	for _, job := range data.Jobs {
		currentJob := jobTemplate
		currentJob = replaceContent(currentJob, "%begin-job-title%", "%end-job-title%", job.JobTitle)
		currentJob = replaceContent(currentJob, "%begin-job-start-date%", "%end-job-start-date%", job.JobStartDate)
		currentJob = replaceContent(currentJob, "%begin-job-end-date%", "%end-job-end-date%", job.JobEndDate)
		currentJob = replaceContent(currentJob, "%begin-job-employer%", "%end-job-employer%", job.JobEmployer)
		currentJob = replaceContent(currentJob, "%begin-job-location%", "%end-job-location%", job.JobLocation)

		points := ""
		for _, point := range job.JobPoints {
			points += fmt.Sprintf("\\resumeItem{%s}\n", point)
		}
		currentJob = replaceContent(currentJob, "%begin-job-points%", "%end-job-points%", points)
		jobsContent += currentJob + "\n"
	}
	workSection := replaceContent(workTemplate, "%begin-work-list%", "%end-work-list%", jobsContent)

	// Fill Projects
	projectsListContent := ""
	for _, project := range data.Projects {
		currentProject := projectTemplate
		currentProject = replaceContent(currentProject, "%begin-project-title%", "%end-project-title%", project.ProjectTitle)
		currentProject = replaceContent(currentProject, "%begin-project-tech%", "%end-project-tech%", project.ProjectTech)
		currentProject = replaceContent(currentProject, "%begin-project-date%", "%end-project-date%", project.ProjectDate)

		points := ""
		for _, point := range project.ProjectPoints {
			points += fmt.Sprintf("\\resumeItem{%s}\n", point)
		}
		currentProject = replaceContent(currentProject, "%begin-project-points%", "%end-project-points%", points)
		projectsListContent += currentProject + "\n"
	}
	projectsSection := replaceContent(projectsTemplate, "%begin-projects-list%", "%end-projects-list%", projectsListContent)

	// Fill Skills
	skillsListContent := ""
	for _, skillCat := range data.SkillCategories {
		currentSkillCat := skillCatTemplate
		currentSkillCat = replaceContent(currentSkillCat, "%begin-cat-title%", "%end-cat-title%", skillCat.CatTitle)
		currentSkillCat = replaceContent(currentSkillCat, "%begin-cat-skills%", "%end-cat-skills%", skillCat.CatSkills)
		skillsListContent += currentSkillCat
	}
	skillsSection := replaceContent(skillsTemplate, "%begin-skills-list%", "%end-skills-list%", skillsListContent)

	// Combine all sections
	finalLatex := headTemplate

	// Better insertion points for sections
	finalLatex = strings.Replace(finalLatex, `\begin{document}`, `\begin{document}`+"\n"+objectiveSection+"\n"+educationSection+"\n"+workSection+"\n"+projectsSection+"\n"+skillsSection, 1)

	// Remove all remaining begin/end comments that might be empty or missed
	re := regexp.MustCompile(`(?s)%begin-.*?%`)
	finalLatex = re.ReplaceAllString(finalLatex, "")
	re = regexp.MustCompile(`(?s)%end-.*?%`)
	finalLatex = re.ReplaceAllString(finalLatex, "")

	return finalLatex, nil
}
