import json

import pytest

from app.retrieval.index import Chunk, load_index, save_index
from ingest.build_index import build_chunks
from tests.conftest import FIXTURE_CONTENT, REAL_CONTENT, REAL_INDEX, write_content


def by_id(chunks: list[Chunk]) -> dict[str, Chunk]:
    return {chunk.id: chunk for chunk in chunks}


def test_one_chunk_per_piece_of_content_with_its_source(content_dir):
    chunks = build_chunks(content_dir)
    assert [(c.id, c.source_label, c.section_id) for c in chunks] == [
        ("profile", "About", "about"),
        ("availability", "Availability", "home"),
        ("skills-languages", "Technical Skills", "skills"),
        ("skills-tools", "Technical Skills", "skills"),
        ("project-alpha", "Project: Alpha Agent", "project-alpha"),
        ("project-beta", "Project: Beta Classifier", "project-beta"),
        ("education-1", "Education", "education"),
        ("experience-org-one", "Experience: Org One", "experience"),
        ("contact", "Contact", "contact"),
    ]
    assert all(c.url is None for c in chunks)


def test_a_project_chunk_holds_its_summary_tags_and_detail_text(content_dir):
    chunk = by_id(build_chunks(content_dir))["project-alpha"]
    assert chunk.title == "Alpha Agent"
    for expected in ("Triages alerts.", "Python", "Grafana", "Org One", "I built the agent loop."):
        assert expected in chunk.text


def test_an_experience_chunk_holds_its_context_and_responsibilities(content_dir):
    text = by_id(build_chunks(content_dir))["experience-org-one"].text
    for expected in ("Student Developer", "Student team", "2025 – 2026", "Designed the agent.", "Python"):
        assert expected in text


def test_the_profile_chunk_holds_name_title_and_about(content_dir):
    text = by_id(build_chunks(content_dir))["profile"].text
    for expected in ("Test Person", "Student | AI", "First about paragraph.", "Second about paragraph."):
        assert expected in text


def test_a_file_that_is_not_listed_is_not_read(tmp_path):
    sources = {**FIXTURE_CONTENT["knowledge-sources"], "contentFiles": ["profile", "skills"]}
    folder = write_content(tmp_path / "content", **{"knowledge-sources": sources})
    chunks = build_chunks(folder)
    assert [c.id for c in chunks] == ["profile", "skills-languages", "skills-tools"]
    assert "test@example.com" not in json.dumps([c.text for c in chunks])


def test_cv_text_is_split_into_labelled_pieces(content_dir):
    cv = "Profile\nA student of testing.\n\n" + ("Experience line. " * 100) + "\n\nEducation\nTest University."
    chunks = [c for c in build_chunks(content_dir, cv_text=cv) if c.source_label == "CV"]
    assert len(chunks) >= 2
    assert all(len(c.text) <= 1200 for c in chunks)
    assert all(c.section_id is None and c.url is None for c in chunks)
    assert chunks[0].id == "cv-1"
    assert "A student of testing." in chunks[0].text


def test_a_placeholder_cv_is_left_out(content_dir):
    chunks = build_chunks(content_dir, cv_text="CV placeholder\nThe real CV will be added before launch.")
    assert not [c for c in chunks if c.source_label == "CV"]


def test_the_cv_is_left_out_when_the_sources_say_so(tmp_path):
    sources = {**FIXTURE_CONTENT["knowledge-sources"], "includeCv": False}
    folder = write_content(tmp_path / "content", **{"knowledge-sources": sources})
    assert not [c for c in build_chunks(folder, cv_text="A real CV text.") if c.source_label == "CV"]


def test_a_readme_is_split_on_headings_and_linked_to_its_repo(content_dir):
    readme = "# Alpha\nIntro text.\n\n## Setup\nInstall it.\n\n## Results\nIt works."
    chunks = [
        c
        for c in build_chunks(content_dir, readmes={"https://github.com/test/alpha": readme})
        if c.url is not None
    ]
    assert [c.id for c in chunks] == ["readme-test-alpha-1", "readme-test-alpha-2", "readme-test-alpha-3"]
    assert all(c.source_label == "GitHub: test/alpha" for c in chunks)
    assert all(c.url == "https://github.com/test/alpha" and c.section_id is None for c in chunks)
    assert "Install it." in chunks[1].text


# The real banned name is stored only as a fingerprint, so the tests teach
# the check an invented name.
@pytest.fixture
def zorvex_is_banned(monkeypatch):
    import ingest.build_index as build_index

    monkeypatch.setattr(build_index, "BANNED_NAMES", [build_index.banned_name("Zorvex")])


@pytest.mark.parametrize("bad", ["Worked at Zorvex AB.", "The ZORVEXagent tool.", "Call +46 70 123 45 67."])
def test_banned_text_in_a_readme_or_cv_stops_the_build(content_dir, bad, zorvex_is_banned):
    with pytest.raises(ValueError, match="GitHub: test/alpha"):
        build_chunks(content_dir, readmes={"https://github.com/test/alpha": f"# Alpha\n{bad}"})
    with pytest.raises(ValueError, match="CV"):
        build_chunks(content_dir, cv_text=f"Profile\n{bad}")


def test_the_index_file_round_trips(tmp_path, content_dir):
    chunks = build_chunks(content_dir)
    path = tmp_path / "index.json"
    save_index(chunks, path)
    assert load_index(path) == chunks


def test_the_committed_index_matches_the_real_content():
    # If this fails, the content changed: run `python -m ingest.build_index`.
    from ingest.build_index import read_cv_text

    expected = build_chunks(REAL_CONTENT, cv_text=read_cv_text(REAL_CONTENT))
    assert load_index(REAL_INDEX) == expected


def test_the_real_index_has_no_banned_text_and_covers_the_site():
    from ingest.build_index import find_banned_text

    chunks = load_index(REAL_INDEX)
    assert find_banned_text(json.dumps([c.text for c in chunks], ensure_ascii=False)) == []
    ids = {c.id for c in chunks}
    assert {"profile", "project-sre-agent", "experience-trafikverket", "education-1"} <= ids
    # The contact file is not in the real knowledge sources, so the email is not indexed.
    assert "contact" not in ids


def test_a_banned_name_is_reported_without_repeating_it(zorvex_is_banned):
    from ingest.build_index import BANNED_NAME_FOUND, find_banned_text

    assert find_banned_text("Worked at Zorvex AB.") == [BANNED_NAME_FOUND]
    assert find_banned_text("Worked at Zorve and Orvex on vortex research.") == []


def test_the_banned_names_are_fingerprints_not_readable_names():
    from ingest.build_index import BANNED_NAMES

    assert BANNED_NAMES
    for length, digest in BANNED_NAMES:
        assert length > 2
        assert len(digest) == 64 and set(digest) <= set("0123456789abcdef")
