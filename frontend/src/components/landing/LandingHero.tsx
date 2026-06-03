import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Zap } from 'lucide-react';

/**
 * Hero-секция — текст слева, мок-интерфейс справа.
 * Уменьшенный заголовок, кнопки видны без скролла.
 */
export function LandingHero() {
    return (
        <section className="relative min-h-[calc(100vh-64px)] flex items-center overflow-hidden pt-20 pb-12">
            <div className="absolute inset-0 -z-10">
                <div className="landing-mesh-blob" style={{
                    width: '700px', height: '700px',
                    background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                    top: '-15%', left: '-10%',
                    animationDelay: '0s',
                }} />
                <div className="landing-mesh-blob" style={{
                    width: '500px', height: '500px',
                    background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                    top: '10%', right: '-5%',
                    animationDelay: '-3s',
                    animationDuration: '10s',
                }} />
                <div className="landing-mesh-blob" style={{
                    width: '400px', height: '400px',
                    background: 'linear-gradient(135deg, #cffafe, #a5f3fc)',
                    bottom: '5%', left: '40%',
                    animationDelay: '-6s',
                    animationDuration: '12s',
                }} />
                <div className="dot-pattern absolute inset-0" />
            </div>

            <div className="max-w-7xl mx-auto px-6 relative w-full">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

                    <div className="flex-1 text-center lg:text-left">
                        <h1 className="landing-title-hero font-extrabold text-slate-900 tracking-tight mb-6 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100">
                            Планируйте встречи{' '}
                            <span className="landing-gradient-text">
                                без лишних переписок
                            </span>
                        </h1>

                        <p className="landing-subtitle text-slate-500 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
                            Создайте персональную страницу с расписанием, поделитесь ссылкой —
                            и позвольте клиентам самим выбирать удобное время для встречи.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300">
                            <Link to="/auth/register" className="w-full sm:w-auto">
                                <button className="glow-button w-full sm:w-auto rounded-full h-12 px-8 text-sm font-bold text-white flex items-center justify-center gap-2 cursor-pointer">
                                    Начать бесплатно
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </Link>
                            <Link to="/auth/login" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto rounded-full h-12 px-8 text-sm font-semibold text-slate-700 border border-slate-200 hover:border-blue-200 hover:bg-blue-50/50 flex items-center justify-center cursor-pointer transition-all">
                                    Войти в аккаунт
                                </button>
                            </Link>
                        </div>
                    </div>

                    <div className="flex-1 w-full max-w-[520px] lg:max-w-none animate-in fade-in slide-in-from-right-10 duration-1000 delay-300">
                        <div className="relative group landing-float">
                            <div className="absolute -inset-3 bg-gradient-to-r from-blue-200/40 to-sky-200/40 rounded-3xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                            <div className="relative glass-card rounded-2xl overflow-hidden">
                                <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
                                    </div>
                                    <div className="flex-1 text-center">
                                        <div className="inline-block px-4 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[11px] text-slate-400 font-mono">
                                            sozvon.app/alex
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 md:p-7 bg-white/50">
                                    <div className="flex items-start gap-4 mb-6">
                                        <div className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                            <Calendar className="h-5 w-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm text-slate-900">Александр Макаров</h3>
                                            <p className="text-slate-400 text-xs mt-0.5">Product Designer</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-5">
                                        {[
                                            { title: 'Быстрый звонок', time: '15 мин', icon: Zap, bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100' },
                                            { title: 'Консультация', time: '60 мин', icon: Clock, bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' },
                                        ].map((item) => (
                                            <div key={item.title} className={`p-3 rounded-xl ${item.bg} border ${item.border} cursor-pointer hover:scale-[1.02] transition-transform`}>
                                                <div className="flex justify-between items-start mb-1.5">
                                                    <span className={`font-semibold text-sm ${item.text}`}>{item.title}</span>
                                                    <item.icon className={`h-4 w-4 ${item.text} opacity-50`} />
                                                </div>
                                                <div className={`text-xs font-medium ${item.text} opacity-60`}>{item.time}</div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-sm mb-3">
                                            <span className="font-medium text-slate-700">Свободные слоты</span>
                                            <span className="text-slate-400 text-xs">Сегодня</span>
                                        </div>
                                        <div className="flex gap-2 flex-wrap">
                                            {['10:00', '11:30', '14:00', '16:30'].map((t, i) => (
                                                <div
                                                    key={t}
                                                    className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${i === 2
                                                        ? 'bg-gradient-to-r from-blue-500 to-sky-500 text-white shadow-md shadow-blue-500/20'
                                                        : 'bg-slate-50 text-slate-600 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                                        }`}
                                                >
                                                    {t}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
