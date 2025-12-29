package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

var (
	store    *dbStore
	verifier *jwtVerifier
)

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

type CoverLetter struct {
	HiringManagerName string   `json:"hiringManagerName,omitempty"`
	Company           string   `json:"company,omitempty"`
	Location          string   `json:"location,omitempty"`
	Address           string   `json:"address,omitempty"`
	Greeting          string   `json:"greeting"`
	Paragraphs        []string `json:"paragraphs"`
	Closing           string   `json:"closing"`
}

// Job represents a single job entry in the resume.
type Job struct {
	JobTitle     string     `json:"jobTitle"`
	JobStartDate string     `json:"jobStartDate"`
	JobEndDate   string     `json:"jobEndDate"`
	JobEmployer  string     `json:"jobEmployer"`
	JobLocation  string     `json:"jobLocation"`
	JobPoints    StringList `json:"jobPoints"`
}

// Project represents a single project entry in the resume.
type Project struct {
	ProjectTitle  string     `json:"projectTitle"`
	ProjectTech   string     `json:"projectTech"`
	ProjectDate   string     `json:"projectDate"`
	ProjectPoints StringList `json:"projectPoints"`
}

// SkillCategory represents a category of skills.
type SkillCategory struct {
	CatTitle  string     `json:"catTitle"`
	CatSkills StringList `json:"catSkills"`
}

// Application represents a full job application, including resume data.
type Application struct {
	ID                string       `json:"id"`
	JobTitle          string       `json:"jobTitle"`
	Company           string       `json:"company"`
	ApplicationStatus string       `json:"applicationStatus"`
	JobDescription    string       `json:"jobDescription"`
	Resume            ResumeData   `json:"resume"`
	CoverLetter       *CoverLetter `json:"coverLetter,omitempty"`
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

type optimizeCoverLetterRequest struct {
	JobTitle       string       `json:"jobTitle"`
	Company        string       `json:"company"`
	JobDescription string       `json:"jobDescription"`
	Resume         ResumeData   `json:"resume"`
	CoverLetter    *CoverLetter `json:"coverLetter"`
}

func main() {
	var err error
	verifier, err = newJWTVerifierFromEnv()
	if err != nil {
		log.Fatal(err)
	}

	store, err = newDBStore(context.Background())
	if err != nil {
		log.Fatal(err)
	}
	defer store.Close()

	mux := http.NewServeMux()

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Welcome to the Job Application Backend!")
	})

	mux.HandleFunc("/api/profile", requireAuth(verifier, handleProfile))
	mux.HandleFunc("/api/generate-pdf", requireAuth(verifier, handleGeneratePDF))
	mux.HandleFunc("/api/applications", requireAuth(verifier, handleApplications))
	mux.HandleFunc("/api/applications/", requireAuth(verifier, handleApplicationByID)) // For GET, PUT, DELETE by ID
	mux.HandleFunc("/api/optimize-resume", requireAuth(verifier, handleOptimizeResume))
	mux.HandleFunc("/api/optimize-coverletter", requireAuth(verifier, handleOptimizeCoverLetter))
	mux.HandleFunc("/api/github-projects", requireAuth(verifier, handleGithubProjects))

	fmt.Println("Server starting on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

// handleOptimizeResume calls OpenAI to optimize the resume based on job details.
func handleOptimizeResume(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	apiKey, err := geminiAPIKeyRequired(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var req optimizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	optimized, err := optimizeResumeWithAI(r.Context(), apiKey, req)
	if err != nil {
		http.Error(w, "Failed to optimize resume: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(optimized)
}

func handleOptimizeCoverLetter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Only POST method is allowed", http.StatusMethodNotAllowed)
		return
	}

	apiKey, err := geminiAPIKeyRequired(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var req optimizeCoverLetterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	optimized, err := optimizeCoverLetterWithAI(r.Context(), apiKey, req)
	if err != nil {
		http.Error(w, "Failed to optimize cover letter: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Return body paragraphs only, separated by `|`.
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write([]byte(strings.Join(optimized.Paragraphs, " | ") + "\n"))
}

func handleGithubProjects(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Only GET method is allowed", http.StatusMethodNotAllowed)
		return
	}

	username := strings.TrimSpace(r.URL.Query().Get("username"))
	if username == "" {
		http.Error(w, "username query param is required", http.StatusBadRequest)
		return
	}

	apiKey := geminiAPIKeyOptional(r)
	includeAIErrors := r.URL.Query().Get("debugAI") == "1"
	cards := getReposJson(r.Context(), apiKey, username, includeAIErrors)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(cards)
}

// handleApplications handles GET to list all applications and POST to create a new application.
func handleApplications(w http.ResponseWriter, r *http.Request) {
	userID, err := userIDFromRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		summaries, err := store.ListApplicationSummaries(r.Context(), userID)
		if err != nil {
			http.Error(w, "Failed to list applications: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(summaries)

	case http.MethodPost:
		var app Application
		if err := json.NewDecoder(r.Body).Decode(&app); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		created, err := store.CreateApplication(r.Context(), userID, app)
		if err != nil {
			http.Error(w, "Failed to create application: "+err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(created)

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

	userID, err := userIDFromRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	switch r.Method {
	case http.MethodGet:
		app, err := store.GetApplication(r.Context(), userID, id)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) || errors.Is(err, errNotFound) {
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

		saved, err := store.UpdateApplication(r.Context(), userID, updatedApp)
		if err != nil {
			if errors.Is(err, errNotFound) || errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, "Application not found for update", http.StatusNotFound)
				return
			}
			http.Error(w, "Failed to update application: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(saved)

	case http.MethodDelete:
		if err := store.DeleteApplication(r.Context(), userID, id); err != nil {
			if errors.Is(err, errNotFound) || errors.Is(err, pgx.ErrNoRows) {
				http.Error(w, "Application not found", http.StatusNotFound)
				return
			}
			http.Error(w, "Failed to delete application: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
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

// optimizeResumeWithAI moved to optimize_ai.go
