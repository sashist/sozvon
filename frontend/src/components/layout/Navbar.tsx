import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Link as LinkIcon, Clock, CalendarDays, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinks = [
    { to: '/', label: 'Типы встреч', shortLabel: 'Типы', icon: LinkIcon },
    { to: '/availability', label: 'График', shortLabel: 'График', icon: Clock },
    { to: '/bookings', label: 'Записи', shortLabel: 'Записи', icon: CalendarDays },
    { to: '/teams', label: 'Команда', shortLabel: 'Команда', icon: Users },
];

export function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/auth/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    const getInitials = () => {
        if (user?.full_name) {
            return user.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2);
        }
        return user?.email?.[0]?.toUpperCase() || 'U';
    };

    const displayName = user?.full_name || user?.email?.split('@')[0];

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto flex h-16 lg:h-20 items-center justify-between px-4">
                    <Link to="/" className="flex items-center shrink-0">
                        <img
                            src="/sozvon_logo.svg"
                            alt="Logo"
                            className="h-9 lg:h-12 w-auto"
                        />
                    </Link>

                    <nav className="hidden lg:flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-full border border-slate-200/50">
                        {navLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive = location.pathname === link.to;
                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={cn(
                                        'flex items-center gap-2 px-5 py-2.5 text-base font-medium rounded-full transition-all duration-200',
                                        isActive
                                            ? 'text-blue-600 bg-white shadow-sm ring-1 ring-slate-200/50'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                                    )}
                                >
                                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'stroke-[2.5]' : 'stroke-[2]')} />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>



                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex items-center gap-2 px-2 lg:pr-4 h-auto py-1.5 rounded-full border border-slate-200/60 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm outline-none ring-0 focus-visible:ring-0"
                            >
                                <Avatar className="h-8 w-8 lg:h-9 lg:w-9 border-2 border-white shadow-sm ring-1 ring-slate-100">
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold flex items-center justify-center pt-0.5 text-sm">
                                        {getInitials()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden lg:flex flex-col items-start text-left">
                                    <span className="text-sm font-bold text-slate-800 leading-none">
                                        {displayName}
                                    </span>
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400 stroke-[3]" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-56 mt-2 p-2 rounded-2xl shadow-xl border-slate-100/80 bg-white/95 backdrop-blur-sm"
                        >
                            <div className="px-3 py-2.5">
                                <p className="text-sm font-bold text-slate-900">{displayName}</p>
                                <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">{user?.email}</p>
                            </div>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem
                                onClick={() => navigate('/me')}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-slate-600 focus:text-blue-600 focus:bg-blue-50 transition-colors"
                            >
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-100 text-slate-500 transition-colors">
                                    <User className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Профиль</span>
                            </DropdownMenuItem>



                            <DropdownMenuSeparator className="my-1 bg-slate-100" />
                            <DropdownMenuItem
                                onClick={handleLogout}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-600 focus:text-red-700 cursor-pointer focus:bg-red-50 transition-colors"
                            >
                                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-red-50 text-red-500 transition-colors">
                                    <LogOut className="h-4 w-4" />
                                </div>
                                <span className="font-medium">Выйти</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            <div className="lg:hidden fixed bottom-4 inset-x-0 z-50 pointer-events-none">
                <nav className="pointer-events-auto mx-auto w-fit flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-[0_4px_24px_rgba(0,0,0,0.10)] p-1.5 rounded-full">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = location.pathname === link.to;
                        return (
                            <Link
                                key={link.to}
                                to={link.to}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-full transition-all duration-200',
                                    isActive
                                        ? 'text-blue-600 bg-white shadow-sm ring-1 ring-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-900 hover:bg-white/70'
                                )}
                            >
                                <Icon className={cn('h-[18px] w-[18px]', isActive ? 'stroke-[2.5]' : 'stroke-[2]')} />
                                <span className={cn(
                                    'text-[10px] font-medium leading-none',
                                    isActive && 'font-semibold text-blue-700'
                                )}>
                                    {link.shortLabel}
                                </span>
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </>
    );
}
