import React, { useState } from 'react';
import { Palette, FileText, Settings, Sparkles, Save, X } from 'lucide-react';
import BrandingEditor from './BrandingEditor';
import PromptEditor from './PromptEditor';
import TemplateManager from './TemplateManager';
import AdvancedSettings from './AdvancedSettings';

type CustomizationTab = 'templates' | 'branding' | 'prompts' | 'advanced';

interface CustomizationPanelProps {
  onClose: () => void;
  onSave?: () => void;
}

export default function CustomizationPanel({ onClose, onSave }: CustomizationPanelProps) {
  const [activeTab, setActiveTab] = useState<CustomizationTab>('templates');
  const [hasChanges, setHasChanges] = useState(false);

  const tabs = [
    { id: 'templates' as const, label: 'Plantillas', icon: FileText, description: 'Gestiona tus plantillas de informes' },
    { id: 'branding' as const, label: 'Branding', icon: Palette, description: 'Personaliza logo, colores y tipografía' },
    { id: 'prompts' as const, label: 'Prompts', icon: Sparkles, description: 'Personaliza los prompts de generación' },
    { id: 'advanced' as const, label: 'Avanzado', icon: Settings, description: 'Configuración avanzada' },
  ];

  const handleSave = async () => {
    if (onSave) {
      await onSave();
    }
    setHasChanges(false);
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = window.confirm('Tienes cambios sin guardar. ¿Seguro que quieres salir?');
      if (!confirmed) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-7 h-7 text-indigo-400" />
              Personalización de Informes
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Personaliza el aspecto y contenido de tus informes astrológicos
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar cambios
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar with tabs */}
          <div className="w-64 border-r border-slate-700 bg-slate-800/50 p-4 overflow-y-auto">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-start gap-3 p-3 rounded-lg transition-all text-left
                      ${isActive
                        ? 'bg-indigo-500/20 border border-indigo-500/50 text-white'
                        : 'hover:bg-slate-700/50 text-slate-300 hover:text-white border border-transparent'
                      }
                    `}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Plan info */}
            <div className="mt-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tu Plan Actual
              </div>
              <div className="text-white font-semibold">Premium</div>
              <div className="text-xs text-slate-400 mt-1">
                Personalización completa disponible
              </div>
              <button className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                Ver límites del plan →
              </button>
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'templates' && (
              <TemplateManager onChangesMade={() => setHasChanges(true)} />
            )}
            {activeTab === 'branding' && (
              <BrandingEditor onChangesMade={() => setHasChanges(true)} />
            )}
            {activeTab === 'prompts' && (
              <PromptEditor onChangesMade={() => setHasChanges(true)} />
            )}
            {activeTab === 'advanced' && (
              <AdvancedSettings onChangesMade={() => setHasChanges(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
