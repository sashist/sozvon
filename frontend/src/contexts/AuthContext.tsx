import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, login as apiLogin, logout as apiLogout, register as apiRegister } from '@/api/auth';
import type { User } from '@/api/types';
import type { LoginRequest, RegisterRequest } from '@/api/auth';

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (data: LoginRequest) => Promise<void>;
    register: (data: RegisterRequest) => Promise<void>;
    logout: () => Promise<void>;
    refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = useCallback(async () => {
        try {
            const userData = await getCurrentUser();
            setUser(userData);
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const login = async (data: LoginRequest) => {
        queryClient.clear(); // Сбрасываем кэш перед входом нового пользователя
        await apiLogin(data);
        await fetchUser();
    };

    const register = async (data: RegisterRequest) => {
        await apiRegister(data);
        await login({ email: data.email, password: data.password });
    };

    const logout = async () => {
        await apiLogout();
        setUser(null);
        queryClient.clear(); // Очищаем весь кэш при выходе
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                register,
                logout,
                refetch: fetchUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
