import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';

export function AppLayout() {
    return (
        <div className="min-h-screen bg-slate-50">
            <Navbar />
            <main className="container mx-auto px-4 py-6 pb-24 md:py-8 md:pb-8">
                <Outlet />
            </main>
        </div>
    );
}
