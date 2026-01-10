import React, { useState, useEffect } from 'react';
import { Info, RotateCcw, Check, HelpCircle, Settings2, Sparkles, LayoutGrid } from 'lucide-react';

interface OrbMatrix {
    [key: string]: {
        conjunction: number;
        opposition: number;
        square: number;
        trine: number;
        sextile: number;
    };
}

interface LogicSettings {
    houseCorrection: {
        enabled: boolean;
        angularOrb: number;
        otherOrb: number;
    };
    aspects: {
        strategy: 'UMBRELLA_MAX' | 'RECEIVER_PRIORITY';
    };
}

interface UserPreferences {
    activeBodies: string[];
    logicRules: LogicSettings;
    orbMatrix: OrbMatrix;
}

const DEFAULT_ORBS = {
    conjunction: 10,
    opposition: 10,
    square: 8,
    trine: 8,
    sextile: 6
};

const PLANET_DATA: Record<string, { label: string; icon: string; category: string }> = {
    sun: { label: 'Sol', icon: '☉', category: 'Luminaria' },
    moon: { label: 'Luna', icon: '☽', category: 'Luminaria' },
    mercury: { label: 'Mercurio', icon: '☿', category: 'Personal' },
    venus: { label: 'Venus', icon: '♀', category: 'Personal' },
    mars: { label: 'Marte', icon: '♂', category: 'Personal' },
    jupiter: { label: 'Júpiter', icon: '♃', category: 'Social' },
    saturno: { label: 'Saturno', icon: '♄', category: 'Social' },
    uranus: { label: 'Urano', icon: '♅', category: 'Transpersonal' },
    neptune: { label: 'Neptuno', icon: '♆', category: 'Transpersonal' },
    pluto: { label: 'Plutón', icon: '♇', category: 'Transpersonal' },
    chiron: { label: 'Quirón', icon: '⚷', category: 'Puntos Extra' },
    north_node: { label: 'Nodo Norte', icon: '☊', category: 'Puntos Extra' },
    lilith: { label: 'Lilith', icon: '⚸', category: 'Puntos Extra' }
};

const OrbConfigurationPanel: React.FC<{ onSave: (prefs: any) => void }> = ({ onSave }) => {
    const [activeBodies, setActiveBodies] = useState<string[]>(['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
    const [logicRules, setLogicRules] = useState<LogicSettings>({
        houseCorrection: { enabled: true, angularOrb: 2.0, otherOrb: 1.0 },
        aspects: { strategy: 'UMBRELLA_MAX' }
    });
    const [orbMatrix, setOrbMatrix] = useState<OrbMatrix>({});

    useEffect(() => {
        // Inicializar matriz con valores por defecto
        const initialMatrix: OrbMatrix = {};
        activeBodies.forEach(body => {
            initialMatrix[body] = { ...DEFAULT_ORBS };
        });
        setOrbMatrix(initialMatrix);
    }, []);

    const handleToggleBody = (body: string) => {
        setActiveBodies(prev => {
            const next = prev.includes(body) ? prev.filter(b => b !== body) : [...prev, body];

            // Actualizar matriz de orbes
            if (!prev.includes(body)) {
                setOrbMatrix(old => ({ ...old, [body]: { ...DEFAULT_ORBS } }));
            }
            return next;
        });
    };

    const handleOrbChange = (body: string, aspect: keyof typeof DEFAULT_ORBS, value: number) => {
        setOrbMatrix(prev => ({
            ...prev,
            [body]: { ...prev[body], [aspect]: value }
        }));
    };

    const handleApplyToAll = (aspect: keyof typeof DEFAULT_ORBS, value: number) => {
        setOrbMatrix(prev => {
            const next = { ...prev };
            Object.keys(next).forEach(body => {
                next[body][aspect] = value;
            });
            return next;
        });
    };

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <Settings2 className="w-8 h-8 text-indigo-400" />
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Manual de Precisión Fractal v6.0</h2>
                    <p className="text-slate-400 text-sm">Configuración de Orbes y Lógica de Interpretación</p>
                </div>
            </div>

            {/* SECCIÓN 1: SELECTOR DE OBJETOS */}
            <section className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-300">
                    <LayoutGrid className="w-5 h-5" />
                    <h3 className="font-semibold uppercase tracking-wider text-sm">Cuerpos y Puntos Activos</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {Object.entries(PLANET_DATA).map(([id, data]) => (
                        <label key={id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${activeBodies.includes(id)
                                ? 'bg-indigo-500/10 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                                : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={activeBodies.includes(id)}
                                onChange={() => handleToggleBody(id)}
                            />
                            <span className="text-xl opacity-80">{data.icon}</span>
                            <span className="text-sm font-medium">{data.label}</span>
                        </label>
                    ))}
                </div>
            </section>

            {/* SECCIÓN 2: REGLAS DE LÓGICA */}
            <section className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            <span className="font-bold text-slate-200">Corrección de Casas</span>
                        </div>
                        <button
                            onClick={() => setLogicRules(p => ({ ...p, houseCorrection: { ...p.houseCorrection, enabled: !p.houseCorrection.enabled } }))}
                            className={`w-12 h-6 rounded-full transition-colors relative ${logicRules.houseCorrection.enabled ? 'bg-indigo-500' : 'bg-slate-600'}`}
                        >
                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${logicRules.houseCorrection.enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                    </div>
                    {logicRules.houseCorrection.enabled && (
                        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase tracking-tighter">Umbral Angular (1,4,7,10)</label>
                                <input
                                    type="number" step="0.1"
                                    value={logicRules.houseCorrection.angularOrb}
                                    onChange={e => setLogicRules(p => ({ ...p, houseCorrection: { ...p.houseCorrection, angularOrb: parseFloat(e.target.value) } }))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 uppercase tracking-tighter">Umbral Sucedente/Cadente</label>
                                <input
                                    type="number" step="0.1"
                                    value={logicRules.houseCorrection.otherOrb}
                                    onChange={e => setLogicRules(p => ({ ...p, houseCorrection: { ...p.houseCorrection, otherOrb: parseFloat(e.target.value) } }))}
                                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white focus:outline-none focus:border-indigo-500"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-700/50 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-700/50 pb-2">
                        <Info className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold text-slate-200">Estrategia de Aspectos</span>
                    </div>
                    <select
                        value={logicRules.aspects.strategy}
                        onChange={e => setLogicRules(p => ({ ...p, aspects: { strategy: e.target.value as any } }))}
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                    >
                        <option value="UMBRELLA_MAX">Efecto Paraguas (Inclusión Máxima)</option>
                        <option value="RECEIVER_PRIORITY">Prioridad al Receptor (Tránsitos)</option>
                    </select>
                    <p className="text-xs text-slate-500 leading-relaxed italic">
                        * UMBRELLA_MAX: Se usa el orbe más alto de entre los dos planetas implicados.
                    </p>
                </div>
            </section>

            {/* SECCIÓN 3: MATRIZ DE ORBES */}
            <section className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left bg-slate-900/50">
                    <thead>
                        <tr className="bg-slate-800/80 text-slate-300 text-xs uppercase tracking-widest">
                            <th className="p-4 border-b border-slate-700">Planeta / Punto</th>
                            <th className="p-4 border-b border-slate-700 text-rose-300/80">Conjunción</th>
                            <th className="p-4 border-b border-slate-700 text-rose-200/80">Oposición</th>
                            <th className="p-4 border-b border-slate-700 text-rose-100/80">Cuadratura</th>
                            <th className="p-4 border-b border-slate-700 text-emerald-100/80">Trígono</th>
                            <th className="p-4 border-b border-slate-700 text-emerald-200/80">Sextil</th>
                            <th className="p-4 border-b border-slate-700 text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {activeBodies.map(body => (
                            <tr key={body} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="p-4 flex items-center gap-3">
                                    <span className="text-2xl text-indigo-400 drop-shadow-sm">{PLANET_DATA[body]?.icon}</span>
                                    <span className="font-semibold text-slate-300">{PLANET_DATA[body]?.label}</span>
                                </td>
                                {['conjunction', 'opposition', 'square', 'trine', 'sextile'].map(asp => (
                                    <td key={asp} className="p-2">
                                        <input
                                            type="number" step="0.1"
                                            value={orbMatrix[body]?.[asp as keyof typeof DEFAULT_ORBS] || 0}
                                            onChange={e => handleOrbChange(body, asp as any, parseFloat(e.target.value))}
                                            className="w-full max-w-[80px] bg-slate-800/50 border border-slate-700 rounded p-2 text-center text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                                        />
                                    </td>
                                ))}
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => setOrbMatrix(p => ({ ...p, [body]: { ...DEFAULT_ORBS } }))}
                                        className="text-slate-500 hover:text-white transition-colors p-2"
                                        title="Resetear Fila"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <div className="flex justify-between items-center pt-6 border-t border-slate-800">
                <p className="text-slate-500 text-xs italic">* Los orbes se basan en la jerarquía sistémica Core Carutti v6.</p>
                <button
                    onClick={() => onSave({ activeBodies, logicRules, orbMatrix })}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95"
                >
                    <Check className="w-5 h-5" />
                    Aplicar Configuración
                </button>
            </div>
        </div>
    );
};

export default OrbConfigurationPanel;
