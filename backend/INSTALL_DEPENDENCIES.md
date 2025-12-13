# 📦 Instalación de Dependencias - Backend Fraktal

## ⚠️ IMPORTANTE

Para que el sistema funcione correctamente, necesitas instalar las nuevas dependencias requeridas para el cálculo de efemérides y generación de informes.

---

## 🚀 Instalación Rápida

### Opción 1: Instalación Automática (Recomendado)

Ejecuta este comando en el directorio `backend/`:

```bash
pip install -r requirements.txt
```

### Opción 2: Instalación Manual

Si prefieres instalar cada paquete individualmente:

```bash
pip install pyswisseph==2.10.3.2
pip install pytz>=2024.1
pip install reportlab>=4.0.0
pip install python-docx>=1.1.0
pip install Pillow>=10.0.0
```

---

## 🔍 Verificar Instalación

Después de instalar, verifica que todo esté correcto:

### Windows (PowerShell):
```powershell
pip list | Select-String -Pattern "pyswisseph|reportlab|docx|pytz|Pillow"
```

### Linux/Mac:
```bash
pip list | grep -E "pyswisseph|reportlab|python-docx|pytz|Pillow"
```

**Salida esperada:**
```
Pillow                    10.x.x
pyswisseph                2.10.3.2
python-docx               1.1.x
pytz                      2024.x
reportlab                 4.x.x
```

---

## 📚 Descripción de Dependencias

### 🔭 pyswisseph (2.10.3.2)
- **Propósito:** Motor de efemérides astronómicas de máxima precisión
- **Uso:** Cálculo de posiciones planetarias
- **Crítico:** ✅ SÍ - Sin esto no funcionan los cálculos

### ⏰ pytz (≥2024.1)
- **Propósito:** Manejo de zonas horarias
- **Uso:** Conversión de hora local a UTC
- **Crítico:** ✅ SÍ - Sin esto las conversiones serán incorrectas

### 📄 reportlab (≥4.0.0)
- **Propósito:** Generación de PDFs
- **Uso:** Exportación de informes en formato PDF
- **Crítico:** ⚠️ NO - PDF no estará disponible pero el resto funcionará

### 📝 python-docx (≥1.1.0)
- **Propósito:** Generación de documentos Word
- **Uso:** Exportación de informes en formato DOCX
- **Crítico:** ⚠️ NO - DOCX no estará disponible pero el resto funcionará

### 🖼️ Pillow (≥10.0.0)
- **Propósito:** Procesamiento de imágenes
- **Uso:** Requerido por ReportLab para imágenes en PDFs
- **Crítico:** ⚠️ NO - Solo necesario si usas PDF con imágenes

---

## 🐛 Solución de Problemas

### Error: "No module named 'swisseph'"

**Causa:** pyswisseph no está instalado  
**Solución:**
```bash
pip install pyswisseph==2.10.3.2
```

Si falla, intenta:
```bash
pip install pyswisseph --no-cache-dir
```

### Error: "No module named 'reportlab'"

**Causa:** ReportLab no está instalado  
**Solución:**
```bash
pip install reportlab Pillow
```

### Error: "Microsoft Visual C++ required"

**Causa:** Windows necesita herramientas de compilación para pyswisseph  
**Solución:**

1. **Opción A:** Instala Microsoft C++ Build Tools
   - Descarga desde: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Instala "Desktop development with C++"

2. **Opción B:** Usa un wheel precompilado
   - Descarga el wheel de: https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyswisseph
   - Instala con: `pip install nombre_del_archivo.whl`

### Error de permisos en Windows

**Causa:** Falta de permisos administrativos  
**Solución:**
```powershell
# Ejecuta PowerShell como Administrador, luego:
pip install -r requirements.txt
```

### Error: "Requirement already satisfied"

**Causa:** Ya está instalado  
**Solución:** No hagas nada, ya está listo ✅

---

## 🧪 Probar la Instalación

Una vez instaladas las dependencias, prueba que todo funcione:

### 1. Probar Swiss Ephemeris

```python
python -c "import swisseph as swe; print('✅ pyswisseph:', swe.version)"
```

### 2. Probar pytz

```python
python -c "import pytz; print('✅ pytz:', len(pytz.all_timezones), 'zonas horarias')"
```

### 3. Probar ReportLab

```python
python -c "from reportlab.pdfgen import canvas; print('✅ ReportLab instalado')"
```

### 4. Probar python-docx

```python
python -c "from docx import Document; print('✅ python-docx instalado')"
```

### 5. Probar todo el sistema

```bash
# Levanta el servidor
uvicorn main:app --reload

# En otro terminal, prueba el endpoint de test
curl http://localhost:8000/ephemeris/test -H "Authorization: Bearer TU_TOKEN"
```

---

## 📝 Entornos Virtuales (Recomendado)

Es buena práctica usar un entorno virtual:

### Crear entorno virtual:

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Desactivar entorno virtual:
```bash
deactivate
```

---

## 🎯 Checklist de Instalación

Marca cada item cuando esté completo:

- [ ] ✅ pyswisseph instalado y funcionando
- [ ] ✅ pytz instalado
- [ ] ✅ reportlab instalado (opcional pero recomendado)
- [ ] ✅ python-docx instalado (opcional pero recomendado)
- [ ] ✅ Pillow instalado (si usas PDF)
- [ ] ✅ Servidor FastAPI arranca sin errores
- [ ] ✅ Endpoint `/ephemeris/test` responde correctamente
- [ ] ✅ Endpoint `/reports/formats` responde correctamente

---

## 📞 Ayuda Adicional

Si después de seguir estos pasos sigues teniendo problemas:

1. Verifica tu versión de Python:
   ```bash
   python --version
   ```
   **Mínimo requerido:** Python 3.8+

2. Actualiza pip:
   ```bash
   python -m pip install --upgrade pip
   ```

3. Revisa los logs del servidor:
   ```bash
   uvicorn main:app --reload --log-level debug
   ```

4. Consulta los archivos de documentación:
   - `NUEVAS_FUNCIONALIDADES.md` - Documentación técnica
   - `GUIA_USUARIO.md` - Guía de usuario
   - `SOLUCION_AUTENTICACION.md` - Problemas de autenticación

---

## ✅ Instalación Completada

Una vez que todo esté instalado y funcionando, podrás:

✅ Calcular efemérides con precisión profesional  
✅ Generar informes en múltiples formatos  
✅ Exportar PDFs, DOCX, HTML y Markdown  
✅ Usar el sistema completo sin limitaciones  

**¡Disfruta del sistema Fraktal mejorado!** 🌟

