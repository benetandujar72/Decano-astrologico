/**
 * Modal de chat con experto IA
 * Interfaz conversacional para consultas astrológicas
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';

interface Message {
  message_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

interface ExpertChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chartId?: string;
  reportContent?: string;
}

const ExpertChatModal: React.FC<ExpertChatModalProps> = ({
  isOpen,
  onClose,
  chartId,
  reportContent
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('fraktal_token');

  // Auto-scroll al último mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Iniciar consulta cuando se abre el modal
  useEffect(() => {
    if (isOpen && !consultationId) {
      startConsultation();
    }
  }, [isOpen]);

  // Focus en input cuando se abre
  useEffect(() => {
    if (isOpen && !loading) {
      inputRef.current?.focus();
    }
  }, [isOpen, loading]);

  const startConsultation = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/expert-chat/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          chart_id: chartId,
          report_content: reportContent,
          initial_question: "Hola, estoy listo para explorar mi carta natal"
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al iniciar consulta');
      }

      const consultation = await response.json();
      setConsultationId(consultation.consultation_id);
      setMessages(consultation.messages || []);
    } catch (err: any) {
      console.error('Error starting consultation:', err);
      setError(err.message || 'Error al conectar con el experto');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !consultationId || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/expert-chat/${consultationId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al enviar mensaje');
      }

      const updatedConsultation = await response.json();
      setMessages(updatedConsultation.messages || []);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || 'Error al enviar mensaje');
      // Restaurar mensaje en input si falló
      setInputMessage(userMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClose = async () => {
    // Opcional: marcar consulta como completada
    if (consultationId && messages.length > 2) {
      try {
        await fetch(`${API_URL}/expert-chat/${consultationId}/complete`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Error completing consultation:', err);
      }
    }

    // Resetear estado
    setConsultationId(null);
    setMessages([]);
    setInputMessage('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col border border-purple-500/30">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-linear-to-r from-purple-900/50 to-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Experto Astrológico Fraktal</h2>
              <p className="text-sm text-gray-300">Metodología de Jon Landeta</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar chat"
          >
            <X className="w-6 h-6 text-gray-300" />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-950">
          {messages.map((message, index) => (
            <div
              key={message.message_id || index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                  message.role === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-100 border border-gray-700'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 mb-2 text-purple-400 text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    <span>Experto</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                <div className="text-xs opacity-60 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl px-5 py-3 border border-gray-700">
                <div className="flex items-center gap-2 text-purple-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Experto analizando...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-900/30 border border-red-500 rounded-xl px-4 py-3 flex items-center gap-2 text-red-300">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-gray-700 bg-gray-900">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta sobre astrología..."
              disabled={loading || !consultationId}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-5 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim() || !consultationId}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-colors flex items-center gap-2 font-semibold"
              aria-label="Enviar mensaje"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Enviar</span>
                </>
              )}
            </button>
          </div>

          {/* Helper text */}
          <p className="text-xs text-gray-500 mt-3 text-center">
            El experto tiene acceso a tu informe astrológico completo para respuestas personalizadas
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExpertChatModal;
