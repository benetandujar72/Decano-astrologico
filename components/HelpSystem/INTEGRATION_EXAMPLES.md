# 🔌 Ejemplos de Integración del Sistema de Ayuda

Este documento muestra cómo integrar los componentes de ayuda en diferentes partes de la aplicación.

---

## 1. Botón de Ayuda Global (Ya Implementado)

El botón de ayuda global ya está integrado en `App.tsx`:

```tsx
import { HelpButton } from './components/HelpSystem';

// En el render de App.tsx, fuera de MaterialBackground
{isAuthenticated && mode !== AppMode.AUTH && mode !== AppMode.LANDING && (
  <HelpButton
    context={mode.toLowerCase()}
    position="bottom-right"
    tooltip="Abrir centro de ayuda"
  />
)}
```

Este botón aparece automáticamente en todas las pantallas cuando el usuario está autenticado.

---

## 2. Tips Contextuales Inline

### Ejemplo en Formulario de Nueva Carta

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';

function ChartInputForm() {
  return (
    <div className="space-y-4">
      <h2>Nueva Carta Natal</h2>

      {/* Tip contextual para ayudar con el formato de fecha */}
      <ContextualHelpTip
        title="Formato de fecha"
        content="Ingresa la fecha en formato DD/MM/AAAA. Ejemplo: 15/03/1990"
        type="info"
        dismissible={true}
      />

      <input type="date" name="fecha" />

      {/* ... resto del formulario */}
    </div>
  );
}
```

### Ejemplo en Generador de Informes

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';

function ReportGenerationWizard() {
  return (
    <div>
      <h2>Configuración del Informe</h2>

      {/* Advertencia sobre tiempo de generación */}
      <ContextualHelpTip
        title="⚠️ Tiempo de generación"
        content="Los informes completos pueden tardar 20-30 minutos. No cierres esta ventana durante el proceso."
        type="warning"
        dismissible={false}
      />

      {/* ... wizard steps */}
    </div>
  );
}
```

### Ejemplo en Panel de Configuración de Orbes

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';

function OrbConfigurationPanel() {
  return (
    <div>
      <h3>Configuración de Orbes</h3>

      {/* Tip útil para usuarios nuevos */}
      <ContextualHelpTip
        title="💡 ¿Qué son los orbes?"
        content="Los orbes determinan el rango de influencia de los aspectos astrológicos. Valores más altos incluyen más aspectos, pero menos precisos."
        type="tip"
        dismissible={true}
      />

      {/* ... sliders de orbes */}
    </div>
  );
}
```

---

## 3. Botón de Ayuda Específico de Página

Además del botón global, puedes agregar botones de ayuda específicos en ciertas páginas:

```tsx
import { HelpButton } from '@/components/HelpSystem';

function TemplateEditorPage() {
  return (
    <div className="relative">
      {/* Contenido de la página */}
      <h1>Editor de Plantillas</h1>

      {/* Botón de ayuda específico para esta página */}
      <HelpButton
        context="/templates/editor"
        position="top-right"
        tooltip="Ayuda del editor de plantillas"
      />

      {/* ... editor */}
    </div>
  );
}
```

---

## 4. Panel de Ayuda Personalizado

Si necesitas abrir el panel de ayuda programáticamente:

```tsx
import React, { useState } from 'react';
import { HelpPanel } from '@/components/HelpSystem';
import { HelpCircle } from 'lucide-react';

function CustomComponent() {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <button onClick={() => setShowHelp(true)} className="btn-help">
        <HelpCircle className="w-5 h-5" />
        Ver ayuda
      </button>

      <HelpPanel
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        initialContext="/mi-pagina-especial"
      />
    </>
  );
}
```

---

## 5. Tips Condicionales según Plan del Usuario

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';

function TemplateSection({ userPlan }: { userPlan: string }) {
  return (
    <div>
      <h3>Plantillas Personalizadas</h3>

      {/* Mostrar tip solo a usuarios Free */}
      {userPlan === 'free' && (
        <ContextualHelpTip
          title="🔒 Función Premium"
          content="Las plantillas personalizadas están disponibles en el plan Premium. ¡Mejora tu plan para acceder a esta funcionalidad!"
          type="info"
          dismissible={true}
        />
      )}

      {/* ... contenido de plantillas */}
    </div>
  );
}
```

---

## 6. Tips según Estado de la Tarea

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';

function ReportStatus({ status }: { status: string }) {
  return (
    <div>
      {status === 'generating' && (
        <ContextualHelpTip
          title="⏳ Generación en progreso"
          content="El informe se está generando. Puedes cerrar esta ventana y volver más tarde."
          type="info"
          dismissible={false}
        />
      )}

      {status === 'error' && (
        <ContextualHelpTip
          title="❌ Error en la generación"
          content="Hubo un problema generando el informe. Intenta nuevamente o contacta soporte si el problema persiste."
          type="warning"
          dismissible={true}
        />
      )}

      {status === 'completed' && (
        <ContextualHelpTip
          title="✅ Informe completado"
          content="Tu informe está listo para descargar. Puedes descargarlo en formato PDF, DOCX o JSON."
          type="tip"
          dismissible={true}
        />
      )}
    </div>
  );
}
```

---

## 7. Integración con Tooltips Existentes

Si ya tienes tooltips, puedes mantenerlos para ayuda breve y usar ContextualHelpTip para información más detallada:

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';
import { Info } from 'lucide-react';

function ComplexSetting() {
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);

  return (
    <div>
      <label className="flex items-center gap-2">
        Configuración Avanzada
        <button
          onClick={() => setShowDetailedHelp(!showDetailedHelp)}
          title="Más información"
          className="text-slate-400 hover:text-slate-300"
        >
          <Info className="w-4 h-4" />
        </button>
      </label>

      {showDetailedHelp && (
        <ContextualHelpTip
          title="Configuración Avanzada"
          content="Esta opción permite ajustar parámetros técnicos del cálculo astrológico. Solo recomendado para usuarios avanzados."
          type="info"
          dismissible={true}
        />
      )}

      {/* ... campo de configuración */}
    </div>
  );
}
```

---

## 8. Ayuda en Modales

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';
import GenericModal from './GenericModal';

function DeleteConfirmModal({ isOpen, onClose, onConfirm }: any) {
  return (
    <GenericModal isOpen={isOpen} onClose={onClose} title="Confirmar eliminación">
      <ContextualHelpTip
        title="⚠️ Acción irreversible"
        content="Esta acción no se puede deshacer. Asegúrate de que realmente deseas eliminar este elemento."
        type="warning"
        dismissible={false}
      />

      <div className="flex gap-3 mt-4">
        <button onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        <button onClick={onConfirm} className="btn-danger">
          Eliminar
        </button>
      </div>
    </GenericModal>
  );
}
```

---

## 9. Ayuda Contextual en Listas

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';

function SavedChartsList({ charts }: { charts: any[] }) {
  return (
    <div>
      <h2>Mis Cartas Guardadas</h2>

      {charts.length === 0 && (
        <ContextualHelpTip
          title="📝 Aún no tienes cartas guardadas"
          content="Crea una nueva carta natal y guárdala para acceder rápidamente más tarde. Las cartas guardadas aparecerán aquí."
          type="info"
          dismissible={true}
        />
      )}

      {/* ... lista de cartas */}
    </div>
  );
}
```

---

## 10. Integración con Formularios de Error

```tsx
import { ContextualHelpTip } from '@/components/HelpSystem';

function GeocodeInput({ error }: { error: string | null }) {
  return (
    <div>
      <label>Lugar de nacimiento</label>
      <input type="text" placeholder="Madrid, España" />

      {error && (
        <ContextualHelpTip
          title="Error de geocodificación"
          content={`No se pudo encontrar "${error}". Intenta con el formato "Ciudad, País" o usa coordenadas (ej: 40.41, -3.70)`}
          type="warning"
          dismissible={true}
        />
      )}
    </div>
  );
}
```

---

## 📋 Checklist de Integración

Al agregar ayuda a una nueva página o componente:

- [ ] ¿El botón de ayuda global funciona en esta página?
- [ ] ¿Hay acciones complejas que necesiten un tip contextual?
- [ ] ¿Hay errores comunes que se puedan prevenir con advertencias?
- [ ] ¿Los usuarios nuevos entenderían la funcionalidad sin ayuda?
- [ ] ¿Las capturas de pantalla están actualizadas en `helpContent.ts`?
- [ ] ¿El contenido de ayuda coincide con la UI actual?

---

## 🎨 Buenas Prácticas

### ✅ Hacer:
- Usar tips para información contextual importante
- Hacer tips dismissibles cuando sea apropiado
- Usar el tipo correcto (info/tip/warning)
- Mantener el contenido conciso (1-2 oraciones)
- Actualizar la ayuda cuando cambie la UI

### ❌ Evitar:
- Tips para información obvia
- Demasiados tips en una sola pantalla (máximo 2-3)
- Tips que bloqueen contenido importante
- Contenido de ayuda desactualizado
- Duplicar información que ya está en tooltips

---

## 🔗 Referencias

- **Componentes**: `/components/HelpSystem/`
- **Contenido**: `/data/helpContent.ts`
- **Tipos**: `/types/help.ts`
- **Guía completa**: `/SISTEMA_AYUDA_GUIA.md`

---

**Última actualización**: 2026-01-10
