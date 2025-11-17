"""
Parse Resume-Stubs/*.tex and extract blocks marked with %begin-<key> / %end-<key>
into a JSON file (data/resume_data.json).

Lists are broken into modular items using the modular stub files:
- resume_job.tex -> jobs[]
- resume_project.tex -> projects[]
- resume_skill_cat.tex -> skill_categories[]
Other single blocks (e.g., objective, relavent-courses) are stored as strings.
"""

from __future__ import annotations

import json
import re
import textwrap
from dataclasses import dataclass
from pathlib import Path
from typing import List


BASE_DIR = Path(__file__).resolve().parent.parent
STUB_DIR = BASE_DIR / "Resume-Stubs"
OUTPUT = BASE_DIR / "data" / "resume_data.json"

BLOCK_RE = re.compile(r"%begin-([A-Za-z0-9_-]+)\s*\n(.*?)\n%end-\1", re.DOTALL)
RESUME_ITEM_RE = re.compile(r"\\resumeItem\{(.*?)\}", re.DOTALL)


@dataclass
class Block:
    key: str
    content: str
    start: int


def parse_blocks(text: str) -> list[Block]:
    blocks: list[Block] = []
    for match in BLOCK_RE.finditer(text):
        key = match.group(1)
        content = textwrap.dedent(match.group(2)).strip()
        blocks.append(Block(key, content, match.start()))
    return blocks


def extract_resume_items(block_text: str) -> list[str]:
    items: list[str] = []
    for match in RESUME_ITEM_RE.finditer(block_text):
        item = textwrap.dedent(match.group(1)).strip()
        if item:
            items.append(item)
    return items


def extract_modules(blocks: list[Block], first_key: str, keys: list[str]) -> list[dict[str, str]]:
    modules: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for blk in sorted(blocks, key=lambda b: b.start):
        if blk.key == first_key:
            if current:
                modules.append(current)
            current = {blk.key: blk.content}
        elif current is not None and blk.key in keys:
            current[blk.key] = blk.content
    if current:
        modules.append(current)
    return modules


def load_text(filename: str) -> str:
    path = STUB_DIR / filename
    return path.read_text(encoding="utf-8") if path.exists() else ""


def main() -> None:
    data: dict[str, object] = {}

    # Single blocks
    single_sources = ["resume_objective.tex", "resume_education.tex"]
    for fname in single_sources:
        all_blocks = parse_blocks(load_text(fname))
        for blk in all_blocks:
            data[blk.key] = blk.content

    # Jobs
    job_blocks = parse_blocks(load_text("resume_job.tex"))
    jobs = extract_modules(
        job_blocks,
        first_key="job-title",
        keys=["job-start-date", "job-end-date", "job-employer", "job-location", "job-points"],
    )
    for job in jobs:
        if "job-points" in job:
            job["job-points"] = extract_resume_items(job["job-points"])
    data["jobs"] = jobs

    # Projects
    project_blocks = parse_blocks(load_text("resume_project.tex"))
    projects = extract_modules(
        project_blocks,
        first_key="project-title",
        keys=["project-tech", "project-date", "project-points"],
    )
    for proj in projects:
        if "project-points" in proj:
            proj["project-points"] = extract_resume_items(proj["project-points"])
    data["projects"] = projects

    # Skill categories
    skill_blocks = parse_blocks(load_text("resume_skill_cat.tex"))
    data["skill_categories"] = extract_modules(
        skill_blocks,
        first_key="cat-title",
        keys=["cat-skills"],
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote jobs={len(data.get('jobs', []))}, projects={len(data.get('projects', []))}, "
          f"skill_categories={len(data.get('skill_categories', []))} to {OUTPUT}")


if __name__ == "__main__":
    main()
