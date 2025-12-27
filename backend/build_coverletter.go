package main

import (
	"fmt"
	"strings"
	"time"
)

// Placeholder for future cover letter PDF generation helpers.
// This file is intentionally minimal so it doesn't affect the build until implemented.

func generateCoverLetterLatex(resume ResumeData, cl *CoverLetter) string {

	// intended layout of cover letter:
	// 1. CoverLetterHead
	// 2. ApplicantHeader
	// 3. Greeting
	// 4. Paragraphs
	// 5. Closing

	if cl == nil {
		return ""
	}

	var out strings.Builder
	out.WriteString(generateCoverLetterHead())
	out.WriteString(generateCoverLetterApplicantHeader(resume))
	out.WriteString(generateCoverLetterAdress(cl))
	out.WriteString(generateCoverLetterGreeting(cl))
	out.WriteString(generateCoverLetterParagraphs(cl))
	out.WriteString(generateCoverLetterClosing(cl))
	return out.String()
}

func generateCoverLetterHead() string {
	head, err := readTemplate("coverletter_head.tex")
	if err != nil {
		return ""
	}
	return head
}

func generateCoverLetterApplicantHeader(resume ResumeData) string {
	header, err := generateApplicantHeader(resume)
	if err != nil {
		return ""
	}
	// Add separation between header block and recipient block.
	return header + "\n\\vspace{18pt}\n"
}

func generateCoverLetterAdress(cl *CoverLetter) string {
	if cl == nil {
		return ""
	}

	manager := strings.TrimSpace(cl.HiringManagerName)
	company := strings.TrimSpace(cl.Company)
	location := strings.TrimSpace(cl.Location)

	lines := make([]string, 0, 4)
	lines = append(lines, fmt.Sprintf("\\noindent %s\\\\", time.Now().Format("January 2, 2006")))
	if manager != "" {
		lines = append(lines, fmt.Sprintf("%s\\\\", esc(manager)))
	}
	if company != "" {
		lines = append(lines, fmt.Sprintf("%s\\\\", esc(company)))
	}
	if location != "" {
		lines = append(lines, fmt.Sprintf("%s\\\\", esc(location)))
	}

	return "\n" + strings.Join(lines, "\n") + "\n \\vspace{40pt}\n"
}

func generateCoverLetterGreeting(cl *CoverLetter) string {
	if cl == nil {
		return ""
	}

	greeting := strings.TrimSpace(cl.Greeting)
	if greeting == "" {
		if strings.TrimSpace(cl.HiringManagerName) != "" {
			greeting = fmt.Sprintf("Dear %s,", strings.TrimSpace(cl.HiringManagerName))
		} else {
			greeting = "Dear Hiring Manager,"
		}
	}

	return fmt.Sprintf("\\noindent %s\n \\\\ \\vspace{20pt}\n", esc(greeting))
}

func generateCoverLetterParagraphs(cl *CoverLetter) string {
	if cl == nil {
		return ""
	}
	if len(cl.Paragraphs) == 0 {
		return ""
	}

	var out strings.Builder
	for _, paragraph := range cl.Paragraphs {
		p := strings.TrimSpace(paragraph)
		if p == "" {
			continue
		}
		out.WriteString("\\noindent ")
		out.WriteString(latexMultiline(p))
		out.WriteString("\n \\\\ \\vspace{10pt}\n")
	}
	return out.String()
}

func generateCoverLetterClosing(cl *CoverLetter) string {
	// Must end with \end{document}
	if cl == nil {
		return "\\end{document}\n"
	}

	closing := strings.TrimSpace(cl.Closing)
	if closing == "" {
		return "\\end{document}\n"
	}

	return fmt.Sprintf(
		"\\vspace{12pt}\n\\noindent %s\n\\end{document}\n",
		latexMultiline(closing),
	)
}

func latexMultiline(text string) string {
	// Converts user-entered newlines into LaTeX line breaks while escaping content.
	lines := strings.Split(text, "\n")
	out := make([]string, 0, len(lines))
	for _, line := range lines {
		out = append(out, esc(strings.TrimRight(line, "\r")))
	}
	return strings.Join(out, "\\\\\n")
}
