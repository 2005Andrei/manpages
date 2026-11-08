import type { TocEntry } from "../utils/types";
import { prettyHeading } from "../utils/format";

interface Props {
    toc: TocEntry[];
    active: string | null;
}

export default function Contents({ toc, active }: Props) {
    if (toc.length === 0) return null;
    return (
        <nav aria-label="Contents" className="text-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                On this page
            </p>
            <ol className="space-y-1 border-l border-[var(--border)]">
                {toc.map((t) => (
                    <li key={t.id}>
                        <a
                            href={`#${t.id}`}
                            className={`-ml-px block border-l-2 py-0.5 transition ${
                                t.level > 1 ? "pl-7 text-[0.8rem]" : "pl-4"
                            } ${
                                active === t.id
                                    ? "border-[var(--accent)] text-[var(--accent)]"
                                    : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
                            }`}
                        >
                            {prettyHeading(t.text)}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
}
