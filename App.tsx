
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
  Zap,
  ChevronDown,
  Calendar,
  Settings,
  CreditCard
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
import ReportGenerationWizard from './components/ReportGenerationWizard';
import MaterialBackground from './components/MaterialBackground';
import SubscriptionPlans from './components/SubscriptionPlans'; // 🆕 Planes
import UserProfilePage from './components/UserProfilePage'; // 🆕 Perfil
import SubscriptionSuccess from './components/SubscriptionSuccess'; // 🆕 Confirmación de pago
import AdvancedTechniques from './components/AdvancedTechniques'; // 🆕 Técnicas
import ProfessionalServices from './components/ProfessionalServices';
import ChartDataDisplay from './components/ChartDataDisplay'; // 🆕 Visualización de datos de carta
import LandingPage from './components/LandingPage';
import { calculateChartData } from './astrologyEngine';
import { api } from './services/api';
import './styles/material-theme.css';
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
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);
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
      return;
    }

    const landingParam = params.get('landing') || params.get('mode');
    if (landingParam === '1' || landingParam === 'landing') {
      setMode(AppMode.LANDING);
    }
  }, []);

  // Guard de seguridad: si no hay autenticación, solo permitimos LANDING y AUTH
  // (y SUBSCRIPTION_SUCCESS únicamente cuando viene con session_id desde Stripe)
  useEffect(() => {
    if (isAuthenticated) return;

    const allowUnauthenticated = new Set<AppMode>([AppMode.AUTH, AppMode.LANDING]);
    if (stripeSessionId) {
      allowUnauthenticated.add(AppMode.SUBSCRIPTION_SUCCESS);
    }

    if (!allowUnauthenticated.has(mode)) {
      setMode(AppMode.AUTH);
    }
  }, [isAuthenticated, mode, stripeSessionId]);

  // Modal State
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showReportWizard, setShowReportWizard] = useState(false);
  const [generatedFullReport, setGeneratedFullReport] = useState<string | null>(null);
  type ReportType = 'individual' | 'infantil' | 'pareja' | 'familiar' | 'equipo' | 'profesional';
  type ProfileInput = { name: string; date: string; time: string; place: string };
  const [reportType, setReportType] = useState<ReportType>('individual');
  const [reportProfilesInput, setReportProfilesInput] = useState<ProfileInput[]>([]);
  const [reportProfilesPrepared, setReportProfilesPrepared] = useState<any[] | undefined>(undefined);
  const [isPreparingReportProfiles, setIsPreparingReportProfiles] = useState(false);
  const [reportSetupError, setReportSetupError] = useState<string | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<Array<{ profile_id: string; name: string; birth_date: string; birth_time: string; birth_place: string }>>([]);
  const [isLoadingSavedProfiles, setIsLoadingSavedProfiles] = useState(false);
  const [savingProfileIdx, setSavingProfileIdx] = useState<number | null>(null);
  const [selectedSavedProfileId, setSelectedSavedProfileId] = useState<string>('');
  const [applyProfileTarget, setApplyProfileTarget] = useState<'auto' | 'new' | number>('auto');
  const [editingProfileDraft, setEditingProfileDraft] = useState<{ profile_id: string; name: string; birth_date: string; birth_time: string; birth_place: string } | null>(null);
  const [isSavingEditedProfile, setIsSavingEditedProfile] = useState(false);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);

  const geoCacheRef = useRef<Map<string, { lat: number; lon: number; timezone: string }>>(new Map());
  const [reportReadySessionId, setReportReadySessionId] = useState<string | null>(null);
  const [isDownloadingSessionPdf, setIsDownloadingSessionPdf] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const SIGN_ELEMENTS: Record<string, PlanetPosition['element']> = {
    'Aries': 'Fuego', 'Leo': 'Fuego', 'Sagitario': 'Fuego',
    'Tauro': 'Tierra', 'Virgo': 'Tierra', 'Capricornio': 'Tierra',
    'Géminis': 'Aire', 'Libra': 'Aire', 'Acuario': 'Aire',
    'Cáncer': 'Agua', 'Escorpio': 'Agua', 'Piscis': 'Agua'
  };

  const buildPositionsFromCartaCompleta = (carta: any): PlanetPosition[] | null => {
    if (!carta || !carta.planetas || !carta.angulos) return null;

    const out: PlanetPosition[] = [];

    const addPoint = (name: string, pos: any) => {
      if (!pos) return;
      const sign = pos.signo;
      const element = (SIGN_ELEMENTS[sign] || 'Fuego') as PlanetPosition['element'];
      const deg = typeof pos.grados === 'number' ? pos.grados : 0;
      const min = typeof pos.minutos === 'number' ? pos.minutos : 0;
      const degree = `${deg}°${String(min).padStart(2, '0')}′`;
      out.push({
        name,
        sign,
        degree,
        house: String(pos.casa ?? '1'),
        retrograde: Boolean(pos.retrogrado),
        element,
        longitude: Number(pos.longitud ?? 0)
      });
    };

    // Ascendente
    addPoint('Ascendente', carta.angulos?.ascendente);

    // Planetas principales en orden clásico
    const ordered = ['Sol', 'Luna', 'Mercurio', 'Venus', 'Marte', 'Júpiter', 'Saturno', 'Urano', 'Neptuno', 'Plutón', 'Lilith med.', 'Nodo Norte', 'Quirón'];
    ordered.forEach((k) => addPoint(k, carta.planetas?.[k]));

    // Añadir cualquier otro punto que venga del backend y no esté en la lista
    Object.keys(carta.planetas || {}).forEach((k) => {
      if (ordered.includes(k)) return;
      addPoint(k, carta.planetas[k]);
    });

    return out;
  };

  // Estado para autocomplete de lugares
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{ nombre: string, lat: number, lon: number, timezone: string }>>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const placeInputRef = useRef<HTMLInputElement>(null);
  const geocodeTimeoutRef = useRef<number | null>(null);

  const stepIntervalRef = useRef<number | null>(null);
  const t = TRANSLATIONS[lang];

  const getValidToken = (): string | null => {
    const token = localStorage.getItem('fraktal_token');
    if (!token) return null;

    // JWT exp está en segundos desde epoch
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const payload = JSON.parse(atob(padded));
      const expSeconds = payload?.exp;
      if (typeof expSeconds !== 'number') return token;

      // 10s de margen para clocks desincronizados
      const expiresAtMs = expSeconds * 1000;
      if (Date.now() > (expiresAtMs - 10_000)) return null;
      return token;
    } catch {
      return null;
    }
  };

  // Check token on mount
  useEffect(() => {
    const token = getValidToken();
    const savedUser = localStorage.getItem('fraktal_user');

    if (token) {
      setIsAuthenticated(true);
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        if (user.role === 'admin' || user.username === 'admin@programafraktal.com') {
          setIsAdmin(true);
        }

        // Refresh subscription status
        api.getUserSubscription().then(sub => {
          const updatedUser = { ...user, subscription_tier: sub.tier };
          setCurrentUser(updatedUser);
          localStorage.setItem('fraktal_user', JSON.stringify(updatedUser));
        }).catch(err => {
          // Silenciar errores 401 durante la carga inicial si el token expiró
          if (err.message !== 'Unauthorized') {
            console.error('Error obteniendo suscripción:', err);
          }
        });
      }
      setMode(AppMode.INPUT);
      loadChartsFromApi();
      fetchSystemPrompt(); // Cargar prompt dinámico
    } else {
      // Token ausente o expirado/corrupto
      handleLogout();
    }
  }, []);

  const loadChartsFromApi = async () => {
    try {
      const charts = await api.getCharts();
      setSavedCharts(charts);
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') {
        handleLogout();
        return;
      }
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
        } catch (e: any) {
          // Silenciar errores 401 durante la carga inicial
          if (e?.message && !e.message.includes('Unauthorized')) {
            console.warn(`⚠️ No se pudo cargar prompt especializado para ${techniqueType}, usando prompt por defecto:`, e);
          }
        }
      }

      // Si no hay técnica o falló la carga, usar el prompt por defecto
      try {
        const promptData = await api.getSystemPrompt();
        if (promptData && promptData.content) {
          setSystemInstruction(promptData.content);
        }
      } catch (e: any) {
        // Silenciar errores 401 durante la carga inicial
        if (e?.message && !e.message.includes('Unauthorized')) {
          console.warn("Usando prompt por defecto (Offline o Error DB)", e);
        }
      }
    } catch (e) {
      // Error general silenciado
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsAuthLoading(true);
    try {
      if (isRegistering) {
        await api.register(authForm.username, authForm.password);
        const res = await api.login(authForm.username, authForm.password);
        finishLogin(res);
      } else {
        const res = await api.login(authForm.username, authForm.password);
        finishLogin(res);
      }
    } catch (err: any) {
      // Mostrar el mensaje de error específico si está disponible
      const errorMessage = err?.message || 'Error en credenciales o conexión.';
      setErrorMsg(errorMessage);
      console.error('Error de autenticación:', err);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const finishLogin = (res: any) => {
    localStorage.setItem('fraktal_token', res.access_token);
    localStorage.setItem('fraktal_user', JSON.stringify(res.user));
    setCurrentUser(res.user);

    setIsAuthenticated(true);
    const isUserAdmin = res.user.role === 'admin';
    if (isUserAdmin) {
      setIsAdmin(true);
    }

    // Si es un nuevo registro, mostrar planes de suscripción
    // Si es login normal, ir a INPUT
    const wasRegistering = isRegistering;
    setIsRegistering(false);

    // Experiencia capada para no-admin: solo Servicios Profesionales
    // Mantiene toda la funcionalidad actual para admin.
    if (!isUserAdmin) {
      setMode(AppMode.PROFESSIONAL_SERVICES);
    } else if (wasRegistering) {
      // Nuevo usuario admin: mostrar planes para que pueda elegir
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

  // Si el usuario NO es admin, permitir solo ciertos modos
  useEffect(() => {
    if (!isAuthenticated) return;
    const allowedModesForNonAdmin = [
      AppMode.PROFESSIONAL_SERVICES,
      AppMode.USER_PROFILE,
      AppMode.SUBSCRIPTION_PLANS,
      AppMode.SUBSCRIPTION_SUCCESS,
      AppMode.AUTH
    ];
    if (currentUser?.role !== 'admin' && !allowedModesForNonAdmin.includes(mode)) {
      setMode(AppMode.PROFESSIONAL_SERVICES);
    }
  }, [isAuthenticated, currentUser, mode]);

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
  const parseCoordinatePart = (raw: string): number | null => {
    if (!raw || !raw.trim()) return null;

    // Normalize and detect hemisphere/direction
    const trimmed = raw.trim();
    const upper = trimmed.toUpperCase();

    const hasNorth = /\bN\b/.test(upper);
    const hasSouth = /\bS\b/.test(upper);
    const hasEast = /\bE\b/.test(upper);
    const hasWest = /\bW\b/.test(upper) || /\bO\b/.test(upper); // O = Oeste

    const directionSign = (hasSouth || hasWest) ? -1 : (hasNorth || hasEast) ? 1 : 0;

    // Strip direction letters and normalize symbols
    const cleaned = upper
      .replace(/[NSEO W]/g, ' ')
      .replace(/º/g, '°')
      .replace(/’/g, "'")
      .replace(/′/g, "'")
      .replace(/″/g, '"')
      .replace(/\s+/g, ' ')
      .trim();

    const nums = cleaned.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length === 0) return null;

    if (nums.length === 1) {
      const val = Number(nums[0]);
      if (Number.isNaN(val)) return null;
      if (directionSign !== 0) return Math.abs(val) * directionSign;
      return val;
    }

    // D°M′(S″) format
    const deg = Number(nums[0]);
    const min = Number(nums[1]);
    const sec = nums.length >= 3 ? Number(nums[2]) : 0;
    if ([deg, min, sec].some(n => Number.isNaN(n))) return null;

    const abs = Math.abs(deg) + (Math.abs(min) / 60) + (Math.abs(sec) / 3600);
    const explicitSign = deg < 0 ? -1 : 1;
    const sign = directionSign !== 0 ? directionSign : explicitSign;
    return abs * sign;
  };

  const parseLatLonFromPlace = (place: string): { lat: number; lon: number; timezone?: string } | null => {
    if (!place || !place.trim()) return null;

    if (place.includes(',')) {
      const parts = place.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length < 2) return null;

      const lat = parseCoordinatePart(parts[0]);
      const lon = parseCoordinatePart(parts[1]);
      if (lat === null || lon === null) return null;

      const timezone = parts[2]?.trim();
      return timezone ? { lat, lon, timezone } : { lat, lon };
    }

    // Space-separated coordinates
    const parts = place.trim().split(/\s+/);
    if (parts.length === 2) {
      const lat = parseCoordinatePart(parts[0]);
      const lon = parseCoordinatePart(parts[1]);
      if (lat === null || lon === null) return null;
      return { lat, lon };
    }

    return null;
  };

  const esCoordenadas = (place: string): boolean => {
    if (!place || !place.trim()) return false;

    const parsed = parseLatLonFromPlace(place);
    if (!parsed) return false;
    return (
      parsed.lat >= -90 && parsed.lat <= 90 &&
      parsed.lon >= -180 && parsed.lon <= 180
    );
  };

  // Función para geocodificar un lugar
  const geocodificarLugar = async (nombreLugar: string): Promise<{ lat: number, lon: number, timezone: string, nombre?: string }> => {
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
    setUserInput({ ...userInput, place: nuevoValor });
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
  const handleSelectSuggestion = (sugerencia: { nombre: string, lat: number, lon: number, timezone: string }) => {
    setUserInput({ ...userInput, place: sugerencia.nombre });
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
        const parsed = parseLatLonFromPlace(inputToUse.place);
        if (parsed) {
          lat = parsed.lat;
          lon = parsed.lon;
          timezone = parsed.timezone || 'UTC';
        }
      } else {
        // Es texto, geocodificar
        try {
          console.log(`🌍 Geocodificando lugar: ${inputToUse.place}`);
          const geocoded = await geocodificarLugar(inputToUse.place);
          lat = geocoded.lat;
          lon = geocoded.lon;
          timezone = geocoded.timezone;
          try {
            const key = (inputToUse.place || '').trim().toLowerCase();
            if (key) geoCacheRef.current.set(key, { lat, lon, timezone });
          } catch {}
          console.log(`✅ Geocodificado: Lat ${lat}, Lon ${lon}, TZ: ${timezone}`);
        } catch (error: any) {
          console.error('❌ Error geocodificando lugar:', error);
          throw new Error(`No se pudo encontrar el lugar "${inputToUse.place}". Por favor, verifica el nombre o usa coordenadas (ej: 40.41, -3.70)`);
        }
      }

      // Primero calcular con el motor frontend (rápido para fallback)
      const realData = calculateChartData(inputToUse.date, inputToUse.time, lat, lon);

      // Paralelamente, calcular con Swiss Ephemeris en backend (precisión)
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      let cartaBackend: any | null = null;
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
          cartaBackend = ephemerisData.data;
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

      const swissPositions = cartaBackend ? buildPositionsFromCartaCompleta(cartaBackend) : null;
      const positionsForAnalysis = (swissPositions && swissPositions.length > 0) ? swissPositions : realData.positions;
      const positionsText = positionsForAnalysis.map(p => `${p.name}: ${p.degree} ${p.sign} (Casa ${p.house})`).join('\n');
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
        positions: positionsForAnalysis,
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
    switch (unit) {
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
    const parsed = parseLatLonFromPlace(newInput.place);
    if (parsed) {
      lat = parsed.lat;
      lon = parsed.lon;
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
    switch (action) {
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
      const token = getValidToken();
      if (!token) {
        alert('Necesitas iniciar sesión para exportar informes.');
        handleLogout();
        return;
      }
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

      // Si hay un informe completo generado por el wizard, usarlo
      // Si no, usar el análisis generado normalmente
      const fullAnalysis = generatedFullReport || `
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
        // Intentar mostrar el mensaje real del backend (por ejemplo 403 por plan)
        let detail = '';
        try {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await response.json();
            detail = data?.detail || data?.message || '';
          } else {
            detail = await response.text();
          }
        } catch {
          // ignore
        }
        if (response.status === 401) {
          handleLogout();
          throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
        }
        throw new Error(detail || `Error generando informe (HTTP ${response.status})`);
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
    // Abrir modal de configuración de informe (tipo + perfiles). El wizard se abre después.
    setGeneratedFullReport(null);
    setReportSetupError(null);
    const base = activeChartParams || userInput;
    const initialProfiles: ProfileInput[] = [{
      name: analysisResult?.metadata?.name || base.name || '',
      date: base.date || '',
      time: base.time || '',
      place: base.place || ''
    }];
    setReportProfilesInput(initialProfiles);
    setReportProfilesPrepared(undefined);
    setReportType('individual');
    setActiveModal('report_setup');
  };

  const prepareReportProfiles = async () => {
    setIsPreparingReportProfiles(true);
    setReportSetupError(null);
    try {
      const token = getValidToken();
      if (!token) throw new Error('Necesitas iniciar sesión para generar un informe.');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const inputs = reportProfilesInput.filter((p) => (p?.name || '').trim() && (p?.date || '').trim() && (p?.time || '').trim() && (p?.place || '').trim());
      if (inputs.length === 0) throw new Error('Añade al menos 1 persona con datos completos.');
      if (reportType === 'pareja' && inputs.length < 2) throw new Error('Pareja requiere al menos 2 personas.');
      if ((reportType === 'familiar' || reportType === 'equipo') && inputs.length < 2) throw new Error('Este tipo requiere al menos 2 personas.');

      const prepared: any[] = [];
      for (const p of inputs) {
        // Resolver coords/tz (reutiliza utilidades del flujo principal)
        let lat = 40.4168, lon = -3.7038, timezone = 'UTC';
        if (esCoordenadas(p.place)) {
          const parsed = parseLatLonFromPlace(p.place);
          if (parsed) {
            lat = parsed.lat;
            lon = parsed.lon;
            timezone = parsed.timezone || 'UTC';
          }
        } else {
          const key = (p.place || '').trim().toLowerCase();
          const cached = key ? geoCacheRef.current.get(key) : undefined;
          if (cached) {
            lat = cached.lat;
            lon = cached.lon;
            timezone = cached.timezone;
          } else {
            const geocoded = await geocodificarLugar(p.place);
            lat = geocoded.lat;
            lon = geocoded.lon;
            timezone = geocoded.timezone;
            if (key) geoCacheRef.current.set(key, { lat, lon, timezone });
          }
        }

        const ephemerisResponse = await fetch(`${API_URL}/ephemeris/calculate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fecha: p.date,
            hora: p.time,
            latitud: lat,
            longitud: lon,
            zona_horaria: timezone
          }),
        });

        if (!ephemerisResponse.ok) {
          const err = await ephemerisResponse.json().catch(() => ({}));
          throw new Error(err?.detail || `No se pudieron calcular efemérides para ${p.name}`);
        }
        const ephemerisData = await ephemerisResponse.json();
        if (!ephemerisData?.data) throw new Error(`Respuesta inválida de efemérides para ${p.name}`);

        prepared.push({
          nombre: p.name,
          carta_data: ephemerisData.data
        });
      }

      setReportProfilesPrepared(prepared);
      setActiveModal(null);
      setShowReportWizard(true);
    } catch (e: any) {
      setReportSetupError(e?.message || 'Error preparando perfiles del informe');
    } finally {
      setIsPreparingReportProfiles(false);
    }
  };

  const loadSavedProfiles = async () => {
    setIsLoadingSavedProfiles(true);
    try {
      const profiles = await api.getMyProfiles();
      setSavedProfiles(profiles || []);
    } catch (e) {
      // Silencioso: si backend aún no está desplegado, no romper UI
      setSavedProfiles([]);
    } finally {
      setIsLoadingSavedProfiles(false);
    }
  };

  // Cargar perfiles guardados cuando se abre el modal de configuración
  useEffect(() => {
    if (activeModal === 'report_setup') {
      // Best-effort: no bloquear UI si falla
      loadSavedProfiles();
      setSelectedSavedProfileId('');
      setEditingProfileDraft(null);
      setApplyProfileTarget('auto');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModal]);

  const handleWizardComplete = (fullReport: string) => {
    setGeneratedFullReport(fullReport);
    setShowReportWizard(false);
    // Ahora abrir selector de formatos con el informe generado
    setActiveModal('export');
  };

  const downloadSessionPdf = async (sessionId: string) => {
    setIsDownloadingSessionPdf(true);
    try {
      const token = getValidToken();
      if (!token) throw new Error('Necesitas iniciar sesión para descargar el PDF.');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/reports/download-pdf/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error descargando PDF (HTTP ${res.status})`);
      }
      const disposition = res.headers.get('content-disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/i);
      const filename = match?.[1] || `informe_${sessionId}.pdf`;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsDownloadingSessionPdf(false);
    }
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
        <Activity size={18} className="text-indigo-400" />
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
    const parsed = parseLatLonFromPlace(analysisResult.metadata.birthPlace);
    if (parsed) {
      lat = parsed.lat;
      lon = parsed.lon;
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
        {/* Idiomas y menú de usuario */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['es', 'ca', 'eu'] as Language[]).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${lang === l
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
            <div className="relative">
              {/* User Menu Button */}
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
                title="Menú de usuario"
                aria-label="Menú de usuario"
              >
                <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/50">
                  <UserIcon size={16} className="text-indigo-400" />
                </div>
                <ChevronDown size={14} className={`transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-700 bg-linear-to-r from-indigo-900/50 to-purple-900/50">
                    <p className="text-sm font-semibold text-white">{currentUser?.username || 'Usuario'}</p>
                    <p className="text-xs text-gray-400">{currentUser?.email || ''}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setMode(AppMode.USER_PROFILE);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-indigo-500/10 hover:text-white transition-colors"
                    >
                      <UserIcon size={16} />
                      <span className="text-sm">Mi Perfil</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        setMode(AppMode.SUBSCRIPTION_PLANS);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-indigo-500/10 hover:text-white transition-colors"
                    >
                      <Crown size={16} />
                      <span className="text-sm">Mi Suscripción</span>
                    </button>

                    {!isAdmin && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setMode(AppMode.PROFESSIONAL_SERVICES);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-300 hover:bg-indigo-500/10 hover:text-white transition-colors"
                      >
                        <Calendar size={16} />
                        <span className="text-sm">Servicios</span>
                      </button>
                    )}
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-700 py-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                    >
                      <LogOut size={16} />
                      <span className="text-sm">{t.authLogout}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                placeholder="Usuario"
                value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white pl-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none" />
              <UserIcon className="absolute left-3 top-3.5 text-gray-500" size={16} />
            </div>
          </div>
          <div>
            <label htmlFor="auth-password" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider">{t.authPass}</label>
            <div className="relative">
              <input id="auth-password" required type="password"
                placeholder="Contraseña"
                value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white pl-10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none" />
              <Lock className="absolute left-3 top-3.5 text-gray-500" size={16} />
            </div>
          </div>

          {errorMsg && <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-500/20">{errorMsg}</div>}

          <button
            type="submit"
            disabled={isAuthLoading}
            className={`w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center ${isAuthLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isAuthLoading ? (
              <>
                <CircleDashed className="animate-spin mr-2" size={20} />
                {isRegistering ? 'Registrando...' : 'Iniciando sesión...'}
              </>
            ) : (
              isRegistering ? t.authBtnRegister : t.authBtnLogin
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-xs text-gray-400 hover:text-white underline decoration-gray-600 underline-offset-4">
            {isRegistering ? t.authSwitchToLog : t.authSwitchToReg}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setMode(AppMode.LANDING)}
            className="text-xs text-indigo-300 hover:text-indigo-200 underline decoration-indigo-500/40 underline-offset-4"
          >
            Ver la web (servicios, planes y contacto)
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
              <input id="input-name" required type="text" placeholder="Nombre completo" value={userInput.name} onChange={e => setUserInput({ ...userInput, name: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-date" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputDate}</label>
                <input id="input-date" required type="date" title="Fecha de nacimiento" value={userInput.date} onChange={e => setUserInput({ ...userInput, date: e.target.value })}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label htmlFor="input-time" className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider ml-1">{t.inputTime}</label>
                <input id="input-time" required type="time" title="Hora de nacimiento" value={userInput.time} onChange={e => setUserInput({ ...userInput, time: e.target.value })}
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
                  placeholder="Ej: Madrid, España o 40.41, -3.70"
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
              <textarea id="input-context" rows={2} value={userInput.context} onChange={e => setUserInput({ ...userInput, context: e.target.value })}
                className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:border-indigo-500 outline-none resize-none"
                placeholder={t.inputContextPlaceholder}
              />
            </div>
          </div>
          <button type="submit" className="w-full mt-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 group">
            {t.btnNext} <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
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
            <ChevronLeft />
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
          <h2 className="text-2xl text-slate-900 font-semibold border-b border-slate-200 pb-2 px-8">{t.selectProtocol}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => { setAnalysisType(AnalysisType.PSYCHOLOGICAL); handleAnalyze(); }}
            className="group md-card p-8 rounded-2xl text-left transition-all hover:border-blue-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700 mb-6 group-hover:scale-110 border border-blue-100">
              <Brain size={28} />
            </div>
            <h3 className="text-2xl text-slate-900 font-semibold mb-3">{t.modePsyTitle}</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">{t.modePsyDesc}</p>
            <div className="flex items-center text-blue-700 text-xs font-bold uppercase tracking-widest group-hover:text-blue-900 transition-colors">
              {t.btnAnalyze} <ArrowRight size={14} className="ml-2 group-hover:translate-x-2" />
            </div>
          </button>
          <button onClick={() => { setAnalysisType(AnalysisType.TECHNICAL); handleAnalyze(); }}
            className="group md-card p-8 rounded-2xl text-left transition-all hover:border-emerald-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 border border-emerald-100">
              <Layout size={28} />
            </div>
            <h3 className="text-2xl text-slate-900 font-semibold mb-3">{t.modeTechTitle}</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-8">{t.modeTechDesc}</p>
            <div className="flex items-center text-emerald-700 text-xs font-bold uppercase tracking-widest group-hover:text-emerald-900 transition-colors">
              {t.btnAnalyze} <ArrowRight size={14} className="ml-2 group-hover:translate-x-2" />
            </div>
          </button>
        </div>
        <button onClick={() => setMode(AppMode.INPUT)} className="mt-8 mx-auto flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
          <ChevronLeft size={16} /> {t.btnNew}
        </button>
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative font-sans">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl items-center z-10">
        <div className="flex flex-col items-center justify-center order-2 md:order-1">
          <div className="scale-125 mb-10">
            <PlanetaryOrbit size="large" />
          </div>
          <h2 className="text-xl text-slate-900 font-semibold mb-2 tracking-wide text-center">
            {t.processingSteps[Math.min(currentStepIndex, t.processingSteps.length - 1)]}
          </h2>
        </div>
        <div className="md-card p-8 order-1 md:order-2 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-600 animate-pulse"></div>
          <div className="space-y-5">
            {t.processingSteps.map((step, idx) => {
              const isCompleted = idx < currentStepIndex; const isActive = idx === currentStepIndex;
              if (idx > currentStepIndex + 2 || idx < currentStepIndex - 2) return null;
              return (
                <div key={idx} className={`flex items-center gap-4 transition-all duration-500 ${isActive ? 'translate-x-4 opacity-100' : 'opacity-40'}`}>
                  <div className="shrink-0">
                    {isCompleted ? <CheckCircle2 size={16} className="text-green-600" /> :
                      isActive ? <CircleDashed size={16} className="text-blue-600 animate-spin" /> :
                        <div className="w-4 h-4 rounded-full border border-slate-200" />}
                  </div>
                  <span className={`text-sm ${isActive ? 'text-blue-700 font-semibold' : 'text-slate-500'}`}>{step}</span>
                </div>
              );
            })}
          </div>
          {errorMsg && <div className="mt-6 p-4 md-alert md-alert--error flex gap-3 items-center"><AlertCircle size={20} /> {errorMsg} <button onClick={() => setMode(AppMode.INPUT)} className="ml-auto underline font-bold">REINTENTAR</button></div>}
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
              <Database size={16} className="text-gem-gold" />
              <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">{t.tabStructure}</span>
            </div>
            <div className="p-6">
              <PlanetaryTable positions={analysisResult.positions} lang={lang} />
            </div>
          </div>
          <div className="glass-panel rounded-2xl p-6 flex flex-col justify-center items-center relative min-h-125">
            <NatalChart
              positions={analysisResult.positions}
              lang={lang}
              houses={cartaCompleta?.casas}
              ascLongitude={cartaCompleta?.angulos?.ascendente?.longitud}
            />
          </div>
        </div>
        <ControlPanel lang={lang} onTimeShift={handleTimeShift} onAction={handleToolbarAction} />
        <div className="flex justify-center mt-12">
          <button onClick={() => setResultStep(1)}
            className="group relative px-10 py-5 bg-white text-black font-bold rounded-xl transition-all hover:bg-indigo-50 shadow-[0_0_40px_rgba(255,255,255,0.15)] flex items-center gap-4 overflow-hidden">
            <Binary size={20} className="text-indigo-900" />
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
          <div className="glass-panel p-8 rounded-2xl border-l-4 border-indigo-500 shadow-xl bg-slate-900/40 backdrop-blur-md">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-indigo-500/20 pb-2">
              <Brain size={18} className="text-indigo-400" /> {t.blockThesis}
            </h4>
            <div className="prose prose-invert prose-lg prose-p:text-slate-300 prose-p:font-light prose-p:leading-8 prose-strong:text-indigo-200 prose-headings:text-indigo-100 max-w-none font-serif text-justify">
              {block.thesis}
            </div>
          </div>

          <div className="bg-linear-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 p-8 rounded-2xl relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
                <Activity size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-3">{t.blockAudit}</h4>
                <p className="text-base text-emerald-100/90 font-sans font-light leading-relaxed tracking-wide">
                  {block.audit}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-panel p-8 rounded-2xl relative overflow-hidden ring-1 ring-white/10 bg-linear-to-b from-indigo-950/30 to-slate-950/30">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-white/5 pb-2">
              <MessageSquare size={18} /> {t.blockSynthesis}
            </h4>
            <div className="prose prose-invert prose-lg prose-p:text-slate-200 prose-p:font-light prose-p:leading-8 prose-strong:text-white prose-blockquote:border-l-indigo-500 prose-blockquote:bg-indigo-900/20 prose-blockquote:py-2 prose-blockquote:pr-2 max-w-none text-justify">
              {block.synthesis}
            </div>
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

        <GenericModal
          isOpen={activeModal === 'report_setup'}
          onClose={() => {
            if (!isPreparingReportProfiles) {
              setActiveModal(null);
              setReportSetupError(null);
            }
          }}
          title="Configurar informe"
        >
          <div className="space-y-5">
            <div className="md-alert md-alert--info">
              <p className="text-sm">
                Selecciona el <span className="font-semibold">tipo de informe</span> y, si es sistémico (Pareja/Familiar/Equipo),
                añade varias personas con datos distintos. El sistema calculará una carta para cada perfil.
              </p>
            </div>

            <div className="md-card md-card--flat rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-slate-900 font-semibold">Mis perfiles</p>
                  <p className="text-slate-600 text-xs">Reutiliza personas guardadas en tu cuenta.</p>
                </div>
                <button
                  type="button"
                  className="md-button md-button--secondary"
                  onClick={loadSavedProfiles}
                  disabled={isPreparingReportProfiles || isLoadingSavedProfiles}
                  title="Recargar"
                >
                  {isLoadingSavedProfiles ? 'Cargando…' : 'Recargar'}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Seleccionar perfil</label>
                  <select
                    className="md-input"
                    value={selectedSavedProfileId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedSavedProfileId(id);
                      const prof = savedProfiles.find((p) => p.profile_id === id);
                      setEditingProfileDraft(prof ? { ...prof } : null);
                    }}
                    disabled={isPreparingReportProfiles || isLoadingSavedProfiles}
                  >
                    <option value="">{savedProfiles.length ? '— Elige un perfil —' : 'No hay perfiles guardados'}</option>
                    {savedProfiles.map((p) => (
                      <option key={p.profile_id} value={p.profile_id}>
                        {p.name} — {p.birth_date} {p.birth_time} — {p.birth_place}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Aplicar a</label>
                  <select
                    className="md-input"
                    value={String(applyProfileTarget)}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'auto') return setApplyProfileTarget('auto');
                      if (v === 'new') return setApplyProfileTarget('new');
                      const n = Number(v);
                      setApplyProfileTarget(Number.isFinite(n) ? n : 'auto');
                    }}
                    disabled={isPreparingReportProfiles || isLoadingSavedProfiles}
                    title="Elige a qué persona aplicar el perfil"
                  >
                    <option value="auto">Automático (fila vacía o Persona 1)</option>
                    <option value="new">Nueva fila</option>
                    {reportProfilesInput.map((_, idx) => (
                      <option key={idx} value={String(idx)}>
                        Persona {idx + 1}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="md-button md-button--primary"
                  disabled={!selectedSavedProfileId || isPreparingReportProfiles || isLoadingSavedProfiles}
                  onClick={() => {
                    const prof = savedProfiles.find((p) => p.profile_id === selectedSavedProfileId);
                    if (!prof) return;
                    const applyTo = applyProfileTarget;
                    setReportProfilesInput((prev) => {
                      const base = (prev && prev.length > 0) ? prev : [{ name: '', date: '', time: '', place: '' }];
                      const filled = { name: prof.name, date: prof.birth_date, time: prof.birth_time, place: prof.birth_place };

                      if (applyTo === 'new') {
                        return [...base, filled];
                      }
                      if (typeof applyTo === 'number' && applyTo >= 0 && applyTo < base.length) {
                        return base.map((x, i) => i === applyTo ? ({ ...x, ...filled }) : x);
                      }

                      // auto: aplicar en la fila "más vacía"; si todas tienen nombre, aplicar a la Persona 1.
                      const emptyIdx = base.findIndex((x) => !(x?.name || '').trim());
                      const targetIdx = emptyIdx >= 0 ? emptyIdx : 0;
                      return base.map((x, i) => i === targetIdx ? ({ ...x, ...filled }) : x);
                    });
                  }}
                  title="Rellenar una fila con este perfil"
                >
                  Usar perfil
                </button>
              </div>

              {editingProfileDraft && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-slate-900 font-semibold">Editar perfil</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="md-button md-button--secondary"
                        disabled={isPreparingReportProfiles || isSavingEditedProfile || isDeletingProfile}
                        onClick={async () => {
                          try {
                            setIsSavingEditedProfile(true);
                            setReportSetupError(null);
                            const d = editingProfileDraft;
                            const name = (d?.name || '').trim();
                            const birth_date = (d?.birth_date || '').trim();
                            const birth_time = (d?.birth_time || '').trim();
                            const birth_place = (d?.birth_place || '').trim();
                            if (!name || !birth_date || !birth_time || !birth_place) {
                              throw new Error('Completa Nombre/Fecha/Hora/Lugar antes de guardar.');
                            }
                            await api.upsertProfile({ profile_id: d.profile_id, name, birth_date, birth_time, birth_place });
                            await loadSavedProfiles();
                          } catch (e: any) {
                            setReportSetupError(e?.message || 'Error guardando cambios del perfil');
                          } finally {
                            setIsSavingEditedProfile(false);
                          }
                        }}
                        title="Guardar cambios"
                      >
                        {isSavingEditedProfile ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                      <button
                        type="button"
                        className="md-button md-button--secondary"
                        disabled={isPreparingReportProfiles || isSavingEditedProfile || isDeletingProfile}
                        onClick={async () => {
                          const ok = window.confirm('¿Eliminar este perfil?');
                          if (!ok) return;
                          try {
                            setIsDeletingProfile(true);
                            setReportSetupError(null);
                            await api.deleteProfile(editingProfileDraft.profile_id);
                            setSelectedSavedProfileId('');
                            setEditingProfileDraft(null);
                            await loadSavedProfiles();
                          } catch (e: any) {
                            setReportSetupError(e?.message || 'Error eliminando perfil');
                          } finally {
                            setIsDeletingProfile(false);
                          }
                        }}
                        title="Eliminar perfil"
                      >
                        {isDeletingProfile ? 'Eliminando…' : 'Eliminar perfil'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                      <input
                        className="md-input"
                        value={editingProfileDraft.name}
                        onChange={(e) => setEditingProfileDraft((prev) => prev ? ({ ...prev, name: e.target.value }) : prev)}
                        disabled={isPreparingReportProfiles || isSavingEditedProfile || isDeletingProfile}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                      <input
                        className="md-input"
                        type="date"
                        value={editingProfileDraft.birth_date}
                        onChange={(e) => setEditingProfileDraft((prev) => prev ? ({ ...prev, birth_date: e.target.value }) : prev)}
                        disabled={isPreparingReportProfiles || isSavingEditedProfile || isDeletingProfile}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Hora</label>
                      <input
                        className="md-input"
                        type="time"
                        value={editingProfileDraft.birth_time}
                        onChange={(e) => setEditingProfileDraft((prev) => prev ? ({ ...prev, birth_time: e.target.value }) : prev)}
                        disabled={isPreparingReportProfiles || isSavingEditedProfile || isDeletingProfile}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Lugar</label>
                      <input
                        className="md-input"
                        value={editingProfileDraft.birth_place}
                        onChange={(e) => setEditingProfileDraft((prev) => prev ? ({ ...prev, birth_place: e.target.value }) : prev)}
                        disabled={isPreparingReportProfiles || isSavingEditedProfile || isDeletingProfile}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">Tipo de informe</label>
                <select
                  className="md-input"
                  value={reportType}
                  onChange={(e) => {
                    const v = (e.target.value || 'individual') as any;
                    setReportType(v);
                    setReportSetupError(null);
                    // Si cambia a individual/infantil/profesional, mantener solo 1 fila
                    if (v === 'individual' || v === 'infantil' || v === 'profesional') {
                      setReportProfilesInput((prev) => (prev && prev.length > 0 ? [prev[0]] : prev));
                    } else {
                      // Sistémico: asegurar mínimo 2 filas si solo había 1
                      setReportProfilesInput((prev) => {
                        const base = prev && prev.length > 0 ? prev : [];
                        if (base.length >= 2) return base;
                        const second = { name: '', date: '', time: '', place: '' };
                        return base.length === 1 ? [base[0], second] : [second, second];
                      });
                    }
                  }}
                  disabled={isPreparingReportProfiles}
                >
                  <option value="individual">Individual (Adulto)</option>
                  <option value="infantil">Infantil (Evolutivo)</option>
                  <option value="pareja">Pareja (Sinastría)</option>
                  <option value="familiar">Familiar</option>
                  <option value="equipo">Equipo</option>
                  <option value="profesional">Profesional (Clínico)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Esto controla qué documentación y prompt se usan (aislamiento RAG).
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1">Personas</label>
                <p className="text-sm text-slate-600">
                  {reportType === 'pareja' ? 'Mínimo 2 personas.' : null}
                  {(reportType === 'familiar' || reportType === 'equipo') ? 'Mínimo 2 personas (puedes añadir más).' : null}
                  {(reportType === 'individual' || reportType === 'infantil' || reportType === 'profesional') ? '1 persona.' : null}
                </p>
              </div>
            </div>

            <div className="md-card md-card--flat rounded-xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-slate-900 font-semibold">Datos por persona</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="md-button md-button--secondary"
                    disabled={isPreparingReportProfiles || (reportType === 'individual' || reportType === 'infantil' || reportType === 'profesional')}
                    onClick={() => {
                      setReportProfilesInput((prev) => ([...(prev || []), { name: '', date: '', time: '', place: '' }]));
                    }}
                    title={(reportType === 'individual' || reportType === 'infantil' || reportType === 'profesional') ? 'Solo aplica a informes sistémicos' : 'Añadir persona'}
                  >
                    Añadir persona
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {reportProfilesInput.map((p, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="text-slate-800 font-semibold text-sm">Persona {idx + 1}</p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="md-button md-button--secondary"
                          disabled={isPreparingReportProfiles || savingProfileIdx === idx}
                          onClick={async () => {
                            try {
                              setSavingProfileIdx(idx);
                              setReportSetupError(null);
                              const name = (p?.name || '').trim();
                              const birth_date = (p?.date || '').trim();
                              const birth_time = (p?.time || '').trim();
                              const birth_place = (p?.place || '').trim();
                              if (!name || !birth_date || !birth_time || !birth_place) {
                                throw new Error('Completa Nombre/Fecha/Hora/Lugar antes de guardar el perfil.');
                              }
                              await api.upsertProfile({ name, birth_date, birth_time, birth_place });
                              await loadSavedProfiles();
                            } catch (e: any) {
                              setReportSetupError(e?.message || 'Error guardando perfil');
                            } finally {
                              setSavingProfileIdx(null);
                            }
                          }}
                          title="Guardar esta persona en 'Mis perfiles'"
                        >
                          {savingProfileIdx === idx ? 'Guardando…' : 'Guardar perfil'}
                        </button>
                        <button
                          type="button"
                          className="md-button md-button--secondary"
                          disabled={isPreparingReportProfiles || reportProfilesInput.length <= 1 || (idx === 0 && (reportType === 'individual' || reportType === 'infantil' || reportType === 'profesional'))}
                          onClick={() => {
                            setReportProfilesInput((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          title="Eliminar persona"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre</label>
                        <input
                          className="md-input"
                          value={p.name}
                          onChange={(e) => {
                            const v = e.target.value;
                            setReportProfilesInput((prev) => prev.map((x, i) => (i === idx ? { ...x, name: v } : x)));
                          }}
                          placeholder="Nombre"
                          disabled={isPreparingReportProfiles}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
                        <input
                          className="md-input"
                          type="date"
                          value={p.date}
                          onChange={(e) => {
                            const v = e.target.value;
                            setReportProfilesInput((prev) => prev.map((x, i) => (i === idx ? { ...x, date: v } : x)));
                          }}
                          disabled={isPreparingReportProfiles}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Hora</label>
                        <input
                          className="md-input"
                          type="time"
                          value={p.time}
                          onChange={(e) => {
                            const v = e.target.value;
                            setReportProfilesInput((prev) => prev.map((x, i) => (i === idx ? { ...x, time: v } : x)));
                          }}
                          disabled={isPreparingReportProfiles}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Lugar</label>
                        <input
                          className="md-input"
                          value={p.place}
                          onChange={(e) => {
                            const v = e.target.value;
                            setReportProfilesInput((prev) => prev.map((x, i) => (i === idx ? { ...x, place: v } : x)));
                          }}
                          placeholder="Ej: Morón de la Frontera o 37.12, -5.45"
                          disabled={isPreparingReportProfiles}
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Puedes usar texto o coordenadas. Se geocodifica y se calcula la zona horaria.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {reportSetupError && (
              <div className="md-alert md-alert--error">
                {reportSetupError}
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-end">
              <button
                type="button"
                className="md-button md-button--secondary"
                onClick={() => setActiveModal(null)}
                disabled={isPreparingReportProfiles}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="md-button md-button--primary"
                onClick={async () => {
                  // Individual/Infantil/Profesional: no necesitamos profiles[]; usamos cartaCompleta actual
                  if (reportType === 'individual' || reportType === 'infantil' || reportType === 'profesional') {
                    setReportProfilesPrepared(undefined);
                    setActiveModal(null);
                    setShowReportWizard(true);
                    return;
                  }
                  // Sistémicos: preparar perfiles con carta_data por persona y abrir wizard
                  await prepareReportProfiles();
                }}
                disabled={isPreparingReportProfiles}
              >
                {isPreparingReportProfiles ? 'Preparando…' : 'Continuar'}
              </button>
            </div>
          </div>
        </GenericModal>

        <GenericModal
          isOpen={activeModal === 'report_ready'}
          onClose={() => { setActiveModal(null); setReportReadySessionId(null); }}
          title="Informe listo"
        >
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">
              El informe exhaustivo se ha generado correctamente. Puedes descargar el PDF o volver a la pantalla principal.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={async () => {
                  if (!reportReadySessionId) return;
                  try {
                    await downloadSessionPdf(reportReadySessionId);
                  } catch (e: any) {
                    alert(e?.message || 'Error descargando PDF');
                  }
                }}
                disabled={!reportReadySessionId || isDownloadingSessionPdf}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-60"
              >
                {isDownloadingSessionPdf ? 'Descargando…' : 'Descargar PDF'}
              </button>
              <button
                onClick={() => {
                  setActiveModal(null);
                  setReportReadySessionId(null);
                  setMode(AppMode.INPUT);
                }}
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-semibold transition-colors"
              >
                Volver a inicio
              </button>
            </div>
            {reportReadySessionId && (
              <p className="text-gray-500 text-xs">
                Session: <span className="font-mono">{reportReadySessionId}</span>
              </p>
            )}
          </div>
        </GenericModal>

        {/* Wizard de Generación Paso a Paso */}
        {showReportWizard && analysisResult && (
          <ReportGenerationWizard
            cartaData={(reportProfilesPrepared && reportProfilesPrepared[0]?.carta_data) ? reportProfilesPrepared[0].carta_data : cartaCompleta}
            nombre={
              (reportProfilesPrepared && reportProfilesPrepared.length > 1)
                ? reportProfilesPrepared.map((p: any) => p?.nombre || p?.name || '').filter(Boolean).join(' + ')
                : analysisResult.metadata.name
            }
            reportType={reportType}
            profiles={reportProfilesPrepared}
            onComplete={handleWizardComplete}
            onClose={() => {
              setShowReportWizard(false);
              setGeneratedFullReport(null);
            }}
            onSessionComplete={(sid) => {
              setReportReadySessionId(sid);
              setShowReportWizard(false);
              setActiveModal('report_ready');
            }}
            autoGenerateAll={true}
          />
        )}

      </div>
    );
  };

  const handleNavigation = (targetMode: AppMode) => {
    // Admin always allowed
    if (isAdmin) {
      setMode(targetMode);
      if (targetMode === AppMode.LISTING) loadChartsFromApi();
      return;
    }

    const tier = currentUser?.subscription_tier || 'free';
    const isPaid = tier !== 'free';

    // Gating logic
    if (targetMode === AppMode.ADVANCED_TECHNIQUES && !isPaid) {
      setMode(AppMode.SUBSCRIPTION_PLANS);
      return;
    }

    if (targetMode === AppMode.LISTING && !isPaid) {
      setMode(AppMode.SUBSCRIPTION_PLANS);
      return;
    }

    setMode(targetMode);
    if (targetMode === AppMode.LISTING) loadChartsFromApi();
  };

  return (
    <MaterialBackground>
      {/* Contenido con scroll tipo móvil */}
      <div className={`min-h-screen ${isAuthenticated && mode !== AppMode.AUTH && mode !== AppMode.SUBSCRIPTION_SUCCESS && mode !== AppMode.LANDING ? 'pb-20' : ''}`}>
        {mode === AppMode.LANDING && (
          <LandingPage
            isAuthenticated={isAuthenticated}
            onGoToApp={() => setMode(isAuthenticated ? AppMode.INPUT : AppMode.AUTH)}
            onRequireAuth={() => setMode(AppMode.AUTH)}
            onViewServices={() => setMode(AppMode.PROFESSIONAL_SERVICES)}
          />
        )}
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
              <div className="md-card p-8 max-w-md">
                <h2 className="text-2xl font-semibold text-red-700 mb-4">Acceso denegado</h2>
                <p className="text-slate-600 mb-6">
                  No tienes permisos de administrador para acceder a este panel.
                </p>
                <button
                  onClick={() => setMode(AppMode.INPUT)}
                  className="w-full md-button"
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
        {mode === AppMode.PROFESSIONAL_SERVICES && (
          <ProfessionalServices onBack={() => setMode(AppMode.INPUT)} />
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
      {isAuthenticated && mode !== AppMode.AUTH && mode !== AppMode.SUBSCRIPTION_SUCCESS && mode !== AppMode.LANDING && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-area-inset-bottom">
          <div className="max-w-2xl mx-auto flex justify-around items-center">
            <button
              onClick={() => handleNavigation(AppMode.USER_PROFILE)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${mode === AppMode.USER_PROFILE
                  ? 'text-indigo-400 bg-indigo-500/10'
                  : 'text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/5'
                }`}
              title="Mi Perfil"
            >
              <UserIcon size={20} />
              <span className="text-[10px] font-medium">Perfil</span>
            </button>
            <button
              onClick={() => handleNavigation(AppMode.SUBSCRIPTION_PLANS)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${mode === AppMode.SUBSCRIPTION_PLANS
                  ? 'text-yellow-400 bg-yellow-500/10'
                  : 'text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/5'
                }`}
              title="Planes"
            >
              <Crown size={20} />
              <span className="text-[10px] font-medium">Planes</span>
            </button>
            <button
              onClick={() => handleNavigation(AppMode.INPUT)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${mode === AppMode.INPUT || mode === AppMode.MODE_SELECTION
                  ? 'text-purple-400 bg-purple-500/10'
                  : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/5'
                }`}
              title="Nueva Carta"
            >
              <Sparkles size={20} />
              <span className="text-[10px] font-medium">Nueva</span>
            </button>
            <button
              onClick={() => handleNavigation(AppMode.ADVANCED_TECHNIQUES)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${mode === AppMode.ADVANCED_TECHNIQUES
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/5'
                }`}
              title="Técnicas Avanzadas"
            >
              <Zap size={20} />
              <span className="text-[10px] font-medium">Técnicas</span>
            </button>
            <button
              onClick={() => handleNavigation(AppMode.LISTING)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${mode === AppMode.LISTING
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/5'
                }`}
              title="Mis Cartas"
            >
              <FolderOpen size={20} />
              <span className="text-[10px] font-medium">Cartas</span>
            </button>
            <button
              onClick={() => handleNavigation(AppMode.ADMIN_PANEL)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${mode === AppMode.ADMIN_PANEL
                  ? 'text-red-400 bg-red-500/10'
                  : 'text-gray-400 hover:text-red-400 hover:bg-red-500/5'
                }`}
              title="Admin"
            >
              <ShieldAlert size={20} />
              <span className="text-[10px] font-medium">Admin</span>
            </button>
          </div>
        </div>
      )}
    </MaterialBackground>
  );
};

export default App;
