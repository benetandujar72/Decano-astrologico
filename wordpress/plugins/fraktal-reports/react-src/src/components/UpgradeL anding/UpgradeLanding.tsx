/**
 * Landing Page de Upgrade - Mostrar después del informe gratuito
 * Diseño basado en la segunda imagen proporcionada
 */

import React from 'react';
import './UpgradeLanding.css';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  cta: string;
  recommended?: boolean;
}

interface UpgradeLandingProps {
  onPlanSelect?: (planId: string) => void;
}

export const UpgradeLanding: React.FC<UpgradeLandingProps> = ({ onPlanSelect }) => {

  const plans: PricingPlan[] = [
    {
      id: 'carta_natal_completa',
      name: 'CARTA NATAL PERSONAL',
      price: 49,
      description: 'Análisis completo y profundo de tu carta natal con todos los elementos astrológicos interpretados de manera personalizada.',
      features: [
        'Análisis exhaustivo de todos los planetas',
        'Casas astrológicas detalladas',
        'Aspectos planetarios con guías de integración',
        'Ejes nodales y propósito evolutivo',
        'Planetas transpersonales',
        'Formato PDF descargable',
        'Acceso ilimitado al informe'
      ],
      cta: 'COMPRAR AHORA'
    },
    {
      id: 'revolucion_solar_2026',
      name: 'PLANIFICACIÓN 2026 PERSONALIZADA',
      price: 79,
      description: 'Descubre las tendencias y oportunidades que te esperan en el próximo año según tu Revolución Solar. Planifica conscientemente tu año astrológico.',
      features: [
        'Revolución Solar para el año 2026',
        'Análisis de tránsitos importantes',
        'Períodos favorables y desafiantes',
        'Recomendaciones mes a mes',
        'Áreas de oportunidad y crecimiento',
        'Formato PDF descargable',
        'Consulta de seguimiento incluida'
      ],
      cta: 'COMPRAR AHORA',
      recommended: true
    }
  ];

  const handlePlanClick = (planId: string) => {
    if (onPlanSelect) {
      onPlanSelect(planId);
    } else {
      // Redirigir a página de checkout de WooCommerce
      window.location.href = `/checkout?add-to-cart=${planId}`;
    }
  };

  return (
    <div className="upgrade-landing">

      {/* Header con imagen mística */}
      <div className="upgrade-header">
        <div className="mystical-background-upgrade"></div>
        <div className="header-overlay-upgrade"></div>
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            DESCUBRE TU ESENCIA CON<br />
            TU INFORME GRATUITO
          </h1>

          <p className="hero-description">
            Has dado el primer paso en tu viaje de autoconocimiento.
            Ahora puedes profundizar aún más con nuestros informes completos,
            diseñados para ofrecerte claridad y guía en tu camino evolutivo.
          </p>

          <div className="hero-illustration">
            <div className="illustration-card">
              <div className="card-content">
                <div className="chart-mini"></div>
                <div className="graph-lines"></div>
              </div>
            </div>
          </div>

          <button
            className="hero-cta-button"
            onClick={() => window.scrollTo({ top: document.querySelector('.pricing-section')?.getBoundingClientRect().top || 0, behavior: 'smooth' })}
          >
            OBTEN TU INFORME AHORA
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <h2 className="pricing-title">NUESTROS INFORMES PREMIUM</h2>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}
            >
              {plan.recommended && (
                <div className="recommended-badge">MÁS POPULAR</div>
              )}

              <h3 className="plan-name">{plan.name}</h3>

              <p className="plan-description">{plan.description}</p>

              <div className="plan-features">
                <ul>
                  {plan.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div className="plan-price">
                <span className="price-amount">{plan.price}€</span>
              </div>

              <button
                className="plan-cta-button"
                onClick={() => handlePlanClick(plan.id)}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Beneficios adicionales */}
      <section className="benefits-section">
        <h2 className="benefits-title">¿Por Qué Elegir Nuestros Informes?</h2>

        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">🎯</div>
            <h3>Personalizado 100%</h3>
            <p>Cada informe es único y generado específicamente para ti basándose en tus datos natales exactos.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">📚</div>
            <h3>Profundidad y Claridad</h3>
            <p>Análisis extenso pero comprensible, escrito en lenguaje accesible sin perder rigor astrológico.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">🔄</div>
            <h3>Acceso Permanente</h3>
            <p>Una vez adquirido, puedes consultar tu informe cuantas veces necesites sin límite de tiempo.</p>
          </div>

          <div className="benefit-card">
            <div className="benefit-icon">💡</div>
            <h3>Herramienta de Crecimiento</h3>
            <p>Más que predicciones: una guía práctica para tu desarrollo personal y evolutivo.</p>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="final-cta-section">
        <h2>¿Listo para Conocerte a Profundidad?</h2>
        <p>Comienza tu viaje de autoconocimiento hoy mismo.</p>
        <button
          className="final-cta-button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          VER PLANES
        </button>
      </section>

    </div>
  );
};

export default UpgradeLanding;
