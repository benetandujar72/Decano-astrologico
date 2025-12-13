# Script de instalación de dependencias para Fraktal Backend
# Ejecutar con: .\install_dependencies.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  INSTALACION DE DEPENDENCIAS FRAKTAL" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Verificar Python
Write-Host "[1/5] Verificando Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Python no encontrado" -ForegroundColor Red
    Write-Host "   Instala Python desde: https://www.python.org/downloads/" -ForegroundColor Red
    exit 1
}

# Actualizar pip
Write-Host ""
Write-Host "[2/5] Actualizando pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip --quiet
Write-Host "✅ pip actualizado" -ForegroundColor Green

# Instalar dependencias existentes
Write-Host ""
Write-Host "[3/5] Instalando dependencias existentes..." -ForegroundColor Yellow
pip install -q fastapi uvicorn pydantic motor pymongo dnspython certifi python-jose passlib bcrypt python-multipart python-dotenv
Write-Host "✅ Dependencias base instaladas" -ForegroundColor Green

# Instalar nuevas dependencias
Write-Host ""
Write-Host "[4/5] Instalando nuevas dependencias..." -ForegroundColor Yellow
Write-Host "    - pyswisseph (motor de efemérides)..." -ForegroundColor Gray
pip install -q pyswisseph==2.10.3.2

Write-Host "    - pytz (zonas horarias)..." -ForegroundColor Gray
pip install -q "pytz>=2024.1"

Write-Host "    - reportlab (generación PDF)..." -ForegroundColor Gray
pip install -q "reportlab>=4.0.0"

Write-Host "    - python-docx (generación Word)..." -ForegroundColor Gray
pip install -q "python-docx>=1.1.0"

Write-Host "    - Pillow (procesamiento de imágenes)..." -ForegroundColor Gray
pip install -q "Pillow>=10.0.0"

Write-Host "✅ Nuevas dependencias instaladas" -ForegroundColor Green

# Verificar instalación
Write-Host ""
Write-Host "[5/5] Verificando instalación..." -ForegroundColor Yellow

$allInstalled = $true

# Verificar pyswisseph
try {
    python -c "import swisseph as swe; print('✅ pyswisseph:', swe.version)" 2>&1 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "❌ pyswisseph NO instalado" -ForegroundColor Red
    $allInstalled = $false
}

# Verificar pytz
try {
    python -c "import pytz; print('✅ pytz:', len(pytz.all_timezones), 'zonas horarias')" 2>&1 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "❌ pytz NO instalado" -ForegroundColor Red
    $allInstalled = $false
}

# Verificar reportlab
try {
    python -c "from reportlab.pdfgen import canvas; print('✅ reportlab instalado')" 2>&1 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "⚠️  reportlab NO instalado (opcional)" -ForegroundColor Yellow
}

# Verificar python-docx
try {
    python -c "from docx import Document; print('✅ python-docx instalado')" 2>&1 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "⚠️  python-docx NO instalado (opcional)" -ForegroundColor Yellow
}

# Verificar Pillow
try {
    python -c "from PIL import Image; print('✅ Pillow instalado')" 2>&1 | Write-Host -ForegroundColor Green
} catch {
    Write-Host "⚠️  Pillow NO instalado (opcional)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan

if ($allInstalled) {
    Write-Host "  ✅ INSTALACION COMPLETADA" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "El sistema Fraktal está listo para usar." -ForegroundColor Green
    Write-Host ""
    Write-Host "Próximos pasos:" -ForegroundColor Yellow
    Write-Host "  1. Iniciar el servidor: uvicorn main:app --reload" -ForegroundColor White
    Write-Host "  2. Probar efemérides: curl http://localhost:8000/ephemeris/test" -ForegroundColor White
    Write-Host "  3. Ver documentación: NUEVAS_FUNCIONALIDADES.md" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "  ⚠️  INSTALACION INCOMPLETA" -ForegroundColor Yellow
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Algunas dependencias críticas no se instalaron." -ForegroundColor Yellow
    Write-Host "Consulta backend/INSTALL_DEPENDENCIES.md para solución de problemas." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Presiona cualquier tecla para salir..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

