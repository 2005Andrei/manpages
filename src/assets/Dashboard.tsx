import { useState } from "react";
import type { SearchResult } from "../utils/types";

export default function Dashboard() {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    // const [titles, setTitle] = useState();

    const mock_data: SearchResult[] = [
        {
            id: "1",
            title: "stdlib",
            path: "man1",
        },
        {
            id: "2",
            title: "systemd",
            path: "sth",
        },
        {
            id: "3",
            title: "systemctl",
            path: "dif",
        },
        {
            id: "4",
            title: "uint32_t",
            path: "types",
        },
        {
            id: "5",
            title: "uit64_t",
            path: "more types",
        },
    ];

    const results = mock_data.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()),
    );

    function handleClick() {
        setIsOpen(true);
    }

    return (
        <div className="flex justify-center w-200 p-6 bg-transparent min-h-[100px]">
            <div onClick={handleClick} className="relative w-200 max-w-md">
                <div className="relative z-10">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                        <svg
                            className="w-5 h-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                            />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="w-full py-3 pl-12 pr-4 text-sm text-gray-700 transition-all duration-300 bg-white border border-gray-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 shadow-sm"
                        placeholder="Search for man pages.."
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>

                <div
                    className={`absolute left-0 right-0 mt-1 overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-xl transition-all duration-200 origin-top ${
                        isOpen && query.length > 0
                            ? "opacity-100 scale-y-100 translate-y-0 visible"
                            : "opacity-0 scale-y-95 -translate-y-2 invisible"
                    }`}
                >
                    {results.length > 0 ? (
                        <ul className="py-2 max-h-72 overflow-y-auto custom-scrollbar">
                            {results.map((result) => (
                                <li key={result.id}>
                                    <button
                                        className="w-full flex flex-col px-4 py-3 text-left transition-colors hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                        onClick={() => {
                                            setQuery(result.title);
                                            setIsOpen(false);
                                        }}
                                    >
                                        <span className="text-sm font-medium text-gray-900">
                                            {result.title}
                                        </span>
                                        <span className="text-xs text-gray-500 mt-0.5">
                                            {result.path}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-gray-500">
                                No results found for "
                                <span className="font-medium text-gray-900">
                                    {query}
                                </span>
                                "
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
