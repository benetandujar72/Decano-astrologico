# Scripts de Inicialización - Decano Astrológico

## 📁 seed_customization_data.py

Script para poblar MongoDB con datos iniciales del sistema de personalización.

### ¿Cuándo Usar Este Script?

Usa este script cuando:
- Acabas de instalar el sistema por primera vez
- El frontend muestra "Error al cargar plantillas" o "Error al cargar prompts"
- Las colecciones de MongoDB están vacías
- Quieres resetear los datos a valores por defecto

### ¿Qué Datos Crea?

#### 1. Plantillas (3 plantillas públicas)
- **Plantilla por Defecto**: Configuración estándar del sistema
- **Estilo Profesional**: Diseño elegante para consultores
- **Estilo Místico**: Colores y tipografía evocadora

#### 2. Prompts Especializados (4 prompts)
- **Sol en Signos**: Análisis de identidad y propósito
- **Luna en Signos**: Análisis emocional y necesidades
- **Aspectos**: Dinámicas internas entre planetas
- **Casas**: Áreas de experiencia vital

#### 3. Tipos de Informe (5 tipos)
- **Carta Natal Resumida** (Free, Premium, Enterprise)
- **Carta Natal Completa** (Premium, Enterprise)
- **Sinastría de Relación** (Premium, Enterprise)
- **Revolución Solar** (Premium, Enterprise)
- **Tránsitos Actuales** (Enterprise) - Inactivo

---

## 🚀 Cómo Ejecutar

### Opción 1: Desde el directorio backend

```bash
cd backend
python scripts/seed_customization_data.py
```

### Opción 2: Desde el directorio raíz

```bash
python backend/scripts/seed_customization_data.py
```

### Opción 3: Con Python explícito

```bash
python3 backend/scripts/seed_customization_data.py
```

---

## 📋 Proceso de Ejecución

El script te guiará interactivamente:

```
====================================================================
  SEED SCRIPT - SISTEMA DE PERSONALIZACIÓN DECANO ASTROLÓGICO
====================================================================

Este script poblará MongoDB con datos iniciales:
  • 3 plantillas (Defecto, Profesional, Místico)
  • 4 prompts especializados (Sol, Luna, Aspectos, Casas)
  • 5 tipos de informe (Resumida, Completa, Sinastría, etc.)

====================================================================

🔌 Verificando conexión a MongoDB...
   ✓ Conectado exitosamente a: decano_db

📋 Creando plantillas iniciales...
   ℹ️  Ya existen 0 plantillas.
   ✓ 3 plantillas creadas exitosamente
      • Plantilla por Defecto (ID: 507f1f77bcf86cd799439011)
      • Estilo Profesional (ID: 507f191e810c19729de860ea)
      • Estilo Místico (ID: 507f191e810c19729de860eb)

💬 Creando prompts especializados...
   ✓ 4 prompts creados exitosamente
      • Prompt Sol en Signos - Detallado (Tipo: modulo_1_sol)
      • Prompt Luna en Signos - Emocional (Tipo: modulo_3_luna)
      • Prompt Aspectos - Dinámicas Internas (Tipo: modulo_5_aspectos)
      • Prompt Casas - Áreas de Experiencia (Tipo: modulo_4_casas)

📊 Creando tipos de informes...
   ✓ 5 tipos de informe creados exitosamente
      • Carta Natal Resumida [✓ Activo] (Planes: free, premium, enterprise)
      • Carta Natal Completa [✓ Activo] (Planes: premium, enterprise)
      • Sinastría de Relación [✓ Activo] (Planes: premium, enterprise)
      • Revolución Solar [✓ Activo] (Planes: premium, enterprise)
      • Tránsitos Actuales [⚠️ Inactivo] (Planes: enterprise)

🔍 Verificando datos creados...

   ✓ Plantillas: 3
   ✓ Prompts especializados: 4
   ✓ Tipos de informe: 5

✅ Base de datos poblada exitosamente!

Próximos pasos:
1. Reinicia el backend: Ctrl+C y vuelve a ejecutar 'python -m uvicorn app.main:app'
2. Recarga el frontend (F5)
3. Abre el panel de Diseño (botón 'Diseño' en la barra superior)
4. Deberías ver las plantillas y prompts disponibles
```

---

## ⚙️ Requisitos Previos

### 1. Variables de Entorno

Asegúrate de tener configurado en tu archivo `.env`:

```bash
# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=decano_db

# O si usas MongoDB Atlas
MONGODB_URL=mongodb+srv://usuario:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=decano_production
```

### 2. MongoDB Ejecutándose

El script requiere que MongoDB esté activo:

```bash
# Verificar si MongoDB está corriendo
# Linux/Mac:
sudo systemctl status mongod

# Windows:
net start MongoDB

# O con Docker:
docker ps | grep mongo
```

### 3. Dependencias de Python

```bash
pip install motor pymongo python-dotenv
```

---

## 🔄 Resetear Datos Existentes

Si ya tienes datos y quieres empezar de cero, el script te preguntará:

```
📋 Creando plantillas iniciales...
   ℹ️  Ya existen 5 plantillas. ¿Deseas eliminarlas? (s/n): s
   ✓ Plantillas anteriores eliminadas
   ✓ 3 plantillas creadas exitosamente
```

**IMPORTANTE:** Esto eliminará TODAS las plantillas/prompts/tipos de informe existentes, incluyendo los personalizados de los usuarios.

---

## ❌ Solución de Problemas

### Error: "No module named 'app.core.config'"

**Causa:** Ejecutando desde directorio incorrecto

**Solución:**
```bash
cd backend
python scripts/seed_customization_data.py
```

### Error: "ServerSelectionTimeoutError: localhost:27017"

**Causa:** MongoDB no está ejecutándose o la URL es incorrecta

**Soluciones:**
1. Inicia MongoDB:
   ```bash
   # Linux/Mac
   sudo systemctl start mongod

   # Windows
   net start MongoDB

   # Docker
   docker start mongodb-container
   ```

2. Verifica la variable `MONGODB_URL` en `.env`

### Error: "OperationFailure: not authorized"

**Causa:** Credenciales de MongoDB incorrectas

**Solución:**
```bash
# En .env
MONGODB_URL=mongodb://admin:password@localhost:27017/decano_db?authSource=admin
```

### Las plantillas se crearon pero no aparecen en el frontend

**Posibles causas:**
1. Backend no reiniciado después del seed
2. Frontend en caché
3. Usuario sin permisos

**Soluciones:**
```bash
# 1. Reinicia el backend
Ctrl+C en la terminal del backend
python -m uvicorn app.main:app --reload

# 2. Limpia caché del navegador
Ctrl+Shift+R (Chrome/Firefox)

# 3. Verifica en MongoDB directamente
mongosh
use decano_db
db.templates.find().pretty()
```

---

## 🗑️ Eliminar Datos Manualmente

Si necesitas eliminar datos sin el script:

### Desde MongoDB Shell (mongosh)

```javascript
// Conectar
use decano_db

// Eliminar plantillas
db.templates.deleteMany({})

// Eliminar prompts
db.specialized_prompts.deleteMany({})

// Eliminar tipos de informe
db.report_types.deleteMany({})

// Verificar
db.templates.countDocuments()
db.specialized_prompts.countDocuments()
db.report_types.countDocuments()
```

### Desde Python

```python
from motor.motor_asyncio import AsyncIOMotorClient

client = AsyncIOMotorClient("mongodb://localhost:27017")
db = client["decano_db"]

# Eliminar todo
await db["templates"].delete_many({})
await db["specialized_prompts"].delete_many({})
await db["report_types"].delete_many({})
```

---

## 📊 Verificar Datos Creados

### Desde MongoDB Compass (GUI)

1. Abre MongoDB Compass
2. Conecta a `mongodb://localhost:27017`
3. Selecciona base de datos `decano_db`
4. Verifica colecciones:
   - `templates` → 3 documentos
   - `specialized_prompts` → 4 documentos
   - `report_types` → 5 documentos

### Desde API (con curl)

```bash
# Obtener plantillas
curl -X GET http://localhost:8000/templates \
  -H "Authorization: Bearer YOUR_TOKEN"

# Obtener prompts
curl -X GET http://localhost:8000/config/prompts/specialized \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Desde Frontend

1. Inicia sesión en la aplicación
2. Haz clic en el botón "Diseño" (icono de pintura)
3. Ve a la pestaña "Plantillas"
4. Deberías ver:
   - Plantilla por Defecto
   - Estilo Profesional
   - Estilo Místico

---

## 🎯 Próximos Pasos Después del Seed

1. **Probar Clonación de Plantilla**
   - Abre panel de Diseño → Plantillas
   - Haz clic en "Clonar" en "Plantilla por Defecto"
   - Edita colores/tipografía
   - Guarda como tu plantilla personalizada

2. **Activar un Prompt Personalizado**
   - Ve a Diseño → Prompts
   - Selecciona "Prompt Sol en Signos - Detallado"
   - Haz clic en "Usar este prompt"
   - Genera un informe para ver la diferencia

3. **Crear Nueva Plantilla (Solo Premium/Enterprise)**
   - Diseño → Plantillas → Crear Nueva
   - Configura branding, colores, tipografía
   - Guarda y úsala en tu próximo informe

4. **Verificar Límites por Plan**
   - Free: No puede crear plantillas (solo usar públicas)
   - Premium: Puede crear hasta 5 plantillas
   - Enterprise: Plantillas ilimitadas + CSS personalizado

---

## 📚 Referencias

- [GUIA_CONFIGURACION_PERSONALIZACION.md](../GUIA_CONFIGURACION_PERSONALIZACION.md) - Guía completa del sistema
- [backend/app/api/endpoints/report_templates.py](../app/api/endpoints/report_templates.py) - API de plantillas
- [backend/app/api/endpoints/config.py](../app/api/endpoints/config.py) - API de configuración
- [react-src/components/Customization/](../../react-src/components/Customization/) - Componentes frontend

---

## 🛠️ Personalización del Script

### Añadir Más Plantillas

Edita `seed_customization_data.py` en la función `seed_templates()`:

```python
templates = [
    # ... plantillas existentes ...
    {
        "_id": ObjectId(),
        "name": "Mi Plantilla Custom",
        "description": "Descripción personalizada",
        "is_public": True,
        "is_default": False,
        "created_by": "system",
        "branding": {
            "primary_color": "#FF5733",
            "secondary_color": "#C70039",
            # ... resto de configuración
        },
        # ... resto de la plantilla
    }
]
```

### Añadir Más Prompts

Edita en la función `seed_specialized_prompts()`:

```python
prompts = [
    # ... prompts existentes ...
    {
        "_id": ObjectId(),
        "name": "Mi Prompt Custom",
        "description": "Descripción",
        "prompt_type": "modulo_custom",
        "content": """Tu prompt aquí...""",
        # ... resto de configuración
    }
]
```

---

## 📝 Notas Importantes

1. **Ejecución Múltiple:** Puedes ejecutar el script varias veces. Te preguntará si quieres sobrescribir datos existentes.

2. **Backup:** Si tienes datos importantes, haz backup antes:
   ```bash
   mongodump --db decano_db --out backup_$(date +%Y%m%d)
   ```

3. **Restaurar Backup:**
   ```bash
   mongorestore --db decano_db backup_20260112/decano_db
   ```

4. **Producción:** En producción, usa el script solo en la configuración inicial. Los usuarios crearán sus propias plantillas después.
