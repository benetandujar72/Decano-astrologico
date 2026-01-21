/**
 * ReportTypeSelector
 *
 * Componente para seleccionar el tipo de informe astrológico a generar.
 * Muestra todos los tipos disponibles según el plan del usuario.
 */

import React, { useState, useEffect } from 'react';
import { FileText, Lock, Sparkles, Star, Crown, Loader2, AlertCircle } from 'lucide-react';

// Types
interface ModuleDefinition {
    id: string;
    name: string;
    required: boolean;
    estimated_duration_sec: number;
}

interface ReportType {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: 'individual' | 'infantil' | 'sistemico' | 'clinico';
    folder_path: string;
    min_plan_required: 'free' | 'premium' | 'enterprise';
    is_active: boolean;
    is_beta: boolean;
    available_modules: ModuleDefinition[];
    default_prompt_id: string | null;
    can_access: boolean;
    has_default_template: boolean;
    created_at: string;
    updated_at: string;
    version: number;
}

interface ReportTypeSelectorProps {
    selectedTypeId: string | null;
    onSelect: (reportType: ReportType) => void;
    currentUserPlan?: 'free' | 'premium' | 'enterprise';
    category?: 'individual' | 'infantil' | 'sistemico' | 'clinico';
}

// Category metadata
const CATEGORY_METADATA = {
    individual: { label: 'Individual', icon: '👤', color: 'indigo' },
    infantil: { label: 'Infantil', icon: '👶', color: 'pink' },
    sistemico: { label: 'Sistémico', icon: '👥', color: 'purple' },
    clinico: { label: 'Clínico', icon: '⚕️', color: 'cyan' }
};

// Plan badge colors
const PLAN_BADGE_COLORS = {
    free: 'bg-slate-600 text-slate-200',
    premium: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    enterprise: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
};

const ReportTypeSelector: React.FC<ReportTypeSelectorProps> = ({
    selectedTypeId,
    onSelect,
    currentUserPlan = 'free',
    category
}) => {
    const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(category || null);

    useEffect(() => {
        fetchReportTypes();
    }, [selectedCategory]);

    const fetchReportTypes = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            const params = new URLSearchParams();
            if (selectedCategory) {
                params.append('category', selectedCategory);
            }

            const response = await fetch(
                `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/report-types?${params}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch report types: ${response.statusText}`);
            }

            const data = await response.json();
            setReportTypes(data.report_types || []);
        } catch (err) {
            console.error('[ReportTypeSelector] Error fetching report types:', err);
            setError(err instanceof Error ? err.message : 'Error al cargar tipos de informe');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (reportType: ReportType) => {
        if (!reportType.can_access) {
            // Show upgrade prompt
            return;
        }
        onSelect(reportType);
    };

    const renderPlanBadge = (plan: 'free' | 'premium' | 'enterprise') => {
        const icons = {
            free: <Sparkles className="w-3 h-3" />,
            premium: <Star className="w-3 h-3" />,
            enterprise: <Crown className="w-3 h-3" />
        };

        const labels = {
            free: 'FREE',
            premium: 'PREMIUM',
            enterprise: 'ENTERPRISE'
        };

        return (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold ${PLAN_BADGE_COLORS[plan]}`}>
                {icons[plan]}
                {labels[plan]}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <span className="ml-3 text-slate-400">Cargando tipos de informe...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                    <h3 className="text-red-400 font-semibold mb-1">Error al cargar tipos de informe</h3>
                    <p className="text-red-300/70 text-sm">{error}</p>
                    <button
                        onClick={fetchReportTypes}
                        className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    if (reportTypes.length === 0) {
        return (
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-8 text-center">
                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay tipos de informe disponibles</p>
            </div>
        );
    }

    // Group by category
    const groupedTypes = reportTypes.reduce((acc, type) => {
        if (!acc[type.category]) {
            acc[type.category] = [];
        }
        acc[type.category].push(type);
        return acc;
    }, {} as Record<string, ReportType[]>);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                    <FileText className="w-7 h-7 text-indigo-400" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Tipo de Informe</h2>
                        <p className="text-slate-400 text-sm">Selecciona el tipo de análisis que deseas generar</p>
                    </div>
                </div>
            </div>

            {/* Category Filter (if no category prop provided) */}
            {!category && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                            selectedCategory === null
                                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                        }`}
                    >
                        Todos
                    </button>
                    {Object.entries(CATEGORY_METADATA).map(([key, meta]) => (
                        <button
                            key={key}
                            onClick={() => setSelectedCategory(key)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                                selectedCategory === key
                                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                            }`}
                        >
                            <span>{meta.icon}</span>
                            {meta.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Report Types Grid */}
            <div className="space-y-6">
                {Object.entries(groupedTypes).map(([categoryKey, types]) => {
                    const categoryMeta = CATEGORY_METADATA[categoryKey as keyof typeof CATEGORY_METADATA];

                    return (
                        <div key={categoryKey} className="space-y-3">
                            {/* Category Header */}
                            <div className="flex items-center gap-2 text-slate-300 border-b border-slate-800/50 pb-2">
                                <span className="text-xl">{categoryMeta?.icon || '📄'}</span>
                                <h3 className="font-semibold uppercase tracking-wider text-sm">
                                    {categoryMeta?.label || categoryKey}
                                </h3>
                                <span className="text-xs text-slate-500 ml-1">({types.length})</span>
                            </div>

                            {/* Types List */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {types.map(type => (
                                    <label
                                        key={type.id}
                                        className={`
                                            relative group cursor-pointer rounded-xl border p-4 transition-all
                                            ${selectedTypeId === type.id
                                                ? 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                                                : type.can_access
                                                    ? 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800/50'
                                                    : 'bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed'
                                            }
                                        `}
                                    >
                                        <input
                                            type="radio"
                                            name="report-type"
                                            className="hidden"
                                            checked={selectedTypeId === type.id}
                                            onChange={() => handleSelect(type)}
                                            disabled={!type.can_access}
                                        />

                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1">
                                                {/* Icon */}
                                                <div className={`
                                                    text-3xl flex-shrink-0
                                                    ${!type.can_access ? 'opacity-50' : ''}
                                                `}>
                                                    {type.icon || '📄'}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <h4 className={`font-semibold ${
                                                            selectedTypeId === type.id ? 'text-white' : 'text-slate-200'
                                                        }`}>
                                                            {type.name}
                                                        </h4>
                                                        {type.is_beta && (
                                                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs font-bold rounded border border-purple-500/30">
                                                                BETA
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className={`text-sm mb-2 line-clamp-2 ${
                                                        selectedTypeId === type.id ? 'text-slate-300' : 'text-slate-400'
                                                    }`}>
                                                        {type.description}
                                                    </p>

                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {renderPlanBadge(type.min_plan_required)}

                                                        <span className="text-xs text-slate-500">
                                                            {type.available_modules.length} módulos
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Lock icon for inaccessible types */}
                                            {!type.can_access && (
                                                <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" />
                                            )}
                                        </div>

                                        {/* Upgrade prompt */}
                                        {!type.can_access && (
                                            <div className="mt-3 pt-3 border-t border-slate-800">
                                                <p className="text-xs text-amber-400/80">
                                                    ⬆️ Actualiza a {type.min_plan_required.toUpperCase()} para acceder
                                                </p>
                                            </div>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ReportTypeSelector;
