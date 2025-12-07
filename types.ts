export interface PlanetPosition {
  name: string;
  sign: string;
  degree: string;
  house: string;
  retrograde: boolean;
  element: 'Fuego' | 'Tierra' | 'Aire' | 'Agua';
}

export interface AnalysisSection {
  id: string;
  title: string; // Título del Bloque (ej: BLOQUE 3: LA LUNA)
  thesis: string; // Tesis Técnica (Análisis denso)
  audit: string; // Auditoría Interna (Validación lógica)
  synthesis: string; // Traducción humana final
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
  blocks: AnalysisSection[]; // Renombrado de sections a blocks para seguir la lógica del Decano
  footerQuote: string;
}

export enum AppMode {
  INPUT = 'INPUT',
  MODE_SELECTION = 'MODE_SELECTION',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS'
}

export enum AnalysisType {
  PSYCHOLOGICAL = 'PSYCHOLOGICAL', // Perfil Psicológico Profundo
  TECHNICAL = 'TECHNICAL' // Análisis de Carta / Auditoría Técnica
}

export interface UserInput {
  name: string;
  date: string;
  time: string;
  place: string;
  context?: string; // Pregunta específica o contexto adicional
}