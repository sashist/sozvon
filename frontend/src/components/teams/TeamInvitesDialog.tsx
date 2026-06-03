import { Copy, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTeam } from '@/hooks/useTeams';

interface TeamInvitesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teamId: number;
    teamName: string;
}

export function TeamInvitesDialog({
    open,
    onOpenChange,
    teamId,
    teamName,
}: TeamInvitesDialogProps) {
    const { data: team, isLoading, isError } = useTeam(open ? teamId : 0);
    const inviteLink = team?.invite_url;

    const handleCopy = async () => {
        if (!inviteLink) return;
        await navigator.clipboard.writeText(inviteLink);
        toast.success('Ссылка скопирована!');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Пригласить в команду</DialogTitle>
                    <DialogDescription>{teamName}</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <p className="text-sm text-slate-600">
                        Поделитесь ссылкой, чтобы пригласить участников в команду.
                    </p>

                    {isLoading ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : isError || !inviteLink ? (
                        <div className="flex flex-col items-center py-6 text-slate-500 gap-2">
                            <Link2 className="h-8 w-8 text-slate-300" />
                            <p className="text-sm">Не удалось загрузить ссылку</p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Input
                                readOnly
                                value={inviteLink}
                                className="font-mono text-xs text-slate-700 bg-slate-50"
                            />
                            <Button
                                size="icon"
                                variant="outline"
                                onClick={handleCopy}
                                title="Скопировать ссылку"
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

