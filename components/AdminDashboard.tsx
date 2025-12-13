/**
 * Dashboard de administración completo
 */
import React, { useState, useEffect } from 'react';
import { 
  Users, Crown, FileText, DollarSign, 
  TrendingUp, Activity, Settings, ArrowLeft,
  Search, Edit, Trash2, Eye
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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack, onEditPrompt }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'subscriptions' | 'invoices' | 'prompts'>('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
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
              </div>

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
                        <button className="p-2 text-gray-400 hover:text-white transition-colors">
                          <Eye size={18} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-indigo-400 transition-colors">
                          <Edit size={18} />
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
                <h3 className="text-white font-semibold mb-2">Prompts Especializados Disponibles</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                  {[
                    'Carta Natal', 'Revolución Solar', 'Tránsitos',
                    'Progresiones', 'Sinastría', 'Compuesta',
                    'Direcciones', 'Orbes Custom', 'Psicológico',
                    'Predictivo', 'Vocacional', 'Médico', 'Financiero'
                  ].map((prompt) => (
                    <div key={prompt} className="bg-white/5 rounded-lg p-3 text-center text-gray-300 text-sm hover:bg-white/10 transition-all cursor-pointer">
                      {prompt}
                    </div>
                  ))}
                </div>
              </div>
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
    </div>
  );
};

export default AdminDashboard;

