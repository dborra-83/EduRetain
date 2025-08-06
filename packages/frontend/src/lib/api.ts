import axios, { AxiosResponse } from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('No auth session found:', error);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login or refresh token
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// API Methods
export const apiClient = {
  // Universidad
  universidades: {
    getAll: () => api.get('/v1/universidades'),
    getById: (id: string) => api.get(`/v1/universidades/${id}`),
    create: (data: any) => api.post('/v1/universidades', data),
    update: (id: string, data: any) => api.put(`/v1/universidades/${id}`, data),
    delete: (id: string) => api.delete(`/v1/universidades/${id}`),
  },

  // Alumnos
  alumnos: {
    getAll: (params?: any) => api.get('/v1/alumnos', { params }),
    getByCedula: (cedula: string, params?: any) => api.get(`/v1/alumnos/${cedula}`, { params }),
    create: (data: any) => api.post('/v1/alumnos', data),
    update: (cedula: string, data: any) => api.put(`/v1/alumnos/${cedula}`, data),
    delete: (cedula: string, params?: any) => api.delete(`/v1/alumnos/${cedula}`, { params }),
    import: (data: any) => api.post('/v1/alumnos/importar', data),
  },

  // Campañas
  campanas: {
    getAll: (params?: any) => api.get('/v1/campanas', { params }),
    getById: (id: string, params?: any) => api.get(`/v1/campanas/${id}`, { params }),
    create: (data: any) => api.post('/v1/campanas', data),
    update: (id: string, data: any) => api.put(`/v1/campanas/${id}`, data),
    delete: (id: string, params?: any) => api.delete(`/v1/campanas/${id}`, { params }),
    send: (id: string, params?: any) => api.post(`/v1/campanas/${id}/enviar`, {}, { params }),
    getTracking: (id: string, params?: any) => api.get(`/v1/campanas/${id}/tracking`, { params }),
  },

  // Dashboard
  dashboard: {
    get: (params?: any) => api.get('/v1/dashboard', { params }),
    getMetrics: (params?: any) => api.get('/v1/dashboard/metricas', { params }),
  },

  // Predictions
  predictions: {
    single: (data: any) => api.post('/v1/predictions/predict', data),
    batch: (data: any) => api.post('/v1/predictions/batch', data),
  },
};

export default api;