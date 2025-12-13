/**
 * Selector de planes de suscripción
 */
import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building2, X } from 'lucide-react';

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
      case 'free': return <Zap className="w-8 h-8" />;
      case 'pro': return <Crown className="w-8 h-8" />;
      case 'premium': return <Crown className="w-8 h-8" />;
      case 'enterprise': return <Building2 className="w-8 h-8" />;
      default: return <Zap className="w-8 h-8" />;
    }
  };

  const getPlanColor = (tier: string) => {
    switch (tier) {
      case 'free': return 'from-gray-500 to-gray-700';
      case 'pro': return 'from-indigo-500 to-purple-600';
      case 'premium': return 'from-yellow-500 to-orange-600';
      case 'enterprise': return 'from-emerald-500 to-teal-600';
      default: return 'from-gray-500 to-gray-700';
    }
  };

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
    <div className="min-h-screen py-12 px-4 relative">
      {/* Botón cerrar */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            Elige tu Plan
          </h1>
          <p className="text-xl text-gray-300">
            Desbloquea todo el potencial del análisis astrológico
          </p>
        </div>

        {/* Toggle billing */}
        <div className="flex justify-center mb-12">
          <div className="bg-white/10 backdrop-blur-lg rounded-full p-1 inline-flex">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-8 py-3 rounded-full transition-all ${
                billing === 'monthly'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-8 py-3 rounded-full transition-all ${
                billing === 'yearly'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              Anual
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
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
            
            return (
              <div
                key={plan.tier}
                className={`relative group ${
                  isPopular ? 'lg:-mt-4 lg:mb-4' : ''
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                      ⭐ MÁS POPULAR
                    </div>
                  </div>
                )}

                {/* Card */}
                <div className={`
                  relative h-full
                  bg-gradient-to-br ${getPlanColor(plan.tier)}
                  p-[2px] rounded-2xl
                  transform transition-all duration-300
                  hover:scale-105 hover:shadow-2xl
                  ${isPopular ? 'shadow-2xl shadow-indigo-500/50' : ''}
                `}>
                  <div className="bg-[#0a0e27] rounded-2xl p-8 h-full flex flex-col">
                    {/* Icon */}
                    <div className={`
                      w-16 h-16 rounded-xl flex items-center justify-center mb-4
                      bg-gradient-to-br ${getPlanColor(plan.tier)}
                      text-white
                    `}>
                      {getPlanIcon(plan.tier)}
                    </div>

                    {/* Plan name */}
                    <h3 className="text-2xl font-bold text-white mb-2">
                      {plan.name}
                    </h3>

                    {/* Price */}
                    <div className="mb-6">
                      {plan.price_monthly === 0 ? (
                        <div className="text-4xl font-bold text-white">
                          Gratis
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline">
                            <span className="text-4xl font-bold text-white">
                              €{priceInfo.price.toFixed(2)}
                            </span>
                            <span className="text-gray-400 ml-2">
                              /{billing === 'yearly' ? 'año' : 'mes'}
                            </span>
                          </div>
                          {priceInfo.monthly && (
                            <div className="text-sm text-gray-400 mt-1">
                              €{priceInfo.monthly}/mes
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8 flex-grow">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start">
                          <Check className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button
                      onClick={() => onSelectPlan(plan.tier, billing)}
                      disabled={plan.tier === 'free'}
                      className={`
                        w-full py-4 rounded-xl font-bold text-lg
                        transition-all transform hover:scale-105
                        ${plan.tier === 'free'
                          ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                          : `bg-gradient-to-r ${getPlanColor(plan.tier)} text-white shadow-lg hover:shadow-xl`
                        }
                      `}
                    >
                      {plan.tier === 'free' ? 'Plan Actual' : 'Seleccionar Plan'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="text-center mt-12 text-gray-400">
          <p>Todos los planes incluyen soporte técnico • Cancela cuando quieras</p>
          <p className="mt-2">¿Necesitas algo personalizado? <span className="text-indigo-400 cursor-pointer hover:underline">Contáctanos</span></p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;

