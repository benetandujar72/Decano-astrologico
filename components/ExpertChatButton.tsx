/**
 * Botón para abrir chat con experto IA
 * Se muestra en informes astrológicos
 */
import React, { useState, useEffect } from 'react';
import { MessageCircle, Lock, Sparkles } from 'lucide-react';

interface ExpertChatButtonProps {
  chartId?: string;
  reportContent?: string;
  onOpenChat: (chartId?: string, reportContent?: string) => void;
}

const ExpertChatButton: React.FC<ExpertChatButtonProps> = ({
  chartId,
  reportContent,
  onOpenChat
}) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/expert-chat/usage-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const stats = await response.json();
        setUsageStats(stats);
        setHasAccess(stats.can_create_consultation);
      }
    } catch (error) {
      console.error('Error checking expert chat access:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (hasAccess) {
      onOpenChat(chartId, reportContent);
    } else {
      // Mostrar mensaje de upgrade
      alert('Actualiza tu plan a PRO o superior para acceder al chat con experto IA');
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleClick}
        disabled={!hasAccess}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg
          transition-all transform hover:scale-105 active:scale-95
          flex items-center justify-center gap-3
          ${hasAccess
            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl'
            : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }
        `}
      >
        {hasAccess ? (
          <>
            <Sparkles className="w-6 h-6" />
            <span>Consultar con Experto IA</span>
            <MessageCircle className="w-6 h-6" />
          </>
        ) : (
          <>
            <Lock className="w-6 h-6" />
            <span>Experto IA (PRO+)</span>
          </>
        )}
      </button>

      {/* Información de cuota */}
      {hasAccess && usageStats && (
        <div className="mt-3 text-center">
          <p className="text-sm text-gray-400">
            {usageStats.consultations_limit === -1 ? (
              <span className="text-green-400">✨ Consultas ilimitadas</span>
            ) : (
              <>
                Consultas restantes este mes:{' '}
                <span className={`font-semibold ${
                  usageStats.remaining_consultations > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {usageStats.remaining_consultations} de {usageStats.consultations_limit}
                </span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

export default ExpertChatButton;
