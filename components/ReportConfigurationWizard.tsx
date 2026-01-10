/**
 * ReportConfigurationWizard
 *
 * Wrapper que coordina el flujo completo de configuración y generación de informes:
 * 1. Selección de tipo de informe
 * 2. Selección de plantilla (opcional)
 * 3. Configuración de orbes
 * 4. Generación del informe
 */

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import ReportTypeSelector from './ReportTypeSelector';
import TemplateSelector from './TemplateSelector';
import OrbConfigurationPanel from './OrbConfigurationPanel';
import ReportGenerationWizard from './ReportGenerationWizard';

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
    available_modules: any[];
    default_prompt_id: string | null;
    can_access: boolean;
    has_default_template: boolean;
}

interface Template {
    id: string;
    name: string;
    report_type_id: string;
    report_type_name?: string;
    owner_id: string;
    is_public: boolean;
    is_default: boolean;
    branding: any;
    content: any;
    advanced?: any;
    usage_count: number;
}

interface ReportConfigurationWizardProps {
    cartaData: any;
    nombre: string;
    onClose: () => void;
    onComplete?: (report: string) => void;
    currentUserPlan?: 'free' | 'premium' | 'enterprise';
}

const STEPS = [
    { id: 'type', label: 'Tipo de Informe', icon: '📄' },
    { id: 'template', label: 'Plantilla', icon: '🎨' },
    { id: 'config', label: 'Configuración', icon: '⚙️' },
    { id: 'generate', label: 'Generar', icon: '✨' }
];

const ReportConfigurationWizard: React.FC<ReportConfigurationWizardProps> = ({
    cartaData,
    nombre,
    onClose,
    onComplete,
    currentUserPlan = 'free'
}) => {
    // Step control
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const currentStep = STEPS[currentStepIndex];

    // Selected values
    const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [orbConfig, setOrbConfig] = useState<any>(null);

    // Generation control
    const [startGeneration, setStartGeneration] = useState(false);

    const canGoNext = () => {
        switch (currentStep.id) {
            case 'type':
                return selectedReportType !== null;
            case 'template':
                return true; // Template is optional
            case 'config':
                return orbConfig !== null;
            case 'generate':
                return false; // Can't go forward from last step
            default:
                return false;
        }
    };

    const canGoBack = () => {
        return currentStepIndex > 0 && !startGeneration;
    };

    const handleNext = () => {
        if (canGoNext() && currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        }
    };

    const handleBack = () => {
        if (canGoBack()) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const handleStartGeneration = () => {
        setStartGeneration(true);
    };

    const handleGenerationComplete = (report: string) => {
        if (onComplete) {
            onComplete(report);
        }
    };

    // If generation has started, show only the generation wizard
    if (startGeneration && selectedReportType) {
        return (
            <ReportGenerationWizard
                cartaData={cartaData}
                nombre={nombre}
                reportType={selectedReportType.code}
                profiles={[]}
                onComplete={handleGenerationComplete}
                onClose={onClose}
                autoGenerateAll={true}
            />
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            Configurar Informe Astrológico
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {nombre} • Paso {currentStepIndex + 1} de {STEPS.length}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800/50 rounded-lg"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-800">
                    <div className="flex items-center justify-between">
                        {STEPS.map((step, index) => {
                            const isActive = index === currentStepIndex;
                            const isCompleted = index < currentStepIndex;
                            const isFuture = index > currentStepIndex;

                            return (
                                <React.Fragment key={step.id}>
                                    <div className="flex flex-col items-center gap-2 flex-1">
                                        <div
                                            className={`
                                                w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold transition-all
                                                ${isActive
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 scale-110'
                                                    : isCompleted
                                                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                                                        : 'bg-slate-800 text-slate-600'
                                                }
                                            `}
                                        >
                                            {step.icon}
                                        </div>
                                        <span
                                            className={`
                                                text-xs font-medium text-center
                                                ${isActive ? 'text-white' : isCompleted ? 'text-slate-400' : 'text-slate-600'}
                                            `}
                                        >
                                            {step.label}
                                        </span>
                                    </div>

                                    {index < STEPS.length - 1 && (
                                        <div
                                            className={`
                                                flex-1 h-0.5 mx-2 -mt-8 transition-all
                                                ${isCompleted ? 'bg-indigo-500/30' : 'bg-slate-800'}
                                            `}
                                        />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-900">
                    {currentStep.id === 'type' && (
                        <ReportTypeSelector
                            selectedTypeId={selectedReportType?.id || null}
                            onSelect={setSelectedReportType}
                            currentUserPlan={currentUserPlan}
                        />
                    )}

                    {currentStep.id === 'template' && selectedReportType && (
                        <TemplateSelector
                            reportTypeId={selectedReportType.id}
                            selectedTemplateId={selectedTemplate?.id || null}
                            onSelect={setSelectedTemplate}
                            currentUserPlan={currentUserPlan}
                        />
                    )}

                    {currentStep.id === 'config' && (
                        <OrbConfigurationPanel
                            onSave={(config) => {
                                setOrbConfig(config);
                            }}
                        />
                    )}

                    {currentStep.id === 'generate' && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 space-y-4">
                                <h3 className="text-xl font-bold text-white mb-4">Resumen de Configuración</h3>

                                {/* Report Type */}
                                <div className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                                    <span className="text-3xl">{selectedReportType?.icon}</span>
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold mb-1">Tipo de Informe</h4>
                                        <p className="text-slate-300">{selectedReportType?.name}</p>
                                        <p className="text-slate-500 text-sm">{selectedReportType?.description}</p>
                                    </div>
                                </div>

                                {/* Template */}
                                <div className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                                    <span className="text-3xl">🎨</span>
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold mb-1">Plantilla</h4>
                                        <p className="text-slate-300">
                                            {selectedTemplate?.name || 'Sin plantilla (configuración por defecto)'}
                                        </p>
                                        {selectedTemplate && (
                                            <div className="flex items-center gap-2 mt-2 text-xs">
                                                <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded border border-indigo-500/30">
                                                    {selectedTemplate.content.report_mode.toUpperCase()}
                                                </span>
                                                <span className="text-slate-500">
                                                    {selectedTemplate.content.modules_to_print.length} módulos
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Orb Config */}
                                <div className="flex items-start gap-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                                    <span className="text-3xl">⚙️</span>
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold mb-1">Configuración de Orbes</h4>
                                        <p className="text-slate-300">
                                            {orbConfig?.houseSystem ? `Sistema de casas: ${orbConfig.houseSystem}` : 'Configuración personalizada'}
                                        </p>
                                        {orbConfig && (
                                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                <span>{orbConfig.activeBodies?.length || 0} cuerpos activos</span>
                                                {orbConfig.activeFixedStars?.length > 0 && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{orbConfig.activeFixedStars.length} estrellas fijas</span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Start Generation Button */}
                            <div className="flex justify-center">
                                <button
                                    onClick={handleStartGeneration}
                                    className="
                                        px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600
                                        hover:from-indigo-500 hover:to-purple-500
                                        text-white font-bold text-lg rounded-xl
                                        shadow-xl shadow-indigo-500/30
                                        transition-all active:scale-95
                                        flex items-center gap-3
                                    "
                                >
                                    <span className="text-2xl">✨</span>
                                    Generar Informe Completo
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Navigation */}
                <div className="flex items-center justify-between p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md">
                    <button
                        onClick={handleBack}
                        disabled={!canGoBack()}
                        className={`
                            flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                            ${canGoBack()
                                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                                : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                            }
                        `}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Anterior
                    </button>

                    {currentStep.id !== 'generate' && (
                        <button
                            onClick={handleNext}
                            disabled={!canGoNext()}
                            className={`
                                flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all
                                ${canGoNext()
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                    : 'bg-slate-800/50 text-slate-600 cursor-not-allowed'
                                }
                            `}
                        >
                            Siguiente
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}

                    {currentStep.id === 'config' && !orbConfig && (
                        <button
                            onClick={() => {
                                setOrbConfig({ default: true });
                                handleNext();
                            }}
                            className="text-slate-400 hover:text-white text-sm font-medium underline underline-offset-4"
                        >
                            Omitir y usar valores por defecto
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportConfigurationWizard;
