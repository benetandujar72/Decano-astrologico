import React, { useState } from 'react';
import { Settings, Shield, Code, Image as ImageIcon, FileDown, AlertTriangle } from 'lucide-react';

interface AdvancedConfig {
  custom_css: string;
  watermark_text: string;
  encryption_enabled: boolean;
  password_protected: boolean;
}

interface ContentConfig {
  header_image_url: string;
  footer_text: string;
  modules_to_print: string[];
  report_mode: 'resumen' | 'completo' | 'exhaustivo';
  include_chart_images: boolean;
  include_aspects_table: boolean;
  include_planetary_table: boolean;
  language: string;
  page_size: 'A4' | 'Letter';
  page_orientation: 'portrait' | 'landscape';
}

interface AdvancedSettingsProps {
  onChangesMade: () => void;
}

const DEFAULT_ADVANCED: AdvancedConfig = {
  custom_css: '',
  watermark_text: '',
  encryption_enabled: false,
  password_protected: false,
};

const DEFAULT_CONTENT: ContentConfig = {
  header_image_url: '',
  footer_text: '© 2026 Fraktal Astrology',
  modules_to_print: ['modulo_1'],
  report_mode: 'completo',
  include_chart_images: true,
  include_aspects_table: true,
  include_planetary_table: true,
  language: 'es',
  page_size: 'A4',
  page_orientation: 'portrait',
};

const MODULES = [
  { id: 'modulo_1', name: 'Módulo 1 - Introducción' },
  { id: 'modulo_2_fundamentos', name: 'Módulo 2 - Fundamentos' },
  { id: 'modulo_3_estructura', name: 'Módulo 3 - Estructura Esencial' },
  { id: 'modulo_4_elementos', name: 'Módulo 4 - Análisis de Elementos' },
  { id: 'modulo_5_planetas', name: 'Módulo 5 - Planetas en Signos' },
  { id: 'modulo_6_casas', name: 'Módulo 6 - Planetas en Casas' },
  { id: 'modulo_7_aspectos', name: 'Módulo 7 - Aspectos Planetarios' },
  { id: 'modulo_8_configuraciones', name: 'Módulo 8 - Configuraciones Especiales' },
  { id: 'modulo_9_sintesis', name: 'Módulo 9 - Síntesis Astrológica' },
  { id: 'modulo_10_areas', name: 'Módulo 10 - Áreas de Vida' },
  { id: 'modulo_11_potenciales', name: 'Módulo 11 - Potenciales y Desafíos' },
];

export default function AdvancedSettings({ onChangesMade }: AdvancedSettingsProps) {
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedConfig>(DEFAULT_ADVANCED);
  const [contentConfig, setContentConfig] = useState<ContentConfig>(DEFAULT_CONTENT);
  const [userPlan] = useState('premium'); // En producción, obtener del contexto de usuario

  const isPremium = userPlan === 'premium' || userPlan === 'enterprise';
  const isEnterprise = userPlan === 'enterprise';

  const handleAdvancedChange = (field: keyof AdvancedConfig, value: any) => {
    setAdvancedConfig((prev) => ({ ...prev, [field]: value }));
    onChangesMade();
  };

  const handleContentChange = (field: keyof ContentConfig, value: any) => {
    setContentConfig((prev) => ({ ...prev, [field]: value }));
    onChangesMade();
  };

  const toggleModule = (moduleId: string) => {
    const newModules = contentConfig.modules_to_print.includes(moduleId)
      ? contentConfig.modules_to_print.filter((m) => m !== moduleId)
      : [...contentConfig.modules_to_print, moduleId];
    handleContentChange('modules_to_print', newModules);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Configuración Avanzada
        </h3>
        <p className="text-slate-400 text-sm mt-1">
          Opciones avanzadas de personalización y seguridad
        </p>
      </div>

      {/* Content Configuration */}
      <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileDown className="w-5 h-5 text-indigo-400" />
          Configuración de Contenido
        </h4>

        <div className="space-y-6">
          {/* Modules Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Módulos a Incluir
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {MODULES.map((module) => (
                <label
                  key={module.id}
                  className="flex items-center gap-2 p-3 bg-slate-600/50 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={contentConfig.modules_to_print.includes(module.id)}
                    onChange={() => toggleModule(module.id)}
                    className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-300">{module.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Report Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Modo de Informe
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['resumen', 'completo', 'exhaustivo'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleContentChange('report_mode', mode)}
                  className={`
                    px-4 py-2 rounded-lg capitalize transition-colors
                    ${contentConfig.report_mode === mode
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }
                  `}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {contentConfig.report_mode === 'resumen' && 'Informe breve con información esencial'}
              {contentConfig.report_mode === 'completo' && 'Informe estándar con todos los detalles'}
              {contentConfig.report_mode === 'exhaustivo' && 'Informe muy detallado con análisis profundo'}
            </p>
          </div>

          {/* Include options */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Elementos a Incluir
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2 hover:bg-slate-600/30 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={contentConfig.include_chart_images}
                  onChange={(e) => handleContentChange('include_chart_images', e.target.checked)}
                  className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Incluir imágenes de carta natal</span>
              </label>
              <label className="flex items-center gap-2 p-2 hover:bg-slate-600/30 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={contentConfig.include_aspects_table}
                  onChange={(e) => handleContentChange('include_aspects_table', e.target.checked)}
                  className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Incluir tabla de aspectos</span>
              </label>
              <label className="flex items-center gap-2 p-2 hover:bg-slate-600/30 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={contentConfig.include_planetary_table}
                  onChange={(e) => handleContentChange('include_planetary_table', e.target.checked)}
                  className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-300">Incluir tabla planetaria</span>
              </label>
            </div>
          </div>

          {/* Page settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tamaño de Página
              </label>
              <select
                value={contentConfig.page_size}
                onChange={(e) => handleContentChange('page_size', e.target.value)}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Orientación
              </label>
              <select
                value={contentConfig.page_orientation}
                onChange={(e) => handleContentChange('page_orientation', e.target.value)}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="portrait">Vertical (Portrait)</option>
                <option value="landscape">Horizontal (Landscape)</option>
              </select>
            </div>
          </div>

          {/* Footer text */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Texto del Pie de Página
            </label>
            <input
              type="text"
              value={contentConfig.footer_text}
              onChange={(e) => handleContentChange('footer_text', e.target.value)}
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="© 2026 Tu Empresa"
            />
          </div>
        </div>
      </div>

      {/* Advanced Security Settings (Enterprise) */}
      <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            Seguridad Avanzada
          </h4>
          {!isEnterprise && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full">
              Requiere Enterprise
            </span>
          )}
        </div>

        {!isEnterprise && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-300">
              Las funciones de seguridad avanzada están disponibles solo en el plan Enterprise.
              <a href="#" className="block mt-1 text-amber-400 hover:text-amber-300 font-medium">
                Actualizar a Enterprise →
              </a>
            </div>
          </div>
        )}

        <div className={`space-y-4 ${!isEnterprise ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Marca de Agua
            </label>
            <input
              type="text"
              value={advancedConfig.watermark_text}
              onChange={(e) => handleAdvancedChange('watermark_text', e.target.value)}
              disabled={!isEnterprise}
              className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="CONFIDENCIAL"
            />
            <p className="text-xs text-slate-400 mt-1">
              Añade una marca de agua semi-transparente en todas las páginas
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 p-3 bg-slate-600/50 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={advancedConfig.encryption_enabled}
                onChange={(e) => handleAdvancedChange('encryption_enabled', e.target.checked)}
                disabled={!isEnterprise}
                className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-300">Habilitar Encriptación PDF</div>
                <div className="text-xs text-slate-400">Protege el PDF con encriptación AES-256</div>
              </div>
            </label>
          </div>

          <div>
            <label className="flex items-center gap-2 p-3 bg-slate-600/50 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={advancedConfig.password_protected}
                onChange={(e) => handleAdvancedChange('password_protected', e.target.checked)}
                disabled={!isEnterprise}
                className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500 disabled:opacity-50"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-300">Proteger con Contraseña</div>
                <div className="text-xs text-slate-400">El PDF requerirá contraseña para abrirse</div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Custom CSS (Enterprise) */}
      <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-400" />
            CSS Personalizado
          </h4>
          {!isEnterprise && (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-full">
              Requiere Enterprise
            </span>
          )}
        </div>

        {!isEnterprise && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-300">
              El CSS personalizado está disponible solo en el plan Enterprise para máxima flexibilidad.
            </div>
          </div>
        )}

        <div className={!isEnterprise ? 'opacity-50 pointer-events-none' : ''}>
          <textarea
            value={advancedConfig.custom_css}
            onChange={(e) => handleAdvancedChange('custom_css', e.target.value)}
            disabled={!isEnterprise}
            rows={10}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={`/* Añade estilos CSS personalizados aquí */
.report-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
}

.report-section {
  margin-bottom: 2rem;
}`}
          />
          <p className="text-xs text-slate-400 mt-2">
            Ten cuidado: el CSS personalizado puede afectar el diseño del informe. Prueba tus cambios antes de usarlos en producción.
          </p>
        </div>
      </div>
    </div>
  );
}
