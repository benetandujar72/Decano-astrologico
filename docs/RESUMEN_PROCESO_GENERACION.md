# Resumen del Proceso de Generación de Informes

## Flujo Visual Simplificado

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USUARIO HACE CLIC EN "DESCARGAR INFORME"                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. SE ABRE EL WIZARD (ReportGenerationWizard)              │
│    - Inicializa sesión automáticamente                      │
│    - POST /reports/start-generation                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. BACKEND CREA SESIÓN EN MONGODB                          │
│    - session_id único                                       │
│    - Lista de 10 módulos                                    │
│    - Estado: "in_progress"                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GENERACIÓN AUTOMÁTICA DEL MÓDULO 1                       │
│    - POST /reports/generate-module                          │
│    - module_id: "modulo_1"                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. PROCESO DE GENERACIÓN DE UN MÓDULO                      │
│                                                             │
│    a) Cargar documentación de Carutti (PDFs)                │
│    b) Obtener contexto relevante (8000-10000 chars)         │
│    c) Construir prompt completo con:                        │
│       - Protocolo de ingesta                                │
│       - Contexto de documentación                            │
│       - Datos de la carta (efemérides)                      │
│       - Directriz de extensión (30 páginas)                  │
│       - Instrucción específica del módulo                   │
│    d) Enviar a Gemini (IA)                                  │
│    e) Validar extensión mínima                              │
│    f) Reintentar si es necesario (hasta 3 veces)            │
│    g) Registrar uso de IA (tokens, costo)                   │
│    h) Guardar contenido en sesión                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. USUARIO REVISA EL CONTENIDO GENERADO                     │
│    - Muestra el módulo completo                             │
│    - Longitud generada                                      │
│    - Botón "Proceder al Siguiente Módulo"                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. REPETIR PASOS 4-6 PARA MÓDULOS 2-10                     │
│    - MÓDULO 2-I: Fundamentos del Ser                       │
│    - MÓDULO 2-II: Planetas Personales                      │
│    - MÓDULO 2-III: Planetas Sociales                        │
│    - MÓDULO 2-IV: Planetas Transpersonales                  │
│    - MÓDULO 2-V: Nodos Lunares                              │
│    - MÓDULO 2-VI: Aspectos Clave                            │
│    - MÓDULO 2-VII: Ejes de Vida (formato rígido)           │
│    - MÓDULO 2-VIII: Síntesis Arquetípica                    │
│    - MÓDULO 3: Recomendaciones Evolutivas                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. AL COMPLETAR EL ÚLTIMO MÓDULO                            │
│    - Construir informe completo                             │
│    - Concatenar todos los módulos                           │
│    - Validar extensión total (50,000-60,000 chars)          │
│    - Marcar sesión como "completed"                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. USUARIO HACE CLIC EN "FINALIZAR"                         │
│    - GET /reports/generation-full-report/{session_id}       │
│    - Obtiene el informe completo                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. SE ABRE SELECTOR DE FORMATOS                            │
│     - PDF, DOCX, Markdown, HTML                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. GENERACIÓN DEL DOCUMENTO FINAL                          │
│     - POST /reports/generate                                 │
│     - Usa el informe completo generado                      │
│     - Genera PDF/DOCX/Markdown/HTML                          │
│     - Descarga automática                                    │
└─────────────────────────────────────────────────────────────┘
```

## Características Clave

### 1. Generación Paso a Paso
- Cada módulo se genera individualmente
- Usuario confirma antes de continuar
- Proceso visible y controlable

### 2. Validación Estricta
- Extensión mínima por módulo (4,000-8,000 caracteres)
- Validación de estructura (especialmente MÓDULO 2-VII)
- Reintentos automáticos si no cumple

### 3. Trazabilidad Completa
- Cada generación registra:
  - Tokens consumidos
  - Costo estimado
  - Usuario y sesión
  - Timestamp y request_id

### 4. Documentación Contextual
- Lee directamente de PDFs de Carutti
- Contexto específico por módulo
- Prioriza párrafos conceptuales densos

### 5. Objetivo: 30 Páginas
- Total esperado: 50,000-60,000 caracteres
- Cada módulo contribuye con su extensión mínima
- Validación final del informe completo

## Tiempos Estimados

- **Inicialización**: < 1 segundo
- **Generación por módulo**: 2-10 minutos (depende de la complejidad)
- **Total para 10 módulos**: 20-100 minutos
- **Exportación final**: < 30 segundos

## Registro de Uso de IA

Cada módulo generado registra automáticamente:
- **Modelo usado**: gemini-3-pro-preview o gemini-2.5-pro
- **Tokens**: Prompt + Respuesta + Total
- **Costo estimado**: Calculado según precios del modelo
- **Metadatos**: Módulo, sesión, longitud, intentos

Estos datos están disponibles en el panel de administración → "Control IA"
