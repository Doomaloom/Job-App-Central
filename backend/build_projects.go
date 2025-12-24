package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/google/go-github/v80/github"
)

type ProjectCard struct {
	Owner     string         `json:"owner,omitempty"`
	Repo      string         `json:"repo,omitempty"`
	FullName  string         `json:"fullName,omitempty"`
	HTMLURL   string         `json:"htmlUrl,omitempty"`
	Title     string         `json:"title"`
	Languages map[string]int `json:"languages,omitempty"`
	Readme    string         `json:"readme,omitempty"`
	Date      string         `json:"date,omitempty"`
	Points    []string       `json:"points,omitempty"`
	AIError   string         `json:"aiError,omitempty"`
}

func newGitHubClient() *github.Client {
	// Unauthenticated client; only public data and subject to low rate limits.
	return github.NewClient(nil)
}

func getReposJson(ctx context.Context, username string, includeAIErrors bool) []ProjectCard {
	username = strings.TrimSpace(username)
	if username == "" {
		return []ProjectCard{}
	}

	ctx, cancel := context.WithTimeout(ctx, 45*time.Second)
	defer cancel()

	client := newGitHubClient()
	cards, err := getPublicRepos(ctx, client, username)
	if err != nil {
		return []ProjectCard{}
	}

	// Best-effort enrichment: keep the repo even if README/languages/AI fail.
	for i := range cards {
		fmt.Println(cards[i].Repo)
		if cards[i].Owner == "" || cards[i].Repo == "" {
			// Keep the card but skip lookups we can't perform.
			continue
		}

		readme, err := getReadme(ctx, client, cards[i].Owner, cards[i].Repo)
		if err == nil && readme != "" {
			cards[i].Readme = readme
		}

		languages, err := getLanguages(ctx, client, cards[i].Owner, cards[i].Repo)
		if err == nil && languages != nil {
			cards[i].Languages = languages
		}

		// make project points with ai
		if points, err := consultAI(ctx, cards[i]); err == nil {
			if len(points) > 0 {
				cards[i].Points = points
			}
		} else {
			log.Printf("consultAI failed for %s/%s: %v", cards[i].Owner, cards[i].Repo, err)
			if includeAIErrors {
				cards[i].AIError = err.Error()
			}
		}
	}

	return cards
}

func getPublicRepos(ctx context.Context, client *github.Client, username string) ([]ProjectCard, error) {
	fmt.Println("getting repos")
	if username == "" {
		return nil, fmt.Errorf("username is required")
	}

	var cards []ProjectCard
	opts := &github.RepositoryListByUserOptions{
		Type:      "public",
		Sort:      "updated",
		Direction: "desc",
		ListOptions: github.ListOptions{
			PerPage: 100,
			Page:    1,
		},
	}

	for {
		repos, resp, err := client.Repositories.ListByUser(ctx, username, opts)
		if err != nil {
			return nil, err
		}
		for _, repo := range repos {
			if repo == nil {
				continue
			}
			owner := ""
			if repo.Owner != nil {
				owner = repo.Owner.GetLogin()
			}
			name := repo.GetName()
			title := repo.GetName()
			if title == "" {
				title = repo.GetFullName()
			}
			if title == "" {
				continue
			}
			cards = append(cards, ProjectCard{
				Owner:    owner,
				Repo:     name,
				FullName: repo.GetFullName(),
				HTMLURL:  repo.GetHTMLURL(),
				Title:    title,
			})
		}
		if resp == nil || resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}

	return cards, nil
}

func getReadme(ctx context.Context, client *github.Client, owner, repo string) (string, error) {
	content, _, err := client.Repositories.GetReadme(ctx, owner, repo, nil)
	if err != nil {
		return "", err
	}
	if content == nil {
		return "", fmt.Errorf("readme not found")
	}
	text, err := content.GetContent()
	if err != nil {
		return "", err
	}
	return text, nil
}

func getLanguages(ctx context.Context, client *github.Client, owner, repo string) (map[string]int, error) {
	langs, _, err := client.Repositories.ListLanguages(ctx, owner, repo)
	if err != nil {
		return nil, err
	}
	if langs == nil {
		langs = map[string]int{}
	}
	return langs, nil
}

func getTreePaths(ctx context.Context, client *github.Client, owner, repo, branch string) ([]string, error) {
	if branch == "" {
		branch = "main"
	}

	ghBranch, _, err := client.Repositories.GetBranch(ctx, owner, repo, branch, 1)
	if err != nil {
		return nil, err
	}

	treeSHA := ""
	if ghBranch != nil &&
		ghBranch.Commit != nil &&
		ghBranch.Commit.Commit != nil &&
		ghBranch.Commit.Commit.Tree != nil {
		treeSHA = ghBranch.Commit.Commit.Tree.GetSHA()
	}
	if treeSHA == "" {
		return nil, fmt.Errorf("could not resolve tree sha for %s/%s branch %q", owner, repo, branch)
	}

	tree, _, err := client.Git.GetTree(ctx, owner, repo, treeSHA, true)
	if err != nil {
		return nil, err
	}
	if tree == nil {
		return nil, fmt.Errorf("tree not found for %s/%s", owner, repo)
	}

	paths := make([]string, 0, len(tree.Entries))
	for _, entry := range tree.Entries {
		if entry == nil {
			continue
		}
		// Only include files; skip subtrees and submodules.
		if entry.GetType() != "blob" {
			continue
		}
		p := entry.GetPath()
		if p == "" {
			continue
		}
		paths = append(paths, p)
	}
	sort.Strings(paths)
	return paths, nil
}

type geminiGenerateContentRequest struct {
	Contents          []geminiContent        `json:"contents"`
	GenerationConfig  geminiGenerationConfig `json:"generationConfig,omitempty"`
	SafetySettings    []geminiSafetySetting  `json:"safetySettings,omitempty"`
	SystemInstruction *geminiContent         `json:"systemInstruction,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text,omitempty"`
}

type geminiGenerationConfig struct {
	Temperature      float64 `json:"temperature,omitempty"`
	MaxOutputTokens  int     `json:"maxOutputTokens,omitempty"`
	ResponseMimeType string  `json:"responseMimeType,omitempty"`
}

type geminiSafetySetting struct {
	Category  string `json:"category"`
	Threshold string `json:"threshold"`
}

type geminiGenerateContentResponse struct {
	PromptFeedback *struct {
		BlockReason string `json:"blockReason"`
	} `json:"promptFeedback,omitempty"`
	Candidates []struct {
		FinishReason string `json:"finishReason"`
		Content      struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func consultAI(ctx context.Context, project ProjectCard) ([]string, error) {
	apiKey := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY not set")
	}
	model := strings.TrimSpace(os.Getenv("GEMINI_MODEL"))
	if model == "" {
		model = "gemini-2.5-flash"
	}

	prompt := buildProjectPointsPrompt(project)

	reqBody := geminiGenerateContentRequest{
		Contents: []geminiContent{
			{
				Role: "user",
				Parts: []geminiPart{
					{Text: prompt},
				},
			},
		},
		GenerationConfig: geminiGenerationConfig{
			Temperature:      0.2,
			MaxOutputTokens:  2000,
			ResponseMimeType: "text/plain",
		},
		// Keep this permissive for dev; we already constrain output format in the prompt.
		SafetySettings: []geminiSafetySetting{
			{Category: "HARM_CATEGORY_HARASSMENT", Threshold: "BLOCK_ONLY_HIGH"},
			{Category: "HARM_CATEGORY_HATE_SPEECH", Threshold: "BLOCK_ONLY_HIGH"},
			{Category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", Threshold: "BLOCK_ONLY_HIGH"},
			{Category: "HARM_CATEGORY_DANGEROUS_CONTENT", Threshold: "BLOCK_ONLY_HIGH"},
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal gemini request: %w", err)
	}

	endpoint := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		url.PathEscape(model),
		url.QueryEscape(apiKey),
	)
	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("failed to create gemini request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gemini request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read gemini response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("gemini error (%d): %s", resp.StatusCode, strings.TrimSpace(string(respBody)))
	}

	var parsed geminiGenerateContentResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("failed to decode gemini response: %w", err)
	}

	if len(parsed.Candidates) == 0 {
		block := ""
		if parsed.PromptFeedback != nil {
			block = parsed.PromptFeedback.BlockReason
		}
		if block != "" {
			return nil, fmt.Errorf("gemini returned no candidates (blockReason=%s)", block)
		}
		return nil, fmt.Errorf("gemini returned no candidates")
	}

	var parts []string
	for _, part := range parsed.Candidates[0].Content.Parts {
		if t := strings.TrimSpace(part.Text); t != "" {
			parts = append(parts, t)
		}
	}
	text := strings.TrimSpace(strings.Join(parts, "\n"))
	if text == "" {
		if parsed.Candidates[0].FinishReason != "" {
			return nil, fmt.Errorf("empty gemini response (finishReason=%s)", parsed.Candidates[0].FinishReason)
		}
		return nil, fmt.Errorf("empty gemini response")
	}

	points, err := parsePipeSeparatedPoints(text)
	if err != nil {
		// Backwards-compatible fallback (in case the model returns JSON anyway).
		if jsonPoints, jsonErr := parseJSONStringArray(text); jsonErr == nil && len(jsonPoints) > 0 {
			return jsonPoints, nil
		}

		finish := parsed.Candidates[0].FinishReason
		if finish != "" {
			return nil, fmt.Errorf("%w (finishReason=%s); raw=%q", err, finish, truncateString(text, 300))
		}
		return nil, fmt.Errorf("%w; raw=%q", err, truncateString(text, 300))
	}
	return points, nil
}

func buildProjectPointsPrompt(project ProjectCard) string {
	readme := strings.TrimSpace(project.Readme)
	readme = truncateString(readme, 2000)

	langs := make([]string, 0, len(project.Languages))
	for k := range project.Languages {
		langs = append(langs, k)
	}
	sort.Strings(langs)

	return fmt.Sprintf(
		`You are helping generate neutral, general project description points for a resume.

Return 1-5 detailed points separated by a single " | " character (one line, no bullets).
Example: "Built X ... | Implemented Y ... | Designed Z ... | Deployed ..."
Each point should be general and descriptive about what the project does and skills it demonstrates.
Do NOT include metrics, numbers, or claims you cannot infer. Do NOT mention "README" or "GitHub".

Repo title: %q
Full name: %q
Languages: %s

README (truncated):
%s`,
		project.Title,
		project.FullName,
		strings.Join(langs, ", "),
		readme,
	)
}

func truncateString(s string, max int) string {
	if max <= 0 || len(s) <= max {
		return s
	}
	return s[:max]
}

func parsePipeSeparatedPoints(text string) ([]string, error) {
	trimmed := strings.TrimSpace(text)
	if trimmed == "" {
		return nil, fmt.Errorf("empty response")
	}
	// Drop markdown code fences if present.
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
	if len(out) == 0 {
		return nil, fmt.Errorf("no points parsed")
	}
	return out, nil
}

func parseJSONStringArray(text string) ([]string, error) {
	trimmed := strings.TrimSpace(text)

	// Gemini sometimes wraps JSON in markdown fences; try to extract the first [...] block.
	start := strings.Index(trimmed, "[")
	end := strings.LastIndex(trimmed, "]")
	if start == -1 {
		return nil, fmt.Errorf("expected JSON array, got: %q", truncateString(trimmed, 200))
	}
	if end == -1 || end <= start {
		return nil, fmt.Errorf("incomplete JSON array, got: %q", truncateString(trimmed, 200))
	}
	if end <= start {
		return nil, fmt.Errorf("expected JSON array, got: %q", truncateString(trimmed, 200))
	}

	raw := trimmed[start : end+1]
	var points []string
	if err := json.Unmarshal([]byte(raw), &points); err != nil {
		return nil, fmt.Errorf("failed to parse points JSON: %w", err)
	}

	// Basic sanitation.
	out := points[:0]
	for _, p := range points {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		out = append(out, p)
	}
	return out, nil
}
