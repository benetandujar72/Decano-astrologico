import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ReportContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Componente profesional para renderizar contenido de informes astrológicos
 * con tipografía optimizada, espaciado y formato de lectura premium.
 *
 * UX/UI Features:
 * - Tipografía serif para lectura prolongada (Georgia, profesional)
 * - Line-height 1.8 para máxima legibilidad
 * - Espaciado generoso entre párrafos y secciones
 * - Listas con viñetas estilizadas y sangrado
 * - Énfasis visual para negritas y cursivas
 * - Color de texto suave para reducir fatiga visual
 * - Separadores horizontales elegantes
 */
const ReportContentRenderer: React.FC<ReportContentRendererProps> = ({ content, className = '' }) => {
  return (
    <div className={`report-content-professional ${className}`}>
      <ReactMarkdown
        components={{
          // Títulos principales (##)
          h2: ({ node, ...props }) => (
            <h2
              className="text-2xl font-bold text-slate-800 mt-8 mb-4 pb-2 border-b-2 border-indigo-200"
              {...props}
            />
          ),

          // Subtítulos (###)
          h3: ({ node, ...props }) => (
            <h3
              className="text-xl font-semibold text-slate-700 mt-6 mb-3"
              {...props}
            />
          ),

          // Subtítulos menores (####)
          h4: ({ node, ...props }) => (
            <h4
              className="text-lg font-medium text-slate-700 mt-4 mb-2"
              {...props}
            />
          ),

          // Párrafos con espaciado generoso
          p: ({ node, ...props }) => (
            <p
              className="text-base text-slate-700 leading-relaxed mb-4 text-justify"
              {...props}
            />
          ),

          // Listas con viñetas (ul)
          ul: ({ node, ...props }) => (
            <ul
              className="list-none space-y-2 mb-6 ml-4"
              {...props}
            />
          ),

          // Items de lista con viñetas personalizadas
          li: ({ node, ...props }) => (
            <li
              className="text-slate-700 leading-relaxed pl-6 relative before:content-['•'] before:absolute before:left-0 before:text-indigo-500 before:font-bold before:text-xl"
              {...props}
            />
          ),

          // Listas ordenadas
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal list-inside space-y-2 mb-6 ml-4"
              {...props}
            />
          ),

          // Negritas (énfasis fuerte)
          strong: ({ node, ...props }) => (
            <strong
              className="font-bold text-slate-900"
              {...props}
            />
          ),

          // Cursivas (énfasis suave)
          em: ({ node, ...props }) => (
            <em
              className="italic text-slate-600"
              {...props}
            />
          ),

          // Separadores horizontales
          hr: ({ node, ...props }) => (
            <hr
              className="my-8 border-0 h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent"
              {...props}
            />
          ),

          // Citas (blockquote)
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-indigo-400 pl-4 py-2 my-6 italic text-slate-600 bg-indigo-50 rounded-r"
              {...props}
            />
          ),

          // Código inline
          code: ({ node, inline, ...props }: any) =>
            inline ? (
              <code
                className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono"
                {...props}
              />
            ) : (
              <code
                className="block bg-slate-100 text-slate-800 p-4 rounded my-4 text-sm font-mono overflow-x-auto"
                {...props}
              />
            ),
        }}
      >
        {content}
      </ReactMarkdown>

      <style jsx global>{`
        .report-content-professional {
          font-family: 'Georgia', 'Times New Roman', serif;
          font-size: 16px;
          line-height: 1.8;
          color: #334155;
          max-width: 100%;
        }

        /* Mejorar tipografía en pantallas grandes */
        @media (min-width: 768px) {
          .report-content-professional {
            font-size: 17px;
            line-height: 1.9;
          }
        }

        /* Optimizar para impresión */
        @media print {
          .report-content-professional {
            font-size: 12pt;
            line-height: 1.6;
            color: #000;
          }
        }

        /* Mejorar legibilidad de listas anidadas */
        .report-content-professional ul ul,
        .report-content-professional ol ul,
        .report-content-professional ul ol,
        .report-content-professional ol ol {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          margin-left: 1.5rem;
        }

        /* Sangrías para párrafos (opcional - estilo académico) */
        .report-content-professional p + p {
          text-indent: 0; /* Cambiar a 2em si quieres sangría académica */
        }
      `}</style>
    </div>
  );
};

export default ReportContentRenderer;
