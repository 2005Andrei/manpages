import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import SearchBox from "../components/SearchBox";
import { getSections } from "../utils/api";
import type { Section } from "../utils/types";

const QUICK = [
    ["1", "ls"],
    ["1", "grep"],
    ["1", "find"],
    ["1", "tar"],
    ["1", "ssh"],
    ["3", "printf"],
    ["2", "open"],
    ["5", "passwd"],
    ["7", "regex"],
];

export default function Dashboard() {
    const [sections, setSections] = useState<Section[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const ctrl = new AbortController();
        getSections(ctrl.signal)
            .then(setSections)
            .catch((e) => e.name !== "AbortError" && setError(e.message));
        return () => ctrl.abort();
    }, []);

    const total = sections.reduce((n, s) => n + s.count, 0);

    return (
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-4 pb-16 pt-[14vh]">
            <h1 className="mb-2 font-mono text-5xl font-bold tracking-tight text-[var(--fg)]">
                man<span className="text-[var(--accent)]">face</span>
            </h1>
            <p className="mb-10 text-center text-[var(--muted)]">
                {total > 0
                    ? `${total.toLocaleString()} manual pages on this machine, easier to read.`
                    : "Your system manual, easier to read."}
            </p>

            <SearchBox autoFocus />

            <div className="mt-5 flex flex-wrap justify-center gap-2">
                {QUICK.map(([s, n]) => (
                    <Link
                        key={n}
                        to={`/man/${s}/${n}`}
                        className="rounded-full border border-[var(--border)] px-3 py-1 font-mono text-sm text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                        {n}({s})
                    </Link>
                ))}
            </div>

            {error && (
                <p className="mt-10 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                    Couldn't reach the backend: {error}. Is <code>uvicorn main:app</code>{" "}
                    running?
                </p>
            )}

            {sections.length > 0 && (
                <section className="mt-16 w-full">
                    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Browse by section
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {sections.map((s) => (
                            <Link
                                key={s.id}
                                to={`/section/${s.id}`}
                                className="group flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--accent)]"
                            >
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-bg)] font-mono text-lg font-bold text-[var(--accent)]">
                                    {s.id}
                                </span>
                                <span className="min-w-0">
                                    <span className="block font-medium text-[var(--fg)]">
                                        {s.name}
                                    </span>
                                    <span className="text-sm text-[var(--muted)]">
                                        {s.count.toLocaleString()} pages
                                    </span>
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
