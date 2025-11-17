"""
Basic Tkinter GUI with three tabs to manage resume and cover letter content.

This version edits LaTeX stub files from the Resume-Stubs directory and saves
past applications to disk with job descriptions and copies of the resume and
cover letter.

Launch with:
    python -m src.main
"""

from __future__ import annotations

import datetime
import re
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk


BASE_DIR = Path(__file__).resolve().parent.parent
RESUME_STUB_DIR = BASE_DIR / "Resume-Stubs"
PAST_APPLICATIONS_DIR = BASE_DIR / "Past-Applications"


class Application(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Job Application Helper")
        self.geometry("1100x700")

        PAST_APPLICATIONS_DIR.mkdir(parents=True, exist_ok=True)

        self.cover_letter: dict[str, str] = {
            "company": "",
            "role": "",
            "greeting": "Hello Hiring Manager,",
            "body": "I am excited to apply and bring my skills to your team.",
        }
        self.past_applications: list[dict[str, str]] = []
        self.resume_stub_paths: list[Path] = []

        self._clean_stub_files()
        self._load_resume_stub_paths()

        notebook = ttk.Notebook(self)
        notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        self.resume_frame = ttk.Frame(notebook)
        self.cover_frame = ttk.Frame(notebook)
        self.history_frame = ttk.Frame(notebook)

        notebook.add(self.resume_frame, text="Edit Resume")
        notebook.add(self.cover_frame, text="Edit Cover Letter")
        notebook.add(self.history_frame, text="Past Applications")

        self._build_resume_tab()
        self._build_cover_letter_tab()
        self._build_history_tab()

    # Resume tab UI and logic -------------------------------------------------
    def _build_resume_tab(self) -> None:
        container = self.resume_frame
        container.columnconfigure(1, weight=1)
        container.rowconfigure(0, weight=1)

        # Left: stub files list
        list_frame = ttk.Frame(container)
        list_frame.grid(row=0, column=0, sticky="nsw", padx=(0, 10))
        ttk.Label(list_frame, text="Resume stub files").pack(anchor="w")

        self.stub_list = tk.Listbox(list_frame, height=20)
        self.stub_list.pack(fill=tk.BOTH, expand=True)
        self.stub_list.bind("<<ListboxSelect>>", self._on_stub_select)

        btn_frame = ttk.Frame(list_frame)
        btn_frame.pack(fill=tk.X, pady=5)
        ttk.Button(btn_frame, text="Reload list", command=self._refresh_stub_list).pack(
            side=tk.LEFT, expand=True, fill=tk.X
        )

        # Right: detail editor for stub content
        detail = ttk.Frame(container)
        detail.grid(row=0, column=1, sticky="nsew")
        detail.columnconfigure(1, weight=1)
        detail.rowconfigure(1, weight=1)

        ttk.Label(detail, text="Selected file").grid(row=0, column=0, sticky="w")
        self.stub_filename_var = tk.StringVar(value="(nothing selected)")
        ttk.Label(detail, textvariable=self.stub_filename_var, foreground="gray").grid(row=0, column=1, sticky="w")

        self.stub_text = tk.Text(detail, wrap="word")
        self.stub_text.grid(row=1, column=0, columnspan=2, sticky="nsew", pady=5)

        action_row = ttk.Frame(detail)
        action_row.grid(row=2, column=1, sticky="e")
        ttk.Button(action_row, text="Reload File", command=self._reload_selected_stub).pack(side=tk.LEFT, padx=(0, 5))
        ttk.Button(action_row, text="Save File", command=self._save_stub).pack(side=tk.LEFT)

        self.status_var = tk.StringVar(value="Select a stub file to edit")
        ttk.Label(detail, textvariable=self.status_var, foreground="gray").grid(
            row=3, column=0, columnspan=2, sticky="w", pady=5
        )

        self._refresh_stub_list()

    def _load_resume_stub_paths(self) -> None:
        self.resume_stub_paths = sorted(RESUME_STUB_DIR.glob("*.tex"))

    def _refresh_stub_list(self) -> None:
        self._load_resume_stub_paths()
        self.stub_list.delete(0, tk.END)
        for stub_path in self.resume_stub_paths:
            self.stub_list.insert(tk.END, stub_path.name)
        self.status_var.set("Stub files loaded")

    def _on_stub_select(self, event: tk.Event | None) -> None:  # type: ignore[override]
        if not self.stub_list.curselection():
            return
        idx = self.stub_list.curselection()[0]
        stub_path = self.resume_stub_paths[idx]
        self.stub_filename_var.set(stub_path.name)
        content = stub_path.read_text(encoding="utf-8")
        self.stub_text.delete("1.0", tk.END)
        self.stub_text.insert("1.0", content)
        self.status_var.set(f"Editing {stub_path.name}")

    def _reload_selected_stub(self) -> None:
        if not self.stub_list.curselection():
            messagebox.showinfo("No selection", "Select a stub file to reload.")
            return
        self._on_stub_select(None)
        self.status_var.set("File reloaded")

    def _save_stub(self) -> None:
        if not self.stub_list.curselection():
            messagebox.showinfo("No selection", "Select a stub file to save.")
            return
        idx = self.stub_list.curselection()[0]
        stub_path = self.resume_stub_paths[idx]
        new_content = self._normalize_stub_text(self.stub_text.get("1.0", tk.END))
        stub_path.write_text(new_content, encoding="utf-8")
        self.status_var.set(f"Saved {stub_path.name}")

    # Cover letter tab --------------------------------------------------------
    def _build_cover_letter_tab(self) -> None:
        frame = self.cover_frame
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(3, weight=1)

        ttk.Label(frame, text="Company").grid(row=0, column=0, sticky="w")
        self.company_var = tk.StringVar(value=self.cover_letter["company"])
        ttk.Entry(frame, textvariable=self.company_var).grid(row=0, column=1, sticky="ew", pady=2)

        ttk.Label(frame, text="Role").grid(row=1, column=0, sticky="w")
        self.role_var = tk.StringVar(value=self.cover_letter["role"])
        ttk.Entry(frame, textvariable=self.role_var).grid(row=1, column=1, sticky="ew", pady=2)

        ttk.Label(frame, text="Greeting").grid(row=2, column=0, sticky="w")
        self.greeting_var = tk.StringVar(value=self.cover_letter["greeting"])
        ttk.Entry(frame, textvariable=self.greeting_var).grid(row=2, column=1, sticky="ew", pady=2)

        ttk.Label(frame, text="Body").grid(row=3, column=0, sticky="nw")
        self.body_text = tk.Text(frame, wrap="word")
        self.body_text.grid(row=3, column=1, sticky="nsew", pady=5)
        self.body_text.insert("1.0", self.cover_letter["body"])

        ttk.Button(frame, text="Save Cover Letter", command=self._save_cover_letter).grid(
            row=4, column=1, sticky="e", pady=5
        )

    def _save_cover_letter(self) -> None:
        self.cover_letter = {
            "company": self.company_var.get().strip(),
            "role": self.role_var.get().strip(),
            "greeting": self.greeting_var.get().strip(),
            "body": self.body_text.get("1.0", tk.END).strip(),
        }
        messagebox.showinfo("Saved", "Cover letter details saved in memory.")

    # Past applications tab ---------------------------------------------------
    def _build_history_tab(self) -> None:
        frame = self.history_frame
        frame.columnconfigure(0, weight=1)
        frame.rowconfigure(2, weight=1)

        form = ttk.Frame(frame)
        form.grid(row=0, column=0, sticky="ew", pady=5)
        for i in range(3):
            form.columnconfigure(i, weight=1)

        ttk.Label(form, text="Company").grid(row=0, column=0, sticky="w")
        ttk.Label(form, text="Role").grid(row=0, column=1, sticky="w")
        ttk.Label(form, text="Status").grid(row=0, column=2, sticky="w")

        self.history_company = tk.StringVar()
        self.history_role = tk.StringVar()
        self.history_status = tk.StringVar(value="Applied")

        ttk.Entry(form, textvariable=self.history_company).grid(row=1, column=0, sticky="ew", padx=(0, 5))
        ttk.Entry(form, textvariable=self.history_role).grid(row=1, column=1, sticky="ew", padx=5)
        ttk.Entry(form, textvariable=self.history_status).grid(row=1, column=2, sticky="ew", padx=(5, 0))

        ttk.Label(frame, text="Job Description").grid(row=1, column=0, sticky="w")
        self.job_desc_text = tk.Text(frame, wrap="word", height=8)
        self.job_desc_text.grid(row=2, column=0, sticky="nsew", pady=5)

        ttk.Button(form, text="Add", command=self._add_history).grid(row=2, column=2, sticky="e", pady=5)

        self.history_tree = ttk.Treeview(frame, columns=("Company", "Role", "Status"), show="headings")
        for col in ("Company", "Role", "Status"):
            self.history_tree.heading(col, text=col)
            self.history_tree.column(col, width=200, anchor="w")
        self.history_tree.grid(row=3, column=0, sticky="nsew")

        scrollbar = ttk.Scrollbar(frame, orient="vertical", command=self.history_tree.yview)
        scrollbar.grid(row=3, column=1, sticky="ns")
        self.history_tree.configure(yscrollcommand=scrollbar.set)

    def _add_history(self) -> None:
        company = self.history_company.get().strip()
        role = self.history_role.get().strip()
        status = self.history_status.get().strip() or "Applied"
        job_description = self.job_desc_text.get("1.0", tk.END).strip()
        if not company or not role or not job_description:
            messagebox.showinfo("Missing data", "Company, Role, and Job Description are required.")
            return
        entry = {"company": company, "role": role, "status": status}
        self.past_applications.append(entry)
        self.history_tree.insert("", tk.END, values=(company, role, status))
        self._save_application_files(company, role, status, job_description)

        self.history_company.set("")
        self.history_role.set("")
        self.history_status.set("Applied")
        self.job_desc_text.delete("1.0", tk.END)

    # Helpers -----------------------------------------------------------------
    def _clean_stub_files(self) -> None:
        if not RESUME_STUB_DIR.exists():
            return
        for stub_path in RESUME_STUB_DIR.glob("*.tex"):
            original = stub_path.read_text(encoding="utf-8")
            cleaned = self._normalize_stub_text(original)
            if cleaned != original:
                stub_path.write_text(cleaned, encoding="utf-8")

    def _normalize_stub_text(self, text: str) -> str:
        lines = [line.rstrip() for line in text.splitlines()]
        while lines and lines[0] == "":
            lines.pop(0)
        while lines and lines[-1] == "":
            lines.pop()
        normalized: list[str] = []
        previous_blank = False
        for line in lines:
            current_blank = line == ""
            if current_blank and previous_blank:
                continue
            normalized.append(line)
            previous_blank = current_blank
        return "\n".join(normalized) + "\n"

    def _save_application_files(self, company: str, role: str, status: str, job_description: str) -> None:
        timestamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        safe_slug = re.sub(r"[^A-Za-z0-9_-]+", "-", f"{company}-{role}").strip("-") or "application"
        folder = PAST_APPLICATIONS_DIR / f"{safe_slug}-{timestamp}"
        folder.mkdir(parents=True, exist_ok=True)

        resume_text = self._compose_resume_text()
        cover_letter_text = self._compose_cover_letter_text(status)

        (folder / "resume.tex").write_text(resume_text, encoding="utf-8")
        (folder / "cover_letter.txt").write_text(cover_letter_text, encoding="utf-8")
        (folder / "job_description.txt").write_text(job_description + "\n", encoding="utf-8")

    def _compose_resume_text(self) -> str:
        if not self.resume_stub_paths:
            return "% No resume stubs found.\n"
        parts: list[str] = []
        for stub_path in self.resume_stub_paths:
            parts.append(stub_path.read_text(encoding="utf-8").strip())
        return "\n\n".join(parts) + "\n"

    def _compose_cover_letter_text(self, status: str) -> str:
        cover = {
            "company": self.company_var.get().strip(),
            "role": self.role_var.get().strip(),
            "greeting": self.greeting_var.get().strip(),
            "body": self.body_text.get("1.0", tk.END).strip(),
        }
        lines = [
            cover["greeting"] or "Hello,",
            "",
            cover["body"] or "I am interested in the role.",
            "",
            f"Company: {cover['company']}" if cover["company"] else "",
            f"Role: {cover['role']}" if cover["role"] else "",
            f"Status: {status}" if status else "",
        ]
        return "\n".join(line for line in lines if line) + "\n"


def main() -> None:
    app = Application()
    app.mainloop()


if __name__ == "__main__":
    main()
