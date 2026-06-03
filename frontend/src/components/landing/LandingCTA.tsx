import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

/**
 * Финальная CTA секция — голубой gradient.
 */
export function LandingCTA() {
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <section className="py-20 px-6 bg-slate-50/50">
            <div ref={ref} className="max-w-7xl mx-auto">
                <div className={cn(
                    'relative rounded-[2.5rem] overflow-hidden px-6 py-20 md:py-24 text-center landing-fade-in',
                    isInView && 'in-view'
                )}>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500" />

                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-3xl" />
                        <div className="absolute inset-0 opacity-[0.07]" style={{
                            backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
                            backgroundSize: '30px 30px',
                        }} />
                    </div>

                    <div className="relative z-10 max-w-4xl mx-auto">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-8 leading-[1.1] tracking-tight">
                            Готовы забыть
                            <br className="hidden md:block" />
                            о хаосе в расписании?
                        </h2>

                        <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
                            Создайте аккаунт за 30 секунд и начните принимать
                            записи уже сегодня. Без привязки карты.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/auth/register" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto bg-white text-blue-600 hover:bg-blue-50 rounded-full h-14 px-10 text-base font-bold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer">
                                    Начать бесплатно
                                    <ArrowRight className="h-5 w-5" />
                                </button>
                            </Link>
                            <Link to="/auth/login" className="w-full sm:w-auto">
                                <button className="w-full sm:w-auto rounded-full h-14 px-10 text-base font-semibold border border-white/30 text-white hover:bg-white/10 transition-all bg-transparent backdrop-blur-sm flex items-center justify-center cursor-pointer">
                                    Войти в аккаунт
                                </button>
                            </Link>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
