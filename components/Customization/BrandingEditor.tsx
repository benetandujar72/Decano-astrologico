import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Type, Palette, Eye, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';

interface BrandingConfig {
  logo_url: string | null;
  logo_size: 'small' | 'medium' | 'large';
  logo_position: 'top-left' | 'top-center' | 'top-right';
  title: string;
  title_auto_generate: boolean;
  typography: {
    font_family: string;
    font_size_base: number;
    font_color_primary: string;
    font_color_secondary: string;
  };
  color_scheme: {
    primary: string;
    secondary: string;
    background: string;
  };
}

interface BrandingEditorProps {
  onChangesMade: () => void;
}

const DEFAULT_BRANDING: BrandingConfig = {
  logo_url: null,
  logo_size: 'medium',
  logo_position: 'top-center',
  title: 'Informe Astrológico Personal',
  title_auto_generate: true,
  typography: {
    font_family: 'Merriweather',
    font_size_base: 12,
    font_color_primary: '#1e293b',
    font_color_secondary: '#64748b',
  },
  color_scheme: {
    primary: '#4f46e5',
    secondary: '#f59e0b',
    background: '#ffffff',
  },
};

const FONT_OPTIONS = [
  { value: 'Merriweather', label: 'Merriweather (Serif)' },
  { value: 'Inter', label: 'Inter (Sans-serif)' },
  { value: 'Roboto', label: 'Roboto (Sans-serif)' },
  { value: 'Lora', label: 'Lora (Serif)' },
  { value: 'Montserrat', label: 'Montserrat (Sans-serif)' },
];

export default function BrandingEditor({ onChangesMade }: BrandingEditorProps) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (field: string, value: any) => {
    setBranding((prev) => {
      const keys = field.split('.');
      if (keys.length === 1) {
        return { ...prev, [field]: value };
      }
      // Nested field (e.g., "typography.font_family")
      const [parent, child] = keys;
      return {
        ...prev,
        [parent]: {
          ...(prev[parent as keyof BrandingConfig] as any),
          [child]: value,
        },
      };
    });
    onChangesMade();
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aquí implementarías la subida del logo a tu servicio de almacenamiento
    // Por ahora, solo mostramos un placeholder
    const reader = new FileReader();
    reader.onload = (event) => {
      handleChange('logo_url', event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const resetToDefaults = () => {
    const confirmed = window.confirm('¿Resetear todos los valores a los predeterminados?');
    if (confirmed) {
      setBranding(DEFAULT_BRANDING);
      onChangesMade();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Palette className="w-6 h-6 text-indigo-400" />
            Personalización de Branding
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Personaliza el aspecto visual de tus informes PDF
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Ocultar' : 'Ver'} Vista Previa
          </button>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Resetear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logo Configuration */}
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-indigo-400" />
            Logo
          </h4>

          <div className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Imagen del Logo
              </label>
              <div className="flex items-center gap-4">
                {branding.logo_url && (
                  <div className="w-20 h-20 bg-white rounded-lg border-2 border-slate-600 p-2 flex items-center justify-center">
                    <img src={branding.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                  </div>
                )}
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-center justify-center">
                    <Upload className="w-4 h-4" />
                    {branding.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Formatos: PNG, JPG, SVG (máx. 2MB)
              </p>
            </div>

            {/* Logo Size */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tamaño del Logo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleChange('logo_size', size)}
                    className={`
                      px-4 py-2 rounded-lg capitalize transition-colors
                      ${branding.logo_size === size
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }
                    `}
                  >
                    {size === 'small' ? 'Pequeño' : size === 'medium' ? 'Mediano' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo Position */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Posición del Logo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'top-left', label: 'Izquierda' },
                  { value: 'top-center', label: 'Centro' },
                  { value: 'top-right', label: 'Derecha' },
                ] as const).map((position) => (
                  <button
                    key={position.value}
                    onClick={() => handleChange('logo_position', position.value)}
                    className={`
                      px-4 py-2 rounded-lg transition-colors
                      ${branding.logo_position === position.value
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                      }
                    `}
                  >
                    {position.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Title Configuration */}
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Type className="w-5 h-5 text-indigo-400" />
            Título del Informe
          </h4>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <input
                  type="checkbox"
                  checked={branding.title_auto_generate}
                  onChange={(e) => handleChange('title_auto_generate', e.target.checked)}
                  className="rounded border-slate-500 text-indigo-500 focus:ring-indigo-500"
                />
                Generar automáticamente con nombre
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título personalizado
              </label>
              <input
                type="text"
                value={branding.title}
                onChange={(e) => handleChange('title', e.target.value)}
                disabled={branding.title_auto_generate}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Informe Astrológico Personal"
              />
              <p className="text-xs text-slate-400 mt-2">
                {branding.title_auto_generate
                  ? 'Se generará: "Informe Astrológico de [Nombre]"'
                  : 'Usa este título fijo en todos los informes'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
          <h4 className="text-lg font-semibold text-white mb-4">Tipografía</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Familia de fuente
              </label>
              <select
                value={branding.typography.font_family}
                onChange={(e) => handleChange('typography.font_family', e.target.value)}
                className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tamaño base: {branding.typography.font_size_base}pt
              </label>
              <input
                type="range"
                min="8"
                max="24"
                value={branding.typography.font_size_base}
                onChange={(e) => handleChange('typography.font_size_base', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color primario
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.typography.font_color_primary}
                  onChange={(e) => handleChange('typography.font_color_primary', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-500 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.typography.font_color_primary}
                  onChange={(e) => handleChange('typography.font_color_primary', e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color secundario
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.typography.font_color_secondary}
                  onChange={(e) => handleChange('typography.font_color_secondary', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-500 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.typography.font_color_secondary}
                  onChange={(e) => handleChange('typography.font_color_secondary', e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Color Scheme */}
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
          <h4 className="text-lg font-semibold text-white mb-4">Esquema de Colores</h4>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color primario
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.color_scheme.primary}
                  onChange={(e) => handleChange('color_scheme.primary', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-500 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.color_scheme.primary}
                  onChange={(e) => handleChange('color_scheme.primary', e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color secundario
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.color_scheme.secondary}
                  onChange={(e) => handleChange('color_scheme.secondary', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-500 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.color_scheme.secondary}
                  onChange={(e) => handleChange('color_scheme.secondary', e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Color de fondo
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={branding.color_scheme.background}
                  onChange={(e) => handleChange('color_scheme.background', e.target.value)}
                  className="w-12 h-10 rounded border border-slate-500 cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.color_scheme.background}
                  onChange={(e) => handleChange('color_scheme.background', e.target.value)}
                  className="flex-1 px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
          <h4 className="text-lg font-semibold text-white mb-4">Vista Previa</h4>
          <div
            className="bg-white rounded-lg p-8 min-h-[400px]"
            style={{
              backgroundColor: branding.color_scheme.background,
              fontFamily: branding.typography.font_family,
              fontSize: `${branding.typography.font_size_base}pt`,
            }}
          >
            {/* Header with logo */}
            <div
              className={`flex ${
                branding.logo_position === 'top-center'
                  ? 'justify-center'
                  : branding.logo_position === 'top-right'
                  ? 'justify-end'
                  : 'justify-start'
              } mb-6`}
            >
              {branding.logo_url && (
                <img
                  src={branding.logo_url}
                  alt="Logo"
                  className={`
                    ${branding.logo_size === 'small' ? 'h-12' : branding.logo_size === 'medium' ? 'h-16' : 'h-24'}
                    object-contain
                  `}
                />
              )}
            </div>

            {/* Title */}
            <h1
              className="text-3xl font-bold mb-6"
              style={{ color: branding.color_scheme.primary }}
            >
              {branding.title_auto_generate ? 'Informe Astrológico de María García' : branding.title}
            </h1>

            {/* Sample content */}
            <div className="space-y-4">
              <p style={{ color: branding.typography.font_color_primary }}>
                Este es un ejemplo de texto principal con el esquema de colores seleccionado.
              </p>
              <p style={{ color: branding.typography.font_color_secondary }}>
                Este es texto secundario que se usa para información complementaria.
              </p>
              <div
                className="p-4 rounded"
                style={{ backgroundColor: `${branding.color_scheme.primary}20` }}
              >
                <h3 className="font-semibold mb-2" style={{ color: branding.color_scheme.primary }}>
                  Sección de Ejemplo
                </h3>
                <p style={{ color: branding.typography.font_color_primary }}>
                  Contenido de ejemplo dentro de una caja destacada.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
