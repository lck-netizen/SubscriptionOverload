/* ============================================================
   SUBSCRIPTION MODAL — Add / Edit a subscription.
   Opens as a centered modal. Pre-fills when `sub` is provided.
============================================================ */
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const CATEGORIES = ['', 'OTT', 'Music', 'Cloud', 'SaaS', 'Productivity', 'Gaming', 'News', 'Fitness', 'Other'];

export default function SubscriptionModal({ open, onClose, onSaved, sub }) {
    // Local form state — initialized from `sub` prop on open (for editing)
    const [form, setForm] = useState({
        service_name: '',
        cost: '',
        billing_cycle: 'monthly',
        renewal_date: new Date().toISOString().slice(0, 10),
        category: '',
        reminder_days: 3,
        notes: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (sub) {
            setForm({
                service_name: sub.service_name || '',
                cost: String(sub.cost ?? ''),
                billing_cycle: sub.billing_cycle || 'monthly',
                renewal_date: sub.renewal_date || new Date().toISOString().slice(0, 10),
                category: sub.category || '',
                reminder_days: sub.reminder_days ?? 3,
                notes: sub.notes || '',
            });
        } else {
            setForm({
                service_name: '',
                cost: '',
                billing_cycle: 'monthly',
                renewal_date: new Date().toISOString().slice(0, 10),
                category: '',
                reminder_days: 3,
                notes: '',
            });
        }
    }, [sub, open]);

    if (!open) return null;

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const save = async (e) => {
        e.preventDefault();
        if (!form.service_name || !form.cost) {
            toast.error('Please enter a service name and cost.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                service_name: form.service_name,
                cost: Number(form.cost),
                billing_cycle: form.billing_cycle,
                renewal_date: form.renewal_date,
                category: form.category || null,
                reminder_days: Number(form.reminder_days) || 3,
                notes: form.notes,
            };
            if (sub) {
                await api.put(`/subscriptions/${sub.id}`, payload);
                toast.success('Updated.');
            } else {
                await api.post('/subscriptions', payload);
                toast.success('Subscription added.');
            }
            onSaved?.();
        } catch (err) {
            toast.error(err?.response?.data?.detail || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="subscription-modal">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
            <div className="relative bg-white border border-[#E5E7EB] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] w-full max-w-lg anim-fade-up">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
                    <div>
                        <div className="label-uppercase">{sub ? 'Edit' : 'New'}</div>
                        <h3 className="text-lg font-semibold tracking-tight">{sub ? 'Edit subscription' : 'Add subscription'}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        data-testid="modal-close-button"
                        className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[#F3F4F6]"
                    >
                        <X size={16} strokeWidth={1.5} />
                    </button>
                </div>

                <form onSubmit={save} className="p-6 space-y-4" data-testid="subscription-form">
                    <Row>
                        <Field label="Service name" testId="form-service">
                            <input required value={form.service_name} onChange={(e) => set('service_name', e.target.value)}
                                placeholder="e.g. Netflix Premium" className={inputCls} data-testid="form-service-input" />
                        </Field>
                        <Field label="Cost (₹)" testId="form-cost">
                            <input required type="number" min="0" step="0.01" value={form.cost}
                                onChange={(e) => set('cost', e.target.value)} placeholder="e.g. 649" className={inputCls}
                                data-testid="form-cost-input" />
                        </Field>
                    </Row>

                    <Row>
                        <Field label="Billing cycle" testId="form-cycle">
                            <select value={form.billing_cycle} onChange={(e) => set('billing_cycle', e.target.value)}
                                    className={inputCls} data-testid="form-cycle-input">
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="weekly">Weekly</option>
                            </select>
                        </Field>
                        <Field label="Renewal date" testId="form-renewal">
                            <input required type="date" value={form.renewal_date}
                                onChange={(e) => set('renewal_date', e.target.value)} className={inputCls}
                                data-testid="form-renewal-input" />
                        </Field>
                    </Row>

                    <Row>
                        <Field label="Category" testId="form-category">
                            <select value={form.category} onChange={(e) => set('category', e.target.value)}
                                    className={inputCls} data-testid="form-category-input">
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c || 'Auto-detect'}</option>)}
                            </select>
                        </Field>
                        <Field label="Remind me (days before)" testId="form-reminder">
                            <input type="number" min="0" max="30" value={form.reminder_days}
                                onChange={(e) => set('reminder_days', e.target.value)} className={inputCls}
                                data-testid="form-reminder-input" />
                        </Field>
                    </Row>

                    <Field label="Notes (optional)" testId="form-notes">
                        <textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)}
                                  placeholder="Shared with family, work account…" className={inputCls}
                                  data-testid="form-notes-input" />
                    </Field>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} data-testid="modal-cancel-button"
                                className="px-4 py-2 rounded-md text-sm font-medium border border-[#E5E7EB] hover:bg-[#F3F4F6]">
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} data-testid="modal-save-button"
                                className="px-5 py-2 rounded-md text-sm font-medium bg-[#002FA7] hover:bg-[#002585] text-white disabled:opacity-60">
                            {saving ? 'Saving…' : (sub ? 'Save changes' : 'Add subscription')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const inputCls = 'w-full border border-[#E5E7EB] rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#002FA7]/20 focus:border-[#002FA7]';

const Row = ({ children }) => <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;

const Field = ({ label, children, testId }) => (
    <label className="block" data-testid={testId}>
        <div className="label-uppercase mb-1">{label}</div>
        {children}
    </label>
);
