
import { SavedChart, User } from '../types';

// En producción en Render, cambiar esta URL a la de tu backend
// Se usa un fallback seguro: si (import.meta as any).env es undefined, usa un objeto vacío.
const env = (import.meta as any).env || {};
const API_URL = env.VITE_API_URL || 'http://localhost:8000';

const getHeaders = () => {
  const token = localStorage.getItem('fraktal_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const api = {
  // AUTH
  login: async (username: string, password: string): Promise<{ access_token: string, token_type: string }> => {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    });
    if (!res.ok) throw new Error('Error de autenticación');
    return res.json();
  },

  register: async (username: string, password: string): Promise<User> => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) throw new Error('Error en registro');
    return res.json();
  },

  // CHARTS
  getCharts: async (): Promise<SavedChart[]> => {
    const res = await fetch(`${API_URL}/charts/`, {
      headers: getHeaders()
    });
    if (res.status === 401) throw new Error('Unauthorized');
    if (!res.ok) throw new Error('Error obteniendo cartas');
    return res.json();
  },

  saveChart: async (chart: Omit<SavedChart, 'id' | 'timestamp' | 'user_id'>): Promise<SavedChart> => {
    const res = await fetch(`${API_URL}/charts/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(chart)
    });
    if (!res.ok) throw new Error('Error guardando carta');
    return res.json();
  },

  deleteChart: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/charts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error borrando carta');
  }
};
