import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePassword } from '@/api/auth';

const changePasswordSchema = z
    .object({
        current_password: z.string().min(6, 'Минимум 6 символов'),
        new_password: z.string().min(6, 'Минимум 6 символов'),
        confirm_password: z.string().min(6, 'Минимум 6 символов'),
    })
    .refine((data) => data.new_password === data.confirm_password, {
        message: 'Пароли не совпадают',
        path: ['confirm_password'],
    });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export function ChangePasswordForm() {
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ChangePasswordFormValues>({
        resolver: zodResolver(changePasswordSchema),
    });

    const onSubmit = async (values: ChangePasswordFormValues) => {
        setIsLoading(true);
        try {
            await changePassword({
                current_password: values.current_password,
                new_password: values.new_password,
            });
            toast.success('Пароль успешно изменён');
            reset();
        } catch (err: unknown) {
            let errorMsg = 'Ошибка при смене пароля';
            const error = err as { response?: { data?: { detail?: string | Array<{ msg: string }> } } };
            const detail = error.response?.data?.detail;

            if (typeof detail === 'string') {
                errorMsg = detail;
            } else if (Array.isArray(detail) && detail.length > 0) {
                errorMsg = detail[0].msg || errorMsg;
                if (errorMsg.startsWith('Value error, ')) {
                    errorMsg = errorMsg.replace('Value error, ', '');
                }
            }
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
                <Lock className="h-4 w-4 text-slate-500" />
                <h2 className="text-base font-semibold text-slate-800">Смена пароля</h2>
            </div>

            <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Текущий пароль</Label>
                <Input
                    type="password"
                    autoComplete="current-password"
                    className="max-w-xl h-11"
                    placeholder="Введите текущий пароль"
                    {...register('current_password')}
                />
                {errors.current_password && (
                    <p className="text-sm text-red-500">{errors.current_password.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Новый пароль</Label>
                <Input
                    type="password"
                    autoComplete="new-password"
                    className="max-w-xl h-11"
                    placeholder="Не менее 6 символов"
                    {...register('new_password')}
                />
                {errors.new_password && (
                    <p className="text-sm text-red-500">{errors.new_password.message}</p>
                )}
            </div>

            <div className="space-y-2">
                <Label className="text-slate-700 font-medium">Повторите новый пароль</Label>
                <Input
                    type="password"
                    autoComplete="new-password"
                    className="max-w-xl h-11"
                    placeholder="Повторите новый пароль"
                    {...register('confirm_password')}
                />
                {errors.confirm_password && (
                    <p className="text-sm text-red-500">{errors.confirm_password.message}</p>
                )}
            </div>

            <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 px-6 h-11"
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Изменить пароль
            </Button>
        </form>
    );
}
