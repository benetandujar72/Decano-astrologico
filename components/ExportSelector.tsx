/**
 * Selector de formatos de exportación para informes astrológicos
 */
import React, { useState, useEffect } from 'react';
import { Download, FileText, Globe, FileCode } from 'lucide-react';

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

interface ExportSelectorProps {
  onExport: (format: string) => void;
  isLoading?: boolean;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  '🌐': <Globe size={24} />,
  '📄': <FileText size={24} />,
  '📝': <FileText size={24} />,
  '📋': <FileCode size={24} />,
};

const ExportSelector: React.FC<ExportSelectorProps> = ({ onExport, isLoading = false }) => {
  const [formats, setFormats] = useState<ExportFormat[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('web');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Cargar formatos disponibles desde el backend
    const fetchFormats = async () => {
      try {
        const token = localStorage.getItem('fraktal_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

        const response = await fetch(`${API_URL}/reports/formats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setFormats(data.formats || []);
          if (data.formats && data.formats.length > 0) {
            setSelectedFormat(data.formats[0].id);
          }
        } else {
          // Fallback a formatos por defecto
          setFormats([
            { id: 'web', name: 'Web / HTML', description: 'Página web con estilos', icon: '🌐', available: true },
            { id: 'pdf', name: 'PDF', description: 'Documento PDF', icon: '📄', available: true },
            { id: 'docx', name: 'Word', description: 'Documento editable', icon: '📝', available: true },
            { id: 'markdown', name: 'Markdown', description: 'Formato de texto', icon: '📋', available: true },
          ]);
        }
      } catch (error) {
        console.error('Error cargando formatos:', error);
        // Fallback
        setFormats([
          { id: 'web', name: 'Web / HTML', description: 'Página web con estilos', icon: '🌐', available: true },
          { id: 'pdf', name: 'PDF', description: 'Documento PDF', icon: '📄', available: true },
          { id: 'docx', name: 'Word', description: 'Documento editable', icon: '📝', available: true },
          { id: 'markdown', name: 'Markdown', description: 'Formato de texto', icon: '📋', available: true },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchFormats();
  }, []);

  const handleExport = () => {
    if (selectedFormat && !isLoading) {
      onExport(selectedFormat);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-400">
        Cargando formatos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-white mb-2">Seleccionar Formato de Exportación</h3>
        <p className="text-sm text-gray-400">Elige el formato para descargar tu informe completo</p>
      </div>

      {/* Grid de formatos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {formats.map((format) => (
          <button
            key={format.id}
            onClick={() => setSelectedFormat(format.id)}
            disabled={!format.available}
            className={`
              relative p-6 rounded-xl border-2 transition-all
              ${selectedFormat === format.id
                ? 'border-indigo-500 bg-indigo-500/10'
                : 'border-white/10 bg-slate-800/50 hover:border-indigo-500/50'
              }
              ${!format.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              group
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center
                ${selectedFormat === format.id
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-700 text-gray-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400'
                }
                transition-colors
              `}>
                {ICON_MAP[format.icon] || format.icon}
              </div>
              
              <div className="flex-1 text-left">
                <h4 className="text-white font-bold mb-1">{format.name}</h4>
                <p className="text-xs text-gray-400">{format.description}</p>
                {!format.available && (
                  <span className="text-xs text-red-400 mt-1 inline-block">No disponible</span>
                )}
              </div>

              {selectedFormat === format.id && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Botón de exportación */}
      <button
        onClick={handleExport}
        disabled={isLoading || !selectedFormat}
        className={`
          w-full py-4 px-6 rounded-xl font-bold text-white
          flex items-center justify-center gap-3
          transition-all
          ${isLoading || !selectedFormat
            ? 'bg-gray-600 cursor-not-allowed opacity-50'
            : 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25'
          }
        `}
      >
        <Download size={20} />
        {isLoading ? 'Generando...' : 'Descargar Informe'}
      </button>

      {/* Nota informativa */}
      <div className="text-center text-xs text-gray-500 pt-2">
        El informe incluirá: carta astral, datos personales, posiciones planetarias y análisis completo
      </div>
    </div>
  );
};

export default ExportSelector;

