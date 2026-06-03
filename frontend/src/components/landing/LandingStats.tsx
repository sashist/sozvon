import { useInView } from '@/hooks/useInView';
import { useCountUp } from '@/hooks/useCountUp';

const stats = [
    { value: 500, suffix: '+', label: 'активных пользователей', isStatic: false },
    { value: 10000, suffix: '+', label: 'проведённых встреч', isStatic: false },
    { value: 99, suffix: '%', label: 'время безотказной работы', isStatic: false },
    { value: 0, suffix: '', label: 'двойных бронирований', isStatic: true, display: '0' },
];

/**
 * Секция статистики — glassmorphism карточки с count-up анимацией.
 */
export function LandingStats() {
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <section className="relative py-16 bg-white">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

            <div ref={ref} className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {stats.map((stat) => (
                        <StatCard key={stat.label} stat={stat} isInView={isInView} />
                    ))}
                </div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />
        </section>
    );
}

interface StatCardProps {
    stat: {
        value: number;
        suffix: string;
        label: string;
        isStatic: boolean;
        display?: string;
    };
    isInView: boolean;
}

function StatCard({ stat, isInView }: StatCardProps) {
    const count = useCountUp(stat.value, isInView);

    return (
        <div className="glass-card rounded-2xl p-6 text-center">
            <div className="text-3xl md:text-4xl font-extrabold landing-gradient-text-static mb-2">
                {stat.isStatic ? stat.display : `${count.toLocaleString()}${stat.suffix}`}
            </div>
            <div className="text-sm text-slate-500 font-medium">
                {stat.label}
            </div>
        </div>
    );
}
