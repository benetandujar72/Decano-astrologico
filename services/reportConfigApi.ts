/**
 * API Service for Report Configuration
 *
 * Handles all API calls related to report types, templates, and prompts.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================================
// Helper Functions
// ============================================================================

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
}

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.statusText}`);
    }
    return response.json();
}

// ============================================================================
// Types
// ============================================================================

export interface ModuleDefinition {
    id: string;
    name: string;
    required: boolean;
    estimated_duration_sec: number;
}

export interface ReportType {
    id: string;
    code: string;
    name: string;
    description: string;
    icon: string;
    category: 'individual' | 'infantil' | 'sistemico' | 'clinico';
    folder_path: string;
    min_plan_required: 'free' | 'premium' | 'enterprise';
    is_active: boolean;
    is_beta: boolean;
    available_modules: ModuleDefinition[];
    default_prompt_id: string | null;
    can_access: boolean;
    has_default_template: boolean;
    created_at: string;
    updated_at: string;
    version: number;
}

export interface BrandingConfig {
    logo_url?: string;
    logo_size: 'small' | 'medium' | 'large';
    title: string;
    title_auto_generate: boolean;
    typography?: {
        font_family: string;
        font_size: number;
        heading_color: string;
        body_color: string;
    };
    color_scheme?: {
        primary_color: string;
        secondary_color: string;
        accent_color: string;
    };
}

export interface ContentConfig {
    modules_to_print: string[];
    report_mode: 'resumen' | 'completo' | 'exhaustivo';
    include_chart_images: boolean;
    include_aspects_table: boolean;
    include_planetary_table: boolean;
    language: string;
    page_size: 'A4' | 'Letter';
    page_orientation?: 'portrait' | 'landscape';
}

export interface AdvancedConfig {
    custom_css?: string;
    watermark_text?: string;
    encryption_enabled: boolean;
}

export interface Template {
    id: string;
    name: string;
    report_type_id: string;
    report_type_name?: string;
    owner_id: string;
    is_public: boolean;
    is_default: boolean;
    branding: BrandingConfig;
    content: ContentConfig;
    advanced?: AdvancedConfig;
    usage_count: number;
    last_used_at?: string;
    created_at: string;
    updated_at: string;
    is_deleted: boolean;
    preview_image_url?: string;
}

export interface PromptVariable {
    name: string;
    type: 'string' | 'number' | 'date' | 'object' | 'boolean';
    required: boolean;
    description?: string;
}

export interface SafetySettings {
    harm_category_harassment: string;
    harm_category_hate_speech: string;
    harm_category_sexually_explicit: string;
    harm_category_dangerous_content: string;
}

export interface Prompt {
    id: string;
    report_type_id: string;
    version: number;
    system_instruction: string;
    user_prompt_template: string;
    variables: PromptVariable[];
    llm_provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
    safety_settings: SafetySettings;
    is_default: boolean;
    is_active: boolean;
    customized_by?: string;
    created_at: string;
    updated_at: string;
    can_edit: boolean;
}

export interface ResolvedPrompt {
    prompt_id: string;
    version: number;
    system_instruction: string;
    user_prompt: string;
    llm_config: {
        model: string;
        temperature: number;
        max_tokens: number;
        safety_settings: SafetySettings;
    };
}

export interface TemplateCreateData {
    name: string;
    report_type_id: string;
    branding: BrandingConfig;
    content: ContentConfig;
    advanced?: AdvancedConfig;
    is_public: boolean;
}

export interface TemplateUpdateData {
    name?: string;
    branding?: BrandingConfig;
    content?: ContentConfig;
    advanced?: AdvancedConfig;
    is_public?: boolean;
}

// ============================================================================
// Report Types API
// ============================================================================

export const reportTypesApi = {
    /**
     * List all report types
     */
    async list(params?: {
        category?: string;
        include_beta?: boolean;
    }): Promise<{ report_types: ReportType[]; total: number }> {
        const queryParams = new URLSearchParams();
        if (params?.category) queryParams.append('category', params.category);
        if (params?.include_beta !== undefined) {
            queryParams.append('include_beta', params.include_beta.toString());
        }

        const response = await fetch(
            `${API_BASE_URL}/api/report-types?${queryParams}`,
            { headers: getAuthHeaders() }
        );

        return handleResponse<{ report_types: ReportType[]; total: number }>(response);
    },

    /**
     * Get a specific report type
     */
    async get(reportTypeId: string): Promise<ReportType> {
        const response = await fetch(
            `${API_BASE_URL}/api/report-types/${reportTypeId}`,
            { headers: getAuthHeaders() }
        );

        return handleResponse<ReportType>(response);
    }
};

// ============================================================================
// Templates API
// ============================================================================

export const templatesApi = {
    /**
     * List templates
     */
    async list(params?: {
        report_type_id?: string;
        include_public?: boolean;
    }): Promise<{ templates: Template[]; total: number; user_limit: number }> {
        const queryParams = new URLSearchParams();
        if (params?.report_type_id) {
            queryParams.append('report_type_id', params.report_type_id);
        }
        if (params?.include_public !== undefined) {
            queryParams.append('include_public', params.include_public.toString());
        }

        const response = await fetch(
            `${API_BASE_URL}/api/templates?${queryParams}`,
            { headers: getAuthHeaders() }
        );

        return handleResponse<{ templates: Template[]; total: number; user_limit: number }>(response);
    },

    /**
     * Get a specific template
     */
    async get(templateId: string): Promise<Template> {
        const response = await fetch(
            `${API_BASE_URL}/api/templates/${templateId}`,
            { headers: getAuthHeaders() }
        );

        return handleResponse<Template>(response);
    },

    /**
     * Create a new template
     */
    async create(data: TemplateCreateData): Promise<{ template_id: string; message: string }> {
        const response = await fetch(
            `${API_BASE_URL}/api/templates`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            }
        );

        return handleResponse<{ template_id: string; message: string }>(response);
    },

    /**
     * Update a template
     */
    async update(
        templateId: string,
        data: TemplateUpdateData
    ): Promise<{ message: string; template_id: string }> {
        const response = await fetch(
            `${API_BASE_URL}/api/templates/${templateId}`,
            {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            }
        );

        return handleResponse<{ message: string; template_id: string }>(response);
    },

    /**
     * Clone a template
     */
    async clone(templateId: string): Promise<{ template_id: string; message: string }> {
        const response = await fetch(
            `${API_BASE_URL}/api/templates/${templateId}/clone`,
            {
                method: 'POST',
                headers: getAuthHeaders()
            }
        );

        return handleResponse<{ template_id: string; message: string }>(response);
    },

    /**
     * Delete a template
     */
    async delete(templateId: string): Promise<{ message: string }> {
        const response = await fetch(
            `${API_BASE_URL}/api/templates/${templateId}`,
            {
                method: 'DELETE',
                headers: getAuthHeaders()
            }
        );

        return handleResponse<{ message: string }>(response);
    }
};

// ============================================================================
// Prompts API
// ============================================================================

export const promptsApi = {
    /**
     * Get prompt for a report type
     */
    async get(reportTypeId: string): Promise<Prompt> {
        const response = await fetch(
            `${API_BASE_URL}/api/prompts/${reportTypeId}`,
            { headers: getAuthHeaders() }
        );

        return handleResponse<Prompt>(response);
    },

    /**
     * Resolve a prompt with variables
     */
    async resolve(params: {
        report_type_id: string;
        template_id?: string;
        variables: Record<string, any>;
    }): Promise<ResolvedPrompt> {
        const response = await fetch(
            `${API_BASE_URL}/api/prompts/resolve`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(params)
            }
        );

        return handleResponse<ResolvedPrompt>(response);
    },

    /**
     * Create a custom prompt (Premium/Admin)
     */
    async create(data: {
        report_type_id: string;
        system_instruction: string;
        user_prompt_template: string;
        variables: PromptVariable[];
        model?: string;
        temperature?: number;
        max_tokens?: number;
        is_default?: boolean;
    }): Promise<{ prompt_id: string; message: string }> {
        const response = await fetch(
            `${API_BASE_URL}/api/prompts`,
            {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            }
        );

        return handleResponse<{ prompt_id: string; message: string }>(response);
    },

    /**
     * Update a prompt (creates new version)
     */
    async update(
        promptId: string,
        data: {
            system_instruction?: string;
            user_prompt_template?: string;
            variables?: PromptVariable[];
            model?: string;
            temperature?: number;
            max_tokens?: number;
            change_reason?: string;
        }
    ): Promise<{ message: string; version: number }> {
        const response = await fetch(
            `${API_BASE_URL}/api/prompts/${promptId}`,
            {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(data)
            }
        );

        return handleResponse<{ message: string; version: number }>(response);
    }
};

// ============================================================================
// Export all APIs
// ============================================================================

export default {
    reportTypes: reportTypesApi,
    templates: templatesApi,
    prompts: promptsApi
};
