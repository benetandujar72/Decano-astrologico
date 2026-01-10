# 🔧 Solució: Problema de Generació d'Informes

## 📋 Problema Identificat

L'informe es queda en "Inicializando generación..." i no genera cap mòdul. Abans dels canvis de report_types i orbes, funcionava correctament (15 minuts, 38 pàgines).

---

## 🔍 Diagnòstic Aplicat

He afegit logging detallat per identificar exactament on falla el procés. Ara la consola del navegador mostrarà:

```
[WIZARD] Sesión inicializada: [session_id]
[WIZARD] Módulos recibidos: 11
[WIZARD] autoGenerateAll: false
[WIZARD] ✅ Condiciones cumplidas para generar primer módulo
[WIZARD] Primer módulo ID: modulo_1
[WIZARD] Iniciando generación paso a paso del primer módulo
[WIZARD] Encolando módulo: modulo_1 con sesión: [session_id]
```

Si no veus aquests logs, sabrem exactament on falla.

---

## 🧪 Com Provar Ara

### 1. Rebuild del Frontend

```bash
cd /home/user/Decano-astrologico
npm run build
# O si estàs en dev:
npm run dev
```

### 2. Prova de Generació

1. Obre el navegador amb **DevTools** (F12)
2. Ves a la pestanya **Console**
3. Inicia sessió a l'aplicació
4. Crea una carta natal
5. Intenta generar un informe
6. **Observa els logs a la consola**

### 3. Executar Script de Diagnòstic (Backend)

```bash
cd /home/user/Decano-astrologico/backend
python diagnose_report_problem.py
```

Aquest script verificarà:
- ✅ Connexió a MongoDB
- ✅ Sessions existents i el seu estat
- ✅ Definició de seccions/mòduls
- ✅ Simulació de creació de sessió
- ⚠️ Sessions problemàtiques (sense module_runs)

---

## 🎯 Possibles Causes i Solucions

### Causa 1: Mòduls no es reben del backend

**Símptomes:**
```
[WIZARD] ❌ NO se puede generar módulo:
[WIZARD]   - modules.length: 0
```

**Solució:**
```bash
# Verificar que l'endpoint retorna mòduls
curl -X POST http://localhost:8000/api/reports/start-full-generation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "carta_data": {...},
    "nombre": "Test",
    "report_type": "individual",
    "report_mode": "full"
  }' | jq '.modules'

# Hauria de mostrar un array de 11 mòduls
```

---

### Causa 2: Error JavaScript silenciós

**Símptomes:**
- No es veuen els logs `[WIZARD] Iniciando generación...`
- Hi ha un error al catch

**Solució:**
Ara els errors es mostren amb stack trace complet:
```
[WIZARD] Error inicializando sesión: [error message]
[WIZARD] Stack trace: [full stack]
```

Busca aquest error a la consola i comparteix-lo.

---

### Causa 3: Problema amb `calculation_profile` o `userConfig`

**Símptomes:**
- El backend rebutja el request per configuració invàlida
- Error 400 Bad Request

**Solució provisional:**
Edita `ReportGenerationWizard.tsx` línia 181:

```typescript
// ABANS:
calculation_profile: userConfig

// TEMPORALMENT (per provar):
calculation_profile: undefined
```

Això desactivarà temporalment els orbes personalitzats per veure si és aquest el problema.

---

### Causa 4: Token expirat

**Símptomes:**
```
Error 401: Tu sesión ha expirado
```

**Solució:**
1. Tancar sessió
2. Tornar a iniciar sessió
3. Intentar generar l'informe de nou

---

## 🚀 Solució Ràpida (Bypass Temporal)

Si vols generar l'informe **ara** mentre depurem:

### Opció A: Usar l'endpoint antic (si encara existeix)

```bash
# Aquest endpoint genera tot l'informe de cop (potser triga 15-20 min)
curl -X POST http://localhost:8000/api/reports/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "carta_data": {...},
    "format": "pdf",
    "nombre": "Tu Nombre",
    "report_mode": "full"
  }' --output informe.pdf
```

### Opció B: Forçar `autoGenerateAll`

A `App.tsx`, quan crida a `ReportGenerationWizard`, afegeix:

```typescript
<ReportGenerationWizard
  cartaData={cartaCompleta}
  nombre={userInput.name}
  onComplete={handleReportComplete}
  onClose={() => setMode(AppMode.RESULT)}
  reportType="individual"
  autoGenerateAll={true}  // ⬅️ AFEGIR AIXÒ
/>
```

Això farà que el backend generi tots els mòduls en background i només facis polling.

---

## 📊 Logs Esperats (Funcionament Correcte)

Quan funciona correctament, hauríes de veure:

```
[WIZARD] Iniciando sesión en: https://api.../reports/start-full-generation
[WIZARD] Sesión inicializada: 696290092f5d63b239b1ab5e
[WIZARD] Módulos recibidos: 11
[WIZARD] autoGenerateAll: false
[WIZARD] ✅ Condiciones cumplidas para generar primer módulo
[WIZARD] Primer módulo ID: modulo_1
[WIZARD] Iniciando generación paso a paso del primer módulo
[WIZARD] Encolando módulo: modulo_1 con sesión: 696290092f5d63b239b1ab5e
[WIZARD] Polling estado del módulo: modulo_1
[WIZARD] Módulo completado con éxito
```

I després veure el contingut del mòdul 1 generat.

---

## 🔄 Passos Següents

### 1. Prova amb logging (ARA)

```bash
# Rebuild
npm run build

# Prova generació i mira logs a Console
```

### 2. Executa diagnòstic backend

```bash
python backend/diagnose_report_problem.py
```

### 3. Comparteix els logs

Si el problema persisteix, comparteix:
- **Console logs** del navegador (tots els `[WIZARD]`)
- **Output** del script de diagnòstic
- **Network tab** (requests a `/start-full-generation` i `/queue-module`)

---

## 💡 Nota Important

El problema més probable és que:

1. **`data.modules` està buit o undefined** → El backend no retorna mòduls
2. **Hi ha un error JavaScript** abans d'arribar a `generateModuleWithSession`
3. **`calculation_profile` conté dades invàlides** que fan fallar el backend

Amb el logging afegit, sabrem exactament quin és el problema.

---

## 🆘 Si Res Funciona

Com a **últim recurs**, podem revertir els canvis de report_types i orbes:

```bash
# Veure l'últim commit que funcionava
git log --oneline --all | grep -i "antes de"

# Revertir a aquell commit (NOMÉS si no hi ha altra opció)
git checkout [commit_hash] -- backend/app/api/endpoints/reports.py
git checkout [commit_hash] -- components/ReportGenerationWizard.tsx
```

Però això hauria de ser l'última opció després de depurar amb els logs.

---

**Data:** 2026-01-10
**Versió:** 1.0
**Status:** Debugging en curs
