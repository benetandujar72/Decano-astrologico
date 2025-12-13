export type Language = 'es' | 'ca' | 'eu';

export interface PlanetPosition {
  name: string;
  sign: string;
  degree: string;
  house: string;
  retrograde: boolean;
  element: 'Fuego' | 'Tierra' | 'Aire' | 'Agua' | 'Fire' | 'Earth' | 'Air' | 'Water' | 'Sua' | 'Lurra' | 'Airea' | 'Ura' | 'Foc' | 'Terra' | 'Aigua';
  longitude: number; // Added for Chart rendering
}

export interface AnalysisSection {
  id: string;
  title: string;
  thesis: string;
  audit: string;
  synthesis: string;
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

export enum AppMode {
  INPUT = 'INPUT',
  MODE_SELECTION = 'MODE_SELECTION',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS'
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