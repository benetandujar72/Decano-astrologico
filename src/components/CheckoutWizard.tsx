import React, { useState, useEffect } from 'react';
import { X, CreditCard, Check, Loader2, AlertCircle, Sparkles } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
}

interface CheckoutWizardProps {
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutWizard: React.FC<CheckoutWizardProps> = ({ plan, onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const savings = billingCycle === 'yearly'
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0;

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleProceedToPayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('fraktal_token');
      if (!token) {
        throw new Error('No estás autenticado. Por favor, inicia sesión.');
      }

      // Crear Checkout Session
      const response = await fetch(`${API_URL}/subscriptions/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan_id: plan.id,
          billing_cycle: billingCycle
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear sesión de pago');
      }

      const data = await response.json();
      const { checkout_url, session_id } = data;

      setSessionId(session_id);

      // Redirigir a Stripe Checkout
      window.location.href = checkout_url;

    } catch (err: any) {
      console.error('Error creando checkout:', err);
      setError(err.message || 'Error al procesar el pago. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 md-backdrop flex items-center justify-center z-50 p-4">
      <div className="md-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50/60">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Suscripción a {plan.name}
            </h2>
            <p className="text-slate-600 text-sm mt-1">
              Paso {step} de 2
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-slate-900 transition-colors"
            disabled={loading}
            aria-label="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {step > 1 ? <Check size={16} /> : '1'}
                </div>
                <span className={step >= 1 ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                  Confirmar Plan
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  2
                </div>
                <span className={step >= 2 ? 'text-slate-900 font-medium' : 'text-slate-600'}>
                  Pago
                </span>
              </div>
            </div>
          </div>
          <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full bg-blue-600 rounded-full transition-all duration-300 ${step === 1 ? 'w-1/2' : 'w-full'}`}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              {/* Plan Summary */}
              <div className="md-card rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Sparkles className="text-blue-700" size={24} />
                  <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-slate-700">
                      <Check className="text-green-700 shrink-0 mt-0.5" size={16} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Billing Cycle Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">
                    Ciclo de facturación
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        billingCycle === 'monthly'
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      <div className="text-left">
                        <div className="text-slate-900 font-semibold">Mensual</div>
                        <div className="text-2xl font-bold text-blue-700 mt-1">
                          €{plan.price_monthly.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">por mes</div>
                      </div>
                    </button>

                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`p-4 rounded-lg border-2 transition-all relative ${
                        billingCycle === 'yearly'
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-slate-200 hover:border-blue-300 bg-white'
                      }`}
                    >
                      {savings > 0 && (
                        <div className="absolute -top-2 -right-2 bg-green-700 text-white text-xs font-bold px-2 py-1 rounded-full">
                          -{savings}%
                        </div>
                      )}
                      <div className="text-left">
                        <div className="text-slate-900 font-semibold">Anual</div>
                        <div className="text-2xl font-bold text-blue-700 mt-1">
                          €{plan.price_yearly.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-600 mt-1">por año</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Price Summary */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-600">Subtotal</span>
                    <span className="text-slate-900 font-semibold">€{price.toFixed(2)}</span>
                  </div>
                  {billingCycle === 'yearly' && savings > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-green-700 text-sm">Ahorro anual</span>
                      <span className="text-green-700 font-semibold">
                        -€{(plan.price_monthly * 12 - plan.price_yearly).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-slate-900 font-bold text-lg">Total</span>
                    <span className="text-blue-700 font-bold text-2xl">€{price.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2">
                    {billingCycle === 'monthly' ? 'Facturado mensualmente' : 'Facturado anualmente'}
                  </p>
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleProceedToPayment}
                disabled={loading}
                className="md-button w-full font-semibold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={20} />
                    <span>Proceder al Pago</span>
                    <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full font-normal">2/2</span>
                  </>
                )}
              </button>

              {error && (
                <div className="md-alert md-alert--error flex items-start gap-3">
                  <AlertCircle className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold mb-1">Error</h4>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Security Notice */}
              <div className="md-card md-card--flat rounded-lg p-4">
                <p className="text-slate-600 text-sm text-center">
                  🔒 Pago seguro procesado por <span className="text-slate-900 font-semibold">Stripe</span>
                  <br />
                  <span className="text-xs">Tus datos de pago nunca se almacenan en nuestros servidores</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutWizard;
