import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import LegacyDashboard from "@/pages/LegacyDashboard";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<AppShell />}>
                    <Route path="/" element={<LegacyDashboard />} />
                    {/* Aquí registraremos nuevas páginas a medida que migremos */}
                </Route>
            </Routes>
        </BrowserRouter>
    );
}
