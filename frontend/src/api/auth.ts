import { apiClient } from './client';
import type { User } from './types';

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    email: string;
    password: string;
    full_name?: string;
    timezone?: string;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}

export async function login(data: LoginRequest): Promise<void> {
    await apiClient.post('/auth/login', data);
}

export async function register(data: RegisterRequest): Promise<void> {
    await apiClient.post('/auth/register', data);
}

export async function logout(): Promise<void> {
    await apiClient.post('/auth/logout');
}

export async function getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
}

export async function changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post('/auth/change-password', data);
}
