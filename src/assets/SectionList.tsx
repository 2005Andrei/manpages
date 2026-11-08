import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import TopBar from "../components/TopBar";
import { getSections, pageUrl, search } from "../utils/api";
import type { SearchResult, Section } from "../utils/types";

const PAGE = 200;

export default function SectionListRoute() {
    const { id = "1" } = useParams();
    return <SectionList key={id} id={id} />;
}

function SectionList({ id }: { id: string }) {
    const [info, setInfo] = useState<Section | null>(null);
    const [filter, setFilter] = useState("");
    const [items, setItems] = useState<SearchResult[]>([]);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState(PAGE);

    useEffect(() => {
        getSections().then((all) =>
            setInfo(all.find((s) => s.id === id) ?? null),
        );
    }, [id]);

    useEffect(() => {
        const ctrl = new AbortController();
        const t = setTimeout(() => {
            search(filter, { section: id, limit, signal: ctrl.signal })
                .then((r) => {
                    setItems(r.results);
                    setTotal(r.total);
                })
                .catch(() => {});
        }, 100);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [id, filter, limit]);

    return (
        <>
            <TopBar />
            <div className="mx-auto w-full max-w-5xl px-4 py-10">
                <h1 className="mb-1 text-3xl font-bold text-[var(--fg)]">
                    <span className="font-mono text-[var(--accent)]">{id}</span>{" "}
                    {info?.name ?? `Section ${id}`}
                </h1>
                <p className="mb-6 text-[var(--muted)]">
                    {total.toLocaleString()} pages
                </p>
                <input
                    type="search"
                    value={filter}
                    onChange={(e) => {
                        setFilter(e.target.value);
                        setLimit(PAGE);
                    }}
                    placeholder={`Filter section ${id}…`}
                    className="mb-6 w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                />
                <ul className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                    {items.map((r) => (
                        <li key={`${r.name}.${r.section}`}>
                            <Link
                                to={pageUrl(r.section, r.name)}
                                className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-[var(--accent-bg)] sm:flex-row sm:items-baseline sm:gap-4"
                            >
                                <span className="shrink-0 font-mono text-sm font-semibold text-[var(--fg)] sm:w-64 sm:truncate">
                                    {r.name}
                                    <span className="font-normal text-[var(--muted)]">
                                        ({r.section})
                                    </span>
                                </span>
                                <span className="truncate text-sm text-[var(--muted)]">
                                    {r.description}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
                {items.length < total && (
                    <button
                        onClick={() => setLimit((l) => l + PAGE)}
                        className="mx-auto mt-6 block rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--fg)] hover:border-[var(--accent)]"
                    >
                        Show more ({(total - items.length).toLocaleString()}{" "}
                        left)
                    </button>
                )}
            </div>
        </>
    );
}
