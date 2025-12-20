
import { SavedChart, User, SystemPrompt } from '../types';

// En producción, Vite inyecta las variables de entorno en import.meta.env
// Las variables deben empezar con VITE_ para ser expuestas al cliente
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Log para debugging (solo en desarrollo)
if (import.meta.env.DEV) {
  console.log('API URL:', API_URL);
}

const getHeaders = () => {
  const token = localStorage.getItem('fraktal_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

export const api = {
  // AUTH
  login: async (username: string, password: string): Promise<{ access_token: string, token_type: string, user: User }> => {
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
    const token = localStorage.getItem('fraktal_token');
    if (!token) return [];
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
  },

  // ADMIN - PROMPTS
  getSystemPrompt: async (): Promise<SystemPrompt> => {
    const res = await fetch(`${API_URL}/config/prompt`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error cargando configuración del sistema');
    return res.json();
  },

  updateSystemPrompt: async (content: string): Promise<SystemPrompt> => {
    const res = await fetch(`${API_URL}/config/prompt`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ content })
    });
    if (!res.ok) throw new Error('Error actualizando prompt');
    return res.json();
  },

  // DEMO CHAT
  startDemoSession: async (data: any): Promise<any> => {
    const res = await fetch(`${API_URL}/demo-chat/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error iniciando demo');
    return res.json();
  },

  sendDemoMessage: async (sessionId: string, message: string, nextStep: boolean = false): Promise<any> => {
    const res = await fetch(`${API_URL}/demo-chat/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message, next_step: nextStep })
    });
    if (!res.ok) throw new Error('Error enviando mensaje');
    return res.json();
  },

  getDemoHistory: async (sessionId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/demo-chat/history/${sessionId}`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error('Error obteniendo historial');
    return res.json();
  },

  getDemoPdfUrl: (sessionId: string): string => {
    return `${API_URL}/demo-chat/pdf/${sessionId}`;
  },

  // SPECIALIZED PROMPTS
  getSpecializedPrompt: async (promptType: string): Promise<{ content: string }> => {
    const res = await fetch(`${API_URL}/config/prompts/specialized/${promptType}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`Error cargando prompt especializado: ${promptType}`);
    const data = await res.json();
    return { content: data.content || '' };
  },

  // USER SUBSCRIPTION
  getUserSubscription: async (): Promise<{ tier: string, status: string }> => {
    const res = await fetch(`${API_URL}/subscriptions/my-subscription`, {
      headers: getHeaders()
    });
    if (!res.ok) {
      // Si no tiene suscripción, retornar FREE
      return { tier: 'free', status: 'inactive' };
    }
    const data = await res.json();
    // El endpoint devuelve { subscription: {...}, plan: {...} }
    const subscription = data.subscription || {};
    return { 
      tier: subscription.tier || 'free', 
      status: subscription.status || 'inactive' 
    };
  }
};
