import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getTeams,
    getTeam,
    createTeam,
    updateTeam,
    deleteTeam,
    addTeamMember,
    updateTeamMemberRole,
    removeTeamMember,
    leaveTeam,
    getTeamInvite,
    getTeamInvites,
    revokeTeamInvite,
    joinTeamByToken,
} from '@/api/teams';
import type {
    TeamCreateRequest,
    TeamUpdateRequest,
    TeamMemberAddRequest,
    TeamRole,
} from '@/api/types';

export function useTeams() {
    return useQuery({
        queryKey: ['teams'],
        queryFn: getTeams,
    });
}

export function useTeam(teamId: number) {
    return useQuery({
        queryKey: ['teams', teamId],
        queryFn: () => getTeam(teamId),
        enabled: teamId > 0,
    });
}

export function useCreateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: TeamCreateRequest) => createTeam(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
    });
}

export function useUpdateTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ teamId, data }: { teamId: number; data: TeamUpdateRequest }) =>
            updateTeam(teamId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId] });
        },
    });
}

export function useDeleteTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (teamId: number) => deleteTeam(teamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
    });
}

export function useAddTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ teamId, data }: { teamId: number; data: TeamMemberAddRequest }) =>
            addTeamMember(teamId, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId] });
        },
    });
}

export function useUpdateTeamMemberRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            teamId,
            memberUserId,
            role,
        }: {
            teamId: number;
            memberUserId: number;
            role: TeamRole;
        }) => updateTeamMemberRole(teamId, memberUserId, role),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId] });
        },
    });
}

export function useRemoveTeamMember() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ teamId, memberUserId }: { teamId: number; memberUserId: number }) =>
            removeTeamMember(teamId, memberUserId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId] });
        },
    });
}

export function useLeaveTeam() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (teamId: number) => leaveTeam(teamId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
    });
}

export function useTeamInvite(teamId: number) {
    return useQuery({
        queryKey: ['teams', teamId, 'invite'],
        queryFn: () => getTeamInvite(teamId),
        enabled: teamId > 0,
    });
}

export function useTeamInvites(teamId: number) {
    return useQuery({
        queryKey: ['teams', teamId, 'invites'],
        queryFn: () => getTeamInvites(teamId),
        enabled: teamId > 0,
    });
}

export function useRevokeTeamInvite() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ teamId, inviteId }: { teamId: number; inviteId: number }) =>
            revokeTeamInvite(teamId, inviteId),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['teams', variables.teamId, 'invites'] });
        },
    });
}

export function useJoinTeamByToken() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (token: string) => joinTeamByToken(token),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
        },
    });
}
