import React, { useState, useEffect } from 'react';
import { FileText, Plus, Copy, Trash2, Star, Eye, Download } from 'lucide-react';
import { api } from '../../services/api';

interface Template {
  id: string;
  name: string;
  report_type_id: string;
  report_type_name: string | null;
  owner_id: string;
  is_public: boolean;
  is_default: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  preview_image_url: string | null;
}

interface TemplateManagerProps {
  onChangesMade: () => void;
}

export default function TemplateManager({ onChangesMade }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLimit, setUserLimit] = useState(5);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/templates', {
        params: { include_public: true },
      });
      setTemplates(response.data.templates);
      setUserLimit(response.data.user_limit);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar plantillas');
    } finally {
      setLoading(false);
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
    // Aquí se abriría un modal o navegaría a un formulario de creación
    alert('Funcionalidad de crear plantilla nueva en desarrollo');
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

      {/* My Templates */}
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
                showDelete={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Public/Default Templates */}
      <div>
        <h4 className="text-lg font-semibold text-white mb-4">Plantillas Públicas</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {publicTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClone={handleClone}
              onDelete={handleDelete}
              showDelete={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  showDelete: boolean;
}

function TemplateCard({ template, onClone, onDelete, showDelete }: TemplateCardProps) {
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
