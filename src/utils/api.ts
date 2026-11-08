import type { ManPage, SearchResponse, Section } from "./types";

async function get<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, { signal });
    if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`;
        try {
            detail = (await res.json()).detail ?? detail;
        } catch {}
        throw new Error(detail);
    }
    return res.json() as Promise<T>;
}

export function search(
    q: string,
    opts: { section?: string; limit?: number; signal?: AbortSignal } = {},
) {
    const params = new URLSearchParams({ q, limit: String(opts.limit ?? 20) });
    if (opts.section) params.set("section", opts.section);
    return get<SearchResponse>(`/api/search?${params}`, opts.signal);
}

export function getSections(signal?: AbortSignal) {
    return get<Section[]>("/api/sections", signal);
}

export function getPage(
    section: string | undefined,
    name: string,
    signal?: AbortSignal,
) {
    const n = encodeURIComponent(name);
    const url = section
        ? `/api/page/${encodeURIComponent(section)}/${n}`
        : `/api/page/${n}`;
    return get<ManPage>(url, signal);
}

export function pageUrl(section: string, name: string) {
    return `/man/${encodeURIComponent(section)}/${encodeURIComponent(name)}`;
}
