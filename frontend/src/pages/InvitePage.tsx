import { useState } from 'react';
import { useParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { Loader2, Users, AlertCircle, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useJoinTeamByToken } from '@/hooks/useTeams';

type InviteError = 'not_found' | 'already_member' | 'unknown' | null;

export function InvitePage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { user, isLoading: authLoading } = useAuth();
    const joinMutation = useJoinTeamByToken();
    const [error, setError] = useState<InviteError>(null);

    const handleJoin = async () => {
        if (!token) return;

        try {
            const team = await joinMutation.mutateAsync(token);
            toast.success(`Вы присоединились к команде "${team.name}"`);
            navigate('/teams');
        } catch (err: unknown) {
            const axiosError = err as { response?: { status?: number } };
            if (axiosError.response?.status === 404) {
                setError('not_found');
            } else if (axiosError.response?.status === 409) {
                setError('already_member');
            } else {
                setError('unknown');
            }
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to={`/auth/login?redirect=/invite/${token}`} replace />;
    }

    if (error === 'not_found') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-slate-900">
                            Приглашение недействительно
                        </CardTitle>
                        <CardDescription className="text-base">
                            Ссылка-приглашение не найдена или срок её действия истёк
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-600">
                            <p>Попросите администратора команды отправить вам новую ссылку</p>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full"
                            asChild
                        >
                            <Link to="/teams">Перейти к моим командам</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error === 'already_member') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                                <UserX className="h-8 w-8 text-amber-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-slate-900">
                            Вы уже в команде
                        </CardTitle>
                        <CardDescription className="text-base">
                            Вы уже являетесь участником этой команды
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            asChild
                        >
                            <Link to="/teams">Перейти к моим командам</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error === 'unknown') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-red-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl text-slate-900">
                            Произошла ошибка
                        </CardTitle>
                        <CardDescription className="text-base">
                            Не удалось присоединиться к команде. Попробуйте позже.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Button
                            className="w-full"
                            onClick={() => setError(null)}
                        >
                            Попробовать снова
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            asChild
                        >
                            <Link to="/teams">Перейти к моим командам</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                            <Users className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Приглашение в команду</CardTitle>
                    <CardDescription>
                        Вы получили приглашение присоединиться к команде
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="bg-slate-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-slate-500">Вы войдёте как</p>
                        <p className="font-medium text-slate-900">{user.full_name || user.email}</p>
                        <p className="text-sm text-slate-500">{user.email}</p>
                    </div>

                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                        onClick={handleJoin}
                        disabled={joinMutation.isPending}
                    >
                        {joinMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Присоединяемся...
                            </>
                        ) : (
                            'Присоединиться к команде'
                        )}
                    </Button>

                    <p className="text-xs text-center text-slate-400">
                        Нажимая кнопку, вы соглашаетесь стать участником команды
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
