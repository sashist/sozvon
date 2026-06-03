import { useState } from 'react';
import { format, parseISO, isFuture, isPast } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownUp, BookMarked, Calendar, MessageSquare, User } from 'lucide-react';
import { getMyBookings } from '@/api/bookings';
import type { Booking } from '@/api/types';
import { STATUS_CONFIG, getEffectiveStatus, isExpiredPending } from '@/lib/bookingStatus';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const FILTER_OPTIONS = [
    { key: 'all', label: 'Все' },
    { key: 'upcoming', label: 'Предстоящие' },
    { key: 'past', label: 'Прошедшие' },
    { key: 'cancelled', label: 'Отменённые' },
] as const;

type FilterKey = typeof FILTER_OPTIONS[number]['key'];

const SORT_OPTIONS = [
    { key: 'date_asc', label: 'Дата ↑ (сначала ранние)' },
    { key: 'date_desc', label: 'Дата ↓ (сначала поздние)' },
    { key: 'host_name', label: 'Организатор (А → Я)' },
    { key: 'event_type', label: 'Тип события (А → Я)' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['key'];

function applyFilter(bookings: Booking[], filter: FilterKey): Booking[] {
    switch (filter) {
        case 'upcoming':
            return bookings.filter(
                (b) => b.status !== 'cancelled' && isFuture(parseISO(b.start_time)) && !isExpiredPending(b)
            );
        case 'past':
            return bookings.filter(
                (b) => b.status !== 'cancelled' && isPast(parseISO(b.end_time))
            );
        case 'cancelled':
            return bookings.filter((b) => b.status === 'cancelled');
        default:
            return bookings;
    }
}

function groupByDate(bookings: Booking[]): Map<string, Booking[]> {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
        const key = format(parseISO(b.start_time), 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(b);
    }
    return map;
}

interface BookingCardProps {
    booking: Booking;
}

function BookingCard({ booking }: BookingCardProps) {
    const status = STATUS_CONFIG[getEffectiveStatus(booking)];
    const start = parseISO(booking.start_time);
    const end = parseISO(booking.end_time);

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <div className="shrink-0 text-center min-w-[52px]">
                    <div className="text-lg font-black text-blue-500 leading-none">
                        {format(start, 'HH:mm')}
                    </div>
                    <div className="text-[11px] font-medium text-blue-400 mt-0.5">
                        до {format(end, 'HH:mm')}
                    </div>
                </div>

                <div className="w-px h-8 bg-slate-200 shrink-0" />

                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                    <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                        {booking.event_title}
                    </h3>
                    <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.className}`}>
                        {status.label}
                    </span>
                </div>
            </div>

            <div className="px-4 py-3 space-y-2 text-sm text-slate-600">
                {booking.event_type?.host ? (
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="font-semibold text-slate-900">{booking.event_type.host.full_name}</span>
                        <span className="text-slate-400">@{booking.event_type.host.username}</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <User className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="text-slate-400">Организатор неизвестен</span>
                    </div>
                )}

                {booking.guest_comment && (
                    <div className="flex items-start gap-2 bg-slate-50 px-3 py-2 rounded-xl">
                        <MessageSquare className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                        <span className="text-slate-600">"{booking.guest_comment}"</span>
                    </div>
                )}

                {booking.cancellation_reason && (
                    <div className="text-xs font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                        Причина отмены: {booking.cancellation_reason}
                    </div>
                )}
            </div>
        </div>
    );
}

interface MyBookingsPageProps {
    hideHeader?: boolean;
}

export function MyBookingsPage({ hideHeader = false }: MyBookingsPageProps) {
    const [filter, setFilter] = useState<FilterKey>('upcoming');
    const [sort, setSort] = useState<SortOption>('date_asc');

    const { data: bookings, isLoading, error } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: getMyBookings,
    });

    const filtered = applyFilter(bookings ?? [], filter);

    const sorted = [...filtered].sort((a, b) => {
        switch (sort) {
            case 'date_desc':
                return parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime();
            case 'host_name': {
                const nameA = a.event_type?.host?.full_name?.toLowerCase() ?? '';
                const nameB = b.event_type?.host?.full_name?.toLowerCase() ?? '';
                return nameA.localeCompare(nameB, 'ru');
            }
            case 'event_type': {
                const titleA = a.event_title.toLowerCase();
                const titleB = b.event_title.toLowerCase();
                return titleA.localeCompare(titleB, 'ru');
            }
            case 'date_asc':
            default:
                return parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
        }
    });

    const grouped = groupByDate(sorted);

    const sortedEntries = Array.from(grouped.entries()).sort(([a], [b]) => {
        if (sort === 'date_desc') return b.localeCompare(a);
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-blue-50 text-blue-600">
                        <BookMarked className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Исходящие заявки</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Встречи, которые вы забронировали у других организаторов (вы — гость)
                        </p>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="sm:hidden flex flex-wrap gap-2">
                        {FILTER_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setFilter(opt.key)}
                                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                                    filter === opt.key
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                        : 'bg-slate-100 text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <div className="hidden sm:inline-flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        {FILTER_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setFilter(opt.key)}
                                className={`
                                    px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
                                    ${filter === opt.key
                                        ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                                    }
                                `}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
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
            </div>

            {isLoading && (
                <div className="flex justify-center py-20">
                    <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                </div>
            )}

            {error && (
                <div className="rounded-2xl bg-red-50 border border-red-100 px-5 py-4 text-sm text-red-600">
                    Не удалось загрузить записи. Попробуйте обновить страницу.
                </div>
            )}

            {!isLoading && !error && sortedEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30">
                    <div className="bg-blue-50 p-5 rounded-2xl shadow-sm ring-4 ring-white mb-5">
                        <Calendar className="h-9 w-9 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Записей пока нет</h3>
                    <p className="text-base text-slate-500 mt-2 max-w-sm mx-auto">
                        {filter === 'all'
                            ? 'Здесь появятся встречи, когда вы сделаете запись.'
                            : 'В этой категории пока пусто.'}
                    </p>
                </div>
            )}

            {!isLoading && !error && sortedEntries.length > 0 && (
                <div className="space-y-6">
                    {sortedEntries.map(([dateKey, dayBookings]) => {
                        const dateObj = parseISO(dateKey);
                        return (
                            <div key={dateKey}>
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-base font-bold text-slate-900 shrink-0">
                                        {format(dateObj, 'd MMMM', { locale: ru })}
                                    </h3>
                                    <div className="h-px flex-1 bg-slate-200" />
                                    <span className="text-sm text-slate-400 font-medium shrink-0">
                                        {format(dateObj, 'EEEE', { locale: ru })}
                                    </span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    {dayBookings.map((booking) => (
                                        <BookingCard key={booking.id} booking={booking} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
