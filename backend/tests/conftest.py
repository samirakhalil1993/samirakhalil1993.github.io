"""Shared test helpers."""

import json
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
REAL_CONTENT = REPO_ROOT / "content"
REAL_INDEX = REPO_ROOT / "backend" / "data" / "index.json"

FIXTURE_CONTENT = {
    "profile": {
        "name": "Test Person",
        "title": "Student | AI",
        "intro": "Building things.",
        "location": "Testville",
        "initials": "TP",
        "about": ["First about paragraph.", "Second about paragraph."],
        "footerDescription": "Footer.",
    },
    "availability": {"status": "Seeking a thesis", "active": True},
    "skills": {
        "categories": [
            {"name": "Languages", "tags": ["Python", "SQL"]},
            {"name": "Tools", "tags": ["Git", "Docker"]},
        ]
    },
    "projects": {
        "projects": [
            {
                "id": "alpha",
                "title": "Alpha Agent",
                "summary": "Triages alerts.",
                "tags": ["Python", "Grafana"],
                "organisation": "Org One",
                "details": {"contributions": "I built the agent loop."},
            },
            {"id": "beta", "title": "Beta Classifier", "summary": "Classifies sensors.", "tags": ["SQL"], "details": {}},
        ]
    },
    "education": {
        "entries": [
            {
                "institution": "Test University",
                "degree": "M.Sc. in Testing",
                "location": "Testville",
                "start": "2022",
                "end": "2027",
                "coursework": ["Machine Learning", "Statistics"],
            }
        ]
    },
    "experience": {
        "entries": [
            {
                "id": "org-one",
                "title": "Student Developer",
                "organisation": "Org One",
                "context": "Student team",
                "period": "2025 – 2026",
                "summary": "Built an agent.",
                "responsibilities": ["Designed the agent.", "Integrated Grafana."],
                "technologies": ["Python"],
                "projectId": "alpha",
            }
        ]
    },
    "contact": {
        "email": "test@example.com",
        "linkedin": "https://www.linkedin.com/in/test",
        "github": "https://github.com/test",
        "cvPath": "cv.pdf",
    },
    "knowledge-sources": {
        "contentFiles": ["profile", "availability", "skills", "projects", "education", "experience", "contact"],
        "includeCv": True,
        "repos": [],
    },
}


def write_content(folder: Path, **overrides: dict) -> Path:
    """Writes the fixture content files into `folder`; `overrides` replace whole files."""
    folder.mkdir(parents=True, exist_ok=True)
    for name, data in {**FIXTURE_CONTENT, **overrides}.items():
        (folder / f"{name}.json").write_text(json.dumps(data), encoding="utf-8")
    return folder


@pytest.fixture
def content_dir(tmp_path: Path) -> Path:
    return write_content(tmp_path / "content")
