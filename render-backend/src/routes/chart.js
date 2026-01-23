import express from 'express';
import { calculateChart } from '../services/ephemeris.js';

const router = express.Router();

/**
 * POST /api/calculate-chart
 * Calcula posiciones planetarias para una fecha/hora/ubicación
 */
router.post('/calculate-chart', async (req, res, next) => {
  try {
    const {
      year,
      month,
      day,
      hour = 12,
      minute = 0,
      timezone = 0,
      latitude,
      longitude,
      houseSystem = 'placidus',
      zodiac = 'tropical'
    } = req.body;

    // Validar parámetros requeridos
    if (!year || !month || !day || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: 'Parámetros requeridos: year, month, day, latitude, longitude',
        received: { year, month, day, latitude, longitude }
      });
    }

    console.log(`[calculate-chart] Calculando carta para ${year}-${month}-${day} ${hour}:${minute}`);

    const chartData = await calculateChart({
      year: parseInt(year),
      month: parseInt(month),
      day: parseInt(day),
      hour: parseInt(hour),
      minute: parseInt(minute),
      timezone: parseFloat(timezone),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      houseSystem,
      zodiac
    });

    res.json(chartData);

  } catch (error) {
    console.error('[calculate-chart] Error:', error);
    next(error);
  }
});

export default router;
