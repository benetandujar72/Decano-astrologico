
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface GenericModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const GenericModal: React.FC<GenericModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 md-backdrop transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative md-modal w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 md-divider bg-slate-50/60">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Cerrar modal"
            title="Cerrar"
          >
            <X size={20} />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default GenericModal;
