# Job Application Central

Job Application Central is a local web app for tracking job applications and iterating on tailored resumes + cover letters. It includes a React (Vite) frontend and a Go backend that stores applications as JSON and generates PDFs using LaTeX.

## Features

- Track job applications (title, company, status, job description)
- Resume editor (work experience, projects, skills, education, relevant courses)
- Cover letter editor (recipient fields + per-paragraph editing)
- Import public GitHub repos into your Projects section
- AI helpers (Google Gemini):
  - Optimize resume JSON against a job description
  - Generate cover letter body paragraphs against a job description
- PDF export:
  - Generates both `resume.pdf` and `cover_letter.pdf` and downloads them as a ZIP

## Project Structure

- `frontend/`: React single-page app (Vite)
- `backend/`: Go backend API
  - `applications/`: Saved job applications (JSON)
  - `Resume-Stubs/`: LaTeX templates for resume + cover letter generation

## Prerequisites

- Node.js + npm (frontend)
- Go (backend)
- `pdflatex` available in your PATH (PDF generation)
  - Arch/Manjaro: install `texlive-bin` plus a LaTeX package set like `texlive-basic`/`texlive-latex` (package names vary by distro).
  - Debian/Ubuntu: `sudo apt install texlive-latex-base` (or `texlive-full`).
  - If you see `I can't find the format file 'pdflatex.fmt'`, generate formats with `fmtutil-user --byfmt pdflatex` (per-user) or `sudo fmtutil-sys --byfmt pdflatex` (system-wide).

## Environment Variables

Set these in the shell where you run the backend:

- `GEMINI_API_KEY` (required for AI features)
- `GEMINI_MODEL` (optional, defaults to a configured Gemini model)

## Run Locally

1) Start the backend:

```bash
cd backend
export GEMINI_API_KEY="YOUR_KEY"
go run .
```

Backend runs on `http://localhost:8080`.

2) Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api/*` to the backend.

## Notes

- AI endpoints require that the backend process can read `GEMINI_API_KEY` from its environment.
- PDF generation uses LaTeX templates in `backend/Resume-Stubs/`.

## API Endpoints (Backend)

- `GET /api/applications` / `POST /api/applications`
- `GET /api/applications/:id` / `PUT /api/applications/:id` / `DELETE /api/applications/:id`
- `POST /api/optimize-resume`
- `POST /api/optimize-coverletter`
- `GET /api/github-projects?username=<handle>`
- `POST /api/generate-pdf` (downloads a ZIP with `resume.pdf` + `cover_letter.pdf`)
