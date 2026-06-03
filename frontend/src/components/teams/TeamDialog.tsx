import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTeam, useUpdateTeam } from '@/hooks/useTeams';
import type { Team } from '@/api/types';

const teamSchema = z.object({
    name: z.string().min(1, 'Название обязательно').max(100, 'Максимум 100 символов'),
    slug: z
        .string()
        .min(2, 'Минимум 2 символа')
        .max(100, 'Максимум 100 символов')
        .regex(
            /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
            'Только латинские буквы, цифры и дефисы. Должен начинаться и заканчиваться буквой или цифрой'
        ),
    description: z.string().max(500, 'Максимум 500 символов').optional(),
});

type TeamFormData = z.infer<typeof teamSchema>;

interface TeamDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    team?: Team | null;
}

const translitMap: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo',
    ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
    н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '',
    ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .split('')
        .map((char) => translitMap[char] ?? char)
        .join('')
        .replace(/[^a-z0-9\s-]/gi, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

export function TeamDialog({ open, onOpenChange, team }: TeamDialogProps) {
    const isEditing = !!team;
    const createMutation = useCreateTeam();
    const updateMutation = useUpdateTeam();
    const [autoSlug, setAutoSlug] = useState(!isEditing);

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
    } = useForm<TeamFormData>({
        resolver: zodResolver(teamSchema),
        defaultValues: {
            name: '',
            slug: '',
            description: '',
        },
    });

    const watchedName = watch('name');

    useEffect(() => {
        if (autoSlug && watchedName && !isEditing) {
            setValue('slug', generateSlug(watchedName));
        }
    }, [watchedName, autoSlug, setValue, isEditing]);

    useEffect(() => {
        if (open) {
            if (team) {
                reset({
                    name: team.name,
                    slug: team.slug,
                    description: team.description || '',
                });
                setAutoSlug(false);
            } else {
                reset({
                    name: '',
                    slug: '',
                    description: '',
                });
                setAutoSlug(true);
            }
        }
    }, [open, reset, team]);

    const onSubmit = async (data: TeamFormData) => {
        try {
            if (isEditing && team) {
                await updateMutation.mutateAsync({
                    teamId: team.id,
                    data: {
                        name: data.name,
                        slug: data.slug,
                        description: data.description || undefined,
                    },
                });
                toast.success('Команда обновлена');
            } else {
                await createMutation.mutateAsync({
                    name: data.name,
                    slug: data.slug,
                    description: data.description || undefined,
                });
                toast.success('Команда создана');
            }
            onOpenChange(false);
        } catch (error: unknown) {
            const axiosError = error as { response?: { status?: number } };
            if (axiosError.response?.status === 409) {
                toast.error('Команда с таким slug уже существует');
            } else {
                toast.error(isEditing ? 'Ошибка обновления команды' : 'Ошибка создания команды');
            }
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Изменить команду' : 'Создать команду'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Настройте параметры вашей команды' : 'Создайте команду для совместного управления событиями'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Название команды</Label>
                        <Input
                            id="name"
                            {...register('name')}
                            placeholder="Например: Отдел продаж"
                        />
                        {errors.name && (
                            <p className="text-sm text-red-600">{errors.name.message}</p>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="space-y-2">
                            <Label htmlFor="slug" className="text-xs text-slate-500">
                                URL команды
                            </Label>
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                                <span className="text-xs text-slate-400 select-none">
                                    sozvon.tech/teams/
                                </span>
                                <input
                                    id="slug"
                                    {...register('slug', {
                                        onChange: () => setAutoSlug(false),
                                    })}
                                    placeholder="team-slug"
                                    className="flex-1 bg-transparent border-none p-0 h-auto text-sm focus:ring-0 placeholder:text-slate-300"
                                />
                            </div>
                            {errors.slug && (
                                <p className="text-sm text-red-600">{errors.slug.message}</p>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="description">Описание (необязательно)</Label>
                        <textarea
                            id="description"
                            {...register('description')}
                            placeholder="Краткое описание команды"
                            className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        {errors.description && (
                            <p className="text-sm text-red-600">{errors.description.message}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                        >
                            Отмена
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            disabled={isPending}
                        >
                            {isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            {isEditing ? 'Сохранить' : 'Создать'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
