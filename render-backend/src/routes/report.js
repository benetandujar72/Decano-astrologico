import express from 'express';
import { generateReportContent } from '../services/gemini.js';

const router = express.Router();

/**
 * POST /api/generate-report
 * Genera contenido de informe astrológico con IA (Google Gemini)
 */
router.post('/generate-report', async (req, res, next) => {
  try {
    const {
      prompt,
      systemPrompt,
      astroData,
      reportCategory = 'natal',
      temperature = 0.7,
      maxTokens = 8000,
      model = 'gemini-1.5-flash'
    } = req.body;

    // Validar parámetros
    if (!prompt) {
      return res.status(400).json({
        error: 'El parámetro "prompt" es requerido'
      });
    }

    console.log(`[generate-report] Generando informe tipo: ${reportCategory}`);

    const result = await generateReportContent({
      prompt,
      systemPrompt,
      astroData,
      reportCategory,
      temperature,
      maxTokens,
      model
    });

    res.json({
      success: true,
      text: result.text,
      tokensUsed: result.tokensUsed,
      model: result.model,
      category: result.category
    });

  } catch (error) {
    console.error('[generate-report] Error:', error);
    next(error);
  }
});

/**
 * POST /api/generate-report-content
 * Alias para compatibilidad con la Edge Function existente
 */
router.post('/generate-report-content', async (req, res, next) => {
  // Redirigir al endpoint principal
  req.url = '/generate-report';
  router.handle(req, res, next);
});

export default router;
