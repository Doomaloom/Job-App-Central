package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"google.golang.org/genai"
)

// optimizeResumeWithAI calls Google Gemini to improve the resume content.
func optimizeResumeWithAI(parentCtx context.Context, req optimizeRequest) (ResumeData, error) {
	userResume, _ := json.Marshal(req.Resume)
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3-pro-preview"
	}

	systemPrompt := `You are an expert resume writer. Improve the provided resume for the given job title, company, and description.
Rules:
- Do not fabricate experience, companies, or technologies not present in the provided resume.
- Only rephrase and reorganize to align with the job.
- Keep all JSON fields present, using the same schema as the provided "resume" field.
- Respond with ONLY JSON (no markdown) that matches ResumeData: {"name": string,"number": string,"email": string,"linkedin": string,"github": string,"objective": string,"relevantCourses": [string],"jobs":[{"jobTitle": string,"jobStartDate": string,"jobEndDate": string,"jobEmployer": string,"jobLocation": string,"jobPoints": [string]}],"projects":[{"projectTitle": string,"projectTech": string,"projectDate": string,"projectPoints": [string]}],"skillCategories":[{"catTitle": string,"catSkills": [string]}]}.
- Preserve truthful chronology; do not add dates if missing; do not claim achievements not implied by the text.`

	userPrompt := fmt.Sprintf("Job Title: %s\nCompany: %s\nJob Description:\n%s\n\nCurrent Resume JSON:\n%s",
		req.JobTitle, req.Company, req.JobDescription, string(userResume))

	// Gemini can take a while; allow longer than the default HTTP client timeout.
	ctx, cancel := context.WithTimeout(parentCtx, 120*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		return ResumeData{}, fmt.Errorf("failed to create gemini client: %w", err)
	}

	prompt := systemPrompt + "\n\n" + userPrompt
	result, err := client.Models.GenerateContent(
		ctx,
		model,
		genai.Text(prompt),
		&genai.GenerateContentConfig{
			Temperature:      genai.Ptr[float32](0.3),
			MaxOutputTokens:  int32(4096),
			ResponseMIMEType: "application/json",
		},
	)
	if err != nil {
		return ResumeData{}, fmt.Errorf("gemini generateContent failed: %w", err)
	}

	content := strings.TrimSpace(result.Text())
	if content == "" {
		return ResumeData{}, fmt.Errorf("empty gemini response")
	}

	content = extractJSONObject(content)
	if strings.TrimSpace(content) == "" {
		return ResumeData{}, fmt.Errorf("gemini did not return a JSON object")
	}

	var optimized ResumeData
	if err := json.Unmarshal([]byte(content), &optimized); err != nil {
		return ResumeData{}, fmt.Errorf("failed to parse optimized resume json: %w", err)
	}
	normalized := normalizeOptimizedResume(optimized, req.Resume)
	return normalized, nil
}

func optimizeCoverLetterWithAI(parentCtx context.Context, req optimizeCoverLetterRequest) (CoverLetter, error) {
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3-pro-preview"
	}

	resumeJSON, _ := json.Marshal(req.Resume)
	coverJSON, _ := json.Marshal(req.CoverLetter)

	systemPrompt := `You are an expert resume + cover letter writer.
Generate ONLY the cover letter body paragraphs (no address, no greeting, no closing).
Rules:
- Use ONLY the provided resume/profile JSON and job details; do not fabricate experience or technologies.
- Prefer general, credible statements; avoid metrics unless present in the resume JSON.
- Output MUST be plain text (no markdown, no bullets).
- Output format: 3-4 cover letter body paragraphs separated by a single " | " delimiter on one line.
- Do not include any extra text before/after the paragraphs.`

	userPrompt := fmt.Sprintf(
		"Job Title: %s\nCompany: %s\nJob Description:\n%s\n\nResume JSON:\n%s\n\nExisting CoverLetter JSON (may be empty):\n%s\n\nReturn only body paragraphs separated by ' | '.",
		req.JobTitle,
		req.Company,
		req.JobDescription,
		string(resumeJSON),
		string(coverJSON),
	)

	ctx, cancel := context.WithTimeout(parentCtx, 120*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, nil)
	if err != nil {
		return CoverLetter{}, fmt.Errorf("failed to create gemini client: %w", err)
	}

	prompt := systemPrompt + "\n\n" + userPrompt
	result, err := client.Models.GenerateContent(
		ctx,
		model,
		genai.Text(prompt),
		&genai.GenerateContentConfig{
			Temperature:      genai.Ptr[float32](0.3),
			MaxOutputTokens:  int32(2048),
			ResponseMIMEType: "text/plain",
		},
	)
	if err != nil {
		return CoverLetter{}, fmt.Errorf("gemini generateContent failed: %w", err)
	}

	content := strings.TrimSpace(result.Text())
	if content == "" {
		return CoverLetter{}, fmt.Errorf("empty gemini response")
	}

	paragraphs := parsePipeSeparatedParagraphs(content)
	if len(paragraphs) == 0 {
		return CoverLetter{}, fmt.Errorf("no paragraphs returned")
	}

	optimized := CoverLetter{
		Paragraphs: paragraphs,
	}
	return normalizeOptimizedCoverLetter(optimized, req.CoverLetter), nil
}

func extractJSONObject(text string) string {
	trimmed := strings.TrimSpace(text)
	start := strings.Index(trimmed, "{")
	end := strings.LastIndex(trimmed, "}")
	if start == -1 || end == -1 || end <= start {
		return ""
	}
	return trimmed[start : end+1]
}

func normalizeOptimizedCoverLetter(cl CoverLetter, fallback *CoverLetter) CoverLetter {
	if strings.TrimSpace(cl.Greeting) == "" {
		cl.Greeting = "Dear Hiring Manager,"
	}
	if cl.Paragraphs == nil {
		cl.Paragraphs = []string{}
	}
	if strings.TrimSpace(cl.Closing) == "" {
		cl.Closing = "Sincerely,"
	}

	// Keep user-entered recipient fields if model didn't provide them.
	if fallback != nil {
		if strings.TrimSpace(cl.HiringManagerName) == "" {
			cl.HiringManagerName = fallback.HiringManagerName
		}
		if strings.TrimSpace(cl.Company) == "" {
			cl.Company = fallback.Company
		}
		if strings.TrimSpace(cl.Location) == "" {
			cl.Location = fallback.Location
		}
		if strings.TrimSpace(cl.Address) == "" {
			cl.Address = fallback.Address
		}
	}
	return cl
}

func parsePipeSeparatedParagraphs(text string) []string {
	trimmed := strings.TrimSpace(text)
	trimmed = strings.TrimPrefix(trimmed, "```")
	trimmed = strings.TrimSuffix(trimmed, "```")
	trimmed = strings.TrimSpace(trimmed)

	parts := strings.Split(trimmed, "|")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		p := strings.TrimSpace(part)
		p = strings.Trim(p, `"'`)
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		out = append(out, p)
	}
	return out
}
