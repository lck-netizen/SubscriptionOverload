/* ============================================================
   ANALYTICS PAGE — Charts using Recharts (monthly trend, category pie, forecast).
============================================================ */
import React, { useEffect, useState } from 'react';
import { api, formatINR } from '@/lib/api';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
    PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';

const COLORS = ['#002FA7', '#16A34A', '#D97706', '#7C3AED', '#DC2626', '#0EA5E9', '#DB2777', '#52525B'];

export default function Analytics() {
    const [summary, setSummary] = useState(null);
    const [forecast, setForecast] = useState(null);

    useEffect(() => {
        (async () => {
            const [s, f] = await Promise.all([
                api.get('/analytics/summary'),
                api.get('/analytics/forecast'),
            ]);
            setSummary(s.data);
            setForecast(f.data);
        })();
    }, []);

    if (!summary || !forecast) {
        return <div className="h-80 skeleton" />;
    }

    return (
        <div className="space-y-8 anim-fade-up">
            <div>
                <div className="label-uppercase">Insights</div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Analytics</h1>
                <p className="text-sm text-[#52525B] mt-2">Understand where your money flows every month.</p>
            </div>

            {/* Headline stats */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <Stat label="Monthly spend" value={formatINR(summary.monthly_total)} testId="stat-monthly" />
                <Stat label="Yearly projection" value={formatINR(summary.yearly_total)} testId="stat-yearly" />
                <Stat label="Active services" value={summary.active_count} testId="stat-active" />
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie by category */}
                <div className="card-flat p-6">
                    <div className="label-uppercase mb-1">Category</div>
                    <h3 className="text-xl font-semibold tracking-tight mb-4">Spend by category (₹/mo)</h3>
                    {summary.category_breakdown.length === 0 ? (
                        <p className="text-sm text-[#52525B]">No data yet.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={summary.category_breakdown}
                                    dataKey="amount"
                                    nameKey="category"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={2}
                                >
                                    {summary.category_breakdown.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 6 }}
                                    formatter={(v) => formatINR(v)}
                                />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Bar chart: per-service */}
                <div className="card-flat p-6">
                    <div className="label-uppercase mb-1">Services</div>
                    <h3 className="text-xl font-semibold tracking-tight mb-4">Top categories (monthly ₹)</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={summary.category_breakdown.slice(0, 8)} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                            <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#52525B' }} />
                            <YAxis tick={{ fontSize: 11, fill: '#52525B' }} />
                            <Tooltip
                                contentStyle={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 6 }}
                                formatter={(v) => formatINR(v)}
                            />
                            <Bar dataKey="amount" fill="#002FA7" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Forecast line */}
            <div className="card-flat p-6">
                <div className="label-uppercase mb-1">Forecast</div>
                <h3 className="text-xl font-semibold tracking-tight mb-1">6-month spend projection</h3>
                <p className="text-sm text-[#52525B] mb-4">
                    Based on the current active subscriptions, we project ~{formatINR(forecast.monthly_avg)} per month.
                </p>
                <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={forecast.forecast} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#52525B' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#52525B' }} />
                        <Tooltip
                            contentStyle={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 6 }}
                            formatter={(v) => formatINR(v)}
                        />
                        <Line type="monotone" dataKey="projected" stroke="#002FA7" strokeWidth={2} dot={{ r: 4, fill: '#002FA7' }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

const Stat = ({ label, value, testId }) => (
    <div className="card-flat p-6" data-testid={testId}>
        <div className="label-uppercase mb-3">{label}</div>
        <div className="text-3xl sm:text-4xl font-light tracking-tighter">{value}</div>
    </div>
);
