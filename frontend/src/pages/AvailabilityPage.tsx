import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, X, Save, Loader2, ChevronDown } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getGlobalRules, replaceGlobalRules } from '@/api/rules';
import { cn } from '@/lib/utils';
import { OverrideEditor } from '@/components/availability/OverrideEditor';

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

interface ScheduleSlot {
    start: string;
    end: string;
}

interface DaySchedule {
    isActive: boolean;
    slots: ScheduleSlot[];
}

function LightweightTimeSelect({ value, onChange }: { value: string, onChange: (val: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && listRef.current) {
            listRef.current.scrollTop = 0;
        }
    }, [isOpen]);

    return (
        <div className="relative w-24" ref={containerRef}>
            <button
                type="button"
                onClick={toggleOpen}
                className="flex h-9 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {value}
                <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {isOpen && (
                <div className="absolute top-full z-50 mt-1 w-full min-w-[6rem] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-md animate-in fade-in-0 zoom-in-95">
                    <ul ref={listRef} className="max-h-[160px] overflow-y-auto py-1">
                        {TIME_SLOTS.map((time) => (
                            <li
                                key={time.value}
                                onClick={() => {
                                    onChange(time.value);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-slate-100 hover:text-slate-900 cursor-pointer",
                                    value === time.value && "bg-slate-100 font-medium"
                                )}
                            >
                                {time.label}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function AvailabilityPage() {
    const queryClient = useQueryClient();
    const [schedule, setSchedule] = useState<Record<number, DaySchedule>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const { data: rules, isLoading: rulesLoading } = useQuery({
        queryKey: ['global-rules'],
        queryFn: getGlobalRules,
    });

    useEffect(() => {
        if (!rules) return;

        const initialSchedule: Record<number, DaySchedule> = {};

        DAYS_OF_WEEK.forEach(day => {
            const dayRules = rules.filter(r => r.day_of_week === day.value);
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
        setIsDirty(false);
    }, [rules]);

    const handleToggleDay = (dayValue: number, checked: boolean) => {
        setSchedule(prev => ({
            ...prev,
            [dayValue]: { ...prev[dayValue], isActive: checked }
        }));
        setIsDirty(true);
    };

    const handleAddSlot = (dayValue: number) => {
        setSchedule(prev => ({
            ...prev,
            [dayValue]: {
                ...prev[dayValue],
                slots: [...prev[dayValue].slots, { start: '09:00', end: '17:00' }]
            }
        }));
        setIsDirty(true);
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
        setIsDirty(true);
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
        setIsDirty(true);
    };

    const handleSave = async () => {
        if (!rules) return;
        setIsSaving(true);
        try {
            const rulesToSave: { day_of_week: number; time_from: string; time_to: string }[] = [];

            Object.entries(schedule).forEach(([dayStr, daySchedule]) => {
                const day = Number(dayStr);
                if (daySchedule.isActive) {
                    daySchedule.slots.forEach(slot => {
                        rulesToSave.push({
                            day_of_week: day,
                            time_from: slot.start + ':00',
                            time_to: slot.end + ':00'
                        });
                    });
                }
            });

            const rulesData = rulesToSave.map(r => ({
                day_of_week: r.day_of_week,
                time_from: r.time_from,
                time_to: r.time_to
            }));

            await replaceGlobalRules(rulesData);

            queryClient.invalidateQueries({ queryKey: ['global-rules'] });
            toast.success('Глобальное расписание обновлено');
            setIsDirty(false);
        } catch (error) {
            console.error(error);
            toast.error('Ошибка сохранения расписания');
        } finally {
            setIsSaving(false);
        }
    };

    if (rulesLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-4 pt-4 pb-24 lg:pb-8 px-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Расписание</h1>
                    <p className="text-slate-500 mt-1">
                        Укажите дни и часы, когда к вам можно записаться.
                    </p>
                </div>
                {isDirty && (
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 shadow-sm animate-in fade-in zoom-in-95"
                    >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Сохранить
                    </Button>
                )}
            </div>

            <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-white">
                <CardContent className="p-0 divide-y divide-slate-100">
                    {DAYS_OF_WEEK.map((day) => {
                        const daySchedule = schedule[day.value] || { isActive: false, slots: [] };

                        return (
                            <div key={day.value} className="flex flex-col sm:flex-row sm:items-start gap-4 py-3 px-4 hover:bg-slate-50/50 transition-colors">
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
                                                        <LightweightTimeSelect
                                                            value={slot.start}
                                                            onChange={(val) => handleTimeChange(day.value, index, 'start', val)}
                                                        />
                                                        <span className="text-slate-400">-</span>
                                                        <LightweightTimeSelect
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


            <OverrideEditor />

        </div>
    );
}
