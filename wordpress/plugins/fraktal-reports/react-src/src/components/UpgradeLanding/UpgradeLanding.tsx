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
  showFreeCta?: string;
  highlight?: string;
}

export const UpgradeLanding: React.FC<UpgradeLandingProps> = ({
  showFreeCta = 'true',
  highlight = 'revolucion_solar_2026'
}) => {
  const plans: PricingPlan[] = [
    {
      id: 'carta_natal_completa',
      name: 'CARTA NATAL PERSONAL',
      price: 49,
      description: 'Análisis completo y profundo de tu carta natal para conocer tu verdadera esencia.',
      features: [
        'Análisis exhaustivo de todos los planetas',
        'Casas astrológicas detalladas',
        'Aspectos planetarios con guías de integración',
        'Interpretación de nodos lunares',
        'Quirón y puntos sensibles',
        'Informe descargable en PDF de 30+ páginas',
        'Acceso ilimitado a tu informe'
      ],
      cta: 'COMPRAR AHORA'
    },
    {
      id: 'revolucion_solar_2026',
      name: 'PLANIFICACIÓN 2026 PERSONALIZADA',
      price: 79,
      description: 'Descubre las tendencias y oportunidades que te esperan en 2026 con tu Revolución Solar.',
      features: [
        'Revolución Solar para el año 2026',
        'Análisis de tránsitos importantes',
        'Predicciones mensuales personalizadas',
        'Fechas clave y oportunidades',
        'Áreas de crecimiento y desafíos',
        'Informe descargable en PDF de 40+ páginas',
        'Consulta de seguimiento incluida'
      ],
      cta: 'COMPRAR AHORA',
      recommended: true
    }
  ];

  const handlePlanClick = (planId: string) => {
    // Buscar el producto WooCommerce correspondiente
    const productSlug = planId.replace(/_/g, '-');
    window.location.href = `/shop/${productSlug}/`;
  };

  const handleFreeCTAClick = () => {
    window.location.href = '/informe-gratis/';
  };

  return (
    <div className="upgrade-landing">
      {/* Hero Section */}
      {showFreeCta === 'true' && (
        <section className="hero-section">
          <div className="hero-content">
            <h1>DESCUBRE TU ESENCIA CON<br />TU INFORME GRATUITO</h1>
            <p className="hero-description">
              Obtén un análisis personalizado de tu Sol, Luna y Ascendente completamente gratis.
              Descubre qué dicen los astros sobre tu personalidad y destino.
            </p>
            <button className="hero-cta-button" onClick={handleFreeCTAClick}>
              OBTÉN TU INFORME AHORA
            </button>
          </div>
        </section>
      )}

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="pricing-header">
          <h2>NUESTROS INFORMES PREMIUM</h2>
          <p className="pricing-subtitle">
            Profundiza en tu autoconocimiento con informes completos y detallados
          </p>
        </div>

        <div className="pricing-grid">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`pricing-card ${plan.recommended ? 'recommended' : ''} ${highlight === plan.id ? 'highlighted' : ''}`}
            >
              {plan.recommended && (
                <div className="recommended-badge">MÁS POPULAR</div>
              )}

              <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="currency">€</span>
                  <span className="amount">{plan.price}</span>
                </div>
                <p className="plan-description">{plan.description}</p>
              </div>

              <div className="plan-features">
                <ul>
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <svg className="check-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
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

      {/* Trust Section */}
      <section className="trust-section">
        <div className="trust-content">
          <h3>¿Por qué elegirnos?</h3>
          <div className="trust-features">
            <div className="trust-feature">
              <div className="trust-icon">⭐</div>
              <h4>Análisis Profesional</h4>
              <p>Informes elaborados por astrólogos certificados con años de experiencia</p>
            </div>
            <div className="trust-feature">
              <div className="trust-icon">🔒</div>
              <h4>100% Seguro</h4>
              <p>Tus datos están protegidos y nunca serán compartidos con terceros</p>
            </div>
            <div className="trust-feature">
              <div className="trust-icon">📱</div>
              <h4>Acceso Inmediato</h4>
              <p>Recibe tu informe en minutos y accede desde cualquier dispositivo</p>
            </div>
            <div className="trust-feature">
              <div className="trust-icon">💯</div>
              <h4>Satisfacción Garantizada</h4>
              <p>Si no estás satisfecho, te devolvemos tu dinero sin preguntas</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <h3>Preguntas Frecuentes</h3>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>¿Cuánto tarda en generarse mi informe?</h4>
            <p>Tu informe personalizado estará listo en 5-10 minutos después de completar tu pedido.</p>
          </div>
          <div className="faq-item">
            <h4>¿Puedo descargar mi informe?</h4>
            <p>Sí, todos nuestros informes están disponibles en formato PDF para descargar y guardar.</p>
          </div>
          <div className="faq-item">
            <h4>¿Necesito saber mi hora exacta de nacimiento?</h4>
            <p>Para un informe completo y preciso, sí. Si no la conoces, podemos trabajar con una aproximación.</p>
          </div>
          <div className="faq-item">
            <h4>¿Ofrecen consultas personalizadas?</h4>
            <p>Sí, el plan de Revolución Solar incluye una consulta de seguimiento con un astrólogo.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta-section">
        <div className="final-cta-content">
          <h2>Comienza Tu Viaje de Autoconocimiento Hoy</h2>
          <p>Miles de personas ya han descubierto su verdadero potencial con nuestros informes astrológicos</p>
          {showFreeCta === 'true' && (
            <button className="final-cta-button" onClick={handleFreeCTAClick}>
              PRUEBA GRATIS AHORA
            </button>
          )}
        </div>
      </section>
    </div>
  );
};