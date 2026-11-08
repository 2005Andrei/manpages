import "./App.css";
import { Page } from "./assets/Page";
import Dashboard from "./assets/Dashboard";
import SectionList from "./assets/SectionList";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/section/:id" element={<SectionList />} />
                <Route path="/man/:name" element={<Page />} />
                <Route path="/man/:section/:name" element={<Page />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
