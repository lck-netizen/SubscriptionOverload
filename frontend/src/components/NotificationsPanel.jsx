/* ============================================================
   NOTIFICATIONS PANEL — Slide-over from the right showing
   in-app notifications (renewal reminders, suggestions).
============================================================ */
import React, { useEffect, useState } from 'react';
import { X, Bell, Check } from 'lucide-react';
import { api } from '@/lib/api';

export default function NotificationsPanel({ open, onClose, onChanged }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/notifications');
            setItems(data);
            onChanged?.(data.filter((n) => !n.is_read).length);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (open) load(); /* eslint-disable-next-line */ }, [open]);

    const markOne = async (id) => {
        await api.post(`/notifications/${id}/read`);
        load();
    };

    const markAll = async () => {
        await api.post('/notifications/read-all');
        load();
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50" data-testid="notifications-panel">
            <div className="absolute inset-0 bg-black/20" onClick={onClose} />
            <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white border-l border-[#E5E7EB] flex flex-col anim-fade-up">
                <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bell size={16} strokeWidth={1.5} />
                        <h3 className="text-base font-semibold tracking-tight">Notifications</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={markAll} data-testid="mark-all-read-button"
                                className="text-xs text-[#002FA7] hover:underline">Mark all read</button>
                        <button onClick={onClose} data-testid="notif-close-button"
                                className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F3F4F6]">
                            <X size={16} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {loading ? (
                        <div className="p-4 space-y-2">
                            {[...Array(3)].map((_, i) => <div key={i} className="h-16 skeleton" />)}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="text-sm font-semibold">All clear.</div>
                            <p className="text-xs text-[#52525B] mt-1">We'll let you know about upcoming renewals and savings ideas.</p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-[#E5E7EB]">
                            {items.map((n) => (
                                <li key={n.id} className={`px-6 py-4 flex items-start gap-3 row-hover ${!n.is_read ? 'bg-[#F9F9F9]' : ''}`}
                                    data-testid={`notif-${n.id}`}>
                                    <span className={`mt-1 w-2 h-2 rounded-full ${!n.is_read ? 'bg-[#002FA7]' : 'bg-[#E5E7EB]'}`} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm">{n.message}</div>
                                        <div className="text-[11px] text-[#A1A1AA] uppercase tracking-wider mt-1">{n.type}</div>
                                    </div>
                                    {!n.is_read && (
                                        <button onClick={() => markOne(n.id)} title="Mark read"
                                                data-testid={`mark-read-${n.id}`}
                                                className="text-[#52525B] hover:text-[#002FA7]">
                                            <Check size={14} strokeWidth={1.5} />
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </aside>
        </div>
    );
}
