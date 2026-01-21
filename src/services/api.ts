
import { SavedChart, User, SystemPrompt } from '@/types';

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
    
    if (!res.ok) {
      // Intentar obtener el mensaje de error del servidor
      let errorMessage = 'Error de autenticación';
      try {
        const errorData = await res.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Si no se puede parsear el JSON, usar el mensaje por defecto
        if (res.status === 401) {
          errorMessage = 'Credenciales incorrectas. Verifica tu usuario y contraseña.';
        } else if (res.status >= 500) {
          errorMessage = 'Error del servidor. Por favor intenta más tarde.';
        }
      }
      throw new Error(errorMessage);
    }
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
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Error iniciando demo');
    return res.json();
  },

  sendDemoMessage: async (sessionId: string, message: string, nextStep: boolean = false): Promise<any> => {
    const res = await fetch(`${API_URL}/demo-chat/chat`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ session_id: sessionId, message, next_step: nextStep })
    });
    if (!res.ok) throw new Error('Error enviando mensaje');
    return res.json();
  },

  getDemoHistory: async (sessionId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/demo-chat/history/${sessionId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error obteniendo historial');
    return res.json();
  },

  getDemoPdfUrl: (sessionId: string): string => {
    return `${API_URL}/demo-chat/pdf/${sessionId}`;
  },

  downloadDemoPdf: async (sessionId: string): Promise<{ blobUrl: string; filename: string }> => {
    const token = localStorage.getItem('fraktal_token');
    const res = await fetch(`${API_URL}/demo-chat/pdf/${sessionId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    if (!res.ok) throw new Error('Error descargando PDF');

    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename=([^;]+)/i);
    const filename = (match?.[1] || `demo_report_${sessionId}.pdf`).replace(/"/g, '');

    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    return { blobUrl, filename };
  },

  getDemoSession: async (sessionId: string): Promise<any> => {
    const res = await fetch(`${API_URL}/demo-chat/session/${sessionId}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error obteniendo sesión');
    return res.json();
  },

  deleteDemoSession: async (sessionId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/demo-chat/session/${sessionId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error eliminando sesión');
  },

  getMyDemoSessions: async (): Promise<any[]> => {
    const res = await fetch(`${API_URL}/demo-chat/my-sessions`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error obteniendo sesiones');
    return res.json();
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
  },

  // CONTACT
  sendContactMessage: async (payload: { name: string; email: string; message: string; company?: string }): Promise<{ ok: boolean }> => {
    const res = await fetch(`${API_URL}/contact/send`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Error enviando mensaje');
    return res.json();
  },

  // PROFILES (saved persons for systemic reports)
  getMyProfiles: async (): Promise<Array<{ profile_id: string; name: string; birth_date: string; birth_time: string; birth_place: string }>> => {
    const res = await fetch(`${API_URL}/profiles/my`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error obteniendo perfiles');
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.profiles) ? data.profiles : [];
  },

  upsertProfile: async (profile: { profile_id?: string; name: string; birth_date: string; birth_time: string; birth_place: string }): Promise<{ profile: any }> => {
    const res = await fetch(`${API_URL}/profiles/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(profile)
    });
    if (!res.ok) throw new Error('Error guardando perfil');
    return res.json();
  },

  deleteProfile: async (profileId: string): Promise<void> => {
    const res = await fetch(`${API_URL}/profiles/${profileId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) throw new Error('Error eliminando perfil');
  },

  // GENERIC HTTP METHODS (axios-like interface)
  get: async (path: string, options?: { params?: Record<string, any> }): Promise<{ data: any }> => {
    let url = `${API_URL}${path}`;
    if (options?.params) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const res = await fetch(url, {
      headers: getHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Error de servidor' }));
      const error: any = new Error(errorData.detail || 'Error de servidor');
      error.response = { data: errorData, status: res.status };
      throw error;
    }
    return { data: await res.json() };
  },

  post: async (path: string, body?: any): Promise<{ data: any }> => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Error de servidor' }));
      const error: any = new Error(errorData.detail || 'Error de servidor');
      error.response = { data: errorData, status: res.status };
      throw error;
    }
    return { data: await res.json() };
  },

  put: async (path: string, body?: any): Promise<{ data: any }> => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Error de servidor' }));
      const error: any = new Error(errorData.detail || 'Error de servidor');
      error.response = { data: errorData, status: res.status };
      throw error;
    }
    return { data: await res.json() };
  },

  delete: async (path: string): Promise<{ data: any }> => {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: 'Error de servidor' }));
      const error: any = new Error(errorData.detail || 'Error de servidor');
      error.response = { data: errorData, status: res.status };
      throw error;
    }
    // DELETE might return empty response
    const text = await res.text();
    return { data: text ? JSON.parse(text) : {} };
  },
};
