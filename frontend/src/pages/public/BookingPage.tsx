import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { addDays, endOfWeek, format, isSameDay, parseISO, startOfWeek } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ru } from 'date-fns/locale';
import { Calendar, CheckCircle, Clock, Globe, Loader2, Mail, MessageSquare, User } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createBooking, getAvailableSlots, getPublicEvent, type TimeSlot } from '@/api/bookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

import { RUSSIA_TIMEZONES } from '@/lib/timezones';

export const TIMEZONES = RUSSIA_TIMEZONES;

const getUserTimezone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
        return 'Europe/Moscow';
    }
};

export function BookingPage() {
    const { username, slug } = useParams<{ username: string; slug: string }>();
    const { user } = useAuth();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [step, setStep] = useState<'select' | 'form' | 'success'>('select');
    const [timezone, setTimezone] = useState<string>(getUserTimezone());
    const [formData, setFormData] = useState({
        guest_name: '',
        guest_email: '',
        guest_comment: '',
    });
    const [formErrors, setFormErrors] = useState<{ guest_name?: string; guest_email?: string }>({});

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                guest_name: prev.guest_name || user.full_name,
                guest_email: prev.guest_email || user.email,
            }));
        }
    }, [user]);

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validateForm = () => {
        const errors: typeof formErrors = {};
        if (!formData.guest_name.trim()) {
            errors.guest_name = 'Введите ваше имя';
        }
        if (!formData.guest_email.trim()) {
            errors.guest_email = 'Введите email';
        } else if (!validateEmail(formData.guest_email)) {
            errors.guest_email = 'Неверный формат email';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const { data: eventType, isLoading: eventLoading, error: eventError } = useQuery({
        queryKey: ['eventType', username, slug],
        queryFn: () => getPublicEvent(username!, slug!),
        enabled: !!username && !!slug,
    });

    const startOfWeekDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const endOfWeekDate = endOfWeek(selectedDate, { weekStartsOn: 1 });

    const startDate = format(startOfWeekDate, 'yyyy-MM-dd');
    const endDate = format(endOfWeekDate, 'yyyy-MM-dd');

    const { data: slots, isLoading: slotsLoading } = useQuery({
        queryKey: ['slots', eventType?.id, startDate, endDate],
        queryFn: () => getAvailableSlots(eventType!.id, startDate, endDate),
        enabled: !!eventType?.id,
    });

    const bookingMutation = useMutation({
        mutationFn: createBooking,
        onSuccess: () => {
            setStep('success');
            toast.success('Бронирование создано!');
        },
        onError: (error: unknown) => {
            let message = 'Ошибка при бронировании. Попробуйте ещё раз.';

            if (error && typeof error === 'object' && 'response' in error) {
                const response = (error as { response?: { data?: { detail?: string | { loc?: string[], type?: string }[] } } }).response;
                const detail = response?.data?.detail;

                if (typeof detail === 'string') {
                    message = detail;
                } else if (Array.isArray(detail) && detail.length > 0) {
                    const field = detail[0]?.loc?.slice(-1)[0];
                    const type = detail[0]?.type;

                    if (field === 'guest_email' || type?.includes('email')) {
                        message = 'Неверный формат email';
                    } else if (field === 'guest_name') {
                        message = 'Введите ваше имя';
                    } else if (field === 'start_time') {
                        message = 'Некорректное время бронирования';
                    }
                }
            }

            toast.error(message);
        },
    });

    const days = Array.from({ length: 7 }, (_, i) => addDays(startOfWeekDate, i));

    const slotsForDate = slots?.filter((slot) =>
        isSameDay(parseISO(slot.start), selectedDate)
    ) || [];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!eventType || !selectedSlot) return;
        if (!validateForm()) return;

        bookingMutation.mutate({
            event_type_id: eventType.id,
            guest_name: formData.guest_name,
            guest_email: formData.guest_email,
            guest_comment: formData.guest_comment || undefined,
            start_time: selectedSlot.start,
            guest_timezone: timezone,
        });
    };

    const formatTimeInTimezone = (dateString: string, formatStr: string) => {
        return formatInTimeZone(parseISO(dateString), timezone, formatStr, { locale: ru });
    };

    if (eventLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (eventError || !eventType) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-slate-900">Событие не найдено</h2>
                        <p className="mt-2 text-slate-500">
                            Проверьте ссылку или обратитесь к организатору
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (step === 'success') {
        const isPending = eventType?.requires_confirmation;
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <Card className="max-w-md w-full">
                    <CardContent className="pt-6 text-center">
                        <div className={`flex h-16 w-16 items-center justify-center rounded-full mx-auto mb-4 ${isPending ? 'bg-amber-100' : 'bg-green-100'}`}>
                            {isPending
                                ? <Clock className="h-8 w-8 text-amber-600" />
                                : <CheckCircle className="h-8 w-8 text-green-600" />
                            }
                        </div>
                        <h2 className="text-xl font-semibold text-slate-900">
                            {isPending ? 'Заявка отправлена!' : 'Бронирование подтверждено!'}
                        </h2>
                        <p className="mt-2 text-slate-500">
                            {isPending
                                ? 'Организатор рассмотрит вашу заявку и подтвердит встречу.'
                                : `Письмо с подтверждением отправлено на ${formData.guest_email}`
                            }
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg text-left">
                            <p className="text-sm font-medium text-slate-900">{eventType.title}</p>
                            <p className="text-sm text-slate-500 mt-1">
                                {selectedSlot && formatTimeInTimezone(selectedSlot.start, "d MMMM yyyy 'в' HH:mm")}
                            </p>
                            <p className="text-sm text-slate-500">{eventType.duration} мин</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                <Card>
                    <CardHeader className="border-b">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shrink-0">
                                    <Calendar className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <CardTitle>{eventType.title}</CardTitle>
                                    <CardDescription className="flex items-center gap-2 mt-1">
                                        <Clock className="h-4 w-4" />
                                        {eventType.duration} минут
                                    </CardDescription>
                                    {eventType.description && (
                                        <div className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">
                                            {eventType.description}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Globe className="h-4 w-4 text-slate-400 shrink-0" />
                                <Select value={timezone} onValueChange={setTimezone}>
                                    <SelectTrigger className="w-full sm:w-[280px] h-9 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent
                                        className="max-h-[250px] overflow-y-auto"
                                        position="popper"
                                    >
                                        {TIMEZONES.map((tz) => (
                                            <SelectItem key={tz.value} value={tz.value}>
                                                {tz.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {step === 'select' ? (
                            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
                                <div className="p-6">
                                    <h3 className="font-medium text-slate-900 mb-4">Выберите дату</h3>
                                    <div className="grid grid-cols-7 gap-1">
                                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => (
                                            <div key={d} className="text-center text-xs text-slate-400 font-medium py-2">
                                                {d}
                                            </div>
                                        ))}
                                        {days.map((day) => {
                                            const hasSlots = slots?.some((s) => isSameDay(parseISO(s.start), day));
                                            const isSelected = isSameDay(day, selectedDate);
                                            const isPast = day < new Date(new Date().setHours(0, 0, 0, 0));

                                            return (
                                                <button
                                                    key={day.toISOString()}
                                                    onClick={() => !isPast && setSelectedDate(day)}
                                                    disabled={isPast}
                                                    className={cn(
                                                        'aspect-square rounded-lg text-sm font-medium transition-colors',
                                                        isSelected && 'bg-blue-600 text-white',
                                                        !isSelected && hasSlots && !isPast && 'bg-slate-100 text-slate-900 hover:bg-slate-200',
                                                        !isSelected && (!hasSlots || isPast) && 'text-slate-300',
                                                        isPast && 'opacity-50 cursor-not-allowed'
                                                    )}
                                                >
                                                    {format(day, 'd')}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 flex justify-between">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
                                        >
                                            ← Назад
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
                                        >
                                            Вперёд →
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-6">
                                    <h3 className="font-medium text-slate-900 mb-4">
                                        {format(selectedDate, 'd MMMM', { locale: ru })}
                                    </h3>

                                    {slotsLoading ? (
                                        <div className="flex justify-center py-8">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                                        </div>
                                    ) : slotsForDate.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2 max-h-72 overflow-y-auto">
                                            {slotsForDate.map((slot) => (
                                                <button
                                                    key={slot.start}
                                                    onClick={() => {
                                                        setSelectedSlot(slot);
                                                        setStep('form');
                                                    }}
                                                    className="px-3 py-2 text-sm font-medium rounded-md border border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                                >
                                                    {formatTimeInTimezone(slot.start, 'HH:mm')}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-400 text-sm py-8 text-center">
                                            Нет доступных слотов на эту дату
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="p-4 bg-slate-50 rounded-lg mb-4">
                                    <p className="text-sm font-medium text-slate-900">
                                        {formatTimeInTimezone(selectedSlot!.start, "d MMMM yyyy 'в' HH:mm")}
                                    </p>
                                    <p className="text-sm text-slate-500">{eventType.duration} мин</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {TIMEZONES.find(tz => tz.value === timezone)?.label}
                                    </p>
                                    <Button
                                        type="button"
                                        variant="link"
                                        size="sm"
                                        className="p-0 h-auto text-blue-600"
                                        onClick={() => setStep('select')}
                                    >
                                        Изменить
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guest_name">
                                        <User className="h-4 w-4 inline mr-2" />
                                        Ваше имя
                                    </Label>
                                    <Input
                                        id="guest_name"
                                        value={formData.guest_name}
                                        onChange={(e) => {
                                            setFormData((p) => ({ ...p, guest_name: e.target.value }));
                                            if (formErrors.guest_name) setFormErrors(p => ({ ...p, guest_name: undefined }));
                                        }}
                                        placeholder="Иван Иванов"
                                        disabled={!!user}
                                        className={user ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : formErrors.guest_name ? 'border-red-500' : ''}
                                    />
                                    {user && (
                                        <p className="text-xs text-slate-400">Имя привязано к вашему аккаунту</p>
                                    )}
                                    {formErrors.guest_name && (
                                        <p className="text-sm text-red-500">{formErrors.guest_name}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guest_email">
                                        <Mail className="h-4 w-4 inline mr-2" />
                                        Email
                                    </Label>
                                    <Input
                                        id="guest_email"
                                        type="email"
                                        value={formData.guest_email}
                                        onChange={(e) => {
                                            setFormData((p) => ({ ...p, guest_email: e.target.value }));
                                            if (formErrors.guest_email) setFormErrors(p => ({ ...p, guest_email: undefined }));
                                        }}
                                        placeholder="you@example.com"
                                        disabled={!!user}
                                        className={user ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : formErrors.guest_email ? 'border-red-500' : ''}
                                    />
                                    {user && (
                                        <p className="text-xs text-slate-400">Email привязан к вашему аккаунту</p>
                                    )}
                                    {formErrors.guest_email && (
                                        <p className="text-sm text-red-500">{formErrors.guest_email}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guest_comment">
                                        <MessageSquare className="h-4 w-4 inline mr-2" />
                                        Комментарий (необязательно)
                                    </Label>
                                    <Input
                                        id="guest_comment"
                                        value={formData.guest_comment}
                                        onChange={(e) => setFormData((p) => ({ ...p, guest_comment: e.target.value }))}
                                        placeholder="О чём хотите поговорить?"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="button" variant="outline" onClick={() => setStep('select')}>
                                        Назад
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        disabled={bookingMutation.isPending}
                                    >
                                        {bookingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Забронировать
                                    </Button>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
