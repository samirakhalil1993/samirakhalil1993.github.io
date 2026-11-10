"""Turning text into search words."""

import json
import re
from pathlib import Path

_HERE = Path(__file__).parent

# Words that say nothing about what a question is about.
_STOP_WORDS = frozenset(
    """
    a an and are as at be been but by can could did do does for from had has have he her his how i
    in is it its me my of on or our she so than that the their them there these they this to was
    we were what when where which who whom why will with would you your about tell please say
    give show any some all also just more most much many very into over under make makes made
    och att det den de en ett är var har hade han hon som på i av för med till om eller men inte
    vad vem vilka vilken vilket hur när varför kan du jag vi ni man sig sin sitt sina han hans
    hennes berätta mer om något några alla också bara mycket vara blir blev finns fanns ha
    """.split()
)

_WORD = re.compile(r"[^\W_]+", re.UNICODE)
_POSSESSIVE = re.compile(r"['’]s\b", re.IGNORECASE)


def _stem(word: str) -> str:
    """Makes singular and plural forms equal: projects → project, technologies → technology."""
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 3 and word.endswith("s") and not word.endswith(("ss", "us", "is")):
        return word[:-1]
    return word


def tokenise(text: str) -> list[str]:
    """The search words of a text: lower-case, without filler words, singular."""
    words = _WORD.findall(_POSSESSIVE.sub("", text.lower()))
    return [_stem(word) for word in words if word not in _STOP_WORDS]


def _load(name: str) -> dict[str, list[str]]:
    data = json.loads((_HERE / name).read_text(encoding="utf-8"))
    return {_stem(key): [_stem(word) for word in words] for key, words in data.items()}


# Swedish query words and their English counterparts; the content is in English.
_SWEDISH = _load("sv_en.json")
# English query words and the words the content uses for the same thing.
_RELATED = _load("en_related.json")


def translate_query(tokens: list[str]) -> list[str]:
    """Adds, for each known word of a question, the words the content uses for it."""
    extra: list[str] = []
    for token in tokens:
        for word in _SWEDISH.get(token, []) + _RELATED.get(token, []):
            if word not in tokens and word not in extra:
                extra.append(word)
    return tokens + extra
