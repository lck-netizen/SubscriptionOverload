/* ============================================================
   APP SHELL — Sidebar + Header + <Outlet /> for nested routes.
============================================================ */
import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CreditCard, BarChart3, Settings as SettingsIcon, Layers, LogOut, Bell, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import NotificationsPanel from '@/components/NotificationsPanel';
import SubscriptionModal from '@/components/SubscriptionModal';

const navItems = [
    { to: '/app',               label: 'Dashboard',     icon: LayoutDashboard, end: true,  testId: 'nav-dashboard' },
    { to: '/app/subscriptions', label: 'Subscriptions', icon: CreditCard,      end: false, testId: 'nav-subscriptions' },
    { to: '/app/analytics',     label: 'Analytics',     icon: BarChart3,       end: false, testId: 'nav-analytics' },
    { to: '/app/settings',      label: 'Settings',      icon: SettingsIcon,    end: false, testId: 'nav-settings' },
];

export default function AppShell() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [notifOpen, setNotifOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [unread, setUnread] = useState(0);
    // Simple "refresh token" — bumped whenever data mutates globally.
    // Dashboard/Subscriptions/Analytics read this via useOutletContext() and refetch.
    const [refreshTick, setRefreshTick] = useState(0);
    const bumpRefresh = () => setRefreshTick((n) => n + 1);

    // Poll notifications every 45s to keep bell badge fresh
    useEffect(() => {
        let alive = true;
        const load = async () => {
            try {
                const { data } = await api.get('/notifications');
                if (!alive) return;
                setUnread(data.filter((n) => !n.is_read).length);
            } catch {}
        };
        load();
        const t = setInterval(load, 45000);
        return () => { alive = false; clearInterval(t); };
    }, []);

    return (
        <div className="min-h-screen flex bg-[#F9F9F9] text-[#0A0A0A]">
            {/* ---------- Sidebar ---------- */}
            <aside className="hidden md:flex w-60 flex-col border-r border-[#E5E7EB] bg-white">
                <div className="px-6 py-6 flex items-center gap-2" data-testid="app-brand">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: '#002FA7' }}>
                        <Layers size={16} color="white" strokeWidth={1.8} />
                    </div>
                    <span className="font-bold tracking-tight">SubManager</span>
                </div>

                <nav className="flex-1 px-3 space-y-1">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            data-testid={item.testId}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                                    isActive
                                        ? 'bg-[#F3F4F6] text-[#0A0A0A] font-medium'
                                        : 'text-[#52525B] hover:bg-[#F3F4F6]'
                                }`
                            }
                        >
                            <item.icon size={16} strokeWidth={1.5} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="border-t border-[#E5E7EB] p-4">
                    <div className="flex items-center gap-3 mb-3">
                        <img
                            src="https://images.unsplash.com/photo-1758613654360-45f1ff78c0cf?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODl8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdCUyMG1pbmltYWxpc3R8ZW58MHx8fHwxNzc2ODM5Njc2fDA&ixlib=rb-4.1.0&q=85"
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{user?.name}</div>
                            <div className="text-xs text-[#A1A1AA] truncate">{user?.email}</div>
                        </div>
                    </div>
                    <button
                        onClick={() => { logout(); navigate('/auth'); }}
                        data-testid="logout-button"
                        className="w-full flex items-center justify-center gap-2 text-xs text-[#52525B] hover:text-[#DC2626] transition-colors py-2"
                    >
                        <LogOut size={14} strokeWidth={1.5} /> Sign out
                    </button>
                </div>
            </aside>

            {/* ---------- Main ---------- */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB]">
                    <div className="px-6 sm:px-8 py-4 flex items-center justify-between">
                        <div>
                            <div className="label-uppercase">Your Hub</div>
                            <div className="text-sm text-[#52525B]">Welcome, {user?.name?.split(' ')[0]}</div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setAddOpen(true)}
                                data-testid="header-add-subscription"
                                className="hidden sm:inline-flex items-center gap-2 bg-[#002FA7] hover:bg-[#002585]
                                         text-white rounded-md px-4 py-2 text-sm font-medium transition-colors"
                            >
                                <Plus size={14} strokeWidth={2} />
                                Add subscription
                            </button>

                            <button
                                onClick={() => setNotifOpen(true)}
                                data-testid="header-notifications-button"
                                className="relative w-9 h-9 flex items-center justify-center rounded-md border border-[#E5E7EB] hover:bg-[#F3F4F6]"
                            >
                                <Bell size={16} strokeWidth={1.5} />
                                {unread > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-[#DC2626] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                                        {unread > 9 ? '9+' : unread}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile nav */}
                    <div className="md:hidden flex overflow-x-auto gap-2 px-4 pb-3">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} end={item.end}
                                className={({ isActive }) =>
                                    `whitespace-nowrap px-3 py-1.5 rounded-md text-xs border ${
                                        isActive ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'border-[#E5E7EB] text-[#52525B]'
                                    }`
                                }>
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                </header>

                <main className="flex-1 p-6 sm:p-8 max-w-[1400px] w-full mx-auto">
                    <Outlet context={{ openAdd: () => setAddOpen(true), refreshTick, bumpRefresh }} />
                </main>
            </div>

            {/* Slide-over panels */}
            <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} onChanged={(n) => setUnread(n)} />
            <SubscriptionModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSaved={() => { setAddOpen(false); bumpRefresh(); }}
            />
        </div>
    );
}
