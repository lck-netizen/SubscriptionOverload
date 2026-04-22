/* ============================================================
   API CLIENT — central axios instance used by all pages.
   - Reads backend URL from REACT_APP_BACKEND_URL
   - Injects JWT bearer token from localStorage automatically
   - Logs the user out on 401 responses
============================================================ */
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Shared axios instance
export const api = axios.create({ baseURL: API });

// Attach JWT (if present) to every outgoing request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('som_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// On 401 (expired / invalid token) clear the session
api.interceptors.response.use(
    (resp) => resp,
    (err) => {
        if (err?.response?.status === 401) {
            localStorage.removeItem('som_token');
            localStorage.removeItem('som_user');
            if (window.location.pathname !== '/auth') {
                window.location.href = '/auth';
            }
        }
        return Promise.reject(err);
    }
);

/* Helper: format a number as INR (₹1,299) */
export const formatINR = (n) =>
    new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(Number(n) || 0);
