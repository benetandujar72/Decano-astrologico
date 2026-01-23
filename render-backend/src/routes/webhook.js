import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Cliente de Supabase (inicializado bajo demanda)
let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    if (!url || !key) {
      throw new Error('SUPABASE_URL y SUPABASE_SERVICE_KEY son requeridos');
    }

    supabase = createClient(url, key);
  }
  return supabase;
}

/**
 * POST /api/wordpress-webhook
 * Recibe solicitudes de generación de informes desde WordPress
 */
router.post('/wordpress-webhook', async (req, res, next) => {
  try {
    const {
      chart_data,
      report_type = 'gancho_free',
      wp_user_id,
      email
    } = req.body;

    // Validar datos mínimos
    if (!chart_data) {
      return res.status(400).json({
        error: 'chart_data es requerido'
      });
    }

    console.log(`[webhook] Recibida solicitud de WordPress: tipo=${report_type}, user=${wp_user_id}`);

    const db = getSupabase();

    // 1. Sincronizar/crear perfil de usuario si hay email
    let profileId = null;
    if (email || wp_user_id) {
      const profileResult = await syncProfile(db, { wp_user_id, email, name: chart_data.name });
      profileId = profileResult?.id;
    }

    // 2. Crear registro de reporte en cola
    const sessionId = crypto.randomUUID();

    const reportData = {
      session_id: sessionId,
      user_id: profileId,
      wp_user_id: wp_user_id ? parseInt(wp_user_id) : null,
      report_type: report_type,
      status: 'queued',
      progress_percent: 0,
      chart_name: chart_data.name || 'Sin nombre',
      birth_data: chart_data,
      created_at: new Date().toISOString()
    };

    const { data: report, error: insertError } = await db
      .from('reports')
      .insert(reportData)
      .select()
      .single();

    if (insertError) {
      console.error('[webhook] Error insertando reporte:', insertError);
      throw new Error(`Error creando reporte: ${insertError.message}`);
    }

    console.log(`[webhook] Reporte creado: ${sessionId}`);

    res.json({
      success: true,
      session_id: sessionId,
      report_id: report.id,
      status: 'queued',
      message: 'Informe en cola de procesamiento'
    });

  } catch (error) {
    console.error('[webhook] Error:', error);
    next(error);
  }
});

/**
 * GET /api/report-status/:sessionId
 * Obtiene el estado de un reporte
 */
router.get('/report-status/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const db = getSupabase();

    const { data: report, error } = await db
      .from('reports')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error || !report) {
      return res.status(404).json({
        error: 'Reporte no encontrado'
      });
    }

    res.json({
      session_id: report.session_id,
      status: report.status,
      progress_percent: report.progress_percent,
      current_module: report.current_module,
      file_url: report.file_url,
      error_message: report.error_message,
      created_at: report.created_at,
      completed_at: report.completed_at
    });

  } catch (error) {
    console.error('[report-status] Error:', error);
    next(error);
  }
});

/**
 * Sincroniza o crea un perfil de usuario
 */
async function syncProfile(db, { wp_user_id, email, name }) {
  try {
    // Buscar por wp_user_id primero
    if (wp_user_id) {
      const { data: existing } = await db
        .from('profiles')
        .select('id')
        .eq('wp_user_id', wp_user_id)
        .single();

      if (existing) {
        return existing;
      }
    }

    // Buscar por email
    if (email) {
      const { data: existing } = await db
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        // Actualizar wp_user_id si no lo tenía
        if (wp_user_id && !existing.wp_user_id) {
          await db
            .from('profiles')
            .update({ wp_user_id: parseInt(wp_user_id) })
            .eq('id', existing.id);
        }
        return existing;
      }
    }

    // Crear nuevo perfil
    const nameParts = (name || '').split(' ');
    const profileData = {
      wp_user_id: wp_user_id ? parseInt(wp_user_id) : null,
      email: email || null,
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      subscription_tier: 'free',
      created_at: new Date().toISOString()
    };

    const { data: newProfile, error } = await db
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (error) {
      console.error('[syncProfile] Error creando perfil:', error);
      return null;
    }

    return newProfile;

  } catch (error) {
    console.error('[syncProfile] Error:', error);
    return null;
  }
}

export default router;
