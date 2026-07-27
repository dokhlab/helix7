"""Shared helpers for the Helix7 ETL: cached HTTP, Mongo access, text utils."""

from __future__ import annotations

import hashlib
import html
import json
import os
import re
import time
from pathlib import Path
from typing import Any

import httpx
from pymongo import MongoClient
from pymongo.database import Database

ETL_DIR = Path(__file__).resolve().parent
CACHE_DIR = ETL_DIR / "cache"
OUT_DIR = ETL_DIR / "out"
CACHE_DIR.mkdir(exist_ok=True)
OUT_DIR.mkdir(exist_ok=True)

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.environ.get("MONGODB_DB", "helix7")

USER_AGENT = "Helix7-ETL/0.1 (GPCRome atlas; research use)"

# Be a good citizen: these are free public APIs with no auth.
DEFAULT_DELAY = 0.15


def get_db() -> Database:
    return MongoClient(MONGODB_URI, serverSelectionTimeoutMS=8000)[MONGODB_DB]


def _cache_path(url: str, params: dict | None) -> Path:
    key = url + json.dumps(params or {}, sort_keys=True)
    digest = hashlib.sha256(key.encode()).hexdigest()[:24]
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", url.split("//", 1)[-1])[:70].strip("-")
    return CACHE_DIR / f"{slug}-{digest}.json"


def fetch_json(
    url: str,
    params: dict | None = None,
    *,
    headers: dict | None = None,
    use_cache: bool = True,
    timeout: float = 90.0,
    retries: int = 3,
    delay: float = DEFAULT_DELAY,
) -> Any:
    """GET JSON with an on-disk cache so re-runs are free and reproducible."""
    path = _cache_path(url, params)
    if use_cache and path.exists():
        try:
            return json.loads(path.read_text())
        except json.JSONDecodeError:
            path.unlink(missing_ok=True)

    hdrs = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if headers:
        hdrs.update(headers)

    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True) as client:
                resp = client.get(url, params=params, headers=hdrs)
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            data = resp.json()
            path.write_text(json.dumps(data))
            time.sleep(delay)
            return data
        except Exception as exc:  # noqa: BLE001 - retry on anything transient
            last_err = exc
            time.sleep(1.5 * (attempt + 1))
    print(f"  ! fetch failed after {retries} tries: {url} ({last_err})")
    return None


def post_json(
    url: str,
    payload: dict,
    *,
    use_cache: bool = True,
    timeout: float = 90.0,
    retries: int = 3,
) -> Any:
    """POST JSON (for GraphQL endpoints) with the same disk cache."""
    path = _cache_path(url, payload)
    if use_cache and path.exists():
        try:
            return json.loads(path.read_text())
        except json.JSONDecodeError:
            path.unlink(missing_ok=True)

    hdrs = {"User-Agent": USER_AGENT, "Content-Type": "application/json"}
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            with httpx.Client(timeout=timeout, follow_redirects=True) as client:
                resp = client.post(url, json=payload, headers=hdrs)
            resp.raise_for_status()
            data = resp.json()
            path.write_text(json.dumps(data))
            time.sleep(DEFAULT_DELAY)
            return data
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            time.sleep(1.5 * (attempt + 1))
    print(f"  ! POST failed after {retries} tries: {url} ({last_err})")
    return None


TAG_RE = re.compile(r"<[^>]+>")
SUB_RE = re.compile(r"<sub>(.*?)</sub>", re.IGNORECASE | re.DOTALL)
_SUBSCRIPT = {
    "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄",
    "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉",
    "+": "₊", "-": "₋", "a": "ₐ", "e": "ₑ",
}


def _to_subscript(match: re.Match) -> str:
    inner = TAG_RE.sub("", match.group(1))
    # Only convert when every character has a subscript form (e.g. "2", "1A");
    # otherwise keep the plain text so nothing is dropped.
    if inner and all(ch in _SUBSCRIPT for ch in inner):
        return "".join(_SUBSCRIPT[ch] for ch in inner)
    return inner


def strip_html(text: str | None) -> str:
    """Turn GPCRdb name markup into readable plain text.

    Names carry HTML: subscript tags (5-HT<sub>1A</sub>) and Greek-letter
    entities (&beta;<sub>2</sub>-adrenoceptor). We convert subscripts to Unicode
    subscript characters, decode entities to their real glyphs (β, α, …), strip
    any remaining tags, and normalise whitespace.
    """
    if not text:
        return ""
    text = SUB_RE.sub(_to_subscript, text)
    text = TAG_RE.sub("", text)
    text = html.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def write_out(name: str, data: Any) -> Path:
    path = OUT_DIR / name
    path.write_text(json.dumps(data, indent=1))
    print(f"  -> wrote {path.relative_to(ETL_DIR)} ({len(json.dumps(data)) / 1e6:.1f} MB)")
    return path


def read_out(name: str) -> Any:
    path = OUT_DIR / name
    if not path.exists():
        raise SystemExit(f"missing {path}; run the earlier ETL stage first")
    return json.loads(path.read_text())
