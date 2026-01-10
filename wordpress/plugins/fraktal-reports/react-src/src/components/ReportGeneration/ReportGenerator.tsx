import React from 'react';
import { FileText } from 'lucide-react';

interface ReportGeneratorProps {
  planCheck?: string;
  showUpgrade?: string;
}

export default function ReportGenerator({ planCheck = 'true', showUpgrade = 'true' }: ReportGeneratorProps) {
  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-8 h-8 text-indigo-400" />
        <h2 className="text-2xl font-semibold text-white">Generador de Informes</h2>
      </div>
      <p className="text-slate-400">
        Este componente será copiado de la aplicación principal en la Fase 2.2
      </p>
      <div className="mt-4 p-4 bg-slate-700 rounded">
        <p className="text-sm text-slate-300">
          Plan Check: {planCheck === 'true' ? 'Activado' : 'Desactivado'}
        </p>
        <p className="text-sm text-slate-300 mt-1">
          Show Upgrade: {showUpgrade === 'true' ? 'Activado' : 'Desactivado'}
        </p>
      </div>
    </div>
  );
}
