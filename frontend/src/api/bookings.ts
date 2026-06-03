import { apiClient } from './client';
import type { ApiResponse, Booking, EventType } from './types';

export interface BookingAddRequest {
  event_type_id: number;
  guest_name: string;
  guest_email: string;
  guest_comment?: string;
  start_time: string;
  guest_timezone?: string;
}

export interface BookingGroup {
  event_type_id: number | null;
  start_time: string;
  bookings: Booking[];
}

export interface CancelSlotRequest {
  event_type_id: number;
  start_time: string;
  cancellation_reason?: string;
}

export async function getBookings(): Promise<Booking[]> {
  const response = await apiClient.get<ApiResponse<Booking[]>>('/bookings');
  return response.data.data;
}

export async function getBookingPublic(bookingUid: string): Promise<Booking> {
  const response = await apiClient.get<ApiResponse<Booking>>(`/bookings/p/${bookingUid}`);
  return response.data.data;
}

export async function createBooking(data: BookingAddRequest): Promise<Booking> {
  const response = await apiClient.post<ApiResponse<Booking>>('/bookings', data);
  return response.data.data;
}

export async function cancelBooking(id: number, reason?: string): Promise<void> {
  await apiClient.patch(`/bookings/${id}/cancel`, {
    status: 'cancelled',
    cancellation_reason: reason,
  });
}

export async function cancelBookingByGuest(
  bookingUid: string,
  guest_email: string,
  reason?: string
): Promise<void> {
  await apiClient.patch(`/bookings/p/${bookingUid}/cancel`, {
    guest_email,
    reason,
  });
}

export async function confirmBooking(id: number): Promise<Booking> {
  const response = await apiClient.patch<ApiResponse<Booking>>(`/bookings/${id}/confirm`);
  return response.data.data;
}

export async function cancelSlot(data: CancelSlotRequest): Promise<void> {
  await apiClient.post('/bookings/cancel-slot', {
    event_type_id: data.event_type_id,
    start_time: data.start_time,
    cancellation_reason: data.cancellation_reason,
  });
}

export interface CancelDateRangeRequest {
  start_date: string;
  end_date: string;
  cancellation_reason?: string;
}

export interface CancelDateRangeResponse {
  message: string;
  period: string;
}

export async function cancelDateRange(data: CancelDateRangeRequest): Promise<CancelDateRangeResponse> {
  const response = await apiClient.post<{ data: CancelDateRangeResponse }>('/bookings/cancel-range', data);
  return response.data.data;
}

export interface TimeSlot {
  start: string;
  end: string;
}

export async function getAvailableSlots(
  eventId: number,
  startDate: string,
  endDate: string
): Promise<TimeSlot[]> {
  const response = await apiClient.get<ApiResponse<TimeSlot[]>>(
    `/events/${eventId}/slots`,
    {
      params: { start_date: startDate, end_date: endDate }
    }
  );
  return response.data.data;
}

export async function getMyBookings(): Promise<Booking[]> {
  const response = await apiClient.get<ApiResponse<Booking[]>>('/bookings/my');
  return response.data.data;
}

export async function getPublicEvent(username: string, slug: string): Promise<EventType> {
  const response = await apiClient.get<ApiResponse<EventType>>(`/public/${username}/${slug}`);
  return response.data.data;
}

export interface PublicUserShort {
  id: number;
  username: string;
  full_name: string | null;
  position: string | null;
}

export interface PublicUserEventsResponse {
  user: PublicUserShort;
  events: EventType[];
}

export async function getPublicUserEvents(username: string): Promise<PublicUserEventsResponse> {
  const response = await apiClient.get<ApiResponse<PublicUserEventsResponse>>(`/public/${username}`);
  return response.data.data;
}

/**
 * Группирует бронирования по event_type_id и start_time
 * @param bookings - массив бронирований
 * @returns массив групп бронирований
 */
export function groupBookingsBySlot(bookings: Booking[]): BookingGroup[] {
  const grouped = new Map<string, BookingGroup>();

  bookings.forEach(booking => {
    const key = `${booking.event_type_id}_${booking.start_time}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        event_type_id: booking.event_type_id,
        start_time: booking.start_time,
        bookings: []
      });
    }

    grouped.get(key)!.bookings.push(booking);
  });

  return Array.from(grouped.values());
}
