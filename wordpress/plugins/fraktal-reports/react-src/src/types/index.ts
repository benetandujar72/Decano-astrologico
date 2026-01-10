export interface Plan {
  tier: 'free' | 'premium' | 'enterprise';
  name: string;
  price: number;
  features: string[];
  productId: number;
}

export interface UserPlan {
  tier: 'free' | 'premium' | 'enterprise';
  limits: {
    max_reports_per_month: number;
    report_types: string[];
    can_use_templates: boolean;
    max_templates?: number;
    can_use_advanced_css?: boolean;
  };
  usage: {
    this_month: number;
    month_year: string;
  };
}

export interface ReportSession {
  session_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'stalled';
  created_at: string;
  updated_at: string;
  nombre?: string;
  report_type?: string;
  progress?: number;
  current_module?: string;
  error_message?: string;
}

export interface Profile {
  id: string;
  nombre: string;
  fecha_nacimiento: string;
  hora_nacimiento: string;
  lugar_nacimiento: string;
  latitud: number;
  longitud: number;
  timezone: string;
}

export interface ReportType {
  id: string;
  name: string;
  description: string;
  category: string;
  requires_plan?: 'free' | 'premium' | 'enterprise';
}

export interface Template {
  id: string;
  name: string;
  description: string;
  report_type_id?: string;
  is_public: boolean;
  config: any;
}
