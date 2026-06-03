import { useState } from 'react';
import { Users, Plus, Trash2, LogOut, MoreVertical, Crown, Shield, User } from 'lucide-react';
import { toast } from 'sonner';
import { useTeams, useDeleteTeam, useLeaveTeam, useTeam } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TeamDialog } from '@/components/teams/TeamDialog';
import { TeamMembersDialog } from '@/components/teams/TeamMembersDialog';
import type { Team, TeamRole } from '@/api/types';

const roleLabels: Record<TeamRole, string> = {
    owner: 'Владелец',
    admin: 'Админ',
    member: 'Участник',
};

const roleIcons: Record<TeamRole, React.ReactNode> = {
    owner: <Crown className="h-3 w-3" />,
    admin: <Shield className="h-3 w-3" />,
    member: <User className="h-3 w-3" />,
};

const roleBadgeStyles: Record<TeamRole, string> = {
    owner: 'bg-amber-100 text-amber-700 border-amber-200',
    admin: 'bg-blue-100 text-blue-700 border-blue-200',
    member: 'bg-slate-100 text-slate-600 border-slate-200',
};

interface TeamCardProps {
    team: Team;
    onManageMembers: () => void;
    onEditTeam: () => void;
    onDelete: () => void;
    onLeave: () => void;
}

function TeamCard({ team, onManageMembers, onEditTeam, onDelete, onLeave }: TeamCardProps) {
    const { user } = useAuth();
    const { data: teamWithMembers } = useTeam(team.id);

    const currentUserMember = teamWithMembers?.members.find((m) => m.user_id === user?.id);
    const userRole = currentUserMember?.role;
    const isOwner = userRole === 'owner';
    const membersCount = teamWithMembers?.members.length ?? 0;

    return (
        <Card className="group relative h-full overflow-hidden border-slate-200 transition-all hover:shadow-lg bg-gradient-to-br from-white to-slate-50">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                            <Users className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-semibold text-slate-900 truncate">
                                {team.name}
                            </CardTitle>
                            <CardDescription className="mt-0.5 text-slate-500">
                                {membersCount} {membersCount === 1 ? 'участник' : membersCount < 5 ? 'участника' : 'участников'}
                            </CardDescription>
                        </div>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onManageMembers}>
                                <Users className="h-4 w-4 mr-2" />
                                Участники
                            </DropdownMenuItem>
                            {!isOwner && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={onLeave}
                                        className="text-orange-600 focus:text-orange-600"
                                    >
                                        <LogOut className="h-4 w-4 mr-2" />
                                        Покинуть команду
                                    </DropdownMenuItem>
                                </>
                            )}
                            {isOwner && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onEditTeam}>
                                        <Users className="h-4 w-4 mr-2" />
                                        Изменить команду
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={onDelete}
                                        className="text-red-600 focus:text-red-600"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Удалить команду
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </CardHeader>

            <CardContent className="pt-0 flex flex-1 flex-col">
                <div className="min-h-[40px] mb-4">
                    {team.description && (
                        <p className="text-sm text-slate-500 line-clamp-2">
                            {team.description}
                        </p>
                    )}
                </div>

                <div className="mt-auto flex items-center justify-between">
                    {userRole && (
                        <Badge
                            variant="outline"
                            className={`${roleBadgeStyles[userRole]} flex items-center gap-1`}
                        >
                            {roleIcons[userRole]}
                            {roleLabels[userRole]}
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={onManageMembers}
                    >
                        Открыть
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export function TeamsPage() {
    const { data: teams, isLoading, error } = useTeams();
    const deleteMutation = useDeleteTeam();
    const leaveMutation = useLeaveTeam();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [membersDialogTeam, setMembersDialogTeam] = useState<Team | null>(null);
    const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);
    const [teamToLeave, setTeamToLeave] = useState<Team | null>(null);

    const handleDeleteConfirm = async () => {
        if (!teamToDelete) return;

        try {
            await deleteMutation.mutateAsync(teamToDelete.id);
            toast.success('Команда удалена');
            setTeamToDelete(null);
        } catch {
            toast.error('Ошибка удаления команды');
        }
    };

    const handleLeaveConfirm = async () => {
        if (!teamToLeave) return;

        try {
            await leaveMutation.mutateAsync(teamToLeave.id);
            toast.success('Вы покинули команду');
            setTeamToLeave(null);
        } catch {
            toast.error('Ошибка выхода из команды');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-600">Ошибка загрузки команд.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Команды</h1>
                    <p className="text-slate-500 mt-1">
                        Управляйте командами и их участниками
                    </p>
                </div>
                <Button
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                        setSelectedTeam(null);
                        setDialogOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Новая команда
                </Button>
            </div>

            {teams && teams.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {teams.map((team) => (
                        <TeamCard
                            key={team.id}
                            team={team}
                            onManageMembers={() => setMembersDialogTeam(team)}
                            onEditTeam={() => {
                                setSelectedTeam(team);
                                setDialogOpen(true);
                            }}
                            onDelete={() => setTeamToDelete(team)}
                            onLeave={() => setTeamToLeave(team)}
                        />
                    ))}
                </div>
            ) : (
                <Card className="border-dashed border-2 border-slate-200">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
                            <Users className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900">Нет команд</h3>
                        <p className="mt-1 text-sm text-slate-500 text-center max-w-sm">
                            Создайте команду для совместного управления событиями с коллегами
                        </p>
                        <Button
                            className="mt-4 bg-blue-600 hover:bg-blue-700"
                            onClick={() => {
                                setSelectedTeam(null);
                                setDialogOpen(true);
                            }}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Создать команду
                        </Button>
                    </CardContent>
                </Card>
            )}

            <TeamDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                team={selectedTeam}
            />

            {membersDialogTeam && (
                <TeamMembersDialog
                    open={!!membersDialogTeam}
                    onOpenChange={(open) => !open && setMembersDialogTeam(null)}
                    teamId={membersDialogTeam.id}
                    teamName={membersDialogTeam.name}
                />
            )}

            <AlertDialog open={!!teamToDelete} onOpenChange={() => setTeamToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить команду?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Это действие нельзя отменить. Команда "{teamToDelete?.name}" и все
                            связанные данные будут удалены.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!teamToLeave} onOpenChange={() => setTeamToLeave(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Покинуть команду?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите покинуть команду "{teamToLeave?.name}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLeaveConfirm}
                            className="bg-orange-600 hover:bg-orange-700"
                            disabled={leaveMutation.isPending}
                        >
                            Покинуть
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
