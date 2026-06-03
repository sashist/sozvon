import { Calendar, Clock, Globe, Link2, Shield, Users } from 'lucide-react';
import { useInView } from '@/hooks/useInView';
import { cn } from '@/lib/utils';

const features = [
    {
        icon: Calendar,
        title: 'Гибкое расписание',
        description: 'Настройте рабочие часы для каждого дня недели. Добавьте исключения и выходные — система покажет клиентам только свободные слоты.',
        bg: 'bg-blue-50',
        iconColor: 'text-blue-600',
        size: 'large' as const,
    },
    {
        icon: Link2,
        title: 'Персональная ссылка',
        description: 'Поделитесь уникальной ссылкой с клиентами — они сами выберут удобное время.',
        bg: 'bg-sky-50',
        iconColor: 'text-sky-600',
        size: 'small' as const,
    },
    {
        icon: Users,
        title: 'Работа в команде',
        description: 'Объединяйте расписания, управляйте командой и распределяйте встречи.',
        bg: 'bg-cyan-50',
        iconColor: 'text-cyan-600',
        size: 'small' as const,
    },
    {
        icon: Shield,
        title: 'Защита от накладок',
        description: 'Автоматическая проверка пересечений не допустит двойных бронирований.',
        bg: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
        size: 'small' as const,
    },
    {
        icon: Clock,
        title: 'Буферное время',
        description: 'Настройте перерывы между встречами — 5, 10 или 15 минут.',
        bg: 'bg-amber-50',
        iconColor: 'text-amber-600',
        size: 'small' as const,
    },
    {
        icon: Globe,
        title: 'Часовые пояса',
        description: 'Клиенты из любого города видят доступное время в своём часовом поясе. Всё рассчитывается автоматически.',
        bg: 'bg-rose-50',
        iconColor: 'text-rose-600',
        size: 'large' as const,
    },
];

/**
 * Секция «Возможности» — Bento Grid с glassmorphism карточками.
 */
export function LandingFeatures() {
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <section id="features" className="landing-section relative overflow-hidden">
            <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50/80 to-white" />

            <div ref={ref} className="max-w-7xl mx-auto px-6">
                <div className={cn(
                    'text-center mb-16 landing-fade-in',
                    isInView && 'in-view'
                )}>
                    <h2 className="landing-title font-extrabold text-slate-900 tracking-tight mb-6">
                        Инструменты для эффективного{' '}
                        <span className="landing-gradient-text-static">управления временем</span>
                    </h2>
                    <p className="landing-subtitle text-slate-500 max-w-2xl mx-auto leading-relaxed">
                        Автоматизируйте рутину планирования и сосредоточьтесь на важных задачах
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {features.map((f, i) => (
                        <div
                            key={f.title}
                            className={cn(
                                'landing-fade-in group relative glass-card rounded-2xl p-5 sm:p-8 overflow-hidden cursor-default',
                                isInView && 'in-view',
                                f.size === 'large' && 'lg:col-span-2'
                            )}
                            style={{ transitionDelay: isInView ? `${i * 100}ms` : '0ms' }}
                        >
                            <div className={cn(
                                'inline-flex items-center justify-center h-14 w-14 rounded-2xl mb-6',
                                f.bg
                            )}>
                                <f.icon className={cn('h-7 w-7', f.iconColor)} />
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                                {f.title}
                            </h3>

                            <p className="text-slate-500 leading-relaxed">
                                {f.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
