import { forwardRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getEventTypeRules, getGlobalRules } from '@/api/rules';
import { ScheduleEditor } from './ScheduleEditor';
import type { ScheduleEditorRef } from './ScheduleEditor';

interface AvailabilityRulesSectionProps {
    eventTypeId: number;
    onDirtyChange?: (isDirty: boolean) => void;
}

const DAYS_MAP: Record<number, string> = {
    0: 'Понедельник', 1: 'Вторник', 2: 'Среда', 3: 'Четверг', 4: 'Пятница', 5: 'Суббота', 6: 'Воскресенье',
};

export const AvailabilityRulesSection = forwardRef<ScheduleEditorRef, AvailabilityRulesSectionProps>(
    function AvailabilityRulesSection({ eventTypeId, onDirtyChange }, ref) {
        const { data: eventRules, isLoading: rulesLoading } = useQuery({
            queryKey: ['event-rules', eventTypeId],
            queryFn: () => getEventTypeRules(eventTypeId),
        });

        const { data: globalRules } = useQuery({
            queryKey: ['global-rules'],
            queryFn: getGlobalRules,
        });

        const hasCustomRules = eventRules && eventRules.length > 0;

        return (
            <div className="space-y-6">
                {!hasCustomRules && globalRules && globalRules.length > 0 && (
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
                        <p className="font-medium text-blue-900 mb-2">Используется глобальное расписание:</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-800">
                            {globalRules.map(r => (
                                <div key={r.id}>
                                    {DAYS_MAP[r.day_of_week]}: {r.time_from.slice(0, 5)} - {r.time_to.slice(0, 5)}
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 text-blue-700/80">
                            Чтобы переопределить его для этого события, просто настройте расписание ниже и нажмите "Сохранить".
                        </p>
                    </div>
                )}

                <ScheduleEditor
                    ref={ref}
                    initialRules={eventRules || []}
                    isLoading={rulesLoading}
                    onDirtyChange={onDirtyChange}
                />
            </div>
        );
    }
);
