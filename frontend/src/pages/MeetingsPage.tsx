import { useSearchParams } from 'react-router-dom';
import { BookingsPage } from './BookingsPage';
import { MyBookingsPage } from './MyBookingsPage';

type TabKey = 'incoming' | 'outgoing';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'incoming', label: 'Входящие' },
    { key: 'outgoing', label: 'Исходящие' },
];

export function MeetingsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = (searchParams.get('tab') ?? 'incoming') as TabKey;

    const setTab = (key: TabKey) => setSearchParams({ tab: key });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        {tab === 'incoming' ? 'Входящие заявки' : 'Исходящие заявки'}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {tab === 'incoming'
                            ? 'Управляйте бронированиями мероприятий, где вы являетесь организатором'
                            : 'Встречи, которые вы забронировали у других организаторов (вы — гость)'}
                    </p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-full sm:w-auto">
                    {TABS.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`
                                flex-1 sm:flex-initial text-center px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 whitespace-nowrap
                                ${tab === t.key
                                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                                }
                            `}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'incoming' ? (
                <BookingsPage hideHeader />
            ) : (
                <MyBookingsPage hideHeader />
            )}
        </div>
    );
}
