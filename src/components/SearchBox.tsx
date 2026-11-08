import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { pageUrl, search } from "../utils/api";
import type { SearchResult } from "../utils/types";

interface Props {
    autoFocus?: boolean;
    compact?: boolean;
}

export default function SearchBox({ autoFocus, compact }: Props) {
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [active, setActive] = useState(0);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const q = query.trim();
        if (!q) return;
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            setLoading(true);
            search(q, { limit: 30, signal: ctrl.signal })
                .then((r) => {
                    setResults(r.results);
                    setTotal(r.total);
                    setActive(0);
                })
                .catch((e) => {
                    if (e.name !== "AbortError") setResults([]);
                })
                .finally(() => setLoading(false));
        }, 120);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [query]);

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const target = e.target as HTMLElement;
            if (
                e.key === "/" &&
                !["INPUT", "TEXTAREA"].includes(target.tagName) &&
                !target.isContentEditable
            ) {
                e.preventDefault();
                inputRef.current?.focus();
                inputRef.current?.select();
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    useEffect(() => {
        listRef.current
            ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
            ?.scrollIntoView({ block: "nearest" });
    }, [active]);

    function go(r: SearchResult) {
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
        navigate(pageUrl(r.section, r.name));
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
        } else if (e.key === "Enter") {
            if (results[active]) go(results[active]);
        } else if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
        }
    }

    const showDropdown = open && query.trim().length > 0;

    return (
        <div
            className={`relative w-full ${compact ? "max-w-md" : "max-w-2xl"}`}
        >
            <div className="relative">
                <svg
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    aria-hidden
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                </svg>
                <input
                    ref={inputRef}
                    type="search"
                    role="combobox"
                    aria-expanded={showDropdown}
                    aria-controls="search-results"
                    autoFocus={autoFocus}
                    spellCheck={false}
                    autoComplete="off"
                    className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-12 pr-12 text-[var(--fg)] shadow-sm outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-ring)] ${
                        compact ? "py-2 text-sm" : "py-4 text-lg"
                    }`}
                    placeholder="Search commands, functions, files…"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={onKeyDown}
                />
                <kbd className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded border border-[var(--border)] px-1.5 font-mono text-xs text-[var(--muted)]">
                    /
                </kbd>
            </div>

            {showDropdown && (
                <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left shadow-xl">
                    {results.length > 0 ? (
                        <>
                            <ul
                                id="search-results"
                                ref={listRef}
                                role="listbox"
                                className="max-h-96 overflow-y-auto py-1"
                            >
                                {results.map((r, i) => (
                                    <li
                                        key={`${r.name}.${r.section}`}
                                        data-index={i}
                                        role="option"
                                        aria-selected={i === active}
                                    >
                                        <button
                                            type="button"
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onClick={() => go(r)}
                                            onMouseMove={() => setActive(i)}
                                            className={`flex w-full items-baseline gap-3 px-4 py-2 text-left ${
                                                i === active
                                                    ? "bg-[var(--accent-bg)]"
                                                    : ""
                                            }`}
                                        >
                                            <span className="shrink-0 font-mono text-sm font-semibold text-[var(--fg)]">
                                                {r.name}
                                                <span className="font-normal text-[var(--muted)]">
                                                    ({r.section})
                                                </span>
                                            </span>
                                            <span className="truncate text-sm text-[var(--muted)]">
                                                {r.description}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            {total > results.length && (
                                <div className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
                                    Showing {results.length} of {total} matches.
                                    Keep typing to narrow it down.
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                            {loading ? (
                                "Searching…"
                            ) : (
                                <>
                                    No manual entry for{" "}
                                    <span className="font-mono text-[var(--fg)]">
                                        {query}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
