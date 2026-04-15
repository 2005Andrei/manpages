import { useEffect, useState } from "react";
import "./App.css";
import { Page } from "./assets/Page";
import type { SearchResult } from "./utils/types";
import Dashboard from "./assets/Dashboard";
import {
    BrowserRouter,
    Navigate,
    Route,
    Router,
    Routes,
} from "react-router-dom";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/man/:path" element={<Page />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
