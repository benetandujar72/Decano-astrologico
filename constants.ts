
import { Language } from './types';

export const SYSTEM_INSTRUCTION = `
⚠️ SYSTEM PROMPT: MOTOR DE INTELIGENCIA SISTÉMICA (FRAKTAL v1.0)

**ROL:** Eres un Analista de Sistemas Energéticos de máxima jerarquía.
**MODO:** Ghost Writer Académico (Nivel Eugenio Carutti / Bruno Huber).
**OBJETIVO:** Generar informes astrológicos ESTRUCTURALES y CONCISOS.

### 1. PROTOCOLO TÉCNICO Y DE ESTILO
1. **Fundamentación Radical:** Te basas exclusivamente en la lógica de sistemas (Ascendentes como destino, Lunas como refugio, Aspectos como cableado).
2. **Tono:** Impersonal, quirúrgico, sistémico. No "aconsejas", describes mecánicas de la conciencia.
3. **Estilo Visual (Markdown):**
   - Usa **negritas** para resaltar conceptos clave, planetas y aspectos.
   - Estructura el texto en párrafos claros usando saltos de línea.
   - Utiliza listas con viñetas para enumerar características o puntos clave.
   - El formato debe ser limpio, moderno y profesional, facilitando la lectura rápida.
4. **Cero Alucinaciones:** Si excede orbe, no existe.
5. **Matriz de Orbes:**
   - LUMINARES: Conj/Op/Cuad (10°), Trig/Sext (8°).
   - PERSONALES: Conj/Op/Cuad (8°), Trig/Sext (6°).
   - SOCIALES/TRANSPERSONALES: Conj/Op/Cuad (5-6°).
   - CÚSPIDES: 4° para Angulares.

### 2. ESTRUCTURA LÓGICA DE PROCESAMIENTO (LOS 4 MÓDULOS)

Debes procesar la información siguiendo estrictamente estos 4 Módulos conceptuales, que rellenarán los bloques de la respuesta:

**MÓDULO 1: ESTRUCTURA ENERGÉTICA BASE (DIAGNÓSTICO)**
- Balance de Elementos (Predominio vs Vacío).
- Ritmo y Modalidad.
- La Tensión Vital Primaria (Sol-Luna-Ascendente integrados).
- Polarización Transpersonal (Aspectos duros de Saturno/Urano/Neptuno/Plutón).

**MÓDULO 2: ANÁLISIS PLANETARIO PROFUNDO (DEEP DIVE)**
- Análisis de funciones planetarias (No descripciones aisladas, sino sistémicas).
- Regencias y Dispositores.
- Configuraciones Maestras (Stelliums, T-Cuadradas).
- Sombra y Proyección: ¿Qué no se reconoce?

**MÓDULO 3: CAMPOS DE EXPERIENCIA (EJES POLARES)**
- Análisis por EJES (1-7, 2-8, etc.). Abandona la visión lineal.
- Detección de lo "No Metabolizado" (Intercepciones).
- Dinámica de Importación y Polarización.

**MÓDULO 4: SÍNTESIS Y SENTIDO (VISIÓN DHARMA)**
- El Vector Evolutivo (Nodos Lunares: De la inercia Sur a la ingesta Norte).
- Saturno como "Esqueleto del Dharma".
- El Mito Personal: Misión Transpersonal del sistema.

### 3. FORMATO DE SALIDA (JSON STRICT)

1. **Colores de Balance Elemental (Campo 'fill'):**
   - Fuego / Fire: "#ef4444"
   - Tierra / Earth: "#10b981"
   - Aire / Air: "#f59e0b"
   - Agua / Water: "#3b82f6"
   *USA SIEMPRE ESTOS CÓDIGOS HEXADECIMALES EN EL CAMPO 'fill'.*

2. **Integridad del JSON:**
   - Es CRÍTICO que el JSON esté bien formado y cerrado.
   - Sé CONCISO. Evita textos extremadamente largos que puedan cortar la respuesta. Prioriza la síntesis sistémica sobre la narrativa literaria.

3. **Uso de Comillas:** 
   - NO uses comillas dobles (") dentro del contenido de texto. Usa comillas simples (').

4. **Idioma:** El solicitado explícitamente en el prompt.
`;

export const TRANSLATIONS = {
  es: {
    appTitle: "FRAKTAL",
    appSubtitle: "Arquitectura Astrológica",
    inputName: "Sujeto de Análisis",
    inputDate: "Fecha de Entrada",
    inputTime: "Hora de Entrada",
    inputPlace: "Lugar de Nacimiento",
    inputContext: "Variable de Contexto (Opcional)",
    inputContextPlaceholder: "Ej: Fricción en eje vincular, colapso vocacional...",
    btnNext: "Proceder",
    btnAnalyze: "Ejecutar Diagnóstico",
    modePsyTitle: "Análisis Sistémico (Carutti)",
    modePsyDesc: "Deconstrucción de la mecánica de la conciencia. Lunas, Ascendentes y polaridades transpersonales.",
    modeTechTitle: "Auditoría de Estructura",
    modeTechDesc: "Cálculo de orbes, dignidades, intercepciones y balance de elementos.",
    processingSteps: [
      "INICIANDO MOTOR FRAKTAL...",
      "CALCULANDO EFEMÉRIDES (ALGORITMO VSOP87)...",
      "DETECTANDO ESTRUCTURA DE DESTINO...",
      "ANALIZANDO MECANISMO LUNAR...",
      "ESCANEA POLARIDADES TRANSPERSONALES...",
      "AUDITANDO EJES INTERCEPTADOS...",
      "CALCULANDO VECTORES NODALES...",
      "SINTETIZANDO MITO PERSONAL...",
      "GENERANDO EXPEDIENTE..."
    ],
    resultsTitle: "Expediente Generado",
    resultsSubtitle: "Análisis Sistémico Finalizado",
    tabStructure: "Radix",
    tabBlocks: "Desglose Modular",
    tabSynthesis: "Síntesis",
    blockThesis: "Tesis Sistémica",
    blockAudit: "Auditoría Técnica",
    blockSynthesis: "Traducción Vivencial",
    btnDownload: "Exportar Expediente",
    btnNew: "Reiniciar Sistema",
    tablePoint: "Punto",
    tableSign: "Signo",
    tableDeg: "Grado",
    tableHouse: "Casa",
    tableElem: "Elem",
    chartTitle: "Carta Natal",
    selectProtocol: "Seleccionar Protocolo",
    tooltipSign: "Signo",
    tooltipHouse: "Casa",
    tooltipDegree: "Grado",
    tooltipElement: "Elemento",
    tooltipRetro: "Retrógrado",
    // Toolbar
    cmdBack: "ATRASAR Y GUARDAR",
    cmdFwd: "AVANZAR Y GUARDAR",
    cmdMinute: "MINUTO",
    cmdHour: "HORA",
    cmdDay: "DÍA",
    cmdMonth: "MES",
    cmdYear: "AÑO",
    cmdLegend: "VER LEYENDA SÍMBOLOS",
    cmdStats: "VER TABLAS ESTADÍSTICAS",
    cmdDetails: "VER DETALLES NUMÉRICOS",
    cmdModify: "MODIFICAR CARTA",
    cmdPrint: "IMPRIMIR/DESCARGAR",
    cmdList: "LISTAR CARTAS",
    cmdAdd: "AÑADIR PERSONA",
    cmdPrefs: "PREFERENCIAS AVANZADAS",
    cmdNow: "CARTA DEL MOMENTO ACTUAL",
    techSolar: "R. SOLAR",
    techTransit: "TRÁNSITOS",
    techDirect: "DIRECCIONES",
    techProg: "PROGRESIONES",
    techSynastry: "SINASTRÍA",
    techComposite: "COMPUESTA",
    listTitle: "Base de Datos Online",
    listEmpty: "No hay cartas guardadas.",
    listLoad: "Cargar",
    listDelete: "Borrar",
    // Auth
    authLoginTitle: "Acceso al Sistema",
    authRegisterTitle: "Registro de Operador",
    authUser: "Usuario / Email",
    authPass: "Clave de Acceso",
    authBtnLogin: "Iniciar Sesión",
    authBtnRegister: "Crear Cuenta",
    authSwitchToReg: "¿Sin credenciales? Registrarse",
    authSwitchToLog: "¿Ya registrado? Acceder",
    authLogout: "Cerrar Sesión",
    // Modals
    modalLegendTitle: "Leyenda de Símbolos",
    modalStatsTitle: "Balance Energético",
    modalDetailsTitle: "Detalles Técnicos",
    modalTransitsTitle: "Tránsitos (Tiempo Real)",
    transitNatal: "Pos. Natal",
    transitCurrent: "Pos. Actual",
    transitAspect: "Orbe"
  },
  ca: {
    appTitle: "FRAKTAL",
    appSubtitle: "Arquitectura Astrològica",
    inputName: "Subjecte d'Anàlisi",
    inputDate: "Data d'Entrada",
    inputTime: "Hora d'Entrada",
    inputPlace: "Coordenades Geogràfiques",
    inputContext: "Variable de Context (Opcional)",
    inputContextPlaceholder: "Ex: Fricció en eix vincular, col·lapse vocacional...",
    btnNext: "Procedir",
    btnAnalyze: "Executar Diagnòstic",
    modePsyTitle: "Anàlisi Sistèmica (Carutti)",
    modePsyDesc: "Deconstrucció de la mecànica de la consciència. Llunes, Ascendents i polaritats transpersonals.",
    modeTechTitle: "Auditoria d'Estructura",
    modeTechDesc: "Càlcul d'orbes, dignitats, intercepcions i balanç d'elements.",
    processingSteps: [
      "INICIANT MOTOR FRAKTAL...",
      "CALCULANT EFEMÈRIDES (ALGORITME VSOP87)...",
      "DETECTANT ESTRUCTURA DE DESTÍ...",
      "ANALITZANT MECANISME LLUNAR...",
      "ESCANEJANT POLARITATS TRANSPERSONALS...",
      "AUDITANT EIXOS INTERCEPTATS...",
      "CALCULANT VECTORS NODALS...",
      "SINTETITZANT MITE PERSONAL...",
      "GENERANT EXPEDIENT..."
    ],
    resultsTitle: "Expedient Generat",
    resultsSubtitle: "Anàlisi Sistèmica Finalitzada",
    tabStructure: "Radix",
    tabBlocks: "Desglossament Modular",
    tabSynthesis: "Síntesi",
    blockThesis: "Tesi Sistèmica",
    blockAudit: "Auditoria Tècnica",
    blockSynthesis: "Traducció Vivencial",
    btnDownload: "Exportar Expedient",
    btnNew: "Reiniciar Sistema",
    tablePoint: "Punt",
    tableSign: "Signe",
    tableDeg: "Grau",
    tableHouse: "Casa",
    tableElem: "Elem",
    chartTitle: "Carta Natal",
    selectProtocol: "Seleccionar Protocol",
    tooltipSign: "Signe",
    tooltipHouse: "Casa",
    tooltipDegree: "Grau",
    tooltipElement: "Element",
    tooltipRetro: "Retrògrad",
     // Toolbar
    cmdBack: "ENRERE I DESAR",
    cmdFwd: "AVANÇAR I DESAR",
    cmdMinute: "MINUT",
    cmdHour: "HORA",
    cmdDay: "DIA",
    cmdMonth: "MES",
    cmdYear: "ANY",
    cmdLegend: "VEURE LLEGENDA",
    cmdStats: "TAULES ESTADÍSTIQUES",
    cmdDetails: "DETALLS NUMÈRICS",
    cmdModify: "MODIFICAR CARTA",
    cmdPrint: "IMPRIMIR/DESCARREGAR",
    cmdList: "LLISTAR CARTES",
    cmdAdd: "AFEGIR PERSONA",
    cmdPrefs: "PREFERÈNCIES AVANÇADES",
    cmdNow: "CARTA DEL MOMENT ACTUAL",
    techSolar: "R. SOLAR",
    techTransit: "TRÀNSITS",
    techDirect: "DIRECCIONS",
    techProg: "PROGRESSIONS",
    techSynastry: "SINASTRIA",
    techComposite: "COMPOSTA",
    listTitle: "Base de Dades Online",
    listEmpty: "No hi ha cartes desades.",
    listLoad: "Carregar",
    listDelete: "Esborrar",
    // Auth
    authLoginTitle: "Accés al Sistema",
    authRegisterTitle: "Registre d'Operador",
    authUser: "Usuari / Email",
    authPass: "Clau d'Accés",
    authBtnLogin: "Iniciar Sessió",
    authBtnRegister: "Crear Compte",
    authSwitchToReg: "Sense credencials? Registrar-se",
    authSwitchToLog: "Ja registrat? Accedir",
    authLogout: "Tancar Sessió",
    // Modals
    modalLegendTitle: "Llegenda de Símbols",
    modalStatsTitle: "Balanç Energètic",
    modalDetailsTitle: "Detalls Tècnics",
    modalTransitsTitle: "Trànsits (Temps Real)",
    transitNatal: "Pos. Natal",
    transitCurrent: "Pos. Actual",
    transitAspect: "Orbe"
  },
  eu: {
    appTitle: "FRAKTAL",
    appSubtitle: "Arkitektura Astrologikoa",
    inputName: "Analisi Subjektua",
    inputDate: "Sarrera Data",
    inputTime: "Sarrera Ordua",
    inputPlace: "Koordenatu Geografikoak",
    inputContext: "Testuinguru Aldagaia (Aukerakoa)",
    inputContextPlaceholder: "Adib: Ardatz loteslearen marruskadura...",
    btnNext: "Jarraitu",
    btnAnalyze: "Diagnostikoa Exekutatu",
    modePsyTitle: "Analisi Sistemikoa (Carutti)",
    modePsyDesc: "Kontzientziaren mekanikaren dekonstrukzioa. Ilargiak, Goranzkoak eta polaritate transpertsonalak.",
    modeTechTitle: "Egitura Auditoria",
    modeTechDesc: "Orbeen kalkulua, duintasunak, intertzeptazioak eta elementuen balantzea.",
    processingSteps: [
      "MOTOR FRAKTAL ABIARAZTEN...",
      "EFEMERIDEAK KALKULATZEN (VSOP87 ALGORITMOA)...",
      "DESTINO EGITURA DETEKTATZEN...",
      "ILARGI MEKANISMOA AZTERTZEN...",
      "POLARITATE TRANSPERTSONALAK ESKANEATZEN...",
      "ARDATZ INTERTZEPTATUAK AUDITATZEN...",
      "BEKTORE NODALAK KALKULATZEN...",
      "MITO PERTSONALA SINTETIZATZEN...",
      "ESPEDIENTEA SORTZEN..."
    ],
    resultsTitle: "Espedientea Sortuta",
    resultsSubtitle: "Analisi Sistemikoa Amaituta",
    tabStructure: "Radix",
    tabBlocks: "Modulu Desglosatzea",
    tabSynthesis: "Sintesia",
    blockThesis: "Tesi Sistemikoa",
    blockAudit: "Auditoria Teknikoa",
    blockSynthesis: "Bizipen Itzulpena",
    btnDownload: "Espedientea Esportatu",
    btnNew: "Sistema Berrabiarazi",
    tablePoint: "Puntua",
    tableSign: "Zeinua",
    tableDeg: "Gradua",
    tableHouse: "Etxea",
    tableElem: "Elem",
    chartTitle: "Jaiotza Karta",
    selectProtocol: "Protokoloa Aukeratu",
    tooltipSign: "Zeinua",
    tooltipHouse: "Etxea",
    tooltipDegree: "Gradua",
    tooltipElement: "Elementua",
    tooltipRetro: "Atzerakoia",
     // Toolbar
    cmdBack: "ATZERATU ETA GORDE",
    cmdFwd: "AURRERATU ETA GORDE",
    cmdMinute: "MINUTU",
    cmdHour: "ORDU",
    cmdDay: "EGUN",
    cmdMonth: "HILABETE",
    cmdYear: "URTE",
    cmdLegend: "IKURREN LEGENDA",
    cmdStats: "ESTADISTIKA TAULAK",
    cmdDetails: "ZENBAKI XEHETASUNAK",
    cmdModify: "KARTA ALDATU",
    cmdPrint: "INPRIMATU/DESKARGATU",
    cmdList: "KARTAK ZERRENDATU",
    cmdAdd: "PERTSONA GEHITU",
    cmdPrefs: "HOBESPEN AURRERATUAK",
    cmdNow: "UNEKO KARTA",
    techSolar: "EGUZKI ITZUL.",
    techTransit: "IGAROALDIAK",
    techDirect: "NORABIDEAK",
    techProg: "PROGRESIOAK",
    techSynastry: "SINASTRIA",
    techComposite: "KONPOSATUA",
    listTitle: "Lineako Datu Basea",
    listEmpty: "Ez dago gordetako kartarik.",
    listLoad: "Kargatu",
    listDelete: "Ezabatu",
    // Auth
    authLoginTitle: "Sistema Sarbidea",
    authRegisterTitle: "Operadore Erregistroa",
    authUser: "Erabiltzailea / Email",
    authPass: "Sarbide Gakoa",
    authBtnLogin: "Saioa Hasi",
    authBtnRegister: "Kontua Sortu",
    authSwitchToReg: "Kredentzialik gabe? Erregistratu",
    authSwitchToLog: "Erregistratuta? Sartu",
    authLogout: "Saioa Itxi",
    // Modals
    modalLegendTitle: "Ikurren Legenda",
    modalStatsTitle: "Balantze Energetikoa",
    modalDetailsTitle: "Xehetasun Teknikoak",
    modalTransitsTitle: "Igaroaldiak (Denbora Reala)",
    transitNatal: "Jaiotza Pos.",
    transitCurrent: "Uneko Pos.",
    transitAspect: "Orbe"
  }
};
