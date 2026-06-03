import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ru } from 'date-fns/locale';
import { ArrowDownUp, Calendar, Check, Mail, MessageSquare, User, CalendarX, X } from 'lucide-react';
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BookingGroup } from '@/api/bookings';
import { cancelBooking, cancelSlot, cancelDateRange, confirmBooking, getBookings, groupBookingsBySlot } from '@/api/bookings';
import { getEventTypes } from '@/api/events';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Booking } from '@/api/types';
import { STATUS_CONFIG, getEffectiveStatus, isExpiredPending } from '@/lib/bookingStatus';
import { useAuth } from '@/contexts/AuthContext';

function getApiErrorMessage(error: unknown, fallback: string): string {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = (
            error as { response?: { data?: { detail?: string } } }
        ).response;
        const detail = response?.data?.detail;
        if (typeof detail === 'string' && detail.trim()) {
            return detail;
        }
    }
    return fallback;
}

const statusConfig = STATUS_CONFIG;

const FILTER_OPTIONS = [
    { key: 'all', label: 'Все' },
    { key: 'upcoming', label: 'Предстоящие' },
    { key: 'pending', label: 'Ожидают' },
    { key: 'past', label: 'Прошедшие' },
    { key: 'cancelled', label: 'Отменённые' },
] as const;

type FilterStatus = 'all' | 'upcoming' | 'pending' | 'past' | 'cancelled';

const SORT_OPTIONS = [
    { key: 'date_asc', label: 'Дата ↑ (сначала ранние)' },
    { key: 'date_desc', label: 'Дата ↓ (сначала поздние)' },
    { key: 'guest_name', label: 'Имя гостя (А → Я)' },
    { key: 'event_type', label: 'Тип события (А → Я)' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['key'];

interface BookingsPageProps {
    hideHeader?: boolean;
}

export function BookingsPage({ hideHeader = false }: BookingsPageProps) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const tz = user?.timezone || 'UTC';
    const [filter, setFilter] = useState<FilterStatus>('upcoming');
    const [sort, setSort] = useState<SortOption>('date_asc');
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelGroupDialogOpen, setCancelGroupDialogOpen] = useState(false);
    const [cancelRangeDialogOpen, setCancelRangeDialogOpen] = useState(false);
    const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
    const [groupToCancel, setGroupToCancel] = useState<BookingGroup | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined,
        to: undefined,
    });

    const { data: bookings, isLoading, error } = useQuery({
        queryKey: ['bookings'],
        queryFn: getBookings,
        staleTime: 0,
        refetchOnWindowFocus: true,
    });

    const { data: eventTypes } = useQuery({
        queryKey: ['eventTypes'],
        queryFn: getEventTypes,
    });

    const cancelMutation = useMutation({
        mutationFn: ({ id, reason }: { id: number; reason?: string }) => cancelBooking(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            toast.success('Бронирование отменено');
            setCancelDialogOpen(false);
            setCancelReason('');
        },
        onError: () => toast.error('Ошибка отмены'),
    });

    const cancelSlotMutation = useMutation({
        mutationFn: ({ event_type_id, start_time, reason }: {
            event_type_id: number;
            start_time: string;
            reason?: string
        }) => cancelSlot({
            event_type_id,
            start_time,
            cancellation_reason: reason,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            toast.success('Все бронирования отменены');
            setCancelGroupDialogOpen(false);
            setCancelReason('');
        },
        onError: () => toast.error('Ошибка отмены группы'),
    });

    const cancelRangeMutation = useMutation({
        mutationFn: ({ start_date, end_date, reason }: {
            start_date: string;
            end_date: string;
            reason?: string;
        }) => cancelDateRange({
            start_date,
            end_date,
            cancellation_reason: reason,
        }),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            toast.success(data.message);
            setCancelRangeDialogOpen(false);
            setCancelReason('');
            setDateRange({ from: undefined, to: undefined });
        },
        onError: (error: unknown) =>
            toast.error(getApiErrorMessage(error, 'Ошибка массовой отмены')),
    });

    const confirmMutation = useMutation({
        mutationFn: (id: number) => confirmBooking(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            toast.success('Бронирование подтверждено');
        },
        onError: () => toast.error('Ошибка подтверждения'),
    });

    const handleCancelClick = (booking: Booking) => {
        setBookingToCancel(booking);
        setCancelDialogOpen(true);
    };

    const handleCancelGroupClick = (group: BookingGroup) => {
        setGroupToCancel(group);
        setCancelGroupDialogOpen(true);
    };

    const handleCancelConfirm = () => {
        if (!bookingToCancel) return;
        cancelMutation.mutate({ id: bookingToCancel.id, reason: cancelReason || undefined });
    };

    const handleCancelGroupConfirm = () => {
        if (!groupToCancel || groupToCancel.event_type_id === null) return;
        cancelSlotMutation.mutate({
            event_type_id: groupToCancel.event_type_id,
            start_time: groupToCancel.start_time,
            reason: cancelReason || undefined
        });
    };

    const handleCancelRangeConfirm = () => {
        if (!dateRange.from || !dateRange.to) return;
        cancelRangeMutation.mutate({
            start_date: format(dateRange.from, 'yyyy-MM-dd'),
            end_date: format(dateRange.to, 'yyyy-MM-dd'),
            reason: cancelReason || undefined,
        });
    };

    const getEventTitle = (id: number | null, fallback?: string) => {
        return fallback || eventTypes?.find((e) => e.id === id)?.title || 'Событие';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    const bookingsList = error ? [] : (bookings ?? []);

    const filteredBookings = bookingsList.filter((b) => {
        const now = new Date();
        const startTime = parseISO(b.start_time);
        const endTime = parseISO(b.end_time);
        const expired = isExpiredPending(b);

        switch (filter) {
            case 'upcoming':
                return (b.status === 'confirmed' || b.status === 'pending') && startTime > now && !expired;
            case 'pending':
                return b.status === 'pending' && !expired;
            case 'past':
                return b.status !== 'cancelled' && endTime < now;
            case 'cancelled':
                return b.status === 'cancelled';
            default:
                return true;
        }
    });

    const slotGroups = groupBookingsBySlot(filteredBookings);

    const sortedSlotGroups = [...slotGroups].sort((a, b) => {
        switch (sort) {
            case 'date_desc':
                return b.start_time.localeCompare(a.start_time);
            case 'guest_name': {
                const nameA = a.bookings[0]?.guest_name?.toLowerCase() ?? '';
                const nameB = b.bookings[0]?.guest_name?.toLowerCase() ?? '';
                return nameA.localeCompare(nameB, 'ru');
            }
            case 'event_type': {
                const titleA = getEventTitle(a.event_type_id, a.bookings[0]?.event_title).toLowerCase();
                const titleB = getEventTitle(b.event_type_id, b.bookings[0]?.event_title).toLowerCase();
                return titleA.localeCompare(titleB, 'ru');
            }
            case 'date_asc':
            default:
                return a.start_time.localeCompare(b.start_time);
        }
    });

    const groupedByDate = sortedSlotGroups.reduce((groups, slotGroup) => {
        const date = formatInTimeZone(parseISO(slotGroup.start_time), tz, 'yyyy-MM-dd');
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(slotGroup);
        return groups;
    }, {} as Record<string, typeof slotGroups>);

    const sortedDates = Object.keys(groupedByDate).sort((a, b) => {
        if (sort === 'date_desc') return b.localeCompare(a);
        return a.localeCompare(b);
    });

    // При сортировке по дате группируем по датам (с заголовками),
    // при сортировке по имени/типу показываем единый плоский список,
    // иначе сортировка переставляла бы записи только внутри одной даты.
    const isDateSort = sort === 'date_asc' || sort === 'date_desc';
    const sections: { key: string; dateKey: string | null; slots: typeof slotGroups }[] =
        isDateSort
            ? sortedDates.map((dateKey) => ({ key: dateKey, dateKey, slots: groupedByDate[dateKey] }))
            : [{ key: 'flat', dateKey: null, slots: sortedSlotGroups }];

    return (
        <div className="space-y-6">

            {!hideHeader && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Входящие заявки</h1>
                        <p className="text-slate-500 mt-1 text-sm">Управляйте бронированиями мероприятий, где вы являетесь организатором</p>
                    </div>
                </div>
            )}


            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>

                    <div className="sm:hidden flex flex-wrap gap-2">
                        {FILTER_OPTIONS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key as FilterStatus)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    filter === f.key
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                        : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>

                    <div className="hidden sm:inline-flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        {FILTER_OPTIONS.map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key as FilterStatus)}
                                className={`
                                    px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
                                    ${filter === f.key
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                                    }
                                `}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:w-auto">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="gap-2 w-full sm:w-auto rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700">
                                <ArrowDownUp className="h-4 w-4" />
                                Сортировка
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={8} collisionPadding={16} className="w-56">
                            <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                                {SORT_OPTIONS.map((opt) => (
                                    <DropdownMenuRadioItem key={opt.key} value={opt.key}>
                                        {opt.label}
                                    </DropdownMenuRadioItem>
                                ))}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="outline"
                        onClick={() => setCancelRangeDialogOpen(true)}
                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
                    >
                        <CalendarX className="h-4 w-4" />
                        Отменить за период
                    </Button>
                </div>
            </div>


            {sortedSlotGroups.length > 0 ? (
                <div className="space-y-10">
                    {sections.map((section) => {
                        const dateSlots = section.slots;
                        const dateObj = section.dateKey ? parseISO(section.dateKey) : null;

                        return (
                            <div key={section.key}>
                                {dateObj && (
                                    <div className="flex items-center gap-3 mb-4">
                                        <h3 className="text-base font-bold text-slate-900 shrink-0">
                                            {format(dateObj, 'd MMMM', { locale: ru })}
                                        </h3>
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <span className="text-sm text-slate-400 font-medium shrink-0">
                                            {format(dateObj, 'EEEE', { locale: ru })}
                                        </span>
                                    </div>
                                )}

                                <div className="grid gap-4">
                                    {dateSlots.map((slotGroup, slotIndex) => {
                                        const firstBooking = slotGroup.bookings[0];
                                        const startTime = parseISO(firstBooking.start_time);
                                        const endTime = parseISO(firstBooking.end_time);
                                        const eventTitle = getEventTitle(slotGroup.event_type_id, firstBooking.event_title);

                                        const getStatusText = (s: string) => statusConfig[s as keyof typeof statusConfig]?.label || s;

                                        const isGroupBooking = slotGroup.bookings.length > 1;
                                        const hasActiveBookings = slotGroup.bookings.some(b => b.status === 'confirmed' || b.status === 'pending');

                                        const effectiveStatuses = new Set(slotGroup.bookings.map(getEffectiveStatus));
                                        const slotStatus = effectiveStatuses.size === 1
                                            ? slotGroup.bookings.map(getEffectiveStatus)[0]
                                            : effectiveStatuses.has('pending') ? 'pending'
                                            : effectiveStatuses.has('expired') ? 'expired'
                                            : 'confirmed';

                                        return (
                                            <div
                                                key={`${slotGroup.event_type_id}-${slotGroup.start_time}-${slotIndex}`}
                                                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
                                            >

                                                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">

                                                    <div className="shrink-0 text-center min-w-[52px]">
                                                        <div className="text-lg font-black text-blue-500 leading-none">
                                                            {formatInTimeZone(startTime, tz, 'HH:mm')}
                                                        </div>
                                                        <div className="text-[11px] font-medium text-blue-400 mt-0.5">
                                                            до {formatInTimeZone(endTime, tz, 'HH:mm')}
                                                        </div>
                                                    </div>

                                                    <div className="w-px h-8 bg-slate-200 shrink-0" />


                                                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                                                        <h4 className="text-base font-bold text-slate-900 truncate">
                                                            {eventTitle}
                                                        </h4>
                                                        {isGroupBooking && (
                                                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-100 text-xs font-bold text-blue-700">
                                                                {slotGroup.bookings.length} чел.
                                                            </span>
                                                        )}
                                                        <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig[slotStatus as keyof typeof statusConfig]?.className ?? 'bg-slate-100 text-slate-700'}`}>
                                                            {getStatusText(slotStatus)}
                                                        </span>
                                                    </div>


                                                    {isGroupBooking && hasActiveBookings && startTime > new Date() && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleCancelGroupClick(slotGroup)}
                                                            className="shrink-0 h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                            title="Отменить встречу"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>


                                                <div className="divide-y divide-slate-100">
                                                    {slotGroup.bookings.map((booking) => (
                                                        <div key={booking.id} className="px-4 py-3 space-y-2">

                                                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                                        <User className="h-3.5 w-3.5" />
                                                                    </div>
                                                                    <span className="text-sm font-semibold text-slate-900 truncate">{booking.guest_name}</span>
                                                                    {isGroupBooking && (() => {
                                                                        const eff = getEffectiveStatus(booking);
                                                                        return (
                                                                            <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig[eff]?.className ?? ''}`}>
                                                                                {statusConfig[eff]?.label ?? eff}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                </div>
                                                                <div className="flex items-center gap-2 min-w-0 ml-9 sm:ml-0">
                                                                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                                                    <span className="text-sm text-slate-500 truncate">{booking.guest_email}</span>
                                                                </div>
                                                            </div>


                                                            {booking.status === 'pending' && !isExpiredPending(booking) && (
                                                                <div className="flex items-center gap-2 ml-9 sm:ml-0">
                                                                    {booking.event_type?.user_id === user?.id && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => confirmMutation.mutate(booking.id)}
                                                                            disabled={confirmMutation.isPending}
                                                                            className="h-7 px-3 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg"
                                                                        >
                                                                            <Check className="h-3 w-3 mr-1" />
                                                                            Подтвердить
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleCancelClick(booking)}
                                                                        className="h-7 px-3 text-xs font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                    >
                                                                        <X className="h-3 w-3 mr-1" />
                                                                        Отклонить
                                                                    </Button>
                                                                </div>
                                                            )}
                                                            {!isGroupBooking && booking.status === 'confirmed' && new Date(booking.start_time) > new Date() && (
                                                                <div className="ml-9 sm:ml-0">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleCancelClick(booking)}
                                                                        className="h-7 px-3 text-xs text-slate-400 font-medium hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                                    >
                                                                        Отменить
                                                                    </Button>
                                                                </div>
                                                            )}


                                                            {booking.guest_comment && (
                                                                <div className="flex items-start gap-2 bg-slate-50 px-3 py-2 rounded-xl ml-9 sm:ml-0">
                                                                    <MessageSquare className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                                    <span className="text-xs text-slate-600">"{booking.guest_comment}"</span>
                                                                </div>
                                                            )}


                                                            {!isGroupBooking && booking.cancellation_reason && (
                                                                <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 ml-9 sm:ml-0">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                                    Причина: {booking.cancellation_reason}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}


                                                    {isGroupBooking && firstBooking.cancellation_reason && (
                                                        <div className="px-4 py-3">
                                                            <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                                                Причина: {firstBooking.cancellation_reason}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30">
                    <div className="bg-blue-50 p-5 rounded-2xl shadow-sm ring-4 ring-white mb-5">
                        <Calendar className="h-9 w-9 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Бронирований пока нет</h3>
                    <p className="text-base text-slate-500 mt-2 max-w-sm mx-auto">
                        {filter === 'all'
                            ? 'Здесь появятся встречи, когда гости начнут бронировать время.'
                            : 'В этой категории пока пусто.'}
                    </p>
                </div>
            )}


            <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Отменить бронирование?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Бронирование с {bookingToCancel?.guest_name} будет отменено.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label>Причина отмены (необязательно)</Label>
                        <Input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Укажите причину..."
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Назад</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelConfirm}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Отменить бронирование
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            <AlertDialog open={cancelGroupDialogOpen} onOpenChange={setCancelGroupDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Отменить все бронирования?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Будут отменены все подтверждённые бронирования для этого временного слота.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label>Причина отмены (необязательно)</Label>
                        <Input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="Укажите причину..."
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Назад</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelGroupConfirm}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Отменить всех
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


            <Dialog open={cancelRangeDialogOpen} onOpenChange={setCancelRangeDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Отменить бронирования за период</DialogTitle>
                        <DialogDescription>
                            Все подтверждённые бронирования в выбранном диапазоне будут отменены.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex justify-center">
                            <CalendarComponent
                                mode="range"
                                selected={dateRange}
                                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                locale={ru}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                numberOfMonths={1}
                                fixedWeeks
                            />
                        </div>
                        {dateRange.from && dateRange.to && (
                            <div className="text-center text-sm text-slate-600">
                                <span className="font-medium">Период:</span>{' '}
                                {format(dateRange.from, 'd MMM', { locale: ru })} —{' '}
                                {format(dateRange.to, 'd MMM yyyy', { locale: ru })}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label>Причина отмены (необязательно)</Label>
                            <Input
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Например: отпуск"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelRangeDialogOpen(false)}>
                            Отмена
                        </Button>
                        <Button
                            onClick={handleCancelRangeConfirm}
                            disabled={!dateRange.from || !dateRange.to || cancelRangeMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Отменить бронирования
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
