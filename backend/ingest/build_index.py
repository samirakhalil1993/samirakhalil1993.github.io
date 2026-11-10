"""Builds the knowledge index from the approved content.

Run it after every content change:

    python -m ingest.build_index

It reads only what `content/knowledge-sources.json` lists: the named content
files, the public CV, and the README of each listed GitHub repository. The
result is written to `backend/data/index.json`, which the backend loads.
"""

import json
import re
import sys
from collections.abc import Mapping
from pathlib import Path

from app.retrieval.index import Chunk, save_index

REPO_ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = REPO_ROOT / "content"
INDEX_PATH = REPO_ROOT / "backend" / "data" / "index.json"

# CV and README text is cut into pieces of at most this many characters.
MAX_PIECE_CHARS = 1200

# The same rules as the frontend's content checks: a company that must not be
# mentioned, and anything that looks like a phone number.
_BANNED_WORD = re.compile(r"ExampleCo", re.IGNORECASE)
_PHONE = re.compile(r"\+?\d(?:[\s().-]{0,2}\d){8,}")
_UUID = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", re.IGNORECASE)


def find_banned_text(text: str) -> list[str]:
    """Returns every banned piece of text found, or an empty list."""
    cleaned = _UUID.sub("", text)
    return [match.group(0) for pattern in (_BANNED_WORD, _PHONE) if (match := pattern.search(cleaned))]


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _lines(*parts: str | None) -> str:
    """Joins the parts that exist, one per line."""
    return "\n".join(part for part in parts if part)


def _read(content_dir: Path, name: str):
    return json.loads((content_dir / f"{name}.json").read_text(encoding="utf-8"))


def _profile(data: dict) -> list[Chunk]:
    text = _lines(
        f"{data['name']} – {data['title']}",
        f"Location: {data['location']}",
        data["intro"],
        *data["about"],
    )
    return [Chunk("profile", f"About {data['name']}", text, "About", "about")]


def _availability(data: dict) -> list[Chunk]:
    return [Chunk("availability", "Availability", f"Current status: {data['status']}", "Availability", "home")]


def _skills(data: dict) -> list[Chunk]:
    return [
        Chunk(
            f"skills-{_slug(category['name'])}",
            f"Skills: {category['name']}",
            f"{category['name']}: {', '.join(category['tags'])}",
            "Technical Skills",
            "skills",
        )
        for category in data["categories"]
    ]


def _projects(data: dict) -> list[Chunk]:
    chunks = []
    for project in data["projects"]:
        details = project.get("details", {})
        text = _lines(
            f"Project: {project['title']}",
            f"Organisation: {project['organisation']}" if project.get("organisation") else None,
            project["summary"],
            f"Technologies: {', '.join(project['tags'])}",
            f"Problem and goal: {details['problemGoal']}" if details.get("problemGoal") else None,
            f"Solution and architecture: {details['solutionArchitecture']}"
            if details.get("solutionArchitecture")
            else None,
            f"Own contributions: {details['contributions']}" if details.get("contributions") else None,
            f"Results and challenges: {details['resultsChallenges']}"
            if details.get("resultsChallenges")
            else None,
        )
        chunks.append(
            Chunk(
                f"project-{project['id']}",
                project["title"],
                text,
                f"Project: {project['title']}",
                f"project-{project['id']}",
            )
        )
    return chunks


def _education(data: dict) -> list[Chunk]:
    chunks = []
    for number, entry in enumerate(data["entries"], start=1):
        text = _lines(
            f"Education: {entry['degree']}, {entry['institution']}, {entry['location']}",
            f"Period: {entry['start']} – {entry['end']}",
            entry.get("description"),
            f"Relevant coursework: {', '.join(entry['coursework'])}" if entry.get("coursework") else None,
        )
        chunks.append(Chunk(f"education-{number}", entry["degree"], text, "Education", "education"))
    return chunks


def _experience(data: dict) -> list[Chunk]:
    chunks = []
    for entry in data["entries"]:
        text = _lines(
            f"Experience: {entry['title']} at {entry['organisation']}",
            f"Kind of engagement: {entry['context']}" if entry.get("context") else None,
            f"Period: {entry['period']}",
            entry["summary"],
            *entry["responsibilities"],
            f"Technologies: {', '.join(entry['technologies'])}" if entry.get("technologies") else None,
        )
        chunks.append(
            Chunk(
                f"experience-{entry['id']}",
                f"{entry['title']} at {entry['organisation']}",
                text,
                f"Experience: {entry['organisation']}",
                "experience",
            )
        )
    return chunks


def _contact(data: dict) -> list[Chunk]:
    text = _lines(f"Email: {data['email']}", f"LinkedIn: {data['linkedin']}", f"GitHub: {data['github']}")
    return [Chunk("contact", "Contact", text, "Contact", "contact")]


_BUILDERS = {
    "profile": _profile,
    "availability": _availability,
    "skills": _skills,
    "projects": _projects,
    "education": _education,
    "experience": _experience,
    "contact": _contact,
}


def _pieces(blocks: list[str]) -> list[str]:
    """Packs blocks of text into pieces of at most MAX_PIECE_CHARS characters."""
    pieces: list[str] = []
    current = ""
    for block in blocks:
        block = block.strip()
        while len(block) > MAX_PIECE_CHARS:  # a single block that is too long is cut
            cut = block.rfind(" ", 0, MAX_PIECE_CHARS)
            cut = cut if cut > 0 else MAX_PIECE_CHARS
            if current:
                pieces.append(current)
                current = ""
            pieces.append(block[:cut].strip())
            block = block[cut:].strip()
        if not block:
            continue
        if current and len(current) + 2 + len(block) > MAX_PIECE_CHARS:
            pieces.append(current)
            current = block
        else:
            current = f"{current}\n\n{block}" if current else block
    if current:
        pieces.append(current)
    return pieces


def _check(text: str, source: str) -> None:
    found = find_banned_text(text)
    if found:
        raise ValueError(f"Banned text in {source}: {found}. Remove it from the source and build again.")


def _cv(text: str) -> list[Chunk]:
    _check(text, "CV")
    blocks = re.split(r"\n\s*\n", text)
    return [Chunk(f"cv-{n}", f"CV, part {n}", piece, "CV") for n, piece in enumerate(_pieces(blocks), start=1)]


def _readme(repo_url: str, text: str) -> list[Chunk]:
    name = repo_url.rstrip("/").removeprefix("https://github.com/")
    label = f"GitHub: {name}"
    _check(text, label)
    # A heading starts a new block, so each piece stays on one topic.
    blocks = re.split(r"\n(?=#{1,6} )", text)
    return [
        Chunk(f"readme-{_slug(name)}-{n}", f"{name} README, part {n}", piece, label, None, repo_url.rstrip("/"))
        for n, piece in enumerate((p for block in blocks for p in _pieces([block])), start=1)
    ]


def build_chunks(
    content_dir: Path,
    cv_text: str | None = None,
    readmes: Mapping[str, str] | None = None,
) -> list[Chunk]:
    """Turns the approved sources into chunks. Reads nothing that is not listed."""
    sources = _read(content_dir, "knowledge-sources")
    chunks: list[Chunk] = []

    for name, builder in _BUILDERS.items():  # a fixed order, whatever the list's order
        if name in sources["contentFiles"]:
            chunks.extend(builder(_read(content_dir, name)))

    # The placeholder CV says nothing about the person, so it is left out.
    if sources.get("includeCv") and cv_text and "placeholder" not in cv_text.lower():
        chunks.extend(_cv(cv_text))

    for repo_url, text in (readmes or {}).items():
        chunks.extend(_readme(repo_url, text))

    return chunks


def read_cv_text(content_dir: Path) -> str | None:
    """The text of the public CV, or None when there is no readable CV."""
    from pypdf import PdfReader

    cv_path = content_dir.parent / "frontend" / "public" / _read(content_dir, "contact")["cvPath"]
    if not cv_path.is_file():
        return None
    try:
        return "\n\n".join(page.extract_text() or "" for page in PdfReader(cv_path).pages).strip() or None
    except Exception:  # a damaged PDF must not stop the build of everything else
        return None


def fetch_readmes(repos: list[str]) -> dict[str, str]:
    """Downloads the README of each listed public GitHub repository."""
    import httpx

    readmes: dict[str, str] = {}
    for repo_url in repos:
        name = repo_url.rstrip("/").removeprefix("https://github.com/")
        response = httpx.get(
            f"https://api.github.com/repos/{name}/readme",
            headers={"Accept": "application/vnd.github.raw+json"},
            timeout=20,
            follow_redirects=True,
        )
        response.raise_for_status()
        readmes[repo_url] = response.text
    return readmes


def main() -> None:
    sources = _read(CONTENT_DIR, "knowledge-sources")
    chunks = build_chunks(
        CONTENT_DIR,
        cv_text=read_cv_text(CONTENT_DIR),
        readmes=fetch_readmes(sources.get("repos", [])),
    )
    save_index(chunks, INDEX_PATH)
    print(f"Wrote {len(chunks)} chunks to {INDEX_PATH.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
