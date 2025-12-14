import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, AlertCircle, ArrowRight, Sparkles, CreditCard, Calendar } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface SubscriptionSuccessProps {
  sessionId: string;
  onContinue: () => void;
}

export const SubscriptionSuccess: React.FC<SubscriptionSuccessProps> = ({ sessionId, onContinue }) => {
  const [status, setStatus] = useState<'checking' | 'completed' | 'failed'>('checking');
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPaymentStatus();
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      if (!token) {
        setStatus('failed');
        setError('No estás autenticado');
        return;
      }

      const response = await fetch(`${API_URL}/subscriptions/check-payment/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error verificando el pago');
      }

      const data = await response.json();

      if (data.status === 'completed') {
        setStatus('completed');
        setSubscription(data.subscription);
      } else if (data.status === 'failed') {
        setStatus('failed');
        setError('El pago no pudo ser procesado');
      } else {
        // Still pending, check again in 2 seconds
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (err: any) {
      console.error('Error checking payment:', err);
      setStatus('failed');
      setError(err.message || 'Error verificando el pago');
    }
  };

  const getPlanName = (tier: string) => {
    const names: Record<string, string> = {
      'free': 'Plan Gratuito',
      'pro': 'Plan Profesional',
      'premium': 'Plan Premium',
      'enterprise': 'Plan Empresarial'
    };
    return names[tier] || tier;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 max-w-md w-full text-center border border-purple-500/20">
          <Loader2 className="animate-spin text-purple-400 mx-auto mb-6" size={64} />
          <h2 className="text-2xl font-bold text-white mb-3">
            Verificando tu pago...
          </h2>
          <p className="text-slate-400">
            Estamos confirmando tu suscripción con Stripe.
            <br />
            Esto tomará solo unos segundos.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 max-w-md w-full text-center border border-red-500/20">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="text-red-400" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
            Hubo un problema
          </h2>
          <p className="text-slate-400 mb-6">
            {error || 'No pudimos procesar tu pago. Por favor, inténtalo de nuevo.'}
          </p>
          <button
            onClick={onContinue}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <span>Volver a intentar</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-12 max-w-2xl w-full border border-purple-500/20">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="text-green-400" size={48} />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
            ¡Suscripción Activada!
          </h1>
          <p className="text-slate-400 text-lg">
            Tu pago ha sido procesado exitosamente
          </p>
        </div>

        {/* Subscription Details */}
        {subscription && (
          <div className="space-y-4 mb-8">
            <div className="bg-slate-800/80 rounded-xl p-6 border border-purple-500/20">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="text-purple-400" size={24} />
                <h3 className="text-xl font-bold text-white">
                  {getPlanName(subscription.tier)}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Calendar size={16} />
                    <span>Inicio</span>
                  </div>
                  <div className="text-white font-semibold">
                    {formatDate(subscription.start_date)}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                    <Calendar size={16} />
                    <span>Próxima renovación</span>
                  </div>
                  <div className="text-white font-semibold">
                    {formatDate(subscription.end_date)}
                  </div>
                </div>

                {subscription.billing_cycle && (
                  <div>
                    <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                      <CreditCard size={16} />
                      <span>Ciclo de facturación</span>
                    </div>
                    <div className="text-white font-semibold capitalize">
                      {subscription.billing_cycle === 'monthly' ? 'Mensual' : 'Anual'}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-slate-400 text-sm mb-1">Estado</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-semibold">Activo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="bg-slate-800/50 rounded-xl p-6 border border-purple-500/20">
              <h4 className="text-white font-semibold mb-3">¿Qué sigue?</h4>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                  <span>Recibirás un email de confirmación de Stripe</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                  <span>Ya puedes acceder a todas las funciones de tu plan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="text-purple-400 flex-shrink-0 mt-0.5" size={16} />
                  <span>Gestiona tu suscripción desde tu perfil de usuario</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <span>Ir a mi Perfil</span>
          <ArrowRight size={20} />
        </button>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            🔒 Pago seguro procesado por <span className="text-white font-semibold">Stripe</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionSuccess;
