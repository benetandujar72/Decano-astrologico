/**
 * Servicio de cálculo astronómico usando circular-natal-horoscope-js
 * Equivalente a la Edge Function calculate-chart de Supabase
 */

import pkg from 'circular-natal-horoscope-js';
const { Origin, Horoscope } = pkg;

// Traducciones
const SIGNOS_ES = {
  'Aries': 'Aries',
  'Taurus': 'Tauro',
  'Gemini': 'Géminis',
  'Cancer': 'Cáncer',
  'Leo': 'Leo',
  'Virgo': 'Virgo',
  'Libra': 'Libra',
  'Scorpio': 'Escorpio',
  'Sagittarius': 'Sagitario',
  'Capricorn': 'Capricornio',
  'Aquarius': 'Acuario',
  'Pisces': 'Piscis',
};

const PLANETAS_ES = {
  'Sun': 'Sol',
  'Moon': 'Luna',
  'Mercury': 'Mercurio',
  'Venus': 'Venus',
  'Mars': 'Marte',
  'Jupiter': 'Júpiter',
  'Saturn': 'Saturno',
  'Uranus': 'Urano',
  'Neptune': 'Neptuno',
  'Pluto': 'Plutón',
  'NorthNode': 'Nodo Norte',
  'SouthNode': 'Nodo Sur',
  'Chiron': 'Quirón',
  'Lilith': 'Lilith',
};

/**
 * Calcula la carta natal
 */
export async function calculateChart(params) {
  const {
    year,
    month,
    day,
    hour,
    minute,
    timezone,
    latitude,
    longitude,
    houseSystem = 'placidus',
    zodiac = 'tropical'
  } = params;

  console.log(`[ephemeris] Calculando carta: ${year}-${month}-${day} ${hour}:${minute}`);

  // Crear el origen (la librería usa 0-11 para meses)
  const origin = new Origin({
    year: year,
    month: month - 1,
    date: day,
    hour: hour,
    minute: minute,
    latitude: latitude,
    longitude: longitude,
  });

  // Calcular horóscopo
  const horoscope = new Horoscope({
    origin: origin,
    houseSystem: houseSystem,
    zodiac: zodiac,
    aspectPoints: ['bodies', 'points', 'angles'],
    aspectWithPoints: ['bodies', 'points', 'angles'],
    aspectTypes: ['major', 'minor'],
    customOrbs: {},
    language: 'en'
  });

  // Extraer planetas
  const planetas = [];
  const celestialBodies = horoscope.CelestialBodies || {};
  const celestialPoints = horoscope.CelestialPoints || {};

  // Procesar cuerpos celestes
  const bodyOrder = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron'];

  for (const planetKey of bodyOrder) {
    const body = celestialBodies[planetKey];
    if (body && typeof body === 'object') {
      const signKey = capitalizeSign(body.Sign?.key || body.Sign?.label || 'Aries');
      const lon = body.ChartPosition?.Ecliptic?.DecimalDegrees || 0;
      const { degree, minute: min } = calculateDegreeInSign(lon);
      const formattedKey = planetKey === 'chiron' ? 'Chiron' : capitalizeSign(planetKey);

      planetas.push({
        planet: formattedKey,
        planetEs: PLANETAS_ES[formattedKey] || formattedKey,
        longitude: lon,
        latitude: 0,
        sign: signKey,
        signEs: SIGNOS_ES[signKey] || signKey,
        signIndex: getSignIndex(signKey),
        degree: degree,
        minute: min,
        retrograde: body.isRetrograde || false,
        house: body.House?.id || 1,
      });
    }
  }

  // Procesar puntos (nodos, lilith)
  const pointOrder = ['northnode', 'southnode', 'lilith'];

  for (const pointKey of pointOrder) {
    const point = celestialPoints[pointKey];
    if (point && typeof point === 'object') {
      const signKey = capitalizeSign(point.Sign?.key || point.Sign?.label || 'Aries');
      const lon = point.ChartPosition?.Ecliptic?.DecimalDegrees || 0;
      const { degree, minute: min } = calculateDegreeInSign(lon);
      const formattedKey = pointKey === 'northnode' ? 'NorthNode' :
                           pointKey === 'southnode' ? 'SouthNode' : 'Lilith';

      planetas.push({
        planet: formattedKey,
        planetEs: PLANETAS_ES[formattedKey] || formattedKey,
        longitude: lon,
        latitude: 0,
        sign: signKey,
        signEs: SIGNOS_ES[signKey] || signKey,
        signIndex: getSignIndex(signKey),
        degree: degree,
        minute: min,
        retrograde: point.isRetrograde || false,
        house: point.House?.id || 1,
      });
    }
  }

  // Extraer casas
  const casas = [];
  const houses = horoscope.Houses || [];

  for (const house of houses) {
    if (house) {
      const signKey = capitalizeSign(house.Sign?.key || house.Sign?.label || 'Aries');
      const lon = house.ChartPosition?.StartPosition?.Ecliptic?.DecimalDegrees || 0;
      const { degree, minute: min } = calculateDegreeInSign(lon);

      casas.push({
        house: house.id || 1,
        longitude: lon,
        sign: signKey,
        signEs: SIGNOS_ES[signKey] || signKey,
        degree: degree,
        minute: min,
      });
    }
  }

  // Ángulos
  const angles = horoscope.Angles || {};
  const ascendant = angles.ascendant?.ChartPosition?.Ecliptic?.DecimalDegrees || 0;
  const midheaven = angles.midheaven?.ChartPosition?.Ecliptic?.DecimalDegrees || 0;

  // Aspectos
  const aspectos = [];
  const allAspects = horoscope.Aspects?.all || [];

  for (const aspect of allAspects) {
    if (aspect) {
      const p1Key = capitalizeSign(aspect.point1Key);
      const p2Key = capitalizeSign(aspect.point2Key);

      aspectos.push({
        planet1: p1Key,
        planet1Es: PLANETAS_ES[p1Key] || p1Key,
        planet2: p2Key,
        planet2Es: PLANETAS_ES[p2Key] || p2Key,
        aspectType: aspect.aspectKey,
        aspectName: getAspectNameEs(aspect.aspectKey),
        angle: aspect.aspectDegree || 0,
        orb: aspect.orb || 0,
        applying: aspect.isApplying || false,
        nature: getAspectNature(aspect.aspectKey),
      });
    }
  }

  console.log(`[ephemeris] Total: ${planetas.length} planetas, ${casas.length} casas, ${aspectos.length} aspectos`);

  return {
    success: true,
    planets: planetas,
    houses: casas,
    ascendant: ascendant,
    midheaven: midheaven,
    aspects: aspectos,
    origin: {
      julianDate: origin.julianDate,
      localTime: origin.localTime,
      utcTime: origin.utcTime,
      timezone: origin.timezone,
    },
    settings: {
      houseSystem: houseSystem,
      zodiac: zodiac,
    }
  };
}

// Funciones auxiliares
function calculateDegreeInSign(lon) {
  const normalizedLon = ((lon % 360) + 360) % 360;
  const degreeInSign = normalizedLon % 30;
  const degree = Math.floor(degreeInSign);
  const minute = Math.round((degreeInSign - degree) * 60);
  return { degree, minute };
}

function capitalizeSign(sign) {
  if (!sign) return 'Aries';
  return sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase();
}

function getSignIndex(sign) {
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
                 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  return signs.indexOf(sign);
}

function getAspectNameEs(aspectKey) {
  const nombres = {
    'conjunction': 'Conjunción',
    'opposition': 'Oposición',
    'trine': 'Trígono',
    'square': 'Cuadratura',
    'sextile': 'Sextil',
    'quincunx': 'Quincuncio',
    'semi-sextile': 'Semi-sextil',
    'semi-square': 'Semi-cuadratura',
    'quintile': 'Quintil',
    'bi-quintile': 'Bi-quintil',
    'septile': 'Séptil',
  };
  return nombres[aspectKey] || aspectKey;
}

function getAspectNature(aspectKey) {
  const harmonicos = ['trine', 'sextile', 'semi-sextile'];
  const tensos = ['opposition', 'square', 'semi-square'];
  const creativos = ['quintile', 'bi-quintile'];

  if (harmonicos.includes(aspectKey)) return 'harmonic';
  if (tensos.includes(aspectKey)) return 'tense';
  if (creativos.includes(aspectKey)) return 'creative';
  return 'neutral';
}
