/**
 * Perfil de usuario completo con todas las secciones
 */
import React, { useState, useEffect } from 'react';
import {
  User, CreditCard, FileText, History, Settings,
  Crown, TrendingUp, Download, Eye, Trash2, MessageCircle,
  Calendar, ShoppingBag, Mail, BookOpen, CheckCircle2, Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import GenericModal from './GenericModal';

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

interface Booking {
  booking_id: string;
  service_name: string;
  service_type: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
  final_price: number;
  created_at: string;
}

interface Chart {
  chart_id: string;
  name: string;
  birth_date: string;
  location: string;
  created_at: string;
}

interface DemoSession {
  session_id: string;
  created_at: string;
  chart_data: {
    name: string;
    birth_date: string;
  };
  pdf_generated?: boolean;
}

interface DemoMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

const UserProfilePage: React.FC<UserProfilePageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'subscription' | 'billing' | 'charts' | 'bookings' | 'messages' | 'settings' | 'demos'>('overview');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [demoSessions, setDemoSessions] = useState<DemoSession[]>([]);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatModalTitle, setChatModalTitle] = useState('Histórico de chat');
  const [chatMessages, setChatMessages] = useState<DemoMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [targetFeature, setTargetFeature] = useState('');
  const [deletingChartId, setDeletingChartId] = useState<string | null>(null);

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

      // Obtener reservas de servicios
      const bookingsResponse = await fetch(`${API_URL}/professional-services/my-bookings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setBookings(bookingsData.bookings || []);
      }

      // Obtener cartas generadas
      const chartsResponse = await fetch(`${API_URL}/charts/my-charts`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (chartsResponse.ok) {
        const chartsData = await chartsResponse.json();
        setCharts(chartsData.charts || []);
      }

      // Obtener demos
      const demosResponse = await fetch(`${API_URL}/demo-chat/my-sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (demosResponse.ok) {
        const demosData = await demosResponse.json();
        setDemoSessions(demosData || []);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChart = async (chart: Chart) => {
    const ok = window.confirm('¿Eliminar esta carta?');
    if (!ok) return;
    try {
      setDeletingChartId(chart.chart_id);
      await api.deleteChart(chart.chart_id);
      setCharts((prev) => prev.filter((c) => c.chart_id !== chart.chart_id));
    } catch (e: any) {
      console.error('Error eliminando carta:', e);
      alert(e?.message || 'Error eliminando carta');
    } finally {
      setDeletingChartId(null);
    }
  };

  const tabs = [
    { id: 'overview', name: 'Resumen', icon: User },
    { id: 'subscription', name: 'Suscripción', icon: Crown },
    { id: 'bookings', name: 'Mis Servicios', icon: Calendar },
    { id: 'charts', name: 'Mis Cartas', icon: FileText },
    { id: 'demos', name: 'Demos & PDFs', icon: History },
    { id: 'billing', name: 'Facturación', icon: CreditCard },
    { id: 'messages', name: 'Mensajes', icon: MessageCircle },
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

  const handleTabClick = (tabId: string, tabName: string) => {
    // Definir qué pestañas son exclusivas de PRO
    const proTabs = ['billing', 'messages', 'settings', 'bookings'];
    const isPro = subscription?.tier && ['pro', 'premium', 'enterprise'].includes(subscription.tier);
    
    if (proTabs.includes(tabId) && !isPro) {
      setTargetFeature(tabName);
      setShowUpsellModal(true);
      return;
    }
    setActiveTab(tabId as any);
  };

  const handleViewDemoChat = async (session: DemoSession) => {
    setIsChatModalOpen(true);
    setChatError(null);
    setChatLoading(true);
    setChatMessages([]);
    setChatModalTitle(`Histórico de chat (${session.session_id.substring(0, 8)}...)`);

    try {
      const data = await api.getDemoSession(session.session_id);
      setChatMessages(data?.messages || []);
    } catch (e: any) {
      setChatError(e?.message || 'No se pudo cargar el chat');
    } finally {
      setChatLoading(false);
    }
  };

  const handleDeleteDemoSession = async (session: DemoSession) => {
    const ok = window.confirm('¿Eliminar esta demo? Esto también elimina su PDF asociado.');
    if (!ok) return;

    try {
      await api.deleteDemoSession(session.session_id);
      setDemoSessions(prev => prev.filter(s => s.session_id !== session.session_id));
    } catch (e) {
      console.error('Error deleting demo session:', e);
      alert('No se pudo eliminar la demo.');
    }
  };

  const handleDownloadDemoPdf = async (session: DemoSession) => {
    try {
      const { blobUrl, filename } = await api.downloadDemoPdf(session.session_id);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (e) {
      console.error('Error downloading demo PDF:', e);
      alert('No se pudo descargar el PDF.');
    }
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
                onClick={() => handleTabClick(tab.id, tab.name)}
                className={`
                  flex items-center px-6 py-3 rounded-lg whitespace-nowrap transition-all
                  ${activeTab === tab.id
                    ? 'bg-linear-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
                {['billing', 'messages', 'settings', 'bookings'].includes(tab.id) && (!subscription?.tier || subscription.tier === 'free') && (
                  <Crown className="w-3 h-3 ml-2 text-yellow-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Plan actual */}
              <div className="bg-linear-to-r from-indigo-500/20 to-purple-600/20 rounded-xl p-6 border border-indigo-500/30">
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
                      <progress
                        className="mystic-progress-sm mystic-progress--indigo"
                        value={Math.min(usage.percentage_used, 100)}
                        max={100}
                        aria-label="Uso de cartas"
                      />
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
                    <progress
                      className="mystic-progress-sm mystic-progress--green"
                      value={Math.min((usage.storage_used_mb / Math.max(usage.storage_limit_mb, 1)) * 100, 100)}
                      max={100}
                      aria-label="Uso de almacenamiento"
                    />
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
                    <button className="bg-linear-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all">
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

          {activeTab === 'bookings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Mis Servicios Contratados</h2>

              {bookings.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No has contratado ningún servicio aún</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.booking_id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg mb-2">{booking.service_name}</h3>
                          <div className="space-y-1 text-sm text-gray-400">
                            {booking.scheduled_date && (
                              <p className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(booking.scheduled_date).toLocaleDateString()} {booking.scheduled_time && `a las ${booking.scheduled_time}`}
                              </p>
                            )}
                            <p>Reservado el: {new Date(booking.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            booking.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                            booking.status === 'pending_payment' ? 'bg-yellow-500/20 text-yellow-400' :
                            booking.status === 'completed' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {booking.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <p className="text-white font-bold text-xl mt-2">
                            {booking.final_price > 0 ? `€${booking.final_price.toFixed(2)}` : 'GRATIS'}
                          </p>
                        </div>
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

              {charts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No has generado ninguna carta astral aún</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {charts.map((chart) => (
                    <div key={chart.chart_id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <FileText className="w-8 h-8 text-purple-400" />
                        <button
                          type="button"
                          className="text-gray-400 hover:text-white"
                          title="Ver carta"
                          aria-label="Ver carta astral"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                      <h3 className="text-white font-bold mb-2">{chart.name || 'Carta sin nombre'}</h3>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>Fecha: {new Date(chart.birth_date).toLocaleDateString()}</p>
                        <p>Lugar: {chart.location}</p>
                        <p className="text-xs">Creada: {new Date(chart.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded-lg transition-all"
                        >
                          <Download className="w-4 h-4 inline mr-1" />
                          Descargar
                        </button>
                        <button
                          type="button"
                          className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-all"
                          title="Eliminar carta"
                          aria-label="Eliminar carta"
                          onClick={() => handleDeleteChart(chart)}
                          disabled={deletingChartId === chart.chart_id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'demos' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Mis Demos y PDFs</h2>

              {demoSessions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No has realizado ninguna demo aún</p>
                  <button
                    onClick={() => window.location.href = '/'}
                    className="mt-4 text-purple-400 hover:text-purple-300 underline"
                  >
                    Ir al inicio para probar la demo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {demoSessions.map((session) => (
                    <div key={session.session_id} className="bg-white/5 rounded-xl p-6 hover:bg-white/10 transition-all border border-white/5 hover:border-purple-500/30">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-purple-500/20 rounded-lg">
                          <Sparkles className="w-6 h-6 text-purple-400" />
                        </div>
                        <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded-full">
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <h3 className="text-white font-bold mb-2">Sesión de Demo</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        ID: {session.session_id.substring(0, 8)}...
                      </p>

                      <div className="space-y-2">
                        {session.pdf_generated ? (
                          <button
                            onClick={() => handleDownloadDemoPdf(session)}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 rounded-lg transition-all"
                          >
                            <Download className="w-4 h-4" />
                            Descargar PDF
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-center gap-2 bg-gray-700/50 text-gray-400 text-sm py-2 rounded-lg cursor-not-allowed">
                            <FileText className="w-4 h-4" />
                            PDF no disponible
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleViewDemoChat(session)}
                          className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm py-2 rounded-lg transition-all"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Ver chat
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDemoSession(session)}
                          className="w-full flex items-center justify-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 text-sm py-2 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white mb-4">Mensajes y Comunicaciones</h2>

              <div className="bg-linear-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <Mail className="w-8 h-8 text-green-400 shrink-0" />
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Contacta con Jon Landeta</h3>
                    <p className="text-gray-300 mb-4">
                      ¿Tienes alguna pregunta? ¿Necesitas orientación personalizada?
                      Contacta directamente con Jon Landeta para recibir asesoramiento profesional.
                    </p>
                    <button
                      type="button"
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
                      onClick={() => {
                        // Redirigir a la sección de servicios profesionales con el servicio de contacto
                        window.location.href = '#/professional-services';
                      }}
                    >
                      <MessageCircle className="w-5 h-5 inline mr-2" />
                      Iniciar Conversación
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Historial de Comunicaciones
                </h3>
                <div className="text-center py-12 text-gray-400">
                  <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No tienes comunicaciones previas</p>
                  <p className="text-sm mt-2">Inicia una conversación para recibir orientación personalizada</p>
                </div>
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

      {/* Upsell Modal */}
      {showUpsellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl relative animate-slide-up">
            <button 
              onClick={() => setShowUpsellModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/50">
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Función Premium</h3>
              <p className="text-gray-300">
                La sección <span className="text-indigo-400 font-bold">{targetFeature}</span> está disponible exclusivamente para usuarios PRO.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                <ul className="space-y-2 text-sm text-gray-300 text-left">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Acceso a historial completo
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Mensajería prioritaria
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Configuración avanzada
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  setShowUpsellModal(false);
                  setActiveTab('subscription');
                }}
                className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/25"
              >
                Ver Planes Disponibles
              </button>
              
              <button
                onClick={() => setShowUpsellModal(false)}
                className="w-full text-gray-400 hover:text-white text-sm py-2"
              >
                Quizás más tarde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Chat Modal */}
      <GenericModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        title={chatModalTitle}
      >
        {chatLoading ? (
          <div className="text-gray-300">Cargando...</div>
        ) : chatError ? (
          <div className="text-red-300">{chatError}</div>
        ) : chatMessages.length === 0 ? (
          <div className="text-gray-400">No hay mensajes en esta sesión.</div>
        ) : (
          <div className="space-y-3">
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                className={
                  m.role === 'user'
                    ? 'bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3'
                    : m.role === 'assistant'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3'
                      : 'bg-white/5 border border-white/10 rounded-lg p-3'
                }
              >
                <div className="text-xs text-gray-400 mb-1">
                  {m.role === 'user' ? 'Tú' : m.role === 'assistant' ? 'Asistente' : 'Sistema'}
                </div>
                <div className="text-gray-200 whitespace-pre-wrap">{m.content}</div>
              </div>
            ))}
          </div>
        )}
      </GenericModal>
    </div>
  );
};

export default UserProfilePage;

