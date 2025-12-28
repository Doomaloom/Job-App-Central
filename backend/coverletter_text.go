package main

import (
	"strings"
)

func coverLetterToText(cl CoverLetter) string {
	lines := []string{
		strings.TrimSpace(cl.HiringManagerName),
		strings.TrimSpace(cl.Company),
		strings.TrimSpace(cl.Location),
		strings.TrimSpace(cl.Greeting),
		"",
	}

	body := strings.TrimSpace(strings.Join(cl.Paragraphs, "\n\n"))
	if body != "" {
		lines = append(lines, body)
	}

	lines = append(lines, "", "---")

	closing := strings.TrimSpace(cl.Closing)
	if closing != "" {
		lines = append(lines, closing)
	}

	return strings.TrimSpace(strings.Join(lines, "\n")) + "\n"
}
