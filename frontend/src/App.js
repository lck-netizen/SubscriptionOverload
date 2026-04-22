/* ============================================================
   APP ROOT — Router + AuthProvider + Toaster.
   Routes:
     /auth             → Login / Register split-screen
     /app              → Dashboard (protected)
     /app/subscriptions, /app/analytics, /app/settings
============================================================ */
import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '@/context/AuthContext';

import AuthPage from '@/pages/Auth';
import AppShell from '@/pages/AppShell';
import Dashboard from '@/pages/Dashboard';
import Subscriptions from '@/pages/Subscriptions';
import Analytics from '@/pages/Analytics';
import Settings from '@/pages/Settings';

/* Route guard — redirects unauthenticated users to /auth */
const Protected = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/auth" replace />;
    return children;
};

/* Root landing — either /app (logged in) or /auth */
const RootRedirect = () => {
    const { user } = useAuth();
    return <Navigate to={user ? '/app' : '/auth'} replace />;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster position="top-right" richColors />
                <Routes>
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="/auth" element={<AuthPage />} />
                    <Route
                        path="/app"
                        element={
                            <Protected>
                                <AppShell />
                            </Protected>
                        }
                    >
                        <Route index element={<Dashboard />} />
                        <Route path="subscriptions" element={<Subscriptions />} />
                        <Route path="analytics" element={<Analytics />} />
                        <Route path="settings" element={<Settings />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
