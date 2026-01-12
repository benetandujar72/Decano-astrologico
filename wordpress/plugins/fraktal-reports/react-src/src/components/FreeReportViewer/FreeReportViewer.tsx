/**
 * Componente para visualizar el informe gratuito "gancho"
 * Diseño basado en las imágenes proporcionadas
 */

import React from 'react';
import './FreeReportViewer.css';

interface ReportModule {
  id: string;
  title: string;
  content: string;
}

interface FreeReportData {
  chart_data: {
    name: string;
    birth_date: string;
    birth_time: string;
    birth_place: string;
    latitude: number;
    longitude: number;
  };
  modules: ReportModule[];
  chart_image_url?: string;
}

interface FreeReportViewerProps {
  reportData: FreeReportData;
  onUpgradeClick?: () => void;
}

export const FreeReportViewer: React.FC<FreeReportViewerProps> = ({
  reportData,
  onUpgradeClick
}) => {
  const { chart_data, modules, chart_image_url } = reportData;

  // Módulos organizados
  const solModule = modules.find(m => m.id.includes('sol'));
  const lunaModule = modules.find(m => m.id.includes('luna'));
  const ascendenteModule = modules.find(m => m.id.includes('ascendente'));

  return (
    <div className="free-report-viewer">
      {/* Header con imagen mística */}
      <div className="report-header">
        <div className="mystical-background"></div>
        <div className="header-overlay"></div>
      </div>

      {/* Contenedor principal */}
      <div className="report-container">

        {/* Sección: Tu Informe de Carta Natal */}
        <section className="report-intro-section">
          <div className="intro-grid">
            <div className="chart-image-container">
              {chart_image_url ? (
                <img
                  src={chart_image_url}
                  alt="Carta Natal"
                  className="chart-image"
                />
              ) : (
                <div className="chart-placeholder">
                  <div className="chart-circle">
                    <div className="chart-inner-circle"></div>
                    <div className="chart-aspects"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="intro-content">
              <h1 className="report-main-title">Tu Informe de Carta Natal</h1>

              <div className="birth-data">
                <p><strong>Nombre:</strong> {chart_data.name}</p>
                <p><strong>Fecha:</strong> {chart_data.birth_date}</p>
                <p><strong>Hora:</strong> {chart_data.birth_time}</p>
                <p><strong>Lugar:</strong> {chart_data.birth_place}</p>
              </div>

              <h2 className="section-subtitle">Análisis</h2>
              <p className="intro-text">
                Este informe te ofrece una visión inicial de tu carta natal,
                explorando los elementos fundamentales que configuran tu personalidad
                y tu camino de vida. Descubre las energías que te definen y cómo
                puedes trabajar con ellas de manera consciente.
              </p>
            </div>
          </div>
        </section>

        {/* Módulo: Identidad Solar (Sol) */}
        {solModule && (
          <section className="report-module solar-module">
            <h2 className="module-title">{solModule.title || 'Identidad Solar'}</h2>
            <div
              className="module-content"
              dangerouslySetInnerHTML={{ __html: formatModuleContent(solModule.content) }}
            />
          </section>
        )}

        {/* Módulo: Naturaleza Emocional (Luna) */}
        {lunaModule && (
          <section className="report-module lunar-module">
            <h2 className="module-title">{lunaModule.title || 'Naturaleza Emocional'}</h2>
            <div
              className="module-content"
              dangerouslySetInnerHTML={{ __html: formatModuleContent(lunaModule.content) }}
            />
          </section>
        )}

        {/* Módulo: Ascendente */}
        {ascendenteModule && (
          <section className="report-module ascendente-module">
            <h2 className="module-title">{ascendenteModule.title || 'Tu Ascendente'}</h2>
            <div
              className="module-content"
              dangerouslySetInnerHTML={{ __html: formatModuleContent(ascendenteModule.content) }}
            />
          </section>
        )}

        {/* Sección: Aspectos Planetarios (Resumen) */}
        <section className="report-summary-section aspects-summary">
          <h2 className="summary-title">Aspectos Planetarios</h2>
          <p className="summary-intro">
            Los aspectos entre tus planetas revelan las dinámicas internas de tu psique.
            Estas conexiones muestran cómo diferentes partes de tu ser dialogan entre sí.
          </p>

          <div className="aspects-icons">
            <span className="aspect-icon" title="Conjunción">☌</span>
            <span className="aspect-icon" title="Trígono">△</span>
            <span className="aspect-icon" title="Cuadratura">□</span>
            <span className="aspect-icon" title="Oposición">☍</span>
          </div>

          <div className="upgrade-note">
            <p>
              <strong>En el informe completo</strong> descubrirás el análisis detallado
              de todos tus aspectos planetarios y cómo integrarlos conscientemente.
            </p>
          </div>
        </section>

        {/* Sección: Casas Astrológicas (Resumen) */}
        <section className="report-summary-section houses-summary">
          <h2 className="summary-title">Casas Astrológicas</h2>

          <div className="houses-grid">
            <div className="house-item">
              <p>
                Las casas representan las áreas de tu vida donde se desarrollan
                las experiencias y el crecimiento personal.
              </p>
            </div>
            <div className="house-item">
              <p>
                Cada casa activada por planetas muestra temas importantes en tu
                desarrollo y áreas donde concentras tu energía.
              </p>
            </div>
          </div>

          <div className="upgrade-note">
            <p>
              <strong>En el informe completo</strong> explorarás casa por casa,
              entendiendo qué áreas de tu vida requieren mayor atención.
            </p>
          </div>
        </section>

        {/* Sección: Resumen y Próximos Pasos */}
        <section className="report-conclusion">
          <h2 className="conclusion-title">Resumen y Próximos Pasos</h2>

          <p className="conclusion-text">
            Este informe te ha ofrecido una primera mirada a tu carta natal,
            revelando aspectos fundamentales de tu identidad, emocionalidad y forma
            de presentarte al mundo.
          </p>

          <p className="conclusion-text">
            Para profundizar en tu autoconocimiento, el <strong>Informe Completo</strong> incluye:
          </p>

          <ul className="benefits-list">
            <li>Análisis exhaustivo de todos tus planetas y casas</li>
            <li>Aspectos planetarios detallados con guías de integración</li>
            <li>Ejes nodales y propósito evolutivo</li>
            <li>Planetas transpersonales y tu conexión con lo colectivo</li>
            <li>Recomendaciones personalizadas para tu crecimiento</li>
          </ul>

          <button
            className="cta-button"
            onClick={onUpgradeClick}
          >
            DESCARGAR INFORME COMPLETO
          </button>
        </section>

      </div>

      {/* Footer decorativo */}
      <div className="report-footer">
        <p className="footer-text">
          Informe generado por <strong>MyFraktal</strong> - Astrología Evolutiva
        </p>
      </div>
    </div>
  );
};

/**
 * Formatea el contenido del módulo para mejor visualización
 */
function formatModuleContent(content: string): string {
  // Convertir markdown básico a HTML
  let formatted = content;

  // Subtítulos con **
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<h3 class="content-subtitle">$1</h3>');

  // Saltos de línea dobles = párrafos
  formatted = formatted.split('\n\n').map(p => `<p>${p.trim()}</p>`).join('');

  // Pregunta para reflexionar (suele estar al final)
  formatted = formatted.replace(
    /Pregunta para reflexionar:(.*?)$/s,
    '<div class="reflection-box"><strong>Pregunta para reflexionar:</strong>$1</div>'
  );

  return formatted;
}

export default FreeReportViewer;
