/* ============================================================
   SETTINGS PAGE — Profile info + monthly budget control.
============================================================ */
import React, { useEffect, useState } from 'react';
import { api, formatINR } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Wallet, User, Mail, Send } from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const [limit, setLimit] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [lastEmailResult, setLastEmailResult] = useState(null);

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

    /* Instantly send a sample renewal-reminder email — used during live demos. */
    const sendTestEmail = async () => {
        setSending(true);
        try {
            const { data } = await api.post('/demo/send-test-email');
            setLastEmailResult(data);
            if (data.email_status === 'sent') {
                toast.success(`Email sent to ${data.email_to}`);
            } else if (data.email_status === 'failed') {
                toast.error(`Email failed: ${data.email_error}`);
            } else {
                toast.info('Email skipped (no API key), but notification was created.');
            }
        } catch (e) {
            toast.error(e?.response?.data?.detail || 'Failed to send.');
        } finally {
            setSending(false);
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

            {/* Instant test email — perfect for live demos */}
            <div className="card-flat p-6">
                <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                    <div className="label-uppercase">Notifications</div>
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-1">Send a test renewal email</h3>
                <p className="text-sm text-[#52525B] mb-4">
                    Triggers a sample <strong>renewal reminder</strong> email to <strong>{user?.email}</strong> and
                    also drops an in-app notification. Use this to demo the reminder flow live.
                </p>
                <button
                    onClick={sendTestEmail}
                    disabled={sending}
                    data-testid="send-test-email-button"
                    className="inline-flex items-center gap-2 bg-[#0A0A0A] hover:bg-[#262626] text-white rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-60"
                >
                    <Send size={14} strokeWidth={1.8} />
                    {sending ? 'Sending…' : 'Send test email now'}
                </button>

                {lastEmailResult && (
                    <div
                        data-testid="test-email-result"
                        className={`mt-4 text-xs rounded-md px-3 py-2 border ${
                            lastEmailResult.email_status === 'sent'
                                ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#16A34A]'
                                : lastEmailResult.email_status === 'failed'
                                    ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
                                    : 'bg-[#FFFBEB] border-[#FCD34D] text-[#D97706]'
                        }`}
                    >
                        <strong className="uppercase tracking-wider">{lastEmailResult.email_status}</strong> — to {lastEmailResult.email_to}
                        {lastEmailResult.email_error && <> · {lastEmailResult.email_error}</>}
                        <div className="text-[11px] text-[#52525B] mt-1">
                            In-app notification was also created. Click the bell icon to view it.
                        </div>
                    </div>
                )}

                <div className="mt-3 text-[11px] text-[#A1A1AA] leading-relaxed">
                    <strong>Heads-up for live demos:</strong> Resend only delivers to the email that verified your Resend account
                    while in sandbox mode. If the email doesn't arrive, re-register your app with your Resend-verified
                    email — or verify a custom domain at resend.com/domains.
                </div>
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
