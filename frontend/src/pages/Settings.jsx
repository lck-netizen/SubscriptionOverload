/* ============================================================
   SETTINGS PAGE — Profile info + monthly budget control.
============================================================ */
import React, { useEffect, useState } from 'react';
import { api, formatINR } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Wallet, User } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [limit, setLimit] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            const { data } = await api.get('/budget');
            setLimit(data.monthly_limit > 0 ? String(data.monthly_limit) : '');
            setLoading(false);
        })();
    }, []);

    const save = async () => {
        setSaving(true);
        try {
            await api.post('/budget', { monthly_limit: Number(limit) || 0 });
            toast.success('Budget saved.');
        } catch {
            toast.error('Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 anim-fade-up max-w-3xl">
            <div>
                <div className="label-uppercase">Account</div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Settings</h1>
            </div>

            {/* Profile */}
            <div className="card-flat p-6">
                <div className="flex items-center gap-2 mb-4">
                    <User size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                    <div className="label-uppercase">Profile</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <ReadOnly label="Name" value={user?.name} />
                    <ReadOnly label="Email" value={user?.email} />
                </div>
            </div>

            {/* Budget */}
            <div className="card-flat p-6">
                <div className="flex items-center gap-2 mb-1">
                    <Wallet size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                    <div className="label-uppercase">Budget</div>
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-1">Monthly spend limit</h3>
                <p className="text-sm text-[#52525B] mb-4">
                    When your total monthly subscription spend exceeds this amount we'll alert you on the dashboard. Set to 0 to disable.
                </p>

                {loading ? (
                    <div className="h-10 w-48 skeleton" />
                ) : (
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-md px-3 py-2.5 bg-white">
                            <span className="text-[#52525B] text-sm">₹</span>
                            <input
                                type="number"
                                min="0"
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                placeholder="e.g. 2000"
                                data-testid="budget-input"
                                className="text-sm bg-transparent outline-none w-36"
                            />
                        </div>
                        <button
                            onClick={save}
                            disabled={saving}
                            data-testid="save-budget-button"
                            className="bg-[#002FA7] hover:bg-[#002585] text-white rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-60"
                        >
                            {saving ? 'Saving…' : 'Save budget'}
                        </button>
                        {limit && Number(limit) > 0 && (
                            <div className="text-xs text-[#52525B]">
                                Current: <span className="font-semibold text-[#0A0A0A]">{formatINR(limit)}/mo</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

const ReadOnly = ({ label, value }) => (
    <div>
        <div className="label-uppercase mb-1">{label}</div>
        <div className="text-sm font-medium">{value}</div>
    </div>
);
