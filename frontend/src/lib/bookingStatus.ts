import type { Booking } from '@/api/types';

export type EffectiveStatus = Booking['status'] | 'expired';

export function isExpiredPending(booking: Pick<Booking, 'status' | 'end_time'>): boolean {
    return booking.status === 'pending' && new Date(booking.end_time) < new Date();
}

export function getEffectiveStatus(
    booking: Pick<Booking, 'status' | 'end_time'>,
): EffectiveStatus {
    return isExpiredPending(booking) ? 'expired' : booking.status;
}

export const STATUS_CONFIG: Record<EffectiveStatus, { label: string; className: string }> = {
    pending: { label: 'Ожидает', className: 'bg-amber-100 text-amber-700' },
    confirmed: { label: 'Подтверждено', className: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Отменено', className: 'bg-red-100 text-red-700' },
    expired: { label: 'Просрочено', className: 'bg-slate-200 text-slate-600' },
};
