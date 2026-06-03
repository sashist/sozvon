import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <h1 className="text-6xl font-bold text-slate-900">404</h1>
            <p className="mt-4 text-lg text-slate-500">Страница не найдена</p>
            <Button asChild className="mt-6 bg-blue-600 hover:bg-blue-700">
                <Link to="/">
                    <Home className="h-4 w-4 mr-2" />
                    На главную
                </Link>
            </Button>
        </div>
    );
}
