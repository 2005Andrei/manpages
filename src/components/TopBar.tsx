import { Link } from "react-router-dom";
import SearchBox from "./SearchBox";

export default function TopBar() {
    return (
        <header className="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
                <Link to="/" className="shrink-0 font-mono text-xl font-bold text-[var(--fg)]">
                    man<span className="text-[var(--accent)]">face</span>
                </Link>
                <SearchBox compact />
            </div>
        </header>
    );
}
