package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

const applicationsDir = "applications"

// StringList supports either a JSON array of strings or a comma-separated string.
type StringList []string

func (s *StringList) UnmarshalJSON(b []byte) error {
	// Try array first
	var arr []string
	if err := json.Unmarshal(b, &arr); err == nil {
		*s = filterAndTrim(arr)
		return nil
	}
	// Fallback to single string (comma-separated)
	var str string
	if err := json.Unmarshal(b, &str); err == nil {
		if strings.TrimSpace(str) == "" {
			*s = []string{}
			return nil
		}
		parts := strings.Split(str, ",")
		*s = filterAndTrim(parts)
		return nil
	}
	return fmt.Errorf("expected array or string for string list")
}

func filterAndTrim(items []string) []string {
	out := make([]string, 0, len(items))
	for _, v := range items {
		if t := strings.TrimSpace(v); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// ResumeData represents the overall structure of the resume data.
type ResumeData struct {
	Name            string          `json:"name"`
	Phone           string          `json:"number"`
	Email           string          `json:"email"`
	LinkedIn        string          `json:"linkedin"`
	Github          string          `json:"github"`
	Objective       string          `json:"objective"`
	RelevantCourses StringList      `json:"relevantCourses"`
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
	JobPoints    StringList `json:"jobPoints"`
}

// Project represents a single project entry in the resume.
type Project struct {
	ProjectTitle  string   `json:"projectTitle"`
	ProjectTech   string   `json:"projectTech"`
	ProjectDate   string   `json:"projectDate"`
	ProjectPoints StringList `json:"projectPoints"`
}

// SkillCategory represents a category of skills.
type SkillCategory struct {
	CatTitle  string   `json:"catTitle"`
	CatSkills StringList `json:"catSkills"`
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

// optimizeRequest is the payload for resume optimization.
type optimizeRequest struct {
	JobTitle       string     `json:"jobTitle"`
	Company        string     `json:"company"`
	JobDescription string     `json:"jobDescription"`
	Resume         ResumeData `json:"resume"`
}

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
	http.HandleFunc("/api/optimize-resume", handleOptimizeResume)

	fmt.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
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

// handleOptimizeResume calls OpenAI to optimize the resume based on job details.
func handleOptimizeResume(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		http.Error(w, "OPENAI_API_KEY not set on server", http.StatusInternalServerError)
		return
	}

	var req optimizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	optimized, err := optimizeResumeWithAI(apiKey, req)
	if err != nil {
		http.Error(w, "Failed to optimize resume: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(optimized)
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

func normalizeOptimizedResume(res ResumeData, fallback ResumeData) ResumeData {
	if res.RelevantCourses == nil {
		res.RelevantCourses = []string{}
	}
	if res.Jobs == nil {
		res.Jobs = []Job{}
	}
	if res.Projects == nil {
		res.Projects = []Project{}
	}
	if res.SkillCategories == nil {
		res.SkillCategories = []SkillCategory{}
	}
	// Header defaults
	if res.Name == "" {
		res.Name = fallback.Name
	}
	if res.Phone == "" {
		res.Phone = fallback.Phone
	}
	if res.Email == "" {
		res.Email = fallback.Email
	}
	if res.LinkedIn == "" {
		res.LinkedIn = fallback.LinkedIn
	}
	if res.Github == "" {
		res.Github = fallback.Github
	}
	for i := range res.Jobs {
		if res.Jobs[i].JobPoints == nil {
			res.Jobs[i].JobPoints = []string{}
		}
	}
	for i := range res.Projects {
		if res.Projects[i].ProjectPoints == nil {
			res.Projects[i].ProjectPoints = []string{}
		}
	}
	for i := range res.SkillCategories {
		if res.SkillCategories[i].CatSkills == nil {
			res.SkillCategories[i].CatSkills = []string{}
		}
	}
	return res
}

// optimizeResumeWithAI calls OpenAI Chat Completions to improve the resume content.
func optimizeResumeWithAI(apiKey string, req optimizeRequest) (ResumeData, error) {
	type message struct {
		Role    string `json:"role"`
		Content string `json:"content"`
	}
	type payload struct {
		Model       string    `json:"model"`
		Messages    []message `json:"messages"`
		Temperature float32   `json:"temperature"`
	}

	userResume, _ := json.Marshal(req.Resume)
	model := os.Getenv("OPENAI_MODEL")
	if model == "" {
		model = "gpt-5-mini"
	}
	systemPrompt := `You are an expert resume writer. Improve the provided resume for the given job title, company, and description.
Rules:
- Do not fabricate experience, companies, or technologies not present in the provided resume.
-, only rephrase and reorganize to align with the job.
- Keep all JSON fields present, using the same schema as the provided "resume" field.
- Respond with ONLY JSON (no markdown) that matches ResumeData: {"name": string,"number": string,"email": string,"linkedin": string,"github": string,"objective": string,"relevantCourses": [string],"jobs":[{"jobTitle": string,"jobStartDate": string,"jobEndDate": string,"jobEmployer": string,"jobLocation": string,"jobPoints": [string]}],"projects":[{"projectTitle": string,"projectTech": string,"projectDate": string,"projectPoints": [string]}],"skillCategories":[{"catTitle": string,"catSkills": [string]}]}.
- Preserve truthful chronology; do not add dates if missing; do not claim achievements not implied by the text.`

	userPrompt := fmt.Sprintf("Job Title: %s\nCompany: %s\nJob Description:\n%s\n\nCurrent Resume JSON:\n%s",
		req.JobTitle, req.Company, req.JobDescription, string(userResume))

	reqBody := payload{
		Model: model,
		Messages: []message{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		Temperature: 0.3,
	}

	bodyBytes, _ := json.Marshal(reqBody)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	request, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(bodyBytes))
	if err != nil {
		return ResumeData{}, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 35 * time.Second}
	resp, err := client.Do(request)
	if err != nil {
		return ResumeData{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		content, _ := ioutil.ReadAll(resp.Body)
		return ResumeData{}, fmt.Errorf("openai error: %s", string(content))
	}

	var apiResp struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return ResumeData{}, fmt.Errorf("failed to decode openai response: %w", err)
	}
	if len(apiResp.Choices) == 0 {
		return ResumeData{}, fmt.Errorf("no choices returned from openai")
	}

	content := strings.TrimSpace(apiResp.Choices[0].Message.Content)
	var optimized ResumeData
	if err := json.Unmarshal([]byte(content), &optimized); err != nil {
		return ResumeData{}, fmt.Errorf("failed to parse optimized resume json: %w", err)
	}
	normalized := normalizeOptimizedResume(optimized, req.Resume)
	return normalized, nil
}
