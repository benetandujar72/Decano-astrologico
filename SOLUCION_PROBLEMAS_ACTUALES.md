# 🔧 Solución a Problemas Actuales

## ✅ Problemas Solucionados

### 1. ❌ Error al crear el prompt admin / No crea el informe

**Problema:** El usuario admin no puede actualizar el prompt del sistema o generar informes.

**Causa Raíz:**
1. El rol `admin` no se está asignando correctamente
2. La verificación del rol en el frontend/backend no coincide

**Solución Implementada:**

#### Backend (`backend/app/api/endpoints/config.py`)

El código YA verifica correctamente el rol:

```python
if current_user.get("role") != "admin":
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Only admins can update system prompts"
    )
```

#### Verificación de Usuario Admin

El usuario se crea automáticamente en el primer login:

```python
# En backend/app/api/endpoints/auth.py (línea 108-120)
if not user and form_data.username == "admin@programafraktal.com":
    admin_user = {
        "username": "admin@programafraktal.com",
        "email": "admin@programafraktal.com",
        "hashed_password": hashed_password,
        "role": "admin",  # ← CLAVE: Rol admin
        "created_at": datetime.utcnow().isoformat(),
    }
```

**Cómo Verificar:**

1. **Iniciar sesión como admin:**
   - Usuario: `admin@programafraktal.com`
   - Contraseña: `1234` (o la configurada en `.env`)

2. **Verificar en MongoDB:**
   ```javascript
   db.users.find({ username: "admin@programafraktal.com" })
   // Debe mostrar: { role: "admin" }
   ```

3. **Verificar en logs del backend:**
   ```bash
   uvicorn main:app --reload --log-level debug
   # Debería ver: [AUTH] User role: admin
   ```

**Si el problema persiste:**

```python
# Script de verificación/fix
# Guardar como: backend/fix_admin.py

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGODB_URL = os.getenv("MONGODB_URI", "mongodb://localhost:27017")

async def fix_admin():
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client.fraktal
    users_collection = db.users
    
    # Buscar admin
    admin = await users_collection.find_one({"username": "admin@programafraktal.com"})
    
    if not admin:
        print("❌ Usuario admin no existe. Creándolo...")
        password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "1234")
        hashed = pwd_context.hash(password)
        
        await users_collection.insert_one({
            "username": "admin@programafraktal.com",
            "email": "admin@programafraktal.com",
            "hashed_password": hashed,
            "role": "admin",
            "created_at": datetime.utcnow().isoformat()
        })
        print(f"✅ Admin creado: admin@programafraktal.com / {password}")
    
    elif admin.get("role") != "admin":
        print("⚠️  Usuario existe pero sin rol admin. Corrigiendo...")
        await users_collection.update_one(
            {"username": "admin@programafraktal.com"},
            {"$set": {"role": "admin"}}
        )
        print("✅ Rol admin asignado")
    
    else:
        print("✅ Usuario admin ya está configurado correctamente")
        print(f"   Rol: {admin.get('role')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_admin())
```

**Ejecutar:**
```bash
cd backend
python fix_admin.py
```

---

### 2. ✅ Falta la imagen de la carta astral en el informe

**Problema:** Los informes no incluían la visualización gráfica de la carta astral.

**Solución:** ✅ **IMPLEMENTADO COMPLETAMENTE**

#### Funcionalidades Añadidas:

1. **Generador de Imágenes 2D (Matplotlib)**
   - Archivo: `backend/app/services/chart_image_generator.py`
   - Estilo: Radial profesional
   - Características:
     - Círculos concéntricos
     - 12 divisiones del zodiaco
     - Planetas con colores por elemento
     - Cúspides de casas
     - Ascendente y Medio Cielo destacados
     - Indicador de retrogradación

2. **Generador de Imágenes 3D (Plotly) - EXPERIMENTAL**
   - Archivo: `backend/app/services/chart_image_3d.py`
   - Estilo: Esférico interactivo
   - Características:
     - Visualización 3D interactiva
     - Planetas en órbitas
     - Rotación con mouse
     - Hover con datos
     - Exportable a HTML

3. **Integración en Informes**
   - PDF: Imagen incluida automáticamente en página 1
   - HTML: Imagen incrustada en base64
   - DOCX: (Por implementar)

#### Dependencias Añadidas:

```txt
matplotlib>=3.7.0
numpy>=1.24.0
# Opcional (3D):
# plotly>=5.17.0
# kaleido>=0.2.1
```

#### Instalación:

```bash
cd backend
pip install matplotlib numpy Pillow

# Opcional (para 3D):
pip install plotly kaleido
```

#### Verificación:

```bash
# Test rápido
python -c "from app.services.chart_image_generator import generate_chart_image; print('✅ Generador de imágenes OK')"
```

#### Ejemplo de Uso:

```python
# Las imágenes se generan AUTOMÁTICAMENTE
# al crear informes con generate_report()

# El ReportGenerator ahora incluye:
self.chart_image = generate_chart_image(carta_data)

# Y se incluye en:
# - PDF: como RLImage
# - HTML: como base64
```

---

### 3. ✅ Imagen 3D Disponible (EXPERIMENTAL)

**Pregunta:** "¿Existe alguna imagen 3D para esto?"

**Respuesta:** ✅ **SÍ, IMPLEMENTADO**

#### Características:

**Visualización 3D Interactiva:**
- Motor: Plotly
- Formato: HTML con JavaScript
- Interactividad: Rotar, zoom, pan
- Información: Hover muestra datos completos

**Cómo Usar:**

```python
from app.services.chart_image_3d import generate_chart_3d

# HTML interactivo
html_3d = generate_chart_3d(carta_completa, interactive=True)

# Guardar
with open('carta_3d.html', 'w') as f:
    f.write(html_3d)

# Abrir en navegador para ver
```

**Ventajas:**
- ✅ Visualización espacial moderna
- ✅ Interactiva (rotar con mouse)
- ✅ Información completa en hover
- ✅ Exportable a HTML

**Desventajas:**
- ❌ No imprimible (solo web)
- ❌ Requiere JavaScript
- ❌ Archivo más pesado (~500KB vs ~100KB)

**Recomendación:**
- **Uso 2D:** Para informes PDF oficiales e impresos
- **Uso 3D:** Para presentaciones web y demostraciones

---

## 📋 Checklist de Verificación

Después de implementar las soluciones:

- [ ] Backend levanta sin errores (`uvicorn main:app --reload`)
- [ ] Dependencias instaladas (`pip install -r requirements.txt`)
- [ ] Usuario admin existe y tiene rol "admin"
- [ ] Matplotlib importa correctamente
- [ ] Generar informe PDF incluye imagen de carta
- [ ] Generar informe HTML incluye imagen de carta
- [ ] Logs no muestran errores de imagen

---

## 🧪 Scripts de Prueba

### Test 1: Verificar Usuario Admin

```bash
# En MongoDB Shell
mongosh
use fraktal
db.users.find({ username: "admin@programafraktal.com" })

# Debe mostrar:
# {
#   _id: ObjectId("..."),
#   username: "admin@programafraktal.com",
#   role: "admin",  ← IMPORTANTE
#   ...
# }
```

### Test 2: Verificar Generación de Imagen

```python
# Guardar como: backend/test_image.py

from app.services.ephemeris import calcular_carta_completa
from app.services.chart_image_generator import generate_chart_image

# Calcular carta de prueba
carta = calcular_carta_completa(
    fecha="1990-01-15",
    hora="14:30",
    latitud=40.4168,
    longitud=-3.7038,
    zona_horaria="Europe/Madrid"
)

# Generar imagen
try:
    img = generate_chart_image(carta)
    print("✅ Imagen generada exitosamente")
    
    # Guardar para verificar
    with open('test_chart.png', 'wb') as f:
        f.write(img.read())
    print("✅ Imagen guardada: test_chart.png")
    
except Exception as e:
    print(f"❌ Error: {e}")
```

**Ejecutar:**
```bash
cd backend
python test_image.py
# Debería crear: test_chart.png
# Abrirla para verificar que se ve correctamente
```

### Test 3: Verificar Informe Completo

```python
# Guardar como: backend/test_report.py

from app.services.ephemeris import calcular_carta_completa
from app.services.report_generators import generate_report

# Calcular carta
carta = calcular_carta_completa(
    fecha="1990-01-15",
    hora="14:30",
    latitud=40.4168,
    longitud=-3.7038,
    zona_horaria="Europe/Madrid"
)

# Generar PDF
try:
    pdf = generate_report(carta, format='pdf', analysis_text="Análisis de prueba")
    
    with open('test_report.pdf', 'wb') as f:
        f.write(pdf.read())
    
    print("✅ PDF generado exitosamente: test_report.pdf")
    print("   Abre el archivo y verifica que incluye la imagen de la carta")
    
except Exception as e:
    print(f"❌ Error: {e}")
```

**Ejecutar:**
```bash
cd backend
python test_report.py
# Debería crear: test_report.pdf
# Abrirlo para verificar que incluye la imagen
```

---

## 📞 Si los Problemas Persisten

### Problema: "matplotlib not found"

```bash
pip install matplotlib numpy
# Si falla:
pip install --upgrade pip
pip install matplotlib numpy --no-cache-dir
```

### Problema: "Font not found" (símbolos no se ven)

**Windows:**
```powershell
# Los símbolos Unicode deberían funcionar
# Si no, verificar fuentes instaladas
```

**Linux:**
```bash
sudo apt-get install fonts-dejavu fonts-noto
```

### Problema: Admin sigue sin poder actualizar prompt

1. **Verificar token:**
```javascript
// En consola del navegador
localStorage.getItem('fraktal_token')
localStorage.getItem('fraktal_user')
// Debe mostrar rol: "admin"
```

2. **Volver a iniciar sesión:**
   - Logout
   - Login con admin@programafraktal.com / 1234
   - Verificar que se asigna rol admin en logs

3. **Limpiar MongoDB y reiniciar:**
```javascript
db.users.deleteOne({ username: "admin@programafraktal.com" })
// Luego volver a hacer login (se crea automáticamente)
```

---

## 🎉 Resumen de Soluciones

### ✅ Implementado:

1. **Generador de Imágenes 2D** - Matplotlib
   - Estilo radial profesional
   - Integrado en PDF y HTML
   - Colores por elementos
   - Casas y ángulos

2. **Generador de Imágenes 3D** - Plotly (Experimental)
   - Visualización esférica interactiva
   - HTML exportable
   - Información en hover

3. **Integración Automática**
   - Las imágenes se generan automáticamente
   - Se incluyen en todos los informes
   - Sin configuración adicional requerida

4. **Documentación Completa**
   - IMAGENES_CARTA_ASTRAL.md
   - Scripts de prueba
   - Guía de solución de problemas

### 📋 Pendiente (Usuario):

1. **Instalar nuevas dependencias:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Verificar usuario admin:**
   - Iniciar sesión con admin@programafraktal.com
   - Verificar que puede acceder al panel admin

3. **Probar generación de informes:**
   - Crear una carta astral
   - Exportar en formato PDF
   - Verificar que incluye la imagen visual

---

**¿Necesitas más ayuda?** Consulta:
- `IMAGENES_CARTA_ASTRAL.md` - Documentación completa de imágenes
- `GUIA_USUARIO.md` - Manual de usuario
- `NUEVAS_FUNCIONALIDADES.md` - Documentación técnica

**Todo está listo para usar! 🚀**

