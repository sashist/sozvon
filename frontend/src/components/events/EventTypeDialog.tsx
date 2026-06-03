import { useState, useEffect, useRef } from 'react';
import { Loader2, Clock, Coffee, User, Users, UsersRound } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

import { useCreateEventType, useUpdateEventType } from '@/hooks/useEventTypes';
import { useTeams, useTeam } from '@/hooks/useTeams';
import { useAuth } from '@/contexts/AuthContext';
import { AvailabilityRulesSection } from '@/components/availability/AvailabilityRulesSection';
import { getEventTypeRules, deleteRule, createEventTypeRule } from '@/api/rules';
import type { EventType, EventMode } from '@/api/types';
import type { ScheduleEditorRef } from '@/components/availability/ScheduleEditor';


interface EventTypeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    eventType?: EventType | null;
}

export function EventTypeDialog({ open, onOpenChange, eventType }: EventTypeDialogProps) {
    const isEditing = !!eventType;
    const createMutation = useCreateEventType();
    const updateMutation = useUpdateEventType();
    const queryClient = useQueryClient();
    const scheduleRef = useRef<ScheduleEditorRef>(null);
    const { user } = useAuth();

    const getInitialMode = (et: EventType | null | undefined): EventMode => {
        if (!et) return 'personal';
        if (et.team_id) return 'team';
        if (et.max_attendees > 1) return 'group';
        return 'personal';
    };

    const [mode, setMode] = useState<EventMode>('personal');
    const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
    const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

    const { data: teams = [] } = useTeams();
    const { data: selectedTeamData } = useTeam(selectedTeamId ?? 0);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        description: '',
        duration: 30,
        buffer: 0,
        max_attendees: 1,
        is_active: true,
        available_days_in_future: 60,
        requires_confirmation: false,
    });

    const [showAvailability, setShowAvailability] = useState(false);
    const [isSavingSchedule, setIsSavingSchedule] = useState(false);

    useEffect(() => {
        if (eventType) {
            setFormData({
                title: eventType.title,
                slug: eventType.slug,
                description: eventType.description || '',
                duration: eventType.duration,
                buffer: eventType.buffer,
                max_attendees: eventType.max_attendees,
                is_active: eventType.is_active,
                available_days_in_future: eventType.available_days_in_future,
                requires_confirmation: eventType.requires_confirmation ?? false,
            });
            setMode(getInitialMode(eventType));
            setSelectedTeamId(eventType.team_id);
            setSelectedMemberIds(eventType.member_ids || []);
        } else {
            setFormData({
                title: '',
                slug: '',
                description: '',
                duration: 30,
                buffer: 0,
                max_attendees: 1,
                is_active: true,
                available_days_in_future: 60,
                requires_confirmation: false,
            });
            setMode('personal');
            setSelectedTeamId(null);
            setSelectedMemberIds([]);
        }
    }, [eventType, open]);

    const translitMap: Record<string, string> = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    };

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .split('')
            .map(char => translitMap[char] ?? char)
            .join('')
            .replace(/[^a-z0-9\s-]/gi, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        setFormData((prev) => ({
            ...prev,
            title,
            slug: !isEditing ? generateSlug(title) : prev.slug,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const getPayload = () => {
            const base = {
                title: formData.title,
                description: formData.description || null,
                duration: formData.duration,
                buffer: formData.buffer,
                is_active: formData.is_active,
                available_days_in_future: formData.available_days_in_future,
                requires_confirmation: formData.requires_confirmation,
            };

            if (mode === 'personal') {
                return { ...base, max_attendees: 1, team_id: null };
            } else if (mode === 'group') {
                return { ...base, max_attendees: formData.max_attendees, team_id: null };
            } else {
                return {
                    ...base,
                    max_attendees: formData.max_attendees,
                    team_id: selectedTeamId,
                    member_ids: selectedMemberIds,
                };
            }
        };

        try {
            if (isEditing && eventType) {
                await updateMutation.mutateAsync({
                    id: eventType.id,
                    data: getPayload(),
                });

                if (scheduleRef.current?.isDirty()) {
                    setIsSavingSchedule(true);
                    const newRules = scheduleRef.current.getRules();

                    const existingRules = await getEventTypeRules(eventType.id);
                    await Promise.all(existingRules.map(rule => deleteRule(rule.id)));

                    await Promise.all(newRules.map(rule => createEventTypeRule(eventType.id, rule)));

                    queryClient.invalidateQueries({ queryKey: ['event-rules', eventType.id] });
                    scheduleRef.current.resetDirty();
                    setIsSavingSchedule(false);
                }

                toast.success('Тип события обновлён');
            } else {
                await createMutation.mutateAsync({
                    ...getPayload(),
                    slug: formData.slug,
                });
                toast.success('Тип события создан');
            }
            onOpenChange(false);
        } catch {
            setIsSavingSchedule(false);
            toast.error(isEditing ? 'Ошибка обновления' : 'Ошибка создания');
        }
    };

    const isLoading = createMutation.isPending || updateMutation.isPending || isSavingSchedule;

    const durationSteps = Array.from({ length: 24 }, (_, i) => (i + 1) * 5);


    const formatDuration = (mins: number) => {
        if (mins < 60) return `${mins} мин`;
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        return remainingMins > 0 ? `${hours} ч ${remainingMins} мин` : `${hours} ч`;
    };

    const bufferOptions = [0, 15, 30, 45, 60];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b shrink-0">
                    <DialogTitle>{isEditing ? 'Изменить событие' : 'Создать событие'}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Настройте параметры встречи'
                            : 'Создайте новую ссылку для бронирования'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Название события</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={handleTitleChange}
                                    placeholder="Например: Созвон в Zoom"
                                    required
                                />
                            </div>

                            {!isEditing && (
                                <div className="space-y-2">
                                    <Label htmlFor="slug" className="text-xs text-slate-500">URL ссылки</Label>
                                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200">
                                        <span className="text-xs text-slate-400 select-none">sozvon.tech/user/</span>
                                        <input
                                            id="slug"
                                            value={formData.slug}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                                            placeholder="event-slug"
                                            className="flex-1 bg-transparent border-none p-0 h-auto text-sm focus:ring-0 placeholder:text-slate-300"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="description">Описание (необязательно)</Label>
                                <textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                                    placeholder="Опишите цель встречи, добавьте ссылки или инструкции"
                                    className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">

                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    Длительность
                                </Label>
                                <Select
                                    value={formData.duration.toString()}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, duration: Number(val) }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Выберите время" />
                                    </SelectTrigger>
                                    <SelectContent className="!max-h-[180px]" position="popper" side="bottom">
                                        {durationSteps.map((mins) => (
                                            <SelectItem key={mins} value={mins.toString()}>
                                                {formatDuration(mins)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>


                            <div className="space-y-3">
                                <Label className="flex items-center gap-2">
                                    <Coffee className="w-4 h-4 text-slate-500" />
                                    Перерыв (до/после)
                                </Label>
                                <Select
                                    value={formData.buffer.toString()}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, buffer: Number(val) }))}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Выберите перерыв" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bufferOptions.map((opt) => (
                                            <SelectItem key={opt} value={opt.toString()}>
                                                {opt === 0 ? 'Без перерыва' : `${opt} мин`}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>


                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Label>Тип встречи</Label>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('personal');
                                        setFormData(prev => ({ ...prev, max_attendees: 1 }));
                                    }}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${mode === 'personal'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                        }`}
                                >
                                    <User className="w-5 h-5" />
                                    <span className="text-xs font-medium">1 на 1</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('group');
                                        setFormData(prev => ({ ...prev, max_attendees: prev.max_attendees < 2 ? 10 : prev.max_attendees }));
                                    }}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${mode === 'group'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                        }`}
                                >
                                    <Users className="w-5 h-5" />
                                    <span className="text-xs font-medium">Групповое</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('team');
                                        if (teams.length > 0 && !selectedTeamId) {
                                            setSelectedTeamId(teams[0].id);
                                        }
                                    }}
                                    disabled={teams.length === 0}
                                    className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${teams.length === 0 ? 'cursor-not-allowed border-slate-100 text-slate-300' : 'cursor-pointer'} ${mode === 'team'
                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                        : teams.length === 0
                                            ? 'border-slate-100 text-slate-300 cursor-not-allowed'
                                            : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                        }`}
                                >
                                    <UsersRound className="w-5 h-5" />
                                    <span className="text-xs font-medium">Командное</span>
                                </button>
                            </div>


                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3.5 space-y-1.5 mb-2 mt-2">
                                {mode === 'personal' && (
                                    <>
                                        <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
                                            <User className="w-4 h-4 text-blue-500" />
                                            <span>Личная встреча (1 на 1)</span>
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Индивидуальная встреча для собеседований и проверок. На один слот может записаться только 1 гость.
                                        </p>
                                    </>
                                )}
                                {mode === 'group' && (
                                    <>
                                        <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
                                            <Users className="w-4 h-4 text-blue-500" />
                                            <span>Групповая встреча</span>
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Много гостей на одно время. Подходит для общих рабочих созвонов, обучения и презентаций.
                                        </p>
                                    </>
                                )}
                                {mode === 'team' && (
                                    <>
                                        <div className="flex items-center gap-2 text-slate-800 font-medium text-sm">
                                            <UsersRound className="w-4 h-4 text-blue-500" />
                                            <span>Командная встреча</span>
                                        </div>
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            Многосторонняя встреча. Запись возможна только тогда, когда свободны все выбранные коллеги-участники.
                                        </p>
                                    </>
                                )}
                            </div>

                            {teams.length === 0 && (
                                <p className="text-xs text-red-500">
                                    * Для создания командных встреч вам необходимо сначала создать команду в разделе «Команды».
                                </p>
                            )}
                        </div>


                        {mode === 'group' && (
                            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
                                <Label htmlFor="max_attendees">Макс. участников на слот</Label>
                                <div className="flex items-center gap-4">
                                    <Input
                                        id="max_attendees"
                                        type="number"
                                        min={2}
                                        max={100}
                                        value={formData.max_attendees}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, max_attendees: Math.max(2, Number(e.target.value)) }))}
                                        className="w-24 bg-white"
                                    />
                                    <p className="text-xs text-slate-500">
                                        Сколько человек могут записаться на один слот
                                    </p>
                                </div>
                            </div>
                        )}


                        {mode === 'team' && teams.length > 0 && (
                            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                                <div className="space-y-2">
                                    <Label>Команда</Label>
                                    <Select
                                        value={selectedTeamId?.toString() ?? ''}
                                        onValueChange={(val) => {
                                            setSelectedTeamId(Number(val));
                                            setSelectedMemberIds([]);
                                        }}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Выберите команду" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {teams.map((team) => (
                                                <SelectItem key={team.id} value={team.id.toString()}>
                                                    {team.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {selectedTeamData && selectedTeamData.members.length > 0 && (
                                    <div className="space-y-3">
                                        <Label>Участники встречи</Label>
                                        <p className="text-xs text-slate-500">
                                            Слоты будут рассчитаны на основе пересечения свободного времени выбранных участников
                                        </p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">

                                            {user && (
                                                <div className="flex items-center gap-3 p-2 rounded bg-blue-50 border border-blue-100">
                                                    <Checkbox checked disabled className="opacity-60" />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-slate-900">
                                                            {user.full_name || user.email}
                                                            <span className="ml-2 text-xs text-blue-600 font-normal">
                                                                (Вы - включены автоматически)
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedTeamData.members
                                                .filter(member => member.user_id !== user?.id)
                                                .map((member) => (
                                                    <label
                                                        key={member.user_id}
                                                        className="flex items-center gap-3 p-2 rounded hover:bg-white cursor-pointer"
                                                    >
                                                        <Checkbox
                                                            checked={selectedMemberIds.includes(member.user_id)}
                                                            onCheckedChange={(checked) => {
                                                                if (checked) {
                                                                    setSelectedMemberIds(prev => [...prev, member.user_id]);
                                                                } else {
                                                                    setSelectedMemberIds(prev => prev.filter(id => id !== member.user_id));
                                                                }
                                                            }}
                                                        />
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {member.full_name || member.email || `User ${member.user_id}`}
                                                            </p>
                                                            {member.position && (
                                                                <p className="text-xs text-slate-500">{member.position}</p>
                                                            )}
                                                        </div>
                                                        <span className={`text-xs px-2 py-0.5 rounded ${member.role === 'owner'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : member.role === 'admin'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-slate-100 text-slate-600'
                                                            }`}>
                                                            {member.role === 'owner' ? 'Владелец' : member.role === 'admin' ? 'Админ' : 'Участник'}
                                                        </span>
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 pt-2 border-t border-slate-200">
                                    <Label htmlFor="team_max_attendees">Макс. гостей на слот</Label>
                                    <div className="flex items-center gap-4">
                                        <Input
                                            id="team_max_attendees"
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={formData.max_attendees}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, max_attendees: Number(e.target.value) }))}
                                            className="w-24 bg-white"
                                        />
                                        <p className="text-xs text-slate-500">
                                            1 = личная встреча с командой
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}



                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-900">Ручное подтверждение</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formData.requires_confirmation
                                            ? 'Бронирования ожидают вашего подтверждения'
                                            : 'Бронирования подтверждаются автоматически'
                                        }
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.requires_confirmation}
                                    onCheckedChange={(checked) =>
                                        setFormData((prev) => ({ ...prev, requires_confirmation: checked }))
                                    }
                                    className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200"
                                />
                            </div>
                        </div>


                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-900">Правила доступности</h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {formData.available_days_in_future} дней для бронирования
                                    </p>
                                </div>
                                {isEditing && eventType && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowAvailability(!showAvailability)}
                                    >
                                        {showAvailability ? 'Скрыть настройки' : 'Настроить расписание'}
                                    </Button>
                                )}
                            </div>

                            {isEditing && eventType && showAvailability && (
                                <div className="mt-4">
                                    <AvailabilityRulesSection
                                        ref={scheduleRef}
                                        eventTypeId={eventType.id}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0">
                        <Button type="button" variant="outline" className="bg-white border-slate-200 hover:bg-slate-100" onClick={() => onOpenChange(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isEditing ? 'Сохранить' : 'Создать'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
