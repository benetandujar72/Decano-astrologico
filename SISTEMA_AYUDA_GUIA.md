# 📚 Sistema de Ayuda Contextual - Guía de Implementación

## ✅ Estado de Implementación

### Completado
- ✅ **Estructura de tipos** (`types/help.ts`)
- ✅ **Contenido de ayuda** (`data/helpContent.ts`)
  - 6 secciones principales
  - 30+ pasos detallados
  - Búsqueda con relevancia ponderada
  - Ayuda contextual por página
- ✅ **Componentes visuales**:
  - `HelpPanel`: Panel principal con navegación
  - `HelpButton`: Botón flotante de ayuda
  - `HelpSearchBar`: Búsqueda en tiempo real
  - `HelpStepViewer`: Visualizador de pasos con markdown
  - `ContextualHelpTip`: Tips contextuales inline
- ✅ **Integración en App.tsx**
  - Botón flotante activado en todas las páginas
  - Contexto automático según modo activo

### Pendiente
- ⏳ **Capturas de pantalla** (ver sección siguiente)
- ⏳ **Videos tutoriales** (opcional)
- ⏳ **Traducción a otros idiomas** (opcional)

---

## 📸 Capturas de Pantalla Requeridas

Todas las capturas deben guardarse en `/public/help/screenshots/` con los siguientes nombres:

### 1. Getting Started (Primeros Pasos)
- `register-form.png` - Formulario de registro
- `login-form.png` - Formulario de inicio de sesión
- `dashboard-overview.png` - Vista general del dashboard

### 2. Create Chart (Crear Carta)
- `new-chart-form.png` - Formulario de nueva carta
  - Debe mostrar: nombre, fecha, hora, lugar con sugerencias
- `save-chart-dialog.png` - Diálogo de guardado
- `chart-visualization.png` - Visualización completa de carta natal
  - Incluir: rueda astrológica, tabla de planetas, aspectos

### 3. Generate Reports (Generar Informes)
- `report-wizard.png` - Vista del wizard de configuración (paso 1)
- `report-type-selection.png` - Selección de tipo de informe
  - Mostrar: Carta Natal Completa, Resumida, iconos, descripciones
- `template-selection.png` - Selección de plantilla (opcional, Premium)
  - Mostrar: plantillas disponibles, preview
- `orb-configuration.png` - Configuración de orbes
  - Mostrar: sliders de orbes por aspecto
- `generation-in-progress.png` - Pantalla de generación en progreso
  - Mostrar: barra de progreso, módulos completándose
- `download-report.png` - Informe completado listo para descargar
  - Mostrar: botones de descarga PDF/DOCX/JSON

### 4. Templates (Plantillas - Premium)
- `create-template.png` - Formulario de creación de plantilla
  - Mostrar: branding options, logo upload, colores
- `edit-template.png` - Edición de plantilla existente
- `template-preview.png` - Preview de plantilla
- `clone-template.png` - Diálogo de clonación
- `delete-template-confirm.png` - Confirmación de eliminación

### 5. Account Settings (Configuración de Cuenta)
- `profile-settings.png` - Configuración de perfil
  - Mostrar: campos de nombre, email, avatar
- `subscription-management.png` - Gestión de suscripción
  - Mostrar: plan actual, fecha de renovación, opciones de upgrade

### 6. Admin Panel (Panel de Administración)
- `admin-dashboard.png` - Dashboard principal de admin
- `user-management.png` - Gestión de usuarios
  - Mostrar: tabla de usuarios, roles, acciones
- `report-types-manager.png` - Gestor de tipos de informe
  - Mostrar: lista de tipos, crear nuevo, editar
- `system-seeding.png` - Inicialización del sistema

### 7. Troubleshooting (Resolución de Problemas)
- `error-generation.png` - Ejemplo de error en generación
- `geocoding-error.png` - Error de geocodificación
- `network-error.png` - Error de conexión

---

## 🎨 Requisitos de Capturas

### Estilo Visual
- **Tema**: Usar tema slate-900 (fondo oscuro)
- **Resolución**: 1920x1080 mínimo
- **Formato**: PNG con transparencia donde sea apropiado
- **Calidad**: Sin compresión, máxima claridad

### Contenido
- **Datos de ejemplo**: Usar datos ficticios pero realistas
  - Nombres: "Juan Pérez", "María García"
  - Fechas: Variadas pero válidas
  - Lugares: Ciudades reales españolas/latinoamericanas

- **Estados destacados**:
  - Resaltar elementos interactivos con cursor
  - Mostrar tooltips activos donde sea relevante
  - Incluir notificaciones o badges si existen

- **Idioma**: Español (coincidiendo con el contenido de ayuda)

### Herramientas Recomendadas
- **Windows**: Snipping Tool, ShareX
- **macOS**: Screenshot (Cmd+Shift+4)
- **Linux**: Flameshot, GNOME Screenshot
- **Edición**:
  - Para recortar: cualquier editor de imágenes
  - Para anotar (opcional): Figma, Excalidraw

---

## 🚀 Cómo Usar el Sistema de Ayuda

### Para Usuarios Finales

1. **Acceso rápido**: Click en el botón flotante de ayuda (círculo indigo con "?")
2. **Búsqueda**: Escribir término en la barra de búsqueda
3. **Navegación**:
   - Seleccionar sección → Ver pasos → Ver detalles
   - Usar "Volver" para navegar hacia atrás
4. **Ayuda contextual**: El sistema detecta automáticamente la página actual

### Para Desarrolladores

#### Agregar ayuda contextual en un componente

```tsx
import { HelpButton, ContextualHelpTip } from '@/components/HelpSystem';

function MiComponente() {
  return (
    <div>
      {/* Tip contextual inline */}
      <ContextualHelpTip
        title="¿Sabías que...?"
        content="Puedes guardar tus cartas para acceso rápido"
        type="tip"
      />

      {/* Botón de ayuda específico (opcional, además del global) */}
      <HelpButton
        context="/reports/new"
        position="top-right"
        tooltip="Ayuda sobre informes"
      />
    </div>
  );
}
```

#### Agregar nuevas secciones de ayuda

Editar `/data/helpContent.ts`:

```typescript
const nuevaSeccion: HelpSection = {
  id: 'nueva-seccion',
  title: 'Nueva Función',
  icon: '🆕',
  description: 'Descripción de la nueva función',
  category: 'advanced',
  steps: [
    {
      id: 'paso-1',
      title: 'Primer Paso',
      description: `
        # Título del paso

        Descripción en **markdown**.

        - Punto 1
        - Punto 2
      `,
      image: '/help/screenshots/nueva-funcion.png',
      tips: ['Consejo útil'],
      warnings: ['Advertencia importante']
    }
  ]
};

export const helpSections: HelpSection[] = [
  // ... secciones existentes
  nuevaSeccion
];
```

---

## 🔍 Funcionalidades del Sistema

### Búsqueda Inteligente
- **Ponderación**:
  - Coincidencia en título: peso 3
  - Coincidencia en descripción: peso 2
  - Coincidencia en tips: peso 1
- **Resultados ordenados** por relevancia
- **Búsqueda en tiempo real** con debounce de 300ms

### Ayuda Contextual
- **Detección automática** del modo/página actual
- **Mapeo inteligente**:
  ```
  '/' → getting-started
  '/dashboard' → getting-started
  '/chart/new' → create-chart
  '/reports' → generate-reports
  '/reports/new' → generate-reports
  '/templates' → templates (Premium)
  '/settings' → account-settings
  '/admin' → admin-panel
  ```

### Navegación
- **Breadcrumb virtual**: Secciones → Pasos → Detalles
- **Botones "Volver"** en cada nivel
- **Enlaces relacionados** entre pasos

### Contenido Rico
- **Markdown** completo (headings, listas, código, negritas, links)
- **Imágenes y videos** embebidos
- **Tips** destacados (amarillo)
- **Advertencias** destacadas (rojo)
- **Enlaces a pasos relacionados**

---

## 🎯 Próximos Pasos Recomendados

### Corto Plazo
1. **Tomar capturas de pantalla**
   - Seguir la lista de la sección "Capturas de Pantalla Requeridas"
   - Guardar en `/public/help/screenshots/`
   - Verificar que se carguen correctamente

2. **Crear directorio de screenshots**
   ```bash
   mkdir -p /home/user/Decano-astrologico/public/help/screenshots
   ```

3. **Probar el sistema**
   - Verificar que el botón de ayuda aparece
   - Probar búsqueda
   - Navegar por todas las secciones
   - Verificar que las imágenes placeholder muestran el mensaje correcto

### Medio Plazo
1. **Videos tutoriales** (opcional)
   - Grabaciones de pantalla de 1-2 minutos
   - Formato MP4, resolución 1080p
   - Guardar en `/public/help/videos/`

2. **Análisis de uso**
   - Agregar analytics para ver qué ayuda se busca más
   - Identificar pasos confusos que necesitan mejora

3. **Feedback de usuarios**
   - Agregar botón "¿Fue útil?" en cada paso
   - Recopilar sugerencias de mejora

### Largo Plazo
1. **Internacionalización (i18n)**
   - Traducir contenido a inglés, portugués
   - Detectar idioma del usuario automáticamente

2. **Ayuda interactiva**
   - Tours guiados (walkthrough)
   - Tooltips automáticos para nuevos usuarios

3. **Base de conocimientos expandida**
   - Casos de uso avanzados
   - Preguntas frecuentes (FAQ)
   - Glosario astrológico

---

## 📊 Métricas de Éxito

Para evaluar la efectividad del sistema de ayuda:

- ✅ **Tasa de uso**: % de usuarios que abren la ayuda
- ✅ **Búsquedas sin resultados**: < 10%
- ✅ **Tiempo en ayuda**: Promedio 2-5 minutos
- ✅ **Reducción de tickets de soporte**: -30% esperado
- ✅ **Satisfacción**: Rating > 4.5/5

---

## 🛠️ Troubleshooting del Sistema de Ayuda

### El botón de ayuda no aparece
- Verificar que `isAuthenticated === true`
- Verificar que `mode !== AppMode.AUTH && mode !== AppMode.LANDING`
- Revisar consola de errores

### Las imágenes no se cargan
- Verificar que existen en `/public/help/screenshots/`
- Verificar rutas en `helpContent.ts`
- El componente muestra placeholder si la imagen falla

### La búsqueda no funciona
- Verificar que hay contenido en `helpContent.ts`
- Revisar consola para errores de JavaScript
- Verificar que el debounce no está bloqueando

### Estilos incorrectos
- Verificar que Tailwind CSS está compilando correctamente
- Revisar que lucide-react está instalado
- Verificar que react-markdown está instalado

---

## 📞 Contacto y Soporte

Para preguntas o problemas con el sistema de ayuda:

- **Documentación técnica**: Este archivo
- **Código fuente**: `/components/HelpSystem/`
- **Contenido**: `/data/helpContent.ts`
- **Tipos**: `/types/help.ts`

---

**Versión**: 1.0.0
**Fecha**: 2026-01-10
**Estado**: ✅ Implementado (pendiente screenshots)
**Autor**: Sistema Fraktal
