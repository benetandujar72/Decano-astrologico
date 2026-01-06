/**
 * Panel de técnicas avanzadas (Tránsitos, Progresiones, etc.)
 */
import React, { useState } from 'react';
import { 
  TrendingUp, Clock, Compass, Users, 
  BarChart, Calendar, Target, Zap 
} from 'lucide-react';

interface AdvancedTechniquesProps {
  onSelectTechnique: (technique: string) => void;
  onBack: () => void;
}

interface Technique {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  isPro: boolean;
  comingSoon?: boolean;
}

const AdvancedTechniques: React.FC<AdvancedTechniquesProps> = ({ onSelectTechnique, onBack }) => {
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);

  const techniques: Technique[] = [
    {
      id: 'transits',
      name: 'Tránsitos',
      description: 'Analiza los tránsitos actuales y futuros de los planetas sobre tu carta natal',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      isPro: true
    },
    {
      id: 'progressions',
      name: 'Progresiones Secundarias',
      description: 'Evolución simbólica de tu carta natal a través del tiempo',
      icon: Clock,
      color: 'from-purple-500 to-pink-500',
      isPro: true
    },
    {
      id: 'solar_return',
      name: 'Revolución Solar',
      description: 'Carta astrológica para el año actual basada en tu retorno solar',
      icon: Calendar,
      color: 'from-yellow-500 to-orange-500',
      isPro: true
    },
    {
      id: 'synastry',
      name: 'Sinastría',
      description: 'Análisis de compatibilidad entre dos cartas natales',
      icon: Users,
      color: 'from-rose-500 to-red-500',
      isPro: true
    },
    {
      id: 'composite',
      name: 'Carta Compuesta',
      description: 'Carta de la relación entre dos personas',
      icon: Target,
      color: 'from-emerald-500 to-teal-500',
      isPro: true
    },
    {
      id: 'directions',
      name: 'Direcciones Primarias',
      description: 'Técnica predictiva avanzada de movimiento simbólico',
      icon: Compass,
      color: 'from-indigo-500 to-blue-500',
      isPro: true,
      comingSoon: true
    },
    {
      id: 'lunar_return',
      name: 'Revolución Lunar',
      description: 'Análisis mensual basado en el retorno lunar',
      icon: BarChart,
      color: 'from-violet-500 to-purple-500',
      isPro: true,
      comingSoon: true
    },
    {
      id: 'electional',
      name: 'Astrología Electiva',
      description: 'Encuentra el mejor momento para iniciar proyectos',
      icon: Zap,
      color: 'from-amber-500 to-yellow-500',
      isPro: true,
      comingSoon: true
    }
  ];

  const handleSelect = (techniqueId: string, comingSoon?: boolean) => {
    if (comingSoon) {
      alert('Esta funcionalidad estará disponible próximamente');
      return;
    }
    setSelectedTechnique(techniqueId);
    onSelectTechnique(techniqueId);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            ← Volver
          </button>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Técnicas avanzadas
          </h1>
          <p className="text-xl text-slate-700">
            Explora análisis astrológicos especializados y predictivos
          </p>
        </div>

        {/* Techniques Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {techniques.map((technique) => {
            const Icon = technique.icon;
            
            return (
              <div
                key={technique.id}
                onClick={() => handleSelect(technique.id, technique.comingSoon)}
                className={`
                  relative group cursor-pointer
                  rounded-2xl
                  transform transition-all duration-300
                  hover:scale-105 hover:shadow-2xl
                  ${technique.comingSoon ? 'opacity-60' : ''}
                `}
              >
                {/* Coming Soon Badge */}
                {technique.comingSoon && (
                  <div className="absolute -top-3 -right-3 z-10 bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                    Próximamente
                  </div>
                )}

                {/* Pro Badge */}
                {technique.isPro && !technique.comingSoon && (
                  <div className="absolute -top-3 -left-3 z-10 bg-amber-500 text-slate-900 text-xs font-bold px-3 py-1 rounded-full">
                    PRO
                  </div>
                )}

                <div className="md-card rounded-2xl p-6 h-full flex flex-col">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 bg-blue-50 border border-blue-200 text-blue-700">
                    <Icon className="w-8 h-8" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">
                    {technique.name}
                  </h3>
                  <p className="text-slate-600 text-sm flex-grow">
                    {technique.description}
                  </p>

                  {/* CTA */}
                  <div className="mt-4 text-slate-600 text-sm group-hover:text-slate-900 transition-colors">
                    {technique.comingSoon ? 'Disponible pronto →' : 'Comenzar análisis →'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-16 md-card rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">¿Qué son las técnicas avanzadas?</h2>
          <div className="grid md:grid-cols-2 gap-8 text-slate-700">
            <div>
              <h3 className="text-slate-900 font-semibold mb-2">Análisis predictivo</h3>
              <p>
                Las técnicas avanzadas te permiten explorar cómo las energías cósmicas
                evolucionan en el tiempo, proporcionando insight sobre eventos futuros
                y ciclos vitales.
              </p>
            </div>
            <div>
              <h3 className="text-slate-900 font-semibold mb-2">Precisión profesional</h3>
              <p>
                Utilizamos algoritmos de Swiss Ephemeris y métodos tradicionales 
                validados por astrólogos profesionales para garantizar la máxima
                precisión en cada cálculo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedTechniques;

