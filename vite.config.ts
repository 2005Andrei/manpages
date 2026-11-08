import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        // `bun run dev` talks to `manpage serve` running on its default port
        proxy: { "/api": "http://127.0.0.1:8642" },
    },
});
