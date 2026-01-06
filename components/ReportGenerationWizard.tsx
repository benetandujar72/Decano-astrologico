/**
 * Wizard para generación de informes paso a paso
 * Genera cada módulo con confirmación del usuario antes de continuar
 */
import React, { useState, useEffect, useRef } from 'react';
import { 
  X, CheckCircle, Loader2, AlertCircle, 
  FileText, Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';

interface ReportGenerationWizardProps {
  cartaData: any;
  nombre: string;
  reportType?: string;
  profiles?: any[];
  onComplete: (fullReport: string) => void;
  onClose: () => void;
  onSessionComplete?: (sessionId: string) => void; // Para flujo automático (cerrar wizard y delegar descarga)
  autoGenerateAll?: boolean; // Nueva opción para generar todos automáticamente
}

interface Module {
  id: string;
  title: string;
  expected_min_chars: number;
}

interface GenerationStatus {
  session_id: string;
  status: string;
  error?: string | null;
  current_module_index: number;
  current_module_id?: string | null;
  current_module_title?: string | null;
  total_modules: number;
  modules: Array<{
    id: string;
    title: string;
    is_generated: boolean;
    length: number;
  }>;
  has_full_report: boolean;
  batch_job?: {
    job_id?: string | null;
    status?: string | null;
    error?: string | null;
    updated_at?: string | null;
  } | null;
  module_runs_summary?: Record<string, {
    status?: string | null;
    error?: string | null;
    updated_at?: string | null;
    last_step?: string | null;
  }>;
}

const ReportGenerationWizard: React.FC<ReportGenerationWizardProps> = ({
  cartaData,
  nombre,
  reportType = 'individual',
  profiles,
  onComplete,
  onClose,
  onSessionComplete,
  autoGenerateAll = false
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentModuleContent, setCurrentModuleContent] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<GenerationStatus | null>(null);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [generatedModulesCount, setGeneratedModulesCount] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadedPdf, setDownloadedPdf] = useState(false);

  const remainingRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const lastEventRef = useRef<{ moduleId?: string | null; step?: string | null }>({ moduleId: null, step: null });
  
  // Estimación de tiempo por módulo (en segundos)
  const TIME_ESTIMATES: Record<string, number> = {
    'modulo_1': 300, // 5 minutos
    'modulo_2_fundamentos': 240, // 4 minutos
    'modulo_2_personales': 240, // 4 minutos
    'modulo_2_sociales': 240, // 4 minutos
    'modulo_2_transpersonales': 300, // 5 minutos
    'modulo_2_nodos': 180, // 3 minutos
    'modulo_2_aspectos': 240, // 4 minutos
    'modulo_2_ejes': 480, // 8 minutos (el más complejo)
    'modulo_2_sintesis': 240, // 4 minutos
    'modulo_3_recomendaciones': 240, // 4 minutos
  };

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  // Función para obtener el token dinámicamente (por si expira durante la generación)
  const getToken = () => {
    const token = localStorage.getItem('fraktal_token');
    if (!token) {
      throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.');
    }
    return token;
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Inicializar sesión al montar
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      try {
        await initializeSession();
      } catch (err) {
        if (mounted) {
          console.error('[WIZARD] Error en inicialización:', err);
        }
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const initializeSession = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      // Modo "un clic": encolar generación completa en backend (batch job)
      const url = autoGenerateAll ? `${API_URL}/reports/queue-full-report` : `${API_URL}/reports/start-generation`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          carta_data: cartaData,
          nombre: nombre,
          report_mode: "full",
          report_type: reportType,
          profiles: Array.isArray(profiles) && profiles.length > 0 ? profiles : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error iniciando generación');
      }

      const data = await response.json();
      
      if (!data.session_id) {
        throw new Error('No se recibió session_id del servidor');
      }
      
      console.log('[WIZARD] Sesión inicializada:', data.session_id);
      
      // Actualizar estado
      setSessionId(data.session_id);
      setModules(data.modules || []);
      setCurrentModuleIndex(0);
      
      // Generar automáticamente el primer módulo usando el sessionId directamente
      if (data.session_id && data.modules && data.modules.length > 0) {
        if (autoGenerateAll) {
          // Modo "un clic": el backend genera todo en background; aquí solo hacemos polling y al final descargamos
          await startAutoGenerationPolling(data.session_id, data.modules);
        } else {
          // Modo paso a paso: generar solo el primero
          await generateModuleWithSession(data.session_id, data.modules[0].id);
        }
      }
    } catch (err: any) {
      console.error('Error inicializando sesión:', err);
      setError(err.message || 'Error iniciando generación de informe');
    } finally {
      setIsLoading(false);
    }
  };

  const pollModuleUntilDone = async (sessionIdToUse: string, moduleId: string) => {
    const start = Date.now();
    const maxWaitMs = 60 * 45 * 1000; // 45 minutos por módulo como polling (aumentado de 30 para dar más margen al job de 40 min)

    while (true) {
      if (Date.now() - start > maxWaitMs) {
        throw new Error('Tiempo de espera agotado consultando el estado del módulo. Vuelve a intentarlo.');
      }

      const token = getToken();
      const response = await fetch(`${API_URL}/reports/module-status/${sessionIdToUse}/${moduleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Si es un error 401, el token expiró
        if (response.status === 401) {
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente y vuelve a intentar.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Error consultando estado: HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'done') {
        return data;
      }

      if (data.status === 'error') {
        const errorMsg = data.error || 'Error generando el módulo en el servidor';
        // Si es un timeout, permitir reintento con mensaje más claro
        if (errorMsg.includes('Timeout') || errorMsg.includes('timeout')) {
          throw new Error(`${errorMsg} Puedes intentar regenerar este módulo.`);
        }
        throw new Error(errorMsg);
      }

      await sleep(2500);
    }
  };

  const generateModuleWithSession = async (sessionIdToUse: string, moduleId: string) => {
    setIsGenerating(true);
    setError(null);
    setCurrentModuleContent('');

    try {
      console.log(`[WIZARD] Encolando módulo: ${moduleId} con sesión: ${sessionIdToUse}`);

      // Encolar job (respuesta rápida, sin Pending infinito)
      const token = getToken();
      const queueResponse = await fetch(`${API_URL}/reports/queue-module`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionIdToUse,
          module_id: moduleId
        })
      });

      if (!queueResponse.ok) {
        // Si es un error 401, el token expiró
        if (queueResponse.status === 401) {
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente y vuelve a intentar.');
        }
        const errorData = await queueResponse.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Error encolando módulo: HTTP ${queueResponse.status}`;
        throw new Error(errorMessage);
      }

      // Polling hasta que el job termine
      console.log(`[WIZARD] Polling estado del módulo: ${moduleId}`);
      const result = await pollModuleUntilDone(sessionIdToUse, moduleId);

      if (!result.content || String(result.content).trim().length === 0) {
        throw new Error('El módulo se generó pero está vacío. Por favor regenera.');
      }

      setCurrentModuleContent(result.content);
      
      // Actualizar estado
      await refreshStatus();
      
    } catch (err: any) {
      console.error('[WIZARD] Error generando módulo:', err);
      
      let errorMessage = 'Error generando módulo';
      if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // Si el error es de autenticación, detener la generación automática
      if (errorMessage.includes('sesión ha expirado') || errorMessage.includes('No estás autenticado')) {
        setIsAutoGenerating(false);
        // Opcional: cerrar el wizard después de un delay para que el usuario vea el mensaje
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 5000);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const generateModule = async (moduleId: string) => {
    // Obtener sessionId del estado actual
    const currentSessionId = sessionId;
    if (!currentSessionId) {
      console.error('[WIZARD] No hay sessionId disponible en el estado');
      setError('No hay sesión activa. Por favor, cierra y vuelve a abrir el wizard.');
      return;
    }
    
    await generateModuleWithSession(currentSessionId, moduleId);
  };

  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
  };

  const refreshStatus = async (sid?: string) => {
    const sidToUse = sid || sessionId;
    if (!sidToUse) return;
    
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/reports/generation-status/${sidToUse}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setCurrentModuleIndex(data.current_module_index);

        // Eventos UX: cambio de módulo / paso
        const moduleId = data.current_module_id || null;
        const step = (data.module_runs_summary && moduleId && data.module_runs_summary[moduleId]?.last_step) ? data.module_runs_summary[moduleId]?.last_step : null;
        const prev = lastEventRef.current;
        if (moduleId && moduleId !== prev.moduleId) {
          const title = data.current_module_title || moduleId;
          setEvents((prevEvents) => [`Cambio de módulo: ${title}`, ...prevEvents].slice(0, 12));
          lastEventRef.current = { moduleId, step: null };
        }
        if (step && step !== prev.step) {
          setEvents((prevEvents) => [`Paso: ${step}`, ...prevEvents].slice(0, 12));
          lastEventRef.current = { moduleId, step };
        }

        // Progreso: contar módulos generados
        if (Array.isArray(data.modules)) {
          const generated = data.modules.filter((m: any) => m && m.is_generated).length;
          setGeneratedModulesCount(generated);
        }
      } else if (response.status === 401) {
        // Token expirado, no hacer nada para evitar loops
        console.warn('[WIZARD] Token expirado al refrescar estado');
      }
    } catch (err: any) {
      // Ignorar errores de token expirado en refreshStatus
      if (!err.message?.includes('No estás autenticado')) {
        console.error('Error refrescando estado:', err);
      }
    }
  };

  const downloadPdf = async (sid?: string) => {
    const sidToUse = sid || sessionId;
    if (!sidToUse) return;

    setIsDownloadingPdf(true);
    setError(null);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/reports/download-pdf/${sidToUse}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Error descargando PDF: HTTP ${response.status}`);
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `informe_${sidToUse}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setDownloadedPdf(true);
    } catch (err: any) {
      console.error('[WIZARD] Error descargando PDF:', err);
      setError(err.message || 'Error descargando PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const startAutoGenerationPolling = async (sessionIdToUse: string, modulesList: Module[]) => {
    setIsAutoGenerating(true);
    setError(null);
    setGeneratedModulesCount(0);
    setDownloadedPdf(false);
    setEvents([]);
    // asegurar que refreshStatus tenga sessionId aunque el state tarde en asentarse
    setSessionId(sessionIdToUse);

    // Calcular tiempo total estimado (solo UX)
    const totalEstimatedTime = modulesList.reduce((total, module) => {
      return total + (TIME_ESTIMATES[module.id] || 240);
    }, 0);
    remainingRef.current = totalEstimatedTime;
    setEstimatedTimeRemaining(totalEstimatedTime);

    // Timer estable
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setInterval(() => {
      remainingRef.current = Math.max(0, remainingRef.current - 1);
      setEstimatedTimeRemaining(remainingRef.current);
    }, 1000);

    // Poll de estado hasta completion/error
    const start = Date.now();
    const maxWaitMs = 60 * 180 * 1000; // 3h defensivo para batch completo

    try {
      while (true) {
        if (Date.now() - start > maxWaitMs) {
          throw new Error('Tiempo de espera agotado generando el informe completo. Inténtalo de nuevo.');
        }

        // refrescar estado
        await refreshStatus(sessionIdToUse);

        // leer status actual desde storage local (puede ir con un tick de retraso)
        // hacemos una consulta directa para decisión (evita depender de state async)
        const token = getToken();
        const res = await fetch(`${API_URL}/reports/generation-status/${sessionIdToUse}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente y vuelve a intentar.');
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Error consultando estado: HTTP ${res.status}`);
        }
        const data = await res.json();

        if (data.status === 'error') {
          const msg = data.error || data?.batch_job?.error || 'Error generando el informe en el servidor. Revisa el panel y reintenta.';
          throw new Error(msg);
        }

        if (data.status === 'completed' || data.has_full_report) {
          // Terminado: cerrar wizard y delegar al contenedor (App) el enlace de descarga / navegación
          setIsAutoGenerating(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Refrescar estado final y notificar
          await refreshStatus(sessionIdToUse);
          try {
            onSessionComplete?.(sessionIdToUse);
          } catch (e) {
            console.warn('[WIZARD] onSessionComplete falló:', e);
          }
          onClose();
          return;
        }

        await sleep(3000);
      }
    } catch (err: any) {
      console.error('[WIZARD] Error en auto-generación:', err);
      setError(err.message || 'Error generando el informe completo');
      setIsAutoGenerating(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const getFullReport = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/reports/generation-full-report/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Error obteniendo informe completo');
      }

      const data = await response.json();
      
      if (data.full_report) {
        onComplete(data.full_report);
      } else {
        setError('El informe completo aún no está disponible. Asegúrate de haber generado todos los módulos.');
      }
    } catch (err: any) {
      console.error('Error obteniendo informe completo:', err);
      setError(err.message || 'Error obteniendo informe completo');
    } finally {
      setIsLoading(false);
    }
  };

  const generateAllModulesAutomatically = async (sessionIdToUse: string, modulesList: Module[]) => {
    setIsAutoGenerating(true);
    setError(null);
    setGeneratedModulesCount(0);
    
    // Calcular tiempo total estimado
    const totalEstimatedTime = modulesList.reduce((total, module) => {
      return total + (TIME_ESTIMATES[module.id] || 240); // Default 4 minutos
    }, 0);
    remainingRef.current = totalEstimatedTime;
    setEstimatedTimeRemaining(totalEstimatedTime);

    // Timer estable (sin closure sobre state)
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setInterval(() => {
      remainingRef.current = Math.max(0, remainingRef.current - 1);
      setEstimatedTimeRemaining(remainingRef.current);
    }, 1000);
    
    try {
      for (let i = 0; i < modulesList.length; i++) {
        const module = modulesList[i];
        setCurrentModuleIndex(i);
        setCurrentModuleContent('');
        
        // Calcular tiempo restante basado en módulos pendientes
        const remaining = modulesList.slice(i).reduce((total, m) => {
          return total + (TIME_ESTIMATES[m.id] || 240);
        }, 0);
        remainingRef.current = remaining;
        setEstimatedTimeRemaining(remainingRef.current);
        
        console.log(`[WIZARD] Generando módulo ${i + 1}/${modulesList.length}: ${module.id}`);
        console.log(`[WIZARD] Tiempo estimado para este módulo: ${TIME_ESTIMATES[module.id] || 240}s`);
        
        // Generar módulo
        await generateModuleWithSession(sessionIdToUse, module.id);
        
        setGeneratedModulesCount(i + 1);

        // Recalcular remaining en base a módulos pendientes (evita drift)
        const remainingAfter = modulesList.slice(i + 1).reduce((total, m) => {
          return total + (TIME_ESTIMATES[m.id] || 240);
        }, 0);
        remainingRef.current = remainingAfter;
        setEstimatedTimeRemaining(remainingRef.current);
        
        // Pequeño delay entre módulos para no saturar
        if (i < modulesList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Todos los módulos generados, obtener informe completo
      await getFullReport();
      
    } catch (err: any) {
      console.error('[WIZARD] Error en generación automática:', err);
      setError(err.message || 'Error generando módulos automáticamente');
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } finally {
      setIsAutoGenerating(false);
      setEstimatedTimeRemaining(null);
    }
  };

  const handleNext = async () => {
    if (currentModuleIndex < modules.length - 1) {
      // Avanzar al siguiente módulo y generarlo automáticamente
      const nextIndex = currentModuleIndex + 1;
      setCurrentModuleIndex(nextIndex);
      setCurrentModuleContent(''); // Limpiar contenido anterior
      setError(null); // Limpiar errores
      
      // Actualizar tiempo estimado restante
      const remaining = modules.slice(nextIndex).reduce((total, m) => {
        return total + (TIME_ESTIMATES[m.id] || 240);
      }, 0);
      setEstimatedTimeRemaining(remaining);
      
      // Generar automáticamente el siguiente módulo
      const nextModule = modules[nextIndex];
      await generateModule(nextModule.id);
    } else {
      // Es el último módulo, obtener informe completo
      await getFullReport();
    }
  };

  const handleRegenerate = async () => {
    if (currentModuleIndex < modules.length) {
      const currentModule = modules[currentModuleIndex];
      await generateModule(currentModule.id);
    }
  };

  const currentModule = modules[currentModuleIndex];
  const isLastModule = currentModuleIndex === modules.length - 1;
  const isCompleted = !!(status && (status.status === 'completed' || status.has_full_report || status.batch_job?.status === 'done'));
  const activeIndex = typeof status?.current_module_index === 'number' ? status.current_module_index : currentModuleIndex;
  const progress = modules.length > 0 ? (Math.min(generatedModulesCount, modules.length) / modules.length) * 100 : 0;

  return (
    <div className="fixed inset-0 md-backdrop flex items-center justify-center z-50 p-4">
      <div className="md-modal w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-slate-700" />
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Generación de informe exhaustivo</h2>
              <p className="text-slate-600 text-sm">
                Router: <span className="font-semibold text-slate-800">{String(reportType || 'individual')}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 transition-colors"
            title="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Barra + Botones de módulos (simplificado) */}
        <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-700">
              {isCompleted
                ? 'Informe completo'
                : `Progreso: ${generatedModulesCount} de ${modules.length} módulos`
              }
            </span>
            <div className="flex items-center gap-3">
              {estimatedTimeRemaining !== null && (
                <span className="text-sm text-blue-700 font-semibold">
                  ⏱️ {formatTimeRemaining(estimatedTimeRemaining)}
                </span>
              )}
              <span className="text-sm text-slate-700">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-3 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Botonera de módulos */}
          <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
            {modules.map((module, idx) => {
              const isGenerated = status?.modules.find(m => m.id === module.id)?.is_generated || false;
              const isCurrent = idx === activeIndex;

              const base = 'px-3 py-2 rounded-lg text-xs font-semibold transition-all border';
              const cls = isCurrent
                ? `${base} bg-blue-600 text-white border-blue-200 shadow-sm`
                : isGenerated
                ? `${base} bg-slate-50 text-slate-800 border-slate-200 opacity-70 cursor-not-allowed`
                : `${base} bg-slate-100 text-slate-600 border-slate-200`;

              return (
                <button
                  key={module.id}
                  type="button"
                  className={cls}
                  disabled={true}
                  title={module.title}
                >
                  {idx + 1}. {module.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* (Opcional) Eventos: mantenemos pero más discreto */}
          {!!events.length && (
            <div className="md-card md-card--flat rounded-lg p-3 mb-4">
              <div className="text-[11px] text-slate-600 mb-2">Eventos</div>
              <ul className="text-[11px] text-slate-600 space-y-1">
                {events.slice(0, 6).map((e, i) => (
                  <li key={i}>- {e}</li>
                ))}
              </ul>
            </div>
          )}

          {isCompleted && (
            <div className="md-alert md-alert--success mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-semibold">Informe completo generado</span>
              </div>
              <p className="mt-2 text-sm">
                Ya puedes descargar el PDF final o abrir el exportador.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => downloadPdf()}
                  disabled={isDownloadingPdf}
                  className="md-button px-6 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-60"
                >
                  {isDownloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                  Descargar PDF
                </button>
                <button
                  onClick={async () => { await getFullReport(); }}
                  className="md-button md-button--secondary px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  Abrir exportador
                  <ArrowRight className="w-4 h-4" />
                </button>
                {downloadedPdf && (
                  <span className="text-xs text-green-800 self-center">PDF descargado.</span>
                )}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-blue-700 animate-spin mb-4" />
              <p className="text-slate-600">Inicializando generación...</p>
            </div>
          )}

          {error && (
            <div className="md-alert md-alert--error mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Error</span>
              </div>
              <p className="mt-2">{error}</p>
            </div>
          )}

          {currentModule && (
            <>
              <div className="mb-4">
                <h3 className="text-xl font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-700" />
                  {currentModule.title}
                </h3>
                <p className="text-slate-600 text-sm">
                  Extensión mínima esperada: {currentModule.expected_min_chars.toLocaleString()} caracteres
                </p>
              </div>

              {(isGenerating || isAutoGenerating) && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-blue-700 animate-spin mb-4" />
                  <p className="text-slate-700 font-semibold text-lg">
                    {isAutoGenerating 
                      ? `Generando módulo ${generatedModulesCount + 1} de ${modules.length}...`
                      : 'Generando módulo...'
                    }
                  </p>
                  {!!status?.current_module_title && (
                    <p className="text-slate-600 text-sm mt-2">
                      Módulo actual: <span className="text-blue-700 font-semibold">{status.current_module_title}</span>
                    </p>
                  )}
                  {!!status?.current_module_id && !!status?.module_runs_summary?.[status.current_module_id]?.last_step && (
                    <p className="text-slate-600 text-xs mt-2">
                      Paso: {status.module_runs_summary[status.current_module_id]?.last_step}
                    </p>
                  )}
                  <p className="text-slate-600 text-sm mt-2">
                    {isAutoGenerating 
                      ? `Proceso automático en curso. Todos los módulos se generarán secuencialmente.`
                      : 'Esto puede tardar varios minutos'
                    }
                  </p>
                  {estimatedTimeRemaining !== null && (
                    <p className="text-blue-700 font-semibold mt-3">⏱️ Tiempo estimado restante: {formatTimeRemaining(estimatedTimeRemaining)}</p>
                  )}
                  <p className="text-slate-600 text-xs mt-4">
                    El sistema está analizando las efemérides y la documentación de Carutti
                  </p>
                  <div className="mt-6 w-full max-w-md">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              )}

              {!isGenerating && currentModuleContent && (
                <div className="md-card rounded-lg p-6">
                  <div className="max-w-none">
                    <div className="text-slate-900 whitespace-pre-wrap leading-relaxed">
                      {currentModuleContent}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-600">
                      Longitud generada: {currentModuleContent.length.toLocaleString()} caracteres
                    </p>
                  </div>
                </div>
              )}

              {!isGenerating && !currentModuleContent && !isLoading && (
                <div className="text-center py-12 text-slate-600">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-700" />
                  <p>Preparando generación del módulo...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isAutoGenerating && (
          <div className="p-6 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || !currentModuleContent}
              className="md-button md-button--secondary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerar Módulo Actual
            </button>

            <div className="flex items-center gap-3">
              {!isGenerating && currentModuleContent && !isLastModule && (
                <button
                  onClick={handleNext}
                  className="md-button px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  Proceder al Siguiente Módulo
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {isGenerating && (
                <div className="px-6 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-lg font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando módulo...
                </div>
              )}

              {!isGenerating && isLastModule && currentModuleContent && (
                <button
                  onClick={async () => {
                    await getFullReport();
                  }}
                  className="md-button px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Finalizar y Generar Informe Completo
                </button>
              )}
            </div>
          </div>
        )}

        {/* Footer para modo automático */}
        {isAutoGenerating && (
          <div className="p-6 border-t border-slate-200 bg-slate-50/60">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-700" />
                <div>
                  <p className="text-slate-900 font-semibold text-sm">Generando informe…</p>
                  <p className="text-slate-600 text-xs">
                    {status?.current_module_title ? `Módulo actual: ${status.current_module_title}` : `Módulo ${activeIndex + 1} de ${modules.length}`}
                  </p>
                </div>
              </div>
              {estimatedTimeRemaining !== null && (
                <p className="text-blue-700 text-sm font-semibold">
                  ⏱️ {formatTimeRemaining(estimatedTimeRemaining)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerationWizard;
