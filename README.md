# Job Application Central

This project is a web application for managing job applications and generating resumes.

## Project Structure

- `frontend/`: Contains the React single-page application.
- `backend/`: Contains the Go backend API.
  - `data/`: Stores job application data.
  - `Resume-Stubs/`: Contains LaTeX templates for resume generation.

## Prerequisites

- The backend requires `pdflatex` (and the LaTeX base files) to be installed and available in your system's PATH to generate PDF resumes.
  - Arch/Manjaro: install `texlive-bin` plus a LaTeX package set like `texlive-basic`/`texlive-latex` (package names vary by distro).
  - Debian/Ubuntu: `sudo apt install texlive-latex-base` (or `texlive-full`).
  - If you see `I can't find the format file 'pdflatex.fmt'`, generate formats with `fmtutil-user --byfmt pdflatex` (per-user) or `sudo fmtutil-sys --byfmt pdflatex` (system-wide).
