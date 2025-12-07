# Job Application Central

This project is a web application for managing job applications and generating resumes.

## Project Structure

- `frontend/`: Contains the React single-page application.
- `backend/`: Contains the Go backend API.
  - `data/`: Stores job application data.
  - `Resume-Stubs/`: Contains LaTeX templates for resume generation.

## Prerequisites

- The backend requires `pdflatex` to be installed and available in your system's PATH to generate PDF resumes. On Arch/Manjaro install the `texlive-bin` package (it provides `pdflatex`).
