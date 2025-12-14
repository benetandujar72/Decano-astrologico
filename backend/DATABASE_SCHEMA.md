# 📊 Esquema Completo de Base de Datos MongoDB

## Plataforma de Análisis Astrológico Fraktal

**Base de Datos:** `fraktal`
**Motor:** MongoDB 6.0+
**Driver:** Motor (AsyncIO)

---

## 📑 Índice de Colecciones

1. [users](#1-users) - Usuarios del sistema
2. [charts](#2-charts) - Cartas astrales guardadas
3. [subscriptions](#3-subscriptions) - Suscripciones de pago
4. [payments](#4-payments) - Historial de pagos
5. [prompts](#5-prompts) - Prompts del sistema IA
6. [user_sessions](#6-user_sessions) - Sesiones activas
7. [user_preferences](#7-user_preferences) - Preferencias personales
8. [analysis_cache](#8-analysis_cache) - Cache de análisis IA

---

## 1. `users`

### Descripción
Almacena información de usuarios registrados en la plataforma.

### Modelo
```typescript
{
  _id: ObjectId,
  username: string,              // Único, email del usuario
  hashed_password: string,       // BCrypt hash
  email: string,                 // Email confirmado
  role: "user" | "admin",        // Rol del usuario
  is_active: boolean,            // Cuenta activa
  created_at: ISODate,           // Fecha de registro
  email_verified: boolean,       // Email verificado
  email_verification_token: string | null,
  last_login: ISODate | null,    // Último acceso
  profile: {
    nombre_completo: string | null,
    fecha_nacimiento: string | null,
    avatar_url: string | null
  }
}
```

### Índices
```javascript
db.users.createIndex({ "username": 1 }, { unique: true })
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "created_at": -1 })
db.users.createIndex({ "role": 1, "is_active": 1 })
```

### Ejemplo
```json
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "username": "usuario@example.com",
  "hashed_password": "$2b$12$...",
  "email": "usuario@example.com",
  "role": "user",
  "is_active": true,
  "created_at": ISODate("2025-01-01T00:00:00Z"),
  "email_verified": true,
  "last_login": ISODate("2025-01-14T10:00:00Z"),
  "profile": {
    "nombre_completo": "Juan Pérez",
    "fecha_nacimiento": "1990-05-15",
    "avatar_url": null
  }
}
```

---

## 2. `charts`

### Descripción
Almacena cartas astrales completas calculadas con Swiss Ephemeris.

### Modelo
```typescript
{
  _id: ObjectId,
  user_id: string,               // Referencia a users._id

  // Metadatos de la carta
  metadata: {
    nombre: string,
    fecha_local: string,         // "1972-05-27"
    hora_local: string,          // "08:00"
    hora_local_completa: string, // "1972-05-27 08:00:00"
    latitud: number,
    longitud: number,
    lugar_nombre: string | null,
    zona_horaria: string,        // "Europe/Madrid"
    offset_utc: string,          // "+01:00"
    offset_utc_legible: string,  // "UTC+01:00"
    dst_activo: boolean,
    fecha_utc: string,           // "1972-05-27 07:00:00 UTC"
    version_calculo: string,     // "1.0"
    motor_efemerides: string,    // "Swiss Ephemeris 2.10.3"
    precision_segundos: boolean
  },

  // Cálculos astronómicos
  calculation: {
    planetas: Array<PlanetPosition>,
    sistema_casas: string,       // "Placidus"
    ascendente: Object,
    medio_cielo: Object,
    casas: Array<HouseData>,
    aspectos: Array<AspectData> | null,
    balance_elementos: {
      Fuego: number,
      Tierra: number,
      Aire: number,
      Agua: number
    },
    balance_modalidades: {
      Cardinal: number,
      Fijo: number,
      Mutable: number
    }
  },

  // Análisis IA (opcional)
  analisis_ia: {
    blocks: Array<Object>,
    footerQuote: string,
    generated_at: ISODate
  } | null,

  // Metadatos de sistema
  timestamp_creacion: ISODate,
  timestamp_modificacion: ISODate | null,
  tags: Array<string>,
  es_favorito: boolean,
  notas: string | null
}
```

### Índices
```javascript
db.charts.createIndex({ "user_id": 1, "timestamp_creacion": -1 })
db.charts.createIndex({ "metadata.fecha_local": 1 })
db.charts.createIndex({ "metadata.nombre": 1 })
db.charts.createIndex({ "tags": 1 })
db.charts.createIndex({ "es_favorito": 1, "user_id": 1 })
```

---

## 3. `subscriptions`

### Descripción
Suscripciones activas y su relación con Stripe.

### Modelo
```typescript
{
  _id: ObjectId,
  user_id: string,               // Referencia a users._id (único)
  tier: "free" | "pro" | "premium" | "enterprise",
  status: "active" | "cancelled" | "expired" | "trial",
  start_date: string,            // "2025-01-01"
  end_date: string,              // "2025-02-01"
  auto_renew: boolean,

  // Stripe integration
  stripe_customer_id: string | null,     // cus_...
  stripe_subscription_id: string | null, // sub_...
  stripe_session_id: string | null,      // cs_...
  payment_status: "pending" | "completed" | "failed",
  billing_cycle: "monthly" | "yearly",

  // Payment method
  payment_method: {
    type: "stripe" | "paypal" | "transfer",
    last_four: string | null,
    brand: string | null
  } | null,

  // Metadatos
  created_at: ISODate,
  updated_at: ISODate,
  cancelled_at: ISODate | null,
  next_billing_date: string | null
}
```

### Índices
```javascript
db.subscriptions.createIndex({ "user_id": 1 }, { unique: true })
db.subscriptions.createIndex({ "stripe_customer_id": 1 })
db.subscriptions.createIndex({ "tier": 1, "status": 1 })
db.subscriptions.createIndex({ "end_date": 1 }) // Para expiración
```

---

## 4. `payments`

### Descripción
Historial completo de transacciones de pago.

### Modelo
```typescript
{
  _id: ObjectId,
  payment_id: string,            // Único UUID
  user_id: string,
  subscription_tier: string,     // "pro", "premium", "enterprise"
  amount: number,                // 49.99
  currency: string,              // "eur"
  status: "completed" | "pending" | "failed" | "refunded",
  method: "stripe" | "paypal",

  // Stripe data
  stripe_session_id: string | null,
  stripe_payment_intent_id: string | null,
  transaction_id: string | null,

  // Detalles
  billing_cycle: "monthly" | "yearly",
  period_start: string | null,
  period_end: string | null,

  // Metadatos
  created_at: ISODate,
  completed_at: ISODate | null,
  refunded_at: ISODate | null,
  metadata: Object | null        // Datos adicionales de Stripe
}
```

### Índices
```javascript
db.payments.createIndex({ "user_id": 1, "created_at": -1 })
db.payments.createIndex({ "payment_id": 1 }, { unique: true })
db.payments.createIndex({ "stripe_session_id": 1 })
db.payments.createIndex({ "status": 1 })
db.payments.createIndex({ "created_at": -1 }) // Para revenue stats
```

---

## 5. `prompts`

### Descripción
Prompts del sistema de IA (instrucciones generales y especializadas).

### Modelo
```typescript
{
  _id: ObjectId,
  tipo: "sistema" | "natal" | "transitos" | "sinastria" | "revolucion_solar",
  contenido: string,             // El prompt completo
  activo: boolean,
  version: string,               // "1.0", "1.1", etc.
  created_by: string | null,     // user_id del admin
  created_at: ISODate,
  updated_at: ISODate,
  uso_total: number              // Contador de veces usado
}
```

### Índices
```javascript
db.prompts.createIndex({ "tipo": 1, "activo": 1 })
db.prompts.createIndex({ "version": -1 })
```

---

## 6. `user_sessions`

### Descripción
Sesiones activas para auditoría y control de acceso.

### Modelo
```typescript
{
  _id: ObjectId,
  user_id: string,
  session_id: string,            // Hash único
  token_hash: string,            // SHA256 del JWT

  created_at: ISODate,
  expires_at: ISODate,
  last_activity: ISODate,

  // Client info
  ip_address: string | null,
  user_agent: string | null,
  device_type: string | null,    // "desktop", "mobile", "tablet"
  browser: string | null,

  // Status
  is_active: boolean,
  logout_at: ISODate | null,
  login_method: string           // "password", "oauth"
}
```

### Índices
```javascript
db.user_sessions.createIndex({ "user_id": 1, "expires_at": 1 })
db.user_sessions.createIndex({ "session_id": 1 }, { unique: true })
db.user_sessions.createIndex({ "token_hash": 1 })
db.user_sessions.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 }) // TTL
```

---

## 7. `user_preferences`

### Descripción
Preferencias personalizadas de cada usuario.

### Modelo
```typescript
{
  _id: ObjectId,
  user_id: string,               // Único

  // UI preferences
  idioma: string,                // "es", "en", "ca"
  tema_visual: string,           // "dark", "light"
  formato_fecha: string,
  formato_hora: string,
  timezone_preferida: string,

  // Astrological preferences
  sistema_casas: string,         // "Placidus", "Koch", etc.
  mostrar_segundos_angulos: boolean,
  mostrar_aspectos: boolean,
  orbe_aspectos: number,         // 8.0
  usar_nodo_norte_verdadero: boolean,
  incluir_quiron: boolean,
  incluir_asteroides: boolean,
  incluir_partes_arabes: boolean,

  // Notifications
  notificaciones_email: boolean,
  notificaciones_transitos: boolean,

  // Privacy
  cartas_publicas_por_defecto: boolean,
  compartir_estadisticas: boolean,

  created_at: ISODate,
  updated_at: ISODate
}
```

### Índices
```javascript
db.user_preferences.createIndex({ "user_id": 1 }, { unique: true })
```

---

## 8. `analysis_cache`

### Descripción
Cache de análisis IA para evitar regenerar el mismo análisis.

### Modelo
```typescript
{
  _id: ObjectId,
  cache_key: string,             // SHA256(fecha+hora+lat+lon+tipo)

  // Input data
  fecha: string,
  hora: string,
  latitud: number,
  longitud: number,
  tipo_analisis: string,         // "natal", "transito", "sinastria"

  // Cached result
  resultado: {
    blocks: Array<Object>,
    footerQuote: string
  },

  // Metadata
  created_at: ISODate,
  expires_at: ISODate,           // 30 días después
  hits: number,                  // Cuántas veces se usó
  last_hit: ISODate
}
```

### Índices
```javascript
db.analysis_cache.createIndex({ "cache_key": 1 }, { unique: true })
db.analysis_cache.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 }) // TTL
db.analysis_cache.createIndex({ "tipo_analisis": 1, "created_at": -1 })
```

---

## 🔧 Script de Inicialización

```python
# backend/app/database/init_db.py
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def create_all_indexes():
    """Crea todos los índices necesarios"""
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL"))
    db = client.fraktal

    # Users
    await db.users.create_index([("username", 1)], unique=True)
    await db.users.create_index([("email", 1)], unique=True)
    await db.users.create_index([("created_at", -1)])
    await db.users.create_index([("role", 1), ("is_active", 1)])

    # Charts
    await db.charts.create_index([("user_id", 1), ("timestamp_creacion", -1)])
    await db.charts.create_index([("metadata.fecha_local", 1)])
    await db.charts.create_index([("tags", 1)])

    # Subscriptions
    await db.subscriptions.create_index([("user_id", 1)], unique=True)
    await db.subscriptions.create_index([("stripe_customer_id", 1)])
    await db.subscriptions.create_index([("tier", 1), ("status", 1)])

    # Payments
    await db.payments.create_index([("user_id", 1), ("created_at", -1)])
    await db.payments.create_index([("payment_id", 1)], unique=True)
    await db.payments.create_index([("status", 1)])

    # Prompts
    await db.prompts.create_index([("tipo", 1), ("activo", 1)])

    # User Sessions
    await db.user_sessions.create_index([("user_id", 1), ("expires_at", 1)])
    await db.user_sessions.create_index([("session_id", 1)], unique=True)
    await db.user_sessions.create_index([("expires_at", 1)], expireAfterSeconds=0)

    # User Preferences
    await db.user_preferences.create_index([("user_id", 1)], unique=True)

    # Analysis Cache
    await db.analysis_cache.create_index([("cache_key", 1)], unique=True)
    await db.analysis_cache.create_index([("expires_at", 1)], expireAfterSeconds=0)

    print("✅ Todos los índices creados correctamente")
```

---

## 📈 Estadísticas de Uso Estimado

### Storage Requirements (estimado para 10,000 usuarios)

| Colección | Docs | Avg Size | Total |
|-----------|------|----------|-------|
| users | 10,000 | 2 KB | 20 MB |
| charts | 50,000 | 15 KB | 750 MB |
| subscriptions | 8,000 | 1 KB | 8 MB |
| payments | 30,000 | 2 KB | 60 MB |
| prompts | 10 | 5 KB | 50 KB |
| user_sessions | 5,000 | 1 KB | 5 MB |
| user_preferences | 10,000 | 2 KB | 20 MB |
| analysis_cache | 5,000 | 20 KB | 100 MB |
| **TOTAL** | - | - | **~1 GB** |

---

## 🔐 Seguridad

### Nivel de Colección
- ✅ Todas las operaciones requieren autenticación JWT
- ✅ Users solo acceden a sus propios datos
- ✅ Admins tienen acceso global solo con `require_admin()`

### Datos Sensibles
- ✅ Contraseñas con BCrypt (12 rounds)
- ✅ Tokens JWT con expiración de 24h
- ✅ Sesiones con TTL automático
- ✅ Cache con expiración de 30 días

---

## 📝 Changelog

### v1.0 (2025-01-14)
- ✅ Schema completo documentado
- ✅ Índices optimizados para queries comunes
- ✅ Modelos Pydantic para validación
- ✅ Integración con Stripe
- ✅ Sistema de cache para IA
