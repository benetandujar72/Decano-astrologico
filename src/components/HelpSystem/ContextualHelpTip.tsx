import React, { useState } from 'react';
import { Info, X } from 'lucide-react';

interface ContextualHelpTipProps {
  title: string;
  content: string;
  type?: 'info' | 'tip' | 'warning';
  dismissible?: boolean;
}

export default function ContextualHelpTip({
  title,
  content,
  type = 'info',
  dismissible = true,
}: ContextualHelpTipProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const typeStyles = {
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      icon: 'text-blue-400',
      text: 'text-blue-300',
    },
    tip: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
    warning: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: 'text-red-400',
      text: 'text-red-300',
    },
  };

  const style = typeStyles[type];

  return (
    <div className={`${style.bg} ${style.border} border rounded-lg p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <Info className={`w-5 h-5 ${style.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <h4 className={`${style.text} font-medium mb-1`}>{title}</h4>
          <p className="text-sm text-slate-300">{content}</p>
        </div>
        {dismissible && (
          <button
            onClick={() => setIsDismissed(true)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
