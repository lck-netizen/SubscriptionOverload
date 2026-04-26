/* ============================================================
   SETTINGS PAGE — Profile info + monthly budget control + email preferences.
============================================================ */
import React, { useEffect, useState } from 'react';
import { api, formatINR } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Wallet, User as UserIcon, Mail, Send, Phone, Globe } from 'lucide-react';

export default function Settings() {
    const { user, loading: authLoading } = useAuth();
    const [limit, setLimit] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);
    const [lastEmailResult, setLastEmailResult] = useState(null);
    
    // Profile state
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [country, setCountry] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);
    
    // Email preferences state
    const [displayName, setDisplayName] = useState('');
    const [notificationEmail, setNotificationEmail] = useState('');
    const [customFooter, setCustomFooter] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);

    useEffect(() => {
        if (!user) return;
        (async () => {
            const { data } = await api.get('/budget');
            setLimit(data.monthly_limit > 0 ? String(data.monthly_limit) : '');
            
            // Set profile data
            setFirstName(user.firstName || '');
            setLastName(user.lastName || '');
            setPhone(user.phone || '');
            setCountry(user.country || '');
            
            // Set email preferences
            setDisplayName(user.emailPreferences?.displayName || `${user.firstName} ${user.lastName}`);
            setNotificationEmail(user.emailPreferences?.notificationEmail || user.email);
            setCustomFooter(user.emailPreferences?.customFooter || '');
            
            setLoading(false);
        })();
    }, [user]);

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
    
    const saveProfile = async () => {
        setSavingProfile(true);
        try {
            await api.put('/profile', { firstName, lastName, phone, country });
            toast.success('Profile updated.');
        } catch {
            toast.error('Failed to update profile.');
        } finally {
            setSavingProfile(false);
        }
    };
    
    const saveEmailPreferences = async () => {
        setSavingEmail(true);
        try {
            await api.put('/profile', { 
                emailPreferences: {
                    displayName,
                    notificationEmail,
                    customFooter
                }
            });
            toast.success('Email preferences saved.');
        } catch {
            toast.error('Failed to save email preferences.');
        } finally {
            setSavingEmail(false);
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

    if (!user || authLoading) return <div className="text-center py-8">Loading...</div>;

    return (
        <div className="space-y-8 anim-fade-up max-w-3xl">
            <div>
                <div className="label-uppercase">Account</div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Settings</h1>
            </div>

            {/* Profile */}
            <div className="card-flat p-6">
                <div className="flex items-center gap-2 mb-4">
                    <UserIcon size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                    <div className="label-uppercase">Profile Information</div>
                </div>
                
                {loading ? (
                    <div className="space-y-4">
                        <div className="h-10 w-full skeleton" />
                        <div className="h-10 w-full skeleton" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField 
                                label="First Name" 
                                value={firstName} 
                                onChange={setFirstName}
                                icon={<UserIcon size={14} />}
                            />
                            <InputField 
                                label="Last Name" 
                                value={lastName} 
                                onChange={setLastName}
                                icon={<UserIcon size={14} />}
                            />
                        </div>
                        <ReadOnly label="Email" value={user.email} icon={<Mail size={14} />} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <InputField 
                                label="Phone" 
                                value={phone} 
                                onChange={setPhone}
                                icon={<Phone size={14} />}
                                placeholder="Optional"
                            />
                            <InputField 
                                label="Country" 
                                value={country} 
                                onChange={setCountry}
                                icon={<Globe size={14} />}
                                placeholder="Optional"
                            />
                        </div>
                        <button
                            onClick={saveProfile}
                            disabled={savingProfile}
                            className="bg-[#002FA7] hover:bg-[#002585] text-white rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-60"
                        >
                            {savingProfile ? 'Saving…' : 'Save Profile'}
                        </button>
                    </div>
                )}
            </div>
            
            {/* Email Preferences */}
            <div className="card-flat p-6">
                <div className="flex items-center gap-2 mb-1">
                    <Mail size={14} strokeWidth={1.5} className="text-[#A1A1AA]" />
                    <div className="label-uppercase">Email Preferences</div>
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-1">Customize your email notifications</h3>
                <p className="text-sm text-[#52525B] mb-4">
                    These details will be used in renewal reminder emails sent to you.
                </p>

                {loading ? (
                    <div className="space-y-4">
                        <div className="h-10 w-full skeleton" />
                        <div className="h-10 w-full skeleton" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <InputField 
                            label="Display Name" 
                            value={displayName} 
                            onChange={setDisplayName}
                            placeholder="How you want to be addressed in emails"
                        />
                        <InputField 
                            label="Notification Email" 
                            value={notificationEmail} 
                            onChange={setNotificationEmail}
                            placeholder="Email to receive notifications"
                            type="email"
                        />
                        <div>
                            <div className="label-uppercase mb-1">Custom Footer Message</div>
                            <textarea
                                value={customFooter}
                                onChange={(e) => setCustomFooter(e.target.value)}
                                placeholder="Optional custom message to appear in email footer"
                                rows={3}
                                className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-2.5 bg-white outline-none focus:border-[#002FA7] focus:ring-2 focus:ring-[#002FA7]/20"
                            />
                        </div>
                        <button
                            onClick={saveEmailPreferences}
                            disabled={savingEmail}
                            className="bg-[#002FA7] hover:bg-[#002585] text-white rounded-md px-5 py-2.5 text-sm font-medium disabled:opacity-60"
                        >
                            {savingEmail ? 'Saving…' : 'Save Email Preferences'}
                        </button>
                    </div>
                )}
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
                    <div className="label-uppercase">Test Notifications</div>
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-1">Send a test renewal email</h3>
                <p className="text-sm text-[#52525B] mb-4">
                    Triggers a sample <strong>renewal reminder</strong> email to <strong>{notificationEmail || user.email}</strong> and
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

const InputField = ({ label, value, onChange, icon, placeholder, type = 'text' }) => (
    <div>
        <div className="label-uppercase mb-1 flex items-center gap-1.5">
            {icon && <span className="text-[#A1A1AA]">{icon}</span>}
            <span>{label}</span>
        </div>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm border border-[#E5E7EB] rounded-md px-3 py-2.5 bg-white outline-none focus:border-[#002FA7] focus:ring-2 focus:ring-[#002FA7]/20"
        />
    </div>
);

const ReadOnly = ({ label, value, icon }) => (
    <div>
        <div className="label-uppercase mb-1 flex items-center gap-1.5">
            {icon && <span className="text-[#A1A1AA]">{icon}</span>}
            <span>{label}</span>
        </div>
        <div className="text-sm font-medium px-3 py-2.5 bg-[#F9F9F9] border border-[#E5E7EB] rounded-md">{value}</div>
    </div>
);
