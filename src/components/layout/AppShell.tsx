import { Outlet, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppShell() {
    return (
        <div className="min-h-screen bg-background text-foreground font-sans">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center">
                    <div className="mr-4 hidden md:flex">
                        <Link to="/" className="mr-6 flex items-center space-x-2">
                            <span className="hidden font-bold sm:inline-block">Decano Astrológico</span>
                        </Link>
                        <nav className="flex items-center space-x-6 text-sm font-medium">
                            <Link to="/" className="transition-colors hover:text-foreground/80 text-foreground/60">Dashboard</Link>
                            <Link to="/reports" className="transition-colors hover:text-foreground/80 text-foreground/60">Informes</Link>
                        </nav>
                    </div>
                </div>
            </header>
            <main className="flex-1">
                <div className="container py-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
