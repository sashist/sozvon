import { useState } from 'react';
import { Clock, Copy, Plus, ExternalLink, Pencil, Trash2, MoreVertical, CheckCircle, Calendar, Link } from 'lucide-react';
import { toast } from 'sonner';
import { useEventTypes, useDeleteEventType, useUpdateEventType } from '@/hooks/useEventTypes';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Switch } from '@/components/ui/switch';
import { EventTypeDialog } from '@/components/events/EventTypeDialog';
import type { EventType } from '@/api/types';

export function HomePage() {
    const { data: eventTypes, isLoading, error } = useEventTypes();
    const { user } = useAuth();
    const deleteMutation = useDeleteEventType();
    const updateMutation = useUpdateEventType();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<EventType | null>(null);

    const copyLink = (slug: string) => {
        const link = `${window.location.origin}/${user?.username}/${slug}`;
        navigator.clipboard.writeText(link);
        toast.success('Ссылка скопирована');
    };

    const handleEdit = (event: EventType) => {
        setEditingEvent(event);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setEditingEvent(null);
        setDialogOpen(true);
    };

    const handleDeleteClick = (event: EventType) => {
        setEventToDelete(event);
        setDeleteConfirmOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!eventToDelete) return;

        try {
            await deleteMutation.mutateAsync(eventToDelete.id);
            toast.success('Тип события удалён');
            setDeleteConfirmOpen(false);
        } catch (error: unknown) {
            if (error && typeof error === 'object' && 'response' in error) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const axiosError = error as any;
                if (axiosError?.response?.status === 409) {
                    toast.error('Невозможно удалить', {
                        description: axiosError.response.data.detail || 'Есть активные бронирования'
                    });
                } else {
                    toast.error('Ошибка удаления');
                }
            } else {
                toast.error('Ошибка удаления');
            }
        } finally {
            if (!deleteMutation.isError) {
                setEventToDelete(null);
            }
        }
    };

    const handleToggleActive = async (event: EventType, checked: boolean) => {
        try {
            await updateMutation.mutateAsync({
                id: event.id,
                data: { is_active: checked }
            });
            toast.success(checked ? 'Событие активно' : 'Событие скрыто');
        } catch {
            toast.error('Ошибка обновления статуса');
        }
    }

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
                <p className="text-red-600">Ошибка загрузки типов событий.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Типы встреч</h1>
                    <p className="text-slate-500 mt-1">
                        Создавайте ссылки для бронирования встреч с вами
                    </p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Новый тип
                </Button>
            </div>


            {eventTypes && eventTypes.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {eventTypes.map((event) => (
                        <Card
                            key={event.id}
                            className="group relative overflow-hidden border-slate-200 transition-all hover:border-blue-300 hover:shadow-md"
                        >

                            <div
                                className={`absolute left-0 top-0 h-full w-1 transition-colors ${event.is_active ? 'bg-blue-600' : 'bg-slate-300'
                                    }`}
                            />

                            <CardHeader className="pl-5 pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0 pr-2">
                                        <CardTitle className="text-lg font-semibold text-slate-900 truncate">
                                            {event.title}
                                        </CardTitle>
                                        <CardDescription className="mt-1 flex items-center gap-2 text-slate-500">
                                            <Clock className="h-4 w-4 flex-shrink-0" />
                                            {event.duration} мин
                                            {event.buffer > 0 && (
                                                <span className="text-xs">+{event.buffer} перерыв</span>
                                            )}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-medium transition-colors ${event.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
                                                {event.is_active ? 'Активен' : 'Скрыт'}
                                            </span>
                                            <Switch
                                                checked={event.is_active}
                                                onCheckedChange={(checked) => handleToggleActive(event, checked)}
                                                className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-slate-200"
                                            />
                                        </div>
                                        <div className="h-4 w-px bg-slate-200 mx-1" />
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(event)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Редактировать
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => copyLink(event.slug)}>
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Копировать ссылку
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => window.open(`/${user?.username}/${event.slug}`, '_blank')}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Открыть страницу
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteClick(event)}
                                                    className="text-red-600 focus:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Удалить
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pl-5 pt-0">
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => copyLink(event.slug)}
                                        className="flex-1"
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Копировать ссылку
                                    </Button>
                                </div>

                                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                                    <span>/{event.slug}</span>
                                    {event.max_attendees > 1 && (
                                        <span>• до {event.max_attendees} участников</span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
                    <CardContent className="py-12 px-8">
                        <div className="max-w-3xl mx-auto text-center">
                            <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                                <Plus className="h-8 w-8 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Добро пожаловать! Давайте настроим вашу первую встречу</h2>
                            <p className="text-slate-600 mt-2 mb-8 max-w-xl mx-auto">
                                Создайте тип встречи, настройте расписание и поделитесь ссылкой с клиентами
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                            <CheckCircle className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900">Создайте тип встречи</h3>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-4">
                                        Определите длительность, название и описание встречи, которую клиенты смогут забронировать.
                                    </p>
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreate}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Создать встречу
                                    </Button>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                            <Calendar className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900">Настройте рабочее время</h3>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-4">
                                        Укажите, в какие дни и часы вы доступны для встреч, чтобы не получать звонки ночью.
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                        onClick={() => window.location.href = '/availability'}
                                    >
                                        Перейти к расписанию
                                    </Button>
                                </div>

                                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-left">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                                            <Link className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <h3 className="font-semibold text-slate-900">Скопируйте ссылку</h3>
                                    </div>
                                    <p className="text-slate-600 text-sm mb-4">
                                        После создания встречи вы получите уникальную ссылку, которую можно отправить клиентам.
                                    </p>
                                    <Button 
                                        variant="outline" 
                                        className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                                        disabled
                                    >
                                        Сначала создайте встречу
                                    </Button>
                                </div>
                            </div>

                            <div className="text-sm text-slate-500">
                                <p>Как только вы создадите первую встречу, эта инструкция исчезнет и появится список ваших встреч.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}


            {dialogOpen && (
                <EventTypeDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    eventType={editingEvent}
                />
            )}


            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Удалить тип события?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Это действие нельзя отменить. Тип события "{eventToDelete?.title}" будет удалён.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirm}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Удалить
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>


        </div>
    );
}
