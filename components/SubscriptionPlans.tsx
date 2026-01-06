/**
 * Selector de planes de suscripción
 */
import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building2, X } from 'lucide-react';
import CheckoutWizard from './CheckoutWizard';

interface Plan {
  tier: string;
  name: string;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  max_charts: number;
  can_export_pdf: boolean;
  can_use_advanced_techniques: boolean;
}

interface SubscriptionPlansProps {
  onSelectPlan: (tier: string, billing: 'monthly' | 'yearly') => void;
  onClose?: () => void;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ onSelectPlan, onClose }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [showCheckoutWizard, setShowCheckoutWizard] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${API_URL}/subscriptions/plans`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (tier: string) => {
    switch (tier) {
      case 'free': return <Zap />;
      case 'pro': return <Crown />;
      case 'premium': return <Crown />;
      case 'enterprise': return <Building2 />;
      default: return <Zap />;
    }
  };

  // (badge classes reserved for future use; keeping here for consistency across plan UIs)

  const getPrice = (plan: Plan) => {
    const price = billing === 'yearly' ? plan.price_yearly : plan.price_monthly;
    if (billing === 'yearly') {
      const monthly = price / 12;
      return { price, monthly: monthly.toFixed(2) };
    }
    return { price, monthly: null };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="md-page relative">
      {/* Botón cerrar */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-900 transition-colors"
          aria-label="Cerrar"
        >
          <X size={24} />
        </button>
      )}

      <div className="md-container">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-semibold mb-4 text-slate-900">
            Planes de suscripción
          </h1>
          <p className="text-base md:text-xl text-slate-600">
            Elige el plan que mejor encaja con tu uso.
          </p>
        </div>

        {/* Toggle billing */}
        <div className="flex justify-center mb-12">
          <div className="md-card md-card--flat rounded-full p-1 inline-flex">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-8 py-3 rounded-full transition-all ${
                billing === 'monthly'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-8 py-3 rounded-full transition-all ${
                billing === 'yearly'
                  ? 'bg-white text-slate-900 border border-slate-200 shadow-sm'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Anual
              <span className="ml-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-full">
                -17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const priceInfo = getPrice(plan);
            const isPopular = plan.tier === 'pro';
            const isFree = plan.tier === 'free';

            return (
              <div
                key={plan.tier}
                className={`relative group ${
                  isPopular ? 'lg:-mt-4 lg:mb-4' : ''
                } ${
                  isFree ? 'lg:-mt-2' : ''
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-amber-100 text-amber-900 border border-amber-200 px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                      Recomendado
                    </div>
                  </div>
                )}
                {/* Free badge */}
                {isFree && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-slate-100 text-slate-900 border border-slate-200 px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                      Inicio
                    </div>
                  </div>
                )}

                {/* Card */}
                <div className={`md-card rounded-2xl p-8 h-full flex flex-col transform transition-all duration-200 hover:shadow-md ${isPopular ? 'ring-2 ring-blue-200' : ''}`}>
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-slate-900 text-white">
                      {React.cloneElement(getPlanIcon(plan.tier) as any, { className: 'w-6 h-6' })}
                    </div>

                    {/* Plan name */}
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      {plan.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.price_monthly === 0 ? (
                        <div className="text-3xl font-semibold text-slate-900">
                          Gratis
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline">
                            <span className="text-3xl font-semibold text-slate-900">
                              €{priceInfo.price.toFixed(2)}
                            </span>
                            <span className="text-slate-600 ml-2">
                              /{billing === 'yearly' ? 'año' : 'mes'}
                            </span>
                          </div>
                          {priceInfo.monthly && (
                            <div className="text-sm text-slate-600 mt-1">
                              €{priceInfo.monthly}/mes
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8 grow">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <Check className="w-5 h-5 text-green-700 mr-2 shrink-0 mt-0.5" />
                          <span className="text-slate-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={() => {
                        if (plan.tier === 'free') {
                          // Para plan gratuito, simplemente cerrar o mostrar mensaje
                          if (onClose) onClose();
                          return;
                        }
                        setSelectedPlan({...plan, id: plan.tier} as any);
                        setShowCheckoutWizard(true);
                      }}
                      className={`w-full md-button px-6 py-3 rounded-xl ${plan.tier === 'free' ? 'md-button--secondary' : ''}`}
                    >
                      {plan.tier === 'free' ? 'Continuar' : 'Seleccionar plan'}
                    </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 text-slate-600">
          <p>Todos los planes incluyen soporte técnico • Cancela cuando quieras</p>
          <p className="mt-2">¿Necesitas algo personalizado? <span className="text-blue-700 cursor-pointer hover:underline">Contáctanos</span></p>
        </div>
      </div>

      {/* Checkout Wizard Modal */}
      {showCheckoutWizard && selectedPlan && (
        <CheckoutWizard
          plan={{
            ...selectedPlan,
            id: selectedPlan.tier
          }}
          onClose={() => {
            setShowCheckoutWizard(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            setShowCheckoutWizard(false);
            setSelectedPlan(null);
            // Opcional: llamar a onSelectPlan o redirigir
            if (onClose) onClose();
          }}
        />
      )}
    </div>
  );
};

export default SubscriptionPlans;

