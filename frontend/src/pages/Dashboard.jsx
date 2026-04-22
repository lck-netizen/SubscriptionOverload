/* ============================================================
   DASHBOARD — Summary metrics + upcoming renewals + top suggestions.
============================================================ */
import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { api, formatINR } from '@/lib/api';
import { TrendingUp, Layers, Calendar, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import RecommendationCard from '@/components/RecommendationCard';

export default function Dashboard() {
    const { openAdd } = useOutletContext();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [recs, setRecs] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [s, r] = await Promise.all([
                api.get('/analytics/summary'),
                api.get('/recommendations'),
            ]);
            setSummary(s.data);
            setRecs(r.data.suggestions || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return <LoadingSkeleton />;

    const metrics = [
        { label: 'Active subscriptions', value: summary.active_count, icon: Layers, testId: 'metric-active' },
        { label: 'Monthly spend',        value: formatINR(summary.monthly_total), icon: TrendingUp, testId: 'metric-monthly' },
        { label: 'Yearly projection',    value: formatINR(summary.yearly_total),  icon: Calendar,   testId: 'metric-yearly' },
        { label: 'Upcoming in 30 days',  value: summary.upcoming_renewals.length, icon: AlertTriangle, testId: 'metric-upcoming' },
    ];

    return (
        <div className="space-y-8 anim-fade-up" data-testid="dashboard-root">
            {/* Section header */}
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="label-uppercase">Overview</div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Dashboard</h1>
                </div>
                <BudgetPill summary={summary} />
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((m) => (
                    <div key={m.label} className="card-flat p-6" data-testid={m.testId}>
                        <div className="flex items-center justify-between mb-4">
                            <div className="label-uppercase">{m.label}</div>
                            <m.icon size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                        </div>
                        <div className="text-3xl sm:text-4xl font-light tracking-tighter">{m.value}</div>
                    </div>
                ))}
            </div>

            {/* Two-column: upcoming renewals + recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="card-flat lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <div className="label-uppercase">Upcoming</div>
                            <h2 className="text-xl font-semibold tracking-tight">Renewals in next 30 days</h2>
                        </div>
                        <button
                            onClick={() => navigate('/app/subscriptions')}
                            data-testid="see-all-subs-button"
                            className="text-xs text-[#002FA7] hover:underline inline-flex items-center gap-1"
                        >See all <ArrowRight size={12} /></button>
                    </div>

                    {summary.upcoming_renewals.length === 0 ? (
                        <EmptyState
                            title="Nothing due soon"
                            body="No renewals in the next 30 days. Add a subscription to start tracking."
                            actionLabel="Add subscription"
                            onAction={openAdd}
                        />
                    ) : (
                        <ul className="divide-y divide-[#E5E7EB]">
                            {summary.upcoming_renewals.map((u) => (
                                <li key={u.id} className="py-3 flex items-center justify-between row-hover px-2 -mx-2 rounded-md"
                                    data-testid={`upcoming-${u.id}`}>
                                    <div>
                                        <div className="font-medium">{u.service_name}</div>
                                        <div className="text-xs text-[#52525B]">{u.category} · Renews {u.renewal_date}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-semibold">{formatINR(u.cost)}</div>
                                        <div className={`text-xs ${u.days_left <= 3 ? 'text-[#DC2626]' : 'text-[#52525B]'}`}>
                                            in {u.days_left} day{u.days_left !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="card-flat p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles size={14} strokeWidth={1.5} className="text-[#002FA7]" />
                        <div className="label-uppercase">Smart Suggestions</div>
                    </div>
                    {recs.length === 0 ? (
                        <p className="text-sm text-[#52525B]">Looks great — no wasted spend detected right now.</p>
                    ) : (
                        <div className="space-y-3">
                            {recs.slice(0, 4).map((r, i) => (
                                <RecommendationCard key={i} rec={r} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Category breakdown */}
            <div className="card-flat p-6">
                <div className="label-uppercase mb-1">By category</div>
                <h2 className="text-xl font-semibold tracking-tight mb-5">Monthly spend breakdown</h2>
                {summary.category_breakdown.length === 0 ? (
                    <EmptyState title="No data yet" body="Add your first subscription to see your spending by category." actionLabel="Add subscription" onAction={openAdd} />
                ) : (
                    <CategoryBars data={summary.category_breakdown} total={summary.monthly_total} />
                )}
            </div>
        </div>
    );
}

/* ---------- Small pieces ---------- */

const BudgetPill = ({ summary }) => {
    if (!summary) return null;
    if (summary.monthly_limit <= 0) {
        return (
            <div className="text-xs text-[#52525B]">
                No monthly budget set — <a href="/app/settings" className="text-[#002FA7] hover:underline">set one</a>
            </div>
        );
    }
    const over = summary.over_budget;
    return (
        <div
            data-testid="budget-pill"
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
                over ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FCA5A5]' : 'bg-white border-[#E5E7EB] text-[#52525B]'
            }`}
        >
            {over && <AlertTriangle size={12} />}
            Budget {summary.budget_used_pct}% · {formatINR(summary.monthly_total)} / {formatINR(summary.monthly_limit)}
        </div>
    );
};

const CategoryBars = ({ data, total }) => {
    const colors = ['#002FA7', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#0EA5E9', '#DB2777'];
    const sorted = [...data].sort((a, b) => b.amount - a.amount);
    return (
        <div className="space-y-3">
            {sorted.map((c, i) => {
                const pct = total > 0 ? (c.amount / total) * 100 : 0;
                return (
                    <div key={c.category}>
                        <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: colors[i % colors.length] }} />
                                <span className="font-medium">{c.category}</span>
                            </div>
                            <div className="text-[#52525B]">{formatINR(c.amount)} · {pct.toFixed(0)}%</div>
                        </div>
                        <div className="w-full bg-[#F3F4F6] rounded-full h-1.5 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500"
                                 style={{ width: `${pct}%`, background: colors[i % colors.length] }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const EmptyState = ({ title, body, actionLabel, onAction }) => (
    <div className="py-10 text-center">
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-[#52525B] mt-1 max-w-sm mx-auto">{body}</p>
        {onAction && (
            <button
                onClick={onAction}
                data-testid="empty-add-button"
                className="mt-4 bg-[#002FA7] hover:bg-[#002585] text-white rounded-md px-4 py-2 text-sm font-medium"
            >{actionLabel}</button>
        )}
    </div>
);

const LoadingSkeleton = () => (
    <div className="space-y-6">
        <div className="h-12 w-1/3 skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-28 skeleton" />)}
        </div>
        <div className="h-64 skeleton" />
    </div>
);
