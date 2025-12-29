package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

func geminiAPIKeyOptional(r *http.Request) string {
	if r == nil {
		return strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	}
	if key := strings.TrimSpace(r.Header.Get("X-Gemini-Api-Key")); key != "" {
		return key
	}
	return strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
}

func geminiAPIKeyRequired(r *http.Request) (string, error) {
	key := geminiAPIKeyOptional(r)
	if key == "" {
		return "", fmt.Errorf("missing Gemini API key (set GEMINI_API_KEY on the server or send X-Gemini-Api-Key)")
	}
	return key, nil
}

