import { Star } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

const testimonials = [
    {
        name: 'Алексей С.',
        role: 'Тимлид',
        content: 'Раньше тратил часы на согласование времени для собеседований. Теперь просто отправляю ссылку — кандидаты записываются сами.',
        rating: 5,
        initials: 'АС',
        color: 'from-blue-500 to-sky-500',
    },
    {
        name: 'Мария В.',
        role: 'Психолог',
        content: 'Клиенты в восторге — записаться можно в пару кликов. Больше никаких переписок «а в среду можно?».',
        rating: 5,
        initials: 'МВ',
        color: 'from-sky-500 to-cyan-500',
    },
    {
        name: 'Дмитрий К.',
        role: 'Репетитор',
        content: 'Подключил всех преподавателей нашей школы. Настроили расписание за вечер — работает безотказно.',
        rating: 5,
        initials: 'ДК',
        color: 'from-cyan-500 to-teal-500',
    },
];

/**
 * Секция отзывов — glassmorphism карточки.
 */
export function LandingTestimonials() {
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <section id="testimonials" className="landing-section relative">
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50/50 to-white" />

            <div ref={ref} className="max-w-7xl mx-auto px-6">
                <div className={cn('text-center mb-16 landing-fade-in', isInView && 'in-view')}>
                    <h2 className="landing-title font-extrabold text-slate-900 mb-6">
                        Нам доверяют{' '}
                        <span className="landing-gradient-text-static">профессионалы</span>
                    </h2>
                    <p className="landing-subtitle text-slate-500 max-w-2xl mx-auto">
                        Узнайте, что говорят наши пользователи о сервисе
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {testimonials.map((t, i) => (
                        <div
                            key={t.name}
                            className={cn(
                                'landing-fade-in glass-card rounded-2xl p-8 group hover:scale-[1.02] transition-transform duration-300',
                                isInView && 'in-view'
                            )}
                            style={{ transitionDelay: isInView ? `${i * 100}ms` : '0ms' }}
                        >
                            <div className="flex gap-1 mb-6">
                                {[...Array(t.rating)].map((_, j) => (
                                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                ))}
                            </div>

                            <p className="text-slate-600 mb-8 leading-relaxed">
                                «{t.content}»
                            </p>

                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    'h-11 w-11 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm',
                                    t.color
                                )}>
                                    {t.initials}
                                </div>
                                <div>
                                    <div className="font-semibold text-slate-900 text-sm">{t.name}</div>
                                    <div className="text-xs text-slate-400">{t.role}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
