import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Eye, EyeOff, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const PANEL_COLOR = '#2563eb';

const registerSchema = z.object({
    full_name: z.string().min(2, 'Укажите имя и фамилию').refine(v => v.trim().includes(' '), 'Введите имя и фамилию'),
    email: z.string().email('Неверный формат email'),
    password: z.string().min(6, 'Минимум 6 символов'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine(val => val === true, {
        message: 'Необходимо согласие на обработку персональных данных',
    }),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

function scorePassword(p: string): number {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s += 1;
    if (p.length >= 10) s += 1;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s += 1;
    if (/\d/.test(p) && /[^a-zA-Z0-9]/.test(p)) s += 1;
    return Math.min(3, s);
}

const STRENGTH_COLORS = ['#dc2626', '#d59025', '#16a34a'];

export function RegisterPage() {
    const navigate = useNavigate();
    const { register: registerAuth } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [showPw, setShowPw] = useState(false);
    const [showPw2, setShowPw2] = useState(false);

    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            full_name: '',
            email: '',
            password: '',
            confirmPassword: '',
            acceptTerms: false,
        },
    });

    const password = watch('password') ?? '';
    const acceptTerms = watch('acceptTerms');
    const score = scorePassword(password);

    const onSubmit = async (data: RegisterFormValues) => {
        setApiError(null);
        setIsLoading(true);
        try {
            await registerAuth({
                email: data.email,
                password: data.password,
                full_name: data.full_name,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            });
            navigate('/');
        } catch (err: unknown) {
            const error = err as { response?: { data?: { detail?: string } } };
            setApiError(error.response?.data?.detail || 'Ошибка регистрации. Попробуйте другой email.');
        } finally {
            setIsLoading(false);
        }
    };

    const fieldClass = (hasError?: boolean) =>
        `w-full text-slate-900 rounded-xl border-0 text-[15px] placeholder:text-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:bg-white hover:bg-slate-200/60 ${
            hasError
                ? 'ring-2 ring-inset ring-red-200 bg-red-50 focus:ring-red-600'
                : 'focus:ring-blue-600'
        }`;

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
                        С возвращением!
                    </h2>
                    <p className="mt-3 mb-7 text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        Уже есть аккаунт?
                    </p>
                    <Link
                        to="/auth/login"
                        className="inline-flex items-center justify-center h-11 px-8 rounded-full font-semibold text-sm text-white transition-all hover:bg-white hover:text-indigo-600"
                        style={{ border: '1.5px solid rgba(255,255,255,0.85)', textDecoration: 'none' }}
                    >
                        Войти
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
                        Регистрация
                    </h1>

                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        {apiError && (
                            <div className="mb-4 px-4 py-3 rounded-[10px] text-sm text-red-600"
                                 style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                                {apiError}
                            </div>
                        )}

                        <div className="relative mb-4">
                            <input
                                type="text"
                                placeholder="Имя и фамилия"
                                autoComplete="name"
                                {...register('full_name')}
                                className={fieldClass(!!errors.full_name)}
                                style={{ height: 52, background: errors.full_name ? '#fef2f2' : '#f1f5f9', padding: '0 48px 0 18px', fontFamily: 'inherit' }}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none flex">
                                <User size={18} />
                            </span>
                            {errors.full_name && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-red-600">
                                    <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                                    {errors.full_name.message}
                                </div>
                            )}
                        </div>

                        <div className="relative mb-4">
                            <input
                                type="email"
                                placeholder="you@example.com"
                                autoComplete="email"
                                {...register('email')}
                                className={fieldClass(!!errors.email)}
                                style={{ height: 52, background: errors.email ? '#fef2f2' : '#f1f5f9', padding: '0 48px 0 18px', fontFamily: 'inherit' }}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none flex">
                                <Mail size={18} />
                            </span>
                            {errors.email && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-red-600">
                                    <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                                    {errors.email.message}
                                </div>
                            )}
                        </div>

                        <div className="relative mb-4">
                            <input
                                type={showPw ? 'text' : 'password'}
                                placeholder="Минимум 6 символов"
                                autoComplete="new-password"
                                {...register('password')}
                                className={fieldClass(!!errors.password)}
                                style={{ height: 52, background: errors.password ? '#fef2f2' : '#f1f5f9', padding: '0 48px 0 18px', fontFamily: 'inherit' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                tabIndex={-1}
                                aria-label="Показать пароль"
                                className="absolute right-4 top-[26px] -translate-y-1/2 bg-transparent border-0 p-1.5 cursor-pointer text-slate-500 hover:text-slate-900 transition-colors flex"
                            >
                                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            {errors.password && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-red-600">
                                    <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                                    {errors.password.message}
                                </div>
                            )}
                            {password && !errors.password && (
                                <div className="flex gap-1 mt-2">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="flex-1 h-[3px] rounded-sm transition-colors duration-200"
                                             style={{ background: score > i ? STRENGTH_COLORS[score - 1] : '#e2e8f0' }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="relative mb-4">
                            <input
                                type={showPw2 ? 'text' : 'password'}
                                placeholder="Повторите пароль"
                                autoComplete="new-password"
                                {...register('confirmPassword')}
                                className={fieldClass(!!errors.confirmPassword)}
                                style={{ height: 52, background: errors.confirmPassword ? '#fef2f2' : '#f1f5f9', padding: '0 48px 0 18px', fontFamily: 'inherit' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw2(v => !v)}
                                tabIndex={-1}
                                aria-label="Показать пароль"
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-0 p-1.5 cursor-pointer text-slate-500 hover:text-slate-900 transition-colors flex"
                            >
                                {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            {errors.confirmPassword && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-red-600">
                                    <span className="w-[5px] h-[5px] rounded-full bg-current flex-shrink-0" />
                                    {errors.confirmPassword.message}
                                </div>
                            )}
                        </div>

                        <label className="flex gap-2.5 items-start text-[13px] leading-relaxed text-slate-700 mb-[18px] mt-1 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={acceptTerms === true}
                                onChange={(e) => setValue('acceptTerms', e.target.checked, { shouldValidate: true })}
                            />
                            <span
                                className="flex-shrink-0 w-[18px] h-[18px] rounded-[5px] mt-px inline-grid place-items-center transition-all"
                                style={{
                                    background: acceptTerms ? '#2563eb' : '#f1f5f9',
                                    border: `1.5px solid ${errors.acceptTerms && !acceptTerms ? '#fecaca' : acceptTerms ? '#2563eb' : '#e2e8f0'}`,
                                }}
                            >
                                {acceptTerms && (
                                    <svg viewBox="0 0 9 6" width="9" height="6" fill="none">
                                        <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                            <span>
                                Я согласен(на) на{' '}
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <span className="text-blue-600 hover:underline cursor-pointer"
                                              onClick={e => e.stopPropagation()}>
                                            обработку персональных данных
                                        </span>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col p-0">
                                        <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
                                            <DialogHeader>
                                                <DialogTitle className="text-xl">Согласие на обработку персональных данных</DialogTitle>
                                                <DialogDescription className="mt-1.5">
                                                    Пожалуйста, внимательно ознакомьтесь с условиями.
                                                </DialogDescription>
                                            </DialogHeader>
                                        </div>
                                        <div className="flex-1 overflow-y-auto p-6 pt-4 text-sm text-slate-600 leading-relaxed space-y-4">
                                            <p>
                                                Настоящим я, во исполнение требований Федерального закона от 27.07.2006 г. № 152-ФЗ
                                                «О персональных данных», свободно, своей волей и в своём интересе даю согласие сервису{' '}
                                                <strong>Созвон</strong> на обработку своих персональных данных.
                                            </p>
                                            <h4 className="font-semibold text-slate-900">1. Перечень обрабатываемых данных</h4>
                                            <p>
                                                Фамилия, имя, адрес электронной почты, часовой пояс, данные об использовании сервиса.
                                            </p>
                                            <h4 className="font-semibold text-slate-900">2. Цели обработки</h4>
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>регистрация и поддержание учётной записи;</li>
                                                <li>предоставление доступа к функционалу планирования встреч;</li>
                                                <li>направление сервисных уведомлений;</li>
                                                <li>улучшение качества работы приложения.</li>
                                            </ul>
                                            <h4 className="font-semibold text-slate-900">3. Срок действия согласия</h4>
                                            <p>
                                                Согласие действует бессрочно и может быть отозвано путём удаления аккаунта в настройках профиля.
                                            </p>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                                {' '}и принимаю условия оферты.
                                {errors.acceptTerms && (
                                    <span className="block text-red-600 mt-1" style={{ fontSize: 12.5 }}>
                                        {errors.acceptTerms.message}
                                    </span>
                                )}
                            </span>
                        </label>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full border-0 rounded-xl text-white font-semibold text-base cursor-pointer flex items-center justify-center gap-2.5 transition-colors bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            style={{ height: 52, fontFamily: 'inherit' }}
                        >
                            {isLoading && <Loader2 size={16} className="animate-spin" />}
                            Зарегистрироваться
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-500 lg:hidden">
                        Уже есть аккаунт?{' '}
                        <Link to="/auth/login"
                              className="font-semibold text-blue-600 hover:text-blue-500 transition-colors no-underline">
                            Войти
                        </Link>
                    </p>
                </div>
            </section>
        </div>
    );
}
