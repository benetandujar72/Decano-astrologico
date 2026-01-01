# Usar Python 3.11 oficial
FROM python:3.11.9-slim

# Directorio de trabajo
WORKDIR /app

# Copiar requirements
COPY requirements.txt .

# Instalar dependencias
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código (incluye backend/documentacion)
COPY . .

# Exponer puerto
EXPOSE 8000

# Comando de inicio (Render suele inyectar $PORT)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
