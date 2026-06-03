import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInView } from '@/hooks/useInView';

const faqs = [
    {
        question: 'Это действительно бесплатно?',
        answer: 'Да, базовый план полностью бесплатен. Нет ограничений по количеству событий или бронирований. Мы не показываем рекламу и не берём комиссию.',
    },
    {
        question: 'Можно ли подключить Google Календарь?',
        answer: 'Мы работаем над интеграциями с внешними календарями. Пока все бронирования доступны в панели управления, а уведомления приходят на email.',
    },
    {
        question: 'Как клиенты записываются?',
        answer: 'Вы создаёте тип события и получаете ссылку. Клиент переходит по ней, видит ваши свободные слоты, выбирает время и заполняет форму. Вам приходит уведомление.',
    },
    {
        question: 'Подходит ли для команды?',
        answer: 'Да. Вы можете создать команду, пригласить коллег и настроить общее расписание. Записи распределяются между участниками.',
    },
    {
        question: 'Как настроить рабочие часы?',
        answer: 'В разделе «Расписание» задайте часы для каждого дня недели, добавьте перерывы и выходные. Всё делается в пару кликов.',
    },
];

/**
 * Секция FAQ — аккордеон с glassmorphism.
 */
export function LandingFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const { ref, isInView } = useInView<HTMLDivElement>();

    return (
        <section id="faq" className="py-20 bg-white relative overflow-hidden">
            <div ref={ref} className="max-w-3xl mx-auto px-6">
                <div className={cn('text-center mb-12 landing-fade-in', isInView && 'in-view')}>
                    <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-6">
                        Частые вопросы
                    </h2>
                    <p className="text-lg text-slate-500">
                        Всё, что нужно знать о работе сервиса
                    </p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, i) => (
                        <div
                            key={i}
                            className={cn(
                                'landing-fade-in glass-card rounded-2xl overflow-hidden transition-all duration-300',
                                isInView && 'in-view',
                                openIndex === i && 'border-blue-200 shadow-lg shadow-blue-500/5'
                            )}
                            style={{ transitionDelay: isInView ? `${i * 80}ms` : '0ms' }}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                                className="w-full flex items-center justify-between p-6 text-left cursor-pointer"
                            >
                                <span className={cn(
                                    'text-base md:text-lg font-semibold transition-colors',
                                    openIndex === i ? 'text-blue-600' : 'text-slate-900'
                                )}>
                                    {faq.question}
                                </span>
                                <ChevronDown className={cn(
                                    'h-5 w-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-4',
                                    openIndex === i && 'rotate-180 text-blue-500'
                                )} />
                            </button>
                            <div className={cn(
                                'overflow-hidden transition-all duration-300 ease-in-out',
                                openIndex === i ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                            )}>
                                <div className="px-6 pb-6 text-slate-500 leading-relaxed">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
