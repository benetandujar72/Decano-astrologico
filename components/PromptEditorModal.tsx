/**
 * Modal para editar prompts especializados
 */
import React, { useState } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';

interface PromptEditorModalProps {
  prompt: any;
  onClose: () => void;
  onSave: (updatedPrompt: any) => void;
}

const PromptEditorModal: React.FC<PromptEditorModalProps> = ({ prompt, onClose, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: prompt.name || '',
    description: prompt.description || '',
    content: prompt.content || '',
    house_system: prompt.house_system || 'placidus',
    is_public: prompt.is_public || false
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.content.trim()) {
      alert('El contenido del prompt no puede estar vacío');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        name: formData.name,
        type: prompt.type,
        description: formData.description,
        content: formData.content,
        house_system: formData.house_system,
        is_public: formData.is_public
      });
      setEditing(false);
    } catch (error) {
      console.error('Error saving prompt:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="mystic-card max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1">
              {editing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mystic-input text-2xl font-bold w-full"
                  placeholder="Nombre del prompt"
                />
              ) : (
                <h3 className="text-2xl font-bold text-white">{formData.name}</h3>
              )}
              {editing ? (
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mystic-input text-sm mt-2 w-full"
                  placeholder="Descripción breve"
                />
              ) : (
                <p className="text-gray-400 text-sm mt-1">{formData.description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors ml-4"
            >
              <X size={24} />
            </button>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4 border border-indigo-500/30">
              <span className="text-xs text-gray-400">Tipo</span>
              <div className="text-sm text-white mt-1 font-semibold">{prompt.type}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-indigo-500/30">
              <span className="text-xs text-gray-400">Usos</span>
              <div className="text-sm text-white mt-1 font-semibold">{prompt.usage_count || 0}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 border border-indigo-500/30">
              <span className="text-xs text-gray-400">Estado</span>
              <div className="text-sm text-white mt-1 font-semibold">
                {prompt.is_default ? (
                  <span className="text-blue-400">Sistema</span>
                ) : (
                  <span className="text-green-400">Personalizado</span>
                )}
              </div>
            </div>
          </div>

          {/* Configuration */}
          {editing && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Sistema de Casas
                </label>
                <select
                  value={formData.house_system}
                  onChange={(e) => setFormData({ ...formData, house_system: e.target.value })}
                  className="mystic-input w-full"
                >
                  <option value="placidus">Placidus</option>
                  <option value="koch">Koch</option>
                  <option value="equal">Equal</option>
                  <option value="whole_sign">Whole Sign</option>
                  <option value="campanus">Campanus</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Visibilidad
                </label>
                <div className="flex items-center gap-4 mt-3">
                  <label className="flex items-center gap-2 text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Público (visible para todos)</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Warning for editing defaults */}
          {editing && prompt.is_default && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <div className="text-yellow-400 font-semibold text-sm">Editando Prompt del Sistema</div>
                <div className="text-gray-300 text-xs mt-1">
                  Al guardar, se creará una versión personalizada. El prompt original del sistema se mantendrá como respaldo.
                </div>
              </div>
            </div>
          )}

          {/* Content Editor */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-white">
                Contenido del Prompt
              </label>
              <span className="text-xs text-gray-400">
                {formData.content.length} caracteres
              </span>
            </div>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              readOnly={!editing}
              className={`mystic-input font-mono text-sm h-[500px] resize-none w-full ${
                editing ? 'border-indigo-500' : ''
              }`}
              placeholder="Contenido del prompt..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div>
              {editing && (
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: prompt.name || '',
                      description: prompt.description || '',
                      content: prompt.content || '',
                      house_system: prompt.house_system || 'placidus',
                      is_public: prompt.is_public || false
                    });
                  }}
                  className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                >
                  Cancelar Edición
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {!editing ? (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="mystic-button flex items-center gap-2"
                  >
                    <Save size={16} />
                    Editar Prompt
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.content.trim()}
                  className="mystic-button flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptEditorModal;

