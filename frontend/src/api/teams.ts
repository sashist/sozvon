import {apiClient} from './client';
import type {
    ApiResponse,
    Team,
    TeamCreateRequest,
    TeamUpdateRequest,
    TeamInvite,
    TeamMember,
    TeamMemberAddRequest,
    TeamMemberUpdateRequest,
    TeamRole,
    TeamWithMembers,
} from './types';

export async function getTeams(): Promise<Team[]> {
    const response = await apiClient.get<ApiResponse<Team[]>>('/teams');
    return response.data.data;
}

export async function getTeam(teamId: number): Promise<TeamWithMembers> {
    const response = await apiClient.get<ApiResponse<TeamWithMembers>>(`/teams/${teamId}`);
    return response.data.data;
}

export async function createTeam(data: TeamCreateRequest): Promise<Team> {
    const response = await apiClient.post<ApiResponse<Team>>('/teams', data);
    return response.data.data;
}

export async function updateTeam(
    teamId: number,
    data: TeamUpdateRequest
): Promise<Team> {
    const response = await apiClient.patch<ApiResponse<Team>>(`/teams/${teamId}`, data);
    return response.data.data;
}

export async function deleteTeam(teamId: number): Promise<void> {
    await apiClient.delete(`/teams/${teamId}`);
}

export async function addTeamMember(
    teamId: number,
    data: TeamMemberAddRequest
): Promise<TeamMember> {
    const response = await apiClient.post<ApiResponse<TeamMember>>(
        `/teams/${teamId}/members`,
        data
    );
    return response.data.data;
}

export async function updateTeamMemberRole(
    teamId: number,
    memberUserId: number,
    role: TeamRole
): Promise<TeamMember> {
    const data: TeamMemberUpdateRequest = { role };
    const response = await apiClient.patch<ApiResponse<TeamMember>>(
        `/teams/${teamId}/members/${memberUserId}`,
        data
    );
    return response.data.data;
}

export async function removeTeamMember(
    teamId: number,
    memberUserId: number
): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/members/${memberUserId}`);
}

export async function leaveTeam(teamId: number): Promise<void> {
    await apiClient.post(`/teams/${teamId}/leave`);
}

export async function getTeamInvite(teamId: number): Promise<string> {
    const response = await apiClient.get<ApiResponse<string>>(
        `/teams/${teamId}/invite`
    );
    return response.data.data;
}

export async function getTeamInvites(teamId: number): Promise<TeamInvite[]> {
    const response = await apiClient.get<ApiResponse<TeamInvite[]>>(
        `/teams/${teamId}/invites`
    );
    return response.data.data;
}

export async function revokeTeamInvite(
    teamId: number,
    inviteId: number
): Promise<void> {
    await apiClient.delete(`/teams/${teamId}/invites/${inviteId}`);
}

export async function joinTeamByToken(token: string): Promise<Team> {
    const response = await apiClient.post<ApiResponse<Team>>(
        `/teams/join/${token}`
    );
    return response.data.data;
}
