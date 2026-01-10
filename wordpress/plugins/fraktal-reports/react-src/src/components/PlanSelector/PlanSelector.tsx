import React, { useState, useEffect } from 'react';
import { Check, Zap, Crown, Building2 } from 'lucide-react';
import { wpApi } from '@/services/wpApi';
import type { Plan, UserPlan } from '@/types';

interface PlanSelectorProps {
  highlighted?: string;
}

export default function PlanSelector({ highlighted = 'premium' }: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPlans() {
      try {
        const [plansData, userPlanData] = await Promise.all([
          wpApi.getPlans(),
          wpApi.getUserPlan()
        ]);
        setPlans(plansData.plans || []);
        setCurrentPlan(userPlanData);
      } catch (error) {
        console.error('Error loading plans:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPlans();
  }, []);

  const handleUpgrade = (productId: number) => {
    window.location.href = `/checkout?add-to-cart=${productId}`;
  };

  const icons = {
    free: Zap,
    premium: Crown,
    enterprise: Building2
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-white">Cargando planes...</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const Icon = icons[plan.tier as keyof typeof icons] || Zap;
        const isCurrent = plan.tier === currentPlan?.tier;
        const isHighlighted = plan.tier === highlighted;

        return (
          <div
            key={plan.tier}
            className={`bg-slate-800 border-2 rounded-xl p-6 transition-all ${
              isCurrent ? 'border-indigo-500 ring-2 ring-indigo-500/50' :
              isHighlighted ? 'border-amber-500' :
              'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Icon className={`w-8 h-8 ${
                isCurrent ? 'text-indigo-400' :
                isHighlighted ? 'text-amber-400' :
                'text-slate-400'
              }`} />
              <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
            </div>

            <div className="mb-4">
              <span className="text-3xl font-bold text-white">€{plan.price}</span>
              <span className="text-slate-400">/mes</span>
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {isCurrent ? (
              <button
                disabled
                className="w-full py-2 bg-slate-700 text-slate-400 rounded-lg cursor-not-allowed"
              >
                Plan Actual
              </button>
            ) : (
              <button
                onClick={() => handleUpgrade(plan.productId)}
                className={`w-full py-2 rounded-lg transition-colors ${
                  isHighlighted
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                }`}
              >
                {currentPlan?.tier === 'free' ? 'Mejorar Plan' : 'Cambiar Plan'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
