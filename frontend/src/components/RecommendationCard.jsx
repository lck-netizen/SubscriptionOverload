/* ============================================================
   RECOMMENDATION CARD — Renders a single rule-based suggestion
   (cancel / downgrade / reminder).
============================================================ */
import React from 'react';
import { AlertCircle, TrendingDown, Clock } from 'lucide-react';
import { formatINR } from '@/lib/api';

const config = {
    cancel:    { icon: AlertCircle,  label: 'Cancel', bg: '#FEF2F2', color: '#DC2626', border: '#FCA5A5' },
    downgrade: { icon: TrendingDown, label: 'Downgrade', bg: '#FFFBEB', color: '#D97706', border: '#FCD34D' },
    reminder:  { icon: Clock,        label: 'Renewal',  bg: '#F0F5FF', color: '#002FA7', border: '#BFDBFE' },
};

export default function RecommendationCard({ rec }) {
    const c = config[rec.type] || config.reminder;
    const Icon = c.icon;
    return (
        <div
            className="rounded-md border p-3 flex items-start gap-3"
            style={{ background: c.bg, borderColor: c.border }}
            data-testid={`rec-card-${rec.subscription_id}`}
        >
            <div className="mt-0.5" style={{ color: c.color }}><Icon size={14} strokeWidth={1.8} /></div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: c.color }}>
                        {c.label}
                    </span>
                    <span className="text-sm font-medium truncate">{rec.service_name}</span>
                </div>
                <div className="text-xs text-[#52525B] mt-1">{rec.reason}</div>
                {rec.saving > 0 && (
                    <div className="text-xs mt-1" style={{ color: c.color }}>
                        Potential savings: <span className="font-semibold">{formatINR(rec.saving)}/mo</span>
                    </div>
                )}
            </div>
        </div>
    );
}
