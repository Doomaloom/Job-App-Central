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

	namePart := sanitizeFilePart(app.Resume.Name, "Resume")
	resumeFilename := fmt.Sprintf("%s_Resume.pdf", namePart)
	coverFilename := fmt.Sprintf("%s_Cover_Letter.pdf", namePart)
	zipBytes, err := zipDocuments(resumePDF, coverPDF, resumeFilename, coverFilename)
	if err != nil {
		http.Error(w, "Failed to package PDFs: "+err.Error(), http.StatusInternalServerError)
		return
	}

	positionPart := sanitizeFilePart(app.JobTitle, "position")
	companyPart := sanitizeFilePart(app.Company, "company")
	zipFilename := fmt.Sprintf("%s_%s.zip", positionPart, companyPart)
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", zipFilename))
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

func zipDocuments(resumePDF, coverPDF []byte, resumeName, coverName string) ([]byte, error) {
	var buf bytes.Buffer
	zw := zip.NewWriter(&buf)

	w1, err := zw.Create(resumeName)
	if err != nil {
		_ = zw.Close()
		return nil, err
	}
	if _, err := w1.Write(resumePDF); err != nil {
		_ = zw.Close()
		return nil, err
	}

	w2, err := zw.Create(coverName)
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
		namePart := sanitizeFilePart(app.Resume.Name, "Resume")
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
		return pdfBytes, fmt.Sprintf("%s_Resume.pdf", namePart), nil

	default:
		namePart := sanitizeFilePart(app.Resume.Name, "Resume")
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
		return pdfBytes, fmt.Sprintf("%s_Cover.pdf", namePart), nil
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

func sanitizeFilePart(value, fallback string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fallback
	}

	var b strings.Builder
	prevUnderscore := false
	for _, r := range trimmed {
		isAlphaNum := (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9')
		if isAlphaNum {
			b.WriteRune(r)
			prevUnderscore = false
			continue
		}
		if !prevUnderscore {
			b.WriteByte('_')
			prevUnderscore = true
		}
	}

	out := strings.Trim(b.String(), "_")
	if out == "" {
		return fallback
	}
	return out
}
