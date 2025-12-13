#!/bin/bash
# Script de instalación de dependencias para Fraktal Backend
# Ejecutar con: bash install_dependencies.sh

echo "======================================"
echo "  INSTALACION DE DEPENDENCIAS FRAKTAL"
echo "======================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar Python
echo -e "${YELLOW}[1/5] Verificando Python...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✅ Python encontrado: $PYTHON_VERSION${NC}"
    PYTHON=python3
    PIP=pip3
elif command -v python &> /dev/null; then
    PYTHON_VERSION=$(python --version)
    echo -e "${GREEN}✅ Python encontrado: $PYTHON_VERSION${NC}"
    PYTHON=python
    PIP=pip
else
    echo -e "${RED}❌ ERROR: Python no encontrado${NC}"
    echo -e "${RED}   Instala Python desde: https://www.python.org/downloads/${NC}"
    exit 1
fi

# Actualizar pip
echo ""
echo -e "${YELLOW}[2/5] Actualizando pip...${NC}"
$PYTHON -m pip install --upgrade pip -q
echo -e "${GREEN}✅ pip actualizado${NC}"

# Instalar dependencias existentes
echo ""
echo -e "${YELLOW}[3/5] Instalando dependencias existentes...${NC}"
$PIP install -q fastapi uvicorn pydantic motor pymongo dnspython certifi python-jose passlib bcrypt python-multipart python-dotenv
echo -e "${GREEN}✅ Dependencias base instaladas${NC}"

# Instalar nuevas dependencias
echo ""
echo -e "${YELLOW}[4/5] Instalando nuevas dependencias...${NC}"
echo "    - pyswisseph (motor de efemérides)..."
$PIP install -q pyswisseph==2.10.3.2

echo "    - pytz (zonas horarias)..."
$PIP install -q "pytz>=2024.1"

echo "    - reportlab (generación PDF)..."
$PIP install -q "reportlab>=4.0.0"

echo "    - python-docx (generación Word)..."
$PIP install -q "python-docx>=1.1.0"

echo "    - Pillow (procesamiento de imágenes)..."
$PIP install -q "Pillow>=10.0.0"

echo -e "${GREEN}✅ Nuevas dependencias instaladas${NC}"

# Verificar instalación
echo ""
echo -e "${YELLOW}[5/5] Verificando instalación...${NC}"

ALL_INSTALLED=true

# Verificar pyswisseph
if $PYTHON -c "import swisseph as swe; print('✅ pyswisseph:', swe.version)" 2>/dev/null; then
    echo -e "${GREEN}✅ pyswisseph instalado${NC}"
else
    echo -e "${RED}❌ pyswisseph NO instalado${NC}"
    ALL_INSTALLED=false
fi

# Verificar pytz
if $PYTHON -c "import pytz; print('✅ pytz:', len(pytz.all_timezones), 'zonas horarias')" 2>/dev/null; then
    echo -e "${GREEN}✅ pytz instalado${NC}"
else
    echo -e "${RED}❌ pytz NO instalado${NC}"
    ALL_INSTALLED=false
fi

# Verificar reportlab
if $PYTHON -c "from reportlab.pdfgen import canvas; print('✅ reportlab instalado')" 2>/dev/null; then
    echo -e "${GREEN}✅ reportlab instalado${NC}"
else
    echo -e "${YELLOW}⚠️  reportlab NO instalado (opcional)${NC}"
fi

# Verificar python-docx
if $PYTHON -c "from docx import Document; print('✅ python-docx instalado')" 2>/dev/null; then
    echo -e "${GREEN}✅ python-docx instalado${NC}"
else
    echo -e "${YELLOW}⚠️  python-docx NO instalado (opcional)${NC}"
fi

# Verificar Pillow
if $PYTHON -c "from PIL import Image; print('✅ Pillow instalado')" 2>/dev/null; then
    echo -e "${GREEN}✅ Pillow instalado${NC}"
else
    echo -e "${YELLOW}⚠️  Pillow NO instalado (opcional)${NC}"
fi

echo ""
echo "======================================"

if [ "$ALL_INSTALLED" = true ]; then
    echo -e "${GREEN}  ✅ INSTALACION COMPLETADA${NC}"
    echo "======================================"
    echo ""
    echo -e "${GREEN}El sistema Fraktal está listo para usar.${NC}"
    echo ""
    echo -e "${YELLOW}Próximos pasos:${NC}"
    echo "  1. Iniciar el servidor: uvicorn main:app --reload"
    echo "  2. Probar efemérides: curl http://localhost:8000/ephemeris/test"
    echo "  3. Ver documentación: NUEVAS_FUNCIONALIDADES.md"
    echo ""
else
    echo -e "${YELLOW}  ⚠️  INSTALACION INCOMPLETA${NC}"
    echo "======================================"
    echo ""
    echo -e "${YELLOW}Algunas dependencias críticas no se instalaron.${NC}"
    echo "Consulta backend/INSTALL_DEPENDENCIES.md para solución de problemas."
    echo ""
fi

