/**
 * TemplateSelector
 *
 * Componente para seleccionar y gestionar plantillas de informes.
 * Permite crear, clonar y personalizar plantillas según el plan del usuario.
 */

import React, { useState, useEffect } from 'react';
import { Layout, Plus, Copy, Star, Lock, Loader2, AlertCircle, Edit2, Trash2 } from 'lucide-react';

// Types
interface BrandingConfig {
    logo_url?: string;
    logo_size: 'small' | 'medium' | 'large';
    title: string;
    title_auto_generate: boolean;
}

interface ContentConfig {
    modules_to_print: string[];
    report_mode: 'resumen' | 'completo' | 'exhaustivo';
    include_chart_images: boolean;
    include_aspects_table: boolean;
    include_planetary_table: boolean;
    language: string;
    page_size: 'A4' | 'Letter';
}

interface Template {
    id: string;
    name: string;
    report_type_id: string;
    report_type_name?: string;
    owner_id: string;
    is_public: boolean;
    is_default: boolean;
    branding: BrandingConfig;
    content: ContentConfig;
    advanced?: any;
    usage_count: number;
    last_used_at?: string;
    created_at: string;
    updated_at: string;
    preview_image_url?: string;
}

interface TemplateSelectorProps {
    reportTypeId: string;
    selectedTemplateId: string | null;
    onSelect: (template: Template | null) => void;
    currentUserPlan?: 'free' | 'premium' | 'enterprise';
    onCreateNew?: () => void;
}

const MODE_LABELS = {
    resumen: { label: 'Resumen', icon: '📝', desc: '~3K palabras' },
    completo: { label: 'Completo', icon: '📄', desc: '~8K palabras' },
    exhaustivo: { label: 'Exhaustivo', icon: '📚', desc: '~15K palabras' }
};

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
    reportTypeId,
    selectedTemplateId,
    onSelect,
    currentUserPlan = 'free',
    onCreateNew
}) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userLimit, setUserLimit] = useState<number>(0);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchTemplates();
    }, [reportTypeId]);

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const params = new URLSearchParams({
                report_type_id: reportTypeId,
                include_public: 'true'
            });

            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/templates?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch templates: ${response.statusText}`);
            }

            const data = await response.json();
            setTemplates(data.templates || []);
            setUserLimit(data.user_limit);

            // Auto-select default template if none selected
            if (!selectedTemplateId && data.templates.length > 0) {
                const defaultTemplate = data.templates.find((t: Template) => t.is_default);
                if (defaultTemplate) {
                    onSelect(defaultTemplate);
                }
            }
        } catch (err) {
            console.error('[TemplateSelector] Error fetching templates:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar plantillas');
        } finally {
            setLoading(false);
        }
    };

    const handleCloneTemplate = async (templateId: string) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/templates/${templateId}/clone`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to clone template');
            }

            await fetchTemplates();
        } catch (err) {
            console.error('[TemplateSelector] Error cloning template:', err);
            alert(err instanceof Error ? err.message : 'Error al clonar plantilla');
        }
    };

    const canCreateTemplates = currentUserPlan !== 'free';
    const userTemplatesCount = templates.filter(t => !t.is_public && !t.is_default).length;
    const canCreateMore = userLimit === -1 || userTemplatesCount < userLimit;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="ml-3 text-slate-400">Cargando plantillas...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-red-400 font-semibold mb-1">Error al cargar plantillas</h3>
                    <p className="text-red-300/70 text-sm">{error}</p>
                    <button
                        onClick={fetchTemplates}
                        className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <Layout className="w-7 h-7 text-indigo-400" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Plantilla de Informe</h2>
                        <p className="text-slate-400 text-sm">
                            Personaliza el estilo y contenido del informe
                            {userLimit > 0 && (
                                <span className="ml-2 text-slate-500">
                                    ({userTemplatesCount}/{userLimit} plantillas)
                                </span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Create New Button */}
                {canCreateTemplates && canCreateMore && onCreateNew && (
                    <button
                        onClick={onCreateNew}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Plantilla
                    </button>
                )}
            </div>

            {/* Upgrade Notice for Free Users */}
            {!canCreateTemplates && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-amber-400 font-semibold mb-1">Plantillas Personalizadas</h4>
                        <p className="text-amber-300/70 text-sm">
                            Actualiza a Premium para crear y personalizar tus propias plantillas de informes.
                        </p>
                    </div>
                </div>
            )}

            {/* No Template Option */}
            <label
                className={`
                    relative group cursor-pointer rounded-xl border p-4 transition-all
                    ${selectedTemplateId === null
                        ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                    }
                `}
            >
                <input
                    type="radio"
                    name="template"
                    className="hidden"
                    checked={selectedTemplateId === null}
                    onChange={() => onSelect(null)}
                />
                <div className="flex items-center gap-3">
                    <div className="text-2xl">📋</div>
                    <div className="flex-1">
                        <h4 className={`font-semibold ${selectedTemplateId === null ? 'text-white' : 'text-slate-200'}`}>
                            Sin Plantilla (Defecto del Sistema)
                        </h4>
                        <p className={`text-sm ${selectedTemplateId === null ? 'text-slate-300' : 'text-slate-400'}`}>
                            Usa la configuración básica sin personalizaciones
                        </p>
                    </div>
                </div>
            </label>

            {/* Templates List */}
            {templates.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                        Plantillas Disponibles
                    </h3>

                    <div className="space-y-2">
                        {templates.map(template => (
                            <div
                                key={template.id}
                                className={`
                                    relative group rounded-xl border p-4 transition-all
                                    ${selectedTemplateId === template.id
                                        ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                                        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                                    }
                                `}
                            >
                                <label className="cursor-pointer">
                                    <input
                                        type="radio"
                                        name="template"
                                        className="hidden"
                                        checked={selectedTemplateId === template.id}
                                        onChange={() => onSelect(template)}
                                    />

                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-start gap-3 flex-1">
                                            {/* Icon/Preview */}
                                            <div className="text-2xl flex-shrink-0">
                                                {template.is_default ? '⭐' : template.is_public ? '🌐' : '📄'}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <h4 className={`font-semibold ${
                                                        selectedTemplateId === template.id ? 'text-white' : 'text-slate-200'
                                                    }`}>
                                                        {template.name}
                                                    </h4>

                                                    {template.is_default && (
                                                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded border border-yellow-500/30">
                                                            DEFECTO
                                                        </span>
                                                    )}
                                                    {template.is_public && (
                                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded border border-green-500/30">
                                                            PÚBLICA
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 text-xs text-slate-400 mb-2">
                                                    <span className="flex items-center gap-1">
                                                        {MODE_LABELS[template.content.report_mode].icon}
                                                        {MODE_LABELS[template.content.report_mode].label}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{template.content.modules_to_print.length} módulos</span>
                                                    <span>•</span>
                                                    <span>{template.content.language.toUpperCase()}</span>
                                                </div>

                                                {template.usage_count > 0 && (
                                                    <p className="text-xs text-slate-500">
                                                        Usado {template.usage_count} {template.usage_count === 1 ? 'vez' : 'veces'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        {!template.is_default && canCreateTemplates && canCreateMore && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleCloneTemplate(template.id);
                                                }}
                                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Clonar plantilla"
                                            >
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {templates.length === 0 && (
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
                    <Layout className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 mb-4">No hay plantillas disponibles para este tipo de informe</p>
                    {canCreateTemplates && onCreateNew && (
                        <button
                            onClick={onCreateNew}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
                        >
                            Crear Primera Plantilla
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TemplateSelector;
