/* ============================================================
   SUBSCRIPTIONS PAGE — Full list with search, category filter,
   status filter, sort (price/date) and inline row actions.
   ============================================================ */
import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api, formatINR } from '@/lib/api';
import {
    Search, Plus, Filter, Pencil, Trash2, CheckCircle2,
    XCircle, ArrowUpDown, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import SubscriptionModal from '@/components/SubscriptionModal';

const ALL_CATEGORIES = ['All', 'OTT', 'Music', 'Cloud', 'SaaS', 'Productivity', 'Gaming', 'News', 'Fitness', 'Other'];

/* Available sort orders. Each entry knows how to sort + its label */
const SORT_OPTIONS = [
    { id: 'newest',      label: 'Newest first',      fn: (a, b) => new Date(b.created_at) - new Date(a.created_at) },
    { id: 'price_desc',  label: 'Price: high → low', fn: (a, b) => b.cost - a.cost },
    { id: 'price_asc',   label: 'Price: low → high', fn: (a, b) => a.cost - b.cost },
    { id: 'renewal_asc', label: 'Renewal: soonest',  fn: (a, b) => new Date(a.renewal_date) - new Date(b.renewal_date) },
    { id: 'renewal_desc',label: 'Renewal: latest',   fn: (a, b) => new Date(b.renewal_date) - new Date(a.renewal_date) },
    { id: 'name_asc',    label: 'Name: A → Z',       fn: (a, b) => a.service_name.localeCompare(b.service_name) },
];

export default function Subscriptions() {
    const { openAdd, refreshTick, bumpRefresh } = useOutletContext();
    const [subs, setSubs] = useState([]);
    const [query, setQuery] = useState('');
    const [cat, setCat] = useState('All');
    const [status, setStatus] = useState('active');
    const [sortId, setSortId] = useState('newest');
    const [editing, setEditing] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null); // inline confirm
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/subscriptions');
            setSubs(data);
        } finally { setLoading(false); }
    };
    // Refetch on mount and whenever data mutates elsewhere (global refresh tick)
    useEffect(() => { load(); }, [refreshTick]);

    /* Apply filters and sorting */
    const filtered = useMemo(() => {
        const sortFn = SORT_OPTIONS.find((o) => o.id === sortId)?.fn;
        const list = subs
            .filter((s) => cat === 'All' || s.category === cat)
            .filter((s) => status === 'all' || s.status === status)
            .filter((s) => s.service_name.toLowerCase().includes(query.toLowerCase()));
        return sortFn ? [...list].sort(sortFn) : list;
    }, [subs, cat, status, query, sortId]);

    const monthlyTotal = filtered.reduce((sum, s) => {
        const m = s.billing_cycle === 'yearly' ? s.cost / 12 : s.billing_cycle === 'weekly' ? s.cost * 4.33 : s.cost;
        return sum + m;
    }, 0);

    /* ------ actions ------
       NOTE: We intentionally avoid window.confirm() (it is blocked inside
       some preview iframes). Instead, pressing Delete puts the row into
       "confirm mode" — the user clicks a green ✓ to actually delete or
       ✕ to cancel. */
    const performDelete = async (id) => {
        try {
            await api.delete(`/subscriptions/${id}`);
            toast.success('Deleted.');
            setConfirmDeleteId(null);
            bumpRefresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Delete failed.');
        }
    };
    const onToggleStatus = async (s) => {
        try {
            await api.put(`/subscriptions/${s.id}`, { status: s.status === 'active' ? 'cancelled' : 'active' });
            toast.success(s.status === 'active' ? 'Marked cancelled.' : 'Reactivated.');
            bumpRefresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Update failed.');
        }
    };
    const onMarkUsed = async (id) => {
        try {
            await api.post(`/subscriptions/${id}/use`);
            toast.success('Marked as used today.');
            bumpRefresh();
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed.');
        }
    };

    return (
        <div className="space-y-6 anim-fade-up">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="label-uppercase">Manage</div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Subscriptions</h1>
                    <p className="text-sm text-[#52525B] mt-2">
                        Showing {filtered.length} · Monthly equivalent {formatINR(monthlyTotal)}
                    </p>
                </div>
                <button
                    onClick={openAdd}
                    data-testid="subs-add-button"
                    className="inline-flex items-center gap-2 bg-[#002FA7] hover:bg-[#002585] text-white rounded-md px-4 py-2 text-sm font-medium"
                >
                    <Plus size={14} /> New subscription
                </button>
            </div>

            {/* Filters row 1 — search + sort + status */}
            <div className="card-flat p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-[240px] border border-[#E5E7EB] rounded-md px-3 py-2 bg-white">
                        <Search size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                        <input
                            data-testid="subs-search-input"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search services…"
                            className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#A1A1AA]"
                        />
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-md px-3 py-2 bg-white">
                        <ArrowUpDown size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                        <select
                            value={sortId}
                            onChange={(e) => setSortId(e.target.value)}
                            data-testid="sort-select"
                            className="text-sm bg-transparent outline-none"
                        >
                            {SORT_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                    </div>

                    {/* Status */}
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        data-testid="status-filter"
                        className="text-sm px-3 py-2 rounded-md border border-[#E5E7EB] bg-white"
                    >
                        <option value="active">Active</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="all">All</option>
                    </select>
                </div>

                {/* Filters row 2 — category pills */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Filter size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                    {ALL_CATEGORIES.map((c) => (
                        <button
                            key={c}
                            onClick={() => setCat(c)}
                            data-testid={`cat-filter-${c}`}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                cat === c ? 'bg-[#0A0A0A] text-white border-[#0A0A0A]' : 'border-[#E5E7EB] text-[#52525B] hover:bg-[#F3F4F6]'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card-flat overflow-hidden">
                {loading ? (
                    <div className="p-6 space-y-3">
                        {[...Array(4)].map((_, i) => <div key={i} className="h-14 skeleton" />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="font-semibold">No subscriptions found.</div>
                        <p className="text-sm text-[#52525B] mt-1">Try clearing filters or add your first subscription.</p>
                        <button
                            onClick={openAdd}
                            className="mt-4 bg-[#002FA7] hover:bg-[#002585] text-white rounded-md px-4 py-2 text-sm font-medium"
                            data-testid="empty-subs-add-button"
                        >Add subscription</button>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-[#F9F9F9] text-[#52525B]">
                            <tr>
                                <th className="text-left px-6 py-3 label-uppercase">Service</th>
                                <th className="text-left px-4 py-3 label-uppercase">Category</th>
                                <th className="text-left px-4 py-3 label-uppercase">Cost</th>
                                <th className="text-left px-4 py-3 label-uppercase hidden md:table-cell">Cycle</th>
                                <th className="text-left px-4 py-3 label-uppercase hidden md:table-cell">Renewal</th>
                                <th className="text-left px-4 py-3 label-uppercase">Status</th>
                                <th className="text-right px-6 py-3 label-uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E5E7EB]">
                            {filtered.map((s) => {
                                const isConfirming = confirmDeleteId === s.id;
                                return (
                                    <tr key={s.id} className="row-hover" data-testid={`sub-row-${s.id}`}>
                                        <td className="px-6 py-4 font-medium">{s.service_name}</td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#0A0A0A]">{s.category}</span>
                                        </td>
                                        <td className="px-4 py-4 font-medium">{formatINR(s.cost)}</td>
                                        <td className="px-4 py-4 text-[#52525B] hidden md:table-cell capitalize">{s.billing_cycle}</td>
                                        <td className="px-4 py-4 text-[#52525B] hidden md:table-cell">{s.renewal_date}</td>
                                        <td className="px-4 py-4">
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                s.status === 'active' ? 'bg-[#F0FDF4] text-[#16A34A]' : 'bg-[#FEF2F2] text-[#DC2626]'
                                            }`}>{s.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {isConfirming ? (
                                                /* Inline delete confirmation — avoids iframe-blocked window.confirm */
                                                <div className="inline-flex items-center gap-2">
                                                    <span className="text-xs text-[#DC2626]">Delete?</span>
                                                    <IconBtn title="Confirm delete" onClick={() => performDelete(s.id)} testId={`confirm-delete-${s.id}`} variant="confirm-danger">
                                                        <Check size={14} strokeWidth={2} />
                                                    </IconBtn>
                                                    <IconBtn title="Cancel" onClick={() => setConfirmDeleteId(null)} testId={`cancel-delete-${s.id}`}>
                                                        <X size={14} strokeWidth={2} />
                                                    </IconBtn>
                                                </div>
                                            ) : (
                                                <div className="inline-flex items-center gap-1">
                                                    <IconBtn title="Mark used today" onClick={() => onMarkUsed(s.id)} testId={`use-${s.id}`}>
                                                        <CheckCircle2 size={14} strokeWidth={1.5} />
                                                    </IconBtn>
                                                    <IconBtn title="Edit" onClick={() => setEditing(s)} testId={`edit-${s.id}`}>
                                                        <Pencil size={14} strokeWidth={1.5} />
                                                    </IconBtn>
                                                    <IconBtn title={s.status === 'active' ? 'Mark cancelled' : 'Reactivate'} onClick={() => onToggleStatus(s)} testId={`toggle-${s.id}`}>
                                                        <XCircle size={14} strokeWidth={1.5} />
                                                    </IconBtn>
                                                    <IconBtn title="Delete" onClick={() => setConfirmDeleteId(s.id)} testId={`delete-${s.id}`} variant="danger">
                                                        <Trash2 size={14} strokeWidth={1.5} />
                                                    </IconBtn>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <SubscriptionModal
                open={!!editing}
                sub={editing}
                onClose={() => setEditing(null)}
                onSaved={() => { setEditing(null); bumpRefresh(); }}
            />
        </div>
    );
}

/* Reusable icon button. Variants: default, danger (red hover), confirm-danger (solid red) */
const IconBtn = ({ children, onClick, title, testId, variant = 'default' }) => {
    const cls = {
        default:         'text-[#52525B] hover:bg-[#F3F4F6] hover:text-[#0A0A0A]',
        danger:          'text-[#52525B] hover:bg-[#FEF2F2] hover:text-[#DC2626]',
        'confirm-danger':'bg-[#DC2626] text-white hover:bg-[#B91C1C]',
    }[variant];
    return (
        <button
            onClick={onClick}
            title={title}
            data-testid={testId}
            className={`w-8 h-8 rounded-md inline-flex items-center justify-center transition-colors ${cls}`}
        >
            {children}
        </button>
    );
};
