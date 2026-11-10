"""Keyword search over the knowledge index, ranked with BM25."""

import math
from collections import Counter
from collections.abc import Iterable
from typing import Protocol

from app.retrieval.index import Chunk
from app.retrieval.text import tokenise, translate_query


class Retriever(Protocol):
    """Anything that can find the chunks relevant to a question."""

    def search(self, query: str, limit: int = 4) -> list[Chunk]: ...


class Bm25Retriever:
    """Ranks chunks by how well their words match the question's words.

    BM25 rewards a chunk for containing a query word, more so when the word
    is rare in the index, and less so when the chunk is long. No model and no
    database are needed, which keeps the backend small and free to host.
    """

    def __init__(
        self,
        chunks: list[Chunk],
        ignore: Iterable[str] = (),
        k1: float = 1.5,
        b: float = 0.75,
        min_share: float = 0.4,
        fallback_id: str = "profile",
    ) -> None:
        self._chunks = chunks
        # Words that appear in nearly every question, such as the person's name.
        self._ignore = frozenset(token for word in ignore for token in tokenise(word))
        self._fallback_id = fallback_id
        self._k1 = k1
        # A chunk must score at least this share of the best chunk's score.
        # It keeps pieces that only share a common word out of the answer.
        self._min_share = min_share
        self._b = b

        # Words of the title and of the source label are counted twice: a
        # match there ("Project", "Education") says more than one in the text.
        self._counts = [
            Counter(tokenise(c.source_label) * 2 + tokenise(c.title) * 2 + tokenise(c.text))
            for c in chunks
        ]
        self._lengths = [sum(counts.values()) for counts in self._counts]
        self._average_length = sum(self._lengths) / len(chunks) if chunks else 0.0

        containing: Counter[str] = Counter()
        for counts in self._counts:
            containing.update(counts.keys())
        total = len(chunks)
        self._idf = {
            word: math.log(1 + (total - n + 0.5) / (n + 0.5)) for word, n in containing.items()
        }

    def _score(self, words: list[str], index: int) -> float:
        counts = self._counts[index]
        length_factor = 1 - self._b + self._b * self._lengths[index] / self._average_length
        score = 0.0
        for word in words:
            frequency = counts.get(word, 0)
            if frequency:
                score += self._idf[word] * frequency * (self._k1 + 1) / (frequency + self._k1 * length_factor)
        return score

    def search(self, query: str, limit: int = 4) -> list[Chunk]:
        tokens = translate_query(tokenise(query))
        words = [w for w in tokens if w not in self._ignore]
        if not self._chunks:
            return []
        if not words:
            # "Who is <name>?": nothing left to search for but the person. The
            # profile is the answer to that.
            asked_about_person = any(token in self._ignore for token in tokens)
            return [c for c in self._chunks if c.id == self._fallback_id][:1] if asked_about_person else []
        scored = [(self._score(words, i), i) for i in range(len(self._chunks))]
        # Best first; equal scores keep the order of the index.
        best = sorted((item for item in scored if item[0] > 0), key=lambda item: (-item[0], item[1]))
        if not best:
            return []
        threshold = best[0][0] * self._min_share
        return [self._chunks[i] for score, i in best[:limit] if score >= threshold]
