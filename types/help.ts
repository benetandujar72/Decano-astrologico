/**
 * Types para el sistema de ayuda contextual
 */

export interface HelpStep {
  id: string;
  title: string;
  description: string;
  image?: string;
  video?: string;
  tips?: string[];
  warnings?: string[];
  relatedSteps?: string[];
}

export interface HelpSection {
  id: string;
  title: string;
  icon: string;
  description: string;
  steps: HelpStep[];
  category: 'getting-started' | 'reports' | 'configuration' | 'advanced' | 'admin';
}

export interface HelpContext {
  page: string;
  section?: string;
  action?: string;
}

export interface HelpSearchResult {
  section: HelpSection;
  step: HelpStep;
  relevance: number;
}
