import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navLinks = [
    { name: 'Возможности', href: '#features' },
    { name: 'Как это работает', href: '#how-it-works' },
    { name: 'Отзывы', href: '#testimonials' },
    { name: 'FAQ', href: '#faq' },
];

/**
 * Шапка лендинга — прозрачная, с blur при скролле. Голубые акценты.
 */
export function LandingHeader() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                'fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b bg-white/80 backdrop-blur-xl',
                isScrolled
                    ? 'border-slate-200/60 shadow-sm py-2'
                    : 'border-slate-100/50 py-3'
            )}
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">
                <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className="flex items-center gap-2.5 group cursor-pointer"
                >
                    <img
                        src="/sozvon_logo.svg"
                        alt="СозвON"
                        className="h-7 transition-transform group-hover:scale-105"
                    />
                </a>

                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <a
                            key={link.name}
                            href={link.href}
                            className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors duration-200"
                        >
                            {link.name}
                        </a>
                    ))}
                </nav>

                <div className="hidden md:flex items-center gap-3">
                    <Link to="/auth/login">
                        <button className="px-5 py-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                            Войти
                        </button>
                    </Link>
                    <Link to="/auth/register">
                        <button className="glow-button px-6 py-2.5 text-sm font-semibold text-white rounded-full cursor-pointer">
                            Начать бесплатно
                        </button>
                    </Link>
                </div>

                <button
                    className="md:hidden p-2 text-slate-600 hover:text-blue-600 rounded-lg transition-colors"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-xl p-4 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
                    <nav className="flex flex-col gap-1">
                        {navLinks.map((link) => (
                            <a
                                key={link.name}
                                href={link.href}
                                className="px-4 py-3 text-base font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {link.name}
                            </a>
                        ))}
                    </nav>
                    <div className="h-px bg-slate-100 mx-2" />
                    <div className="flex flex-col gap-3 p-2">
                        <Link to="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                            <button className="w-full py-3 text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 font-medium transition-colors cursor-pointer">
                                Войти
                            </button>
                        </Link>
                        <Link to="/auth/register" onClick={() => setMobileMenuOpen(false)}>
                            <button className="glow-button w-full py-3 text-white rounded-xl font-semibold cursor-pointer">
                                Начать бесплатно
                            </button>
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
