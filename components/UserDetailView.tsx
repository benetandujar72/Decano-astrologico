/**
 * Vista detallada de usuario para administrador
 * Muestra toda la información del usuario: plan, cartas, facturación, consultas, etc.
 */
import React, { useState, useEffect } from 'react';
import {
  X, User, Mail, Calendar, Crown, FileText, DollarSign,
  MessageCircle, Clock, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Sparkles, CreditCard, History
} from 'lucide-react';

interface UserDetailViewProps {
  userId: string;
  onClose: () => void;
}

interface UserDetails {
  _id: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  created_at: string;
  subscription?: {
    tier: string;
    status: string;
    start_date: string;
    end_date: string;
    billing_cycle: string;
  };
}

interface Chart {
  chart_id: string;
  chart_type: string;
  created_at: string;
  analysis?: {
    title?: string;
  };
}

interface Payment {
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  subscription_tier: string;
}

interface Consultation {
  consultation_id: string;
  status: string;
  created_at: string;
  total_messages: number;
}

interface Booking {
  booking_id: string;
  service_name: string;
  status: string;
  final_price: number;
  created_at: string;
}

const UserDetailView: React.FC<UserDetailViewProps> = ({ userId, onClose }) => {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [charts, setCharts] = useState<Chart[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    charts: false,
    payments: false,
    consultations: false,
    bookings: false
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('fraktal_token');

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener datos del usuario
      const userResponse = await fetch(`${API_URL}/admin/users/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userResponse.ok) {
        throw new Error('Error al cargar datos del usuario');
      }

      const userData = await userResponse.json();
      setUserDetails(userData);

      // Obtener cartas del usuario
      try {
        const chartsResponse = await fetch(`${API_URL}/charts/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (chartsResponse.ok) {
          const chartsData = await chartsResponse.json();
          setCharts(chartsData.charts || []);
        }
      } catch (err) {
        console.error('Error loading charts:', err);
      }

      // Obtener pagos del usuario
      try {
        const paymentsResponse = await fetch(`${API_URL}/subscriptions/admin/payments?user_id=${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (paymentsResponse.ok) {
          const paymentsData = await paymentsResponse.json();
          setPayments(paymentsData.payments || []);
        }
      } catch (err) {
        console.error('Error loading payments:', err);
      }

      // Obtener consultas con experto
      try {
        const consultationsResponse = await fetch(`${API_URL}/expert-chat/admin/user/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (consultationsResponse.ok) {
          const consultationsData = await consultationsResponse.json();
          setConsultations(consultationsData.consultations || []);
        }
      } catch (err) {
        console.error('Error loading consultations:', err);
      }

      // Obtener reservas de servicios
      try {
        const bookingsResponse = await fetch(`${API_URL}/professional-services/admin/bookings?user_id=${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (bookingsResponse.ok) {
          const bookingsData = await bookingsResponse.json();
          setBookings(bookingsData.bookings || []);
        }
      } catch (err) {
        console.error('Error loading bookings:', err);
      }

    } catch (err: any) {
      console.error('Error fetching user details:', err);
      setError(err.message || 'Error al cargar datos del usuario');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'enterprise': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'premium': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      case 'pro': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'paid': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'pending': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'cancelled':
      case 'failed': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
        <div className="bg-gray-900 rounded-2xl p-8 border border-purple-500/30">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-300 mt-4">Cargando datos del usuario...</p>
        </div>
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
        <div className="bg-gray-900 rounded-2xl p-8 border border-red-500/30 max-w-md w-full">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h3 className="text-xl font-bold text-white">Error</h3>
          </div>
          <p className="text-gray-300 mb-6">{error || 'Usuario no encontrado'}</p>
          <button
            onClick={onClose}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-purple-500/30">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                {userDetails.username[0].toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{userDetails.username}</h2>
                <p className="text-gray-400">{userDetails.email}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-6 h-6 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información Básica */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5" />
              Información Básica
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Rol</p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  userDetails.role === 'admin'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {userDetails.role.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Estado</p>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  userDetails.active
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {userDetails.active ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Fecha Registro</p>
                <p className="text-white text-sm">
                  {new Date(userDetails.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">ID Usuario</p>
                <p className="text-white text-xs font-mono">{userDetails._id}</p>
              </div>
            </div>
          </div>

          {/* Plan Contratado */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Plan Contratado
            </h3>
            {userDetails.subscription ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-4 py-2 rounded-lg font-bold border ${getTierColor(userDetails.subscription.tier)}`}>
                    {userDetails.subscription.tier.toUpperCase()}
                  </span>
                  <span className={`px-4 py-2 rounded-lg font-bold border ${getStatusColor(userDetails.subscription.status)}`}>
                    {userDetails.subscription.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">Inicio</p>
                    <p className="text-white">{new Date(userDetails.subscription.start_date).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Fin</p>
                    <p className="text-white">{new Date(userDetails.subscription.end_date).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 mb-1">Ciclo de Facturación</p>
                    <p className="text-white capitalize">{userDetails.subscription.billing_cycle}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">Sin suscripción activa (Plan FREE)</p>
            )}
          </div>

          {/* Cartas Astrológicas */}
          <div className="bg-gray-800 rounded-xl p-6">
            <button
              onClick={() => toggleSection('charts')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Cartas Astrológicas ({charts.length})
              </h3>
              {expandedSections.charts ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.charts && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {charts.length === 0 ? (
                  <p className="text-gray-400 text-sm">No hay cartas generadas</p>
                ) : (
                  charts.map((chart) => (
                    <div key={chart.chart_id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{chart.analysis?.title || chart.chart_type}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(chart.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className="text-xs text-purple-400 font-mono">{chart.chart_id.substring(0, 8)}...</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Facturación */}
          <div className="bg-gray-800 rounded-xl p-6">
            <button
              onClick={() => toggleSection('payments')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Historial de Pagos ({payments.length})
              </h3>
              {expandedSections.payments ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.payments && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {payments.length === 0 ? (
                  <p className="text-gray-400 text-sm">No hay pagos registrados</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.payment_id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          {payment.amount.toFixed(2)} {payment.currency}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(payment.created_at).toLocaleDateString('es-ES')} - {payment.subscription_tier}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(payment.status)}`}>
                        {payment.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Consultas con Experto IA */}
          <div className="bg-gray-800 rounded-xl p-6">
            <button
              onClick={() => toggleSection('consultations')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                Consultas con Experto IA ({consultations.length})
              </h3>
              {expandedSections.consultations ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.consultations && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {consultations.length === 0 ? (
                  <p className="text-gray-400 text-sm">No hay consultas registradas</p>
                ) : (
                  consultations.map((consultation) => (
                    <div key={consultation.consultation_id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          {consultation.total_messages} mensajes
                        </p>
                        <p className="text-gray-400 text-xs">
                          {new Date(consultation.created_at).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(consultation.status)}`}>
                        {consultation.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Reservas de Servicios */}
          <div className="bg-gray-800 rounded-xl p-6">
            <button
              onClick={() => toggleSection('bookings')}
              className="w-full flex items-center justify-between text-left"
            >
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Reservas de Servicios ({bookings.length})
              </h3>
              {expandedSections.bookings ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {expandedSections.bookings && (
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {bookings.length === 0 ? (
                  <p className="text-gray-400 text-sm">No hay reservas registradas</p>
                ) : (
                  bookings.map((booking) => (
                    <div key={booking.booking_id} className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{booking.service_name}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(booking.created_at).toLocaleDateString('es-ES')} - {booking.final_price}€
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailView;
