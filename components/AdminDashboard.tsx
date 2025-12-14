/**
 * Dashboard de administración completo
 */
import React, { useState, useEffect } from 'react';
import {
  Users, Crown, FileText, DollarSign,
  TrendingUp, Activity, Settings, ArrowLeft,
  Search, Edit, Trash2, Eye, Plus, Star, Key,
  UserX, UserCheck, ChevronLeft, ChevronRight,
  Filter, History
} from 'lucide-react';
import { ResetPasswordModal, AuditLogsModal } from './UserModals';
import PromptEditorModal from './PromptEditorModal';

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onEditPrompt }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'invoices' | 'prompts'>('overview');
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

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'prompts') {
      fetchSpecializedPrompts();
    } else if (activeTab === 'subscriptions') {
      fetchSubscribers();
      fetchRevenueStats();
    } else if (activeTab === 'invoices') {
      fetchPayments();
    }
  }, [activeTab]);

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

  const handleSaveUser = async (userData: { username?: string; email?: string; role?: string }) => {
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Usuario actualizado correctamente' });
        setShowUserEditor(false);
        setSelectedUser(null);
        fetchUsers(); // Recargar lista
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Error al actualizar usuario' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
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
    { id: 'subscriptions', name: 'Suscripciones', icon: Crown },
    { id: 'invoices', name: 'Facturas', icon: FileText },
    { id: 'prompts', name: 'Prompts', icon: Settings }
  ];

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-white mb-4 transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={20} />
              Volver
            </button>
            <h1 className="text-4xl font-bold mystic-text-gradient mb-2">
              Panel de Administración
            </h1>
            <p className="text-gray-400">Gestión completa del sistema Fraktal</p>
          </div>
          <div className="mystic-badge">
            ADMIN
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto mb-8 space-x-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center px-6 py-3 rounded-lg whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'mystic-button text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="mystic-card p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Estadísticas Generales</h2>
              
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Total Usuarios */}
                  <div className="bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-xl p-6 border border-indigo-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <Users className="w-8 h-8 text-indigo-400" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {stats.total_users}
                    </div>
                    <div className="text-gray-400 text-sm">Total Usuarios</div>
                  </div>

                  {/* Suscripciones Activas */}
                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-xl p-6 border border-yellow-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <Crown className="w-8 h-8 text-yellow-400" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {stats.active_subscriptions}
                    </div>
                    <div className="text-gray-400 text-sm">Suscripciones Activas</div>
                  </div>

                  {/* Total Cartas */}
                  <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 rounded-xl p-6 border border-emerald-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <FileText className="w-8 h-8 text-emerald-400" />
                      <Activity className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      {stats.total_charts}
                    </div>
                    <div className="text-gray-400 text-sm">Cartas Generadas</div>
                  </div>

                  {/* Ingresos Mensuales */}
                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-6 border border-green-500/30">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="w-8 h-8 text-green-400" />
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-1">
                      €{stats.monthly_revenue.toFixed(2)}
                    </div>
                    <div className="text-gray-400 text-sm">Ingresos del Mes</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Gestión de Usuarios</h2>

              {message && (
                <div className={`p-4 rounded-lg mb-4 ${
                  message.type === 'success'
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-red-500/20 border border-red-500/30 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}

              {/* FILTERS AND SEARCH BAR */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Buscar usuarios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                    className="mystic-input pl-10 pr-4 w-full"
                  />
                  <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                  className="mystic-input"
                >
                  <option value="">Todos los roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">Usuario</option>
                </select>

                <select
                  value={activeFilter}
                  onChange={(e) => { setActiveFilter(e.target.value); setCurrentPage(1); }}
                  className="mystic-input"
                >
                  <option value="">Todos los estados</option>
                  <option value="true">Activos</option>
                  <option value="false">Inactivos</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="mystic-input"
                >
                  <option value="created_at">Fecha creación</option>
                  <option value="username">Nombre usuario</option>
                  <option value="email">Email</option>
                  <option value="role">Rol</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  title={`Orden: ${sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>

                <button
                  onClick={() => setShowCreateUser(true)}
                  className="mystic-button flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nuevo Usuario
                </button>
              </div>

              {/* Stats */}
              <div className="bg-white/5 rounded-lg p-4 mb-4">
                <div className="text-sm text-gray-400">
                  Mostrando {users.length} de {totalUsers} usuarios | Página {currentPage} de {totalPages}
                </div>
              </div>

              {/* USER LIST */}
              {users.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No se encontraron usuarios
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user._id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {user.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-white font-semibold flex items-center gap-2">
                              {user.username}
                              {!user.active && (
                                <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                                  INACTIVO
                                </span>
                              )}
                            </div>
                            <div className="text-gray-400 text-sm">{user.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            user.role === 'admin'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}>
                            {user.role.toUpperCase()}
                          </span>

                          <button
                            onClick={() => handleViewAuditLogs(user)}
                            className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                            title="Ver historial"
                          >
                            <History size={18} />
                          </button>

                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`p-2 transition-colors ${
                              user.active
                                ? 'text-gray-400 hover:text-orange-400'
                                : 'text-gray-400 hover:text-green-400'
                            }`}
                            title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
                          >
                            {user.active ? <UserX size={18} /> : <UserCheck size={18} />}
                          </button>

                          <button
                            onClick={() => handleResetPasswordClick(user)}
                            className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
                            title="Resetear contraseña"
                          >
                            <Key size={18} />
                          </button>

                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
                            title="Editar usuario"
                          >
                            <Edit size={18} />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                              ? 'mystic-button'
                              : 'bg-white/10 text-white hover:bg-white/20'
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
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                <h2 className="text-2xl font-bold text-white">Gestión de Prompts</h2>
                <button
                  onClick={onEditPrompt}
                  className="mystic-button flex items-center gap-2"
                >
                  <Settings size={18} />
                  Editar Prompt Principal
                </button>
              </div>

              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold">Prompts Especializados Disponibles</h3>
                  <span className="text-sm text-gray-400">
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
                          bg-white/5 rounded-lg p-4 transition-all cursor-pointer border
                          ${existing
                            ? 'border-indigo-500/50 hover:border-indigo-400 hover:bg-white/10'
                            : 'border-gray-700/50 hover:border-gray-600 hover:bg-white/8'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{prompt.icon}</span>
                            <div>
                              <div className="text-white font-semibold text-sm">{prompt.name}</div>
                              {existing && (
                                <div className="flex items-center gap-2 mt-1">
                                  <Star size={12} className="text-yellow-400" fill="currentColor" />
                                  <span className="text-xs text-gray-400">
                                    {existing.usage_count} usos
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {existing ? (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                              Activo
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full border border-gray-500/30">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
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

          {activeTab === 'subscriptions' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Gestión de Suscripciones</h2>

              {/* Revenue Stats */}
              {revenueStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-xl p-6 border border-blue-500/30">
                    <div className="text-sm text-gray-400 mb-1">Total Suscriptores</div>
                    <div className="text-3xl font-bold text-white">{revenueStats.total_subscribers}</div>
                    <div className="text-xs text-green-400 mt-1">{revenueStats.active_subscribers} activos</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-xl p-6 border border-green-500/30">
                    <div className="text-sm text-gray-400 mb-1">Ingresos Mensuales</div>
                    <div className="text-3xl font-bold text-white">€{revenueStats.monthly_revenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">MRR (Monthly Recurring Revenue)</div>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-xl p-6 border border-purple-500/30">
                    <div className="text-sm text-gray-400 mb-1">Ingresos Anuales</div>
                    <div className="text-3xl font-bold text-white">€{revenueStats.yearly_revenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">ARR (Annual Recurring Revenue)</div>
                  </div>

                  <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-xl p-6 border border-yellow-500/30">
                    <div className="text-sm text-gray-400 mb-1">Total Histórico</div>
                    <div className="text-3xl font-bold text-white">€{revenueStats.total_revenue_all_time.toFixed(2)}</div>
                    <div className="text-xs text-gray-400 mt-1">{revenueStats.total_payments} pagos</div>
                  </div>
                </div>
              )}

              {/* Subscribers by Tier */}
              {revenueStats && (
                <div className="bg-white/5 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Suscriptores por Plan</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-gray-400 text-sm mb-1">FREE</div>
                      <div className="text-2xl font-bold text-gray-300">{revenueStats.subscribers_by_tier.free}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 text-sm mb-1">PRO</div>
                      <div className="text-2xl font-bold text-blue-400">{revenueStats.subscribers_by_tier.pro}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 text-sm mb-1">PREMIUM</div>
                      <div className="text-2xl font-bold text-purple-400">{revenueStats.subscribers_by_tier.premium}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-400 text-sm mb-1">ENTERPRISE</div>
                      <div className="text-2xl font-bold text-yellow-400">{revenueStats.subscribers_by_tier.enterprise}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <select
                  value={tierFilter}
                  onChange={(e) => { setTierFilter(e.target.value); setSubsPage(1); }}
                  className="mystic-input"
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
                  className="mystic-input"
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
                <div className="text-center py-12 text-gray-400">
                  No se encontraron suscriptores
                </div>
              ) : (
                <div className="space-y-3">
                  {subscribers.map((sub) => (
                    <div key={sub.user_id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="text-white font-semibold">{sub.username}</div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              sub.tier === 'enterprise' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              sub.tier === 'premium' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              sub.tier === 'pro' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {sub.tier.toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                              sub.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              sub.status === 'cancelled' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              sub.status === 'trial' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {sub.status.toUpperCase()}
                            </span>
                            {sub.billing_cycle && (
                              <span className="text-xs text-gray-400">
                                {sub.billing_cycle === 'monthly' ? '📅 Mensual' : '📅 Anual'}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-400">{sub.email}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Inicio: {new Date(sub.start_date).toLocaleDateString('es-ES')} |
                            Fin: {new Date(sub.end_date).toLocaleDateString('es-ES')}
                            {sub.stripe_customer_id && (
                              <span className="ml-2">| Stripe: {sub.stripe_customer_id.substring(0, 20)}...</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {sub.auto_renew && (
                            <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                              Auto-renovación
                            </span>
                          )}
                          {sub.payment_status && (
                            <span className={`text-xs px-2 py-1 rounded ${
                              sub.payment_status === 'completed' ? 'bg-green-500/20 text-green-400' :
                              sub.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
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
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-white px-4">Página {subsPage} de {subsTotalPages}</span>
                  <button
                    onClick={() => setSubsPage(p => Math.min(subsTotalPages, p + 1))}
                    disabled={subsPage === subsTotalPages}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-6">Historial de Pagos</h2>

              {/* Payments List */}
              {payments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No se encontraron pagos
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Fecha</th>
                        <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Usuario</th>
                        <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Plan</th>
                        <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Monto</th>
                        <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Método</th>
                        <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Estado</th>
                        <th className="text-left text-gray-400 text-sm font-semibold py-3 px-4">Transaction ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.payment_id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          <td className="py-3 px-4 text-gray-300 text-sm">
                            {new Date(payment.created_at).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-3 px-4 text-white text-sm">{payment.user_id}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              payment.subscription_tier === 'enterprise' ? 'bg-yellow-500/20 text-yellow-400' :
                              payment.subscription_tier === 'premium' ? 'bg-purple-500/20 text-purple-400' :
                              payment.subscription_tier === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {payment.subscription_tier.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-white font-semibold text-sm">
                            {payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                          </td>
                          <td className="py-3 px-4 text-gray-300 text-sm capitalize">{payment.method}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              payment.status === 'completed' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              'bg-red-500/20 text-red-400 border border-red-500/30'
                            }`}>
                              {payment.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-xs font-mono">
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
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-white px-4">Página {paymentsPage} de {paymentsTotalPages}</span>
                  <button
                    onClick={() => setPaymentsPage(p => Math.min(paymentsTotalPages, p + 1))}
                    disabled={paymentsPage === paymentsTotalPages}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="mystic-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Editar Usuario</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mystic-input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mystic-input w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mystic-input w-full"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="mystic-button"
              >
                Guardar Cambios
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="mystic-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Crear Nuevo Usuario</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Nombre de Usuario
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="mystic-input w-full"
                required
                placeholder="johndoe"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mystic-input w-full"
                required
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mystic-input w-full"
                required
                minLength={4}
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Rol
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="mystic-input w-full"
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="mystic-button"
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="mystic-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-red-400">Confirmar Eliminación</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-300">
              ¿Estás seguro de que quieres eliminar este usuario?
            </p>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <div className="text-white font-semibold">{user.username}</div>
              <div className="text-gray-400 text-sm">{user.email}</div>
              <div className="text-xs text-red-400 mt-2">
                ⚠️ Esta acción eliminará también todas las cartas, suscripciones y pagos asociados
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
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

