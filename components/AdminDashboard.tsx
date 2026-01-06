/**
 * Dashboard de administración completo
 */
import React, { useState, useEffect } from 'react';
import {
  Users, Crown, FileText, DollarSign,
  TrendingUp, Activity, Settings, ArrowLeft,
  Search, Edit, Trash2, Eye, Plus, Star, Key,
  UserX, UserCheck, ChevronLeft, ChevronRight,
  Filter, History, Check, AlertCircle, Brain, Zap
} from 'lucide-react';
import { ResetPasswordModal, AuditLogsModal } from './UserModals';
import PromptEditorModal from './PromptEditorModal';
import UserDetailView from './UserDetailView';
import AIUsageControl from './AIUsageControl';

interface AdminDashboardProps {
  onBack: () => void;
  onEditPrompt: () => void;
}

interface DashboardStats {
  total_users: number;
  active_subscriptions: number;
  total_charts: number;
  monthly_revenue: number;
}

interface Subscriber {
  user_id: string;
  username: string;
  email: string;
  tier: string;
  status: string;
  start_date: string;
  end_date: string;
  billing_cycle: string;
  payment_status: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  auto_renew?: boolean;
  next_billing_date?: string;
}

interface Payment {
  payment_id: string;
  user_id: string;
  subscription_tier: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  transaction_id?: string;
  created_at: string;
  stripe_session_id?: string;
}

interface RevenueStats {
  total_subscribers: number;
  active_subscribers: number;
  subscribers_by_tier: {
    free: number;
    pro: number;
    premium: number;
    enterprise: number;
  };
  monthly_revenue: number;
  yearly_revenue: number;
  total_payments: number;
  total_revenue_all_time: number;
}

interface UserData {
  _id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
  active?: boolean;
  subscription?: {
    tier: string;
    status: string;
    start_date?: string;
    end_date?: string;
    billing_cycle?: string;
  };
}

interface SpecializedPrompt {
  id?: string;
  prompt_id: string;
  name: string;
  type: string;
  description: string;
  content?: string;
  is_default: boolean;
  is_public: boolean;
  usage_count: number;
  rating: number;
  created_by?: string;
}

interface RagMapping {
  report_type: string;
  prompt_type: string;
  docs_topic: string;
  docs_version: string;
  updated_at?: string;
  updated_by?: string;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onEditPrompt }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'invoices' | 'prompts' | 'rag' | 'report-texts' | 'admin-plans' | 'ai-usage'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [specializedPrompts, setSpecializedPrompts] = useState<SpecializedPrompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<SpecializedPrompt | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserEditor, setShowUserEditor] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserData | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Paginación y filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const usersPerPage = 10;

  // Subscriptions & Payments state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [subsPage, setSubsPage] = useState(1);
  const [subsTotalPages, setSubsTotalPages] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsTotalPages, setPaymentsTotalPages] = useState(1);

  // Admin Plans state
  const [adminPlanLoading, setAdminPlanLoading] = useState(false);
  const [adminPlanMessage, setAdminPlanMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedAdminPlan, setSelectedAdminPlan] = useState<'pro' | 'premium' | 'enterprise'>('enterprise');

  // RAG Router mappings
  const [ragMappings, setRagMappings] = useState<RagMapping[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  // Report texts (CMS ligero)
  const [reportTextsJson, setReportTextsJson] = useState<string>('{}');
  const [reportTextsLoading, setReportTextsLoading] = useState(false);
  const [reportTextsError, setReportTextsError] = useState<string | null>(null);

  // Verificar permisos de admin al montar
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const token = localStorage.getItem('fraktal_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        // Verificar que el usuario es admin haciendo una petición al backend
        const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          if (response.status === 403) {
            alert('No tienes permisos de administrador. Serás redirigido.');
            window.location.href = '/';
            return;
          }
        }
      } catch (error) {
        console.error('Error verificando permisos de admin:', error);
      }
    };
    
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'prompts') {
      fetchSpecializedPrompts();
    } else if (activeTab === 'rag') {
      fetchRagMappings();
    } else if (activeTab === 'report-texts') {
      fetchReportTexts();
    } else if (activeTab === 'subscriptions') {
      fetchSubscribers();
      fetchRevenueStats();
    } else if (activeTab === 'invoices') {
      fetchPayments();
    }
  }, [activeTab]);

  const fetchRagMappings = async () => {
    try {
      setRagLoading(true);
      setRagError(null);
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/rag-mappings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Error cargando RAG mappings (${response.status}): ${txt}`);
      }
      const data = await response.json();
      setRagMappings(data.mappings || []);
    } catch (e: any) {
      console.error('Error loading rag mappings:', e);
      setRagError(e?.message || 'Error cargando RAG mappings');
    } finally {
      setRagLoading(false);
    }
  };

  const upsertRagMapping = async (mapping: RagMapping) => {
    const token = localStorage.getItem('fraktal_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_URL}/admin/rag-mappings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mapping)
    });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Error guardando mapping (${response.status}): ${txt}`);
    }
    return await response.json();
  };

  const fetchReportTexts = async () => {
    try {
      setReportTextsLoading(true);
      setReportTextsError(null);
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/config/report-texts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Error cargando report-texts (${response.status}): ${txt}`);
      }
      const data = await response.json();
      setReportTextsJson(JSON.stringify(data.texts || {}, null, 2));
    } catch (e: any) {
      console.error('Error loading report texts:', e);
      setReportTextsError(e?.message || 'Error cargando report-texts');
    } finally {
      setReportTextsLoading(false);
    }
  };

  const saveReportTexts = async () => {
    const token = localStorage.getItem('fraktal_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    let textsObj: any = {};
    try {
      textsObj = JSON.parse(reportTextsJson || '{}');
    } catch (e: any) {
      throw new Error('JSON inválido: revisa la sintaxis');
    }
    const response = await fetch(`${API_URL}/config/report-texts`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ texts: textsObj })
    });
    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Error guardando report-texts (${response.status}): ${txt}`);
    }
    return await response.json();
  };

  // Refetch subscriptions when filters change
  useEffect(() => {
    if (activeTab === 'subscriptions') {
      fetchSubscribers();
    }
  }, [subsPage, tierFilter, statusFilter]);

  // Refetch payments when page changes
  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchPayments();
    }
  }, [paymentsPage]);

  // Refetch users when filters or pagination change
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [currentPage, roleFilter, activeFilter, sortBy, sortOrder]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/admin/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Construir query params
      const params = new URLSearchParams();
      const skip = (currentPage - 1) * usersPerPage;
      params.append('skip', skip.toString());
      params.append('limit', usersPerPage.toString());
      params.append('sort_by', sortBy);
      params.append('sort_order', sortOrder);

      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (activeFilter) params.append('active', activeFilter);

      const response = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.total_pages || 1);
        setTotalUsers(data.total || 0);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecializedPrompts = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/config/prompts/specialized`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSpecializedPrompts(data);
      }
    } catch (error) {
      console.error('Error loading specialized prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const params = new URLSearchParams();
      const skip = (subsPage - 1) * 10;
      params.append('skip', skip.toString());
      params.append('limit', '10');
      if (tierFilter) params.append('tier_filter', tierFilter);
      if (statusFilter) params.append('status_filter', statusFilter);

      const response = await fetch(`${API_URL}/subscriptions/admin/subscribers?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscribers(data.subscribers || []);
        setSubsTotalPages(data.total_pages || 1);
      }
    } catch (error) {
      console.error('Error loading subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const params = new URLSearchParams();
      const skip = (paymentsPage - 1) * 20;
      params.append('skip', skip.toString());
      params.append('limit', '20');

      const response = await fetch(`${API_URL}/subscriptions/admin/payments?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
        setPaymentsTotalPages(data.total_pages || 1);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRevenueStats = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/subscriptions/admin/revenue-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRevenueStats(data);
      }
    } catch (error) {
      console.error('Error loading revenue stats:', error);
    }
  };

  const handleViewPrompt = async (promptType: string) => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/config/prompts/specialized/${promptType}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedPrompt(data);
        setShowPromptEditor(true);
      }
    } catch (error) {
      console.error('Error loading prompt:', error);
    }
  };

  const handleEditUser = (user: UserData) => {
    setSelectedUser(user);
    setShowUserEditor(true);
  };

  const handleDeleteUser = (user: UserData) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/users/${userToDelete._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Usuario eliminado correctamente' });
        setShowDeleteConfirm(false);
        setUserToDelete(null);
        fetchUsers(); // Recargar lista
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Error al eliminar usuario' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
  };

  const handleSaveUser = async (userData: { username?: string; email?: string; role?: string }): Promise<void> => {
    if (!selectedUser) {
      throw new Error('No hay usuario seleccionado');
    }

    setLoading(true);
    setMessage(null);

    try {
      const token = localStorage.getItem('fraktal_token');
      if (!token) {
        const errorMsg = 'No hay token de autenticación. Por favor, inicia sesión nuevamente.';
        setMessage({ type: 'error', text: errorMsg });
        setLoading(false);
        throw new Error(errorMsg);
      }

      // Filtrar solo los campos que realmente han cambiado
      const updateData: { username?: string; email?: string; role?: string } = {};
      
      if (userData.username !== undefined && userData.username !== selectedUser.username) {
        updateData.username = userData.username;
      }
      
      if (userData.email !== undefined && userData.email !== selectedUser.email) {
        updateData.email = userData.email;
      }
      
      if (userData.role !== undefined && userData.role !== selectedUser.role) {
        updateData.role = userData.role;
      }

      // Si no hay cambios, no hacer nada
      if (Object.keys(updateData).length === 0) {
        setMessage({ type: 'success', text: 'No hay cambios para guardar' });
        setLoading(false);
        return;
      }

      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        const result = await response.json();
        setMessage({ type: 'success', text: result.message || 'Usuario actualizado correctamente' });
        setShowUserEditor(false);
        setSelectedUser(null);
        
        // Cerrar UserDetailView si está abierto para este usuario
        if (showUserDetail && selectedUserId === selectedUser._id) {
          setShowUserDetail(false);
          setSelectedUserId(null);
        }
        
        // Recargar lista de usuarios después de un breve delay
        setTimeout(async () => {
          await fetchUsers();
        }, 500);
        
        setLoading(false);
        // Resolver la promesa para que el modal sepa que terminó exitosamente
        return;
      } else {
        let errorMessage = 'Error al actualizar usuario';
        try {
          const error = await response.json();
          errorMessage = error.detail || error.message || errorMessage;
          
          // Mensajes específicos según el código de estado
          if (response.status === 401) {
            errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
          } else if (response.status === 403) {
            errorMessage = 'No tienes permisos para realizar esta acción.';
          } else if (response.status === 404) {
            errorMessage = 'Usuario no encontrado.';
          } else if (response.status === 400) {
            errorMessage = error.detail || 'Datos inválidos. Verifica la información.';
          }
        } catch (e) {
          // Si no se puede parsear el error, usar el mensaje por defecto
          console.error('Error parseando respuesta:', e);
        }
        
        setMessage({ type: 'error', text: errorMessage });
        console.error('Error actualizando usuario:', response.status, errorMessage);
        setLoading(false);
        // Lanzar error para que el modal lo capture
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      setLoading(false);
      const errorMsg = error.message || 'No se pudo conectar al servidor';
      setMessage({ type: 'error', text: `Error de conexión: ${errorMsg}` });
      console.error('Error de conexión:', error);
      // Re-lanzar el error para que el modal lo capture
      throw error;
    }
  };

  const handleCreateUser = async (userData: { username: string; email: string; password: string; role: string }) => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Usuario creado correctamente' });
        setShowCreateUser(false);
        fetchUsers(); // Recargar lista
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Error al crear usuario' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
  };

  const handleResetPassword = async (newPassword: string) => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ new_password: newPassword })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Contraseña reseteada correctamente' });
        setShowResetPassword(false);
        setSelectedUser(null);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Error al resetear contraseña' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
  };

  const handleToggleActive = async (user: UserData) => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/users/${user._id}/toggle-active`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({
          type: 'success',
          text: `Usuario ${data.active ? 'activado' : 'desactivado'} correctamente`
        });
        fetchUsers(); // Recargar lista
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Error al cambiar estado' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    }
  };

  const handleGrantAdminPlan = async (planTier: 'pro' | 'premium' | 'enterprise') => {
    setAdminPlanLoading(true);
    setAdminPlanMessage(null);

    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/subscriptions/grant-plan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          plan_tier: planTier,
          duration_days: 365
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAdminPlanMessage({
          type: 'success',
          text: `✅ Plan ${planTier.toUpperCase()} activado correctamente. Tienes acceso ilimitado durante 1 año.`
        });
        setSelectedAdminPlan(planTier);
        // Auto-hide mensaje después de 5 segundos
        setTimeout(() => setAdminPlanMessage(null), 5000);
      } else {
        const error = await response.json();
        setAdminPlanMessage({
          type: 'error',
          text: error.detail || 'Error al activar plan'
        });
      }
    } catch (error) {
      setAdminPlanMessage({
        type: 'error',
        text: 'Error de conexión. Verifica que el servidor esté activo.'
      });
    } finally {
      setAdminPlanLoading(false);
    }
  };

  const handleViewAuditLogs = (user: UserData) => {
    setSelectedUser(user);
    setShowAuditLogs(true);
  };

  const handleResetPasswordClick = (user: UserData) => {
    setSelectedUser(user);
    setShowResetPassword(true);
  };

  const tabs = [
    { id: 'overview', name: 'Dashboard', icon: Activity },
    { id: 'users', name: 'Usuarios', icon: Users },
    { id: 'admin-plans', name: 'Mi Plan', icon: Crown },
    { id: 'subscriptions', name: 'Suscripciones', icon: Crown },
    { id: 'invoices', name: 'Facturas', icon: FileText },
    { id: 'prompts', name: 'Prompts', icon: Settings },
    { id: 'rag', name: 'RAG Router', icon: Filter },
    { id: 'report-texts', name: 'Textos PDF', icon: FileText },
    { id: 'ai-usage', name: 'Control IA', icon: Brain }
  ];

  return (
    <div className="md-page">
      <div className="md-container">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-slate-600 hover:text-slate-900 mb-4 transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Volver
            </button>
            <h1 className="text-3xl md:text-4xl font-semibold mb-2">
              Panel de Administración
            </h1>
            <p className="text-slate-600">Gestión y observabilidad del sistema</p>
          </div>
          <div className="md-chip bg-blue-50 text-blue-700 border-blue-200">
            ADMIN
          </div>
        </div>

        {/* Tabs */}
        <div className="md-tabs mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`md-tab ${activeTab === tab.id ? 'md-tab--active' : ''}`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="md-card p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Estadísticas Generales</h2>
              
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Usuarios */}
                  <div className="rounded-xl p-6 border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <Users className="w-8 h-8 text-slate-700" />
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="text-3xl font-semibold text-slate-900 mb-1">
                      {stats.total_users}
                    </div>
                    <div className="text-slate-600 text-sm">Total Usuarios</div>
                  </div>

                  {/* Suscripciones Activas */}
                  <div className="rounded-xl p-6 border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <Crown className="w-8 h-8 text-slate-700" />
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="text-3xl font-semibold text-slate-900 mb-1">
                      {stats.active_subscriptions}
                    </div>
                    <div className="text-slate-600 text-sm">Suscripciones Activas</div>
                  </div>

                  {/* Total Cartas */}
                  <div className="rounded-xl p-6 border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <FileText className="w-8 h-8 text-slate-700" />
                      <Activity className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="text-3xl font-semibold text-slate-900 mb-1">
                      {stats.total_charts}
                    </div>
                    <div className="text-slate-600 text-sm">Cartas Generadas</div>
                  </div>

                  {/* Ingresos Mensuales */}
                  <div className="rounded-xl p-6 border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="w-8 h-8 text-slate-700" />
                      <TrendingUp className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="text-3xl font-semibold text-slate-900 mb-1">
                      €{stats.monthly_revenue.toFixed(2)}
                    </div>
                    <div className="text-slate-600 text-sm">Ingresos del Mes</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'admin-plans' && (
            <div className="space-y-6">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Mi Plan de Administrador</h2>
                <p className="text-slate-600">Como administrador, tienes acceso a todos los planes sin necesidad de pagar</p>
              </div>

              {adminPlanMessage && (
                <div className={`md-alert mb-4 ${
                  adminPlanMessage.type === 'success'
                    ? 'md-alert--success'
                    : 'md-alert--error'
                }`}>
                  {adminPlanMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* PRO Plan */}
                <div className="md-card rounded-xl p-8 hover:shadow-sm transition-all">
                  <div className="mb-6">
                    <div className="text-blue-700 font-bold mb-2 text-sm">PLAN PRO</div>
                    <div className="text-slate-900 text-3xl font-semibold">Gratis</div>
                    <p className="text-slate-600 text-sm mt-2">Para administrador</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Cartas ilimitadas</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Exportar PDF</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Técnicas avanzadas</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleGrantAdminPlan('pro')}
                    disabled={adminPlanLoading || selectedAdminPlan === 'pro'}
                    className={`w-full py-3 rounded-lg font-bold transition-all ${
                      selectedAdminPlan === 'pro'
                        ? 'bg-green-50 text-green-800 border border-green-200 cursor-default'
                        : adminPlanLoading
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {selectedAdminPlan === 'pro' ? '✓ Activo' : 'Activar Plan'}
                  </button>
                </div>

                {/* PREMIUM Plan */}
                <div className="md-card rounded-xl p-8 hover:shadow-sm transition-all relative">
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-amber-100 text-amber-900 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">
                    Recomendado
                  </div>

                  <div className="mb-6 mt-2">
                    <div className="text-violet-700 font-bold mb-2 text-sm">PLAN PREMIUM</div>
                    <div className="text-slate-900 text-3xl font-semibold">Gratis</div>
                    <p className="text-slate-600 text-sm mt-2">Para administrador</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Todo del Pro</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Sinastría + Compuesta</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Análisis psicológico</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleGrantAdminPlan('premium')}
                    disabled={adminPlanLoading || selectedAdminPlan === 'premium'}
                    className={`w-full py-3 rounded-lg font-bold transition-all ${
                      selectedAdminPlan === 'premium'
                        ? 'bg-green-50 text-green-800 border border-green-200 cursor-default'
                        : adminPlanLoading
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {selectedAdminPlan === 'premium' ? '✓ Activo' : 'Activar Plan'}
                  </button>
                </div>

                {/* ENTERPRISE Plan */}
                <div className="md-card rounded-xl p-8 hover:shadow-sm transition-all">
                  <div className="mb-6">
                    <div className="text-amber-800 font-bold mb-2 text-sm">PLAN ENTERPRISE</div>
                    <div className="text-slate-900 text-3xl font-semibold">Gratis</div>
                    <p className="text-slate-600 text-sm mt-2">Para administrador</p>
                  </div>

                  <ul className="space-y-3 mb-8">
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Todo de Premium</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Predicciones avanzadas</span>
                    </li>
                    <li className="flex items-center text-slate-700">
                      <Check className="w-5 h-5 text-green-600 mr-3 shrink-0" />
                      <span>Análisis vocacional</span>
                    </li>
                  </ul>

                  <button
                    onClick={() => handleGrantAdminPlan('enterprise')}
                    disabled={adminPlanLoading || selectedAdminPlan === 'enterprise'}
                    className={`w-full py-3 rounded-lg font-bold transition-all ${
                      selectedAdminPlan === 'enterprise'
                        ? 'bg-green-50 text-green-800 border border-green-200 cursor-default'
                        : adminPlanLoading
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {selectedAdminPlan === 'enterprise' ? '✓ Activo' : 'Activar Plan'}
                  </button>
                </div>
              </div>

              <div className="md-alert md-alert--warning">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-800 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-amber-900 font-semibold mb-1">Nota</p>
                    <p className="text-amber-900/80 text-sm">
                      Como administrador, tienes acceso a todos los planes de forma gratuita. Esto te permite:
                    </p>
                    <ul className="mt-3 space-y-1 text-amber-900/80 text-sm ml-4 list-disc">
                      <li>✓ Generar cartas astrologicas ilimitadas</li>
                      <li>✓ Probar todas las características antes de ofrecerlas a usuarios</li>
                      <li>✓ Acceso completo a herramientas avanzadas</li>
                      <li>✓ No se requiere renovación de suscripción</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Gestión de Usuarios</h2>

              {message && (
                <div className={`p-4 rounded-lg mb-4 ${
                  message.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {message.text}
                </div>
              )}

              {/* FILTERS AND SEARCH BAR */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-50">
                  <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                    aria-label="Buscar usuarios"
                    className="md-input pl-10 pr-4 w-full"
                  />
                  <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                  aria-label="Filtrar por rol"
                  className="md-input"
                >
                  <option value="">Todos los roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">Usuario</option>
                </select>

                <select
                  value={activeFilter}
                  onChange={(e) => { setActiveFilter(e.target.value); setCurrentPage(1); }}
                  aria-label="Filtrar por estado"
                  className="md-input"
                >
                  <option value="">Todos los estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  aria-label="Ordenar por"
                  className="md-input"
                >
                  <option value="created_at">Fecha creación</option>
                  <option value="username">Nombre usuario</option>
                  <option value="email">Email</option>
                  <option value="role">Rol</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="md-button md-button--secondary px-3 py-2 rounded-lg"
                  title={`Orden: ${sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>

                <button
                  onClick={() => setShowCreateUser(true)}
                  className="md-button flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nuevo Usuario
                </button>
              </div>

              {/* Stats */}
              <div className="md-card md-card--flat rounded-xl p-4 mb-4">
                <div className="text-sm text-slate-600">
                  Mostrando {users.length} de {totalUsers} usuarios | Página {currentPage} de {totalPages}
                </div>
              </div>

              {/* USER LIST */}
              {users.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  No se encontraron usuarios
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => {
                    const subscription = user.subscription || { tier: 'free', status: 'inactive' };
                    const getTierColor = (tier: string) => {
                      switch (tier?.toLowerCase()) {
                        case 'enterprise': return 'bg-amber-50 text-amber-800 border-amber-200';
                        case 'premium': return 'bg-violet-50 text-violet-800 border-violet-200';
                        case 'pro': return 'bg-blue-50 text-blue-800 border-blue-200';
                        default: return 'bg-slate-50 text-slate-700 border-slate-200';
                      }
                    };
                    
                    return (
                    <div key={user._id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="text-slate-900 font-semibold flex items-center gap-2 flex-wrap">
                              {user.username}
                              {!user.active && (
                                <span className="text-xs bg-red-50 text-red-800 px-2 py-0.5 rounded-full border border-red-200">
                                  INACTIVO
                                </span>
                              )}
                            </div>
                            <div className="text-slate-600 text-sm">{user.email}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getTierColor(subscription.tier)}`}>
                                {subscription.tier.toUpperCase()}
                              </span>
                              {subscription.status === 'active' && (
                                <span className="text-xs text-green-700">● Activo</span>
                              )}
                              {subscription.end_date && (
                                <span className="text-xs text-slate-500">
                                  Hasta: {new Date(subscription.end_date).toLocaleDateString('es-ES')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            user.role === 'admin'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-slate-100 text-slate-800 border border-slate-200'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>

                          <button
                            onClick={() => {
                              setSelectedUserId(user._id);
                              setShowUserDetail(true);
                            }}
                            className="p-2 text-slate-500 hover:text-blue-700 transition-colors"
                            title="Ver detalles completos"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={() => handleViewAuditLogs(user)}
                            className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                            title="Ver historial"
                          >
                            <History size={18} />
                          </button>

                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-2 transition-colors ${
                              user.active
                                ? 'text-slate-500 hover:text-amber-700'
                                : 'text-slate-500 hover:text-green-700'
                            }`}
                            title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            {user.active ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>

                          <button
                            onClick={() => handleResetPasswordClick(user)}
                            className="p-2 text-slate-500 hover:text-amber-700 transition-colors"
                            title="Resetear contraseña"
                          >
                            <Key size={18} />
                          </button>

                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-slate-500 hover:text-blue-700 transition-colors"
                            title="Editar usuario"
                          >
                            <Edit size={18} />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-slate-500 hover:text-red-700 transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="md-button md-button--secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    Anterior
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg transition-all ${
                            currentPage === pageNum
                              ? 'md-button'
                              : 'md-button md-button--secondary'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="md-button md-button--secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Siguiente
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-slate-900">Prompts</h2>
                <button
                  onClick={onEditPrompt}
                  className="md-button inline-flex items-center gap-2"
                >
                  <Settings size={18} />
                  Editar Prompt Principal
                </button>
              </div>

              <div className="md-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-900 font-semibold">Prompts especializados</h3>
                  <span className="text-sm text-slate-600">
                    {specializedPrompts.length} prompts configurados
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {[
                    { name: 'Carta Natal', type: 'natal_chart', icon: '🌟' },
                    { name: 'Revolución Solar', type: 'solar_return', icon: '☀️' },
                    { name: 'Tránsitos', type: 'transits', icon: '🌙' },
                    { name: 'Progresiones', type: 'progressions', icon: '📈' },
                    { name: 'Sinastría', type: 'synastry', icon: '💞' },
                    { name: 'Compuesta', type: 'composite', icon: '🔗' },
                    { name: 'Direcciones', type: 'directions', icon: '🧭' },
                    { name: 'Orbes Custom', type: 'custom_orbs', icon: '⚙️' },
                    { name: 'Psicológico', type: 'psychological', icon: '🧠' },
                    { name: 'Predictivo', type: 'predictive', icon: '🔮' },
                    { name: 'Vocacional', type: 'vocational', icon: '💼' },
                    { name: 'Médico', type: 'medical', icon: '⚕️' },
                    { name: 'Financiero', type: 'financial', icon: '💰' }
                  ].map((prompt) => {
                    const existing = specializedPrompts.find(p => p.type === prompt.type);
                    return (
                      <div
                        key={prompt.type}
                        onClick={() => handleViewPrompt(prompt.type)}
                        className={`
                          bg-white rounded-xl p-4 transition-all cursor-pointer border
                          ${existing
                            ? 'border-blue-200 hover:border-blue-300 hover:shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{prompt.icon}</span>
                            <div>
                              <div className="text-slate-900 font-semibold text-sm">{prompt.name}</div>
                              {existing && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Star size={12} className="text-amber-500" fill="currentColor" />
                                  <span className="text-xs text-slate-600">
                                    {existing.usage_count} usos
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {existing ? (
                            <span className="md-chip" style={{ background: 'rgba(22,163,74,0.08)', borderColor: 'rgba(22,163,74,0.25)', color: '#166534' }}>
                              Activo
                            </span>
                          ) : (
                            <span className="md-chip">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-2">
                          {existing?.description || `Prompt predefinido para ${prompt.name.toLowerCase()}`}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

               {/* Prompt Editor Modal */}
               {showPromptEditor && selectedPrompt && (
                 <PromptEditorModal
                   prompt={selectedPrompt}
                   onClose={() => {
                     setShowPromptEditor(false);
                     setSelectedPrompt(null);
                   }}
                   onSave={async (updatedPrompt) => {
                     try {
                       const token = localStorage.getItem('fraktal_token');
                       const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                       
                       // Si es default, crear uno nuevo personalizado
                       if (selectedPrompt.is_default) {
                         const response = await fetch(`${API_URL}/config/prompts/specialized`, {
                           method: 'POST',
                           headers: {
                             'Authorization': `Bearer ${token}`,
                             'Content-Type': 'application/json'
                           },
                           body: JSON.stringify(updatedPrompt)
                         });
                         
                         if (response.ok) {
                           setMessage({ type: 'success', text: 'Prompt personalizado creado exitosamente' });
                         } else {
                           const error = await response.json();
                           setMessage({ type: 'error', text: error.detail || 'Error al crear prompt' });
                         }
                       } else {
                         // Actualizar existente
                         const response = await fetch(`${API_URL}/config/prompts/specialized/${selectedPrompt.id}`, {
                           method: 'PUT',
                           headers: {
                             'Authorization': `Bearer ${token}`,
                             'Content-Type': 'application/json'
                           },
                           body: JSON.stringify(updatedPrompt)
                         });
                         
                         if (response.ok) {
                           setMessage({ type: 'success', text: 'Prompt actualizado exitosamente' });
                         } else {
                           const error = await response.json();
                           setMessage({ type: 'error', text: error.detail || 'Error al actualizar prompt' });
                         }
                       }
                       
                       setShowPromptEditor(false);
                       setSelectedPrompt(null);
                       fetchSpecializedPrompts(); // Refrescar lista
                       
                     } catch (error) {
                       setMessage({ type: 'error', text: 'Error de conexión' });
                     }
                   }}
                 />
               )}
            </div>
          )}

          {activeTab === 'rag' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">RAG Router</h2>
                  <p className="text-slate-600 text-sm">
                    Mapea <span className="font-mono">report_type</span> → <span className="font-mono">prompt_type</span> + <span className="font-mono">docs_topic/docs_version</span>.
                    El retrieval se ejecuta en modo <span className="font-mono">strict_topic</span> (sin cruces).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRagMappings((prev) => [
                      { report_type: 'individual', prompt_type: 'carutti', docs_topic: 'adultos', docs_version: '' },
                      ...prev,
                    ]);
                  }}
                  className="md-button md-button--secondary px-4 py-2 rounded-lg text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  Nuevo mapping
                </button>
              </div>

              {ragError && (
                <div className="border border-red-200 bg-red-50 text-red-800 rounded-xl p-4 text-sm">
                  {ragError}
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-left text-slate-600">
                        <th className="p-3">report_type</th>
                        <th className="p-3">prompt_type</th>
                        <th className="p-3">docs_topic</th>
                        <th className="p-3">docs_version</th>
                        <th className="p-3">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ragLoading ? (
                        <tr><td className="p-4 text-slate-600" colSpan={5}>Cargando…</td></tr>
                      ) : ragMappings.length === 0 ? (
                        <tr><td className="p-4 text-slate-600" colSpan={5}>No hay mappings aún.</td></tr>
                      ) : (
                        ragMappings.map((m, idx) => (
                          <tr key={`${m.report_type}-${idx}`} className="border-b border-slate-100">
                            <td className="p-3">
                              <select
                                value={m.report_type}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setRagMappings((prev) => prev.map((x, i) => i === idx ? { ...x, report_type: v } : x));
                                }}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white"
                              >
                                {['individual', 'pareja', 'familiar', 'equipo', 'adultos', 'infantil', 'profesional'].map((rt) => (
                                  <option key={rt} value={rt}>{rt}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                value={m.prompt_type}
                                onChange={(e) => setRagMappings((prev) => prev.map((x, i) => i === idx ? { ...x, prompt_type: e.target.value } : x))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                                placeholder="carutti | infantil | ..."
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={m.docs_topic}
                                onChange={(e) => setRagMappings((prev) => prev.map((x, i) => i === idx ? { ...x, docs_topic: e.target.value } : x))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 bg-white"
                              >
                                {['adultos', 'infantil', 'profesional', 'sistemico', 'general', 'fundamentos', 'personales', 'sociales', 'transpersonales', 'nodos', 'aspectos', 'ejes', 'evolucion'].map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                value={m.docs_version}
                                onChange={(e) => setRagMappings((prev) => prev.map((x, i) => i === idx ? { ...x, docs_version: e.target.value } : x))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                                placeholder="(vacío = DOCS_VERSION)"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      setRagError(null);
                                      await upsertRagMapping(m);
                                      setMessage({ type: 'success', text: `Mapping guardado: ${m.report_type}` });
                                      await fetchRagMappings();
                                    } catch (e: any) {
                                      setMessage({ type: 'error', text: e?.message || 'Error guardando mapping' });
                                    }
                                  }}
                                  className="md-button px-3 py-2 rounded-lg text-xs font-semibold"
                                >
                                  Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRagMappings((prev) => prev.filter((_, i) => i !== idx))}
                                  className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors"
                                  title="Quitar (no borra en BD hasta que guardes otro mapping)"
                                >
                                  Quitar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                Endpoint backend: <span className="font-mono">GET/PUT /admin/rag-mappings</span>
              </div>
            </div>
          )}

          {activeTab === 'report-texts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-slate-900">Textos del PDF (CMS ligero)</h2>
                  <p className="text-slate-600 text-sm">
                    Edita literales del informe sin tocar código. Se guardan en Mongo (<span className="font-mono">report_texts</span>).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchReportTexts}
                    className="bg-slate-100 text-slate-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
                    disabled={reportTextsLoading}
                  >
                    Recargar
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        setReportTextsError(null);
                        await saveReportTexts();
                        setMessage({ type: 'success', text: 'Textos guardados correctamente' });
                        await fetchReportTexts();
                      } catch (e: any) {
                        setReportTextsError(e?.message || 'Error guardando report-texts');
                        setMessage({ type: 'error', text: e?.message || 'Error guardando report-texts' });
                      }
                    }}
                    className="md-button px-4 py-2 rounded-lg text-sm font-semibold"
                    disabled={reportTextsLoading}
                  >
                    Guardar
                  </button>
                </div>
              </div>

              {reportTextsError && (
                <div className="border border-red-200 bg-red-50 text-red-800 rounded-xl p-4 text-sm">
                  {reportTextsError}
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <textarea
                  value={reportTextsJson}
                  onChange={(e) => setReportTextsJson(e.target.value)}
                  className="w-full min-h-[420px] p-4 font-mono text-xs bg-white outline-none"
                  spellCheck={false}
                />
              </div>

              <div className="text-xs text-slate-500">
                Endpoint backend: <span className="font-mono">GET/PUT /config/report-texts</span>
              </div>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Gestión de Suscripciones</h2>

              {/* Revenue Stats */}
              {revenueStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="md-card rounded-xl p-6">
                    <div className="text-sm text-slate-600 mb-1">Total Suscriptores</div>
                    <div className="text-3xl font-semibold text-slate-900">{revenueStats.total_subscribers}</div>
                    <div className="text-xs text-green-700 mt-1">{revenueStats.active_subscribers} activos</div>
                  </div>

                  <div className="md-card rounded-xl p-6">
                    <div className="text-sm text-slate-600 mb-1">Ingresos Mensuales</div>
                    <div className="text-3xl font-semibold text-slate-900">€{revenueStats.monthly_revenue.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 mt-1">MRR (Monthly Recurring Revenue)</div>
                  </div>

                  <div className="md-card rounded-xl p-6">
                    <div className="text-sm text-slate-600 mb-1">Ingresos Anuales</div>
                    <div className="text-3xl font-semibold text-slate-900">€{revenueStats.yearly_revenue.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 mt-1">ARR (Annual Recurring Revenue)</div>
                  </div>

                  <div className="md-card rounded-xl p-6">
                    <div className="text-sm text-slate-600 mb-1">Total Histórico</div>
                    <div className="text-3xl font-semibold text-slate-900">€{revenueStats.total_revenue_all_time.toFixed(2)}</div>
                    <div className="text-xs text-slate-500 mt-1">{revenueStats.total_payments} pagos</div>
                  </div>
                </div>
              )}

              {/* Subscribers by Tier */}
              {revenueStats && (
                <div className="md-card md-card--flat rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Suscriptores por Plan</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-slate-600 text-sm mb-1">FREE</div>
                      <div className="text-2xl font-semibold text-slate-900">{revenueStats.subscribers_by_tier.free}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-600 text-sm mb-1">PRO</div>
                      <div className="text-2xl font-semibold text-blue-700">{revenueStats.subscribers_by_tier.pro}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-600 text-sm mb-1">PREMIUM</div>
                      <div className="text-2xl font-semibold text-violet-700">{revenueStats.subscribers_by_tier.premium}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-600 text-sm mb-1">ENTERPRISE</div>
                      <div className="text-2xl font-semibold text-amber-700">{revenueStats.subscribers_by_tier.enterprise}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <select
                  value={tierFilter}
                  onChange={(e) => { setTierFilter(e.target.value); setSubsPage(1); }}
                  aria-label="Filtrar por plan"
                  className="md-input"
                >
                  <option value="">Todos los planes</option>
                  <option value="free">FREE</option>
                  <option value="pro">PRO</option>
                  <option value="premium">PREMIUM</option>
                  <option value="enterprise">ENTERPRISE</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setSubsPage(1); }}
                  aria-label="Filtrar por estado de suscripción"
                  className="md-input"
                >
                  <option value="">Todos los estados</option>
                  <option value="active">Activo</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="expired">Expirado</option>
                  <option value="trial">Trial</option>
                </select>
              </div>

              {/* Subscribers List */}
              {subscribers.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  No se encontraron suscriptores
                </div>
              ) : (
                <div className="space-y-3">
                  {subscribers.map((sub) => (
                    <div key={sub.user_id} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-slate-900 font-semibold">{sub.username}</div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              sub.tier === 'enterprise' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              sub.tier === 'premium' ? 'bg-violet-50 text-violet-800 border border-violet-200' :
                              sub.tier === 'pro' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {sub.tier.toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              sub.status === 'active' ? 'bg-green-50 text-green-800 border border-green-200' :
                              sub.status === 'cancelled' ? 'bg-red-50 text-red-800 border border-red-200' :
                              sub.status === 'trial' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                            {sub.billing_cycle && (
                              <span className="text-xs text-slate-600">
                                {sub.billing_cycle === 'monthly' ? '📅 Mensual' : '📅 Anual'}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-600">{sub.email}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Inicio: {new Date(sub.start_date).toLocaleDateString('es-ES')} |
                            Fin: {new Date(sub.end_date).toLocaleDateString('es-ES')}
                            {sub.stripe_customer_id && (
                              <span className="ml-2">| Stripe: {sub.stripe_customer_id.substring(0, 20)}...</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {sub.auto_renew && (
                            <span className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded border border-green-200">
                              Auto-renovación
                            </span>
                          )}
                          {sub.payment_status && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              sub.payment_status === 'completed' ? 'bg-green-50 text-green-800 border border-green-200' :
                              sub.payment_status === 'pending' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                              'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                              {sub.payment_status}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {subsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setSubsPage(p => Math.max(1, p - 1))}
                    disabled={subsPage === 1}
                    className="md-button md-button--secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página anterior"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-slate-700 px-4">Página {subsPage} de {subsTotalPages}</span>
                  <button
                    onClick={() => setSubsPage(p => Math.min(subsTotalPages, p + 1))}
                    disabled={subsPage === subsTotalPages}
                    className="md-button md-button--secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página siguiente"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai-usage' && (
            <AIUsageControl />
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-slate-900 mb-6">Historial de Pagos</h2>

              {/* Payments List */}
              {payments.length === 0 ? (
                <div className="text-center py-12 text-slate-600">
                  No se encontraron pagos
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                        <th className="text-left font-semibold py-3 px-4">Fecha</th>
                        <th className="text-left font-semibold py-3 px-4">Usuario</th>
                        <th className="text-left font-semibold py-3 px-4">Plan</th>
                        <th className="text-left font-semibold py-3 px-4">Monto</th>
                        <th className="text-left font-semibold py-3 px-4">Método</th>
                        <th className="text-left font-semibold py-3 px-4">Estado</th>
                        <th className="text-left font-semibold py-3 px-4">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.payment_id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                          <td className="py-3 px-4 text-slate-700">
                            {new Date(payment.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 text-slate-900">{payment.user_id}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              payment.subscription_tier === 'enterprise' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                              payment.subscription_tier === 'premium' ? 'bg-violet-50 text-violet-800 border border-violet-200' :
                              payment.subscription_tier === 'pro' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                              'bg-slate-50 text-slate-700 border border-slate-200'
                            }`}>
                              {payment.subscription_tier.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-900 font-semibold">
                            {payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                          </td>
                          <td className="py-3 px-4 text-slate-700 capitalize">{payment.method}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              payment.status === 'completed' ? 'bg-green-50 text-green-800 border border-green-200' :
                              payment.status === 'pending' ? 'bg-amber-50 text-amber-900 border border-amber-200' :
                              'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                              {payment.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs font-mono">
                            {payment.transaction_id || payment.stripe_session_id?.substring(0, 20) || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {paymentsTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setPaymentsPage(p => Math.max(1, p - 1))}
                    disabled={paymentsPage === 1}
                    className="md-button md-button--secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página anterior"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-slate-700 px-4">Página {paymentsPage} de {paymentsTotalPages}</span>
                  <button
                    onClick={() => setPaymentsPage(p => Math.min(paymentsTotalPages, p + 1))}
                    disabled={paymentsPage === paymentsTotalPages}
                    className="md-button md-button--secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Página siguiente"
                    aria-label="Página siguiente"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edición de Usuario */}
      {showUserEditor && selectedUser && (
        <UserEditModal
          user={selectedUser}
          onClose={() => {
            setShowUserEditor(false);
            setSelectedUser(null);
            setMessage(null);
          }}
          onSave={handleSaveUser}
        />
      )}

      {/* Modal de Creación de Usuario */}
      {showCreateUser && (
        <UserCreateModal
          onClose={() => {
            setShowCreateUser(false);
            setMessage(null);
          }}
          onCreate={handleCreateUser}
        />
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteConfirm && userToDelete && (
        <DeleteConfirmModal
          user={userToDelete}
          onClose={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
            setMessage(null);
          }}
          onConfirm={confirmDeleteUser}
        />
      )}

      {/* Modal de Reset Password */}
      {showResetPassword && selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          onClose={() => {
            setShowResetPassword(false);
            setSelectedUser(null);
            setMessage(null);
          }}
          onReset={handleResetPassword}
        />
      )}

      {/* Modal de Audit Logs */}
      {showAuditLogs && selectedUser && (
        <AuditLogsModal
          user={selectedUser}
          onClose={() => {
            setShowAuditLogs(false);
            setSelectedUser(null);
          }}
        />
      )}

      {/* Vista Detallada de Usuario */}
      {showUserDetail && selectedUserId && (
        <UserDetailView
          userId={selectedUserId}
          onClose={() => {
            setShowUserDetail(false);
            setSelectedUserId(null);
          }}
        />
      )}
    </div>
  );
};

// ============= MODAL COMPONENTS =============

interface UserEditModalProps {
  user: UserData;
  onClose: () => void;
  onSave: (data: { username?: string; email?: string; role?: string }) => void;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    role: user.role
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Solo enviar los campos que han cambiado
      const changes: { username?: string; email?: string; role?: string } = {};
      
      if (formData.username !== user.username) {
        changes.username = formData.username;
      }
      
      if (formData.email !== user.email) {
        changes.email = formData.email;
      }
      
      if (formData.role !== user.role) {
        changes.role = formData.role;
      }
      
      // Si no hay cambios, mostrar mensaje y cerrar
      if (Object.keys(changes).length === 0) {
        setError('No hay cambios para guardar');
        setSaving(false);
        return;
      }
      
      await onSave(changes);
      // Si onSave se completa sin error, el modal se cierra desde AdminDashboard
      // pero por si acaso, resetear el estado después de un breve delay
      setTimeout(() => {
        setSaving(false);
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Error al guardar cambios');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 md-backdrop flex items-center justify-center z-50 p-4">
      <div className="md-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">Editar usuario</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 transition-colors"
              title="Cerrar"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="md-alert md-alert--error">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="admin-edit-username" className="block text-sm font-semibold text-slate-700 mb-2">
                Nombre de Usuario
              </label>
              <input
                id="admin-edit-username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="md-input w-full"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="admin-edit-email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                id="admin-edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="md-input w-full"
                required
                disabled={saving}
              />
            </div>

            <div>
              <label htmlFor="admin-edit-role" className="block text-sm font-semibold text-slate-700 mb-2">
                Rol
              </label>
              <select
                id="admin-edit-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="md-input w-full"
                disabled={saving}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="md-button md-button--secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="md-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface UserCreateModalProps {
  onClose: () => void;
  onCreate: (data: { username: string; email: string; password: string; role: string }) => void;
}

const UserCreateModal: React.FC<UserCreateModalProps> = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 md-backdrop flex items-center justify-center z-50 p-4">
      <div className="md-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">Crear nuevo usuario</h3>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 transition-colors"
              title="Cerrar"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-create-username" className="block text-sm font-semibold text-slate-700 mb-2">
                Nombre de Usuario
              </label>
              <input
                id="admin-create-username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="md-input w-full"
                required
                placeholder="johndoe"
              />
            </div>

            <div>
              <label htmlFor="admin-create-email" className="block text-sm font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input
                id="admin-create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="md-input w-full"
                required
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label htmlFor="admin-create-password" className="block text-sm font-semibold text-slate-700 mb-2">
                Contraseña
              </label>
              <input
                id="admin-create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="md-input w-full"
                required
                minLength={4}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="admin-create-role" className="block text-sm font-semibold text-slate-700 mb-2">
                Rol
              </label>
              <select
                id="admin-create-role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="md-input w-full"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="md-button md-button--secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="md-button"
              >
                Crear Usuario
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface DeleteConfirmModalProps {
  user: UserData;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ user, onClose, onConfirm }) => {
  return (
    <div className="fixed inset-0 md-backdrop flex items-center justify-center z-50 p-4">
      <div className="md-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-red-700">Confirmar eliminación</h3>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-slate-700">
              ¿Estás seguro de que quieres eliminar este usuario?
            </p>

            <div className="border border-red-200 bg-red-50 rounded-lg p-4">
              <div className="text-slate-900 font-semibold">{user.username}</div>
              <div className="text-slate-600 text-sm">{user.email}</div>
              <div className="text-xs text-red-700 mt-2">
                ⚠️ Esta acción eliminará también todas las cartas, suscripciones y pagos asociados
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="md-button md-button--secondary"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="md-button md-button--danger"
              >
                Eliminar Usuario
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

