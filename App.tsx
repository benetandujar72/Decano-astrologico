
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type, Schema } from "@google/genai";
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
  MessageSquare,
  Layout,
  Save,
  Trash2,
  FolderOpen,
  Lock,
  LogOut,
  User as UserIcon,
  Info,
  ShieldAlert,
  Crown,
  Zap
} from 'lucide-react';
import { SYSTEM_INSTRUCTION as DEFAULT_SYSTEM_INSTRUCTION, TRANSLATIONS } from './constants';
import { AppMode, UserInput, AnalysisResult, AnalysisType, Language, SavedChart, PlanetPosition, User } from './types';
import NatalChart from './components/NatalChart'; 
import PlanetaryTable from './components/PlanetaryTable';
import CosmicLoader from './components/CosmicLoader';
import PlanetaryOrbit from './components/PlanetaryOrbit'; // 🆕 Animaciones mejoradas
import ControlPanel from './components/ControlPanel'; 
import GenericModal from './components/GenericModal'; 
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard'; // 🆕 Dashboard admin mejorado
import ExportSelector from './components/ExportSelector';
import MysticBackground from './components/MysticBackground'; // 🆕 Fondo místico
import SubscriptionPlans from './components/SubscriptionPlans'; // 🆕 Planes
import UserProfilePage from './components/UserProfilePage'; // 🆕 Perfil
import SubscriptionSuccess from './components/SubscriptionSuccess'; // 🆕 Confirmación de pago
import AdvancedTechniques from './components/AdvancedTechniques'; // 🆕 Técnicas
import ChartDataDisplay from './components/ChartDataDisplay'; // 🆕 Visualización de datos de carta
import { calculateChartData } from './astrologyEngine'; 
import { api } from './services/api';
import './styles/mystic-theme.css'; // 🆕 Estilos místicos
import './components/PlanetaryOrbit.css'; // 🆕 Animaciones 

// Symbol Dictionaries for Legend
const PLANET_SYMBOLS: Record<string, string> = {
  'Sol': '☉', 'Luna': '☽', 'Mercurio': '☿', 'Venus': '♀', 'Marte': '♂',
  'Júpiter': '♃', 'Saturno': '♄', 'Urano': '♅', 'Neptuno': '♆', 'Plutón': '♇',
  'Ascendente': 'AC', 'Nodo Norte': '☊'
};

const ZODIAC_SYMBOLS: Record<string, string> = {
  'Aries': '♈', 'Tauro': '♉', 'Géminis': '♊', 'Cáncer': '♋', 
  'Leo': '♌', 'Virgo': '♍', 'Libra': '♎', 'Escorpio': '♏', 
  'Sagitario': '♐', 'Capricornio': '♑', 'Acuario': '♒', 'Piscis': '♓'
};

const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('es');
  
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false); // Nuevo estado Admin
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authForm, setAuthForm] = useState({ username: '', password: '' });

  // System Prompt State (Dynamic)
  const [systemInstruction, setSystemInstruction] = useState<string>(DEFAULT_SYSTEM_INSTRUCTION);

  const [mode, setMode] = useState<AppMode>(AppMode.AUTH);
  const [analysisType, setAnalysisType] = useState<AnalysisType>(AnalysisType.PSYCHOLOGICAL);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [resultStep, setResultStep] = useState<number>(0);

  // Advanced technique state
  const [selectedTechnique, setSelectedTechnique] = useState<string | null>(null);

  // Subscription state
  const [stripeSessionId, setStripeSessionId] = useState<string | null>(null);

  // Detectar session_id en URL (usuario vuelve de Stripe)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (sessionId) {
      setStripeSessionId(sessionId);
      setMode(AppMode.SUBSCRIPTION_SUCCESS);
      // Limpiar URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Modal State
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const [userInput, setUserInput] = useState<UserInput>({
    name: '',
    date: '',
    time: '',
    place: '', 
    context: ''
  });
  
  const [activeChartParams, setActiveChartParams] = useState<UserInput | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [savedCharts, setSavedCharts] = useState<SavedChart[]>([]);
  const [cartaCompleta, setCartaCompleta] = useState<any>(null); // Datos completos de efemérides
  const [isExporting, setIsExporting] = useState(false); // Estado de exportación
  const [showAdminPromptEditor, setShowAdminPromptEditor] = useState(false); // Modal de edición de prompt principal
  
  // Estado para autocomplete de lugares
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{nombre: string, lat: number, lon: number, timezone: string}>>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const placeInputRef = useRef<HTMLInputElement>(null);
  const geocodeTimeoutRef = useRef<number | null>(null);
  
  const stepIntervalRef = useRef<number | null>(null);
  const t = TRANSLATIONS[lang];

  // Check token on mount
  useEffect(() => {
    const token = localStorage.getItem('fraktal_token');
    const savedUser = localStorage.getItem('fraktal_user');
    
    if (token) {
      setIsAuthenticated(true);
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        if (user.role === 'admin' || user.username === 'admin@programafraktal.com') {
            setIsAdmin(true);
        }
      }
      setMode(AppMode.INPUT);
      loadChartsFromApi();
      fetchSystemPrompt(); // Cargar prompt dinámico
    }
  }, []);

  const loadChartsFromApi = async () => {
    try {
      const charts = await api.getCharts();
      setSavedCharts(charts);
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') handleLogout();
      console.error(e);
    }
  };

  const fetchSystemPrompt = async (techniqueType?: string | null) => {
    try {
      // Si hay una técnica seleccionada, cargar el prompt especializado
      if (techniqueType) {
        try {
          const specializedPrompt = await api.getSpecializedPrompt(techniqueType);
          if (specializedPrompt && specializedPrompt.content) {
            setSystemInstruction(specializedPrompt.content);
            console.log(`✅ Prompt especializado cargado: ${techniqueType}`);
            return;
          }
        } catch (e) {
          console.warn(`⚠️ No se pudo cargar prompt especializado para ${techniqueType}, usando prompt por defecto:`, e);
        }
      }
      
      // Si no hay técnica o falló la carga, usar el prompt por defecto
      const promptData = await api.getSystemPrompt();
      if (promptData && promptData.content) {
        setSystemInstruction(promptData.content);
      }
    } catch (e) {
      console.warn("Usando prompt por defecto (Offline o Error DB)", e);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (isRegistering) {
        await api.register(authForm.username, authForm.password);
        const res = await api.login(authForm.username, authForm.password);
        finishLogin(res);
      } else {
        const res = await api.login(authForm.username, authForm.password);
        finishLogin(res);
      }
    } catch (err) {
      setErrorMsg('Error en credenciales o conexión.');
    }
  };

  const finishLogin = (res: any) => {
    localStorage.setItem('fraktal_token', res.access_token);
    localStorage.setItem('fraktal_user', JSON.stringify(res.user));
    setCurrentUser(res.user);
    
    setIsAuthenticated(true);
    if (res.user.role === 'admin') {
        setIsAdmin(true);
    }
    
    // Si es un nuevo registro, mostrar planes de suscripción
    // Si es login normal, ir a INPUT
    const wasRegistering = isRegistering;
    setIsRegistering(false);
    
    if (wasRegistering) {
      // Nuevo usuario: mostrar planes para que pueda elegir
      setMode(AppMode.SUBSCRIPTION_PLANS);
    } else {
      setMode(AppMode.INPUT);
    }
    
    loadChartsFromApi();
    fetchSystemPrompt();
  };

  const handleLogout = () => {
    localStorage.removeItem('fraktal_token');
    localStorage.removeItem('fraktal_user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setMode(AppMode.AUTH);
    setSavedCharts([]);
  };

  const saveChartToDb = async (input: UserInput) => {
    try {
      const newChart = await api.saveChart({
        name: input.name,
        date: input.date,
        time: input.time,
        place: input.place
      });
      setSavedCharts([newChart, ...savedCharts]);
    } catch (e) {
      console.error("Failed to save chart online", e);
    }
  };

  const deleteChart = async (id: string) => {
    try {
      await api.deleteChart(id);
      setSavedCharts(savedCharts.filter(c => c.id !== id));
    } catch (e) {
      console.error("Failed to delete", e);
    }
  };

  const loadChart = (chart: SavedChart) => {
    setUserInput({
      name: chart.name,
      date: chart.date,
      time: chart.time,
      place: chart.place,
      context: ''
    });
    setMode(AppMode.MODE_SELECTION);
  };

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

  // Función auxiliar para detectar si el input son coordenadas o texto
  const esCoordenadas = (place: string): boolean => {
    if (!place || !place.trim()) return false;
    
    // Si contiene coma, intentar parsear como coordenadas
    if (place.includes(',')) {
      const parts = place.split(',');
      if (parts.length >= 2) {
        const lat = parseFloat(parts[0].trim());
        const lon = parseFloat(parts[1].trim());
        // Si ambos son números válidos y están en rangos válidos, son coordenadas
        if (!isNaN(lat) && !isNaN(lon) && 
            lat >= -90 && lat <= 90 && 
            lon >= -180 && lon <= 180) {
          return true;
        }
      }
    }
    
    // Si no contiene coma pero son solo números, podría ser coordenadas separadas por espacio
    const numbers = place.trim().split(/\s+/);
    if (numbers.length === 2) {
      const lat = parseFloat(numbers[0]);
      const lon = parseFloat(numbers[1]);
      if (!isNaN(lat) && !isNaN(lon) && 
          lat >= -90 && lat <= 90 && 
          lon >= -180 && lon <= 180) {
        return true;
      }
    }
    
    return false;
  };

  // Función para geocodificar un lugar
  const geocodificarLugar = async (nombreLugar: string): Promise<{lat: number, lon: number, timezone: string, nombre?: string}> => {
    const token = localStorage.getItem('fraktal_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    
    const response = await fetch(`${API_URL}/geolocation/geocode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ place: nombreLugar }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error geocodificando el lugar');
    }
    
    const data = await response.json();
    return {
      lat: data.lat,
      lon: data.lon,
      timezone: data.timezone || 'UTC',
      nombre: data.nombre
    };
  };

  // Función para buscar sugerencias de lugares mientras el usuario escribe
  const buscarSugerenciasLugar = async (texto: string) => {
    if (!texto || texto.trim().length < 3) {
      setPlaceSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Si parece ser coordenadas, no buscar sugerencias
    if (esCoordenadas(texto)) {
      setPlaceSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsGeocoding(true);
    try {
      const resultado = await geocodificarLugar(texto);
      setPlaceSuggestions([{
        nombre: resultado.nombre || texto,
        lat: resultado.lat,
        lon: resultado.lon,
        timezone: resultado.timezone
      }]);
      setShowSuggestions(true);
    } catch (error) {
      // Si hay error, no mostrar sugerencias
      setPlaceSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handler para cambios en el input de lugar
  const handlePlaceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nuevoValor = e.target.value;
    setUserInput({...userInput, place: nuevoValor});
    setShowSuggestions(false);

    // Limpiar timeout anterior
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    // Si no son coordenadas y tiene al menos 3 caracteres, buscar sugerencias con debounce
    if (!esCoordenadas(nuevoValor) && nuevoValor.trim().length >= 3) {
      geocodeTimeoutRef.current = window.setTimeout(() => {
        buscarSugerenciasLugar(nuevoValor);
      }, 500); // Debounce de 500ms
    } else {
      setPlaceSuggestions([]);
    }
  };

  // Handler para seleccionar una sugerencia
  const handleSelectSuggestion = (sugerencia: {nombre: string, lat: number, lon: number, timezone: string}) => {
    setUserInput({...userInput, place: sugerencia.nombre});
    setPlaceSuggestions([]);
    setShowSuggestions(false);
  };

  const handleAnalyze = async (overrideInput?: UserInput) => {
    // Refresh prompt just in case it was updated (con técnica si está seleccionada)
    await fetchSystemPrompt(selectedTechnique);

    const inputToUse = overrideInput || userInput;
    setActiveChartParams(inputToUse); 
    setMode(AppMode.PROCESSING);
    startProgressSimulation();
    
    try {
      let lat = 40.4168, lon = -3.7038, timezone = 'UTC';
      
      // Detectar si el input son coordenadas o texto
      if (esCoordenadas(inputToUse.place)) {
        // Es formato de coordenadas, parsear como antes
        if (inputToUse.place.includes(',')) {
          const parts = inputToUse.place.split(',');
          const parsedLat = parseFloat(parts[0].trim());
          const parsedLon = parseFloat(parts[1].trim());
          if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
            lat = parsedLat;
            lon = parsedLon;
          }
          // Si hay tercer parámetro, es la zona horaria
          timezone = parts[2]?.trim() || 'UTC';
        } else {
          // Coordenadas separadas por espacio
          const numbers = inputToUse.place.trim().split(/\s+/);
          if (numbers.length === 2) {
            lat = parseFloat(numbers[0]);
            lon = parseFloat(numbers[1]);
          }
        }
      } else {
        // Es texto, geocodificar
        try {
          console.log(`🌍 Geocodificando lugar: ${inputToUse.place}`);
          const geocoded = await geocodificarLugar(inputToUse.place);
          lat = geocoded.lat;
          lon = geocoded.lon;
          timezone = geocoded.timezone;
          console.log(`✅ Geocodificado: Lat ${lat}, Lon ${lon}, TZ: ${timezone}`);
        } catch (error: any) {
          console.error('❌ Error geocodificando lugar:', error);
          throw new Error(`No se pudo encontrar el lugar "${inputToUse.place}". Por favor, verifica el nombre o usa coordenadas (ej: 40.41, -3.70)`);
        }
      }
      
      // Primero calcular con el motor frontend (rápido para visualización)
      const realData = calculateChartData(inputToUse.date, inputToUse.time, lat, lon);
      
      // Paralelamente, calcular con Swiss Ephemeris en backend (precisión)
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      try {
        const ephemerisResponse = await fetch(`${API_URL}/ephemeris/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fecha: inputToUse.date,
            hora: inputToUse.time,
            latitud: lat,
            longitud: lon,
            zona_horaria: timezone
          }),
        });
        
        if (ephemerisResponse.ok) {
          const ephemerisData = await ephemerisResponse.json();
          console.log('✅ Efemérides calculadas con Swiss Ephemeris');
          setCartaCompleta(ephemerisData.data); // Guardar para exportación
        } else {
          console.warn('⚠️ No se pudieron calcular efemérides con backend, usando motor frontend');
        }
      } catch (ephemerisError) {
        console.warn('⚠️ Error calculando efemérides backend:', ephemerisError);
      }
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || (process.env as any).API_KEY;
      if (!apiKey) throw new Error("Falta la API key de Gemini. Configura VITE_GEMINI_API_KEY en Vercel.");
      const ai = new GoogleGenAI({ apiKey });
      // Si hay una técnica avanzada seleccionada, indicarlo en el prompt
      let techniqueContext = '';
      if (selectedTechnique) {
        const techniqueNames: Record<string, string> = {
          'transits': 'TRÁNSITOS PLANETARIOS',
          'progressions': 'PROGRESIONES SECUNDARIAS',
          'solar_return': 'REVOLUCIÓN SOLAR',
          'synastry': 'SINASTRÍA',
          'composite': 'CARTA COMPUESTA',
          'directions': 'DIRECCIONES PRIMARIAS',
          'lunar_return': 'REVOLUCIÓN LUNAR',
          'electional': 'ASTROLOGÍA ELECTIVA'
        };
        techniqueContext = `\n TÉCNICA AVANZADA: ${techniqueNames[selectedTechnique] || selectedTechnique.toUpperCase()}`;
      }
      
      const typePrompt = analysisType === AnalysisType.PSYCHOLOGICAL 
        ? "ENFOQUE: ANÁLISIS SISTÉMICO (Módulos 1-4)."
        : "ENFOQUE: AUDITORÍA TÉCNICA Y ESTRUCTURAL.";

      const positionsText = realData.positions.map(p => `${p.name}: ${p.degree} ${p.sign} (Casa ${p.house})`).join('\n');
      const prompt = `EJECUTAR PROTOCOLO "FRAKTAL v1.0" PARA: ${inputToUse.name}${techniqueContext} \n DATOS: \n ${positionsText} \n ${typePrompt} \n IDIOMA: ${lang}.`;

      const analysisSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          blocks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                title: { type: Type.STRING },
                thesis: { type: Type.STRING },
                audit: { type: Type.STRING },
                synthesis: { type: Type.STRING },
              },
              required: ["id", "title", "thesis", "audit", "synthesis"],
            },
          },
          footerQuote: { type: Type.STRING },
        },
        required: ["blocks", "footerQuote"],
      };

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction, // USAMOS EL PROMPT DINÁMICO
          maxOutputTokens: 16384, // Aumentado para evitar truncamiento
          responseMimeType: "application/json",
          responseSchema: analysisSchema
        }
      });

      const text = response.text;
      if (!text) {
        console.error("❌ Gemini API no devolvió texto");
        throw new Error("La API de Gemini no devolvió texto. Verifica que VITE_GEMINI_API_KEY esté configurada correctamente en Vercel.");
      }
      
      // Limpiar el texto de markdown code blocks si existen
      let cleanText = text.trim();
      cleanText = cleanText.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      // Intentar parsear directamente primero (método más simple y robusto)
      let aiData;
      try {
        aiData = JSON.parse(cleanText);
        console.log("✅ JSON parseado directamente");
      } catch (directParseError) {
        // Si falla, intentar extraer el JSON del texto
        console.log("⚠️ Parse directo falló, intentando extraer JSON del texto");
        console.log("Error del parse directo:", directParseError?.message || directParseError);
        
        // Método 1: Buscar JSON con regex (más simple y robusto)
        // Buscar desde el primer { hasta el último } (puede haber texto antes/después)
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch && jsonMatch[0]) {
          try {
            aiData = JSON.parse(jsonMatch[0]);
            console.log("✅ JSON encontrado y parseado con regex (método principal)");
          } catch (regexError) {
            console.warn("⚠️ Parse con regex falló:", regexError?.message);
            // Continuar con método de balanceo
          }
        }
        
        // Método 2: Balanceo de llaves (solo si regex falló)
        if (!aiData) {
          let startIndex = cleanText.indexOf('{');
          let endIndex = -1;
          
          if (startIndex !== -1) {
            // Encontrar el } correspondiente balanceando llaves
            // Esto maneja correctamente objetos y arrays anidados
            let braceCount = 0;
            let inString = false;
            let escapeNext = false;
            
            for (let i = startIndex; i < cleanText.length; i++) {
              const char = cleanText[i];
              
              // Manejar strings (ignorar llaves dentro de strings)
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              
              if (char === '\\') {
                escapeNext = true;
                continue;
              }
              
              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }
              
              // Solo contar llaves fuera de strings
              if (!inString) {
                if (char === '{') {
                  braceCount++;
                } else if (char === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    endIndex = i;
                    break;
                  }
                }
              }
            }
          }
          
          if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
            const jsonString = cleanText.substring(startIndex, endIndex + 1);
            console.log("📝 Extrayendo JSON con balanceo desde posición", startIndex, "hasta", endIndex, "(longitud:", jsonString.length, "chars)");
            
            try {
              aiData = JSON.parse(jsonString);
              console.log("✅ JSON parseado después de balanceo de llaves");
            } catch (extractError) {
              console.error("❌ Error parseando JSON extraído con balanceo:", extractError?.message);
              console.error("JSON string (primeros 500 chars):", jsonString?.substring(0, 500));
              console.error("JSON string (últimos 500 chars):", jsonString?.substring(Math.max(0, jsonString.length - 500)));
            }
          }
        }
        
        // Si aún no funciona, lanzar error descriptivo
        if (!aiData) {
          console.error("❌ No se pudo extraer JSON válido de la respuesta de Gemini");
          console.error("Texto recibido (primeros 1000 chars):", text?.substring(0, 1000));
          console.error("Texto recibido (últimos 500 chars):", text?.substring(Math.max(0, text.length - 500)));
          console.error("Longitud total del texto:", cleanText.length);
          throw new Error("La respuesta de Gemini no contiene JSON válido. El análisis puede estar truncado o mal formado. Intenta de nuevo.");
        }
      }
      
      // Validar que tenga la estructura correcta
      if (!aiData || typeof aiData !== 'object') {
        console.warn("⚠️ Respuesta de Gemini no es un objeto válido, usando fallback");
        aiData = { blocks: [], footerQuote: "Análisis en proceso..." };
      } else if (!aiData.blocks || !Array.isArray(aiData.blocks)) {
        console.warn("⚠️ Respuesta de Gemini sin bloques válidos, usando fallback");
        aiData = { blocks: [], footerQuote: "Análisis en proceso..." };
      }
      
      if (!aiData.footerQuote) {
        aiData.footerQuote = "Fraktal";
      }

      setAnalysisResult({
        metadata: {
          name: inputToUse.name,
          birthDate: inputToUse.date,
          birthTime: inputToUse.time,
          birthPlace: inputToUse.place
        },
        positions: realData.positions,
        elementalBalance: realData.balance,
        blocks: aiData.blocks || [],
        footerQuote: aiData.footerQuote || "Fraktal"
      });
      
      saveChartToDb(inputToUse);

      stopProgressSimulation();
      setCurrentStepIndex(t.processingSteps.length); 
      setTimeout(() => { 
        setMode(AppMode.RESULTS); 
        setResultStep(0);
        // Limpiar técnica seleccionada después del análisis
        setSelectedTechnique(null);
        fetchSystemPrompt(); // Restaurar prompt por defecto
      }, 1000);

    } catch (error: any) {
      console.error("Error:", error);
      stopProgressSimulation();
      setErrorMsg(error.message || "Error desconocido.");
    }
  };

  const handleTimeShift = (amount: number, unit: 'minute' | 'hour' | 'day' | 'month' | 'year') => {
    if (!analysisResult) return;
    const currentStr = `${analysisResult.metadata.birthDate}T${analysisResult.metadata.birthTime}:00`;
    const date = new Date(currentStr);
    switch(unit) {
      case 'minute': date.setMinutes(date.getMinutes() + amount); break;
      case 'hour': date.setHours(date.getHours() + amount); break;
      case 'day': date.setDate(date.getDate() + amount); break;
      case 'month': date.setMonth(date.getMonth() + amount); break;
      case 'year': date.setFullYear(date.getFullYear() + amount); break;
    }
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0].substring(0, 5);

    const newInput = {
      ...userInput,
      name: `${userInput.name} (T${amount > 0 ? '+' : ''}${amount}${unit[0]})`,
      date: dateStr,
      time: timeStr
    };

    let lat = 40.4168, lon = -3.7038;
    if (newInput.place.includes(',')) {
      const [latStr, lonStr] = newInput.place.split(',');
      const parsedLat = parseFloat(latStr.trim());
      const parsedLon = parseFloat(lonStr.trim());
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        lat = parsedLat;
        lon = parsedLon;
      }
    }

    const realData = calculateChartData(dateStr, timeStr, lat, lon);
    setAnalysisResult(prev => {
      if (!prev) return null;
      return {
        ...prev,
        metadata: { ...prev.metadata, birthDate: dateStr, birthTime: timeStr },
        positions: realData.positions,
        elementalBalance: realData.balance,
      };
    });
  };

  const handleToolbarAction = (action: string) => {
    switch(action) {
      case 'modify': setMode(AppMode.INPUT); break;
      case 'list': setMode(AppMode.LISTING); loadChartsFromApi(); break;
      case 'add': 
        setUserInput({ name: '', date: '', time: '', place: '', context: '' });
        setMode(AppMode.INPUT); 
        break;
      case 'now': 
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
        handleAnalyze({ ...userInput, name: 'Ahora', date: dateStr, time: timeStr });
        break;
      case 'print': downloadHTML(); break;
      case 'legend': setActiveModal('legend'); break;
      case 'stats': setActiveModal('stats'); break;
      case 'details': setActiveModal('details'); break;
      case 'transits': setActiveModal('transits'); break;
      case 'directions': alert("Funcionalidad compleja. Próximamente."); break; 
      case 'solar': alert("Revolución Solar en desarrollo."); break;
      case 'synastry': alert("Sinastría en desarrollo."); break;
      default: alert(`Funcionalidad '${action}' en desarrollo.`);
    }
  };

  const downloadReport = async (format: string) => {
    if (!analysisResult || !cartaCompleta) {
      alert('No hay datos para exportar');
      return;
    }
    
    setIsExporting(true);
    
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      // Compilar el análisis completo como texto
      const analysisText = analysisResult.blocks
        .map(block => `
## ${block.title}

### Tesis Sistémica
${block.thesis}

### Auditoría Técnica
${block.audit}

### Traducción Vivencial
${block.synthesis}
        `)
        .join('\n\n---\n\n');
      
      const fullAnalysis = `
${analysisText}

---

## Conclusión
"${analysisResult.footerQuote}"
      `;
      
      const response = await fetch(`${API_URL}/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          carta_data: cartaCompleta,
          format: format,
          analysis_text: fullAnalysis,
          nombre: analysisResult.metadata.name // 🆕 Incluir nombre para portada
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error generando informe');
      }
      
      // Determinar tipo de archivo
      const contentType = response.headers.get('content-type') || '';
      let extension = 'txt';
      if (contentType.includes('pdf')) extension = 'pdf';
      else if (contentType.includes('word') || contentType.includes('docx')) extension = 'docx';
      else if (contentType.includes('html')) extension = 'html';
      else if (contentType.includes('markdown')) extension = 'md';
      
      // Descargar archivo
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carta_astral_${analysisResult.metadata.name.replace(/\s+/g, '_')}_${analysisResult.metadata.birthDate.replace(/-/g, '')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('✅ Informe descargado exitosamente');
    } catch (error: any) {
      console.error('Error descargando informe:', error);
      alert(`Error descargando informe: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };
  
  const downloadHTML = () => {
    // Abrir modal con selector de formatos
    setActiveModal('export');
  };

  // --- Modal Content Renderers ---
  const LegendContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <h4 className="text-indigo-400 font-bold mb-4 uppercase text-xs tracking-widest border-b border-white/10 pb-2">Planetas</h4>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(PLANET_SYMBOLS).map(([name, symbol]) => (
            <div key={name} className="flex flex-col items-center p-2 bg-white/5 rounded-lg border border-white/5 hover:border-indigo-500/50 transition-colors">
              <span className="text-2xl text-white mb-1">{symbol}</span>
              <span className="text-[10px] text-gray-400 uppercase">{name}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h4 className="text-indigo-400 font-bold mb-4 uppercase text-xs tracking-widest border-b border-white/10 pb-2">Zodiaco</h4>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(ZODIAC_SYMBOLS).map(([name, symbol]) => (
            <div key={name} className="flex flex-col items-center p-2 bg-white/5 rounded-lg border border-white/5 hover:border-indigo-500/50 transition-colors">
              <span className="text-2xl text-white mb-1">{symbol}</span>
              <span className="text-[10px] text-gray-400 uppercase">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const StatsContent = ({ data }: { data: any[] }) => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity size={18} className="text-indigo-400"/>
        <span className="text-sm font-bold text-white uppercase tracking-wider">{t.modalStatsTitle}</span>
      </div>
      {data.map((item) => (
        <div key={item.name} className="space-y-1">
          <div className="flex justify-between text-xs text-gray-300">
            <span className="font-bold">{item.name}</span>
            <span>{item.value} puntos</span>
          </div>
          <progress
            className={`mystic-progress ${(() => {
              const key = String(item.name ?? '').toLowerCase();
              if (key.includes('fuego') || key.includes('fire')) return 'mystic-progress--fire';
              if (key.includes('tierra') || key.includes('earth')) return 'mystic-progress--earth';
              if (key.includes('aire') || key.includes('air')) return 'mystic-progress--air';
              if (key.includes('agua') || key.includes('water')) return 'mystic-progress--water';
              return 'mystic-progress--indigo';
            })()}`}
            value={(Number(item.value) / 10) * 100}
            max={100}
            aria-label={`${item.name}: ${item.value} puntos`}
          />
        </div>
      ))}
      <div className="mt-8 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-200 leading-relaxed">
        El balance de elementos indica la distribución energética base. Un exceso indica un recurso disponible o compulsivo; una falta indica un aprendizaje o destino a integrar desde el exterior.
      </div>
    </div>
  );

  const TransitsContent = () => {
    if (!analysisResult) return null;
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    let lat = 40.4168, lon = -3.7038;
    if (analysisResult.metadata.birthPlace.includes(',')) {
      const [latStr, lonStr] = analysisResult.metadata.birthPlace.split(',');
      const parsedLat = parseFloat(latStr.trim());
      const parsedLon = parseFloat(lonStr.trim());
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        lat = parsedLat;
        lon = parsedLon;
      }
    }
    const transitData = calculateChartData(dateStr, timeStr, lat, lon);

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs text-gray-400 mb-4 font-mono border-b border-white/10 pb-2">
            <span>{dateStr} {timeStr}</span>
            <span>{analysisResult.metadata.birthPlace}</span>
        </div>
        
        <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left text-gray-300 font-mono">
                <thead className="bg-white/5 text-gray-400 uppercase tracking-wider">
                    <tr>
                        <th className="px-3 py-2">Planeta</th>
                        <th className="px-3 py-2 text-indigo-300">{t.transitNatal}</th>
                        <th className="px-3 py-2 text-emerald-300">{t.transitCurrent}</th>
                        <th className="px-3 py-2 text-center">Dif (Orbe)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {analysisResult.positions.filter(p => p.name !== 'Ascendente').map((natalPos) => {
                        const transitPos = transitData.positions.find(tp => tp.name === natalPos.name);
                        if (!transitPos) return null;
                        
                        let diff = Math.abs(natalPos.longitude - transitPos.longitude);
                        if (diff > 180) diff = 360 - diff;
                        const isConj = diff < 10;
                        const isOpp = Math.abs(diff - 180) < 10;
                        const isSqr = Math.abs(diff - 90) < 10;
                        
                        let aspectColor = "";
                        let aspectLabel = "";
                        if (isConj) { aspectColor = "text-yellow-400 font-bold"; aspectLabel = "☌"; }
                        else if (isOpp) { aspectColor = "text-red-400 font-bold"; aspectLabel = "☍"; }
                        else if (isSqr) { aspectColor = "text-red-400 font-bold"; aspectLabel = "□"; }

                        return (
                            <tr key={natalPos.name} className="hover:bg-white/5">
                                <td className="px-3 py-2 font-medium">{natalPos.name}</td>
                                <td className="px-3 py-2 opacity-70">{natalPos.degree} {natalPos.sign}</td>
                                <td className="px-3 py-2 text-emerald-200">{transitPos.degree} {transitPos.sign}</td>
                                <td className={`px-3 py-2 text-center ${aspectColor}`}>
                                    {aspectLabel} {diff.toFixed(1)}°
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>
    );
  };

  // --- Renderers --- //

  const Header = () => (
    <div className="mb-4">
      {/* Logo y controles básicos en una línea */}
      <div className="flex justify-between items-center mb-3 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 border border-indigo-500/30">
            <Sparkles size={20} />
          </div>
          <div>
            <h1 className="text-xl font-serif text-white tracking-wide">{t.appTitle}</h1>
            <p className="text-[10px] text-gray-400 font-mono uppercase tracking-widest">{t.appSubtitle}</p>
          </div>
        </div>
        {/* Idiomas y logout al lado del logo */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['es', 'ca', 'eu'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${
                  lang === l 
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' 
                  : 'text-gray-500 border-transparent hover:bg-white/5'
                }`}
                title={l === 'es' ? 'Español' : l === 'ca' ? 'Català' : 'Euskera'}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {isAuthenticated && (
            <button 
              onClick={handleLogout} 
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-all" 
              title={t.authLogout}
              aria-label={t.authLogout}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderAuth = () => (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
       <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10 animate-slide-up border border-indigo-500/30">
        <div className="flex justify-center mb-6">
           <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
             <Lock size={32} className="text-indigo-400" />
           </div>
        </div>
        
        <h2 className="text-2xl font-serif text-center text-white mb-2">
          {isRegistering ? t.authRegisterTitle : t.authLoginTitle}
        </h2>
        <p className="text-center text-gray-400 text-xs font-mono uppercase tracking-widest mb-8">FRAKTAL ACCESS CONTROL</p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="auth-username" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider">{t.authUser}</label>
            <div className="relative">
              <input id="auth-username" required type="text" 
                value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white pl-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none" />
              <UserIcon className="absolute left-3 top-3.5 text-gray-500" size={16} />
            </div>
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider">{t.authPass}</label>
            <div className="relative">
              <input id="auth-password" required type="password" 
                 value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})}
                 className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white pl-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none" />
              <Lock className="absolute left-3 top-3.5 text-gray-500" size={16} />
            </div>
          </div>
          
          {errorMsg && <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-500/20">{errorMsg}</div>}

          <button type="submit" className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20">
             {isRegistering ? t.authBtnRegister : t.authBtnLogin}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-xs text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-4">
            {isRegistering ? t.authSwitchToLog : t.authSwitchToReg}
          </button>
        </div>
      </div>
    </div>
  );

  const renderInput = () => (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-y-auto">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[100px]"></div>
      </div>
      <div className="glass-panel w-full max-w-lg p-6 rounded-2xl shadow-2xl relative z-10 animate-slide-up">
        <Header />
        
        {/* Indicador de técnica avanzada activa */}
        {selectedTechnique && (
          <div className="mb-4 p-3 bg-linear-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-purple-400" size={18} />
              <div>
                <div className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  Técnica Avanzada Activa
                </div>
                <div className="text-sm text-white font-medium">
                  {selectedTechnique === 'transits' && 'Tránsitos'}
                  {selectedTechnique === 'progressions' && 'Progresiones Secundarias'}
                  {selectedTechnique === 'solar_return' && 'Revolución Solar'}
                  {selectedTechnique === 'synastry' && 'Sinastría'}
                  {selectedTechnique === 'composite' && 'Carta Compuesta'}
                  {selectedTechnique === 'directions' && 'Direcciones Primarias'}
                  {selectedTechnique === 'lunar_return' && 'Revolución Lunar'}
                  {selectedTechnique === 'electional' && 'Astrología Electiva'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedTechnique(null);
                fetchSystemPrompt();
              }}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-white/10 hover:border-white/20 transition-colors"
              title="Desactivar técnica"
            >
              ✕
            </button>
          </div>
        )}
        
        <form onSubmit={(e) => { e.preventDefault(); setMode(AppMode.MODE_SELECTION); }} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="input-name" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputName}</label>
              <input id="input-name" required type="text" value={userInput.name} onChange={e => setUserInput({...userInput, name: e.target.value})} 
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <label htmlFor="input-date" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputDate}</label>
                 <input id="input-date" required type="date" value={userInput.date} onChange={e => setUserInput({...userInput, date: e.target.value})} 
                   className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none text-sm" />
               </div>
               <div>
                 <label htmlFor="input-time" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputTime}</label>
                 <input id="input-time" required type="time" value={userInput.time} onChange={e => setUserInput({...userInput, time: e.target.value})} 
                   className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none text-sm" />
               </div>
            </div>
            <div>
              <label htmlFor="input-place" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputPlace}</label>
              <div className="relative">
                <input 
                  id="input-place"
                  ref={placeInputRef}
                  required 
                  type="text" 
                  value={userInput.place} 
                  onChange={handlePlaceChange}
                  onFocus={() => {
                    if (placeSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay para permitir click en sugerencias
                    setTimeout(() => setShowSuggestions(false), 200);
                  }}
                  placeholder="Ej: Madrid, España o 40.41, -3.70"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white pl-10 focus:border-indigo-500 outline-none" 
                />
                {isGeocoding ? (
                  <Activity className="absolute left-3 top-3.5 text-indigo-400 animate-pulse" size={16} />
                ) : (
                  <Search className="absolute left-3 top-3.5 text-gray-500" size={16} />
                )}
                
                {/* Sugerencias de autocomplete */}
                {showSuggestions && placeSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-white/20 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {placeSuggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectSuggestion(sug)}
                        className="w-full text-left px-4 py-3 hover:bg-indigo-500/20 transition-colors border-b border-white/5 last:border-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">{sug.nombre}</div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {sug.lat.toFixed(4)}°, {sug.lon.toFixed(4)}° • {sug.timezone}
                            </div>
                          </div>
                          <CheckCircle2 className="text-indigo-400" size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="input-context" className="text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1 flex items-center gap-2">
                {t.inputContext}
              </label>
              <textarea id="input-context" rows={2} value={userInput.context} onChange={e => setUserInput({...userInput, context: e.target.value})}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none resize-none"
                placeholder={t.inputContextPlaceholder}
              />
            </div>
          </div>
          <button type="submit" className="w-full mt-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group">
            {t.btnNext} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform"/>
          </button>
        </form>
      </div>
    </div>
  );

  const renderListing = () => (
    <div className="min-h-screen p-4 sm:p-8 flex flex-col items-center overflow-y-auto">
       <Header />
       <div className="w-full max-w-4xl glass-panel p-8 rounded-2xl animate-fade-in">
         <div className="flex justify-between items-center mb-6">
           <h2 className="text-xl font-bold text-white">{t.listTitle}</h2>
           <button
             onClick={() => setMode(AppMode.INPUT)}
             className="text-gray-400 hover:text-white"
             title={t.btnNew}
             aria-label={t.btnNew}
           >
             <ChevronLeft/>
           </button>
         </div>
         {savedCharts.length === 0 ? (
           <div className="text-center py-10 text-gray-500">{t.listEmpty}</div>
         ) : (
           <div className="grid gap-4">
             {savedCharts.map(chart => (
               <div key={chart.id} className="flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-white/5 hover:border-indigo-500/30 transition-all">
                 <div>
                   <h3 className="text-indigo-300 font-bold">{chart.name}</h3>
                   <p className="text-xs text-gray-400 font-mono">{chart.date} | {chart.time}</p>
                 </div>
                 <div className="flex gap-2">
                   <button onClick={() => loadChart(chart)} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded font-bold">
                     {t.listLoad}
                   </button>
                   <button
                     onClick={() => deleteChart(chart.id)}
                     className="p-1.5 text-red-400 hover:bg-red-900/20 rounded"
                     title="Eliminar carta"
                     aria-label="Eliminar carta"
                   >
                     <Trash2 size={16} />
                   </button>
                 </div>
               </div>
             ))}
           </div>
         )}
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
          <button onClick={() => { setAnalysisType(AnalysisType.PSYCHOLOGICAL); handleAnalyze(); }}
            className="group glass-panel p-8 rounded-2xl text-left transition-all hover:bg-slate-800/80 hover:border-indigo-500/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 border border-indigo-500/20">
              <Brain size={28} />
            </div>
            <h3 className="text-2xl text-white font-serif mb-3">{t.modePsyTitle}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 font-light">{t.modePsyDesc}</p>
            <div className="flex items-center text-indigo-300 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
              {t.btnAnalyze} <ArrowRight size={14} className="ml-2 group-hover:translate-x-2"/>
            </div>
          </button>
          <button onClick={() => { setAnalysisType(AnalysisType.TECHNICAL); handleAnalyze(); }}
            className="group glass-panel p-8 rounded-2xl text-left transition-all hover:bg-slate-800/80 hover:border-emerald-500/40 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-linear-to-b from-emerald-500 to-teal-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 border border-emerald-500/20">
              <Layout size={28} />
            </div>
            <h3 className="text-2xl text-white font-serif mb-3">{t.modeTechTitle}</h3>
            <p className="text-gray-400 text-sm leading-relaxed mb-8 font-light">{t.modeTechDesc}</p>
            <div className="flex items-center text-emerald-300 text-xs font-bold uppercase tracking-widest group-hover:text-white transition-colors">
              {t.btnAnalyze} <ArrowRight size={14} className="ml-2 group-hover:translate-x-2"/>
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
          <div className="scale-125 mb-10 mystic-glow">
            <PlanetaryOrbit size="large" />
          </div>
          <h2 className="text-xl text-white font-bold mb-2 tracking-[0.2em] text-center mystic-text-glow">
            {t.processingSteps[Math.min(currentStepIndex, t.processingSteps.length - 1)]}
          </h2>
        </div>
        <div className="glass-panel rounded-xl p-8 order-1 md:order-2 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-pulse"></div>
          <div className="space-y-5">
            {t.processingSteps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex; const isActive = idx === currentStepIndex;
              if (idx > currentStepIndex + 2 || idx < currentStepIndex - 2) return null; 
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
          <h2 className="text-3xl font-serif text-white mb-2">{t.resultsTitle}</h2>
          <p className="text-gem-accent font-mono text-xs uppercase tracking-widest">{t.resultsSubtitle}</p>
        </div>

        {/* Datos de Nacimiento y Timezone */}
        {cartaCompleta && (
          <div className="mb-8">
            <ChartDataDisplay cartaCompleta={cartaCompleta} />
          </div>
        )}

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
           <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center items-center relative min-h-125">
             <NatalChart positions={analysisResult.positions} lang={lang} />
          </div>
        </div>
        <ControlPanel lang={lang} onTimeShift={handleTimeShift} onAction={handleToolbarAction} />
        <div className="flex justify-center mt-12">
          <button onClick={() => setResultStep(1)}
            className="group relative px-10 py-5 bg-white text-black font-bold rounded-xl transition-all hover:bg-indigo-50 shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center gap-4 overflow-hidden">
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
            <div className="glass-panel p-8 rounded-2xl border-l-4 border-indigo-500">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Brain size={16}/> {t.blockThesis}
            </h4>
            <div className="prose prose-invert prose-p:text-slate-300 prose-p:leading-relaxed max-w-none font-serif text-justify text-lg">{block.thesis}</div>
            </div>
            <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-xl flex items-start gap-4">
            <Activity size={20} className="text-emerald-500 mt-0.5 shrink-0" />
            <div>
                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-1">{t.blockAudit}</h4>
                <p className="text-sm text-emerald-100/80 font-mono leading-relaxed">{block.audit}</p>
            </div>
            </div>
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare size={16}/> {t.blockSynthesis}
            </h4>
            <div className="prose prose-invert prose-p:text-slate-200 prose-p:leading-8 max-w-none text-lg">{block.synthesis}</div>
            </div>
        </div>
        <div className="flex justify-between mt-16 border-t border-white/5 pt-8">
          <button onClick={() => setResultStep(prev => prev - 1)} className="flex items-center gap-3 px-6 py-3 text-slate-400 hover:text-white transition-colors uppercase text-xs font-bold tracking-widest">
            <ChevronLeft size={16} /> {t.btnNew}
          </button>
          <button onClick={() => setResultStep(prev => prev + 1)} className="flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-500/25">
            {isLastBlock ? t.btnNext : t.btnNext} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderFinalScreen = () => {
    if (!analysisResult) return null;
    return (
      <div className="animate-fade-in text-center max-w-3xl mx-auto py-12">
        <div className="w-24 h-24 mx-auto bg-linear-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white mb-10 shadow-[0_0_50px_rgba(99,102,241,0.4)]">
          <Sparkles size={40} />
        </div>
        <h2 className="text-4xl font-serif text-white mb-6">{t.resultsTitle}</h2>
        <div className="glass-panel rounded-xl p-10 mb-12 relative mx-4">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#020617] px-4 text-xs text-indigo-400 uppercase tracking-widest border border-indigo-900/50 rounded-full py-1">
            CORE CARUTTI v3.0
          </div>
          <p className="text-2xl font-serif italic text-indigo-200 leading-relaxed">"{analysisResult.footerQuote}"</p>
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
      <div className="min-h-screen text-slate-200 flex flex-col font-sans overflow-y-auto">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#020617]/80 border-b border-white/5">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400"><Activity size={16} /></div>
              <span className="text-xs font-bold tracking-[0.2em] text-white hidden sm:block">ASISTENTE SISTÉMICO</span>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-[10px] font-mono text-gray-500 uppercase border border-white/10 px-2 py-1 rounded">{analysisResult.metadata.name}</div>
                <div className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">{lang.toUpperCase()}</div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1 rounded-full text-xs font-bold bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 ml-2"
                  title={t.authLogout}
                  aria-label={t.authLogout}
                >
                  <LogOut size={14} />
                </button>
            </div>
          </div>
          {resultStep > 0 && resultStep <= analysisResult.blocks.length && (
            <progress
              className="mystic-progress-thin mystic-progress-thin--indigo box-shadow-[0_0_10px_#6366f1]"
              value={(resultStep / analysisResult.blocks.length) * 100}
              max={100}
              aria-label="Progreso"
            />
          )}
        </header>
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8 flex flex-col min-h-150">
          {resultStep === 0 && renderDashboardTechnical()}
          {resultStep > 0 && resultStep <= analysisResult.blocks.length && renderAnalysisBlock(resultStep - 1)}
          {resultStep > analysisResult.blocks.length && renderFinalScreen()}
        </main>
        
        {/* MODALS */}
        <GenericModal isOpen={activeModal === 'legend'} onClose={() => setActiveModal(null)} title={t.modalLegendTitle}>
          <LegendContent />
        </GenericModal>
        
        <GenericModal isOpen={activeModal === 'stats'} onClose={() => setActiveModal(null)} title={t.modalStatsTitle}>
          {analysisResult && <StatsContent data={analysisResult.elementalBalance} />}
        </GenericModal>

        <GenericModal isOpen={activeModal === 'details'} onClose={() => setActiveModal(null)} title={t.modalDetailsTitle}>
           {analysisResult && <PlanetaryTable positions={analysisResult.positions} lang={lang} />}
        </GenericModal>

        <GenericModal isOpen={activeModal === 'transits'} onClose={() => setActiveModal(null)} title={t.modalTransitsTitle}>
           <TransitsContent />
        </GenericModal>

        <GenericModal isOpen={activeModal === 'export'} onClose={() => setActiveModal(null)} title="Exportar Informe">
           <ExportSelector onExport={downloadReport} isLoading={isExporting} />
        </GenericModal>

      </div>
    );
  };

  return (
    <MysticBackground>
      {/* Contenido con scroll tipo móvil */}
      <div className={`min-h-screen ${isAuthenticated && mode !== AppMode.AUTH && mode !== AppMode.SUBSCRIPTION_SUCCESS ? 'pb-20' : ''}`}>
        {mode === AppMode.AUTH && renderAuth()}
        {mode === AppMode.INPUT && renderInput()}
        {mode === AppMode.MODE_SELECTION && renderModeSelection()}
        {mode === AppMode.PROCESSING && renderProcessing()}
        {mode === AppMode.RESULTS && renderResults()}
        {mode === AppMode.LISTING && renderListing()}
        {mode === AppMode.ADMIN_PANEL && !showAdminPromptEditor && (
          isAdmin && currentUser?.role === 'admin' ? (
            <AdminDashboard
              onBack={() => setMode(AppMode.INPUT)}
              onEditPrompt={() => setShowAdminPromptEditor(true)}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <div className="bg-red-900/30 border border-red-500 rounded-xl p-8 max-w-md">
                <h2 className="text-2xl font-bold text-red-400 mb-4">Acceso Denegado</h2>
                <p className="text-gray-300 mb-6">
                  No tienes permisos de administrador para acceder a este panel.
                </p>
                <button
                  onClick={() => setMode(AppMode.INPUT)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Volver
                </button>
              </div>
            </div>
          )
        )}
        {mode === AppMode.ADMIN_PANEL && showAdminPromptEditor && (
          <AdminPanel
            onBack={() => setShowAdminPromptEditor(false)}
            onUpdatePrompt={(newPrompt) => {
              setSystemInstruction(newPrompt);
              setShowAdminPromptEditor(false);
            }}
          />
        )}
        {mode === AppMode.USER_PROFILE && (
          <UserProfilePage onBack={() => setMode(AppMode.INPUT)} />
        )}
        {mode === AppMode.SUBSCRIPTION_PLANS && (
          <SubscriptionPlans 
            onSelectPlan={(tier, billing) => {
              alert(`Plan seleccionado: ${tier} (${billing})`);
              setMode(AppMode.INPUT);
            }}
            onClose={() => setMode(AppMode.INPUT)}
          />
        )}
        {mode === AppMode.ADVANCED_TECHNIQUES && (
          <AdvancedTechniques
            onSelectTechnique={async (technique) => {
              try {
                // Verificar permisos del usuario
                const subscription = await api.getUserSubscription();
                const userTier = subscription.tier?.toLowerCase() || 'free';
                
                // Mapear técnica a requerimiento de plan
                const techniqueRequirements: Record<string, string> = {
                  'transits': 'pro',
                  'progressions': 'pro',
                  'solar_return': 'premium',
                  'synastry': 'premium',
                  'composite': 'premium',
                  'directions': 'premium',
                  'lunar_return': 'premium',
                  'electional': 'premium'
                };
                
                const requiredTier = techniqueRequirements[technique] || 'pro';
                const tierOrder = { 'free': 0, 'pro': 1, 'premium': 2, 'enterprise': 3 };
                const userTierLevel = tierOrder[userTier as keyof typeof tierOrder] || 0;
                const requiredTierLevel = tierOrder[requiredTier as keyof typeof tierOrder] || 1;
                
                if (userTierLevel < requiredTierLevel) {
                  alert(`Esta técnica requiere un plan ${requiredTier.toUpperCase()} o superior. Tu plan actual es ${userTier.toUpperCase()}. Por favor, mejora tu plan para acceder a esta funcionalidad.`);
                  setMode(AppMode.SUBSCRIPTION_PLANS);
                  return;
                }
                
                // Guardar técnica seleccionada y cargar prompt especializado
                setSelectedTechnique(technique);
                await fetchSystemPrompt(technique);
                
                // Cambiar a modo INPUT para que el usuario ingrese los datos
                setMode(AppMode.INPUT);
                
                // Mostrar mensaje informativo
                const techniqueNames: Record<string, string> = {
                  'transits': 'Tránsitos',
                  'progressions': 'Progresiones Secundarias',
                  'solar_return': 'Revolución Solar',
                  'synastry': 'Sinastría',
                  'composite': 'Carta Compuesta',
                  'directions': 'Direcciones Primarias',
                  'lunar_return': 'Revolución Lunar',
                  'electional': 'Astrología Electiva'
                };
                
                alert(`✅ Técnica "${techniqueNames[technique] || technique}" activada. Ahora ingresa los datos de la carta para el análisis.`);
              } catch (error: any) {
                console.error('Error al seleccionar técnica:', error);
                alert(`Error al activar la técnica: ${error.message || 'Error desconocido'}`);
              }
            }}
            onBack={() => {
              setSelectedTechnique(null);
              fetchSystemPrompt(); // Restaurar prompt por defecto
              setMode(AppMode.INPUT);
            }}
          />
        )}
        {mode === AppMode.SUBSCRIPTION_SUCCESS && stripeSessionId && (
          <SubscriptionSuccess
            sessionId={stripeSessionId}
            onContinue={() => {
              setMode(AppMode.USER_PROFILE);
              setStripeSessionId(null);
            }}
          />
        )}
      </div>
      
      {/* Barra de navegación inferior tipo móvil - FUERA del contenido scrolleable */}
      {isAuthenticated && mode !== AppMode.AUTH && mode !== AppMode.SUBSCRIPTION_SUCCESS && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-area-inset-bottom">
          <div className="max-w-2xl mx-auto flex justify-around items-center">
            <button 
              onClick={() => setMode(AppMode.USER_PROFILE)} 
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                mode === AppMode.USER_PROFILE 
                  ? 'text-indigo-400 bg-indigo-500/10' 
                  : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/5'
              }`}
              title="Mi Perfil"
            >
              <UserIcon size={20}/>
              <span className="text-[10px] font-medium">Perfil</span>
            </button>
            <button 
              onClick={() => setMode(AppMode.SUBSCRIPTION_PLANS)} 
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                mode === AppMode.SUBSCRIPTION_PLANS 
                  ? 'text-yellow-400 bg-yellow-500/10' 
                  : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/5'
              }`}
              title="Planes"
            >
              <Crown size={20}/>
              <span className="text-[10px] font-medium">Planes</span>
            </button>
            <button 
              onClick={() => setMode(AppMode.INPUT)} 
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                mode === AppMode.INPUT || mode === AppMode.MODE_SELECTION
                  ? 'text-purple-400 bg-purple-500/10' 
                  : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/5'
              }`}
              title="Nueva Carta"
            >
              <Sparkles size={20}/>
              <span className="text-[10px] font-medium">Nueva</span>
            </button>
            <button 
              onClick={() => { setMode(AppMode.ADVANCED_TECHNIQUES); }} 
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                mode === AppMode.ADVANCED_TECHNIQUES 
                  ? 'text-emerald-400 bg-emerald-500/10' 
                  : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5'
              }`}
              title="Técnicas Avanzadas"
            >
              <Zap size={20}/>
              <span className="text-[10px] font-medium">Técnicas</span>
            </button>
            <button 
              onClick={() => { setMode(AppMode.LISTING); loadChartsFromApi(); }} 
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                mode === AppMode.LISTING 
                  ? 'text-blue-400 bg-blue-500/10' 
                  : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/5'
              }`}
              title="Mis Cartas"
            >
              <FolderOpen size={20}/>
              <span className="text-[10px] font-medium">Cartas</span>
            </button>
            {isAdmin && (
              <button 
                onClick={() => setMode(AppMode.ADMIN_PANEL)} 
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  mode === AppMode.ADMIN_PANEL 
                    ? 'text-red-400 bg-red-500/10' 
                    : 'text-gray-400 hover:text-red-400 hover:bg-red-500/5'
                }`}
                title="Admin"
              >
                <ShieldAlert size={20}/>
                <span className="text-[10px] font-medium">Admin</span>
              </button>
            )}
          </div>
        </div>
      )}
    </MysticBackground>
  );
};

export default App;
