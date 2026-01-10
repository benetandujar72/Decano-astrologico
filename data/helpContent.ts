/**
 * Contenido de ayuda completo de la aplicación
 */

import { HelpSection } from '../types/help';

export const helpContent: HelpSection[] = [
  // ====================================================================
  // PRIMEROS PASOS
  // ====================================================================
  {
    id: 'getting-started',
    title: 'Primeros Pasos',
    icon: '🚀',
    description: 'Aprende a usar la aplicación desde cero',
    category: 'getting-started',
    steps: [
      {
        id: 'register',
        title: 'Crear una cuenta',
        description: `
          Para comenzar a usar la aplicación, primero necesitas crear una cuenta gratuita.

          **Pasos:**
          1. Haz clic en el botón "Registrarse" en la página principal
          2. Ingresa tu correo electrónico
          3. Crea una contraseña segura (mínimo 8 caracteres)
          4. Confirma tu correo electrónico haciendo clic en el enlace que recibirás
          5. ¡Listo! Ya puedes iniciar sesión
        `,
        image: '/help/screenshots/register.png',
        tips: [
          'Usa una contraseña única que no uses en otros sitios',
          'Guarda tu contraseña en un gestor de contraseñas',
          'Verifica tu carpeta de spam si no recibes el correo de confirmación'
        ]
      },
      {
        id: 'login',
        title: 'Iniciar sesión',
        description: `
          Accede a tu cuenta con tus credenciales.

          **Pasos:**
          1. Haz clic en "Iniciar sesión"
          2. Ingresa tu correo electrónico
          3. Ingresa tu contraseña
          4. (Opcional) Marca "Recordarme" para no tener que iniciar sesión cada vez
          5. Haz clic en "Entrar"
        `,
        image: '/help/screenshots/login.png',
        tips: [
          'Si olvidaste tu contraseña, usa el enlace "¿Olvidaste tu contraseña?"',
          'La sesión expira después de 7 días de inactividad'
        ]
      },
      {
        id: 'dashboard',
        title: 'Conocer el Dashboard',
        description: `
          El dashboard es tu pantalla principal donde verás:

          **Elementos principales:**
          - **Mis Cartas**: Lista de todas tus cartas natales guardadas
          - **Informes Recientes**: Últimos informes generados
          - **Acceso Rápido**: Botones para crear nueva carta o generar informe
          - **Estado del Plan**: Tu plan actual (FREE/PREMIUM/ENTERPRISE)
          - **Menú de navegación**: Acceso a todas las secciones
        `,
        image: '/help/screenshots/dashboard.png',
        tips: [
          'Usa el buscador para encontrar cartas rápidamente',
          'Puedes organizar tus cartas por fecha o nombre'
        ]
      }
    ]
  },

  // ====================================================================
  // CREAR CARTA NATAL
  // ====================================================================
  {
    id: 'create-chart',
    title: 'Crear Carta Natal',
    icon: '🌟',
    description: 'Cómo crear y gestionar cartas natales',
    category: 'getting-started',
    steps: [
      {
        id: 'new-chart',
        title: 'Nueva Carta Natal',
        description: `
          Crea una carta natal ingresando los datos de nacimiento.

          **Datos requeridos:**
          1. **Nombre completo** - Nombre de la persona
          2. **Fecha de nacimiento** - Día, mes y año
          3. **Hora de nacimiento** - Lo más exacta posible (ver certificado de nacimiento)
          4. **Lugar de nacimiento** - Ciudad y país

          **Pasos:**
          1. Haz clic en "Nueva Carta"
          2. Completa el formulario con los datos
          3. Haz clic en "Calcular Carta"
          4. Revisa que los datos sean correctos
          5. Guarda la carta con un nombre descriptivo
        `,
        image: '/help/screenshots/new-chart.png',
        tips: [
          'La hora exacta es crucial para la precisión del Ascendente',
          'Si no conoces la hora exacta, usa 12:00 como aproximación',
          'Puedes editar los datos después si encuentras información más precisa'
        ],
        warnings: [
          'Una hora incorrecta puede cambiar significativamente la interpretación',
          'Verifica siempre la zona horaria del lugar de nacimiento'
        ]
      },
      {
        id: 'save-chart',
        title: 'Guardar y Organizar Cartas',
        description: `
          Guarda tus cartas natales para acceder a ellas fácilmente.

          **Opciones de guardado:**
          - **Guardar**: Almacena la carta en tu cuenta
          - **Nombre personalizado**: Dale un nombre fácil de recordar
          - **Notas**: Agrega notas personales sobre la carta
          - **Categorías**: Organiza por familia, amigos, clientes, etc.

          **Gestión:**
          - Edita cartas guardadas en cualquier momento
          - Elimina cartas que ya no necesites
          - Duplica una carta para crear variaciones
        `,
        image: '/help/screenshots/save-chart.png',
        tips: [
          'Usa nombres descriptivos como "María García - Cliente"',
          'Las cartas se sincronizan en todos tus dispositivos',
          'Puedes exportar cartas en formato PDF'
        ]
      },
      {
        id: 'chart-visualization',
        title: 'Visualizar la Carta',
        description: `
          Explora la representación visual de la carta natal.

          **Elementos visuales:**
          1. **Rueda natal**: Círculo principal con signos y casas
          2. **Posiciones planetarias**: Ubicación de cada planeta
          3. **Aspectos**: Líneas que conectan planetas
          4. **Tabla de datos**: Posiciones exactas en grados
          5. **Dignidades**: Información sobre regencias y exaltaciones

          **Controles:**
          - Zoom: Acerca o aleja la vista
          - Ocultar/Mostrar aspectos: Limpia la vista
          - Cambiar estilo: Diferentes temas visuales
        `,
        image: '/help/screenshots/chart-view.png',
        tips: [
          'Pasa el cursor sobre un planeta para ver detalles',
          'Haz clic en un aspecto para ver su interpretación',
          'Usa el modo "Sin aspectos" para ver la carta más clara'
        ]
      }
    ]
  },

  // ====================================================================
  // GENERAR INFORMES
  // ====================================================================
  {
    id: 'generate-reports',
    title: 'Generar Informes',
    icon: '📄',
    description: 'Cómo crear informes astrológicos personalizados',
    category: 'reports',
    steps: [
      {
        id: 'report-wizard',
        title: 'Wizard de Configuración',
        description: `
          El asistente te guía paso a paso para crear un informe personalizado.

          **4 Pasos del Wizard:**

          **1. Tipo de Informe**
          - Carta Natal Completa
          - Carta Natal Resumida
          - Tránsitos
          - Sinastría (Compatibilidad)
          - Revolución Solar
          - Otros tipos según tu plan

          **2. Plantilla (Opcional)**
          - Sin plantilla (usar configuración por defecto)
          - Plantillas públicas disponibles
          - Tus plantillas personalizadas (Premium+)

          **3. Configuración de Orbes**
          - Cuerpos celestes activos
          - Sistema de casas (Placidus, Koch, etc.)
          - Estrellas fijas
          - Orbes personalizados

          **4. Resumen y Generar**
          - Revisa toda la configuración
          - Genera el informe completo
        `,
        image: '/help/screenshots/report-wizard.png',
        tips: [
          'Empieza con un informe resumido para familiarizarte',
          'Guarda tu configuración de orbes favorita',
          'Los informes completos pueden tardar 20-30 minutos'
        ],
        warnings: [
          'No cierres la ventana mientras se genera el informe',
          'Los informes muy largos consumen más créditos (Premium)'
        ]
      },
      {
        id: 'select-report-type',
        title: 'Seleccionar Tipo de Informe',
        description: `
          Elige el tipo de análisis que necesitas.

          **Tipos disponibles:**

          🌟 **Carta Natal Completa** (FREE)
          - Análisis exhaustivo de todos los elementos
          - 10 módulos de interpretación
          - ~8,000 palabras
          - Ideal para lecturas profesionales

          📝 **Carta Natal Resumida** (FREE)
          - Análisis breve de puntos clave
          - 4 módulos principales
          - ~3,000 palabras
          - Ideal para introducción rápida

          🌊 **Tránsitos** (PREMIUM)
          - Influencias planetarias actuales
          - Predicciones a corto/mediano plazo
          - Requiere plan Premium

          💞 **Sinastría** (PREMIUM)
          - Compatibilidad entre dos personas
          - Análisis de relación
          - Requiere dos cartas natales

          ☀️ **Revolución Solar** (PREMIUM)
          - Análisis del año personal
          - Temas y tendencias anuales

          👶 **Carta Infantil** (PREMIUM)
          - Adaptada para niños
          - Lenguaje para padres

          💼 **Orientación Vocacional** (ENTERPRISE)
          - Potencial profesional
          - Áreas recomendadas

          🧠 **Análisis Psicológico** (ENTERPRISE - BETA)
          - Patrones psicológicos profundos
          - Solo Enterprise
        `,
        image: '/help/screenshots/report-types.png',
        tips: [
          'Cada tipo tiene módulos diferentes adaptados al análisis',
          'Los badges indican qué plan necesitas',
          'Tipos bloqueados muestran opción de upgrade'
        ]
      },
      {
        id: 'select-template',
        title: 'Seleccionar Plantilla',
        description: `
          Personaliza el estilo y contenido del informe.

          **Opciones:**

          📋 **Sin Plantilla**
          - Usa configuración por defecto del sistema
          - Disponible para todos los usuarios
          - Estilo estándar profesional

          🎨 **Plantillas Públicas**
          - Creadas por el equipo
          - Diferentes estilos predefinidos:
            * Estándar (8 módulos, completo)
            * Breve (4 módulos, resumen)
            * Premium Detallada (10 módulos, exhaustivo)

          ⭐ **Tus Plantillas** (Premium+)
          - Plantillas que has creado
          - Totalmente personalizables
          - Logo, colores, tipografía
          - Selección de módulos
          - Hasta 5 plantillas (Premium)
          - Ilimitadas (Enterprise)

          **Información visible:**
          - Modo del informe (resumen/completo/exhaustivo)
          - Cantidad de módulos incluidos
          - Idioma configurado
          - Veces que has usado la plantilla
        `,
        image: '/help/screenshots/template-selector.png',
        tips: [
          'Prueba las plantillas públicas antes de crear la tuya',
          'Clona una plantilla pública para personalizarla',
          'Los usuarios Free solo pueden usar plantillas públicas'
        ]
      },
      {
        id: 'configure-orbs',
        title: 'Configurar Orbes y Precisión',
        description: `
          Ajusta los parámetros técnicos del cálculo astrológico.

          **Secciones de configuración:**

          **1. Cuerpos Celestes**
          - Planetas personales (Sol, Luna, Mercurio, Venus, Marte)
          - Planetas sociales (Júpiter, Saturno)
          - Planetas transpersonales (Urano, Neptuno, Plutón)
          - Puntos extra (Nodo Norte, Lilith, Quirón, Vértex)
          - Asteroides (Ceres, Pallas, Juno, Vesta, etc.)

          **2. Sistema de Casas**
          - Placidus (más usado)
          - Koch
          - Campanus
          - Regiomontanus
          - Iguales
          - Signos enteros

          **3. Estrellas Fijas**
          - Aldebarán, Algol, Sirius, Régulus, etc.
          - Activa/desactiva las que quieras incluir

          **4. Orbes de Base**
          - Menores (orbes reducidos)
          - Mayores (orbes amplios - recomendado)
          - Personalizado (ajusta cada aspecto)

          **5. Símbolos y Visualización**
          - Mostrar símbolos de planetas
          - Incluir planetas transpersonales

          **6. Tabla de Aspectos**
          - Ajusta orbes individuales por aspecto
          - Conjunción, Oposición, Trígono, etc.
        `,
        image: '/help/screenshots/orb-config.png',
        tips: [
          'La configuración por defecto es profesional y equilibrada',
          'Guarda tu configuración favorita',
          'Puedes omitir este paso y usar valores por defecto'
        ],
        warnings: [
          'Orbes muy amplios pueden generar demasiados aspectos',
          'Orbes muy pequeños pueden omitir aspectos importantes'
        ]
      },
      {
        id: 'generation-process',
        title: 'Proceso de Generación',
        description: `
          Qué sucede mientras se genera tu informe.

          **Fases del proceso:**

          1. **Inicialización** (5-10 seg)
             - Validación de datos
             - Preparación de contexto
             - Resolución de prompts

          2. **Generación por Módulos** (15-40 min)
             - Cada módulo se genera secuencialmente
             - Barra de progreso muestra avance
             - Contador de tiempo estimado
             - Módulo actual visible

          3. **Síntesis Final** (2-5 min)
             - Integración de todos los módulos
             - Coherencia y continuidad
             - Generación de conclusiones

          4. **Formateo y PDF** (1-2 min)
             - Aplicación de plantilla
             - Generación de PDF
             - Guardado en tu cuenta

          **Durante la generación:**
          - ✅ Puedes minimizar la ventana
          - ✅ La generación continúa en segundo plano
          - ❌ NO cierres completamente la ventana
          - ❌ NO recargues la página

          **Indicadores visuales:**
          - Barra de progreso por módulo
          - Porcentaje global completado
          - Tiempo estimado restante
          - Estado de cada módulo (pendiente/generando/completado)
        `,
        image: '/help/screenshots/generation-progress.png',
        tips: [
          'Los informes se guardan automáticamente',
          'Puedes pausar y reanudar la generación',
          'Si hay un error, el sistema reintenta automáticamente'
        ],
        warnings: [
          'Si cierras la ventana, deberás reiniciar la generación',
          'Asegúrate de tener conexión estable a internet'
        ],
        relatedSteps: ['download-report', 'report-library']
      },
      {
        id: 'download-report',
        title: 'Descargar y Compartir Informe',
        description: `
          Accede a tu informe generado y compártelo.

          **Opciones de descarga:**

          📄 **PDF**
          - Formato profesional
          - Listo para imprimir
          - Incluye gráficos y tablas
          - Marca de agua según plan

          📝 **Texto (TXT)**
          - Solo el contenido textual
          - Fácil de copiar/pegar
          - Sin formato visual

          📊 **Word (DOCX)** (Premium+)
          - Editable en Word
          - Mantiene formato básico
          - Permite personalización adicional

          **Compartir:**
          - Enlace temporal (24 horas)
          - Envío por email
          - Código QR para acceso móvil

          **Configuración de privacidad:**
          - Público: Cualquiera con el enlace puede ver
          - Protegido con contraseña
          - Solo tú (privado)
        `,
        image: '/help/screenshots/download-report.png',
        tips: [
          'Los PDFs incluyen tabla de contenidos clickeable',
          'Puedes regenerar el PDF si cambias la plantilla',
          'Enlaces temporales se eliminan automáticamente'
        ]
      }
    ]
  },

  // ====================================================================
  // PLANTILLAS (PREMIUM)
  // ====================================================================
  {
    id: 'templates',
    title: 'Plantillas Personalizadas',
    icon: '🎨',
    description: 'Crea y gestiona plantillas de informes (Premium)',
    category: 'configuration',
    steps: [
      {
        id: 'create-template',
        title: 'Crear Nueva Plantilla',
        description: `
          Diseña tu propia plantilla de informe (requiere plan Premium).

          **Pasos para crear:**
          1. Ve a "Mis Plantillas"
          2. Clic en "Nueva Plantilla"
          3. Selecciona el tipo de informe base
          4. Configura las opciones

          **Secciones configurables:**

          **1. Branding**
          - Logo personalizado (URL o upload)
          - Tamaño del logo (pequeño/mediano/grande)
          - Título del informe
          - Tipografía (Arial, Georgia, etc.)
          - Colores (primario, secundario, acento)

          **2. Contenido**
          - Módulos a incluir (selecciona cuáles quieres)
          - Modo del informe:
            * Resumen (~3K palabras)
            * Completo (~8K palabras)
            * Exhaustivo (~15K palabras)
          - Idioma (ES, EN, FR, DE, IT, PT)
          - Incluir imágenes de carta
          - Incluir tabla de aspectos
          - Incluir tabla planetaria
          - Tamaño de página (A4 o Letter)

          **3. Avanzado** (Enterprise)
          - CSS personalizado
          - Texto de marca de agua
          - Encriptación de PDF
        `,
        image: '/help/screenshots/create-template.png',
        tips: [
          'Empieza clonando una plantilla pública',
          'Prueba la plantilla antes de usarla en cliente',
          'Premium permite hasta 5 plantillas'
        ],
        warnings: [
          'Requiere plan Premium o Enterprise',
          'CSS personalizado solo en Enterprise'
        ],
        relatedSteps: ['edit-template', 'clone-template']
      },
      {
        id: 'edit-template',
        title: 'Editar Plantilla Existente',
        description: `
          Modifica una plantilla que ya creaste.

          **Cómo editar:**
          1. Ve a "Mis Plantillas"
          2. Encuentra la plantilla
          3. Clic en icono de edición (lápiz)
          4. Modifica lo que necesites
          5. Guarda cambios

          **Qué puedes cambiar:**
          - Todos los parámetros de branding
          - Selección de módulos
          - Modo del informe
          - Configuración de visualización

          **Limitaciones:**
          - No puedes cambiar el tipo de informe base
          - Solo puedes editar tus propias plantillas
          - Plantillas públicas no son editables
        `,
        image: '/help/screenshots/edit-template.png',
        tips: [
          'Los cambios no afectan informes ya generados',
          'Duplica la plantilla antes de hacer cambios grandes',
          'Puedes previsualizar antes de guardar'
        ]
      },
      {
        id: 'clone-template',
        title: 'Clonar Plantilla',
        description: `
          Crea una copia de una plantilla existente.

          **Usos:**
          - Usar una plantilla pública como base
          - Crear variaciones de tu plantilla
          - Experimentar sin afectar el original

          **Cómo clonar:**
          1. Encuentra la plantilla a clonar
          2. Clic en icono de clonar (dos hojas)
          3. La copia aparece en "Mis Plantillas"
          4. Edítala como quieras

          **Nota:** La plantilla clonada es tuya y cuenta para tu límite (5 en Premium).
        `,
        image: '/help/screenshots/clone-template.png',
        tips: [
          'Renombra la copia para identificarla fácilmente',
          'Puedes clonar plantillas públicas y de otros usuarios'
        ]
      },
      {
        id: 'delete-template',
        title: 'Eliminar Plantilla',
        description: `
          Borra plantillas que ya no necesitas.

          **Cómo eliminar:**
          1. Ve a "Mis Plantillas"
          2. Encuentra la plantilla
          3. Clic en icono de basura
          4. Confirma la eliminación

          **Importante:**
          - La eliminación es permanente
          - No afecta informes ya generados
          - No puedes eliminar plantillas públicas
          - Libera espacio en tu límite de plantillas
        `,
        image: '/help/screenshots/delete-template.png',
        warnings: [
          'La eliminación no se puede deshacer',
          'Asegúrate de no necesitarla antes de borrar'
        ]
      }
    ]
  },

  // ====================================================================
  // CONFIGURACIÓN DE CUENTA
  // ====================================================================
  {
    id: 'account-settings',
    title: 'Configuración de Cuenta',
    icon: '⚙️',
    description: 'Gestiona tu perfil y preferencias',
    category: 'configuration',
    steps: [
      {
        id: 'profile-settings',
        title: 'Editar Perfil',
        description: `
          Actualiza tu información personal.

          **Datos editables:**
          - Nombre completo
          - Email (requiere verificación)
          - Foto de perfil
          - Biografía profesional
          - Idioma de interfaz
          - Zona horaria

          **Cambiar contraseña:**
          1. Ve a "Seguridad"
          2. Clic en "Cambiar contraseña"
          3. Ingresa contraseña actual
          4. Ingresa nueva contraseña (2 veces)
          5. Confirma
        `,
        image: '/help/screenshots/profile-settings.png',
        tips: [
          'Mantén tu email actualizado para recuperación de cuenta',
          'Usa autenticación de dos factores para mayor seguridad'
        ]
      },
      {
        id: 'subscription-management',
        title: 'Gestionar Suscripción',
        description: `
          Administra tu plan y facturación.

          **Planes disponibles:**

          🆓 **FREE**
          - Cartas natales ilimitadas
          - Informes básicos
          - 2 tipos de informe
          - Sin plantillas personalizadas

          ⭐ **PREMIUM** - €19/mes
          - Todo lo de Free +
          - 6 tipos de informe adicionales
          - Hasta 5 plantillas personalizadas
          - Branding personalizado
          - Prompts personalizados
          - Soporte prioritario

          👑 **ENTERPRISE** - €49/mes
          - Todo lo de Premium +
          - Plantillas ilimitadas
          - CSS personalizado
          - API access
          - Marca de agua personalizada
          - Soporte dedicado

          **Actualizar plan:**
          1. Ve a "Suscripción"
          2. Selecciona el plan deseado
          3. Ingresa datos de pago
          4. Confirma

          **Cancelar:**
          - Puedes cancelar en cualquier momento
          - Acceso hasta fin del período pagado
          - Sin penalización
        `,
        image: '/help/screenshots/subscription.png',
        tips: [
          'Prueba Premium por 7 días gratis',
          'Ahorra 20% con pago anual',
          'Enterprise incluye onboarding personalizado'
        ]
      }
    ]
  },

  // ====================================================================
  // ADMIN
  // ====================================================================
  {
    id: 'admin-panel',
    title: 'Panel de Administración',
    icon: '👨‍💼',
    description: 'Gestión de usuarios y sistema (Solo Admin)',
    category: 'admin',
    steps: [
      {
        id: 'manage-users',
        title: 'Gestionar Usuarios',
        description: `
          Administra todos los usuarios de la plataforma.

          **Funciones:**
          - Ver lista completa de usuarios
          - Buscar por nombre o email
          - Filtrar por rol y estado
          - Ver detalles de cada usuario
          - Editar roles (user/admin)
          - Activar/desactivar cuentas
          - Resetear contraseñas
          - Eliminar usuarios

          **Información visible:**
          - Datos personales
          - Plan actual
          - Cartas creadas
          - Informes generados
          - Historial de pagos
          - Logs de actividad
        `,
        image: '/help/screenshots/admin-users.png',
        warnings: [
          'Solo accesible para administradores',
          'Cambios quedan registrados en auditoría'
        ]
      },
      {
        id: 'manage-report-types',
        title: 'Gestionar Tipos de Informe',
        description: `
          Crea y administra tipos de informe disponibles.

          **Funciones:**
          - Crear nuevo tipo de informe
          - Editar tipos existentes
          - Configurar módulos disponibles
          - Establecer plan requerido
          - Activar/desactivar tipos
          - Marcar como beta

          **Al crear tipo nuevo:**
          - Se genera prompt por defecto automático
          - Configura categoría (individual/infantil/sistemico/clinico)
          - Define módulos y duración estimada
          - Asigna icono
        `,
        image: '/help/screenshots/admin-report-types.png',
        tips: [
          'Usa el endpoint de seeding para crear tipos básicos',
          'Prueba tipos beta antes de hacerlos públicos'
        ]
      },
      {
        id: 'system-seeding',
        title: 'Inicializar Sistema',
        description: `
          Configura el sistema con datos iniciales.

          **Endpoint de Seeding:**
          \`POST /admin/seed-report-system\`

          **Crea automáticamente:**
          - 2 tipos de informe básicos
          - Prompts profesionales
          - Configuración inicial

          **Cuándo usar:**
          - Primera vez que se instala
          - Después de reset de base de datos
          - Para restaurar configuración por defecto

          **Verificar estado:**
          \`GET /admin/system-status-report\`
        `,
        image: '/help/screenshots/admin-seeding.png',
        tips: [
          'El seeding es idempotente (puedes ejecutarlo varias veces)',
          'Verifica el status antes de hacer seeding'
        ]
      }
    ]
  },

  // ====================================================================
  // SOLUCIÓN DE PROBLEMAS
  // ====================================================================
  {
    id: 'troubleshooting',
    title: 'Solución de Problemas',
    icon: '🔧',
    description: 'Resuelve problemas comunes',
    category: 'advanced',
    steps: [
      {
        id: 'report-not-generating',
        title: 'El informe no se genera',
        description: `
          **Posibles causas y soluciones:**

          **1. Conexión perdida**
          - Verifica tu conexión a internet
          - Recarga la página
          - Intenta generar nuevamente

          **2. Timeout**
          - El servidor puede estar ocupado
          - Espera 5 minutos e intenta de nuevo
          - Usa un informe más breve (modo resumen)

          **3. Datos de carta incorrectos**
          - Verifica que la carta esté guardada correctamente
          - Recalcula la carta si es necesario
          - Asegúrate de tener todos los datos requeridos

          **4. Límite de plan alcanzado**
          - Verifica tu plan actual
          - Algunos tipos requieren Premium
          - Upgrade si es necesario
        `,
        tips: [
          'Contacta soporte si el problema persiste',
          'Guarda capturas de pantalla del error'
        ]
      },
      {
        id: 'slow-generation',
        title: 'Generación muy lenta',
        description: `
          **Causas normales:**
          - Informes exhaustivos tardan 40-60 minutos
          - Informes completos tardan 20-30 minutos
          - Server ocupado puede agregar 10-15 minutos

          **Optimizaciones:**
          - Usa modo "resumen" para informes más rápidos
          - Reduce cantidad de módulos en la plantilla
          - Genera en horarios de menos tráfico (madrugada)

          **Si es anormalmente lento:**
          - Verifica estado del sistema
          - Contacta soporte
        `,
        tips: [
          'La generación continúa aunque minimices la ventana',
          'Puedes ver el progreso en tiempo real'
        ]
      },
      {
        id: 'login-issues',
        title: 'Problemas de inicio de sesión',
        description: `
          **No puedo iniciar sesión:**

          **1. Credenciales incorrectas**
          - Verifica mayúsculas/minúsculas
          - Usa "¿Olvidaste tu contraseña?"

          **2. Email no verificado**
          - Revisa tu correo (y spam)
          - Reenvía email de verificación

          **3. Cuenta desactivada**
          - Contacta soporte

          **4. Sesión expirada**
          - Simplemente vuelve a iniciar sesión

          **Recuperar contraseña:**
          1. Clic en "¿Olvidaste tu contraseña?"
          2. Ingresa tu email
          3. Revisa tu correo
          4. Clic en enlace de recuperación
          5. Crea nueva contraseña
        `,
        tips: [
          'Las sesiones expiran después de 7 días',
          'Usa "Recordarme" para sesiones más largas'
        ]
      }
    ]
  },

  // ====================================================================
  // EXTENSIÓN WORDPRESS
  // ====================================================================
  {
    id: 'wordpress-extension',
    title: 'Extensión WordPress',
    icon: '🔌',
    description: 'Integra el sistema de informes astrológicos con tu sitio WordPress',
    category: 'advanced',
    steps: [
      {
        id: 'wp-intro',
        title: 'Introducción a la Extensión',
        description: `
          La extensión de WordPress te permite integrar completamente el sistema de generación de informes astrológicos en tu sitio web.

          **¿Qué incluye?**
          - 🎨 Interfaz coherente con la aplicación principal
          - 💳 Integración con WooCommerce y Stripe
          - 📊 Panel de administración completo
          - 🔐 Control de acceso por plan de pago
          - 📱 Diseño responsive
          - 🌍 Multiidioma

          **Requisitos:**
          - WordPress 6.0 o superior
          - WooCommerce 8.0 o superior
          - WooCommerce Subscriptions (para suscripciones)
          - Stripe Payment Gateway
          - PHP 8.1 o superior
        `,
        image: '/help/screenshots/wp-intro.png',
        tips: [
          'Asegúrate de tener un backup completo antes de instalar',
          'Prueba primero en un entorno de staging',
          'Lee la documentación completa antes de comenzar'
        ],
        relatedSteps: ['wp-install', 'wp-configure']
      },
      {
        id: 'wp-install',
        title: 'Instalación del Plugin',
        description: `
          Instala el plugin Decano Astrológico en tu WordPress.

          **Método 1: Desde el repositorio**
          1. Ve a **Plugins → Añadir nuevo**
          2. Busca "Decano Astrológico"
          3. Haz clic en "Instalar ahora"
          4. Haz clic en "Activar"

          **Método 2: Subida manual**
          1. Descarga el archivo ZIP del plugin
          2. Ve a **Plugins → Añadir nuevo → Subir plugin**
          3. Selecciona el archivo ZIP
          4. Haz clic en "Instalar ahora"
          5. Activa el plugin

          **Después de la activación:**
          El plugin creará automáticamente:
          - 3 productos de suscripción en WooCommerce
          - Tablas necesarias en la base de datos
          - Páginas de configuración
        `,
        image: '/help/screenshots/wp-install.png',
        tips: [
          'Verifica que WooCommerce esté activo antes de instalar',
          'La primera activación puede tardar unos segundos',
          'Revisa los logs si hay algún error durante la instalación'
        ],
        warnings: [
          'No desactives el plugin mientras haya informes generándose',
          'Asegúrate de tener permisos de escritura en wp-content'
        ],
        relatedSteps: ['wp-configure', 'wp-products']
      },
      {
        id: 'wp-configure',
        title: 'Configuración Inicial',
        description: `
          Configura el plugin para conectarlo con el backend de la aplicación.

          **Paso 1: Configurar conexión API**
          1. Ve a **Decano → Configuración → API**
          2. Ingresa la **URL del backend**: \`https://api.decano.com\`
          3. Ingresa tu **API Key** (solicítala al administrador)
          4. Haz clic en "Probar conexión"
          5. Verifica que aparezca "✅ Conexión exitosa"

          **Paso 2: Configurar Stripe**
          1. Ve a **WooCommerce → Ajustes → Pagos → Stripe**
          2. Activa el método de pago
          3. Ingresa tus claves de Stripe (test o producción)
          4. Configura webhooks según la documentación

          **Paso 3: Configurar límites**
          1. Ve a **Decano → Configuración → Límites**
          2. Configura límites personalizados si es necesario
          3. Activa el control de límites
          4. Guarda los cambios
        `,
        image: '/help/screenshots/wp-config.png',
        tips: [
          'Usa las claves de test de Stripe primero',
          'Guarda la API Key en un lugar seguro',
          'Prueba la conexión después de cada cambio'
        ],
        warnings: [
          'No compartas tu API Key con nadie',
          'Usa HTTPS en producción (SSL requerido para Stripe)'
        ],
        relatedSteps: ['wp-products', 'wp-shortcodes']
      },
      {
        id: 'wp-products',
        title: 'Productos y Planes',
        description: `
          El plugin crea automáticamente 3 productos de suscripción en WooCommerce.

          **Plan Gratuito (€0/mes)**
          - 1 informe resumido al mes
          - Carta natal básica
          - Posiciones planetarias
          - Aspectos principales

          **Plan Premium (€29.99/mes)**
          - Informes ilimitados
          - Informes completos
          - Plantillas personalizadas
          - Técnicas avanzadas
          - Exportación PDF/DOCX
          - Soporte prioritario

          **Plan Enterprise (€99.99/mes)**
          - Todo de Premium
          - Informes personalizados
          - API REST completa
          - Prompts personalizados
          - Soporte 24/7
          - Gestor de cuenta dedicado

          **Personalizar productos:**
          1. Ve a **WooCommerce → Productos**
          2. Edita el producto que desees
          3. Modifica precio, descripción o características
          4. Guarda los cambios
        `,
        image: '/help/screenshots/wp-products.png',
        tips: [
          'Puedes crear planes personalizados adicionales',
          'Los precios son solo sugeridos, ajústalos a tu mercado',
          'Usa cupones de WooCommerce para promociones'
        ],
        relatedSteps: ['wp-configure', 'wp-checkout']
      },
      {
        id: 'wp-shortcodes',
        title: 'Usar Shortcodes',
        description: `
          El plugin incluye varios shortcodes para insertar funcionalidad en tus páginas.

          **[decano-report-generator]**
          Muestra el generador de informes completo.
          \`\`\`
          [decano-report-generator plan_check="true" show_upgrade="true"]
          \`\`\`

          **[decano-user-dashboard]**
          Dashboard del usuario con sus informes y estadísticas.
          \`\`\`
          [decano-user-dashboard]
          \`\`\`

          **[decano-plans]**
          Selector de planes con comparación.
          \`\`\`
          [decano-plans highlighted="premium"]
          \`\`\`

          **[decano-report-history]**
          Historial de informes del usuario.
          \`\`\`
          [decano-report-history limit="10"]
          \`\`\`

          **Ejemplo de página completa:**
          \`\`\`
          <h1>Genera tu Carta Astral</h1>
          <p>Descubre tu carta natal personalizada</p>

          [decano-report-generator]

          <h2>¿Necesitas más informes?</h2>
          [decano-plans]
          \`\`\`
        `,
        image: '/help/screenshots/wp-shortcodes.png',
        tips: [
          'Combina shortcodes con contenido personalizado',
          'Usa atributos para personalizar comportamiento',
          'Crea páginas específicas para cada shortcode'
        ],
        relatedSteps: ['wp-pages', 'wp-customize']
      },
      {
        id: 'wp-checkout',
        title: 'Proceso de Compra',
        description: `
          Cómo funciona el proceso de compra de planes para tus usuarios.

          **Flujo de compra:**
          1. Usuario hace clic en "Mejorar plan" o "Comprar"
          2. Se redirige al checkout de WooCommerce
          3. Completa datos de facturación
          4. Ingresa datos de tarjeta (Stripe)
          5. Confirma el pago
          6. Stripe procesa la suscripción
          7. WordPress actualiza el plan del usuario
          8. Backend se sincroniza automáticamente
          9. Usuario puede generar informes según su nuevo plan

          **Gestión de suscripciones:**
          Los usuarios pueden gestionar sus suscripciones desde:
          - **Mi cuenta → Suscripciones**
          - Ver próxima renovación
          - Actualizar método de pago
          - Cancelar suscripción
          - Ver historial de pagos
        `,
        image: '/help/screenshots/wp-checkout.png',
        tips: [
          'Configura emails de confirmación personalizados',
          'Ofrece cupones de descuento para nuevos usuarios',
          'Activa renovación automática para suscripciones'
        ],
        warnings: [
          'Las cancelaciones son inmediatas pero el acceso dura hasta fin de periodo',
          'Configura webhooks de Stripe correctamente para evitar problemas'
        ]
      },
      {
        id: 'wp-admin-panel',
        title: 'Panel de Administración',
        description: `
          Gestiona usuarios, informes y configuración desde el panel de WordPress.

          **Dashboard (Decano → Dashboard)**
          - Estadísticas generales
          - Informes generados este mes
          - Suscripciones activas
          - Ingresos del mes
          - Gráficos de uso

          **Usuarios (Decano → Usuarios)**
          - Ver todos los usuarios
          - Filtrar por plan
          - Ver informes de cada usuario
          - Cambiar plan manualmente
          - Exportar lista de usuarios

          **Informes (Decano → Informes)**
          - Ver todos los informes generados
          - Filtrar por tipo, fecha, usuario
          - Descargar cualquier informe
          - Eliminar informes antiguos
          - Ver estadísticas de uso

          **Configuración (Decano → Configuración)**
          - API settings
          - Límites de planes
          - Email templates
          - Cache settings
          - Webhooks
        `,
        image: '/help/screenshots/wp-admin.png',
        tips: [
          'Revisa el dashboard semanalmente para detectar tendencias',
          'Exporta informes mensuales para análisis',
          'Configura alertas para problemas de API'
        ],
        relatedSteps: ['wp-users-management', 'wp-reports-management']
      },
      {
        id: 'wp-users-management',
        title: 'Gestión de Usuarios',
        description: `
          Administra usuarios y sus planes directamente desde WordPress.

          **Ver detalles de usuario:**
          1. Ve a **Decano → Usuarios**
          2. Busca el usuario
          3. Haz clic en "Ver detalles"
          4. Verás:
             - Plan actual
             - Informes generados este mes
             - Límite de informes
             - Historial completo
             - Próxima renovación

          **Cambiar plan manualmente:**
          1. Busca el usuario
          2. Haz clic en "Cambiar plan"
          3. Selecciona el nuevo plan
          4. (Opcional) Añade nota sobre el cambio
          5. Confirma
          6. El cambio es inmediato

          **Ver informes de un usuario:**
          1. Haz clic en "Ver informes"
          2. Verás todos sus informes
          3. Puedes descargarlos o eliminarlos
          4. Ver detalles de generación
        `,
        image: '/help/screenshots/wp-users-manage.png',
        tips: [
          'Documenta cambios manuales de plan',
          'Usa filtros para encontrar usuarios rápidamente',
          'Exporta datos antes de hacer cambios masivos'
        ],
        warnings: [
          'Cambios manuales no afectan suscripciones de WooCommerce',
          'Sincroniza manualmente si es necesario'
        ]
      },
      {
        id: 'wp-troubleshooting',
        title: 'Solución de Problemas',
        description: `
          Problemas comunes y cómo resolverlos.

          **Error: "No se puede conectar con la API"**
          - Verifica que la URL de la API sea correcta
          - Comprueba que el backend esté funcionando
          - Revisa la API Key
          - Verifica el firewall de tu servidor

          **Error: "Plan no actualizado después del pago"**
          - Verifica webhooks de WooCommerce
          - Comprueba logs en **WooCommerce → Estado → Logs**
          - Sincroniza manualmente desde admin
          - Revisa que Stripe esté configurado correctamente

          **Error: "No se puede generar informe"**
          - Verifica límites del plan del usuario
          - Comprueba conexión con backend
          - Revisa logs en **Decano → Configuración → Logs**
          - Prueba generar desde el admin

          **Error: "Shortcode no funciona"**
          - Verifica que el plugin esté activo
          - Limpia caché de WordPress
          - Comprueba sintaxis del shortcode
          - Revisa consola del navegador para errores JS
        `,
        tips: [
          'Activa modo debug de WordPress temporalmente',
          'Revisa logs regularmente',
          'Mantén backup reciente antes de troubleshooting'
        ],
        warnings: [
          'No desactives el plugin mientras investigas errores',
          'Documenta los pasos que tomas para resolver problemas'
        ]
      }
    ]
  }
];

/**
 * Buscar en el contenido de ayuda
 */
export function searchHelp(query: string): Array<{ section: HelpSection; step: HelpStep; relevance: number }> {
  const results: Array<{ section: HelpSection; step: HelpStep; relevance: number }> = [];
  const lowerQuery = query.toLowerCase();

  helpContent.forEach(section => {
    section.steps.forEach(step => {
      let relevance = 0;

      // Búsqueda en título (peso 3)
      if (step.title.toLowerCase().includes(lowerQuery)) {
        relevance += 3;
      }

      // Búsqueda en descripción (peso 2)
      if (step.description.toLowerCase().includes(lowerQuery)) {
        relevance += 2;
      }

      // Búsqueda en tips (peso 1)
      if (step.tips?.some(tip => tip.toLowerCase().includes(lowerQuery))) {
        relevance += 1;
      }

      if (relevance > 0) {
        results.push({ section, step, relevance });
      }
    });
  });

  // Ordenar por relevancia
  return results.sort((a, b) => b.relevance - a.relevance);
}

/**
 * Obtener ayuda contextual según la página actual
 */
export function getContextualHelp(page: string): HelpSection | null {
  const pageMap: Record<string, string> = {
    '/': 'getting-started',
    '/dashboard': 'getting-started',
    '/chart/new': 'create-chart',
    '/chart': 'create-chart',
    '/reports': 'generate-reports',
    '/reports/new': 'generate-reports',
    '/templates': 'templates',
    '/settings': 'account-settings',
    '/admin': 'admin-panel'
  };

  const sectionId = pageMap[page];
  return helpContent.find(section => section.id === sectionId) || null;
}
