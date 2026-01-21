import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import HelpPanel from './HelpPanel';

interface HelpButtonProps {
  context?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  tooltip?: string;
}

export default function HelpButton({
  context,
  position = 'bottom-right',
  tooltip = 'Abrir ayuda',
}: HelpButtonProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <>
      <button
        onClick={() => setIsHelpOpen(true)}
        className={`fixed ${positionClasses[position]} z-40 group`}
        title={tooltip}
        aria-label={tooltip}
      >
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
          <div className="relative flex items-center justify-center w-14 h-14 bg-indigo-500 hover:bg-indigo-600 rounded-full shadow-lg transition-all duration-200 group-hover:scale-110">
            <HelpCircle className="w-7 h-7 text-white" />
          </div>
        </div>

        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full right-4 w-2 h-2 bg-slate-800 transform rotate-45 -mt-1"></div>
        </div>
      </button>

      <HelpPanel
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        initialContext={context}
      />
    </>
  );
}
