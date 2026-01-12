import React, { useState, useEffect } from 'react';
import { FileText, Plus, Copy, Trash2, Star, Eye, Edit2, X, Save, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface BrandingConfig {
  logo_url?: string | null;
  logo_size?: 'small' | 'medium' | 'large';
  logo_position?: 'top-left' | 'top-center' | 'top-right';
  title?: string;
  title_auto_generate?: boolean;
  typography?: {
    font_family?: string;
    font_size_base?: number;
    font_color_primary?: string;
    font_color_secondary?: string;
  };
  color_scheme?: {
    primary?: string;
    secondary?: string;
    background?: string;
  };
}

interface ContentConfig {
  header_image_url?: string | null;
  footer_text?: string;
  modules_to_print?: string[];
  report_mode?: 'resumen' | 'completo' | 'exhaustivo';
  include_chart_images?: boolean;
  include_aspects_table?: boolean;
  include_planetary_table?: boolean;
  language?: string;
  page_size?: 'A4' | 'Letter';
  page_orientation?: 'portrait' | 'landscape';
}

interface AdvancedConfig {
  custom_css?: string | null;
  watermark_text?: string | null;
  encryption_enabled?: boolean;
  password_protected?: boolean;
}

interface Template {
  id: string;
  name: string;
  report_type_id: string;
  report_type_name: string | null;
  owner_id: string;
  is_public: boolean;
  is_default: boolean;
  branding?: BrandingConfig;
  content?: ContentConfig;
  advanced?: AdvancedConfig;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  preview_image_url: string | null;
}

interface ReportType {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  can_access: boolean;
}

interface TemplateManagerProps {
  onChangesMade: () => void;
}

interface TemplateFormData {
  name: string;
  report_type_id: string;
  is_public: boolean;
  branding: BrandingConfig;
  content: ContentConfig;
  advanced: AdvancedConfig;
}

const defaultFormData: TemplateFormData = {
  name: '',
  report_type_id: '',
  is_public: false,
  branding: {
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
  },
  content: {
    header_image_url: null,
    footer_text: '© 2026 Fraktal Astrology',
    modules_to_print: ['modulo_1'],
    report_mode: 'completo',
    include_chart_images: true,
    include_aspects_table: true,
    include_planetary_table: true,
    language: 'es',
    page_size: 'A4',
    page_orientation: 'portrait',
  },
  advanced: {
    custom_css: null,
    watermark_text: null,
    encryption_enabled: false,
    password_protected: false,
  },
};

export default function TemplateManager({ onChangesMade }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLimit, setUserLimit] = useState(5);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
    loadReportTypes();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/templates', {
        params: { include_public: true },
      });
      setTemplates(response.data.templates || []);
      setUserLimit(response.data.user_limit || 5);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const loadReportTypes = async () => {
    try {
      const response = await api.get('/report-types');
      setReportTypes(response.data.report_types || []);
    } catch (err: any) {
      console.error('Error loading report types:', err);
    }
  };

  const handleClone = async (templateId: string) => {
    try {
      await api.post(`/templates/${templateId}/clone`);
      await loadTemplates();
      onChangesMade();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al clonar plantilla');
    }
  };

  const handleDelete = async (templateId: string) => {
    const confirmed = window.confirm('¿Estás seguro de eliminar esta plantilla?');
    if (!confirmed) return;

    try {
      await api.delete(`/templates/${templateId}`);
      await loadTemplates();
      onChangesMade();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar plantilla');
    }
  };

  const handleCreateNew = () => {
    setFormData(defaultFormData);
    setEditingTemplateId(null);
    setModalMode('create');
    setFormError(null);
    setShowModal(true);
  };

  const handleEdit = async (template: Template) => {
    setFormData({
      name: template.name,
      report_type_id: template.report_type_id,
      is_public: template.is_public,
      branding: template.branding || defaultFormData.branding,
      content: template.content || defaultFormData.content,
      advanced: template.advanced || defaultFormData.advanced,
    });
    setEditingTemplateId(template.id);
    setModalMode('edit');
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setFormError('El nombre es obligatorio');
      return;
    }
    if (!formData.report_type_id) {
      setFormError('Debes seleccionar un tipo de informe');
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      if (modalMode === 'create') {
        await api.post('/templates', formData);
      } else if (editingTemplateId) {
        await api.put(`/templates/${editingTemplateId}`, formData);
      }

      setShowModal(false);
      await loadTemplates();
      onChangesMade();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar plantilla');
    } finally {
      setSaving(false);
    }
  };

  const updateFormField = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateBranding = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        [field]: value,
      },
    }));
  };

  const updateTypography = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        typography: {
          ...prev.branding.typography,
          [field]: value,
        },
      },
    }));
  };

  const updateColorScheme = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      branding: {
        ...prev.branding,
        color_scheme: {
          ...prev.branding.color_scheme,
          [field]: value,
        },
      },
    }));
  };

  const updateContent = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        [field]: value,
      },
    }));
  };

  const myTemplates = templates.filter((t) => !t.is_public && !t.is_default);
  const publicTemplates = templates.filter((t) => t.is_public || t.is_default);
  const canCreateMore = userLimit === -1 || myTemplates.length < userLimit;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            Gestor de Plantillas
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Crea y gestiona plantillas de informes personalizadas
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          disabled={!canCreateMore}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
            ${canCreateMore
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
              : 'bg-slate-600 text-slate-400 cursor-not-allowed'
            }
          `}
          title={!canCreateMore ? 'Límite de plantillas alcanzado' : ''}
        >
          <Plus className="w-4 h-4" />
          Nueva Plantilla
        </button>
      </div>

      {/* Usage stats */}
      <div className="bg-slate-700/50 rounded-xl p-4 border border-slate-600">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400">Plantillas creadas</div>
            <div className="text-2xl font-bold text-white">
              {myTemplates.length}
              {userLimit !== -1 && (
                <span className="text-lg text-slate-400 ml-1">/ {userLimit}</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400">Plan actual</div>
            <div className="text-lg font-semibold text-indigo-400">
              {userLimit === -1 ? 'Enterprise' : userLimit === 5 ? 'Premium' : 'Free'}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-400 mt-2">Cargando plantillas...</p>
        </div>
      )}

      {/* My Templates */}
      {!loading && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Mis Plantillas</h4>
          {myTemplates.length === 0 ? (
            <div className="bg-slate-700/30 rounded-xl p-8 border border-slate-600 border-dashed text-center">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">
                Aún no has creado ninguna plantilla personalizada
              </p>
              <button
                onClick={handleCreateNew}
                disabled={!canCreateMore}
                className="mt-4 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Crear mi primera plantilla
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClone={handleClone}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  showDelete={true}
                  showEdit={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Public/Default Templates */}
      {!loading && publicTemplates.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-white mb-4">Plantillas Públicas</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onClone={handleClone}
                onDelete={handleDelete}
                onEdit={handleEdit}
                showDelete={false}
                showEdit={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <h3 className="text-xl font-bold text-white">
                {modalMode === 'create' ? 'Nueva Plantilla' : 'Editar Plantilla'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {formError}
                </div>
              )}

              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Información Básica</h4>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nombre de la Plantilla *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    placeholder="Ej: Mi Plantilla Personalizada"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tipo de Informe *
                  </label>
                  <select
                    value={formData.report_type_id}
                    onChange={(e) => updateFormField('report_type_id', e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar tipo...</option>
                    {reportTypes.map((rt) => (
                      <option key={rt.id} value={rt.id} disabled={!rt.can_access}>
                        {rt.name} {!rt.can_access && '(Plan superior requerido)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => updateFormField('is_public', e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="is_public" className="text-sm text-slate-300">
                    Hacer pública (otros usuarios podrán clonarla)
                  </label>
                </div>
              </div>

              {/* Branding */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Branding</h4>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Título del Informe
                  </label>
                  <input
                    type="text"
                    value={formData.branding.title || ''}
                    onChange={(e) => updateBranding('title', e.target.value)}
                    placeholder="Informe Astrológico Personal"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tamaño del Logo
                    </label>
                    <select
                      value={formData.branding.logo_size || 'medium'}
                      onChange={(e) => updateBranding('logo_size', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="small">Pequeño</option>
                      <option value="medium">Mediano</option>
                      <option value="large">Grande</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Posición del Logo
                    </label>
                    <select
                      value={formData.branding.logo_position || 'top-center'}
                      onChange={(e) => updateBranding('logo_position', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="top-left">Arriba Izquierda</option>
                      <option value="top-center">Arriba Centro</option>
                      <option value="top-right">Arriba Derecha</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Color Primario
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.branding.color_scheme?.primary || '#4f46e5'}
                        onChange={(e) => updateColorScheme('primary', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.branding.color_scheme?.primary || '#4f46e5'}
                        onChange={(e) => updateColorScheme('primary', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Color Secundario
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.branding.color_scheme?.secondary || '#f59e0b'}
                        onChange={(e) => updateColorScheme('secondary', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.branding.color_scheme?.secondary || '#f59e0b'}
                        onChange={(e) => updateColorScheme('secondary', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Color de Fondo
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.branding.color_scheme?.background || '#ffffff'}
                        onChange={(e) => updateColorScheme('background', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.branding.color_scheme?.background || '#ffffff'}
                        onChange={(e) => updateColorScheme('background', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Settings */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-white">Contenido</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Modo del Informe
                    </label>
                    <select
                      value={formData.content.report_mode || 'completo'}
                      onChange={(e) => updateContent('report_mode', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="resumen">Resumen</option>
                      <option value="completo">Completo</option>
                      <option value="exhaustivo">Exhaustivo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tamaño de Página
                    </label>
                    <select
                      value={formData.content.page_size || 'A4'}
                      onChange={(e) => updateContent('page_size', e.target.value)}
                      className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="A4">A4</option>
                      <option value="Letter">Carta (Letter)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Pie de Página
                  </label>
                  <input
                    type="text"
                    value={formData.content.footer_text || ''}
                    onChange={(e) => updateContent('footer_text', e.target.value)}
                    placeholder="© 2026 Tu Marca"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Opciones de Contenido
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.content.include_chart_images !== false}
                        onChange={(e) => updateContent('include_chart_images', e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-300">Imágenes de carta</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.content.include_aspects_table !== false}
                        onChange={(e) => updateContent('include_aspects_table', e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-300">Tabla de aspectos</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.content.include_planetary_table !== false}
                        onChange={(e) => updateContent('include_planetary_table', e.target.checked)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-slate-300">Tabla planetaria</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-4 p-6 border-t border-slate-700 sticky bottom-0 bg-slate-800">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {modalMode === 'create' ? 'Crear Plantilla' : 'Guardar Cambios'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (template: Template) => void;
  showDelete: boolean;
  showEdit: boolean;
}

function TemplateCard({ template, onClone, onDelete, onEdit, showDelete, showEdit }: TemplateCardProps) {
  return (
    <div className="bg-slate-700/50 rounded-xl border border-slate-600 overflow-hidden hover:border-indigo-500/50 transition-colors group">
      {/* Preview image or placeholder */}
      <div className="h-32 bg-slate-800 flex items-center justify-center relative overflow-hidden">
        {template.preview_image_url ? (
          <img
            src={template.preview_image_url}
            alt={template.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileText className="w-12 h-12 text-slate-600" />
        )}
        {template.is_default && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 text-slate-300 text-xs rounded flex items-center gap-1">
            <Star className="w-3 h-3" />
            Por defecto
          </div>
        )}
        {template.is_public && !template.is_default && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-indigo-500/80 text-white text-xs rounded">
            Pública
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h5 className="font-semibold text-white mb-1 truncate">{template.name}</h5>
        <p className="text-xs text-slate-400 mb-3">
          {template.report_type_name || 'Tipo de informe no especificado'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {template.usage_count} usos
          </div>
          {template.last_used_at && (
            <div>
              Último uso: {new Date(template.last_used_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {showEdit && (
            <button
              onClick={() => onEdit(template)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-sm rounded-lg transition-colors"
              title="Editar plantilla"
            >
              <Edit2 className="w-3 h-3" />
              Editar
            </button>
          )}
          <button
            onClick={() => onClone(template.id)}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition-colors"
            title="Clonar plantilla"
          >
            <Copy className="w-3 h-3" />
            Clonar
          </button>
          {showDelete && (
            <button
              onClick={() => onDelete(template.id)}
              className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
