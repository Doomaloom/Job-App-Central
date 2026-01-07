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
func optimizeResumeWithAI(parentCtx context.Context, apiKey string, req optimizeRequest) (ResumeData, error) {
	userResume, _ := json.Marshal(req.Resume)
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3-pro-preview"
	}

	systemPrompt := `
	You are a senior technical recruiter and ATS optimization specialist.

	Your task is to optimize the provided resume for the specified job title, company, and job description while preserving truthfulness.

	PRIMARY OBJECTIVES:
	- Maximize alignment with the job description
	- Improve clarity, impact, and keyword relevance
	- Optimize bullet points for ATS and human reviewers
	- Emphasize the most relevant experience and projects first

	STRICT RULES (DO NOT VIOLATE):
	- DO NOT fabricate experience, companies, technologies, metrics, or outcomes
	- DO NOT add skills that are not explicitly present or clearly implied
	- DO NOT add dates or employers if missing
	- DO NOT remove existing JSON fields or change the schema
	- DO NOT include explanations, markdown, or commentary
	- Output MUST be valid JSON only

	ALLOWED TRANSFORMATIONS:
	- Rephrase bullet points for clarity, impact, and action orientation
	- Reorder bullet points within jobs/projects to prioritize relevance
	- Reorder projects and jobs based on relevance to the job description
	- Refine the objective to match the role and company
	- Consolidate or split bullet points ONLY if meaning is preserved
	- Normalize wording to match terminology used in the job description

	BULLET POINT GUIDELINES:
	- Start bullets with strong action verbs
	- Focus on what was built, improved, or delivered
	- Emphasize technical depth, ownership, and problem-solving
	- Avoid vague phrases (e.g., "worked on", "helped with")
	- Do not repeat the same skill redundantly across bullets

	WORK EXPERIENCE SPECIFIC POINT GUIDELINES:
	- Quantify impact with metrics where possible
	- Highlight collaboration with cross-functional teams
	- If a role is not exactly relevant, focus on transferable skills and achievements. Try to connect the experience to the role as much as possible.
	- Keep to at most 2-3 bullets per role if not highly relevant

	PROJECT SPECIFIC POINT GUIDELINES:
	- Emphasize technologies used and problems solved
	- Highlight unique features, challenges, or innovations
	- Focus on end-user impact and real-world applications
	- Keep to at most 3-4 bullets per project

	ATS OPTIMIZATION:
	- Use keywords and phrasing from the job description where truthful
	- Prefer concrete nouns over buzzwords
	- Ensure skills appear in both context (bullets) and skill categories when applicable

	STRUCTURAL PRIORITY:
	1) Most relevant projects and roles first
	2) Strongest bullets at the top of each section
	3) Skills grouped logically and concisely

	RESUME (JSON — DO NOT CHANGE SCHEMA):
	<<<
	{ 
	  "name": string,
	  "number": string,
	  "email": string,
	  "linkedin": string,
	  "github": string,
	  "objective": string,
	  "relevantCourses": [string],
	  "jobs": [
		{
		  "jobTitle": string,
		  "jobStartDate": string,
		  "jobEndDate": string,
		  "jobEmployer": string,
		  "jobLocation": string,
		  "jobPoints": [string]
		}
	  ],
	  "projects": [
		{
		  "projectTitle": string,
		  "projectTech": string,
		  "projectDate": string,
		  "projectPoints": [string]
		}
	  ],
	  "skillCategories": [
		{
		  "catTitle": string,
		  "catSkills": [string]
		}
	  ]
	}
	>>>

	OUTPUT:
	Return ONLY the optimized resume as valid JSON matching the exact ResumeData schema.`

	userPrompt := fmt.Sprintf("Job Title: %s\nCompany: %s\nJob Description:\n%s\n\nCurrent Resume JSON:\n%s",
		req.JobTitle, req.Company, req.JobDescription, string(userResume))

	// Gemini can take a while; allow longer than the default HTTP client timeout.
	ctx, cancel := context.WithTimeout(parentCtx, 120*time.Second)
	defer cancel()

	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: apiKey})
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

func optimizeCoverLetterWithAI(parentCtx context.Context, apiKey string, req optimizeCoverLetterRequest) (CoverLetter, error) {
	model := os.Getenv("GEMINI_MODEL")
	if model == "" {
		model = "gemini-3-pro-preview"
	}

	resumeJSON, _ := json.Marshal(req.Resume)
	coverJSON, _ := json.Marshal(req.CoverLetter)

	systemPrompt := `
	You are an expert career coach and professional technical recruiter.

	Your task is to write a tailored, high-impact cover letter based on:
	1) the provided job description
	2) the candidate profile and resume information

	GOALS:
	- The letter must be concise, specific, and non-generic
	- It must clearly map the candidate’s experience and projects to the job requirements
	- It must sound confident but not arrogant
	- It must avoid buzzword stuffing and vague claims
	- It must be ATS-friendly and readable by a human recruiter

	STRUCTURE REQUIREMENTS:
	- 3–4 short paragraphs total
	- Paragraph 1: Strong hook + role + company motivation
	- Paragraph 2: Most relevant technical experience/projects mapped directly to job requirements
	- Paragraph 3: Collaboration, learning mindset, and real-world impact
	- Optional Paragraph 4: Brief closing with enthusiasm and call to action

	STYLE REQUIREMENTS:
	- Professional, modern, and clear
	- No clichés (e.g., "passionate", "hardworking", "fast learner")
	- No restating of resume bullet points verbatim
	- Focus on outcomes, impact, and skills in context

	CONSTRAINTS:
	- Do NOT invent experience or skills
	- If something is missing, reframe transferable skills instead
	- Keep length under 1 page (~250–350 words)

	OUTPUT:
	cover letter body paragraphs separated by a single " | " delimiter on one line.
	Do not include any extra text before/after the paragraphs.`

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

	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: apiKey})
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
