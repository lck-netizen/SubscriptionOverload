/* ============================================================
   AUTH CONTEXT — Provides user + login/register/logout helpers.
   Token is persisted in localStorage so the session survives
   browser refreshes.
============================================================ */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem('som_user');
        return raw ? JSON.parse(raw) : null;
    });
    const [loading, setLoading] = useState(false);

    // On mount: if we have a token but stale user, fetch /auth/me
    useEffect(() => {
        const token = localStorage.getItem('som_token');
        if (token && !user) {
            api.get('/auth/me')
                .then((r) => {
                    setUser(r.data);
                    localStorage.setItem('som_user', JSON.stringify(r.data));
                })
                .catch(() => {});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const persist = (data) => {
        localStorage.setItem('som_token', data.token);
        localStorage.setItem('som_user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const login = async (email, password) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/login', { email, password });
            persist(data);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e?.response?.data?.detail || 'Login failed' };
        } finally {
            setLoading(false);
        }
    };

    const register = async (firstName, lastName, email, password, phone, country) => {
        setLoading(true);
        try {
            const { data } = await api.post('/auth/register', { firstName, lastName, email, password, phone, country });
            persist(data);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: e?.response?.data?.detail || 'Registration failed' };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('som_token');
        localStorage.removeItem('som_user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
