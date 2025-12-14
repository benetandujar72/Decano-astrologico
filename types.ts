
export type Language = 'es' | 'ca' | 'eu';

export interface PlanetPosition {
  name: string;
  sign: string;
  degree: string;
  house: string;
  retrograde: boolean;
  element: 'Fuego' | 'Tierra' | 'Aire' | 'Agua' | 'Fire' | 'Earth' | 'Air' | 'Water' | 'Sua' | 'Lurra' | 'Airea' | 'Ura' | 'Foc' | 'Terra' | 'Aigua';
  longitude: number; 
}

export interface AnalysisSection {
  id: string;
  title: string;
  thesis: string;
  audit: string;
  synthesis: string;
}

export interface SavedChart {
  id: string;
  user_id?: string;
  name: string;
  date: string;
  time: string;
  place: string;
  timestamp: number;
}

export interface User {
  username: string;
  email: string;
  role: 'user' | 'admin';
}

export interface AnalysisResult {
  metadata: {
    name: string;
    birthDate: string;
    birthTime: string;
    birthPlace: string;
  };
  positions: PlanetPosition[];
  elementalBalance: { name: string; value: number; fill: string }[];
  blocks: AnalysisSection[];
  footerQuote: string;
}

export interface SystemPrompt {
  id?: string;
  active: boolean;
  content: string;
  updated_at: string;
}

export enum AppMode {
  AUTH = 'AUTH',
  INPUT = 'INPUT',
  MODE_SELECTION = 'MODE_SELECTION',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
  LISTING = 'LISTING',
  ADMIN_PANEL = 'ADMIN_PANEL',
  USER_PROFILE = 'USER_PROFILE', // 🆕 Perfil de usuario
  SUBSCRIPTION_PLANS = 'SUBSCRIPTION_PLANS', // 🆕 Planes de suscripción
  SUBSCRIPTION_SUCCESS = 'SUBSCRIPTION_SUCCESS', // 🆕 Confirmación de suscripción
  ADVANCED_TECHNIQUES = 'ADVANCED_TECHNIQUES' // 🆕 Técnicas avanzadas
}

export enum AnalysisType {
  PSYCHOLOGICAL = 'PSYCHOLOGICAL',
  TECHNICAL = 'TECHNICAL'
}

export interface UserInput {
  name: string;
  date: string;
  time: string;
  place: string;
  context?: string;
}
