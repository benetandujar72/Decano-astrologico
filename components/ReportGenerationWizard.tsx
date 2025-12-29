/**
 * Wizard para generación de informes paso a paso
 * Genera cada módulo con confirmación del usuario antes de continuar
 */
import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle, Loader2, AlertCircle, 
  FileText, Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';

interface ReportGenerationWizardProps {
  cartaData: any;
  nombre: string;
  onComplete: (fullReport: string) => void;
  onClose: () => void;
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
  current_module_index: number;
  total_modules: number;
  modules: Array<{
    id: string;
    title: string;
    is_generated: boolean;
    length: number;
  }>;
  has_full_report: boolean;
}

const ReportGenerationWizard: React.FC<ReportGenerationWizardProps> = ({
  cartaData,
  nombre,
  onComplete,
  onClose,
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
  const token = localStorage.getItem('fraktal_token');

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
    };
  }, []);

  const initializeSession = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/reports/start-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          carta_data: cartaData,
          nombre: nombre
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
          // Modo automático: generar todos los módulos sin confirmación
          await generateAllModulesAutomatically(data.session_id, data.modules);
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

  const generateModuleWithSession = async (sessionIdToUse: string, moduleId: string) => {
    setIsGenerating(true);
    setError(null);
    setCurrentModuleContent('');

    try {
      console.log(`[WIZARD] Generando módulo: ${moduleId} con sesión: ${sessionIdToUse}`);
      
      const startTime = Date.now();
      const estimatedTime = TIME_ESTIMATES[moduleId] || 240; // Default 4 minutos
      
      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutos
      
      const response = await fetch(`${API_URL}/reports/generate-module`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionIdToUse,
          module_id: moduleId
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      console.log(`[WIZARD] Módulo ${moduleId} generado en ${elapsedTime}s (estimado: ${estimatedTime}s)`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.detail || `Error HTTP ${response.status}: ${response.statusText}`;
        console.error(`[WIZARD] Error en respuesta:`, errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(`[WIZARD] Módulo generado exitosamente. Longitud: ${data.length} caracteres`);
      
      if (!data.content || data.content.trim().length === 0) {
        throw new Error('El módulo se generó pero está vacío. Por favor regenera.');
      }
      
      setCurrentModuleContent(data.content);
      
      // Actualizar estado
      await refreshStatus();
      
    } catch (err: any) {
      console.error('[WIZARD] Error generando módulo:', err);
      
      let errorMessage = 'Error generando módulo';
      if (err.name === 'AbortError') {
        errorMessage = 'La generación tardó demasiado tiempo (más de 10 minutos). Por favor intenta regenerar este módulo.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
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

  const refreshStatus = async () => {
    if (!sessionId) return;
    
    try {
      const response = await fetch(`${API_URL}/reports/generation-status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
        setCurrentModuleIndex(data.current_module_index);
      }
    } catch (err) {
      console.error('Error refrescando estado:', err);
    }
  };

  const getFullReport = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
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
    setEstimatedTimeRemaining(totalEstimatedTime);
    
    try {
      for (let i = 0; i < modulesList.length; i++) {
        const module = modulesList[i];
        setCurrentModuleIndex(i);
        setCurrentModuleContent('');
        
        // Actualizar tiempo restante
        const remaining = modulesList.slice(i).reduce((total, m) => {
          return total + (TIME_ESTIMATES[m.id] || 240);
        }, 0);
        setEstimatedTimeRemaining(remaining);
        
        console.log(`[WIZARD] Generando módulo ${i + 1}/${modulesList.length}: ${module.id}`);
        
        // Generar módulo
        await generateModuleWithSession(sessionIdToUse, module.id);
        
        setGeneratedModulesCount(i + 1);
        
        // Pequeño delay entre módulos para no saturar
        if (i < modulesList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Todos los módulos generados, obtener informe completo
      await getFullReport();
      
    } catch (err: any) {
      console.error('[WIZARD] Error en generación automática:', err);
      setError(err.message || 'Error generando módulos automáticamente');
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
  const progress = modules.length > 0 ? ((currentModuleIndex + 1) / modules.length) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-purple-500/30 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-purple-900/50 to-indigo-900/50">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <div>
              <h2 className="text-2xl font-bold text-white">Generación de Informe Exhaustivo</h2>
              <p className="text-gray-400 text-sm">Proceso paso a paso según CORE CARUTTI v5.3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            title="Cerrar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-300">
              {isAutoGenerating 
                ? `Generando automáticamente: Módulo ${generatedModulesCount + 1} de ${modules.length}`
                : `Módulo ${currentModuleIndex + 1} de ${modules.length}`
              }
            </span>
            <div className="flex items-center gap-3">
              {estimatedTimeRemaining !== null && (
                <span className="text-sm text-purple-400 font-semibold">
                  ⏱️ {formatTimeRemaining(estimatedTimeRemaining)}
                </span>
              )}
              <span className="text-sm text-gray-300">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Module List */}
        <div className="px-6 py-4 bg-gray-800/30 border-b border-gray-700 max-h-32 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
            {modules.map((module, idx) => {
              const isGenerated = status?.modules.find(m => m.id === module.id)?.is_generated || false;
              const isCurrent = idx === currentModuleIndex;
              
              return (
                <div
                  key={module.id}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isCurrent
                      ? 'bg-purple-500 text-white'
                      : isGenerated
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {idx + 1}. {module.title.split(':')[0]}
                  {isGenerated && <CheckCircle className="inline ml-1 w-3 h-3" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
              <p className="text-gray-300">Inicializando generación...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Error</span>
              </div>
              <p className="text-red-300 mt-2">{error}</p>
            </div>
          )}

          {currentModule && (
            <>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  {currentModule.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  Extensión mínima esperada: {currentModule.expected_min_chars.toLocaleString()} caracteres
                </p>
              </div>

              {(isGenerating || isAutoGenerating) && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                  <p className="text-gray-300 font-semibold text-lg">
                    {isAutoGenerating 
                      ? `Generando módulo ${generatedModulesCount + 1} de ${modules.length}...`
                      : 'Generando módulo...'
                    }
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    {isAutoGenerating 
                      ? `Proceso automático en curso. Todos los módulos se generarán secuencialmente.`
                      : 'Esto puede tardar varios minutos'
                    }
                  </p>
                  {estimatedTimeRemaining !== null && (
                    <p className="text-purple-400 font-semibold mt-3">
                      ⏱️ Tiempo estimado restante: {formatTimeRemaining(estimatedTimeRemaining)}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-4">
                    El sistema está analizando las efemérides y la documentación de Carutti
                  </p>
                  <div className="mt-6 w-full max-w-md">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                </div>
              )}

              {!isGenerating && currentModuleContent && (
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                  <div className="prose prose-invert max-w-none">
                    <div className="text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {currentModuleContent}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                      Longitud generada: {currentModuleContent.length.toLocaleString()} caracteres
                    </p>
                  </div>
                </div>
              )}

              {!isGenerating && !currentModuleContent && !isLoading && (
                <div className="text-center py-12 text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-purple-400" />
                  <p>Preparando generación del módulo...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {!isAutoGenerating && (
          <div className="p-6 border-t border-gray-700 bg-gray-800/50 flex items-center justify-between">
            <button
              onClick={handleRegenerate}
              disabled={isGenerating || !currentModuleContent}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerar Módulo Actual
            </button>

            <div className="flex items-center gap-3">
              {!isGenerating && currentModuleContent && !isLastModule && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                >
                  Proceder al Siguiente Módulo
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {isGenerating && (
                <div className="px-6 py-2 bg-gray-700 text-gray-300 rounded-lg font-semibold flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generando módulo...
                </div>
              )}

              {!isGenerating && isLastModule && currentModuleContent && (
                <button
                  onClick={async () => {
                    await getFullReport();
                  }}
                  className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
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
          <div className="p-6 border-t border-gray-700 bg-gray-800/50">
            <div className="flex items-center justify-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
              <div className="text-center">
                <p className="text-white font-semibold">
                  Generando automáticamente todos los módulos...
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {generatedModulesCount} de {modules.length} módulos completados
                </p>
                {estimatedTimeRemaining !== null && (
                  <p className="text-purple-400 text-sm mt-2 font-semibold">
                    ⏱️ Tiempo restante estimado: {formatTimeRemaining(estimatedTimeRemaining)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportGenerationWizard;
