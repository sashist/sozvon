import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { Calendar, Loader2, Mail, MessageSquare } from 'lucide-react';
import { cancelBookingByGuest, getBookingPublic } from '@/api/bookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Безопасно извлекает текст ошибки из ответа API.
 *  detail может быть строкой (HTTPException) или массивом (ошибки валидации 422). */
function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const detail = (error as { response?: { data?: { detail?: unknown } } }).response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const first = detail[0];
      if (first && typeof first === 'object' && 'msg' in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }
  return fallback;
}

export function GuestBookingPage() {
  const { bookingUid } = useParams<{ bookingUid: string }>();
  const [guestEmail, setGuestEmail] = useState('');
  const [reason, setReason] = useState('');
  const [isCancelled, setIsCancelled] = useState(false);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['public-booking', bookingUid],
    queryFn: () => getBookingPublic(bookingUid!),
    enabled: !!bookingUid,
  });

  const statusLabel = useMemo(() => {
    if (!booking) return '';
    if (booking.status === 'cancelled') return 'Отменена';
    if (booking.status === 'confirmed') return 'Подтверждена';
    if (new Date(booking.end_time) < new Date()) return 'Просрочена';
    return 'Ожидает подтверждения';
  }, [booking]);

  const cancelMutation = useMutation({
    mutationFn: () => cancelBookingByGuest(
      bookingUid!,
      guestEmail.trim().toLowerCase(),
      reason || undefined
    ),
    onSuccess: () => {
      setIsCancelled(true);
      toast.success('Бронирование отменено');
    },
    onError: (err: unknown) => {
      toast.error(getApiErrorMessage(err, 'Не удалось отменить бронирование'));
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Бронирование не найдено.
        </div>
      </div>
    );
  }

  const isPast = new Date(booking.end_time) < new Date();
  const alreadyCancelled = booking.status === 'cancelled' || isCancelled || isPast;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl space-y-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Управление бронированием
            </CardTitle>
            <CardDescription className="break-words">{booking.event_title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-700">
            <div className="grid gap-2">
              <p className="break-words">
                <span className="text-slate-500">Статус:</span> {statusLabel}
              </p>
              <p className="break-words">
                <span className="text-slate-500">Гость:</span> {booking.guest_name}
              </p>
              <p className="break-words">
                <span className="text-slate-500">Время:</span>{' '}
                {format(parseISO(booking.start_time), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
              </p>
            </div>
          </CardContent>
        </Card>

        {!alreadyCancelled && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Отменить запись</CardTitle>
              <CardDescription>Для безопасности укажите email, использованный при записи.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="guest-email"><Mail className="mr-2 inline h-4 w-4" />Email</Label>
                <Input
                  id="guest-email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cancel-reason"><MessageSquare className="mr-2 inline h-4 w-4" />Причина (необязательно)</Label>
                <Input
                  id="cancel-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Не получается прийти"
                />
              </div>
              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim())) {
                    toast.error('Введите корректный email');
                    return;
                  }
                  cancelMutation.mutate();
                }}
                disabled={!guestEmail.trim() || cancelMutation.isPending}
              >
                {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отменить бронирование
              </Button>
            </CardContent>
          </Card>
        )}

        {alreadyCancelled && (
          <Card className="border-green-200 bg-green-50 shadow-sm">
            <CardContent className="pt-6 text-green-700">
              Запись успешно отменена.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
