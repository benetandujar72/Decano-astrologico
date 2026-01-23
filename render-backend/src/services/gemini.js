/**
 * Servicio de generación de contenido con Google Gemini
 * Reemplaza la dependencia de LOVABLE_API_KEY
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Inicializar cliente
let genAI = null;

function getClient() {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY no está configurada');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

/**
 * Genera contenido de informe astrológico
 */
export async function generateReportContent({
  prompt,
  systemPrompt,
  astroData,
  reportCategory = 'natal',
  temperature = 0.7,
  maxTokens = 8000,
  model = 'gemini-1.5-flash'
}) {
  console.log(`[gemini] Generando contenido para categoría: ${reportCategory}`);

  const client = getClient();

  // Usar gemini-1.5-flash por defecto (más rápido y económico)
  const modelName = model.includes('gemini') ? model : 'gemini-1.5-flash';
  const generativeModel = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: temperature,
      maxOutputTokens: maxTokens,
      topP: 0.95,
      topK: 40,
    }
  });

  // Construir el prompt completo
  const fullPrompt = buildFullPrompt(systemPrompt, prompt, astroData, reportCategory);

  console.log(`[gemini] Enviando prompt de ${fullPrompt.length} caracteres`);

  try {
    const result = await generativeModel.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Estimar tokens usados (aproximación)
    const tokensUsed = Math.ceil(fullPrompt.length / 4) + Math.ceil(text.length / 4);

    console.log(`[gemini] Respuesta recibida: ${text.length} caracteres, ~${tokensUsed} tokens`);

    return {
      text: text,
      tokensUsed: tokensUsed,
      model: modelName,
      category: reportCategory
    };

  } catch (error) {
    console.error('[gemini] Error:', error);
    throw new Error(`Error de Gemini: ${error.message}`);
  }
}

/**
 * Construye el prompt completo incluyendo datos astrológicos
 */
function buildFullPrompt(systemPrompt, userPrompt, astroData, reportCategory) {
  let fullPrompt = '';

  // Sistema (como contexto)
  if (systemPrompt) {
    fullPrompt += `INSTRUCCIONES DEL SISTEMA:\n${systemPrompt}\n\n`;
  }

  // Datos astrológicos formateados
  if (astroData) {
    fullPrompt += `DATOS DE LA CARTA NATAL:\n`;
    fullPrompt += `Nombre: ${astroData.name || 'Consultante'}\n`;
    fullPrompt += `Fecha de nacimiento: ${astroData.birthDate || 'No especificada'}\n`;
    fullPrompt += `Hora de nacimiento: ${astroData.birthTime || 'No especificada'}\n`;
    fullPrompt += `Lugar de nacimiento: ${astroData.birthPlace || 'No especificado'}\n\n`;

    // Posiciones planetarias
    if (astroData.planets && astroData.planets.length > 0) {
      fullPrompt += `POSICIONES PLANETARIAS:\n`;
      for (const planet of astroData.planets) {
        const retrograde = planet.retrograde ? ' (R)' : '';
        fullPrompt += `- ${planet.planetEs || planet.planet}: ${planet.signEs || planet.sign} ${planet.degree}°${planet.minute}' (Casa ${planet.house})${retrograde}\n`;
      }
      fullPrompt += '\n';
    }

    // Casas
    if (astroData.houses && astroData.houses.length > 0) {
      fullPrompt += `CÚSPIDES DE LAS CASAS:\n`;
      for (const house of astroData.houses) {
        fullPrompt += `- Casa ${house.house}: ${house.signEs || house.sign} ${house.degree}°${house.minute}'\n`;
      }
      fullPrompt += '\n';
    }

    // Aspectos principales
    if (astroData.aspects && astroData.aspects.length > 0) {
      fullPrompt += `ASPECTOS PRINCIPALES:\n`;
      const majorAspects = astroData.aspects.filter(a =>
        ['conjunction', 'opposition', 'trine', 'square', 'sextile'].includes(a.aspectType)
      ).slice(0, 20);

      for (const aspect of majorAspects) {
        const nature = aspect.nature === 'harmonic' ? '✓' : aspect.nature === 'tense' ? '⚡' : '○';
        fullPrompt += `- ${aspect.planet1Es || aspect.planet1} ${aspect.aspectName} ${aspect.planet2Es || aspect.planet2} (orbe: ${aspect.orb?.toFixed(1)}°) ${nature}\n`;
      }
      fullPrompt += '\n';
    }
  }

  // Prompt del usuario
  fullPrompt += `SOLICITUD:\n${userPrompt}\n`;

  // Instrucciones adicionales según categoría
  fullPrompt += getCategoyInstructions(reportCategory);

  return fullPrompt;
}

/**
 * Instrucciones específicas por categoría de informe
 */
function getCategoyInstructions(category) {
  const instructions = {
    'natal': `
FORMATO DE RESPUESTA:
Genera un informe de carta natal completo y profesional en español.
Incluye secciones para: Sol, Luna, Ascendente, planetas personales, y aspectos destacados.
Usa un tono cálido pero profesional, orientado al autoconocimiento.
`,
    'transit': `
FORMATO DE RESPUESTA:
Genera un informe de tránsitos actual en español.
Enfócate en los tránsitos más significativos y su impacto práctico.
Incluye recomendaciones y fechas clave.
`,
    'synastry': `
FORMATO DE RESPUESTA:
Genera un informe de sinastría de pareja en español.
Analiza la compatibilidad, puntos de conexión y desafíos potenciales.
Mantén un tono equilibrado y constructivo.
`,
    'solar-return': `
FORMATO DE RESPUESTA:
Genera un informe de revolución solar en español.
Enfócate en los temas del año, áreas de vida activadas y oportunidades.
`,
    'gancho_free': `
FORMATO DE RESPUESTA:
Genera un informe introductorio BREVE (máximo 1500 palabras) en español.
Incluye solo 3 secciones:
1. "Tu Identidad Solar" - análisis del Sol
2. "Tu Naturaleza Emocional" - análisis de la Luna
3. "Tu Ascendente" - análisis del Ascendente

Cada sección debe ser de 3-4 párrafos máximo.
Al final, incluye una invitación sutil a obtener el informe completo.
`
  };

  return instructions[category] || instructions['natal'];
}

export default { generateReportContent };
