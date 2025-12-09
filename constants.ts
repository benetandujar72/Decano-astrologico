import { Language } from './types';

export const SYSTEM_INSTRUCTION = `
ACTUAR COMO: EL DECANO DE ESTUDIOS SUPERIORES ASTROLÓGICOS (V4.1).

Eres una entidad cognitiva que opera en la convergencia de la Ciencia Empírica, la Psicología Profunda (Jung/Hillman) y la Sabiduría Perenne.
Tu tono es ACADÉMICO, HERMÉTICO, DENSO Y QUIRÚRGICO.
No generas horóscopos; redactas Sentencias Ontológicas.

### BASE DE CONOCIMIENTO Y REGLAS (Regla del 75%)
1.  **Fundamentación**: El 75% de tus afirmaciones deben basarse en: Greene, Carutti, Naranjo, Jung, Bohm, Campbell.
2.  **Anti-Alucinación**: Calcula las posiciones con precisión matemática para la fecha dada.
3.  **Formato de Salida**: DEBES RESPONDER ÚNICAMENTE CON UN JSON VÁLIDO.

### LÓGICA DE BLOQUES (TU MAPA MENTAL)
Debes procesar la información siguiendo esta estructura lógica interna:
- BLOQUES 0-4: Estructura Base (Elementos, Sol, Luna, Ascendente).
- BLOQUES 5-13: Dinámica Planetaria (Personales, Sociales, Transpersonales).
- BLOQUES 14-19: Escenario de Vida (Casas y Aspectos).
- BLOQUE 20: Síntesis del Trauma Nuclear (Quirón/Plutón).
- BLOQUE 21 [MÓDULO IKIGAI - CRÍTICO]: EL PROPÓSITO ESTELAR.
  Debes triangular los siguientes puntos para hallar el centro:
  1. **LO QUE AMAS (Pasión)**: Analiza Venus (placer) + Sol (esencia) + Casa 5.
  2. **EN LO QUE ERES BUENO (Vocación)**: Analiza Mercurio (talento) + Marte (acción) + Casa 1/Casa 6.
  3. **LO QUE EL MUNDO NECESITA (Misión)**: Analiza Nodo Norte (evolución) + Casa 11 + Casa 9.
  4. **POR LO QUE TE PUEDEN PAGAR (Profesión)**: Analiza Saturno (estructura) + Medio Cielo (X) + Casa 2 (recursos).
  -> *RESULTADO*: Define la intersección única de estos 4 puntos.
- BLOQUES 22-28: Voces Maestras y Conclusiones Finales.

### ESTRUCTURA DEL JSON DE RESPUESTA (OBLIGATORIA)
Tu respuesta debe ser un objeto JSON puro con esta estructura:

{
  "positions": [
    { "name": "Sol", "sign": "...", "degree": "...", "house": "...", "retrograde": false, "element": "..." },
    ... (Todos los planetas y ángulos. Traduce los nombres de planetas y signos al idioma solicitado)
  ],
  "elementalBalance": [
    { "name": "Fuego", "value": 0, "fill": "#ef4444" },
    { "name": "Tierra", "value": 0, "fill": "#10b981" },
    { "name": "Aire", "value": 0, "fill": "#f59e0b" },
    { "name": "Agua", "value": 0, "fill": "#3b82f6" }
  ],
  "blocks": [
    {
      "id": "bloque_X",
      "title": "TÍTULO ACADÉMICO DEL BLOQUE (En idioma solicitado)",
      "thesis": "ANÁLISIS TÉCNICO: Desarrollo denso (aprox 100 palabras). (En idioma solicitado)",
      "audit": "AUDITORÍA INTERNA: Validación lógica. (En idioma solicitado)",
      "synthesis": "TRADUCCIÓN HUMANA: Explicación clara. (En idioma solicitado)"
    }
    ... (Generar entre 5 y 7 "Mega-Bloques". OBLIGATORIO: Uno de los bloques DEBE ser "EL IKIGAI ASTROLÓGICO" o "ARQUITECTURA DEL PROPÓSITO", basado en el análisis del Bloque 21)
  ],
  "footerQuote": "Sentencia aforística final. (En idioma solicitado)"
}

IMPORTANTE:
1. **NUNCA USES COMILLAS DOBLES (") DENTRO DE LOS TEXTOS**. Usa comillas simples (') para énfasis.
2. NO incluyas bloques de código Markdown (\`\`\`json). Devuelve el JSON crudo.
`;

export const TRANSLATIONS = {
  es: {
    appTitle: "Asistente Psicológico",
    appSubtitle: "Arquitectura Astrológica de Precisión",
    inputName: "Nombre Completo",
    inputDate: "Fecha de Nacimiento",
    inputTime: "Hora de Nacimiento",
    inputPlace: "Lugar de Nacimiento",
    inputContext: "Contexto o Pregunta (Opcional)",
    inputContextPlaceholder: "Ej: Bloqueo profesional, crisis de pareja...",
    btnNext: "Continuar",
    btnAnalyze: "Iniciar Análisis",
    modePsyTitle: "Análisis Psicológico",
    modePsyDesc: "Deconstrucción profunda basada en Jung y Naranjo. Trauma, talento y propósito evolutivo.",
    modeTechTitle: "Auditoría Técnica",
    modeTechDesc: "Cálculo riguroso de mecánicas celestes. Dignidades, aspectos y estructura de casas.",
    processingSteps: [
      "INICIANDO MOTOR ANALÍTICO...",
      "TRIANGULANDO COORDENADAS...",
      "CALCULANDO CARTA NATAL...",
      "ANALIZANDO ESTRUCTURA PSIQUE...",
      "AUDITANDO ASPECTOS TENSOS...",
      "CALCULANDO VECTORES IKIGAI...",
      "SINTETIZANDO ARQUETIPOS...",
      "TRADUCIENDO A LENGUAJE NATURAL...",
      "GENERANDO INFORME FINAL..."
    ],
    resultsTitle: "Expediente Finalizado",
    resultsSubtitle: "Datos Radix Establecidos",
    tabStructure: "Estructura",
    tabBlocks: "Análisis Profundo",
    tabSynthesis: "Síntesis",
    blockThesis: "Análisis Técnico",
    blockAudit: "Validación Lógica",
    blockSynthesis: "Interpretación Personal",
    btnDownload: "Descargar Informe",
    btnNew: "Nueva Consulta",
    tablePoint: "Punto",
    tableSign: "Signo",
    tableDeg: "Grado",
    tableHouse: "Casa",
    tableElem: "Elem",
    chartTitle: "Balance Elemental",
    selectProtocol: "Seleccionar Protocolo"
  },
  ca: {
    appTitle: "Assistent Psicològic",
    appSubtitle: "Arquitectura Astrològica de Precisió",
    inputName: "Nom Complet",
    inputDate: "Data de Naixement",
    inputTime: "Hora de Naixement",
    inputPlace: "Lloc de Naixement",
    inputContext: "Context o Pregunta (Opcional)",
    inputContextPlaceholder: "Ex: Bloqueig professional, crisi de parella...",
    btnNext: "Continuar",
    btnAnalyze: "Iniciar Anàlisi",
    modePsyTitle: "Anàlisi Psicològica",
    modePsyDesc: "Deconstrucció profunda basada en Jung i Naranjo. Trauma, talent i propòsit evolutiu.",
    modeTechTitle: "Auditoria Tècnica",
    modeTechDesc: "Càlcul rigorós de mecàniques celestes. Dignitats, aspectes i estructura de cases.",
    processingSteps: [
      "INICIANT MOTOR ANALÍTIC...",
      "TRIANGULANT COORDENADES...",
      "CALCULANT CARTA NATAL...",
      "ANALITZANT ESTRUCTURA PSIQUE...",
      "AUDITANT ASPECTES TENSOS...",
      "CALCULANT VECTORS IKIGAI...",
      "SINTETITZANT ARQUETIPUS...",
      "TRADUÏNT A LLENGUATGE NATURAL...",
      "GENERANT INFORME FINAL..."
    ],
    resultsTitle: "Expedient Finalitzat",
    resultsSubtitle: "Dades Radix Establertes",
    tabStructure: "Estructura",
    tabBlocks: "Anàlisi Profunda",
    tabSynthesis: "Síntesi",
    blockThesis: "Anàlisi Tècnica",
    blockAudit: "Validació Lògica",
    blockSynthesis: "Interpretació Personal",
    btnDownload: "Descarregar Informe",
    btnNew: "Nova Consulta",
    tablePoint: "Punt",
    tableSign: "Signe",
    tableDeg: "Grau",
    tableHouse: "Casa",
    tableElem: "Elem",
    chartTitle: "Balanç Elemental",
    selectProtocol: "Seleccionar Protocol"
  },
  eu: {
    appTitle: "Laguntzaile Psikologikoa",
    appSubtitle: "Zaztasun Astrologikoaren Arkitektura",
    inputName: "Izen-Abizenak",
    inputDate: "Jaiotze Data",
    inputTime: "Jaiotze Ordua",
    inputPlace: "Jaiotze Lekua",
    inputContext: "Testuingurua edo Galdera (Aukerakoa)",
    inputContextPlaceholder: "Adib: Blokeo profesionala, bikote krisia...",
    btnNext: "Jarraitu",
    btnAnalyze: "Analisia Hasi",
    modePsyTitle: "Analisi Psikologikoa",
    modePsyDesc: "Jung eta Naranjon oinarritutako dekonstrukzio sakona. Trauma, talentua eta eboluzio-helburua.",
    modeTechTitle: "Auditoria Teknikoa",
    modeTechDesc: "Zeru-mekaniken kalkulu zorrotza. Duintasunak, aspektuak eta etxeen egitura.",
    processingSteps: [
      "MOTOR ANALITIKOA ABIARAZTEN...",
      "KOORDENATUAK TRIANGULATZEN...",
      "JAIOTZE-CARTA KALKULATZEN...",
      "PSIKEA EGITURA AZTERTZEN...",
      "ASPEKTU TENTSOAK AUDITATZEN...",
      "IKIGAI BEKTOREAK KALKULATZEN...",
      "ARKETIPOAK SINTETIZATZEN...",
      "HIZKUNTZA NATURALERA ITZULTZEN...",
      "AZKEN TXOSTENA SORTZEN..."
    ],
    resultsTitle: "Espedientea Amaituta",
    resultsSubtitle: "Radix Datuak Ezarrita",
    tabStructure: "Egitura",
    tabBlocks: "Analisi Sakona",
    tabSynthesis: "Sintesia",
    blockThesis: "Analisi Teknikoa",
    blockAudit: "Balidazio Logikoa",
    blockSynthesis: "Interpretazio Pertsonala",
    btnDownload: "Txostena Deskargatu",
    btnNew: "Kontsulta Berria",
    tablePoint: "Puntua",
    tableSign: "Zeinua",
    tableDeg: "Gradua",
    tableHouse: "Etxea",
    tableElem: "Elem",
    chartTitle: "Oreka Elementala",
    selectProtocol: "Protokoloa Aukeratu"
  }
};