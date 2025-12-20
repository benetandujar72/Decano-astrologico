/**
 * Componente de Demo de Informe Astrológico
 * Permite a los usuarios generar una pequeña demo con sus datos
 */
import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Calendar, MapPin, Clock, AlertCircle, Download, Mail, Send, User, Bot, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

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
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Demo de Informe Astrológico IA</h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Descubre tu perfil astrológico paso a paso con nuestra IA especializada (Método Carutti).
        </p>
      </div>

      {/* Form Step */}
      {step === 'form' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            Tus Datos de Nacimiento
          </h2>

          <div className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={demoData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                placeholder="Tu nombre"
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label htmlFor="birth-date" className="block text-white font-semibold mb-2">
                Fecha de Nacimiento <span className="text-red-400">*</span>
              </label>
              <input
                id="birth-date"
                type="date"
                value={demoData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                aria-required="true"
              />
            </div>

            {/* Hora de Nacimiento (Opcional) */}
            <div>
              <label htmlFor="birth-time" className="block text-white font-semibold mb-2">
                Hora de Nacimiento <span className="text-gray-400 text-sm">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <input
                  id="birth-time"
                  type="time"
                  value={demoData.birthTime}
                  onChange={(e) => handleInputChange('birthTime', e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                  aria-label="Hora de nacimiento"
                />
              </div>
              <p className="text-gray-400 text-sm mt-1">
                La hora exacta permite un análisis más preciso del ascendente
              </p>
            </div>

            {/* Lugar de Nacimiento (Opcional) */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Lugar de Nacimiento <span className="text-gray-400 text-sm">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" />
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
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                  placeholder="Ciudad, País"
                />
                <button
                  type="button"
                  onClick={geocodeBirthPlace}
                  disabled={isGeocoding || !demoData.birthPlace}
                  className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-semibold text-sm"
                >
                  {isGeocoding ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
              {demoData.latitude && demoData.longitude && (
                <p className="text-green-400 text-sm mt-2">
                  ✓ Coordenadas: {parseFloat(demoData.latitude).toFixed(4)}, {parseFloat(demoData.longitude).toFixed(4)}
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={startDemo}
              disabled={isLoading}
              className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 overflow-hidden flex flex-col h-150">
          {/* Chat Header */}
          <div className="flex flex-col border-b border-white/10 bg-black/20">
            <div className="p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600/30 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Asistente Astrológico</h3>
                  <p className="text-xs text-purple-300">V6</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={downloadPdf}
                  className="text-purple-300 hover:text-white text-sm flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                  title="Descargar chat como PDF"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Guardar PDF</span>
                </button>
                <button 
                  onClick={resetDemo}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Reiniciar
                </button>
              </div>
            </div>
            
            {/* Progress Tracker */}
            <div className="px-4 pb-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-purple-300/50">
                <div className="w-5 h-5 rounded-full border border-purple-500/30 flex items-center justify-center bg-purple-500/10">✓</div>
                <span>Datos</span>
              </div>
              <div className="h-px w-8 bg-purple-500/20"></div>
              
              <div className="flex items-center gap-2 text-purple-300">
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-white shadow-[0_0_10px_rgba(168,85,247,0.4)] animate-pulse">2</div>
                <span className="font-medium">Análisis en curso</span>
              </div>
              <div className="h-px w-8 bg-white/10"></div>
              
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-5 h-5 rounded-full border border-white/10 flex items-center justify-center">3</div>
                <span>Plan Completo</span>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-purple-600/30 scrollbar-track-transparent">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-purple-300" />
                  </div>
                )}
                
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-tr-none'
                      : 'bg-white/10 text-gray-200 rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed text-sm">
                    {msg.content}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-600/30 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-5 h-5 text-purple-300" />
                </div>
                <div className="bg-white/10 rounded-2xl p-4 rounded-tl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-black/20">
            {messages.length > 0 && (messages[messages.length - 1].step === 'completed' || messages[messages.length - 1].content.includes("Este es el final de tu análisis inicial")) ? (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <p className="text-purple-200 text-center text-sm">
                  ¿Quieres profundizar más en tu carta astral y descubrir todo tu potencial?
                </p>
                <button
                  onClick={onHire}
                  className="w-full bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
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
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full text-purple-200 text-sm transition-all whitespace-nowrap"
                  >
                    Siguiente Paso <ArrowRight className="w-4 h-4" />
                  </button>
                  {!isGuidedOnly && (
                    <>
                      <button
                        onClick={() => setInputMessage("Explícame más sobre esto")}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-300 text-sm transition-all whitespace-nowrap"
                      >
                        Explícame más
                      </button>
                      <button
                        onClick={() => setInputMessage("¿Qué significa esto para mi vida?")}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-300 text-sm transition-all whitespace-nowrap"
                      >
                        ¿Qué significa?
                      </button>
                    </>
                  )}
                </div>

                {isGuidedOnly ? (
                  <p className="text-xs text-purple-200/80">
                    Plan FREE: demo guiada (sin preguntas libres). Usa “Siguiente Paso” para continuar.
                  </p>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Escribe tu pregunta..."
                      className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || isLoading}
                      className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
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
