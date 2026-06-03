import { Bell, Link2, Sparkles } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

const steps = [
    {
        num: '01',
        title: 'Создайте событие',
        description: 'Укажите название, длительность и рабочие часы. Настройка займёт пару минут.',
        icon: Sparkles,
        color: 'from-blue-500 to-sky-500',
        shadow: 'shadow-blue-500/20',
    },
    {
        num: '02',
        title: 'Поделитесь ссылкой',
        description: 'Отправьте персональную ссылку клиенту — в мессенджер, email или разместите в соцсетях.',
        icon: Link2,
        color: 'from-sky-500 to-cyan-500',
        shadow: 'shadow-sky-500/20',
    },
    {
        num: '03',
        title: 'Получите бронирование',
        description: 'Клиент выбирает время, заполняет форму — и вы получаете подтверждённую запись.',
        icon: Bell,
        color: 'from-cyan-500 to-teal-500',
        shadow: 'shadow-cyan-500/20',
    },
];

/**
 * Секция «Как это работает» — три шага с соединительной линией.
 */
export function LandingHowItWorks() {
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <section id="how-it-works" className="landing-section relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-blue-50/30 to-white" />

            <div ref={ref} className="max-w-7xl mx-auto px-6">
                <div className={cn('text-center mb-16 landing-fade-in', isInView && 'in-view')}>
                    <h2 className="landing-title font-extrabold text-slate-900 mb-6">
                        Как это работает
                    </h2>
                    <p className="landing-subtitle text-slate-500 max-w-2xl mx-auto">
                        Простой путь от настройки календаря до первой встречи
                    </p>
                </div>

                <div className="relative grid md:grid-cols-3 gap-10">
                    <div className="hidden md:block absolute top-[4.5rem] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-blue-200 via-sky-200 to-cyan-200" />

                    {steps.map((step, i) => (
                        <div
                            key={step.num}
                            className={cn(
                                'landing-fade-in relative flex flex-col items-center text-center group',
                                isInView && 'in-view'
                            )}
                            style={{ transitionDelay: isInView ? `${i * 150}ms` : '0ms' }}
                        >
                            <div className="relative mb-8 z-10">
                                <div className={cn(
                                    'h-[8.5rem] w-[8.5rem] rounded-[2rem] bg-gradient-to-br flex items-center justify-center transition-all duration-300 group-hover:scale-105 shadow-xl',
                                    step.color,
                                    step.shadow
                                )}>
                                    <step.icon className="h-12 w-12 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 h-10 w-10 rounded-xl bg-white border border-slate-100 shadow-lg flex items-center justify-center text-base font-bold text-slate-900">
                                    {step.num}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                                {step.title}
                            </h3>
                            <p className="text-slate-500 max-w-xs leading-relaxed">
                                {step.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
