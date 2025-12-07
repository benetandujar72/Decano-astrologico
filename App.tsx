import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  Cpu, 
  Wrench, 
  ShieldAlert, 
  Compass, 
  Activity, 
  Lock, 
  Database,
  ChevronRight,
  ChevronLeft,
  Download,
  Mail,
  Search,
  CheckCircle2,
  CircleDashed,
  AlertCircle,
  Binary,
  ArrowRight,
  Brain,
  ScrollText,
  MessageSquare
} from 'lucide-react';
import { SYSTEM_INSTRUCTION } from './constants';
import { AppMode, UserInput, AnalysisResult, AnalysisType } from './types';
import RadialChart from './components/RadialChart';
import PlanetaryTable from './components/PlanetaryTable';
import CosmicLoader from './components/CosmicLoader';

const PROCESSING_STEPS = [
  "INICIANDO MOTOR GEM CORE (PROTOCOLO DECANO)...",
  "TRIANGULANDO COORDENADAS ESPACIO-TEMPORALES...",
  "CALCULANDO EFEMÉRIDES (CSV INTERNO)...",
  "EJECUTANDO BLOQUES 0-4 (ESTRUCTURA BASE)...",
  "AUDITANDO ASPECTOS TENSOS (SOL/LUNA/SATURNO)...",
  "CONSULTANDO BIBLIOGRAFÍA (JUNG, CARUTTI, GREENE)...",
  "SINTETIZANDO VOCES MAESTRAS...",
  "TRADUCIENDO A LENGUAJE NATURAL...",
  "GENERANDO INFORME FINAL..."
];

const App: React.FC = () => {
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

  const startProgressSimulation = () => {
    setCurrentStepIndex(0);
    setErrorMsg('');
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);

    stepIntervalRef.current = window.setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < PROCESSING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 2000); 
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

      const prompt = `
        EJECUTAR PROTOCOLO "DECANO" PARA:
        Sujeto: ${userInput.name}
        Nacimiento: ${userInput.date} a las ${userInput.time}
        Lugar: ${userInput.place}
        
        ${typePrompt}
        ${contextPrompt}
        
        INSTRUCCIONES DE FORMATO JSON (CRÍTICO):
        1. Genera un informe agrupando los 28 bloques lógicos en MÁXIMO 5 "MEGA-BLOQUES" temáticos para asegurar que la respuesta quepa en el límite de tokens y el JSON cierre correctamente.
        2. IMPORTANTE: USA COMILLAS SIMPLES (') para cualquier énfasis dentro de los textos. NUNCA uses comillas dobles (") dentro de los valores de string.
        3. NO incluyas markdown (nada de \`\`\`json).
        4. Asegúrate de cerrar correctamente el array "blocks" y el objeto principal.
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
      
      // Limpieza agresiva de Markdown
      cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const startIndex = cleanText.indexOf('{');
      const endIndex = cleanText.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
        console.error("Respuesta cruda:", text);
        throw new Error("No se encontró un objeto JSON válido en la respuesta.");
      }
      
      const jsonString = cleanText.substring(startIndex, endIndex + 1);

      let data;
      try {
        data = JSON.parse(jsonString);
      } catch (parseError: any) {
        console.error("JSON Error:", parseError);
        console.error("Snippet start:", jsonString.substring(0, 200));
        console.error("Snippet end:", jsonString.substring(jsonString.length - 200));
        throw new Error(`Error de sintaxis JSON en la respuesta de la IA. Inténtalo de nuevo (el modelo generó caracteres inválidos).`);
      }

      if (!data.positions || !data.blocks) throw new Error("Estructura JSON incompleta.");

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
      setCurrentStepIndex(PROCESSING_STEPS.length); 
      
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
    
    // Helper to find specific planets for the "Trinidad" section
    const findPos = (name: string) => analysisResult.positions.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
    const sun = findPos('Sol');
    const moon = findPos('Luna');
    const asc = findPos('Ascendente') || findPos('AC') || findPos('Asc');

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Expediente Astrológico: ${analysisResult.metadata.name.toUpperCase()}</title>
    <style>
        :root {
            --space-black: #050505;
            --deep-blue: #0f172a;
            --text-primary: #e2e8f0;
            --text-secondary: #94a3b8;
            --accent-gold: #fbbf24;
            --accent-red: #ef4444;
            --accent-purple: #8b5cf6;
            --glass: rgba(30, 41, 59, 0.7);
        }

        * {
            box-sizing: border-box;
            scroll-behavior: smooth;
        }

        body {
            margin: 0;
            padding: 0;
            background-color: var(--space-black);
            color: var(--text-primary);
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            overflow-x: hidden;
            line-height: 1.6;
        }

        #starfield {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
        }

        header {
            min-height: 80vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            background: radial-gradient(circle at center, rgba(15, 23, 42, 0.4), var(--space-black));
            padding: 20px;
        }

        h1 {
            font-size: clamp(2.5rem, 5vw, 4rem);
            margin: 0;
            background: linear-gradient(to right, var(--text-primary), var(--accent-gold));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-transform: uppercase;
            letter-spacing: 5px;
            animation: fadeIn 2s ease-in;
        }

        .subtitle {
            font-size: 1.2rem;
            color: var(--accent-purple);
            margin-top: 20px;
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .meta-data {
            margin-top: 40px;
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            justify-content: center;
        }

        .data-pill {
            background: rgba(255,255,255,0.1);
            padding: 10px 20px;
            border-radius: 50px;
            border: 1px solid var(--accent-gold);
            font-size: 0.9rem;
        }

        nav {
            position: sticky;
            top: 0;
            background: var(--glass);
            backdrop-filter: blur(10px);
            z-index: 100;
            padding: 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            justify-content: center;
            gap: 20px;
            flex-wrap: wrap;
        }

        nav a {
            color: var(--text-primary);
            text-decoration: none;
            text-transform: uppercase;
            font-size: 0.8rem;
            letter-spacing: 1px;
            transition: color 0.3s;
        }

        nav a:hover {
            color: var(--accent-gold);
        }

        main {
            max-width: 1000px;
            margin: 0 auto;
            padding: 50px 20px;
        }

        section {
            margin-bottom: 80px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 1s ease-out;
        }

        section.visible {
            opacity: 1;
            transform: translateY(0);
        }

        h2 {
            font-size: 2.5rem;
            border-left: 5px solid var(--accent-gold);
            padding-left: 20px;
            margin-bottom: 40px;
            color: var(--text-primary);
        }

        .planet-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .card {
            background: var(--glass);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 15px;
            padding: 30px;
            transition: transform 0.3s;
        }

        .card:hover {
            transform: translateY(-5px);
            border-color: var(--accent-purple);
        }

        .card-header {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }

        .planet-orb {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        }

        .orb-sun { background: radial-gradient(circle at 30%, #ffd700, #b8860b); }
        .orb-moon { background: radial-gradient(circle at 30%, #ef4444, #450a0a); animation: pulse 3s infinite; }
        .orb-asc { background: radial-gradient(circle at 30%, #e0f2fe, #38bdf8); }
        .orb-generic { background: radial-gradient(circle at 30%, #a8a29e, #44403c); border: 2px solid #57534e; }

        .card h3 { margin: 0; color: var(--accent-gold); }
        .card .position { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; }

        .thesis-box {
            border-left: 4px solid var(--accent-purple);
            padding: 20px;
            background: rgba(139, 92, 246, 0.1);
            margin-bottom: 20px;
            font-family: monospace;
            font-size: 0.9rem;
        }

        .synthesis-text {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #e2e8f0;
            background: rgba(255,255,255,0.03);
            padding: 20px;
            border-radius: 10px;
        }

        .audit-tag {
            display: inline-block;
            background: rgba(239, 68, 68, 0.2);
            color: #fca5a5;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 0.7rem;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        footer {
            text-align: center;
            padding: 50px;
            border-top: 1px solid var(--accent-gold);
            color: var(--text-secondary);
            font-size: 0.8rem;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
    </style>
</head>
<body>

<canvas id="starfield"></canvas>

<header>
    <div style="font-size: 3rem; color: var(--accent-gold); margin-bottom: 20px;">♄</div>
    <h1>Expediente ${analysisResult.metadata.name}</h1>
    <div class="subtitle">Análisis Estructural y Arquetípico</div>
    
    <div class="meta-data">
        <div class="data-pill">📅 ${analysisResult.metadata.birthDate}</div>
        <div class="data-pill">🕗 ${analysisResult.metadata.birthTime}</div>
        <div class="data-pill">📍 ${analysisResult.metadata.birthPlace}</div>
        <div class="data-pill">⚠️ RECTIFICADO (IA)</div>
    </div>
</header>

<nav>
    <a href="#trinidad">La Estructura</a>
    ${analysisResult.blocks.map((block, i) => `<a href="#block-${i}">${block.id.split(' ')[0]}</a>`).join('')}
    <a href="#sintesis">Síntesis</a>
</nav>

<main>

    <section id="trinidad" class="scroll-trigger">
        <h2>I. La Estructura Nuclear</h2>
        <p>Configuración base del sujeto analizado.</p>

        <div class="planet-grid">
            ${sun ? `
            <div class="card">
                <div class="card-header">
                    <div class="planet-orb orb-sun"></div>
                    <div>
                        <h3>El Rey (Sol)</h3>
                        <div class="position">${sun.sign} (${sun.degree}) | Casa ${sun.house}</div>
                    </div>
                </div>
                <p>Núcleo de la identidad consciente.</p>
            </div>` : ''}

            ${moon ? `
            <div class="card">
                <div class="card-header">
                    <div class="planet-orb orb-moon"></div>
                    <div>
                        <h3>La Madre (Luna)</h3>
                        <div class="position">${moon.sign} (${moon.degree}) | Casa ${moon.house}</div>
                    </div>
                </div>
                <p>Mecanismo emocional y reactivo.</p>
            </div>` : ''}

            ${asc ? `
            <div class="card">
                <div class="card-header">
                    <div class="planet-orb orb-asc"></div>
                    <div>
                        <h3>El Guardián (Asc)</h3>
                        <div class="position">${asc.sign} (${asc.degree})</div>
                    </div>
                </div>
                <p>Interfaz de contacto con la realidad.</p>
            </div>` : ''}
        </div>
    </section>

    <!-- BLOQUES DINÁMICOS -->
    ${analysisResult.blocks.map((block, i) => `
    <section id="block-${i}" class="scroll-trigger">
        <h2>${block.title}</h2>
        
        <div class="audit-tag">AUDITORÍA: ${block.audit}</div>

        <div class="thesis-box">
            <strong>TESIS TÉCNICA:</strong><br>
            ${block.thesis.replace(/\n/g, '<br>')}
        </div>

        <div class="synthesis-text">
            ${block.synthesis.replace(/\n/g, '<br>')}
        </div>
    </section>
    `).join('')}

    <section id="sintesis" class="scroll-trigger">
        <h2>Sentencia Final</h2>
        <div class="thesis-box" style="border-left-color: var(--accent-gold); text-align: center; font-size: 1.2rem; font-style: italic;">
            "${analysisResult.footerQuote}"
        </div>
    </section>

    <footer>
        <div style="font-size: 2rem; color: var(--accent-gold); margin-bottom: 20px;">♆</div>
        <p>DECANATO DE ESTUDIOS SUPERIORES ASTROLÓGICOS</p>
        <p>Expediente Cerrado | ${new Date().getFullYear()}</p>
        <p style="opacity: 0.5; margin-top: 20px;">Generado por GEM CORE v4.0</p>
    </footer>

</main>

<script>
    const canvas = document.getElementById('starfield');
    const ctx = canvas.getContext('2d');
    let width, height, stars = [];

    function init() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        stars = [];
        for(let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 2,
                speed: Math.random() * 0.5
            });
        }
    }

    function animate() {
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            star.y -= star.speed;
            if(star.y < 0) star.y = height;
        });
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', init);
    init();
    animate();

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-trigger').forEach((el) => observer.observe(el));
</script>

</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EXPEDIENTE_${analysisResult.metadata.name.replace(/\s+/g, '_').toUpperCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // --- VISTAS ---

  const renderInput = () => (
    <div className="min-h-screen bg-gem-dark flex items-center justify-center p-6 font-mono relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50"></div>
      
      <div className="max-w-md w-full bg-gem-panel border border-white/10 p-8 rounded-xl shadow-2xl relative z-10">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-10 h-10 bg-indigo-500/20 rounded flex items-center justify-center text-indigo-400"><Activity /></div>
           <div><h1 className="text-xl font-bold text-white tracking-widest">GEM CORE</h1><p className="text-xs text-gray-400">PROTOCOLO DECANO v4.0</p></div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setMode(AppMode.MODE_SELECTION); }} className="space-y-5">
          <div><label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Nombre del Sujeto</label><input required type="text" value={userInput.name} onChange={e => setUserInput({...userInput, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:border-indigo-500 outline-none" placeholder="Nombre completo" /></div>
          
          <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Fecha Nac.</label><input required type="date" value={userInput.date} onChange={e => setUserInput({...userInput, date: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:border-indigo-500 outline-none" /></div>
             <div><label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Hora Exacta</label><input required type="time" value={userInput.time} onChange={e => setUserInput({...userInput, time: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white focus:border-indigo-500 outline-none" /></div>
          </div>

          <div><label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">Lugar de Nacimiento</label><div className="relative"><input required type="text" value={userInput.place} onChange={e => setUserInput({...userInput, place: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white pl-10 focus:border-indigo-500 outline-none" placeholder="Ciudad, País" /><Search className="absolute left-3 top-2.5 text-gray-600" size={14} /></div></div>

          <div>
            <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider flex items-center gap-2"><MessageSquare size={12}/> Contexto / Pregunta (Opcional)</label>
            <textarea 
              rows={2}
              value={userInput.context}
              onChange={e => setUserInput({...userInput, context: e.target.value})}
              className="w-full bg-black/30 border border-white/10 rounded px-4 py-2 text-white text-sm focus:border-indigo-500 outline-none resize-none"
              placeholder="Ej: Crisis vocacional, problemas de pareja..."
            />
          </div>

          <button type="submit" className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)]">
            SIGUIENTE: DEFINIR PROTOCOLO <ChevronRight size={16} />
          </button>
        </form>
      </div>
    </div>
  );

  const renderModeSelection = () => (
    <div className="min-h-screen bg-gem-dark flex items-center justify-center p-6 font-mono">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Opción Psicológica */}
        <button 
          onClick={() => { setAnalysisType(AnalysisType.PSYCHOLOGICAL); handleAnalyze(); }}
          className="group relative bg-gem-panel border border-white/10 hover:border-indigo-500/50 p-8 rounded-xl text-left transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] flex flex-col h-full"
        >
          <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
            <Brain size={24} />
          </div>
          <h3 className="text-xl text-white font-bold mb-2">ANÁLISIS PSICOLÓGICO</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Deconstrucción de la psique basada en Jung y Naranjo. Enfocado en:
            <br/><br/>
            • Estructura del Ego y Sombra.
            <br/>
            • Patrones de trauma y talento.
            <br/>
            • Propósito evolutivo (Nodos).
          </p>
          <div className="mt-auto flex items-center text-indigo-400 text-xs font-bold uppercase tracking-widest">
            Seleccionar Protocolo <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform"/>
          </div>
        </button>

        {/* Opción Técnica */}
        <button 
          onClick={() => { setAnalysisType(AnalysisType.TECHNICAL); handleAnalyze(); }}
          className="group relative bg-gem-panel border border-white/10 hover:border-emerald-500/50 p-8 rounded-xl text-left transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col h-full"
        >
          <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
            <ScrollText size={24} />
          </div>
          <h3 className="text-xl text-white font-bold mb-2">AUDITORÍA TÉCNICA</h3>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Análisis riguroso de la mecánica celeste. Enfocado en:
            <br/><br/>
            • Dignidades y Debilidades.
            <br/>
            • Aspectos mayores y orbes.
            <br/>
            • Derivación de casas y regencias.
          </p>
          <div className="mt-auto flex items-center text-emerald-400 text-xs font-bold uppercase tracking-widest">
            Seleccionar Protocolo <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform"/>
          </div>
        </button>

      </div>
    </div>
  );

  const renderDashboardTechnical = () => {
    if (!analysisResult) return null;
    return (
      <div className="animate-fade-in space-y-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl text-white font-bold tracking-widest mb-2">
            {analysisType === AnalysisType.PSYCHOLOGICAL ? 'PERFIL PSICOLÓGICO GENERADO' : 'AUDITORÍA TÉCNICA COMPLETADA'}
          </h2>
          <p className="text-indigo-400 font-mono text-sm">BASE DE DATOS RADIX ESTABLECIDA</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gem-panel border border-white/5 rounded-xl p-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-4 flex gap-2 items-center"><Database size={14}/> Posiciones Planetarias</h3>
            <PlanetaryTable positions={analysisResult.positions} />
          </div>
          <div className="bg-gem-panel border border-white/5 rounded-xl p-6 flex items-center justify-center relative">
             <RadialChart data={analysisResult.elementalBalance} />
          </div>
        </div>

        <div className="flex justify-center mt-12">
          <button 
            onClick={() => setResultStep(1)}
            className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] flex items-center gap-3 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <Binary size={20} />
            <span>ABRIR EXPEDIENTE (BLOQUE 1)</span>
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
      <div className="animate-fade-in max-w-4xl mx-auto pb-20">
        {/* Header del Bloque */}
        <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-white/5 rounded flex items-center justify-center text-gray-400 font-mono text-sm border border-white/10">
               {blockIndex + 1}/{analysisResult.blocks.length}
             </div>
             <div>
               <h3 className="text-xs text-indigo-400 font-mono tracking-widest mb-1">{block.id.toUpperCase()}</h3>
               <h2 className="text-xl md:text-2xl text-white font-bold">{block.title}</h2>
             </div>
          </div>
        </div>

        {/* 1. TESIS TÉCNICA (Academic) */}
        <div className="bg-[#1a1c2e] border-l-4 border-indigo-500 p-6 md:p-8 rounded-r-xl mb-6 shadow-lg">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Brain size={14}/> Tesis Técnica (El Decano)
          </h4>
          <div className="prose prose-invert prose-sm md:prose-base max-w-none text-gray-300 leading-relaxed font-serif text-justify">
             {block.thesis}
          </div>
        </div>

        {/* 2. AUDITORÍA (Validation) */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-lg mb-6 flex items-start gap-3">
          <ShieldAlert size={16} className="text-emerald-500 mt-1 shrink-0" />
          <div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Auditoría Forense</h4>
            <p className="text-sm text-emerald-400/80 font-mono">{block.audit}</p>
          </div>
        </div>

        {/* 3. SÍNTESIS HUMANA (Translation) */}
        <div className="bg-white/5 border border-white/10 p-6 md:p-8 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <MessageSquare size={14}/> Traducción Humana
          </h4>
          <div className="prose prose-invert prose-base max-w-none text-white leading-relaxed">
             {block.synthesis}
          </div>
        </div>

        {/* Controles */}
        <div className="flex justify-between mt-12">
          <button 
            onClick={() => setResultStep(prev => prev - 1)}
            className="flex items-center gap-2 px-6 py-3 text-gray-500 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} /> ANTERIOR
          </button>

          <button 
            onClick={() => setResultStep(prev => prev + 1)}
            className="flex items-center gap-3 px-8 py-3 bg-white text-black hover:bg-gray-200 font-bold rounded transition-colors shadow-lg shadow-white/10"
          >
            {isLastBlock ? 'CONCLUSIONES FINALES' : 'SIGUIENTE BLOQUE'} 
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderFinalScreen = () => {
    if (!analysisResult) return null;
    return (
      <div className="animate-fade-in text-center max-w-3xl mx-auto py-12">
        <div className="w-20 h-20 mx-auto bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-8 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
          <CheckCircle2 size={40} />
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-4">INFORME DECANO FINALIZADO</h2>
        <p className="text-gray-400 mb-12">El análisis de {analysisResult.blocks.length} bloques ha sido compilado exitosamente.</p>

        <div className="bg-white/5 rounded-xl p-8 mb-12 border border-white/10 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gem-dark px-4 text-xs text-gray-500 uppercase tracking-widest">
            Aforismo Final
          </div>
          <p className="text-xl font-serif italic text-indigo-200">
            "{analysisResult.footerQuote}"
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button onClick={downloadHTML} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-colors">
            <Download size={18} /> DESCARGAR INFORME (HTML)
          </button>
          <button onClick={() => setMode(AppMode.INPUT)} className="px-6 py-3 border border-white/20 hover:bg-white/5 text-gray-300 rounded font-medium transition-colors">
            NUEVA CONSULTA
          </button>
        </div>
      </div>
    );
  };

  // --- RENDER PRINCIPAL ---

  const renderResults = () => {
    if (!analysisResult) return null;

    return (
      <div className="min-h-screen bg-gem-dark text-slate-200 font-sans selection:bg-indigo-500/30 flex flex-col">
        <header className="sticky top-0 z-50 backdrop-blur-md bg-gem-dark/90 border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity size={18} className="text-indigo-400" />
              <span className="text-xs font-bold tracking-widest text-white">GEM CORE v4.0</span>
            </div>
            <div className="text-[10px] font-mono text-gray-500 hidden sm:block">
              SUJETO: {analysisResult.metadata.name.toUpperCase()}
            </div>
          </div>
          {resultStep > 0 && resultStep <= analysisResult.blocks.length && (
            <div className="h-0.5 bg-gray-800 w-full">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${(resultStep / analysisResult.blocks.length) * 100}%` }}
              ></div>
            </div>
          )}
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 flex flex-col justify-center min-h-[600px]">
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
      
      {mode === AppMode.PROCESSING && (
        <div className="min-h-screen bg-gem-dark flex flex-col items-center justify-center font-mono p-6 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-5xl items-center z-10">
            <div className="flex flex-col items-center justify-center order-2 lg:order-1">
              <div className="scale-125 mb-8"><CosmicLoader /></div>
              <h2 className="text-2xl text-white font-bold mb-2 animate-pulse tracking-widest text-center">PROCESANDO</h2>
              <p className="text-indigo-400 text-sm font-bold text-center">{userInput.name.toUpperCase()}</p>
            </div>
            <div className="bg-gem-panel/80 backdrop-blur border border-white/10 rounded-xl p-6 lg:p-8 order-1 lg:order-2 shadow-2xl">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-white/10 pb-2">SECUENCIA DE INICIALIZACIÓN</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {PROCESSING_STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex; const isActive = idx === currentStepIndex;
                  return (
                    <div key={idx} className={`flex items-center gap-3 transition-all ${isActive ? 'translate-x-2' : ''}`}>
                      <div className="shrink-0">{isCompleted ? <CheckCircle2 size={18} className="text-emerald-500" /> : isActive ? <CircleDashed size={18} className="text-indigo-400 animate-spin" /> : <div className="w-4 h-4 rounded-full border border-gray-700" />}</div>
                      <span className={`text-xs font-mono ${isCompleted ? 'text-gray-500' : isActive ? 'text-indigo-300 font-bold' : 'text-gray-700'}`}>{step}</span>
                    </div>
                  );
                })}
              </div>
              {errorMsg && <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded text-red-200 text-xs flex gap-2 items-center"><AlertCircle size={16}/> {errorMsg} <button onClick={() => setMode(AppMode.INPUT)} className="ml-auto underline">Reintentar</button></div>}
            </div>
          </div>
        </div>
      )}
      
      {mode === AppMode.RESULTS && renderResults()}
    </>
  );
};

export default App;