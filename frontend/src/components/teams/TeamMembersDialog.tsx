import { useState } from 'react';
import { Crown, Link2, Loader2, MoreVertical, Shield, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, } from '@/components/ui/dropdown-menu';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useRemoveTeamMember, useTeam, useUpdateTeamMemberRole } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { TeamInvitesDialog } from './TeamInvitesDialog';
import type { TeamMemberWithUser, TeamRole } from '@/api/types';

interface TeamMembersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: number;
    teamName: string;
}

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

function getInitials(name: string | undefined | null): string {
    if (!name) return '?';
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function TeamMembersDialog({
    open,
    onOpenChange,
    teamId,
    teamName,
}: TeamMembersDialogProps) {
    const { user } = useAuth();
    const { data: team, isLoading, isError } = useTeam(teamId);
    const removeMutation = useRemoveTeamMember();
    const updateRoleMutation = useUpdateTeamMemberRole();

    const [invitesOpen, setInvitesOpen] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState<TeamMemberWithUser | null>(null);

    const currentUserMember = team?.members.find((m) => m.user_id === user?.id);
    const isOwner = currentUserMember?.role === 'owner';
    const isAdmin = currentUserMember?.role === 'admin';
    const canManageMembers = isOwner || isAdmin;

    const handleRemoveMember = async () => {
        if (!memberToRemove) return;

        try {
            await removeMutation.mutateAsync({
                teamId,
                memberUserId: memberToRemove.user_id,
            });
            toast.success('Участник удалён из команды');
            setMemberToRemove(null);
        } catch {
            toast.error('Ошибка удаления участника');
        }
    };

    const handleRoleChange = async (member: TeamMemberWithUser, newRole: TeamRole) => {
        try {
            await updateRoleMutation.mutateAsync({
                teamId,
                memberUserId: member.user_id,
                role: newRole,
            });
            toast.success('Роль обновлена');
        } catch {
            toast.error('Ошибка обновления роли');
        }
    };

    const canRemoveMember = (member: TeamMemberWithUser): boolean => {
        if (member.role === 'owner') return false;
        if (isOwner) return true;
        if (isAdmin && member.role === 'member') return true;
        return false;
    };

    const canChangeRole = (member: TeamMemberWithUser): boolean => {
        if (member.role === 'owner') return false;
        return isOwner;
    };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Участники команды</DialogTitle>
                        <DialogDescription>{teamName}</DialogDescription>
                    </DialogHeader>

                    {canManageMembers && (
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700"
                                onClick={() => setInvitesOpen(true)}
                            >
                                <Link2 className="h-4 w-4 mr-2" />
                                Пригласить по ссылке
                            </Button>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : isError ? (
                            <div className="text-center py-8 text-red-600">
                                Не удалось загрузить данные команды
                            </div>
                        ) : team?.members.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                Нет участников
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {team?.members.map((member) => {
                                    const memberInfo = (
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                                                {member.full_name || member.username || `ID: ${member.user_id}`}
                                                {member.user_id === user?.id && (
                                                    <span className="ml-2 text-xs text-slate-400">
                                                        (вы)
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-sm text-slate-500 truncate">
                                                {member.username ? `@${member.username}` : '—'}
                                            </p>
                                            {member.position && (
                                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                                    {member.position}
                                                </p>
                                            )}
                                        </div>
                                    );

                                    return (
                                        <div
                                            key={member.id}
                                            className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                                        >
                                            {member.username ? (
                                                <a
                                                    href={`/${member.username}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group flex items-center gap-3 min-w-0 flex-1 basis-full sm:basis-auto"
                                                >
                                                    <Avatar className="h-10 w-10 shrink-0 ring-1 ring-transparent transition group-hover:ring-blue-200">
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium">
                                                            {getInitials(member.full_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {memberInfo}
                                                </a>
                                            ) : (
                                                <div className="flex items-center gap-3 min-w-0 flex-1 basis-full sm:basis-auto">
                                                    <Avatar className="h-10 w-10 shrink-0">
                                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-sm font-medium">
                                                            {getInitials(member.full_name)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    {memberInfo}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 shrink-0 ml-auto">
                                                {canChangeRole(member) ? (
                                                    <Select
                                                        value={member.role}
                                                        onValueChange={(value) =>
                                                            handleRoleChange(member, value as TeamRole)
                                                        }
                                                        disabled={updateRoleMutation.isPending}
                                                    >
                                                        <SelectTrigger className="w-[140px] h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="admin">
                                                                <div className="flex items-center gap-2">
                                                                    <Shield className="h-3 w-3" />
                                                                    Админ
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="member">
                                                                <div className="flex items-center gap-2">
                                                                    <User className="h-3 w-3" />
                                                                    Участник
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className={`${roleBadgeStyles[member.role]} flex items-center gap-1`}
                                                    >
                                                        {roleIcons[member.role]}
                                                        {roleLabels[member.role]}
                                                    </Badge>
                                                )}

                                                {canRemoveMember(member) && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() => setMemberToRemove(member)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" />
                                                                Удалить из команды
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={!!memberToRemove}
                onOpenChange={() => setMemberToRemove(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить участника?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {memberToRemove?.full_name || memberToRemove?.email} будет удалён из команды "
                            {teamName}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleRemoveMember}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={removeMutation.isPending}
                        >
                            {removeMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <TeamInvitesDialog
                open={invitesOpen}
                onOpenChange={setInvitesOpen}
                teamId={teamId}
                teamName={teamName}
            />
        </>
    );
}
