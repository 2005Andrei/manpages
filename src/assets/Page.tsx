import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import Contents from "./Contents";
import { prettyHeading } from "../utils/format";
import TopBar from "../components/TopBar";
import { getPage, pageUrl } from "../utils/api";
import type { ManPage } from "../utils/types";
import "../styles/Page.css";

export function Page() {
    const { section, name = "" } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const articleRef = useRef<HTMLElement>(null);
    const [page, setPage] = useState<ManPage | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);

    useEffect(() => {
        const ctrl = new AbortController();
        setError(null);
        getPage(section, name, ctrl.signal)
            .then((p) => {
                setPage(p);
                if (p.section !== section || p.name !== name) {
                    navigate(pageUrl(p.section, p.name) + location.hash, {
                        replace: true,
                    });
                }
            })
            .catch((e) => {
                if (e.name !== "AbortError") {
                    setPage(null);
                    setError(e.message);
                }
            });
        return () => ctrl.abort();
    }, [section, name]);

    useEffect(() => {
        if (page) document.title = `${page.name}(${page.section}) · manface`;
    }, [page]);

    const toc = useMemo(
        () => (page?.toc ?? []).filter((t) => t.id !== "name"),
        [page],
    );

    useEffect(() => {
        const el = articleRef.current;
        if (!page || !el) return;

        const hash = decodeURIComponent(location.hash.slice(1));
        const target = hash ? document.getElementById(hash) : null;
        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);

        const headings = Array.from(
            el.querySelectorAll<HTMLElement>("h1[id], h2[id]"),
        );
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );
                if (visible[0]) setActiveId(visible[0].target.id);
            },
            { rootMargin: "-80px 0px -70% 0px" },
        );
        headings.forEach((h) => observer.observe(h));
        return () => observer.disconnect();
    }, [page]);

    function onArticleClick(e: React.MouseEvent) {
        const a = (e.target as HTMLElement).closest("a");
        if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0)
            return;
        const href = a.getAttribute("href") ?? "";
        if (href.startsWith("/man/")) {
            e.preventDefault();
            navigate(href);
        } else if (href.startsWith("#")) {
            e.preventDefault();
            document
                .getElementById(decodeURIComponent(href.slice(1)))
                ?.scrollIntoView({
                    behavior: "smooth",
                });
            history.replaceState(null, "", href);
        }
    }

    return (
        <>
            <TopBar />
            {error ? (
                <div className="mx-auto max-w-2xl px-4 py-24 text-center">
                    <p className="mb-2 font-mono text-2xl text-[var(--fg)]">
                        {name}
                        {section ? `(${section})` : ""}
                    </p>
                    <p className="mb-8 text-[var(--muted)]">{error}</p>
                    <Link
                        to="/"
                        className="text-[var(--accent)] hover:underline"
                    >
                        Back to search
                    </Link>
                </div>
            ) : !page ? (
                <div className="mx-auto max-w-3xl animate-pulse px-4 py-16">
                    <div className="mb-4 h-10 w-1/3 rounded bg-[var(--border)]" />
                    <div className="mb-12 h-5 w-2/3 rounded bg-[var(--border)]" />
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className="mb-3 h-4 rounded bg-[var(--border)]"
                        />
                    ))}
                </div>
            ) : (
                <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 px-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
                    <aside className="hidden lg:block">
                        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-10 pr-2">
                            <Contents toc={toc} active={activeId} />
                        </div>
                    </aside>

                    <main className="min-w-0 max-w-3xl py-10">
                        <header className="mb-10 border-b border-[var(--border)] pb-8">
                            <p className="mb-3 font-mono text-sm text-[var(--muted)]">
                                <Link
                                    to={`/section/${page.section[0]}`}
                                    className="hover:text-[var(--accent)]"
                                >
                                    section {page.section}
                                </Link>
                                {page.otherSections.length > 0 && (
                                    <>
                                        {" · also in "}
                                        {page.otherSections.map((s, i) => (
                                            <span key={s}>
                                                {i > 0 && ", "}
                                                <Link
                                                    to={pageUrl(s, page.name)}
                                                    className="text-[var(--accent)] hover:underline"
                                                >
                                                    {s}
                                                </Link>
                                            </span>
                                        ))}
                                    </>
                                )}
                            </p>
                            <h1 className="mb-3 break-words font-mono text-4xl font-bold tracking-tight text-[var(--fg)]">
                                {page.name}
                                <span className="font-normal text-[var(--muted)]">
                                    ({page.section})
                                </span>
                            </h1>
                            {page.description && (
                                <p className="text-xl text-[var(--muted)]">
                                    {page.description}
                                </p>
                            )}
                        </header>

                        {toc.length > 0 && (
                            <details className="mb-8 rounded-lg border border-[var(--border)] px-4 py-2 lg:hidden">
                                <summary className="cursor-pointer text-sm font-medium text-[var(--fg)]">
                                    Contents
                                </summary>
                                <ol className="mt-2 space-y-1 text-sm">
                                    {toc.map((t) => (
                                        <li
                                            key={t.id}
                                            className={
                                                t.level > 1 ? "pl-4" : ""
                                            }
                                        >
                                            <a
                                                href={`#${t.id}`}
                                                className="text-[var(--muted)]"
                                            >
                                                {prettyHeading(t.text)}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        )}

                        <article
                            ref={articleRef}
                            className="man"
                            onClick={onArticleClick}
                            dangerouslySetInnerHTML={{ __html: page.html }}
                        />

                        {page.renderedWith === "man" && (
                            <p className="mt-8 text-xs text-[var(--muted)]">
                                pandoc couldn't parse this page, so this is
                                plain <code>man</code> output.
                            </p>
                        )}
                    </main>
                </div>
            )}
        </>
    );
}
