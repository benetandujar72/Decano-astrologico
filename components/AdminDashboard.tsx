/**
 * Dashboard de administración completo
 */
import React, { useState, useEffect } from 'react';
import {
  Users, Crown, FileText, DollarSign,
  TrendingUp, Activity, Settings, ArrowLeft,
  Search, Edit, Trash2, Eye, Plus, Star
} from 'lucide-react';

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

interface UserData {
  _id: string;
  username: string;
  email: string;
  role: string;
  created_at: string;
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

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'prompts') {
      fetchSpecializedPrompts();
    }
  }, [activeTab]);

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

      const url = searchTerm
        ? `${API_URL}/admin/users?search=${encodeURIComponent(searchTerm)}`
        : `${API_URL}/admin/users`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Gestión de Usuarios</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar usuarios..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
                      className="mystic-input pl-10 pr-4"
                    />
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                  </div>
                  <button
                    onClick={() => setShowCreateUser(true)}
                    className="mystic-button flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Nuevo Usuario
                  </button>
                </div>
              </div>

              {message && (
                <div className={`p-4 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-red-500/20 border border-red-500/30 text-red-400'
                }`}>
                  {message.text}
                </div>
              )}

              {users.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No se encontraron usuarios
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user._id} className="bg-white/5 rounded-xl p-4 flex items-center justify-between hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-semibold">{user.username}</div>
                          <div className="text-gray-400 text-sm">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          user.role === 'admin'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                          {user.role.toUpperCase()}
                        </span>
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
                  ))}
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="mystic-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-2xl font-bold text-white">{selectedPrompt.name}</h3>
                          <p className="text-gray-400 text-sm mt-1">{selectedPrompt.description}</p>
                        </div>
                        <button
                          onClick={() => setShowPromptEditor(false)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="bg-white/5 rounded-lg p-4 border border-indigo-500/30">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-white">Información</span>
                            {selectedPrompt.is_default && (
                              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                                Prompt del Sistema
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-3">
                            <div>
                              <span className="text-xs text-gray-400">Tipo:</span>
                              <div className="text-sm text-white mt-1">{selectedPrompt.type}</div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Usos:</span>
                              <div className="text-sm text-white mt-1">{selectedPrompt.usage_count || 0}</div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-white mb-2">
                            Contenido del Prompt
                          </label>
                          <textarea
                            value={selectedPrompt.content || ''}
                            readOnly
                            className="mystic-input font-mono text-sm h-96 resize-none"
                            placeholder="Contenido del prompt..."
                          />
                        </div>

                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setShowPromptEditor(false)}
                            className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                          >
                            Cerrar
                          </button>
                          {!selectedPrompt.is_default && (
                            <button
                              className="mystic-button flex items-center gap-2"
                              onClick={() => {
                                // TODO: Implementar edición de prompts
                                alert('Función de edición en desarrollo');
                              }}
                            >
                              <Edit size={16} />
                              Editar Prompt
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {(activeTab === 'subscriptions' || activeTab === 'invoices') && (
            <div className="text-center py-12 text-gray-400">
              <p className="mb-4">Funcionalidad en desarrollo...</p>
              <p className="text-sm">Los endpoints están listos en el backend</p>
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

