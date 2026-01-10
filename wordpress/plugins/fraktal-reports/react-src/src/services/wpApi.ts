/**
 * Cliente API para WordPress AJAX
 */

interface WPApiConfig {
  ajaxUrl: string;
  nonce: string;
  downloadUrl: string;
}

// Configuración inyectada por WordPress
declare global {
  interface Window {
    DecanoConfig: WPApiConfig;
  }
}

const config = window.DecanoConfig || {
  ajaxUrl: '/wp-admin/admin-ajax.php',
  nonce: '',
  downloadUrl: '/wp-admin/admin-post.php?action=fraktal_reports_download'
};

async function wpAjax(action: string, data: any = {}) {
  const formData = new FormData();
  formData.append('action', action);
  formData.append('nonce', config.nonce);

  for (const key in data) {
    formData.append(key, typeof data[key] === 'object'
      ? JSON.stringify(data[key])
      : data[key]
    );
  }

  const response = await fetch(config.ajaxUrl, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.data?.message || 'Error en la petición');
  }

  return result.data;
}

export const wpApi = {
  // Informes
  async startReport(payload: any) {
    return wpAjax('fraktal_reports_start', { payload: JSON.stringify(payload) });
  },

  async getReportStatus(sessionId: string) {
    return wpAjax('fraktal_reports_status', { session_id: sessionId });
  },

  async listReports() {
    return wpAjax('fraktal_reports_list');
  },

  async resumeReport(sessionId: string) {
    return wpAjax('fraktal_reports_resume', { session_id: sessionId });
  },

  // Perfiles
  async getProfiles() {
    return wpAjax('fraktal_reports_profiles_get');
  },

  async saveProfiles(profiles: any[]) {
    return wpAjax('fraktal_reports_profiles_save', {
      profiles: JSON.stringify(profiles)
    });
  },

  // Planes
  async getUserPlan() {
    return wpAjax('fraktal_reports_get_plan');
  },

  async getPlans() {
    return wpAjax('fraktal_reports_get_plans');
  },

  // Tipos de informe
  async getReportTypes(category?: string) {
    return wpAjax('fraktal_reports_get_types', { category });
  },

  // Plantillas
  async getTemplates(reportTypeId?: string) {
    return wpAjax('fraktal_reports_get_templates', { report_type_id: reportTypeId });
  },

  // Descarga
  getDownloadUrl(sessionId: string) {
    return `${config.downloadUrl}&session_id=${sessionId}&nonce=${config.nonce}`;
  }
};
