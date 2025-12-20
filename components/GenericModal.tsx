
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <h3 className="text-xl font-serif text-white tracking-wide">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Cerrar modal"
            title="Cerrar"
          >
            <X size={20} />
            <span className="sr-only">Cerrar</span>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default GenericModal;
