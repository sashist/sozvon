import { apiClient } from './client';
import type { ApiResponse, AvailabilityRule, ScheduleOverride } from './types';

export interface RuleAddRequest {
    event_type_id?: number;  // если null - глобальное правило
    day_of_week: number;
    time_from: string;
    time_to: string;
}

export interface OverrideAddRequest {
    date: string;
    time_from?: string | null;
    time_to?: string | null;
    is_holiday?: boolean;
}

export async function getGlobalRules(): Promise<AvailabilityRule[]> {
    const response = await apiClient.get<ApiResponse<AvailabilityRule[]>>(
        '/availability/rules'
    );
    return response.data.data;
}

export async function replaceGlobalRules(data: Omit<RuleAddRequest, 'event_type_id'>[]): Promise<AvailabilityRule[]> {
    const response = await apiClient.put<ApiResponse<AvailabilityRule[]>>(
        '/availability/rules',
        data
    );
    return response.data.data;
}

export async function getEventTypeRules(eventTypeId: number): Promise<AvailabilityRule[]> {
    const response = await apiClient.get<ApiResponse<AvailabilityRule[]>>(
        `/events/${eventTypeId}/availability/rules`
    );
    return response.data.data;
}

export async function createEventTypeRule(eventTypeId: number, data: Omit<RuleAddRequest, 'event_type_id'>): Promise<AvailabilityRule> {
    const response = await apiClient.post<ApiResponse<AvailabilityRule>>(
        `/events/${eventTypeId}/availability/rules`,
        data
    );
    return response.data.data;
}

export async function deleteRule(ruleId: number): Promise<void> {
    await apiClient.delete(`/availability/rules/${ruleId}`);
}

export async function getGlobalOverrides(): Promise<ScheduleOverride[]> {
    const response = await apiClient.get<ApiResponse<ScheduleOverride[]>>(
        '/availability/overrides'
    );
    return response.data.data;
}

export async function createGlobalOverride(data: OverrideAddRequest): Promise<ScheduleOverride> {
    const response = await apiClient.post<ApiResponse<ScheduleOverride>>(
        '/availability/overrides',
        data
    );
    return response.data.data;
}

export async function deleteOverride(overrideId: number): Promise<void> {
    await apiClient.delete(`/availability/overrides/${overrideId}`);
}
