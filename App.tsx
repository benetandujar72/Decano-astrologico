import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Sparkles,
  Activity, 
  Database,
  ChevronRight,
  ChevronLeft,
  Download,
  Search,
  CheckCircle2,
  CircleDashed,
  AlertCircle,
  Binary,
  ArrowRight,
  Brain,
  ScrollText,
  MessageSquare,
  Globe2,
  Moon,
  Sun,
  Layout
} from 'lucide-react';
import { SYSTEM_INSTRUCTION, TRANSLATIONS } from './constants';
import { AppMode, UserInput, AnalysisResult, AnalysisType, Language } from './types';
import RadialChart from './components/RadialChart';
import PlanetaryTable from './components/PlanetaryTable';
import CosmicLoader from './components/CosmicLoader';

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('es');
  const [mode, setMode] = useState<AppMode>(AppMode.INPUT);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(AnalysisType.PSYCHOLOGICAL);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  
  // 0 = Dashboard Técnico
  // 1...N = Bloques
  // N+1 = Final
  const [resultStep, setResultStep] = useState<number>(0);

  const [userInput, setUserInput] = useState<UserInput>({
    name: '',
    date: '',
    time: '',
    place: '',
    context: ''
  });
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const stepIntervalRef = useRef<number | null>(null);

  // Translations convenience
  const t = TRANSLATIONS[lang];

  const startProgressSimulation = () => {
    setCurrentStepIndex(0);
    setErrorMsg('');
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);

    stepIntervalRef.current = window.setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < t.processingSteps.length - 1) return prev + 1;
        return prev;
      });
    }, 2500); 
  };

  const stopProgressSimulation = () => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  };

  const handleAnalyze = async () => {
    setMode(AppMode.PROCESSING);
    startProgressSimulation();
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const typePrompt = analysisType === AnalysisType.PSYCHOLOGICAL 
        ? "ENFOQUE: ANÁLISIS PSICOLÓGICO Y EVOLUTIVO (Prioridad: Jung, Naranjo, Carutti). Profundiza en traumas, talentos y propósito."
        : "ENFOQUE: AUDITORÍA TÉCNICA DE LA CARTA (Prioridad: Aspectos, Regencias, Casas, Dignidades).";

      const contextPrompt = userInput.context 
        ? `CONTEXTO ADICIONAL DEL USUARIO: "${userInput.context}". Asegúrate de responder a esto dentro de los bloques pertinentes.`
        : "Sin contexto adicional.";

      // Map language code to full language name for prompt
      const langMap: Record<Language, string> = {
        es: "ESPAÑOL (CASTELLANO)",
        ca: "CATALÁN (CATALÀ)",
        eu: "EUSKERA (BASQUE)"
      };

      const prompt = `
        EJECUTAR PROTOCOLO "DECANO" PARA:
        Sujeto: ${userInput.name}
        Nacimiento: ${userInput.date} a las ${userInput.time}
        Lugar: ${userInput.place}
        
        ${typePrompt}
        ${contextPrompt}
        
        INSTRUCCIÓN DE IDIOMA (CRÍTICO):
        EL JSON DE SALIDA DEBE ESTAR COMPLETAMENTE TRADUCIDO AL: ${langMap[lang]}.
        ESTO INCLUYE TÍTULOS DE BLOQUES, CONTENIDO (TESIS/AUDITORÍA/SÍNTESIS), SIGNOS DEL ZODÍACO, NOMBRES DE PLANETAS Y ELEMENTOS.
        
        INSTRUCCIONES DE FORMATO JSON:
        1. Genera un informe agrupando los 28 bloques lógicos en MÁXIMO 5 "MEGA-BLOQUES".
        2. IMPORTANTE: USA COMILLAS SIMPLES (') para énfasis.
        3. NO incluyas markdown.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      });

      const text = response.text;
      if (!text) throw new Error("La API no devolvió texto.");
      
      let cleanText = text.trim();
      cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const startIndex = cleanText.indexOf('{');
      const endIndex = cleanText.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) throw new Error("Error en formato JSON.");
      
      const jsonString = cleanText.substring(startIndex, endIndex + 1);
      const data = JSON.parse(jsonString);

      if (!data.positions || !data.blocks) throw new Error("Estructura incompleta.");

      setAnalysisResult({
        metadata: {
          name: userInput.name,
          birthDate: userInput.date,
          birthTime: userInput.time,
          birthPlace: userInput.place
        },
        ...data
      });
      
      stopProgressSimulation();
      setCurrentStepIndex(t.processingSteps.length); 
      
      setTimeout(() => {
        setMode(AppMode.RESULTS);
        setResultStep(0); 
      }, 1000);

    } catch (error: any) {
      console.error("Error:", error);
      stopProgressSimulation();
      setErrorMsg(error.message || "Error desconocido.");
    }
  };

  const downloadHTML = () => {
    if (!analysisResult) return;
    
    // Helper simple replacement logic
    const htmlContent = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <title>Report: ${analysisResult.metadata.name}</title>
    <style>
        body { font-family: 'Georgia', serif; background: #0f172a; color: #e2e8f0; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
        h1 { color: #fbbf24; border-bottom: 1px solid #334155; padding-bottom: 20px; }
        h2 { color: #818cf8; margin-top: 40px; }
        .box { background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1); }
        .meta { font-family: monospace; color: #94a3b8; font-size: 0.9em; }
        .quote { font-style: italic; text-align: center; margin-top: 50px; color: #fbbf24; }
    </style>
</head>
<body>
    <h1>${analysisResult.metadata.name}</h1>
    <div class="meta">
        ${analysisResult.metadata.birthDate} | ${analysisResult.metadata.birthTime} | ${analysisResult.metadata.birthPlace}
    </div>
    
    ${analysisResult.blocks.map(block => `
        <h2>${block.title}</h2>
        <div class="box">
            <strong>${t.blockThesis}:</strong><br/>${block.thesis}<br/><br/>
            <strong>${t.blockAudit}:</strong> ${block.audit}<br/><br/>
            <em>${t.blockSynthesis}:</em><br/>${block.synthesis}
        </div>
    `).join('')}
    
    <div class="quote">"${analysisResult.footerQuote}"</div>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `REPORT_${analysisResult.metadata.name.replace(/\s+/g, '_').toUpperCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- COMPONENTS ---

  const Header = () => (
    <div className="flex justify-between items-center mb-8 px-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/30">
          <Sparkles size={20} />
        </div>
        <div>
          <h1 className="text-xl font-serif text-white tracking-wide">{t.appTitle}</h1>
          <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{t.appSubtitle}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {(['es', 'ca', 'eu'] as Language[]).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
              lang === l 
              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' 
              : 'text-gray-500 border-transparent hover:bg-white/5'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );

  const renderInput = () => (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px]"></div>
      </div>
      
      <div className="glass-panel w-full max-w-lg p-8 rounded-2xl shadow-2xl relative z-10 animate-slide-up">
        <Header />

        <form onSubmit={(e) => { e.preventDefault(); setMode(AppMode.MODE_SELECTION); }} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputName}</label>
              <input required type="text" value={userInput.name} onChange={e => setUserInput({...userInput, name: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-gray-600" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputDate}</label>
                 <input required type="date" value={userInput.date} onChange={e => setUserInput({...userInput, date: e.target.value})} 
                   className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-sm" />
               </div>
               <div>
                 <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputTime}</label>
                 <input required type="time" value={userInput.time} onChange={e => setUserInput({...userInput, time: e.target.value})} 
                   className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all text-sm" />
               </div>
            </div>

            <div>
              <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputPlace}</label>
              <div className="relative">
                <input required type="text" value={userInput.place} onChange={e => setUserInput({...userInput, place: e.target.value})} 
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white pl-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-gray-600" />
                <Search className="absolute left-3 top-3.5 text-gray-500" size={16} />
              </div>
            </div>

            <div>
              <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1 flex items-center gap-2">
                {t.inputContext}
              </label>
              <textarea 
                rows={2}
                value={userInput.context}
                onChange={e => setUserInput({...userInput, context: e.target.value})}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none resize-none placeholder:text-gray-600"
                placeholder={t.inputContextPlaceholder}
              />
            </div>
          </div>

          <button type="submit" className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group">
            {t.btnNext} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        </form>
      </div>
    </div>
  );

  const renderModeSelection = () => (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="w-full max-w-4xl animate-fade-in z-10">
        <div className="mb-8 flex justify-center">
             <h2 className="text-xl text-white/80 font-serif border-b border-white/10 pb-2 px-8">{t.selectProtocol}</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Opción Psicológica */}
          <button 
            onClick={() => { setAnalysisType(AnalysisType.PSYCHOLOGICAL); handleAnalyze(); }}
            className="group glass-panel p-8 rounded-2xl text-left transition-all hover:bg-slate-800/80 hover:border-indigo-500/40 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <Brain size={28} />
            </div>
            <h3 className="text-2xl text-white font-serif mb-3">{t.modePsyTitle}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 font-light">
              {t.modePsyDesc}
            </p>
            <div className="flex items-center text-indigo-300 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
              {t.btnAnalyze} <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform"/>
            </div>
          </button>

          {/* Opción Técnica */}
          <button 
            onClick={() => { setAnalysisType(AnalysisType.TECHNICAL); handleAnalyze(); }}
            className="group glass-panel p-8 rounded-2xl text-left transition-all hover:bg-slate-800/80 hover:border-emerald-500/40 relative overflow-hidden"
          >
             <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Layout size={28} />
            </div>
            <h3 className="text-2xl text-white font-serif mb-3">{t.modeTechTitle}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 font-light">
               {t.modeTechDesc}
            </p>
            <div className="flex items-center text-emerald-300 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
              {t.btnAnalyze} <ArrowRight size={14} className="ml-2 group-hover:translate-x-2 transition-transform"/>
            </div>
          </button>
        </div>

        <button onClick={() => setMode(AppMode.INPUT)} className="mt-8 mx-auto flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors text-sm">
            <ChevronLeft size={16}/> {t.btnNew}
        </button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative font-mono">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl items-center z-10">
        <div className="flex flex-col items-center justify-center order-2 md:order-1">
          <div className="scale-125 mb-10"><CosmicLoader /></div>
          <h2 className="text-xl text-white font-bold mb-2 tracking-[0.2em] text-center">
            {t.processingSteps[Math.min(currentStepIndex, t.processingSteps.length - 1)]}
          </h2>
        </div>
        
        <div className="glass-panel rounded-xl p-8 order-1 md:order-2 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse"></div>
          <div className="space-y-5">
            {t.processingSteps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex; const isActive = idx === currentStepIndex;
              if (idx > currentStepIndex + 2 || idx < currentStepIndex - 2) return null; // Focus view
              return (
                <div key={idx} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'translate-x-4 opacity-100 scale-105' : 'opacity-40'}`}>
                  <div className="shrink-0">
                    {isCompleted ? <CheckCircle2 size={16} className="text-emerald-400" /> : 
                     isActive ? <CircleDashed size={16} className="text-indigo-400 animate-spin" /> : 
                     <div className="w-4 h-4 rounded-full border border-gray-700" />}
                  </div>
                  <span className={`text-xs ${isActive ? 'text-indigo-200 font-bold' : 'text-gray-400'}`}>{step}</span>
                </div>
              );
            })}
          </div>
          {errorMsg && <div className="mt-6 p-4 bg-red-900/20 border border-red-500/20 rounded text-red-200 text-xs flex gap-3 items-center"><AlertCircle size={20}/> {errorMsg} <button onClick={() => setMode(AppMode.INPUT)} className="ml-auto underline font-bold">RETRY</button></div>}
        </div>
      </div>
    </div>
  );

  const renderDashboardTechnical = () => {
    if (!analysisResult) return null;
    return (
      <div className="animate-fade-in space-y-8 pb-12">
        <div className="text-center mb-10 pt-4">
          <h2 className="text-3xl font-serif text-white mb-2">
            {t.resultsTitle}
          </h2>
          <p className="text-gem-accent font-mono text-xs uppercase tracking-widest">{t.resultsSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-panel rounded-2xl p-1 overflow-hidden">
            <div className="bg-white/5 px-6 py-4 flex items-center gap-2">
               <Database size={16} className="text-gem-gold"/>
               <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{t.tabStructure}</span>
            </div>
            <div className="p-6">
                <PlanetaryTable positions={analysisResult.positions} lang={lang} />
            </div>
          </div>
          
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center items-center relative min-h-[300px]">
             <RadialChart data={analysisResult.elementalBalance} title={t.chartTitle} />
          </div>
        </div>

        <div className="flex justify-center mt-12">
          <button 
            onClick={() => setResultStep(1)}
            className="group relative px-10 py-5 bg-white text-black font-bold rounded-xl transition-all hover:bg-indigo-50 shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center gap-4 overflow-hidden"
          >
            <Binary size={20} className="text-indigo-900"/>
            <span className="tracking-widest">{t.btnNext.toUpperCase()}</span>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    );
  };

  const renderAnalysisBlock = (blockIndex: number) => {
    if (!analysisResult) return null;
    const block = analysisResult.blocks[blockIndex];
    const isLastBlock = blockIndex === analysisResult.blocks.length - 1;

    return (
      <div className="animate-fade-in max-w-4xl mx-auto pb-20 pt-4">
        {/* Header del Bloque */}
        <div className="flex items-center gap-4 mb-8">
             <div className="w-12 h-12 glass-panel rounded-xl flex items-center justify-center text-white font-mono text-lg border border-white/10 shadow-lg">
               {blockIndex + 1}
             </div>
             <div>
               <h3 className="text-xs text-indigo-400 font-bold uppercase tracking-widest mb-1">{block.id}</h3>
               <h2 className="text-2xl md:text-3xl text-white font-serif">{block.title}</h2>
             </div>
        </div>

        <div className="space-y-8">
            {/* 1. TESIS TÉCNICA (Academic) */}
            <div className="glass-panel p-8 rounded-2xl border-l-4 border-indigo-500">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Brain size={16}/> {t.blockThesis}
            </h4>
            <div className="prose prose-invert prose-p:text-slate-300 prose-p:leading-relaxed max-w-none font-serif text-justify text-lg">
                {block.thesis}
            </div>
            </div>

            {/* 2. AUDITORÍA (Validation) */}
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-xl flex items-start gap-4">
            <Activity size={20} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">{t.blockAudit}</h4>
                <p className="text-sm text-emerald-100/80 font-mono leading-relaxed">{block.audit}</p>
            </div>
            </div>

            {/* 3. SÍNTESIS HUMANA (Translation) */}
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare size={16}/> {t.blockSynthesis}
            </h4>
            <div className="prose prose-invert prose-p:text-slate-200 prose-p:leading-8 max-w-none text-lg">
                {block.synthesis}
            </div>
            </div>
        </div>

        {/* Controles */}
        <div className="flex justify-between mt-16 border-t border-white/5 pt-8">
          <button 
            onClick={() => setResultStep(prev => prev - 1)}
            className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest"
          >
            <ChevronLeft size={16} /> {t.btnNew}
          </button>

          <button 
            onClick={() => setResultStep(prev => prev + 1)}
            className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/25"
          >
            {isLastBlock ? t.btnNext : t.btnNext} 
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderFinalScreen = () => {
    if (!analysisResult) return null;
    return (
      <div className="animate-fade-in text-center max-w-3xl mx-auto py-12">
        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white mb-10 shadow-[0_0_50px_rgba(99,102,241,0.4)]">
          <Sparkles size={40} />
        </div>
        
        <h2 className="text-4xl font-serif text-white mb-6">{t.resultsTitle}</h2>
        
        <div className="glass-panel rounded-xl p-10 mb-12 relative mx-4">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#020617] px-4 text-xs text-indigo-400 uppercase tracking-widest border border-indigo-900/50 rounded-full py-1">
            Gem Core V4.0
          </div>
          <p className="text-2xl font-serif italic text-indigo-200 leading-relaxed">
            "{analysisResult.footerQuote}"
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
          <button onClick={downloadHTML} className="px-8 py-4 bg-white text-black hover:bg-gray-100 rounded-lg font-bold flex items-center justify-center gap-3 transition-colors shadow-lg">
            <Download size={20} /> {t.btnDownload}
          </button>
          <button onClick={() => setMode(AppMode.INPUT)} className="px-8 py-4 border border-white/10 hover:bg-white/5 text-slate-300 rounded-lg font-medium transition-colors">
            {t.btnNew}
          </button>
        </div>
      </div>
    );
  };

  const renderResults = () => {
    if (!analysisResult) return null;

    return (
      <div className="min-h-screen text-slate-200 flex flex-col font-sans">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#020617]/80 border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Activity size={16} />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-white hidden sm:block">ASISTENTE PSICOLÓGICO</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-[10px] font-mono text-gray-500 uppercase border border-white/10 px-2 py-1 rounded">
                {analysisResult.metadata.name}
                </div>
                <div className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                    {lang.toUpperCase()}
                </div>
            </div>
          </div>
          {/* Progress Bar */}
          {resultStep > 0 && resultStep <= analysisResult.blocks.length && (
            <div className="h-0.5 bg-gray-800 w-full">
              <div 
                className="h-full bg-indigo-500 transition-all duration-700 ease-out box-shadow-[0_0_10px_#6366f1]" 
                style={{ width: `${(resultStep / analysisResult.blocks.length) * 100}%` }}
              ></div>
            </div>
          )}
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col min-h-[600px]">
          {resultStep === 0 && renderDashboardTechnical()}
          {resultStep > 0 && resultStep <= analysisResult.blocks.length && renderAnalysisBlock(resultStep - 1)}
          {resultStep > analysisResult.blocks.length && renderFinalScreen()}
        </main>
      </div>
    );
  };

  return (
    <>
      {mode === AppMode.INPUT && renderInput()}
      {mode === AppMode.MODE_SELECTION && renderModeSelection()}
      {mode === AppMode.PROCESSING && renderProcessing()}
      {mode === AppMode.RESULTS && renderResults()}
    </>
  );
};

export default App;