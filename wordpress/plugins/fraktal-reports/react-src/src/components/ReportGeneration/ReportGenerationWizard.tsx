/**
 * Wizard para generación de informes paso a paso (WordPress Version)
 * Adaptado para usar WordPress AJAX API en lugar de fetch directo
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  X, CheckCircle, Loader2, AlertCircle,
  FileText, Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';
import { wpApi } from '@/services/wpApi';

interface ReportGenerationWizardProps {
  cartaData: any;
  nombre: string;
  reportType?: string;
  profiles?: any[];
  onComplete?: (sessionId: string) => void;
  onClose: () => void;
}

interface ReportStatus {
  session_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'stalled';
  progress?: number;
  current_module?: string;
  error_message?: string;
}

const ReportGenerationWizard: React.FC<ReportGenerationWizardProps> = ({
  cartaData,
  nombre,
  reportType = 'carta_natal_completa',
  profiles,
  onComplete,
  onClose
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ReportStatus | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStalled, setIsStalled] = useState(false);

  const pollIntervalRef = useRef<number | null>(null);
  const stallCheckRef = useRef<number>(0);

  // Inicializar sesión y comenzar generación
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setIsGenerating(true);

        // Iniciar generación del informe
        const result = await wpApi.startReport({
          carta_data: cartaData,
          nombre: nombre,
          report_type: reportType,
          profiles: profiles
        });

        if (mounted) {
          setSessionId(result.session_id);
          startPolling(result.session_id);
        }
      } catch (err: any) {
        if (mounted) {
          console.error('[WIZARD] Error iniciando generación:', err);
          setError(err.message || 'Error al iniciar la generación del informe');
          setIsGenerating(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const startPolling = (sid: string) => {
    // Polling cada 5 segundos
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const statusData = await wpApi.getReportStatus(sid);
        setStatus(statusData);

        // Detectar estancamiento
        if (statusData.status === 'processing') {
          stallCheckRef.current += 1;
          if (stallCheckRef.current > 24) { // 2 minutos sin cambios
            setIsStalled(true);
          }
        } else {
          stallCheckRef.current = 0;
          setIsStalled(false);
        }

        // Verificar si terminó
        if (statusData.status === 'completed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setIsGenerating(false);

          if (onComplete) {
            onComplete(sid);
          }
        } else if (statusData.status === 'failed') {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
          setIsGenerating(false);
          setError(statusData.error_message || 'Error generando el informe');
        }
      } catch (err: any) {
        console.error('[WIZARD] Error en polling:', err);
      }
    }, 5000);
  };

  const handleResume = async () => {
    if (!sessionId) return;

    try {
      setError(null);
      setIsStalled(false);
      stallCheckRef.current = 0;

      await wpApi.resumeReport(sessionId);

      // Reiniciar polling si se detuvo
      if (!pollIntervalRef.current) {
        startPolling(sessionId);
      }
    } catch (err: any) {
      setError(err.message || 'Error al reanudar la generación');
    }
  };

  const handleDownload = () => {
    if (sessionId) {
      window.location.href = wpApi.getDownloadUrl(sessionId);
    }
  };

  const progress = status?.progress || 0;
  const isCompleted = status?.status === 'completed';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-indigo-600" />
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Generación de informe</h2>
              <p className="text-slate-600 text-sm">{nombre}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 transition-colors"
            disabled={isGenerating && !isCompleted}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Barra de progreso */}
          {isGenerating && !isCompleted && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-700">Progreso</span>
                <span className="text-sm text-slate-700">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {status?.current_module && (
                <p className="text-sm text-slate-600 mt-2">
                  Módulo actual: <span className="font-semibold text-indigo-600">{status.current_module}</span>
                </p>
              )}
            </div>
          )}

          {/* Estados */}
          {isGenerating && !isCompleted && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
              <p className="text-slate-700 font-semibold text-lg">Generando informe...</p>
              <p className="text-slate-600 text-sm mt-2">
                Este proceso puede tardar varios minutos
              </p>
            </div>
          )}

          {isCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <span className="font-semibold text-green-900">Informe completado</span>
              </div>
              <p className="text-sm text-green-800 mb-4">
                Tu informe se ha generado correctamente y está listo para descargar.
              </p>
              <button
                onClick={handleDownload}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Descargar PDF
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-semibold text-red-900">Error</span>
              </div>
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {isStalled && isGenerating && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-amber-600" />
                <span className="font-semibold text-amber-900">Progreso pausado</span>
              </div>
              <p className="text-sm text-amber-800 mb-4">
                No se ha detectado actividad reciente. Puedes intentar reanudar la generación.
              </p>
              <button
                onClick={handleResume}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reanudar generación
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportGenerationWizard;
