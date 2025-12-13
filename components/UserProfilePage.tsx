/**
 * Perfil de usuario completo con todas las secciones
 */
import React, { useState, useEffect } from 'react';
import { 
  User, CreditCard, FileText, History, Settings, 
  Crown, TrendingUp, Download, Eye, Trash2
} from 'lucide-react';

interface UserProfilePageProps {
  onBack: () => void;
}

interface Subscription {
  tier: string;
  status: string;
  end_date: string;
}

interface Payment {
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

interface UsageStats {
  tier: string;
  charts_count: number;
  charts_limit: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  percentage_used: number;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'billing' | 'charts' | 'settings'>('overview');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      // Obtener suscripción
      const subResponse = await fetch(`${API_URL}/subscriptions/my-subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subResponse.ok) {
        const subData = await subResponse.json();
        setSubscription(subData.subscription);
      }

      // Obtener pagos
      const payResponse = await fetch(`${API_URL}/subscriptions/payments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (payResponse.ok) {
        const payData = await payResponse.json();
        setPayments(payData.payments || []);
      }

      // Obtener uso
      const usageResponse = await fetch(`${API_URL}/subscriptions/usage`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (usageResponse.ok) {
        const usageData = await usageResponse.json();
        setUsage(usageData);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Resumen', icon: User },
    { id: 'subscription', name: 'Suscripción', icon: Crown },
    { id: 'billing', name: 'Facturación', icon: CreditCard },
    { id: 'charts', name: 'Mis Cartas', icon: FileText },
    { id: 'settings', name: 'Configuración', icon: Settings }
  ];

  const getTierBadge = (tier: string) => {
    const colors = {
      free: 'bg-gray-500',
      pro: 'bg-indigo-500',
      premium: 'bg-yellow-500',
      enterprise: 'bg-emerald-500'
    };
    return colors[tier as keyof typeof colors] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white mb-4 transition-colors"
          >
            ← Volver
          </button>
          <h1 className="text-4xl font-bold text-white mb-2">Mi Perfil</h1>
          <p className="text-gray-400">Gestiona tu cuenta y suscripción</p>
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
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
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
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Plan actual */}
              <div className="bg-gradient-to-r from-indigo-500/20 to-purple-600/20 rounded-xl p-6 border border-indigo-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Crown className="w-6 h-6 text-yellow-400 mr-3" />
                    <div>
                      <h3 className="text-white font-bold text-lg">Plan Actual</h3>
                      <p className="text-gray-300 text-sm">{subscription?.tier.toUpperCase() || 'Free'}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-full text-white text-sm ${getTierBadge(subscription?.tier || 'free')}`}>
                    {subscription?.status === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
                {subscription?.end_date && (
                  <p className="text-gray-400 text-sm">
                    Válido hasta: {new Date(subscription.end_date).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Estadísticas de uso */}
              {usage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Cartas */}
                  <div className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold">Cartas Generadas</h4>
                      <FileText className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {usage.charts_count}
                      {usage.charts_limit > 0 && (
                        <span className="text-lg text-gray-400">/{usage.charts_limit}</span>
                      )}
                    </div>
                    {usage.charts_limit > 0 && (
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(usage.percentage_used, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Almacenamiento */}
                  <div className="bg-white/5 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-semibold">Almacenamiento</h4>
                      <TrendingUp className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                      {usage.storage_used_mb.toFixed(1)} MB
                      <span className="text-lg text-gray-400">
                        /{usage.storage_limit_mb} MB
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all"
                        style={{ width: `${(usage.storage_used_mb / usage.storage_limit_mb) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Gestión de Suscripción</h2>
              
              {subscription && (
                <div className="bg-white/5 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        Plan {subscription.tier.toUpperCase()}
                      </h3>
                      <p className="text-gray-400">
                        Estado: <span className="text-green-400">{subscription.status}</span>
                      </p>
                    </div>
                    <button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all">
                      Mejorar Plan
                    </button>
                  </div>
                  
                  {subscription.end_date && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="text-gray-300">
                        <strong>Próxima renovación:</strong> {new Date(subscription.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Historial de Facturación</h2>
              
              {payments.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No hay pagos registrados
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment, idx) => (
                    <div key={idx} className="bg-white/5 rounded-xl p-6 flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-semibold mb-1">{payment.description}</h4>
                        <p className="text-gray-400 text-sm">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-white">
                          €{payment.amount.toFixed(2)}
                        </p>
                        <span className={`text-sm ${
                          payment.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Mis Cartas Astrales</h2>
              <div className="text-center py-12 text-gray-400">
                Funcionalidad en desarrollo...
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Configuración</h2>
              <div className="text-center py-12 text-gray-400">
                Funcionalidad en desarrollo...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfilePage;

