import { useState, useEffect } from "react";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { apiClient } from "@/api/client";
import type { ApiResponse, User as UserType } from "@/api/types";
import { ChangePasswordForm } from "@/components/profile/ChangePasswordForm";
import { RUSSIA_TIMEZONES } from "@/lib/timezones";

const TIMEZONES = RUSSIA_TIMEZONES;

export function ProfilePage() {
  const { user, refetch } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: user?.full_name || "",
    username: user?.username || "",
    timezone: user?.timezone || "UTC",
    position: user?.position || "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || "",
        username: user.username || "",
        timezone: user.timezone || "UTC",
        position: user.position || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiClient.patch<ApiResponse<UserType>>("/auth/me", formData);
      await refetch();
      toast.success("Настройки профиля обновлены");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error.response?.data?.detail || "Ошибка сохранения");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto py-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Профиль</h1>
        <p className="text-slate-500 mt-2">
          Управляйте информацией о себе и настройками аккаунта
        </p>
      </div>

      <Card className="border-none shadow-sm ring-1 ring-slate-200">
        <CardContent className="p-8 space-y-8">

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Имя и Фамилия
                <Info className="h-3.5 w-3.5 inline ml-1.5 text-slate-400" />
              </Label>
              <Input
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                maxLength={100}
                className="max-w-xl h-11"
                placeholder="Введите ваше имя"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Публичная ссылка (Username)
                <Info className="h-3.5 w-3.5 inline ml-1.5 text-slate-400" />
              </Label>
              <div className="flex items-center max-w-xl">
                <span className="bg-slate-50 border border-r-0 border-slate-200 rounded-l-md px-3 h-11 flex items-center text-slate-500 text-sm">
                  sozvon.tech/
                </span>
                <Input
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value.toLowerCase() })
                  }
                  maxLength={50}
                  className="rounded-l-none h-11"
                  placeholder="username"
                />
              </div>
              <p className="text-sm text-slate-500">
                Ваша страница будет доступна по этому адресу.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">
                Должность
                <Info className="h-3.5 w-3.5 inline ml-1.5 text-slate-400" />
              </Label>
              <Input
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                maxLength={100}
                className="max-w-xl h-11"
                placeholder="Например: Product Manager"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Email</Label>
              <Input
                value={user.email}
                disabled
                className="max-w-xl h-11 bg-slate-50 text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-medium">Часовой пояс</Label>
              <div className="max-w-xl">
                <Select
                  value={formData.timezone}
                  onValueChange={(value) =>
                    setFormData({ ...formData, timezone: value })
                  }
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Выберите часовой пояс" />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="max-h-64 w-[var(--radix-select-trigger-width)]"
                  >
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                <span>Текущее время:</span>
                <span className="font-medium text-slate-700">
                  {new Date().toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: formData.timezone || undefined,
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 px-6 h-11"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Сохранить изменения
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm ring-1 ring-slate-200 mt-8">
        <CardContent className="p-8">
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
