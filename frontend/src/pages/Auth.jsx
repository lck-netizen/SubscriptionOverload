/* ============================================================
   AUTH PAGE — Sign in / Sign up in a split-screen layout.
============================================================ */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, Layers } from 'lucide-react';

export default function AuthPage() {
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, register, loading } = useAuth();
    const navigate = useNavigate();

    // Handle form submission for both login and register
    const onSubmit = async (e) => {
        e.preventDefault();
        const action = mode === 'login'
            ? login(email, password)
            : register(name, email, password);
        const result = await action;
        if (result.ok) {
            toast.success(mode === 'login' ? 'Welcome back!' : 'Account created.');
            navigate('/app');
        } else {
            toast.error(result.error);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white">
            {/* ---------- Left: brand / illustration panel ---------- */}
            <div
                className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
                style={{
                    backgroundImage: `linear-gradient(180deg, rgba(249,249,249,0.3) 0%, rgba(249,249,249,0.95) 100%), url('https://images.unsplash.com/photo-1770009971150-f50bc7d373a4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwYXJjaGl0ZWN0dXJhbCUyMGFic3RyYWN0JTIwd2hpdGUlMjBnZW9tZXRyaWMlMjBzaGFwZXN8ZW58MHx8fHwxNzc2ODM5Njg3fDA&ixlib=rb-4.1.0&q=85')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            >
                <div className="flex items-center gap-3" data-testid="brand-mark">
                    <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: '#002FA7' }}>
                        <Layers size={20} color="white" strokeWidth={1.8} />
                    </div>
                    <span className="font-bold tracking-tight text-lg">SubManager</span>
                </div>

                <div className="max-w-md">
                    <div className="label-uppercase mb-4">Subscription Overload Manager</div>
                    <h1 className="text-5xl font-bold tracking-tighter leading-[1.05] mb-6">
                        Every ₹. Every renewal. Under control.
                    </h1>
                    <p className="text-[15px] text-[#52525B] leading-relaxed">
                        Track OTT, SaaS, cloud and productivity spends in one place.
                        Get timely reminders, spot unused subscriptions, and stop bleeding money.
                    </p>
                </div>

                <div className="flex items-center gap-8 text-xs text-[#52525B]">
                    <div><span className="text-[#0A0A0A] font-semibold">Live</span> renewal alerts</div>
                    <div><span className="text-[#0A0A0A] font-semibold">Smart</span> cancel suggestions</div>
                    <div><span className="text-[#0A0A0A] font-semibold">INR</span> analytics</div>
                </div>
            </div>

            {/* ---------- Right: form panel ---------- */}
            <div className="flex items-center justify-center p-6 sm:p-12">
                <div className="w-full max-w-sm anim-fade-up">
                    <div className="label-uppercase mb-3">{mode === 'login' ? 'Sign in' : 'Create account'}</div>
                    <h2 className="text-3xl font-bold tracking-tight mb-8">
                        {mode === 'login' ? 'Welcome back.' : 'Start tracking.'}
                    </h2>

                    <form onSubmit={onSubmit} className="space-y-4" data-testid="auth-form">
                        {mode === 'register' && (
                            <Field icon={<User size={16} strokeWidth={1.5} />} placeholder="Full name"
                                   value={name} onChange={setName} testId="auth-name-input" type="text" />
                        )}
                        <Field icon={<Mail size={16} strokeWidth={1.5} />} placeholder="Email address"
                               value={email} onChange={setEmail} testId="auth-email-input" type="email" />
                        <Field icon={<Lock size={16} strokeWidth={1.5} />} placeholder="Password (6+ chars)"
                               value={password} onChange={setPassword} testId="auth-password-input" type="password" />

                        <button
                            type="submit"
                            disabled={loading}
                            data-testid="auth-submit-button"
                            className="w-full flex items-center justify-center gap-2 bg-[#002FA7] hover:bg-[#002585]
                                       text-white rounded-md py-3 text-sm font-medium transition-colors disabled:opacity-60"
                        >
                            {loading ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Create account')}
                            <ArrowRight size={14} />
                        </button>
                    </form>

                    <div className="mt-6 text-sm text-[#52525B]">
                        {mode === 'login' ? (
                            <>Don't have an account?{' '}
                                <button
                                    onClick={() => setMode('register')}
                                    className="font-medium text-[#002FA7] hover:underline"
                                    data-testid="auth-switch-to-register"
                                >Create one</button>
                            </>
                        ) : (
                            <>Already have an account?{' '}
                                <button
                                    onClick={() => setMode('login')}
                                    className="font-medium text-[#002FA7] hover:underline"
                                    data-testid="auth-switch-to-login"
                                >Sign in</button>
                            </>
                        )}
                    </div>
                    <div className="mt-4 text-xs text-[#A1A1AA]">
                        <Link to="/" className="hover:underline">← back to start</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* Small input field wrapper — icon + input with minimal border styling */
const Field = ({ icon, placeholder, value, onChange, testId, type }) => (
    <div className="flex items-center gap-2 border border-[#E5E7EB] rounded-md px-3 py-2.5
                     focus-within:border-[#002FA7] focus-within:ring-2 focus-within:ring-[#002FA7]/20
                     transition-all bg-white">
        <span className="text-[#A1A1AA]">{icon}</span>
        <input
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-[#A1A1AA]"
            type={type}
            required
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-testid={testId}
        />
    </div>
);
