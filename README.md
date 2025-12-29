# Job Application Central

Job Application Central is a web app for tracking job applications and iterating on tailored resumes + cover letters. It includes a React (Vite) frontend and a Go backend that stores data in Postgres (Supabase) and generates PDFs using LaTeX.

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
  - `Resume-Stubs/`: LaTeX templates for resume + cover letter generation
  - `migrations/`: SQL to create tables in Supabase/Postgres

## Prerequisites

- Node.js + npm (frontend)
- Go (backend)
- Supabase project (Google OAuth + Postgres)
- `pdflatex` available in your PATH (PDF generation)
  - Arch/Manjaro: install `texlive-bin` plus a LaTeX package set like `texlive-basic`/`texlive-latex` (package names vary by distro).
  - Debian/Ubuntu: `sudo apt install texlive-latex-base` (or `texlive-full`).
  - If you see `I can't find the format file 'pdflatex.fmt'`, generate formats with `fmtutil-user --byfmt pdflatex` (per-user) or `sudo fmtutil-sys --byfmt pdflatex` (system-wide).

## Environment Variables

Set these in the shell where you run the backend:

- `DATABASE_URL` (required; Supabase Postgres connection string)
- `SUPABASE_URL` (required; e.g. `https://<project-ref>.supabase.co`)
- `SUPABASE_ANON_KEY` (required; same value as your Supabase “publishable/anon” key, used to fetch JWKS)
- `GEMINI_API_KEY` (required for AI features)
- `GEMINI_MODEL` (optional)

Set these for the frontend (Vite):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Run Locally

1) Create the Supabase tables (run in Supabase SQL Editor):

- `backend/migrations/001_init.sql`

1) Start the backend:

```bash
cd backend
export DATABASE_URL="postgres://..."
export SUPABASE_URL="https://<project-ref>.supabase.co"
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

- All `/api/*` endpoints require a Supabase access token (`Authorization: Bearer <token>`).
- AI endpoints require that the backend process can read `GEMINI_API_KEY` from its environment.
- PDF generation uses LaTeX templates in `backend/Resume-Stubs/`.

## API Endpoints (Backend)

- `GET /api/profile` / `PUT /api/profile`
- `GET /api/applications` / `POST /api/applications`
- `GET /api/applications/:id` / `PUT /api/applications/:id` / `DELETE /api/applications/:id`
- `POST /api/optimize-resume`
- `POST /api/optimize-coverletter`
- `GET /api/github-projects?username=<handle>`
- `POST /api/generate-pdf` (downloads a ZIP with `resume.pdf` + `cover_letter.pdf`)
