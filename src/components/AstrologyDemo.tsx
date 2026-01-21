/**
 * Componente de Demo de Informe Astrológico
 * Permite a los usuarios generar una pequeña demo con sus datos
 */
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, MapPin, Clock, AlertCircle, Download, Mail, Send, User, Bot, ArrowRight } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { api } from '../services/api';

const formatAssistantMessage = (raw: string, isGuidedOnly: boolean): string => {
  const text = String(raw || '').trim();
  if (!text) return '';

  const stripOuterCodeFence = (t: string) => {
    let out = t.trim();
    if (!out.startsWith('```')) return out;
    out = out.replace(/^```[a-zA-Z0-9_-]*\s*/g, '');
    if (out.endsWith('```')) out = out.slice(0, -3);
    return out.trim();
  };

  const tryParsePreviewWrapper = (t: string): string | null => {
    const trimmed = t.trim();

    const candidates: string[] = [];

    // Direct JSON
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      candidates.push(trimmed);
    }

    // JSON wrapped in code fences (often ```json ... ```)
    if (trimmed.startsWith('```')) {
      const unfenced = stripOuterCodeFence(trimmed);
      if (unfenced.startsWith('{') && unfenced.endsWith('}')) {
        candidates.push(unfenced);
      }
    }

    // JSON embedded inside other text
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      candidates.push(trimmed.slice(start, end + 1));
    }

    for (const cand of candidates) {
      try {
        const obj = JSON.parse(cand);
        if (obj && typeof obj === 'object') {
          const preview = String((obj as any).preview || '').trim();
          const full = String((obj as any).full || '').trim();
          const chosen = isGuidedOnly ? preview : (full || preview);
          if (chosen) return chosen;
        }
      } catch {
        // ignore
      }
    }

    return null;
  };

  return (tryParsePreviewWrapper(text) ?? text).trim();
};

interface DemoData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: string;
  longitude: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  step?: string;
}

interface AstrologyDemoProps {
  onHire?: () => void;
}

const AstrologyDemo: React.FC<AstrologyDemoProps> = ({ onHire }) => {
  const [step, setStep] = useState<'form' | 'chat'>('form');
  const [demoData, setDemoData] = useState<DemoData>({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    latitude: '',
    longitude: ''
  });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isGuidedOnly, setIsGuidedOnly] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Freemium gating (UX): FREE/anonymous = guided-only (no preguntas libres)
  useEffect(() => {
    const token = localStorage.getItem('fraktal_token');
    const savedUser = localStorage.getItem('fraktal_user');

    let isAdmin = false;
    let tier: string | undefined;
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        isAdmin = user?.role === 'admin' || user?.username === 'admin@programafraktal.com';
        tier = user?.subscription_tier;
      } catch {
        // ignore
      }
    }

    if (!token) {
      setIsGuidedOnly(true);
      return;
    }
    if (isAdmin) {
      setIsGuidedOnly(false);
      return;
    }
    if (tier && tier.toLowerCase() !== 'free') {
      setIsGuidedOnly(false);
      return;
    }

    api.getUserSubscription()
      .then((sub) => {
        const nextTier = (sub?.tier || 'free').toLowerCase();
        setIsGuidedOnly(nextTier === 'free');
      })
      .catch(() => {
        setIsGuidedOnly(true);
      });
  }, []);

  // Recuperar sesión guardada al montar
  useEffect(() => {
    const savedSessionId = localStorage.getItem('demo_session_id');
    if (savedSessionId) {
      setSessionId(savedSessionId);
      setStep('chat');
      fetchHistory(savedSessionId);
    }
  }, []);

  const fetchHistory = async (id: string) => {
    try {
      const history = await api.getDemoHistory(id);
      if (history && history.messages) {
        setMessages(history.messages);
      }
    } catch (e) {
      console.error("Error recuperando historial:", e);
      // Si falla, limpiar storage
      localStorage.removeItem('demo_session_id');
      setSessionId(null);
      setStep('form');
    }
  };

  const handleInputChange = (field: keyof DemoData, value: string) => {
    setDemoData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const geocodeBirthPlace = async () => {
    if (!demoData.birthPlace || demoData.birthPlace.trim().length < 3) {
      setError('Por favor ingresa un lugar de nacimiento válido');
      return;
    }

    setIsGeocoding(true);
    setError(null);

    try {
      const token = localStorage.getItem('fraktal_token');
      const response = await fetch(`${API_URL}/geolocation/geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ place: demoData.birthPlace })
      });

      if (!response.ok) {
        throw new Error('No se pudo encontrar el lugar');
      }

      const data = await response.json();
      setDemoData(prev => ({
        ...prev,
        latitude: data.lat.toString(),
        longitude: data.lon.toString(),
        birthPlace: data.nombre
      }));
    } catch (err: any) {
      console.error('Error geocoding:', err);
      setError(`No se pudo geocodificar "${demoData.birthPlace}". Intenta con otro formato (ej: "Madrid, España")`);
    } finally {
      setIsGeocoding(false);
    }
  };

  const validateForm = (): boolean => {
    if (!demoData.name || !demoData.birthDate) {
      setError('Por favor completa al menos tu nombre y fecha de nacimiento');
      return false;
    }
    return true;
  };

  const startDemo = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Preparar datos para el backend
      const chartData = {
        name: demoData.name,
        birth_date: demoData.birthDate,
        birth_time: demoData.birthTime || '12:00',
        birth_place: demoData.birthPlace || 'Madrid, España',
        latitude: demoData.latitude || '40.4168',
        longitude: demoData.longitude || '-3.7038',
        is_demo: true
      };

      // Obtener ID de usuario si está logueado
      let userId = null;
      const savedUser = localStorage.getItem('fraktal_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          userId = user.id || user._id;
        } catch (e) {
          console.error("Error parsing user", e);
        }
      }

      // Iniciar sesión de chat
      const session = await api.startDemoSession({
        user_name: demoData.name,
        user_id: userId,
        ...chartData,
        chart_data: chartData // Pasamos los datos para que el backend los use
      });

      setSessionId(session.session_id);
      localStorage.setItem('demo_session_id', session.session_id); // Guardar sesión
      setMessages(session.messages);
      setStep('chat');
    } catch (err) {
      console.error('Error iniciando demo:', err);
      setError('Error al iniciar la demo. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isGuidedOnly) {
      setError('En el plan FREE la demo es guiada. Pulsa “Siguiente Paso”.');
      return;
    }
    if (!inputMessage.trim() || !sessionId || isLoading) return;

    const msg = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    // Optimistic update
    setMessages(prev => [...prev, { role: 'user', content: msg }]);

    try {
      const updatedSession = await api.sendDemoMessage(sessionId, msg);
      setMessages(updatedSession.messages);
    } catch (err) {
      console.error('Error enviando mensaje:', err);
      // Revert optimistic update or show error
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextStep = async () => {
    if (!sessionId || isLoading) return;
    setIsLoading(true);
    try {
      const updatedSession = await api.sendDemoMessage(sessionId, "Continuar al siguiente paso", true);
      setMessages(updatedSession.messages);
    } catch (err) {
      console.error('Error avanzando paso:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemo = () => {
    setStep('form');
    setDemoData({
      name: '',
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      latitude: '',
      longitude: ''
    });
    setSessionId(null);
    localStorage.removeItem('demo_session_id'); // Limpiar sesión
    setMessages([]);
    setError(null);
  };

  const downloadPdf = () => {
    if (!sessionId) return;
    (async () => {
      try {
        const { blobUrl, filename } = await api.downloadDemoPdf(sessionId);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Dejar tiempo al navegador para iniciar la descarga
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);
      } catch (err) {
        console.error('Error descargando PDF:', err);
        setError('No se pudo descargar el PDF. Inténtalo de nuevo.');
      }
    })();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 border border-blue-200 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-blue-700" />
        </div>
        <h1 className="text-4xl font-bold text-slate-900 mb-4">Demo de informe astrológico (IA)</h1>
        <p className="text-slate-700 text-lg max-w-2xl mx-auto">
          Descubre tu perfil astrológico paso a paso con nuestra IA especializada (Método Carutti).
        </p>
      </div>

      {/* Form Step */}
      {step === 'form' && (
        <div className="md-card rounded-2xl p-8">
          <h2 className="text-2xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-slate-700" />
            Tus Datos de Nacimiento
          </h2>

          <div className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-slate-900 font-semibold mb-2">
                Nombre <span className="text-red-700">*</span>
              </label>
              <input
                type="text"
                value={demoData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="md-input w-full px-4 py-3 rounded-lg outline-none transition-all"
                placeholder="Tu nombre"
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label htmlFor="birth-date" className="block text-slate-900 font-semibold mb-2">
                Fecha de Nacimiento <span className="text-red-700">*</span>
              </label>
              <input
                id="birth-date"
                type="date"
                value={demoData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                className="md-input w-full px-4 py-3 rounded-lg outline-none transition-all"
                aria-required="true"
              />
            </div>

            {/* Hora de Nacimiento (Opcional) */}
            <div>
              <label htmlFor="birth-time" className="block text-slate-900 font-semibold mb-2">
                Hora de Nacimiento <span className="text-slate-600 text-sm">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-600" />
                <input
                  id="birth-time"
                  type="time"
                  value={demoData.birthTime}
                  onChange={(e) => handleInputChange('birthTime', e.target.value)}
                  className="md-input flex-1 px-4 py-3 rounded-lg outline-none transition-all"
                  aria-label="Hora de nacimiento"
                />
              </div>
              <p className="text-slate-600 text-sm mt-1">
                La hora exacta permite un análisis más preciso del ascendente
              </p>
            </div>

            {/* Lugar de Nacimiento (Opcional) */}
            <div>
              <label className="block text-slate-900 font-semibold mb-2">
                Lugar de Nacimiento <span className="text-slate-600 text-sm">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-slate-600" />
                <input
                  type="text"
                  value={demoData.birthPlace}
                  onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      geocodeBirthPlace();
                    }
                  }}
                  className="md-input flex-1 px-4 py-3 rounded-lg outline-none transition-all"
                  placeholder="Ciudad, País"
                />
                <button
                  type="button"
                  onClick={geocodeBirthPlace}
                  disabled={isGeocoding || !demoData.birthPlace}
                  className="md-button px-4 py-3 rounded-lg transition-colors font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeocoding ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {demoData.latitude && demoData.longitude && (
                <p className="text-green-700 text-sm mt-2">
                  ✓ Coordenadas: {parseFloat(demoData.latitude).toFixed(4)}, {parseFloat(demoData.longitude).toFixed(4)}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="md-alert md-alert--error flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={startDemo}
              disabled={isLoading}
              className="md-button w-full py-4 font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Iniciando...
                </span>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 inline mr-2" />
                  Comenzar Análisis Interactivo
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Chat Step */}
      {step === 'chat' && (
        <div className="md-card rounded-2xl overflow-hidden flex flex-col h-150">
          {/* Chat Header */}
          <div className="flex flex-col border-b border-slate-200 bg-slate-50/60">
            <div className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-slate-900 font-semibold">Asistente astrológico</h3>
                  <p className="text-xs text-slate-600">V6</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={downloadPdf}
                  className="text-blue-700 hover:text-blue-900 text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  title="Descargar chat como PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Guardar PDF</span>
                </button>
                <button 
                  onClick={resetDemo}
                  className="text-slate-600 hover:text-slate-900 text-sm"
                >
                  Reiniciar
                </button>
              </div>
            </div>
            
            {/* Progress Tracker */}
            <div className="px-4 pb-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center bg-slate-100">✓</div>
                <span>Datos</span>
              </div>
              <div className="h-px w-8 bg-slate-200"></div>
              
              <div className="flex items-center gap-2 text-blue-700">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm animate-pulse">2</div>
                <span className="font-medium">Análisis en curso</span>
              </div>
              <div className="h-px w-8 bg-slate-200"></div>
              
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center bg-white">3</div>
                <span>Plan Completo</span>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent bg-white">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-blue-700" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-900 rounded-tl-none'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="leading-relaxed text-sm">
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: (props: any) => <p className="mb-2 last:mb-0" {...props} />,
                          ul: (props: any) => <ul className="list-disc pl-5 my-2 space-y-1" {...props} />,
                          ol: (props: any) => <ol className="list-decimal pl-5 my-2 space-y-1" {...props} />,
                          li: (props: any) => {
                            const className = `my-1 ${props?.className ?? ''}`.trim();
                            return React.createElement('li', { ...props, className });
                          },
                          strong: (props: any) => <strong className="font-semibold text-slate-900" {...props} />,
                          em: (props: any) => <em className="italic" {...props} />,
                          a: (props: any) => {
                            const href = props?.href as string | undefined;
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-700 underline underline-offset-2 hover:text-blue-900"
                                {...props}
                              />
                            );
                          },
                          pre: (props: any) => (
                            <pre
                              className="bg-slate-50 text-slate-900 border border-slate-200 rounded-lg p-3 my-2 overflow-x-auto"
                              {...props}
                            />
                          ),
                          code: (props: any) => {
                            const { inline, ...rest } = props || {};
                            return inline ? (
                              <code
                                className="px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-900"
                                {...rest}
                              />
                            ) : (
                              <code className="text-slate-50" {...rest} />
                            );
                          },
                        }}
                      >
                        {formatAssistantMessage(msg.content, isGuidedOnly)}
                      </Markdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-5 h-5 text-slate-700" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-blue-700" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 rounded-tl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/60">
            {messages.length > 0 && (messages[messages.length - 1].step === 'completed' || messages[messages.length - 1].content.includes("Este es el final de tu análisis inicial")) ? (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <p className="text-slate-700 text-center text-sm">
                  ¿Quieres profundizar más en tu carta astral y descubrir todo tu potencial?
                </p>
                <button
                  onClick={onHire}
                  className="md-button w-full font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Contratar Servicios Profesionales de Jon Landeta
                </button>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                  <button
                    onClick={handleNextStep}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full text-blue-900 text-sm transition-all whitespace-nowrap"
                  >
                    Siguiente Paso <ArrowRight className="w-4 h-4" />
                  </button>
                  {!isGuidedOnly && (
                    <>
                      <button
                        onClick={() => setInputMessage("Explícame más sobre esto")}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-sm transition-all whitespace-nowrap"
                      >
                        Explícame más
                      </button>
                      <button
                        onClick={() => setInputMessage("¿Qué significa esto para mi vida?")}
                        className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-full text-slate-700 text-sm transition-all whitespace-nowrap"
                      >
                        ¿Qué significa?
                      </button>
                    </>
                  )}
                </div>

                {isGuidedOnly ? (
                  <p className="text-xs text-slate-600">
                    Plan FREE: demo guiada (sin preguntas libres). Usa “Siguiente Paso” para continuar.
                  </p>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Escribe tu pregunta..."
                      className="md-input flex-1 px-4 py-3 rounded-xl outline-none transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className="md-button px-4 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Enviar mensaje"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AstrologyDemo;
