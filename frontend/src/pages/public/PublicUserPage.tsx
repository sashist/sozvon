import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Briefcase, Clock, User } from 'lucide-react';
import { getPublicUserEvents } from '@/api/bookings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function PublicUserPage() {
  const { username } = useParams<{ username: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-user-events', username],
    queryFn: () => getPublicUserEvents(username!),
    enabled: !!username,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          Не удалось загрузить публичную страницу пользователя.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/70 via-slate-50 to-slate-100 px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          <CardContent className="bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-3">
              <h1 className="text-3xl font-bold text-slate-900">
                {data.user.full_name || `@${data.user.username}`}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                  <User className="h-4 w-4" />
                  @{data.user.username}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1">
                  <Briefcase className="h-4 w-4" />
                  {data.user.position || 'Специалист'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {data.events.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
            У этого пользователя пока нет активных типов встреч.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.events.map((event) => (
              <Card key={event.id} className="border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg text-slate-900">{event.title}</CardTitle>
                  <CardDescription className="line-clamp-2 min-h-10">
                    {event.description || 'Без описания'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {event.duration} мин
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      до {event.max_attendees}
                    </span>
                  </div>
                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link to={`/${data.user.username}/${event.slug}`}>Записаться</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
