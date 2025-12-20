# 📋 Documento de Testeo de Funcionalidades - FRAKTAL

**Fecha de creación:** 2025-01-14  
**Versión:** 3.0  
**Responsable:** Equipo de Desarrollo

---

## 🎯 Objetivo

Este documento sirve como checklist completo para verificar el correcto funcionamiento de todas las funcionalidades de la aplicación FRAKTAL, con especial énfasis en la **precisión de efemérides y aspectos astrológicos**.

---

## 📊 ÍNDICE

1. [Autenticación y Usuarios](#1-autenticación-y-usuarios)
2. [Sistema de Suscripciones](#2-sistema-de-suscripciones)
3. [Geocodificación](#3-geocodificación)
4. [Cálculo de Efemérides (CRÍTICO)](#4-cálculo-de-efemérides-crítico)
5. [Cálculo de Aspectos Astrológicos (CRÍTICO)](#5-cálculo-de-aspectos-astrológicos-crítico)
6. [Generación de Cartas Astrales](#6-generación-de-cartas-astrales)
7. [Análisis con IA (Gemini)](#7-análisis-con-ia-gemini)
8. [Exportación de Informes](#8-exportación-de-informes)
9. [Interfaz de Usuario](#9-interfaz-de-usuario)
10. [Integraciones Externas](#10-integraciones-externas)

---

## 1. Autenticación y Usuarios

### 1.1 Registro de Usuarios
- [ ] El usuario puede registrarse con username y password
- [ ] Se valida que el username no esté duplicado
- [ ] Después del registro, se muestra la pantalla de planes de suscripción
- [ ] El usuario nuevo queda con plan FREE por defecto
- [ ] Se crea el token de autenticación correctamente

### 1.2 Login
- [ ] El usuario puede iniciar sesión con sus credenciales
- [ ] El token se guarda en localStorage
- [ ] La sesión persiste al recargar la página
- [ ] Se muestra el rol del usuario (admin/user) correctamente

### 1.3 Logout
- [ ] El botón de logout funciona correctamente
- [ ] Se limpia el token y datos del usuario
- [ ] Se redirige a la pantalla de login

### 1.4 Perfil de Usuario
- [ ] Se puede acceder al perfil desde el icono de usuario
- [ ] Se muestran los datos de suscripción actual
- [ ] Se muestran las estadísticas de uso (cartas creadas, límites)
- [ ] Se puede cambiar de plan desde el perfil

---

## 2. Sistema de Suscripciones

### 2.1 Planes Disponibles
- [ ] Se muestran los 4 planes: FREE, PRO, PREMIUM, ENTERPRISE
- [ ] Los precios se muestran correctamente (mensual/anual)
- [ ] Las características de cada plan son visibles

### 2.2 Restricciones por Plan
- [ ] Plan FREE: máximo 5 cartas, solo exportación HTML
- [ ] Plan PRO: cartas ilimitadas, exportación PDF/DOCX/HTML
- [ ] Plan PREMIUM: todo PRO + prompts personalizados
- [ ] Plan ENTERPRISE: todo ilimitado

### 2.3 Cambio de Plan
- [ ] El usuario puede cambiar de plan desde el perfil
- [ ] Se redirige a Stripe Checkout correctamente
- [ ] Después del pago, se actualiza el plan del usuario
- [ ] Las restricciones se aplican inmediatamente

### 2.4 Límites de Uso
- [ ] Se verifica el límite de cartas antes de crear una nueva
- [ ] Se muestra mensaje de error si se excede el límite
- [ ] Se bloquea la exportación PDF/DOCX si no tiene plan PRO+

---

## 3. Geocodificación

### 3.1 Búsqueda por Texto
- [ ] Se puede introducir un lugar en texto (ej: "Madrid, España")
- [ ] Se geocodifica correctamente usando Google Geocoding API
- [ ] Se devuelven coordenadas (latitud, longitud) correctas
- [ ] Se detecta automáticamente la zona horaria (timezone)

### 3.2 Búsqueda por Coordenadas
- [ ] Se puede introducir coordenadas directamente (ej: "40.41, -3.70")
- [ ] Se parsean correctamente las coordenadas
- [ ] Se detecta la zona horaria desde las coordenadas

### 3.3 Autocompletado
- [ ] Aparecen sugerencias al escribir (mínimo 3 caracteres)
- [ ] Las sugerencias muestran el nombre completo del lugar
- [ ] Al seleccionar una sugerencia, se completa el campo

### 3.4 Manejo de Errores
- [ ] Si no se encuentra el lugar, se muestra mensaje de error claro
- [ ] Se sugiere agregar el país (ej: ", España")
- [ ] Se permite usar coordenadas como alternativa

---

## 4. Cálculo de Efemérides (CRÍTICO) ⭐

### 4.1 Precisión de Cálculos
- [ ] Se usa Swiss Ephemeris para los cálculos
- [ ] Las posiciones planetarias tienen precisión de segundos de arco
- [ ] Los cálculos son topocéntricos (corregidos por ubicación geográfica)

### 4.2 Planetas Calculados
- [ ] **Sol**: Posición correcta en grados, minutos, segundos
- [ ] **Luna**: Posición correcta con fase y velocidad
- [ ] **Mercurio**: Posición y estado de retrogradación correctos
- [ ] **Venus**: Posición y estado de retrogradación correctos
- [ ] **Marte**: Posición y estado de retrogradación correctos
- [ ] **Júpiter**: Posición y estado de retrogradación correctos
- [ ] **Saturno**: Posición y estado de retrogradación correctos
- [ ] **Urano**: Posición y estado de retrogradación correctos
- [ ] **Neptuno**: Posición y estado de retrogradación correctos
- [ ] **Plutón**: Posición y estado de retrogradación correctos
- [ ] **Quirón**: Posición correcta
- [ ] **Lilith Media**: Posición correcta
- [ ] **Nodo Norte**: Posición correcta (verdadero)

### 4.3 Verificación de Datos de Prueba
**Caso de prueba:** 11 de Agosto de 1932, 17:00, Morón de la Frontera (37.1215°N, 5.4560°W)

- [ ] Sol en Leo (aproximadamente 18°-19°)
- [ ] Luna en posición correcta según fecha/hora
- [ ] Ascendente calculado correctamente para la ubicación
- [ ] Medio Cielo (MC) calculado correctamente
- [ ] Todas las posiciones coinciden con efemérides de referencia

### 4.4 Casas Astrológicas
- [ ] Sistema de casas: **Placidus** (verificar)
- [ ] Ascendente (Casa 1) calculado correctamente
- [ ] Medio Cielo (Casa 10) calculado correctamente
- [ ] Las 12 cúspides de casas están correctas
- [ ] Los planetas se asignan a las casas correctas

### 4.5 Parte de Fortuna
- [ ] Se calcula la Parte de Fortuna correctamente
- [ ] Se usa la fórmula diurna/nocturna según hora de nacimiento
- [ ] La posición está en el signo y grado correctos

### 4.6 Conversión de Tiempo
- [ ] Se convierte correctamente la hora local a UTC
- [ ] Se detecta automáticamente la zona horaria desde coordenadas
- [ ] Se calcula correctamente el Julian Day (JD)
- [ ] Se aplica la corrección Delta T

### 4.7 Retrogradación
- [ ] Se detecta correctamente cuando un planeta está retrógrado
- [ ] Se marca con "R" en la posición
- [ ] La velocidad planetaria se calcula correctamente

---

## 5. Cálculo de Aspectos Astrológicos (CRÍTICO) ⭐

### 5.1 Matriz de Orbes (Según CORE CARUTTI v3.0)

#### 5.1.1 Luminares (Sol/Luna)
- [ ] **Conjunción**: Orbe de 10°
- [ ] **Oposición**: Orbe de 10°
- [ ] **Cuadratura**: Orbe de 10°
- [ ] **Trígono**: Orbe de 8°
- [ ] **Sextil**: Orbe de 8°
- [ ] **Aspectos menores**: Orbe de 3°

#### 5.1.2 Planetas Personales (Mercurio, Venus, Marte)
- [ ] **Conjunción**: Orbe de 8°
- [ ] **Oposición**: Orbe de 8°
- [ ] **Cuadratura**: Orbe de 8°
- [ ] **Trígono**: Orbe de 6°
- [ ] **Sextil**: Orbe de 6°
- [ ] **Aspectos menores**: Orbe de 2°

#### 5.1.3 Planetas Sociales (Júpiter, Saturno)
- [ ] **Conjunción**: Orbe de 6°
- [ ] **Oposición**: Orbe de 6°
- [ ] **Cuadratura**: Orbe de 6°
- [ ] **Trígono**: Orbe de 5°
- [ ] **Sextil**: Orbe de 5°
- [ ] **Aspectos menores**: Orbe de 2°

#### 5.1.4 Planetas Transpersonales (Urano, Neptuno, Plutón)
- [ ] **Conjunción**: Orbe de 5°
- [ ] **Oposición**: Orbe de 5°
- [ ] **Cuadratura**: Orbe de 5°
- [ ] **Trígono**: Orbe de 4°
- [ ] **Sextil**: Orbe de 4°
- [ ] **Aspectos menores**: Orbe de 2°

#### 5.1.5 Cúspides de Casas
- [ ] **Casas angulares (1, 4, 7, 10)**: Orbe de 4°
- [ ] **Resto de casas**: Orbe de 2°

### 5.2 Validación de Aspectos
- [ ] Si un aspecto excede el orbe, **NO se considera** (regla estricta)
- [ ] Se calculan todos los aspectos entre todos los planetas
- [ ] Se incluyen aspectos a cúspides de casas
- [ ] Se marcan aspectos aplicativos vs separativos

### 5.3 Tipos de Aspectos Calculados
- [ ] **Conjunción** (0°)
- [ ] **Oposición** (180°)
- [ ] **Trígono** (120°)
- [ ] **Cuadratura** (90°)
- [ ] **Sextil** (60°)
- [ ] **Quincuncio** (150°)
- [ ] **Semisextil** (30°)
- [ ] **Semicuadratura** (45°)
- [ ] **Sesquicuadratura** (135°)

### 5.4 Configuraciones Maestras
- [ ] Se detectan **Stelliums** (3+ planetas en mismo signo/casa)
- [ ] Se detectan **T-Cuadradas** (2 planetas en oposición, 1 en cuadratura)
- [ ] Se detectan **Grandes Trígonos** (3 planetas en trígono)
- [ ] Se detectan **Yods** (2 sextiles + 1 quincuncio)

### 5.5 Verificación de Aspectos con Datos de Prueba
**Caso:** Verificar aspectos conocidos en carta de prueba

- [ ] Aspectos mayores se detectan correctamente
- [ ] Los orbes se aplican correctamente según tipo de planeta
- [ ] No se detectan aspectos que excedan el orbe permitido
- [ ] Los aspectos a cúspides se calculan con orbes correctos

---

## 6. Generación de Cartas Astrales

### 6.1 Entrada de Datos
- [ ] Se puede introducir nombre del consultante
- [ ] Se puede introducir fecha de nacimiento (formato YYYY-MM-DD)
- [ ] Se puede introducir hora de nacimiento (formato HH:MM)
- [ ] Se puede introducir lugar de nacimiento (texto o coordenadas)
- [ ] Se puede agregar contexto adicional (opcional)

### 6.2 Cálculo de Carta
- [ ] Al enviar el formulario, se calcula la carta completa
- [ ] Se muestra indicador de carga durante el cálculo
- [ ] Se muestra la carta visual (gráfico circular)
- [ ] Se muestra la tabla de posiciones planetarias
- [ ] Se muestran las casas astrológicas

### 6.3 Visualización
- [ ] El gráfico de la carta se renderiza correctamente
- [ ] Los planetas aparecen en sus posiciones correctas
- [ ] Los signos zodiacales están correctamente etiquetados
- [ ] Las casas están numeradas correctamente
- [ ] Los aspectos se muestran como líneas en el gráfico

### 6.4 Guardado de Cartas
- [ ] Se puede guardar la carta en la base de datos
- [ ] Se respeta el límite de cartas según el plan
- [ ] Se puede acceder a las cartas guardadas desde "Mis Cartas"
- [ ] Se puede eliminar una carta guardada

---

## 7. Análisis con IA (Gemini)

### 7.1 Generación de Análisis
- [ ] Se genera el análisis usando Gemini API
- [ ] Se usa el prompt del sistema (CORE CARUTTI v3.0)
- [ ] El análisis se estructura en bloques según los 4 módulos
- [ ] Se incluye cita final (footerQuote)

### 7.2 Estructura del Análisis
- [ ] **Módulo 1**: Estructura Energética Base (Elementos, Modalidades, Tensión Vital)
- [ ] **Módulo 2**: Análisis Planetario Profundo (cada planeta en detalle)
- [ ] **Módulo 3**: Campos de Experiencia (Ejes Polares)
- [ ] **Módulo 4**: Síntesis y Sentido (Nodos, Saturno, Mito Personal)

### 7.3 Manejo de Errores
- [ ] Si falla la API de Gemini, se muestra mensaje de error claro
- [ ] Se valida que el JSON de respuesta sea válido
- [ ] Se maneja correctamente el truncamiento de respuestas

### 7.4 Personalización de Prompts
- [ ] Los usuarios PREMIUM+ pueden crear prompts personalizados
- [ ] Los usuarios FREE/PRO no pueden personalizar prompts
- [ ] Solo admins pueden modificar el prompt del sistema

---

## 8. Exportación de Informes

### 8.1 Formatos Disponibles
- [ ] **HTML/Web**: Disponible para todos los planes
- [ ] **PDF**: Solo planes PRO, PREMIUM, ENTERPRISE
- [ ] **DOCX**: Solo planes PRO, PREMIUM, ENTERPRISE
- [ ] **Markdown**: Disponible para todos los planes

### 8.2 Restricciones por Plan
- [ ] Plan FREE: Solo puede exportar HTML
- [ ] Plan PRO+: Puede exportar todos los formatos
- [ ] Se muestra mensaje de error si intenta exportar PDF/DOCX sin plan adecuado

### 8.3 Calidad de Exportación
- [ ] El PDF se genera correctamente con formato profesional
- [ ] El DOCX es editable y mantiene el formato
- [ ] El HTML se muestra correctamente en navegador
- [ ] El Markdown es válido y legible

### 8.4 Contenido del Informe
- [ ] Incluye portada con nombre del consultante (si se proporciona)
- [ ] Incluye datos de entrada (fecha, hora, lugar)
- [ ] Incluye tabla de posiciones planetarias
- [ ] Incluye el análisis completo generado por Gemini
- [ ] Incluye gráfico de la carta (en formatos que lo soporten)

---

## 9. Interfaz de Usuario

### 9.1 Diseño General
- [ ] El diseño es responsive (funciona en móvil, tablet, desktop)
- [ ] Los colores y estilos son consistentes
- [ ] La tipografía es legible
- [ ] Los iconos no se sobreponen

### 9.2 Navegación
- [ ] El header muestra correctamente el logo y título
- [ ] Los botones de idioma funcionan (ES, CA, EU)
- [ ] El botón de logout está visible cuando hay sesión
- [ ] Los iconos de acción (Perfil, Planes, Técnicas, Cartas) funcionan

### 9.3 Formularios
- [ ] Los campos de entrada tienen validación
- [ ] Los mensajes de error son claros
- [ ] Los placeholders son informativos
- [ ] El autocompletado de lugares funciona

### 9.4 Modales y Diálogos
- [ ] Los modales se abren y cierran correctamente
- [ ] El contenido de los modales es legible
- [ ] Los botones de acción funcionan

### 9.5 Estados de Carga
- [ ] Se muestra indicador de carga durante cálculos
- [ ] Se muestra progreso durante generación de análisis
- [ ] Los mensajes de error son visibles

---

## 10. Integraciones Externas

### 10.1 Google Geocoding API
- [ ] La API key está configurada correctamente
- [ ] Las peticiones se hacen correctamente
- [ ] Se manejan errores de API (cuota excedida, etc.)
- [ ] Los resultados se cachean si es posible

### 10.2 Gemini API
- [ ] La API key está configurada en Vercel
- [ ] Las peticiones se hacen correctamente
- [ ] Se manejan errores de API
- [ ] El JSON de respuesta se parsea correctamente

### 10.3 Stripe
- [ ] La integración con Stripe funciona
- [ ] Se crean sesiones de checkout correctamente
- [ ] Los webhooks se procesan correctamente
- [ ] Se actualiza el plan del usuario después del pago

### 10.4 MongoDB
- [ ] La conexión a MongoDB funciona
- [ ] Se guardan y recuperan datos correctamente
- [ ] Las consultas son eficientes

---

## 📝 Notas de Verificación

### Casos de Prueba Recomendados

1. **Carta de Prueba Estándar:**
   - Fecha: 11 de Agosto de 1932
   - Hora: 17:00
   - Lugar: Morón de la Frontera, España (37.1215°N, 5.4560°W)
   - Verificar posiciones conocidas contra efemérides de referencia

2. **Verificación de Aspectos:**
   - Crear carta con aspectos conocidos
   - Verificar que se detectan con orbes correctos
   - Verificar que NO se detectan aspectos fuera de orbe

3. **Límites de Planes:**
   - Crear usuario FREE
   - Intentar crear 6 cartas (debe fallar en la 6ª)
   - Intentar exportar PDF (debe fallar)
   - Actualizar a PRO y verificar que funciona

---

## ✅ Resumen de Verificación

**Fecha de última verificación:** _______________  
**Verificado por:** _______________  
**Versión de la aplicación:** _______________

### Estado General
- [ ] Todas las funcionalidades críticas funcionan
- [ ] Las efemérides son precisas
- [ ] Los aspectos se calculan correctamente
- [ ] La aplicación está lista para producción

### Problemas Encontrados
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Observaciones
_________________________________________________
_________________________________________________
_________________________________________________

---

**Fin del Documento de Testeo**

