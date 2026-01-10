import React, { useState, useEffect } from 'react';
import { Sparkles, Save, Plus, Trash2, Copy, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

interface Prompt {
  id: string;
  prompt_id: string;
  name: string;
  type: string;
  description: string;
  content: string;
  is_default: boolean;
  created_by: string;
  usage_count?: number;
  rating?: number;
}

interface PromptEditorProps {
  onChangesMade: () => void;
}

const PROMPT_TYPES = [
  { value: 'natal_analysis', label: 'Análisis Natal', description: 'Interpretación de carta natal básica' },
  { value: 'houses_analysis', label: 'Análisis de Casas', description: 'Interpretación detallada de casas' },
  { value: 'aspects_analysis', label: 'Análisis de Aspectos', description: 'Interpretación de aspectos planetarios' },
  { value: 'transits_analysis', label: 'Análisis de Tránsitos', description: 'Interpretación de tránsitos actuales' },
  { value: 'progressions_analysis', label: 'Progresiones', description: 'Interpretación de progresiones' },
  { value: 'synastry_analysis', label: 'Sinastría', description: 'Compatibilidad entre cartas' },
  { value: 'custom', label: 'Personalizado', description: 'Prompt personalizado' },
];

export default function PromptEditor({ onChangesMade }: PromptEditorProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    type: 'natal_analysis',
    description: '',
    content: '',
  });

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/config/prompts/specialized');
      setPrompts(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar prompts');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = async (type: string) => {
    try {
      const response = await api.get(`/config/prompts/specialized/${type}`);
      setSelectedPrompt(response.data);
      setEditForm({
        name: response.data.name,
        type: response.data.type,
        description: response.data.description || '',
        content: response.data.content,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar prompt');
    }
  };

  const handleCreateNew = () => {
    setSelectedPrompt(null);
    setEditForm({
      name: '',
      type: 'custom',
      description: '',
      content: '',
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setError(null);
    try {
      if (selectedPrompt && !selectedPrompt.is_default) {
        // Update existing custom prompt
        await api.put(`/config/prompts/specialized/${selectedPrompt.id}`, {
          ...editForm,
          prompt_id: `custom_${editForm.type}_${Date.now()}`,
          is_public: false,
          is_default: false,
        });
      } else {
        // Create new custom prompt
        await api.post('/config/prompts/specialized', {
          ...editForm,
          prompt_id: `custom_${editForm.type}_${Date.now()}`,
          is_public: false,
          is_default: false,
        });
      }
      await loadPrompts();
      setEditing(false);
      onChangesMade();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar prompt');
    }
  };

  const handleDelete = async () => {
    if (!selectedPrompt || selectedPrompt.is_default) return;

    const confirmed = window.confirm('¿Estás seguro de eliminar este prompt personalizado?');
    if (!confirmed) return;

    try {
      await api.delete(`/config/prompts/specialized/${selectedPrompt.id}`);
      await loadPrompts();
      setSelectedPrompt(null);
      setEditing(false);
      onChangesMade();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar prompt');
    }
  };

  const handleDuplicate = () => {
    if (!selectedPrompt) return;
    setEditForm({
      name: `${selectedPrompt.name} (Copia)`,
      type: selectedPrompt.type,
      description: selectedPrompt.description,
      content: selectedPrompt.content,
    });
    setSelectedPrompt(null);
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            Editor de Prompts
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            Personaliza los prompts que se utilizan para generar los informes
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Crear Nuevo
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-red-300 font-medium">Error</div>
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prompt Types List */}
        <div className="bg-slate-700/50 rounded-xl p-6 border border-slate-600">
          <h4 className="text-lg font-semibold text-white mb-4">Tipos de Prompt</h4>
          <div className="space-y-2">
            {PROMPT_TYPES.map((type) => {
              const customPrompt = prompts.find((p) => p.type === type.value && !p.is_default);
              const hasCustom = !!customPrompt;

              return (
                <button
                  key={type.value}
                  onClick={() => handleSelectPrompt(type.value)}
                  className={`
                    w-full text-left p-3 rounded-lg transition-colors border
                    ${selectedPrompt?.type === type.value
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                      : 'bg-slate-600/50 border-slate-600 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{type.description}</div>
                    </div>
                    {hasCustom && (
                      <div className="w-2 h-2 bg-indigo-400 rounded-full" title="Personalizado" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom prompts */}
          <div className="mt-6 pt-6 border-t border-slate-600">
            <h5 className="text-sm font-semibold text-slate-300 mb-2">
              Tus Prompts ({prompts.filter((p) => !p.is_default).length})
            </h5>
            <div className="text-xs text-slate-400">
              Plan Premium: hasta 10 prompts personalizados
            </div>
          </div>
        </div>

        {/* Prompt Editor */}
        <div className="lg:col-span-2 bg-slate-700/50 rounded-xl p-6 border border-slate-600">
          {selectedPrompt || editing ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-white">
                  {editing ? (selectedPrompt ? 'Editar Prompt' : 'Nuevo Prompt') : 'Detalles del Prompt'}
                </h4>
                <div className="flex items-center gap-2">
                  {selectedPrompt && !selectedPrompt.is_default && !editing && (
                    <>
                      <button
                        onClick={handleDuplicate}
                        className="p-2 hover:bg-slate-600 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleDelete}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditing(true)}
                        className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm"
                      >
                        Editar
                      </button>
                    </>
                  )}
                  {selectedPrompt?.is_default && !editing && (
                    <button
                      onClick={handleDuplicate}
                      className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors text-sm"
                    >
                      Crear Copia Personalizada
                    </button>
                  )}
                </div>
              </div>

              {/* Info badges */}
              <div className="flex gap-2">
                {selectedPrompt?.is_default && (
                  <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                    Por defecto
                  </span>
                )}
                {selectedPrompt && !selectedPrompt.is_default && (
                  <span className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded">
                    Personalizado
                  </span>
                )}
                {selectedPrompt?.usage_count !== undefined && (
                  <span className="px-2 py-1 bg-slate-600 text-slate-300 text-xs rounded">
                    {selectedPrompt.usage_count} usos
                  </span>
                )}
              </div>

              {editing ? (
                <>
                  {/* Edit Form */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Nombre del Prompt
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Análisis Natal Profundo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Tipo
                    </label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {PROMPT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Descripción
                    </label>
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Describe brevemente este prompt..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Contenido del Prompt
                    </label>
                    <textarea
                      value={editForm.content}
                      onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      rows={16}
                      className="w-full px-4 py-3 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                      placeholder="Escribe aquí el prompt que se usará para generar el contenido..."
                    />
                    <p className="text-xs text-slate-400 mt-2">
                      Puedes usar variables como {'{nombre}'}, {'{fecha_nacimiento}'}, {'{planetas}'}, etc.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-600">
                    <button
                      onClick={handleSave}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Guardar Prompt
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        if (!selectedPrompt) {
                          setEditForm({ name: '', type: 'natal_analysis', description: '', content: '' });
                        }
                      }}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* View Mode */}
                  <div>
                    <div className="text-sm font-medium text-slate-300 mb-1">Nombre</div>
                    <div className="text-white">{selectedPrompt?.name}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-300 mb-1">Descripción</div>
                    <div className="text-slate-400">{selectedPrompt?.description || 'Sin descripción'}</div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-slate-300 mb-2">Contenido</div>
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-600 overflow-auto max-h-96">
                      <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono">
                        {selectedPrompt?.content}
                      </pre>
                    </div>
                  </div>

                  {selectedPrompt?.created_by && (
                    <div className="text-xs text-slate-400">
                      Creado por: {selectedPrompt.created_by}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="w-16 h-16 text-slate-600 mb-4" />
              <h4 className="text-lg font-semibold text-white mb-2">
                Selecciona un tipo de prompt
              </h4>
              <p className="text-slate-400 max-w-md">
                Selecciona un tipo de prompt de la lista para ver o editar su contenido, o crea uno nuevo personalizado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-indigo-400" />
          Sobre los Prompts Personalizados
        </h4>
        <div className="space-y-2 text-sm text-slate-300">
          <p>
            • Los prompts controlan cómo se genera el contenido de cada sección del informe
          </p>
          <p>
            • Puedes crear copias personalizadas de los prompts por defecto y modificarlas según tus necesidades
          </p>
          <p>
            • Los prompts personalizados solo están disponibles para ti (a menos que los marques como públicos)
          </p>
          <p>
            • Requiere plan <span className="text-indigo-400 font-semibold">Premium</span> o superior para crear prompts personalizados
          </p>
        </div>
      </div>
    </div>
  );
}
