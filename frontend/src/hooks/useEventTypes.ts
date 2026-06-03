import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEventTypes, createEventType, updateEventType, deleteEventType } from '@/api/events';
import type { EventTypeAddRequest } from '@/api/types';
import type { EventTypeUpdate } from '@/api/events';

export function useEventTypes() {
    return useQuery({
        queryKey: ['eventTypes'],
        queryFn: getEventTypes,
    });
}

export function useCreateEventType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: EventTypeAddRequest) => createEventType(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventTypes'] });
        },
    });
}

export function useUpdateEventType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: EventTypeUpdate }) => updateEventType(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventTypes'] });
        },
    });
}

export function useDeleteEventType() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => deleteEventType(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['eventTypes'] });
        },
    });
}

