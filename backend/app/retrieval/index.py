"""The knowledge index: the pieces of text the assistant may answer from."""

import json
from dataclasses import asdict, dataclass
from pathlib import Path


@dataclass(frozen=True)
class Chunk:
    """One piece of approved text, with where it came from."""

    id: str
    title: str
    text: str
    # Shown to the visitor under an answer, for example "Project: SRE Agent".
    source_label: str
    # The part of the page this belongs to, if any (the id of a section).
    section_id: str | None = None
    # A link outside the site, for sources such as a GitHub repository.
    url: str | None = None


def save_index(chunks: list[Chunk], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = [asdict(chunk) for chunk in chunks]
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_index(path: Path) -> list[Chunk]:
    return [Chunk(**item) for item in json.loads(path.read_text(encoding="utf-8"))]
