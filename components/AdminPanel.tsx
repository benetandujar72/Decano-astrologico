
import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, Terminal, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { SystemPrompt } from '../types';

interface AdminPanelProps {
  onBack: () => void;
  onUpdatePrompt: (newPrompt: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onBack, onUpdatePrompt }) => {
  const [promptContent, setPromptContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadPrompt();
  }, []);

  const loadPrompt = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemPrompt();
      setPromptContent(data.content);
    } catch (e) {
      setMessage({ type: 'error', text: 'Error cargando el prompt del servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.updateSystemPrompt(promptContent);
      // El backend ya no devuelve el contenido completo, usar el local
      onUpdatePrompt(promptContent); // Actualizar estado global
      setMessage({
        type: 'success',
        text: `Protocolo del sistema actualizado correctamente. (${(updated.content?.length || promptContent.length)} caracteres)`
      });
    } catch (e) {
      console.error('Error guardando prompt:', e);
      setMessage({ type: 'error', text: `Error al guardar cambios: ${e instanceof Error ? e.message : 'Unknown error'}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <div className="w-full max-w-6xl animate-fade-in space-y-4">
        
        {/* Header Admin */}
        <div className="flex items-center justify-between mb-6 border-b border-red-500/30 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg">
              <Terminal size={24} className="text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-mono font-bold text-red-100 tracking-wider">FRAKTAL_ADMIN_CORE</h2>
              <p className="text-xs text-red-400/70 font-mono uppercase">Módulo de Ingeniería de Prompts</p>
            </div>
          </div>
          <button 
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Salir del Modo Root
          </button>
        </div>

        {/* Status Bar */}
        {message && (
          <div className={`p-4 rounded-lg border flex items-center gap-3 animate-fade-in ${
            message.type === 'success' 
              ? 'bg-emerald-900/20 border-emerald-500/30 text-emerald-300' 
              : 'bg-red-900/20 border-red-500/30 text-red-300'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20}/> : <AlertCircle size={20}/>}
            <span className="font-mono text-sm">{message.text}</span>
          </div>
        )}

        {/* Editor */}
        <div className="glass-panel p-1 rounded-xl border border-white/10 shadow-2xl relative">
            <div className="bg-[#0f172a] rounded-lg p-4">
                 <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">System Instruction (Master Prompt)</label>
                    <button onClick={loadPrompt} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        <RefreshCw size={12}/> Recargar DB
                    </button>
                 </div>
                 {loading ? (
                    <div className="h-[60vh] flex items-center justify-center text-gray-500 font-mono animate-pulse">
                        CARGANDO NÚCLEO...
                    </div>
                 ) : (
                    <textarea 
                        value={promptContent}
                        onChange={(e) => setPromptContent(e.target.value)}
                        className="w-full h-[60vh] bg-[#020617] text-gray-300 font-mono text-sm p-4 rounded border border-white/10 focus:border-red-500/50 focus:ring-1 focus:ring-red-900 outline-none resize-none leading-relaxed custom-scrollbar"
                        spellCheck={false}
                    />
                 )}
            </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
            <button 
                onClick={handleSave} 
                disabled={saving || loading}
                className="flex items-center gap-3 px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {saving ? (
                    <>
                        <RefreshCw size={20} className="animate-spin"/>
                        GUARDANDO...
                    </>
                ) : (
                    <>
                        <Save size={20}/>
                        GUARDAR CAMBIOS EN NÚCLEO
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
