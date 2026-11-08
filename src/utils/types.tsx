export interface SearchResult {
    name: string;
    section: string;
    description: string;
}

export interface SearchResponse {
    total: number;
    results: SearchResult[];
}

export interface Section {
    id: string;
    name: string;
    count: number;
}

export interface TocEntry {
    id: string;
    text: string;
    level: number;
}

export interface ManPage extends SearchResult {
    html: string;
    toc: TocEntry[];
    renderedWith: "pandoc" | "man";
    otherSections: string[];
}
