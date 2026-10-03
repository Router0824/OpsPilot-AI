"""Dependency-light hybrid retrieval for the MVP.

Vector retrieval uses deterministic feature-hashed term vectors and cosine
similarity. Keyword retrieval uses query-term coverage. Their ranks are fused,
then importance and exact phrase matches provide a small reranking signal.
"""

import hashlib
import math
import re
from collections import Counter
from dataclasses import dataclass
from typing import Iterable, List, Sequence


TOKEN_RE = re.compile(r"[a-zA-Z0-9_\-]+|[\u4e00-\u9fff]")


def tokenize(text: str) -> List[str]:
    return [token.lower() for token in TOKEN_RE.findall(text)]


def hashed_vector(text: str, dimensions: int = 256) -> List[float]:
    counts = Counter(tokenize(text))
    vector = [0.0] * dimensions
    for token, count in counts.items():
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % dimensions
        vector[index] += 1.0 + math.log(count)
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [value / norm for value in vector]


def cosine(left: Sequence[float], right: Sequence[float]) -> float:
    return sum(a * b for a, b in zip(left, right))


@dataclass
class SearchItem:
    id: str
    text: str
    source: str
    metadata: dict


@dataclass
class SearchResult:
    id: str
    text: str
    source: str
    score: float
    vector_score: float
    keyword_score: float
    metadata: dict


def hybrid_search(query: str, items: Iterable[SearchItem], top_k: int = 5) -> List[SearchResult]:
    query_tokens = set(tokenize(query))
    query_vector = hashed_vector(query)
    lowered_query = query.lower().strip()
    results: List[SearchResult] = []
    for item in items:
        item_tokens = set(tokenize(item.text))
        vector_score = max(0.0, cosine(query_vector, hashed_vector(item.text)))
        keyword_score = len(query_tokens & item_tokens) / max(1, len(query_tokens))
        phrase_bonus = 0.08 if lowered_query and lowered_query in item.text.lower() else 0.0
        score = min(1.0, vector_score * 0.55 + keyword_score * 0.37 + phrase_bonus)
        if score > 0:
            results.append(SearchResult(item.id, item.text, item.source, score, vector_score, keyword_score, item.metadata))
    return sorted(results, key=lambda result: result.score, reverse=True)[:top_k]

