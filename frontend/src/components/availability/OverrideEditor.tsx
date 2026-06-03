import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Plus, X, Calendar as CalendarIcon, Loader2, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { ScheduleOverride, Booking } from '@/api/types';
import {
    getGlobalOverrides,
    createGlobalOverride,
    deleteOverride,
} from '@/api/rules';
import { getBookings } from '@/api/bookings';

const TIME_SLOTS = Array.from({ length: 24 * 4 }).map((_, i) => {
    const hour = Math.floor(i / 4);
    const min = (i % 4) * 15;
    const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
    return { value: time, label: time };
});

interface OverrideData {
    date: string;
    is_holiday: boolean;
    time_from?: string | null;
    time_to?: string | null;
}

interface AddOverrideDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: OverrideData) => void;
    isSaving: boolean;
    existingDates: Set<string>;
}

function AddOverrideDialog({ open, onOpenChange, onSave, isSaving, existingDates }: AddOverrideDialogProps) {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
    const [overrideType, setOverrideType] = useState<'holiday' | 'custom'>('holiday');
    const [timeFrom, setTimeFrom] = useState('10:00');
    const [timeTo, setTimeTo] = useState('14:00');

    const timeError = useMemo(() => {
        if (overrideType === 'custom') {
            if (timeFrom >= timeTo) {
                return 'Время начала должно быть меньше времени окончания';
            }
        }
        return null;
    }, [overrideType, timeFrom, timeTo]);

    const dateError = useMemo(() => {
        if (selectedDate) {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            if (existingDates.has(dateStr)) {
                return 'На эту дату уже есть исключение';
            }
        }
        return null;
    }, [selectedDate, existingDates]);

    const handleSave = () => {
        if (!selectedDate || dateError || timeError) return;

        const dateStr = format(selectedDate, 'yyyy-MM-dd');

        if (overrideType === 'holiday') {
            onSave({
                date: dateStr,
                is_holiday: true,
                time_from: null,
                time_to: null,
            });
        } else {
            onSave({
                date: dateStr,
                is_holiday: false,
                time_from: timeFrom + ':00',
                time_to: timeTo + ':00',
            });
        }

        setSelectedDate(undefined);
        setOverrideType('holiday');
        setTimeFrom('10:00');
        setTimeTo('14:00');
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setSelectedDate(undefined);
            setOverrideType('holiday');
            setTimeFrom('10:00');
            setTimeTo('14:00');
        }
        onOpenChange(newOpen);
    };

    const isDisabled = isSaving || !selectedDate || !!dateError || !!timeError;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Добавить исключение</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">

                    <div className="space-y-2">
                        <Label>Дата</Label>
                        <div className="flex justify-center">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                locale={ru}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                className="[--cell-size:2.5rem]"
                                fixedWeeks
                            />
                        </div>
                        {dateError && (
                            <p className="text-sm text-red-500 text-center">{dateError}</p>
                        )}
                    </div>


                    <div className="space-y-2">
                        <Label>Тип исключения</Label>
                        <Select value={overrideType} onValueChange={(v) => setOverrideType(v as 'holiday' | 'custom')}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="holiday">Выходной день</SelectItem>
                                <SelectItem value="custom">Изменённые часы</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>


                    {overrideType === 'custom' && (
                        <div className="space-y-2">
                            <Label>Рабочие часы</Label>
                            <div className="flex items-center gap-2">
                                <Select value={timeFrom} onValueChange={setTimeFrom}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[160px]">
                                        {TIME_SLOTS.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-slate-400">—</span>
                                <Select value={timeTo} onValueChange={setTimeTo}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent position="popper" className="max-h-[160px]">
                                        {TIME_SLOTS.map((t) => (
                                            <SelectItem key={t.value} value={t.value}>
                                                {t.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {timeError && (
                                <p className="text-sm text-red-500">{timeError}</p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
                        Отмена
                    </Button>
                    <Button onClick={handleSave} disabled={isDisabled}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Добавить
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

interface ConflictDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    conflicts: Booking[];
    overrideDate: string;
    isSaving: boolean;
}

function ConflictDialog({ open, onOpenChange, onConfirm, conflicts, overrideDate, isSaving }: ConflictDialogProps) {
    if (!overrideDate) return null;

    const formattedDate = format(new Date(overrideDate + 'T00:00:00'), 'd MMMM', { locale: ru });

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Внимание!
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>
                                На {formattedDate} есть {conflicts.length}{' '}
                                {conflicts.length === 1 ? 'бронирование' : 'бронирований'},
                                {' '}которые могут конфликтовать с новыми часами:
                            </p>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                {conflicts.slice(0, 5).map((b) => (
                                    <li key={b.id}>
                                        {b.guest_name} ({b.start_time.slice(11, 16)} - {b.end_time.slice(11, 16)})
                                    </li>
                                ))}
                                {conflicts.length > 5 && (
                                    <li>...и ещё {conflicts.length - 5}</li>
                                )}
                            </ul>
                            <p className="text-slate-600">
                                Бронирования <strong>не будут</strong> отменены автоматически.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSaving}>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Всё равно добавить
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export function OverrideEditor() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
    const [pendingOverride, setPendingOverride] = useState<OverrideData | null>(null);
    const [conflicts, setConflicts] = useState<Booking[]>([]);

    const { data: overrides, isLoading } = useQuery({
        queryKey: ['global-overrides'],
        queryFn: getGlobalOverrides,
    });

    const { data: bookings } = useQuery({
        queryKey: ['bookings'],
        queryFn: getBookings,
    });

    const existingDates = useMemo(() => {
        return new Set((overrides || []).map(o => o.date));
    }, [overrides]);

    const createMutation = useMutation({
        mutationFn: createGlobalOverride,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-overrides'] });
            toast.success('Исключение добавлено');
            setDialogOpen(false);
            setConflictDialogOpen(false);
            setPendingOverride(null);
        },
        onError: () => {
            toast.error('Ошибка при добавлении');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: deleteOverride,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['global-overrides'] });
            toast.success('Исключение удалено');
        },
        onError: () => {
            toast.error('Ошибка при удалении');
        },
    });

    const findConflicts = (data: OverrideData): Booking[] => {
        if (!bookings) return [];

        return bookings.filter(booking => {
            const bookingDate = booking.start_time.slice(0, 10);
            if (bookingDate !== data.date) return false;
            if (booking.status === 'cancelled') return false;

            if (data.is_holiday) return true;

            if (data.time_from && data.time_to) {
                const bookingStart = booking.start_time.slice(11, 16);
                const bookingEnd = booking.end_time.slice(11, 16);
                const overrideStart = data.time_from.slice(0, 5);
                const overrideEnd = data.time_to.slice(0, 5);

                return bookingStart < overrideStart || bookingEnd > overrideEnd;
            }

            return false;
        });
    };

    const handleSave = (data: OverrideData) => {
        const foundConflicts = findConflicts(data);

        if (foundConflicts.length > 0) {
            setPendingOverride(data);
            setConflicts(foundConflicts);
            setConflictDialogOpen(true);
        } else {
            createMutation.mutate(data);
        }
    };

    const handleConfirmWithConflicts = () => {
        if (pendingOverride) {
            createMutation.mutate(pendingOverride);
        }
    };

    const handleDelete = (id: number) => {
        deleteMutation.mutate(id);
    };

    const formatOverrideDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return format(date, 'd MMMM yyyy', { locale: ru });
    };

    const formatOverrideTime = (override: ScheduleOverride) => {
        if (override.is_holiday) {
            return 'Выходной';
        }
        if (override.time_from && override.time_to) {
            return `${override.time_from.slice(0, 5)} — ${override.time_to.slice(0, 5)}`;
        }
        return 'Недоступен';
    };

    const sortedOverrides = [...(overrides || [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return (
        <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold text-slate-900">
                    Исключения
                </CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                    className="gap-1"
                >
                    <Plus className="h-4 w-4" />
                    Добавить
                </Button>
            </CardHeader>

            <CardContent className="pt-0">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : sortedOverrides.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">
                        <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <p>Нет исключений</p>
                        <p className="text-xs text-slate-400 mt-1">
                            Добавьте выходные дни или изменённые часы
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {sortedOverrides.map((override) => (
                            <div
                                key={override.id}
                                className="flex items-center justify-between py-3 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-2 h-2 rounded-full ${override.is_holiday
                                            ? 'bg-red-500'
                                            : 'bg-amber-500'
                                            }`}
                                    />
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">
                                            {formatOverrideDate(override.date)}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {formatOverrideTime(override)}
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(override.id)}
                                    disabled={deleteMutation.isPending}
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-600 hover:bg-red-50"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>

            <AddOverrideDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSave}
                isSaving={createMutation.isPending}
                existingDates={existingDates}
            />

            <ConflictDialog
                open={conflictDialogOpen}
                onOpenChange={setConflictDialogOpen}
                onConfirm={handleConfirmWithConflicts}
                conflicts={conflicts}
                overrideDate={pendingOverride?.date || ''}
                isSaving={createMutation.isPending}
            />
        </Card>
    );
}
