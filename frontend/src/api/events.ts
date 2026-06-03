import { apiClient } from './client';
import type { EventType, EventTypeAddRequest, ApiResponse } from './types';

export interface EventTypeUpdate {
    title?: string;
    duration?: number;
    buffer?: number;
    max_attendees?: number;
    is_active?: boolean;
    available_days_in_future?: number;
    team_id?: number | null;
    member_ids?: number[];
}

export async function getEventTypes(): Promise<EventType[]> {
    const response = await apiClient.get<ApiResponse<EventType[]>>('/events/');
    return response.data.data;
}

export async function createEventType(data: EventTypeAddRequest): Promise<EventType> {
    const response = await apiClient.post<ApiResponse<EventType>>('/events/', data);
    return response.data.data;
}

export async function updateEventType(id: number, data: EventTypeUpdate): Promise<EventType> {
    const response = await apiClient.put<ApiResponse<EventType>>(`/events/${id}`, data);
    return response.data.data;
}

export async function deleteEventType(id: number): Promise<void> {
    await apiClient.delete(`/events/${id}`);
}
