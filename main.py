from __future__ import annotations

import bz2
import gzip
import html
import lzma
import os
import re
import shutil
import subprocess
from contextlib import asynccontextmanager
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

DIST = Path(__file__).parent / "dist"

SECTION_NAMES = {
    "0": "Header files",
    "1": "User commands",
    "2": "System calls",
    "3": "Library functions",
    "4": "Special files",
    "5": "File formats",
    "6": "Games",
    "7": "Miscellanea",
    "8": "System administration",
    "9": "Kernel routines",
    "n": "Tcl/Tk",
}

COMPRESSED = {".gz", ".bz2", ".xz", ".lzma", ".zst", ".Z"}


@dataclass(frozen=True)
class ManEntry:
    name: str
    section: str
    path: Path
    description: str = ""

    @property
    def key(self) -> tuple[str, str]:
        return (self.name, self.section)

    def to_json(self) -> dict:
        return {
            "name": self.name,
            "section": self.section,
            "description": self.description,
        }


def man_roots() -> list[Path]:
    """Directories that contain man1/, man2/, ... subdirectories."""
    roots: list[str] = []
    if shutil.which("manpath"):
        try:
            out = subprocess.run(
                ["manpath", "-q"], capture_output=True, text=True, timeout=5
            ).stdout.strip()
            roots = [p for p in out.split(":") if p]
        except (OSError, subprocess.SubprocessError):
            pass
    if not roots:
        roots = ["/usr/local/share/man", "/usr/share/man"]
    seen: set[Path] = set()
    result = []
    for r in roots:
        p = Path(r)
        try:
            rp = p.resolve()
        except OSError:
            continue
        if rp in seen or not p.is_dir():
            continue
        seen.add(rp)
        result.append(p)
    return result


def split_filename(filename: str) -> tuple[str, str] | None:
    """'ls.1.gz' -> ('ls', '1'); 'X509_dup.3ssl.gz' -> ('X509_dup', '3ssl')."""
    stem, ext = os.path.splitext(filename)
    if ext in COMPRESSED:
        filename = stem
    name, dot, section = filename.rpartition(".")
    if not dot or not name or not section or not section[0].isalnum():
        return None
    return name, section


def load_descriptions() -> dict[tuple[str, str], str]:
    """Use the whatis database (`man -k .`) for one-line descriptions."""
    descs: dict[tuple[str, str], str] = {}
    if not shutil.which("man"):
        return descs
    try:
        out = subprocess.run(
            ["man", "-k", "."],
            capture_output=True,
            text=True,
            timeout=30,
            env={**os.environ, "LC_ALL": "C.UTF-8"},
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return descs
    line_re = re.compile(r"^(.+?) \(([^)]+)\)\s+- (.*)$")
    for line in out.splitlines():
        m = line_re.match(line)
        if not m:
            continue
        names, section, desc = m.groups()
        for n in names.split(", "):
            descs[(n.strip(), section)] = desc.strip()
    return descs


def build_index() -> dict[tuple[str, str], ManEntry]:
    descs = load_descriptions()
    index: dict[tuple[str, str], ManEntry] = {}
    for root in man_roots():
        for sub in sorted(root.glob("man*")):
            if not sub.is_dir():
                continue
            for f in sub.iterdir():
                parsed = split_filename(f.name)
                if not parsed:
                    continue
                name, section = parsed
                key = (name, section)
                if key in index:
                    continue
                index[key] = ManEntry(name, section, f, descs.get(key, ""))
    return index


INDEX: dict[tuple[str, str], ManEntry] = {}
BY_NAME: dict[str, list[ManEntry]] = {}


def reindex() -> None:
    global INDEX, BY_NAME
    INDEX = build_index()
    by_name: dict[str, list[ManEntry]] = {}
    for e in INDEX.values():
        by_name.setdefault(e.name.lower(), []).append(e)
    for lst in by_name.values():
        lst.sort(key=lambda e: section_sort_key(e.section))
    BY_NAME = by_name
    render_page.cache_clear()


def section_sort_key(section: str) -> tuple[int, str]:
    order = "183254967"
    base = section[0]
    return (order.index(base) if base in order else len(order), section)


def read_source(path: Path) -> str:
    suffix = path.suffix
    if suffix == ".gz" or suffix == ".Z":
        data = gzip.open(path).read()
    elif suffix == ".bz2":
        data = bz2.open(path).read()
    elif suffix in (".xz", ".lzma"):
        data = lzma.open(path).read()
    elif suffix == ".zst":
        data = subprocess.run(
            ["zstd", "-dc", str(path)], capture_output=True, check=True, timeout=10
        ).stdout
    else:
        data = path.read_bytes()
    return data.decode("utf-8", errors="replace")


SO_RE = re.compile(r"^\.so\s+(\S+)\s*$", re.MULTILINE)


def resolve_so(entry: ManEntry, source: str, depth: int = 0) -> str:
    """Follow `.so man3/foo.3` redirect stubs."""
    stripped = [
        l
        for l in source.splitlines()
        if l.strip() and not l.startswith(('.\\"', "'\\\""))
    ]
    if depth > 5 or len(stripped) != 1:
        return source
    m = SO_RE.match(stripped[0])
    if not m:
        return source
    target = m.group(1)
    root = entry.path.parent.parent
    candidates = [root / target, entry.path.parent / Path(target).name]
    for c in candidates:
        for ext in ["", *COMPRESSED]:
            p = c.with_name(c.name + ext)
            if p.is_file():
                return resolve_so(entry, read_source(p), depth + 1)
    return source


def pandoc_html(source: str) -> str:
    proc = subprocess.run(
        ["pandoc", "-f", "man", "-t", "html", "--wrap=none"],
        input=source,
        capture_output=True,
        text=True,
        timeout=30,
    )
    if proc.returncode != 0 or not proc.stdout.strip():
        raise RuntimeError(proc.stderr)
    return proc.stdout


def fallback_html(entry: ManEntry) -> str:
    """Plain `man` output if pandoc is missing or chokes on the page."""
    proc = subprocess.run(
        ["man", "-P", "cat", entry.section, entry.name],
        capture_output=True,
        text=True,
        timeout=30,
        env={**os.environ, "MANWIDTH": "100", "MAN_KEEP_FORMATTING": "0"},
    )
    text = re.sub(r".\x08", "", proc.stdout)
    return f'<pre class="fallback">{html.escape(text)}</pre>'


STRONG_REF_RE = re.compile(
    r"<(strong|em)>([A-Za-z0-9_.:+\-]+)</\1>\s*\((\d[a-zA-Z0-9]*)\)"
)
PLAIN_REF_RE = re.compile(
    r"(?<![\w/])([A-Za-z_][A-Za-z0-9_.:+\-]*)\((\d[a-zA-Z0-9]*)\)"
)
TAG_SPLIT_RE = re.compile(r"(<[^>]+>)")


def find_entry(name: str, section: str) -> ManEntry | None:
    e = INDEX.get((name, section))
    if e:
        return e
    for cand in BY_NAME.get(name.lower(), []):
        if cand.section.startswith(section) or section.startswith(cand.section):
            return cand
    return None


def link_refs(body: str, current: ManEntry) -> str:
    def link(name: str, section: str, label: str) -> str:
        e = find_entry(name, section)
        if not e or e.key == current.key:
            return label
        href = f"/man/{e.section}/{html.escape(e.name, quote=True)}"
        return f'<a class="manref" href="{href}">{label}</a>'

    body = STRONG_REF_RE.sub(lambda m: link(m.group(2), m.group(3), m.group(0)), body)

    parts = TAG_SPLIT_RE.split(body)
    in_link = 0
    for i, part in enumerate(parts):
        if part.startswith("<"):
            if part.startswith("<a ") or part == "<a>":
                in_link += 1
            elif part == "</a>":
                in_link = max(0, in_link - 1)
            continue
        if in_link or "(" not in part:
            continue
        parts[i] = PLAIN_REF_RE.sub(
            lambda m: link(m.group(1), m.group(2), m.group(0)), part
        )
    return "".join(parts)


SYNOPSIS_RE = re.compile(r'(<h1 id="synopsis">.*?</h1>)(.*?)(?=<h1 |\Z)', re.DOTALL)


def mark_synopsis(body: str) -> str:
    """Tag synopsis paragraphs so the frontend can style them as code."""
    return SYNOPSIS_RE.sub(
        lambda m: m.group(1) + m.group(2).replace("<p>", '<p class="synopsis">'),
        body,
        count=1,
    )


HEADING_RE = re.compile(r'<h([12]) id="([^"]+)">(.*?)</h\1>', re.DOTALL)


def build_toc(body: str) -> list[dict]:
    toc = []
    for level, hid, inner in HEADING_RE.findall(body):
        text = html.unescape(re.sub(r"<[^>]+>", "", inner)).strip()
        toc.append({"id": hid, "text": text, "level": int(level)})
    return toc


@lru_cache(maxsize=256)
def render_page(name: str, section: str) -> dict:
    entry = INDEX[(name, section)]
    try:
        source = resolve_so(entry, read_source(entry.path))
        body = pandoc_html(source)
        rendered_with = "pandoc"
    except Exception:
        body = fallback_html(entry)
        rendered_with = "man"

    body = mark_synopsis(link_refs(body, entry))
    toc = build_toc(body)

    description = entry.description
    if not description:
        m = re.search(r'<h1 id="name">.*?</h1>\s*<p>(.*?)</p>', body, re.DOTALL)
        if m:
            text = html.unescape(re.sub(r"<[^>]+>", "", m.group(1)))
            description = text.split(" - ", 1)[-1].strip()

    other_sections = [
        e.section
        for e in BY_NAME.get(name.lower(), [])
        if e.name == name and e.section != section
    ]
    return {
        **entry.to_json(),
        "description": description,
        "html": body,
        "toc": toc,
        "renderedWith": rendered_with,
        "otherSections": other_sections,
    }


def score(entry: ManEntry, q: str, terms: list[str]) -> float | None:
    name = entry.name.lower()
    desc = entry.description.lower()
    if name == q:
        s = 1000.0
    elif name.startswith(q):
        s = 600.0 - (len(name) - len(q))
    elif q in name:
        s = 300.0 - name.index(q) - (len(name) - len(q)) * 0.5
    elif all(t in desc or t in name for t in terms):
        s = 100.0 - len(desc) * 0.05
    else:
        return None
    s -= section_sort_key(entry.section)[0] * 2
    if len(entry.section) > 1:
        s -= 5
    return s


@asynccontextmanager
async def lifespan(_app: FastAPI):
    reindex()
    yield


app = FastAPI(title="manface", lifespan=lifespan)


@app.get("/api/search")
def search(
    q: str = Query("", max_length=200),
    section: str | None = None,
    limit: int = Query(50, ge=1, le=500),
):
    q = q.strip().lower()
    entries = INDEX.values()
    if section:
        entries = [
            e for e in entries if e.section == section or e.section[0] == section
        ]
    if not q:
        if not section:
            return {"total": 0, "results": []}
        results = sorted(entries, key=lambda e: e.name.lower())
        return {
            "total": len(results),
            "results": [e.to_json() for e in results[:limit]],
        }

    terms = q.split()
    scored = []
    for e in entries:
        s = score(e, q, terms)
        if s is not None:
            scored.append((s, e))
    scored.sort(key=lambda t: (-t[0], t[1].name.lower()))
    return {
        "total": len(scored),
        "results": [e.to_json() for _, e in scored[:limit]],
    }


@app.get("/api/sections")
def sections():
    counts: dict[str, int] = {}
    for e in INDEX.values():
        counts[e.section[0]] = counts.get(e.section[0], 0) + 1
    return [
        {"id": s, "name": SECTION_NAMES.get(s, f"Section {s}"), "count": c}
        for s, c in sorted(counts.items(), key=lambda t: (not t[0].isdigit(), t[0]))
    ]


@app.get("/api/page/{name}")
def page_any_section(name: str):
    candidates = [e for e in BY_NAME.get(name.lower(), [])]
    exact = [e for e in candidates if e.name == name] or candidates
    if not exact:
        raise HTTPException(404, f"No manual entry for {name}")
    e = exact[0]
    return render_page(e.name, e.section)


@app.get("/api/page/{section}/{name}")
def page(section: str, name: str):
    if (name, section) not in INDEX:
        e = find_entry(name, section)
        if not e:
            raise HTTPException(404, f"No manual entry for {name} in section {section}")
        return render_page(e.name, e.section)
    return render_page(name, section)


@app.post("/api/reindex")
def api_reindex():
    reindex()
    return {"pages": len(INDEX)}


@app.get("/api/{rest:path}")
def api_404(rest: str):
    return JSONResponse({"detail": "Not found"}, status_code=404)


if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{full_path:path}")
def spa(full_path: str):
    if not DIST.is_dir():
        return JSONResponse(
            {"detail": "Frontend not built. Run `bun run build` first."},
            status_code=503,
        )
    candidate = (DIST / full_path).resolve()
    if full_path and candidate.is_file() and DIST.resolve() in candidate.parents:
        return FileResponse(candidate)
    return FileResponse(DIST / "index.html")
