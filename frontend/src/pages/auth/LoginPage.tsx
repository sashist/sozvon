import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const PANEL_COLOR = '#2563eb';

export function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            await login({ email, password });
            navigate('/');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } };
            setError(error.response?.data?.detail || 'Ошибка входа. Проверьте email и пароль.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 grid lg:grid-cols-2 grid-cols-1 bg-white overflow-hidden">
            <aside
                className="hidden lg:flex flex-col justify-between p-20 text-white relative overflow-hidden"
                style={{ background: PANEL_COLOR }}
            >
                <div className="absolute pointer-events-none bg-white rounded-full"
                     style={{ top: 0, bottom: 0, right: -140, width: 280 }} />

                <div className="relative z-10 flex items-center gap-2">
                    <img src="/sozvon_logo.svg" alt="Созвон" className="h-9 w-auto brightness-0 invert" />
                </div>

                <div className="relative z-10 max-w-[78%]">
                    <h2 className="m-0 font-bold leading-[1.1] tracking-tight"
                        style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}>
                        Добро пожаловать!
                    </h2>
                    <p className="mt-3 mb-7 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Ещё нет аккаунта?
                    </p>
                    <Link
                        to="/auth/register"
                        className="inline-flex items-center justify-center h-11 px-8 rounded-full font-semibold text-sm text-white transition-all hover:bg-white hover:text-blue-600"
                        style={{ border: '1.5px solid rgba(255,255,255,0.85)', textDecoration: 'none' }}
                    >
                        Регистрация
                    </Link>
                </div>

                <div className="relative z-10 text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    © 2026 СОЗВОН
                </div>
            </aside>

            <section className="flex flex-col items-center justify-center px-6 lg:px-16 py-12 overflow-y-auto">
                <div className="w-full max-w-[420px]">
                    <div className="lg:hidden flex justify-center mb-8">
                        <img src="/sozvon_logo.svg" alt="Созвон" className="h-16 w-auto" />
                    </div>

                    <h1 className="text-center font-bold tracking-tight text-slate-900 mb-7"
                        style={{ fontSize: 36, letterSpacing: '-0.02em' }}>
                        Войти
                    </h1>

                    <form onSubmit={handleSubmit} noValidate>
                        {error && (
                            <div className="mb-4 px-4 py-3 rounded-[10px] text-sm text-red-600"
                                 style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                {error}
                            </div>
                        )}

                        <div className="relative mb-4">
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                required
                                autoComplete="email"
                                autoFocus
                                className="w-full text-slate-900 rounded-xl border-0 text-[15px] placeholder:text-slate-500
                                           transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-white
                                           hover:bg-slate-200/60"
                                style={{ height: 52, background: '#f1f5f9', padding: '0 48px 0 18px', fontFamily: 'inherit' }}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none flex">
                                <Mail size={18} />
                            </span>
                        </div>

                        <div className="relative">
                            <input
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Пароль"
                                required
                                autoComplete="current-password"
                                onKeyDown={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                                className="w-full text-slate-900 rounded-xl border-0 text-[15px] placeholder:text-slate-500
                                           transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-white
                                           hover:bg-slate-200/60"
                                style={{ height: 52, background: '#f1f5f9', padding: '0 48px 0 18px', fontFamily: 'inherit' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                tabIndex={-1}
                                aria-label="Показать пароль"
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-0 p-1.5 cursor-pointer text-slate-500 hover:text-slate-900 transition-colors flex"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {capsLock && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <span className="inline-grid place-items-center w-4 h-4 rounded text-[10px] font-bold text-slate-700"
                                      style={{ background: '#e2e8f0' }}>A</span>
                                Включён Caps Lock
                            </div>
                        )}

                        <div className="mt-4" />

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full border-0 rounded-xl text-white font-semibold text-base cursor-pointer flex items-center justify-center gap-2.5 transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ height: 52, fontFamily: 'inherit' }}
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            Войти
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-500 lg:hidden">
                        Нет аккаунта?{' '}
                        <Link to="/auth/register"
                              className="font-semibold text-blue-600 hover:text-blue-500 transition-colors no-underline">
                            Зарегистрироваться
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}
