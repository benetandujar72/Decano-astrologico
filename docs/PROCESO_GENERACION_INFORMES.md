# Proceso de Generación de Informes Exhaustivos

## Descripción General

El sistema genera informes astrológicos exhaustivos de aproximadamente 30 páginas siguiendo estrictamente el protocolo **CORE CARUTTI v5.3 - REORDENADO & HOMOGÉNEO**. El proceso se realiza paso a paso, módulo por módulo, con confirmación del usuario antes de continuar.

## Flujo Completo del Proceso

### 1. Inicio del Proceso

**Frontend (`App.tsx`):**
- Usuario hace clic en "Descargar Informe"
- Se ejecuta `downloadHTML()` que abre el wizard: `setShowReportWizard(true)`
- Se renderiza el componente `ReportGenerationWizard`

**Componente Wizard (`ReportGenerationWizard.tsx`):**
- Al montar, ejecuta `useEffect` que llama a `initializeSession()`
- `initializeSession()` hace una petición `POST /reports/start-generation`

**Backend (`/reports/start-generation`):**
- Crea una sesión en MongoDB (`report_generation_sessions`)
- Obtiene la lista de 10 módulos desde `full_report_service._get_sections_definition()`
- Retorna:
  ```json
  {
    "session_id": "...",
    "total_modules": 10,
    "modules": [...],
    "current_module": {...}
  }
  ```

### 2. Generación Automática del Primer Módulo

**Frontend:**
- Al recibir la respuesta, actualiza el estado con `sessionId` y `modules`
- Llama automáticamente a `generateModuleWithSession(sessionId, modules[0].id)`

**Backend (`/reports/generate-module`):**
- Valida que la sesión existe y pertenece al usuario
- Verifica que los módulos anteriores estén generados (excepto el primero)
- Llama a `full_report_service.generate_single_module()`

### 3. Generación de un Módulo Individual

**Backend (`full_report_service.generate_single_module`):**

#### Paso 3.1: Preparación
1. Asegura que la documentación de Carutti esté cargada
2. Obtiene la definición de la sección correspondiente al `module_id`
3. Calcula el índice del módulo y si es el último

#### Paso 3.2: Obtención de Contexto
1. Determina `max_context_chars` (10000 para módulos con plantilla, 8000 para otros)
2. Llama a `doc_service.get_context_for_module(module_id, max_chars)`
3. Busca en los PDFs de documentación párrafos relevantes al módulo

#### Paso 3.3: Construcción del Prompt
El prompt incluye:
- **PROTOCOLO DE INGESTA DE DOCUMENTACIÓN**: Instrucciones para leer y sintetizar
- **CONTEXTO DE DOCUMENTACIÓN**: Párrafos relevantes extraídos de los PDFs
- **DATOS DE LA CARTA**: Efemérides completas (planetas, casas, aspectos)
- **DIRECTRIZ DE EXTENSIÓN**: Instrucciones para máxima exhaustividad (30 páginas)
- **INSTRUCCIÓN DE COMANDO**: Prompt específico del módulo
- **REGLAS CRÍTICAS**: Extensión mínima, estructura, tono, etc.

Para MÓDULO 2-VII (Ejes de Vida), se agrega además:
- Plantilla rígida con 5 partes obligatorias por eje
- Instrucciones específicas para casas vacías (mínimo 150 palabras por polo)

#### Paso 3.4: Generación con IA (Gemini)
1. Llama a `ai_service.get_chat_response(base_prompt, [])`
2. `ai_expert_service` envía el prompt a Gemini
3. Gemini genera el contenido (puede tardar varios minutos)
4. Se captura la metadata de tokens (`prompt_token_count`, `candidates_token_count`, `total_token_count`)

#### Paso 3.5: Validación y Reintentos
1. Valida que el contenido cumpla con `expected_min_chars`
2. Verifica que incluya "Pregunta para reflexionar"
3. Si es MÓDULO 2-VII, valida la estructura de plantilla
4. Si no cumple, reintenta hasta 3 veces con advertencias más fuertes

#### Paso 3.6: Registro de Uso de IA
1. Calcula el costo estimado según el modelo usado
2. Registra en MongoDB (`ai_usage_records`) con:
   - Tokens consumidos
   - Costo estimado
   - Metadatos (módulo, sesión, longitud de contenido, intentos)
   - Trazabilidad (request_id, timestamp)

#### Paso 3.7: Guardado del Módulo
1. Guarda el contenido generado en la sesión (`generated_modules[module_id]`)
2. Actualiza `current_module_index`
3. Si es el último módulo, construye el informe completo y marca `status: "completed"`

### 4. Proceso Iterativo (Módulos 2-10)

**Frontend:**
- Muestra el contenido generado del módulo actual
- Usuario revisa y hace clic en "Proceder al Siguiente Módulo"
- Se ejecuta `handleNext()` que:
  1. Avanza `currentModuleIndex`
  2. Limpia el contenido anterior
  3. Llama a `generateModule(nextModule.id)`

**Backend:**
- Repite el proceso del Paso 3 para cada módulo
- Valida que los módulos anteriores estén generados

### 5. Finalización

**Cuando se genera el último módulo (MÓDULO 3):**

**Backend:**
- Construye el informe completo concatenando todos los módulos:
  ```python
  for section in sections:
      if section['id'] in generated_modules:
          all_content.append(f"## {section['title']}\n\n{content}\n\n---\n\n")
  full_report = "\n".join(all_content)
  ```
- Guarda `full_report` en la sesión
- Marca `status: "completed"`

**Frontend:**
- Muestra botón "Finalizar y Generar Informe Completo"
- Al hacer clic, llama a `getFullReport()` que obtiene el informe completo
- Ejecuta `onComplete(fullReport)` que:
  1. Guarda el informe en `generatedFullReport`
  2. Cierra el wizard
  3. Abre el selector de formatos (`setActiveModal('export')`)

### 6. Exportación

**Frontend (`App.tsx` - `downloadReport`):**
- Usa `generatedFullReport` si está disponible, sino usa el análisis normal
- Llama a `POST /reports/generate` con:
  - `carta_data`: Datos completos de efemérides
  - `format`: pdf, docx, markdown, html
  - `analysis_text`: El informe completo generado
  - `nombre`: Nombre del consultante

**Backend (`/reports/generate`):**
- Genera el documento en el formato solicitado usando `report_generators.generate_report()`
- Retorna el archivo para descarga

## Estructura de los 10 Módulos

1. **MÓDULO 1**: ESTRUCTURA ENERGÉTICA BASE (DIAGNÓSTICO)
   - Extensión mínima: 6,000 caracteres
   - Balance de Elementos, Modalidades, Sol-Luna-Asc, Polarización Transpersonal

2. **MÓDULO 2-I**: FUNDAMENTOS DEL SER
   - Extensión mínima: 5,000 caracteres
   - Sol, Luna, Ascendente, Regente del Ascendente

3. **MÓDULO 2-II**: PLANETAS PERSONALES
   - Extensión mínima: 5,000 caracteres
   - Mercurio, Venus, Marte

4. **MÓDULO 2-III**: PLANETAS SOCIALES
   - Extensión mínima: 5,000 caracteres
   - Júpiter, Saturno

5. **MÓDULO 2-IV**: PLANETAS TRANSPERSONALES
   - Extensión mínima: 6,000 caracteres
   - Urano, Neptuno, Plutón

6. **MÓDULO 2-V**: LOS NODOS LUNARES
   - Extensión mínima: 4,000 caracteres
   - Nodo Sur, Nodo Norte, Eje Evolutivo

7. **MÓDULO 2-VI**: ASPECTOS CLAVE
   - Extensión mínima: 5,000 caracteres
   - Tensiones estructurales y Facilitadores

8. **MÓDULO 2-VII**: LOS EJES DE VIDA (ANÁLISIS DE CASAS)
   - Extensión mínima: 8,000 caracteres
   - **Formato rígido obligatorio** con 5 partes por eje
   - 6 ejes (I-VII, II-VIII, III-IX, IV-X, V-XI, VI-XII)
   - Análisis exhaustivo de casas vacías (mínimo 150 palabras por polo)

9. **MÓDULO 2-VIII**: SÍNTESIS ARQUETÍPICA
   - Extensión mínima: 5,000 caracteres
   - Patrones arquetípicos, configuraciones maestras, sombra y proyección

10. **MÓDULO 3**: RECOMENDACIONES EVOLUTIVAS PRINCIPALES
    - Extensión mínima: 5,000 caracteres
    - Fortalezas Base, Integración de Tensiones, Orientación al Nodo Norte, Cierre Motivacional

## Validaciones y Control de Calidad

### Validación de Contenido
- **Extensión mínima**: Cada módulo debe cumplir con `expected_min_chars`
- **Pregunta para reflexionar**: Obligatoria al final de cada módulo
- **Estructura de plantilla**: Para MÓDULO 2-VII, validación de 6 ejes y estructura rígida
- **Lenguaje no determinista**: Debe usar "tiende a", "puede", "frecuentemente"

### Reintentos Automáticos
- Si el contenido es demasiado corto, se reintenta hasta 3 veces
- En cada reintento se agregan advertencias más fuertes al prompt
- Si después de 3 intentos no cumple, se usa el contenido generado con advertencia

### Validación Final del Informe
- Al completar todos los módulos, se valida la extensión total
- Objetivo: 50,000-60,000 caracteres (aproximadamente 30 páginas)
- Si es menor a 50,000 caracteres, se registra una advertencia crítica

## Trazabilidad y Auditoría

Cada generación de módulo registra:
- **Usuario**: ID y nombre
- **Acción**: Tipo (REPORT_MODULE_GENERATION)
- **Modelo**: Gemini usado (gemini-3-pro-preview o gemini-2.5-pro)
- **Tokens**: Prompt, respuesta y total
- **Costo**: Estimado en USD según precios del modelo
- **Sesión**: ID de la sesión de generación
- **Módulo**: ID y título del módulo generado
- **Metadatos**: Longitud de contenido, número de intentos, etc.
- **Trazabilidad**: Request ID único, timestamp, IP (si disponible)

## Endpoints Relacionados

- `POST /reports/start-generation`: Inicia sesión de generación
- `POST /reports/generate-module`: Genera un módulo específico
- `GET /reports/generation-status/{session_id}`: Obtiene estado de la sesión
- `GET /reports/generation-full-report/{session_id}`: Obtiene informe completo
- `POST /reports/generate`: Genera el documento final (PDF, DOCX, etc.)

## Archivos Clave

- **Frontend**: `components/ReportGenerationWizard.tsx`
- **Backend - Endpoints**: `backend/app/api/endpoints/reports.py`
- **Backend - Servicio**: `backend/app/services/full_report_service.py`
- **Backend - Documentación**: `backend/app/services/documentation_service.py`
- **Backend - IA**: `backend/app/services/ai_expert_service.py`
- **Backend - Tracking**: `backend/app/services/ai_usage_tracker.py`
