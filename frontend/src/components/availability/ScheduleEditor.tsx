import { useState, useEffect, memo, forwardRef, useImperativeHandle } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { AvailabilityRule } from '@/api/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface ScheduleSlot {
    start: string;
    end: string;
}

interface DaySchedule {
    isActive: boolean;
    slots: ScheduleSlot[];
}

interface ScheduleEditorProps {
    initialRules: AvailabilityRule[];
    isLoading?: boolean;
    onDirtyChange?: (isDirty: boolean) => void;
}

export interface ScheduleEditorRef {
    getRules: () => { day_of_week: number; time_from: string; time_to: string }[];
    isDirty: () => boolean;
    resetDirty: () => void;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Понедельник', short: 'Пн' },
    { value: 1, label: 'Вторник', short: 'Вт' },
    { value: 2, label: 'Среда', short: 'Ср' },
    { value: 3, label: 'Четверг', short: 'Чт' },
    { value: 4, label: 'Пятница', short: 'Пт' },
    { value: 5, label: 'Суббота', short: 'Сб' },
    { value: 6, label: 'Воскресенье', short: 'Вс' },
];

const TIME_SLOTS = Array.from({ length: 24 * 4 }).map((_, i) => {
    const hour = Math.floor(i / 4);
    const min = (i % 4) * 15;
    const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    return { value: time, label: time };
});

// Memoized TimeSelect component to prevent re-rendering 96 options 14 times
const TimeSelect = memo(({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="h-9 w-24">
                <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" align="start" className="max-h-[160px]" startFromTop>
                {TIME_SLOTS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
});

TimeSelect.displayName = 'TimeSelect';

export const ScheduleEditor = forwardRef<ScheduleEditorRef, ScheduleEditorProps>(
    function ScheduleEditor({ initialRules, isLoading, onDirtyChange }, ref) {
        const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});
        const [isDirty, setIsDirty] = useState(false);

        const updateDirty = (value: boolean) => {
            setIsDirty(value);
            onDirtyChange?.(value);
        };

        useEffect(() => {
            const initialSchedule: Record<number, DaySchedule> = {};

            DAYS_OF_WEEK.forEach(day => {
                const dayRules = initialRules.filter(r => r.day_of_week === day.value);
                if (dayRules.length > 0) {
                    initialSchedule[day.value] = {
                        isActive: true,
                        slots: dayRules.map(r => ({
                            start: r.time_from.slice(0, 5),
                            end: r.time_to.slice(0, 5)
                        }))
                    };
                } else {
                    initialSchedule[day.value] = {
                        isActive: false,
                        slots: [{ start: '09:00', end: '17:00' }]
                    };
                }
            });
            setSchedule(initialSchedule);
            updateDirty(false);
        }, [initialRules]);

        const handleToggleDay = (dayValue: number, checked: boolean) => {
            setSchedule(prev => ({
                ...prev,
                [dayValue]: { ...prev[dayValue], isActive: checked }
            }));
            updateDirty(true);
        };

        const handleAddSlot = (dayValue: number) => {
            setSchedule(prev => ({
                ...prev,
                [dayValue]: {
                    ...prev[dayValue],
                    slots: [...prev[dayValue].slots, { start: '09:00', end: '17:00' }]
                }
            }));
            updateDirty(true);
        };

        const handleRemoveSlot = (dayValue: number, index: number) => {
            setSchedule(prev => {
                const day = prev[dayValue];
                const newSlots = day.slots.filter((_, i) => i !== index);
                if (newSlots.length === 0) {
                    return {
                        ...prev,
                        [dayValue]: { isActive: false, slots: [{ start: '09:00', end: '17:00' }] }
                    };
                }
                return {
                    ...prev,
                    [dayValue]: { ...day, slots: newSlots }
                };
            });
            updateDirty(true);
        };

        const handleTimeChange = (dayValue: number, index: number, field: 'start' | 'end', value: string) => {
            setSchedule(prev => {
                const newSlots = [...prev[dayValue].slots];
                newSlots[index] = { ...newSlots[index], [field]: value };
                return {
                    ...prev,
                    [dayValue]: { ...prev[dayValue], slots: newSlots }
                };
            });
            updateDirty(true);
        };

        useImperativeHandle(ref, () => ({
            getRules: () => {
                const rules: { day_of_week: number; time_from: string; time_to: string }[] = [];
                Object.entries(schedule).forEach(([dayStr, daySchedule]) => {
                    const day = Number(dayStr);
                    if (daySchedule.isActive) {
                        daySchedule.slots.forEach(slot => {
                            rules.push({
                                day_of_week: day,
                                time_from: slot.start + ':00',
                                time_to: slot.end + ':00'
                            });
                        });
                    }
                });
                return rules;
            },
            isDirty: () => isDirty,
            resetDirty: () => updateDirty(false),
        }), [schedule, isDirty]);

        if (isLoading) {
            return (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                </div>
            );
        }

        return (
            <div className="space-y-4">

                <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-white">
                    <CardContent className="p-0 divide-y divide-slate-100">
                        {DAYS_OF_WEEK.map((day) => {
                            const daySchedule = schedule[day.value] || { isActive: false, slots: [] };

                            return (
                                <div key={day.value} className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 hover:bg-slate-50/50 transition-colors">
                                    <div className="w-40 flex items-center gap-4 pt-2">
                                        <Switch
                                            checked={daySchedule.isActive}
                                            onCheckedChange={(c) => handleToggleDay(day.value, c)}
                                            className="data-[state=checked]:bg-blue-600 scale-90"
                                        />
                                        <span className={`font-medium text-sm ${daySchedule.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                            {day.label}
                                        </span>
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        {!daySchedule.isActive ? (
                                            <div className="pt-2 text-slate-400 text-sm flex items-center h-9">
                                                Недоступен
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {daySchedule.slots.map((slot, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <TimeSelect
                                                                value={slot.start}
                                                                onChange={(val) => handleTimeChange(day.value, index, 'start', val)}
                                                            />

                                                            <span className="text-slate-400">-</span>

                                                            <TimeSelect
                                                                value={slot.end}
                                                                onChange={(val) => handleTimeChange(day.value, index, 'end', val)}
                                                            />
                                                        </div>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveSlot(day.value, index)}
                                                            className="h-9 w-9 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {daySchedule.isActive && (
                                        <div className="pt-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleAddSlot(day.value)}
                                                className="h-9 w-9 text-blue-600 hover:bg-blue-50 rounded-full"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        );
    });
