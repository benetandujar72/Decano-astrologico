/**
 * Chatbot Astrológico con información del usuario
 * Asistente virtual para responder preguntas sobre astrología y servicios
 */
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatbotProps {
  userName?: string;
  userTier?: string;
}

const AstroChatbot: React.FC<ChatbotProps> = ({ userName, userTier }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Mensaje de bienvenida
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        text: userName
          ? `¡Hola ${userName}! 👋 Soy tu asistente astrológico virtual. ¿En qué puedo ayudarte hoy?`
          : '¡Hola! 👋 Soy tu asistente astrológico virtual. ¿En qué puedo ayudarte?',
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);

      // Sugerencias iniciales
      setTimeout(() => {
        const suggestionsMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Puedes preguntarme sobre:\n• Servicios profesionales de Jon Landeta\n• Tu plan de suscripción\n• Cómo generar una carta natal\n• Información sobre astrología\n• Demo de informe astrológico',
          sender: 'bot',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, suggestionsMessage]);
      }, 1000);
    }
  }, [isOpen, userName]);

  const quickResponses: Record<string, string> = {
    'servicios': `Jon Landeta ofrece varios servicios profesionales:

🔹 Consultas telefónicas y online
🔹 Sesiones presenciales
🔹 Programas de capacitación
🔹 Informes personalizados en PDF
🔹 Contacto directo (GRATIS)

${userTier === 'premium' || userTier === 'enterprise' ? '✨ ¡Tienes descuento en servicios profesionales!' : ''}

¿Te gustaría conocer más sobre algún servicio específico?`,

    'plan': userTier
      ? `Tu plan actual es: ${userTier.toUpperCase()}

${userTier === 'free' ? '• 5 cartas natales por mes\n• Exportación PDF\n• Contacto con Jon Landeta' :
        userTier === 'pro' ? '• Cartas natales ilimitadas\n• Tránsitos y Progresiones\n• 1 consulta con experto IA\n• 1 crédito de capacitación anual' :
          userTier === 'premium' ? '• Todo del plan Pro\n• Sinastría y Compuestas\n• 3 consultas con experto IA\n• 10% descuento en servicios\n• 3 créditos de capacitación' :
            '• Plan empresarial completo\n• Capacitación ilimitada\n• 20% descuento en servicios'}

¿Quieres mejorar tu plan?`
      : 'Para ver información sobre tu plan, por favor inicia sesión.',

    'carta': `Para generar una carta natal necesitas:

📅 Fecha de nacimiento
🕐 Hora exacta de nacimiento (si la conoces)
📍 Lugar de nacimiento (ciudad y país)

${userTier === 'free' ? 'Puedes generar hasta 5 cartas por mes con el plan gratuito.' : 'Tienes cartas natales ilimitadas con tu plan actual.'}

¿Tienes todos estos datos listos?`,

    'demo': `¡Puedes probar nuestra demo de informe astrológico!

Es completamente GRATIS y te dará:
✨ Tus signos principales (Sol, Luna, Ascendente)
✨ Rasgos clave de personalidad
✨ Resumen astrológico básico

Solo necesitas tu nombre y fecha de nacimiento.

⚠️ Recuerda: Es una demo simplificada. Para un análisis completo, contacta con Jon Landeta.`,

    'contacto': `Contactar con Jon Landeta es GRATIS para todos los usuarios.

Puedes contactarlo para:
💬 Consultas personalizadas
📚 Información sobre servicios
🎯 Orientación sobre qué servicio necesitas

Ve a "Servicios Profesionales" y busca la opción "Contacto con Jon Landeta".`,

    'capacitacion': userTier && ['pro', 'premium', 'enterprise'].includes(userTier)
      ? `¡Tu plan incluye capacitación!

${userTier === 'pro' ? '📚 1 crédito de capacitación anual' :
        userTier === 'premium' ? '📚 3 créditos de capacitación anuales' :
          '📚 Capacitación ILIMITADA'}

Los programas de capacitación incluyen:
• Fundamentos de astrología
• Metodología Jon Landeta
• Material didáctico completo
• Certificado de finalización

¿Te gustaría conocer más sobre los programas?`
      : 'Los programas de capacitación están disponibles para planes Pro y superiores. ¿Quieres mejorar tu plan?',

    'ayuda': `Estoy aquí para ayudarte con:

🌟 Información sobre servicios de Jon Landeta
📊 Detalles de tu plan de suscripción
🎴 Cómo generar cartas natales
📖 Conceptos básicos de astrología
🎁 Demo de informe gratis
💬 Contacto con Jon Landeta

¿Sobre qué te gustaría saber más?`
  };

  const getBotResponse = (userMessage: string): string => {
    const lowercaseMessage = userMessage.toLowerCase();

    // Buscar palabras clave
    if (lowercaseMessage.includes('servicio') || lowercaseMessage.includes('jon landeta')) {
      return quickResponses['servicios'];
    }
    if (lowercaseMessage.includes('plan') || lowercaseMessage.includes('suscripción') || lowercaseMessage.includes('suscripcion')) {
      return quickResponses['plan'];
    }
    if (lowercaseMessage.includes('carta') || lowercaseMessage.includes('natal')) {
      return quickResponses['carta'];
    }
    if (lowercaseMessage.includes('demo') || lowercaseMessage.includes('prueba')) {
      return quickResponses['demo'];
    }
    if (lowercaseMessage.includes('contacto') || lowercaseMessage.includes('contactar')) {
      return quickResponses['contacto'];
    }
    if (lowercaseMessage.includes('capacita') || lowercaseMessage.includes('formación') || lowercaseMessage.includes('formacion')) {
      return quickResponses['capacitacion'];
    }
    if (lowercaseMessage.includes('ayuda') || lowercaseMessage.includes('hola') || lowercaseMessage.includes('hi')) {
      return quickResponses['ayuda'];
    }

    // Respuesta por defecto
    return `Entiendo que preguntas sobre "${userMessage}".

Puedo ayudarte con información sobre:
• Servicios de Jon Landeta
• Tu plan de suscripción
• Generar cartas natales
• Demo de informe gratis

¿Podrías ser más específico? O escribe "ayuda" para ver todas las opciones.`;
  };

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Simular tiempo de respuesta
    setTimeout(() => {
      const botResponse = getBotResponse(inputMessage);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chatbot Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all z-50 flex items-center justify-center"
          aria-label="Abrir chat"
        >
          <MessageCircle className="w-7 h-7" />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-full max-w-md h-150 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-50 p-4 flex items-center justify-between border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center border border-blue-200">
                <Bot className="w-6 h-6 text-blue-700" />
              </div>
              <div>
                <h3 className="text-slate-900 font-semibold">Asistente</h3>
                <p className="text-slate-600 text-xs">Siempre disponible</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-900 transition-colors"
              aria-label="Cerrar chat"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-sm transform transition-transform hover:scale-105 ${
                  message.sender === 'user'
                    ? 'bg-blue-600 ring-2 ring-blue-200'
                    : 'bg-emerald-600 ring-2 ring-emerald-200'
                }`}>
                  {message.sender === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className={`flex-1 ${message.sender === 'user' ? 'text-right' : 'text-left'} max-w-[85%]`}>
                  <div className={`inline-block px-6 py-4 rounded-2xl text-sm leading-relaxed shadow-md ${message.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-slate-50 border border-slate-200 text-slate-900 rounded-tl-sm'
                    }`}>
                    <div className="whitespace-pre-wrap font-medium tracking-wide">
                      {message.text}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-600 mt-1.5 px-1 font-mono uppercase tracking-wider opacity-70">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex gap-3 items-end">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu pregunta..."
                className="md-input flex-1 px-5 py-4 rounded-2xl outline-none transition-all"
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="md-button p-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transform hover:-translate-y-0.5 active:translate-y-0"
                aria-label="Enviar mensaje"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AstroChatbot;
