import api from './api';

export const authService = {
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const subscriptionService = {
  getAll: async () => {
    const response = await api.get('/subscriptions');
    return response.data;
  },

  create: async (subscriptionData) => {
    const response = await api.post('/subscriptions', subscriptionData);
    return response.data;
  },

  update: async (id, subscriptionData) => {
    const response = await api.put(`/subscriptions/${id}`, subscriptionData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/subscriptions/${id}`);
    return response.data;
  },

  markUsed: async (id) => {
    const response = await api.post(`/subscriptions/${id}/use`);
    return response.data;
  },
};

export const ottService = {
  getAll: async (params = {}) => {
    const response = await api.get('/otts', { params });
    return response.data;
  },

  getAllAdmin: async (params = {}) => {
    const response = await api.get('/otts/all', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/otts/${id}`);
    return response.data;
  },

  create: async (ottData) => {
    const response = await api.post('/otts', ottData);
    return response.data;
  },

  update: async (id, ottData) => {
    const response = await api.put(`/otts/${id}`, ottData);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/otts/${id}`);
    return response.data;
  },
};

export const profileService = {
  get: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  update: async (profileData) => {
    const response = await api.put('/profile', profileData);
    return response.data;
  },
};

export const budgetService = {
  get: async () => {
    const response = await api.get('/budget');
    return response.data;
  },

  update: async (budgetData) => {
    const response = await api.post('/budget', budgetData);
    return response.data;
  },
};

export const analyticsService = {
  getSummary: async () => {
    const response = await api.get('/analytics/summary');
    return response.data;
  },

  getForecast: async () => {
    const response = await api.get('/analytics/forecast');
    return response.data;
  },
};

export const notificationService = {
  getAll: async () => {
    const response = await api.get('/notifications');
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },
};
