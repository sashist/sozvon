export interface EventTypeHost {
    id: number;
    full_name: string;
    username: string;
}

export interface EventType {
    id: number;
    user_id: number;
    title: string;
    slug: string;
    description?: string | null;
    duration: number;
    buffer: number;
    max_attendees: number;
    requires_confirmation: boolean;
    is_active: boolean;
    available_days_in_future: number;
    team_id: number | null;
    member_ids: number[];
    host?: EventTypeHost | null;
    created_at?: string;
    updated_at?: string;
}

export interface EventTypeAddRequest {
    title: string;
    slug: string;
    description?: string | null;
    duration: number;
    buffer?: number;
    max_attendees?: number;
    requires_confirmation?: boolean;
    is_active?: boolean;
    available_days_in_future?: number;
    team_id?: number | null;
    member_ids?: number[];
}

export type EventMode = 'personal' | 'group' | 'team';

export interface User {
    id: number;
    email: string;
    full_name: string;
    username: string;
    timezone: string;
    position?: string | null;
    avatar_url?: string | null;
}

export interface Booking {
    id: number;
    uid: string;
    event_type_id: number | null;
    event_type: EventType | null;  // null если событие удалено
    event_title: string;            // денормализовано — сохраняется при удалении
    guest_name: string;
    guest_email: string;
    guest_comment?: string;
    start_time: string;
    end_time: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    cancellation_reason?: string;
    created_at: string;
    updated_at?: string;
}

export interface AvailabilityRule {
    id: number;
    user_id?: number | null;
    event_type_id?: number | null;
    day_of_week: number; // 0=Monday, 6=Sunday
    time_from: string;   // HH:MM:SS
    time_to: string;
}

export interface ScheduleOverride {
    id: number;
    user_id: number;
    date: string;        // YYYY-MM-DD
    time_from: string | null;
    time_to: string | null;
    is_holiday: boolean;
}

export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    invite_url: string;
}

export interface TeamMember {
    id: number;
    user_id: number;
    role: TeamRole;
}

export interface TeamMemberWithUser extends TeamMember {
    full_name: string | null;
    email: string | null;
    username: string | null;
    position: string | null;
}

export interface TeamWithMembers extends Team {
    members: TeamMemberWithUser[];
}

export interface TeamCreateRequest {
    name: string;
    slug: string;
    description?: string;
}

export interface TeamUpdateRequest {
    name?: string;
    slug?: string;
    description?: string | null;
}

export interface TeamMemberAddRequest {
    user_id: number;
    role?: TeamRole;
}

export interface TeamMemberUpdateRequest {
    role: TeamRole;
}

export interface TeamInviteCreateRequest {
    expires_in_days?: number;
    max_uses?: number;
}

export interface TeamInvite {
    id: number;
    team_id: number;
    token: string;
    expires_at: string;
    max_uses: number | null;
    use_count: number;
    is_active: boolean;
}

export interface TeamInviteWithLink extends TeamInvite {
    invite_link: string;
}

export interface ApiResponse<T> {
    status: 'OK' | 'ERROR';
    data: T;
}
