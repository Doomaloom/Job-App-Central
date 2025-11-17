# Job Application App

Simple Python GUI to manage resume and cover letter content. This starter version provides three tabs:
- Edit Resume (edits files in `Resume-Stubs/`)
- Edit Cover Letter (fields kept in memory for now)
- Past Applications (creates a folder per application with resume, cover letter, and job description)

Project structure:
- `Resume-Stubs/`: your LaTeX snippets; the app cleans trailing whitespace/extra blank lines on launch.
- `Past-Applications/`: created automatically; each application gets its own folder with `resume.tex`, `cover_letter.txt`, and `job_description.txt`.
- `src/main.py`: Tkinter GUI entrypoint.
- `scripts/extract_resume_data.py`: helper to pull marked `%begin-.../%end-...` blocks from stubs into `data/resume_data.json`.

Run with:
```bash
python -m src.main
```

Extract stub content to JSON:
```bash
python scripts/extract_resume_data.py
```
