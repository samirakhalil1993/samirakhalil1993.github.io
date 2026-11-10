import pytest

from app.retrieval.bm25 import Bm25Retriever
from app.retrieval.index import Chunk, load_index
from app.retrieval.text import tokenise, translate_query
from tests.conftest import REAL_INDEX


def test_tokenise_lowercases_and_splits_on_punctuation():
    assert tokenise("Docker, Grafana & C#!") == ["docker", "grafana", "c"]


def test_tokenise_drops_filler_words_in_english_and_swedish():
    assert tokenise("What is the project about?") == ["project"]
    assert tokenise("Vad är det för projekt?") == ["projekt"]


def test_tokenise_treats_singular_and_plural_alike():
    assert tokenise("projects") == tokenise("project")
    assert tokenise("skills") == tokenise("skill")
    assert tokenise("technologies") == tokenise("technology")
    # Words that only happen to end in s are left alone.
    assert tokenise("SQL") == ["sql"]
    assert tokenise("class") == ["class"]


def test_tokenise_keeps_swedish_letters_and_numbers():
    assert tokenise("maskininlärning 2027") == ["maskininlärning", "2027"]


def test_translate_query_adds_english_words_for_swedish_ones():
    tokens = translate_query(tokenise("Vilka projekt har han arbetat med?"))
    assert "projekt" in tokens and "project" in tokens
    assert "worked" in tokens or "work" in tokens


def test_translate_query_leaves_other_words_alone():
    assert translate_query(["python", "grafana"]) == ["python", "grafana"]


def test_translate_query_adds_related_english_words():
    assert "education" in translate_query(tokenise("Where did he study?"))


def test_a_possessive_s_is_not_a_word():
    assert tokenise("Samir's salary") == ["samir", "salary"]


def test_translate_query_handles_phrases_that_become_two_words():
    assert {"machine", "learning"} <= set(translate_query(tokenise("maskininlärning")))


CHUNKS = [
    Chunk("profile", "About Test Person", "Test Person is a student of testing.", "About", "about"),
    Chunk("project-alpha", "Alpha Agent", "An agent that triages alerts with Python and Grafana.", "Project: Alpha Agent", "project-alpha"),
    Chunk("project-beta", "Beta Classifier", "Classifies sensors from time series with SQL.", "Project: Beta Classifier", "project-beta"),
    Chunk("education-1", "M.Sc. in Testing", "Education: M.Sc. in Testing, Test University. Coursework: statistics.", "Education", "education"),
]


def retriever(chunks=CHUNKS, ignore=("test", "person")):
    return Bm25Retriever(chunks, ignore=ignore)


def test_the_best_match_comes_first():
    assert retriever().search("Tell me about the alpha agent")[0].id == "project-alpha"
    assert retriever().search("sensors and time series")[0].id == "project-beta"


def test_a_word_in_the_title_counts_more_than_in_the_text():
    chunks = [
        Chunk("a", "Grafana dashboards", "Something else entirely here.", "A"),
        Chunk("b", "Something else", "Mentions grafana once in a longer piece of text here.", "B"),
    ]
    assert Bm25Retriever(chunks).search("grafana")[0].id == "a"


def test_only_matching_chunks_are_returned():
    assert [c.id for c in retriever().search("grafana")] == ["project-alpha"]


def test_nothing_is_returned_for_a_question_the_content_cannot_answer():
    assert retriever().search("What is the salary expectation?") == []


def test_a_question_about_the_person_in_general_gets_the_profile():
    assert [c.id for c in retriever().search("Who is Test?")] == ["profile"]
    assert [c.id for c in retriever().search("Tell me about Test Person")] == ["profile"]


def test_the_name_with_an_unknown_topic_still_finds_nothing():
    assert retriever().search("What is Test's salary?") == []


def test_an_empty_question_returns_nothing():
    assert retriever().search("") == []
    assert retriever().search("   ?!") == []


def test_the_limit_is_respected():
    assert len(retriever().search("testing agent sensors education", limit=2)) == 2


def test_an_empty_index_returns_nothing():
    assert Bm25Retriever([]).search("anything") == []


# ---- against the real index -------------------------------------------------


@pytest.fixture(scope="module")
def real():
    return Bm25Retriever(load_index(REAL_INDEX), ignore=("samir", "akhalil"))


@pytest.mark.parametrize(
    ("question", "expected_first"),
    [
        ("Tell me about the SRE Agent project.", "project-sre-agent"),
        ("Where did Samir study?", "education-1"),
        ("What did Samir do at Ericsson?", "experience-ericsson"),
        ("Berätta om utbildning", "education-1"),
        ("What is the hospital readmission project?", "project-hospital-readmission"),
    ],
)
def test_real_questions_find_the_right_piece_first(real, question, expected_first):
    assert real.search(question)[0].id == expected_first


def test_a_question_about_technologies_finds_skills(real):
    ids = [c.id for c in real.search("What technologies and programming languages does Samir use?")]
    assert any(i.startswith("skills-") for i in ids[:2])


def test_a_swedish_question_about_projects_finds_projects(real):
    ids = [c.id for c in real.search("Vilka projekt har Samir arbetat med?")]
    assert ids and any(i.startswith("project-") for i in ids[:2])


def test_a_swedish_question_about_machine_learning_finds_something_relevant(real):
    ids = [c.id for c in real.search("Vad har Samir för erfarenhet av maskininlärning?")]
    assert ids
    assert any(i.startswith(("skills-", "experience-", "project-", "education-", "profile")) for i in ids)


def test_a_question_outside_the_content_finds_nothing(real):
    assert real.search("What is Samir's salary expectation?") == []
    assert real.search("What is the weather in Paris?") == []


def test_every_real_suggested_question_finds_something(real):
    import json

    from tests.conftest import REAL_CONTENT

    questions = json.loads((REAL_CONTENT / "chat.json").read_text(encoding="utf-8"))["suggestedQuestions"]
    for question in questions:
        assert real.search(question), question


def test_a_question_about_all_projects_finds_only_projects(real):
    ids = [c.id for c in real.search("What projects has Samir worked on?")]
    assert len(ids) == 4 and all(i.startswith("project-") for i in ids)


def test_weak_matches_are_left_out_when_there_is_a_clear_best_match(real):
    ids = [c.id for c in real.search("Tell me about the SRE Agent project.", limit=6)]
    assert ids[0] == "project-sre-agent"
    assert "project-hospital-readmission" not in ids and "project-sensor-classification" not in ids


@pytest.mark.parametrize("question", ["Who is Samir?", "Tell me about Samir", "Vem är Samir?", "Where does Samir live?"])
def test_general_questions_about_the_person_find_the_profile(real, question):
    assert real.search(question)[0].id == "profile"
