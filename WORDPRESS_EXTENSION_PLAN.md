# 🔮 Plan de Implementación: Extensión WordPress para Sistema Astrológico

## 📋 Resumen Ejecutivo

Extensión WordPress que integra el sistema de generación de informes astrológicos con WooCommerce y Stripe, manteniendo coherencia visual con la aplicación React existente.

---

## 🎯 Requisitos Principales

1. ✅ Interfaz coherente con la aplicación React (tema slate-900, indigo/amber)
2. ✅ Gestión de informes según plan de pago del usuario
3. ✅ Compra de planes directamente desde la extensión
4. ✅ Pagos a través de WooCommerce + Stripe
5. ✅ Panel de administración completo
6. ✅ Mantener funcionalidad completa de generación de informes
7. ✅ Documentación y ayuda integrada

---

## 📦 Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                  WordPress + WooCommerce                │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Frontend   │  │   Backend    │  │  WooCommerce │ │
│  │   (React)    │◄─┤   (Plugin)   │◄─┤   + Stripe   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │        │
└─────────┼──────────────────┼──────────────────┼────────┘
          │                  │                  │
          ▼                  ▼                  ▼
    ┌─────────────────────────────────────────────┐
    │         Backend API Existente               │
    │  (FastAPI - /api/reports, /api/users, etc)  │
    └─────────────────────────────────────────────┘
```

---

## 🚀 FASE 1: Fundamentos del Plugin (Semana 1)

### Objetivos
- Crear estructura base del plugin WordPress
- Configurar integración con WooCommerce
- Definir productos y planes

### Tareas

#### 1.1 Estructura del Plugin
```
wp-content/plugins/decano-astrologico/
├── decano-astrologico.php          # Plugin principal
├── includes/
│   ├── class-da-activator.php      # Activación
│   ├── class-da-deactivator.php    # Desactivación
│   ├── class-da-loader.php         # Loader
│   └── class-da-i18n.php           # Internacionalización
├── admin/
│   ├── class-da-admin.php          # Panel admin
│   ├── css/
│   │   └── da-admin.css
│   └── js/
│       └── da-admin.js
├── public/
│   ├── class-da-public.php         # Frontend
│   ├── css/
│   │   └── da-public.css
│   └── js/
│       └── da-public.js
├── api/
│   ├── class-da-api-bridge.php     # Bridge con FastAPI
│   └── class-da-auth.php           # Autenticación
└── woocommerce/
    ├── class-da-woo-products.php   # Productos
    └── class-da-woo-integration.php # Integración
```

#### 1.2 Configuración de Productos WooCommerce
```php
// Productos a crear automáticamente
$products = [
    'free' => [
        'name' => 'Plan Gratuito - Decano Astrológico',
        'price' => 0,
        'description' => '1 informe resumido al mes',
        'meta' => [
            'plan_type' => 'free',
            'monthly_reports' => 1,
            'report_types' => ['resumido'],
            'features' => [
                'Carta natal básica',
                '1 informe resumido/mes',
                'Posiciones planetarias',
                'Aspectos principales'
            ]
        ]
    ],
    'premium' => [
        'name' => 'Plan Premium - Decano Astrológico',
        'price' => 29.99,
        'description' => 'Informes ilimitados + plantillas personalizadas',
        'meta' => [
            'plan_type' => 'premium',
            'monthly_reports' => 'unlimited',
            'report_types' => ['resumido', 'completo'],
            'features' => [
                'Informes ilimitados',
                'Informes completos',
                'Plantillas personalizadas',
                'Técnicas avanzadas',
                'Exportación PDF/DOCX',
                'Soporte prioritario'
            ]
        ]
    ],
    'enterprise' => [
        'name' => 'Plan Enterprise - Decano Astrológico',
        'price' => 99.99,
        'description' => 'Todo Premium + API + Soporte dedicado',
        'meta' => [
            'plan_type' => 'enterprise',
            'monthly_reports' => 'unlimited',
            'report_types' => ['resumido', 'completo', 'personalizado'],
            'features' => [
                'Todo de Premium',
                'Informes personalizados',
                'API REST completa',
                'Prompts personalizados',
                'Soporte 24/7',
                'Gestor de cuenta dedicado',
                'White-label (opcional)'
            ]
        ]
    ]
];
```

#### 1.3 Endpoints del Plugin
```php
// REST API endpoints WordPress
add_action('rest_api_init', function() {
    // Verificar plan del usuario
    register_rest_route('decano/v1', '/user/plan', [
        'methods' => 'GET',
        'callback' => 'da_get_user_plan',
        'permission_callback' => 'is_user_logged_in'
    ]);

    // Obtener límites del plan
    register_rest_route('decano/v1', '/user/limits', [
        'methods' => 'GET',
        'callback' => 'da_get_user_limits',
        'permission_callback' => 'is_user_logged_in'
    ]);

    // Generar informe (proxy a FastAPI)
    register_rest_route('decano/v1', '/reports/generate', [
        'methods' => 'POST',
        'callback' => 'da_generate_report',
        'permission_callback' => 'is_user_logged_in'
    ]);

    // Listar informes del usuario
    register_rest_route('decano/v1', '/reports', [
        'methods' => 'GET',
        'callback' => 'da_get_user_reports',
        'permission_callback' => 'is_user_logged_in'
    ]);
});
```

### Entregables Fase 1
- ✅ Plugin base instalable
- ✅ 3 productos WooCommerce configurados
- ✅ Integración con Stripe
- ✅ Endpoints REST básicos
- ✅ Tablas de base de datos creadas

---

## 🎨 FASE 2: Frontend React en WordPress (Semana 2)

### Objetivos
- Integrar componentes React en WordPress
- Mantener coherencia visual con la app
- Crear interfaz de generación de informes

### Tareas

#### 2.1 Configuración React en WordPress
```php
// Enqueue React y scripts
function da_enqueue_react_app() {
    // React y ReactDOM
    wp_enqueue_script('react',
        'https://unpkg.com/react@18/umd/react.production.min.js',
        [], '18.0.0', true);
    wp_enqueue_script('react-dom',
        'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
        ['react'], '18.0.0', true);

    // App principal (build desde Vite)
    wp_enqueue_script('da-app',
        plugin_dir_url(__FILE__) . 'build/da-app.js',
        ['react', 'react-dom'], '1.0.0', true);

    // Estilos (Tailwind compilado)
    wp_enqueue_style('da-app-style',
        plugin_dir_url(__FILE__) . 'build/da-app.css',
        [], '1.0.0');

    // Pasar datos PHP a React
    wp_localize_script('da-app', 'daConfig', [
        'apiUrl' => get_option('da_api_url'),
        'nonce' => wp_create_nonce('wp_rest'),
        'userId' => get_current_user_id(),
        'userPlan' => da_get_current_user_plan(),
        'restUrl' => rest_url('decano/v1/')
    ]);
}
```

#### 2.2 Componentes React a Crear
```typescript
// wp-frontend/src/components/
├── WPReportGenerator.tsx        # Generador de informes
├── WPUserDashboard.tsx          # Dashboard del usuario
├── WPPlanSelector.tsx           # Selector/upgrade de planes
├── WPReportHistory.tsx          # Historial de informes
├── WPChartVisualizer.tsx        # Visualización de cartas
├── WPPaymentModal.tsx           # Modal de pago/upgrade
└── WPAdminPanel.tsx             # Panel de administración

// Reutilizar componentes existentes:
import { NatalChart } from '@/components/NatalChart';
import { ReportGenerationWizard } from '@/components/ReportGenerationWizard';
import { HelpButton, HelpPanel } from '@/components/HelpSystem';
```

#### 2.3 Shortcodes WordPress
```php
// [decano-report-generator]
function da_shortcode_report_generator($atts) {
    $atts = shortcode_atts([
        'plan_check' => 'true',
        'show_upgrade' => 'true'
    ], $atts);

    return '<div id="da-report-generator"
                 data-plan-check="' . $atts['plan_check'] . '"
                 data-show-upgrade="' . $atts['show_upgrade'] . '">
            </div>';
}
add_shortcode('decano-report-generator', 'da_shortcode_report_generator');

// [decano-user-dashboard]
add_shortcode('decano-user-dashboard', 'da_shortcode_dashboard');

// [decano-plans]
add_shortcode('decano-plans', 'da_shortcode_plans');
```

#### 2.4 Tema CSS (Coherente con la App)
```css
/* wp-frontend/src/styles/wp-theme.css */
:root {
    --slate-900: #0f172a;
    --slate-800: #1e293b;
    --slate-700: #334155;
    --indigo-500: #6366f1;
    --indigo-400: #818cf8;
    --amber-500: #f59e0b;
    --amber-400: #fbbf24;
}

.da-container {
    background: var(--slate-900);
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Reutilizar clases Tailwind de la app */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Entregables Fase 2
- ✅ React integrado en WordPress
- ✅ 5+ componentes funcionales
- ✅ Shortcodes listos para usar
- ✅ Coherencia visual completa
- ✅ Responsive design

---

## 💳 FASE 3: Integración WooCommerce + Stripe (Semana 3)

### Objetivos
- Configurar flujo completo de pago
- Integrar Stripe con WooCommerce
- Gestionar suscripciones recurrentes
- Control de límites por plan

### Tareas

#### 3.1 Configuración WooCommerce Subscriptions
```php
// Requiere: WooCommerce Subscriptions plugin
function da_create_subscription_products() {
    // Premium - Suscripción mensual
    $premium = wc_get_product(get_option('da_premium_product_id'));
    update_post_meta($premium->get_id(), '_subscription_period', 'month');
    update_post_meta($premium->get_id(), '_subscription_period_interval', '1');
    update_post_meta($premium->get_id(), '_subscription_length', '0'); // Indefinido

    // Enterprise - Suscripción mensual
    $enterprise = wc_get_product(get_option('da_enterprise_product_id'));
    update_post_meta($enterprise->get_id(), '_subscription_period', 'month');
    update_post_meta($enterprise->get_id(), '_subscription_period_interval', '1');
}

// Hook cuando se completa una suscripción
add_action('woocommerce_subscription_status_active', 'da_activate_plan', 10, 1);
function da_activate_plan($subscription) {
    $user_id = $subscription->get_user_id();
    $items = $subscription->get_items();

    foreach ($items as $item) {
        $product_id = $item->get_product_id();
        $plan_type = get_post_meta($product_id, 'plan_type', true);

        // Actualizar plan del usuario
        update_user_meta($user_id, 'da_plan_type', $plan_type);
        update_user_meta($user_id, 'da_plan_start', current_time('mysql'));
        update_user_meta($user_id, 'da_subscription_id', $subscription->get_id());

        // Sincronizar con backend FastAPI
        da_sync_user_plan_to_api($user_id, $plan_type);
    }
}

// Hook cuando se cancela una suscripción
add_action('woocommerce_subscription_status_cancelled', 'da_cancel_plan', 10, 1);
```

#### 3.2 Control de Límites de Uso
```php
// Verificar si el usuario puede generar un informe
function da_can_generate_report($user_id, $report_type = 'resumido') {
    $plan = get_user_meta($user_id, 'da_plan_type', true) ?: 'free';
    $month_key = date('Y-m');
    $reports_count = (int) get_user_meta($user_id, "da_reports_{$month_key}", true);

    $limits = [
        'free' => [
            'monthly_limit' => 1,
            'allowed_types' => ['resumido']
        ],
        'premium' => [
            'monthly_limit' => -1, // Ilimitado
            'allowed_types' => ['resumido', 'completo']
        ],
        'enterprise' => [
            'monthly_limit' => -1,
            'allowed_types' => ['resumido', 'completo', 'personalizado']
        ]
    ];

    $user_limits = $limits[$plan];

    // Verificar límite mensual
    if ($user_limits['monthly_limit'] !== -1 &&
        $reports_count >= $user_limits['monthly_limit']) {
        return [
            'allowed' => false,
            'reason' => 'monthly_limit_reached',
            'message' => 'Has alcanzado tu límite mensual de informes.',
            'upgrade_to' => 'premium'
        ];
    }

    // Verificar tipo de informe permitido
    if (!in_array($report_type, $user_limits['allowed_types'])) {
        return [
            'allowed' => false,
            'reason' => 'report_type_not_allowed',
            'message' => "Este tipo de informe requiere plan Premium o superior.",
            'upgrade_to' => 'premium'
        ];
    }

    return ['allowed' => true];
}

// Incrementar contador al generar informe
function da_increment_report_counter($user_id) {
    $month_key = date('Y-m');
    $current = (int) get_user_meta($user_id, "da_reports_{$month_key}", true);
    update_user_meta($user_id, "da_reports_{$month_key}", $current + 1);
}
```

#### 3.3 Modal de Upgrade/Pago
```typescript
// WPPaymentModal.tsx
interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    requiredPlan: 'premium' | 'enterprise';
    reason: string;
}

export const WPPaymentModal: React.FC<PaymentModalProps> = ({
    isOpen, onClose, requiredPlan, reason
}) => {
    const handleUpgrade = () => {
        // Redirigir a checkout de WooCommerce
        const productId = requiredPlan === 'premium'
            ? window.daConfig.premiumProductId
            : window.daConfig.enterpriseProductId;

        window.location.href = `/checkout/?add-to-cart=${productId}`;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="bg-slate-900 p-8 rounded-lg">
                <h2 className="text-2xl font-bold text-white mb-4">
                    Upgrade Necesario
                </h2>
                <p className="text-slate-300 mb-6">{reason}</p>

                <PlanCard
                    plan={requiredPlan}
                    features={getPlanFeatures(requiredPlan)}
                    price={getPlanPrice(requiredPlan)}
                />

                <button
                    onClick={handleUpgrade}
                    className="w-full bg-indigo-500 hover:bg-indigo-600
                               text-white py-3 rounded-lg mt-6"
                >
                    Mejorar a {requiredPlan === 'premium' ? 'Premium' : 'Enterprise'}
                </button>
            </div>
        </Modal>
    );
};
```

### Entregables Fase 3
- ✅ Productos de suscripción configurados
- ✅ Stripe conectado y funcionando
- ✅ Control de límites implementado
- ✅ Modal de upgrade funcional
- ✅ Sincronización WP ↔ FastAPI

---

## 👨‍💼 FASE 4: Panel de Administración (Semana 4)

### Objetivos
- Panel completo para administradores
- Gestión de usuarios y planes
- Visualización de informes generados
- Analytics y métricas

### Tareas

#### 4.1 Menú de Administración WordPress
```php
// Agregar menú en admin
function da_admin_menu() {
    add_menu_page(
        'Decano Astrológico',
        'Decano',
        'manage_options',
        'decano-admin',
        'da_admin_dashboard',
        'dashicons-chart-area',
        30
    );

    add_submenu_page(
        'decano-admin',
        'Dashboard',
        'Dashboard',
        'manage_options',
        'decano-admin',
        'da_admin_dashboard'
    );

    add_submenu_page(
        'decano-admin',
        'Usuarios y Planes',
        'Usuarios',
        'manage_options',
        'decano-users',
        'da_admin_users'
    );

    add_submenu_page(
        'decano-admin',
        'Informes Generados',
        'Informes',
        'manage_options',
        'decano-reports',
        'da_admin_reports'
    );

    add_submenu_page(
        'decano-admin',
        'Configuración',
        'Configuración',
        'manage_options',
        'decano-settings',
        'da_admin_settings'
    );
}
add_action('admin_menu', 'da_admin_menu');
```

#### 4.2 Dashboard de Analytics
```typescript
// WPAdminDashboard.tsx
export const WPAdminDashboard = () => {
    const { data: stats } = useQuery('admin-stats', fetchAdminStats);

    return (
        <div className="da-admin-dashboard">
            <h1>Dashboard - Decano Astrológico</h1>

            <div className="grid grid-cols-4 gap-4 mb-8">
                <StatCard
                    title="Usuarios Totales"
                    value={stats.totalUsers}
                    icon={<Users />}
                    trend="+12% vs mes anterior"
                />
                <StatCard
                    title="Informes Generados (Mes)"
                    value={stats.reportsThisMonth}
                    icon={<FileText />}
                    trend="+24% vs mes anterior"
                />
                <StatCard
                    title="Suscripciones Activas"
                    value={stats.activeSubscriptions}
                    icon={<CreditCard />}
                />
                <StatCard
                    title="Ingresos (Mes)"
                    value={`$${stats.revenueThisMonth}`}
                    icon={<DollarSign />}
                    trend="+18% vs mes anterior"
                />
            </div>

            <div className="grid grid-cols-2 gap-6">
                <ReportsChart data={stats.reportsByDay} />
                <PlanDistributionChart data={stats.planDistribution} />
            </div>

            <RecentActivityTable activities={stats.recentActivities} />
        </div>
    );
};
```

#### 4.3 Gestión de Usuarios
```typescript
// WPAdminUsers.tsx
export const WPAdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [filters, setFilters] = useState({
        plan: 'all',
        search: ''
    });

    return (
        <div className="da-admin-users">
            <div className="flex justify-between mb-6">
                <h1>Gestión de Usuarios</h1>
                <input
                    type="search"
                    placeholder="Buscar usuario..."
                    onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
            </div>

            <table className="da-users-table">
                <thead>
                    <tr>
                        <th>Usuario</th>
                        <th>Email</th>
                        <th>Plan</th>
                        <th>Informes (Mes)</th>
                        <th>Registro</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.display_name}</td>
                            <td>{user.email}</td>
                            <td>
                                <PlanBadge plan={user.plan_type} />
                            </td>
                            <td>{user.reports_this_month}</td>
                            <td>{formatDate(user.registered)}</td>
                            <td>
                                <button onClick={() => viewUserDetails(user.id)}>
                                    Ver
                                </button>
                                <button onClick={() => changePlan(user.id)}>
                                    Cambiar Plan
                                </button>
                                <button onClick={() => viewReports(user.id)}>
                                    Informes
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
```

#### 4.4 Gestión de Informes
```typescript
// WPAdminReports.tsx
export const WPAdminReports = () => {
    const { data: reports } = useQuery('all-reports', fetchAllReports);

    return (
        <div className="da-admin-reports">
            <h1>Todos los Informes Generados</h1>

            <div className="filters mb-6">
                <select name="report_type">
                    <option value="all">Todos los tipos</option>
                    <option value="resumido">Resumido</option>
                    <option value="completo">Completo</option>
                    <option value="personalizado">Personalizado</option>
                </select>

                <DateRangePicker />

                <input type="search" placeholder="Buscar por usuario..." />
            </div>

            <table className="da-reports-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map(report => (
                        <tr key={report.id}>
                            <td>#{report.id}</td>
                            <td>{report.user_name}</td>
                            <td><Badge>{report.report_type}</Badge></td>
                            <td><StatusBadge status={report.status} /></td>
                            <td>{formatDate(report.created_at)}</td>
                            <td>
                                <button onClick={() => viewReport(report.id)}>
                                    Ver
                                </button>
                                <button onClick={() => downloadReport(report.id)}>
                                    Descargar
                                </button>
                                <button onClick={() => deleteReport(report.id)}>
                                    Eliminar
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
```

### Entregables Fase 4
- ✅ Panel de administración completo
- ✅ Dashboard con analytics
- ✅ Gestión de usuarios y planes
- ✅ Visualización de todos los informes
- ✅ Configuración del plugin

---

## 🔗 FASE 5: Integración Backend (Semana 5)

### Objetivos
- Conectar WP con FastAPI backend
- Sincronización bidireccional
- Gestión de autenticación
- Proxy de requests

### Tareas

#### 5.1 Bridge WP ↔ FastAPI
```php
// class-da-api-bridge.php
class DA_API_Bridge {
    private $api_url;
    private $api_key;

    public function __construct() {
        $this->api_url = get_option('da_api_url', 'https://api.decano.com');
        $this->api_key = get_option('da_api_key');
    }

    // Generar informe (proxy)
    public function generate_report($user_id, $report_data) {
        // Obtener token del usuario
        $token = $this->get_user_token($user_id);

        $response = wp_remote_post($this->api_url . '/api/reports/generate', [
            'headers' => [
                'Authorization' => "Bearer $token",
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode($report_data),
            'timeout' => 60
        ]);

        if (is_wp_error($response)) {
            return ['error' => $response->get_error_message()];
        }

        return json_decode(wp_remote_retrieve_body($response), true);
    }

    // Sincronizar usuario WP → FastAPI
    public function sync_user_to_api($user_id) {
        $user = get_userdata($user_id);
        $plan = get_user_meta($user_id, 'da_plan_type', true);

        $data = [
            'wordpress_id' => $user_id,
            'email' => $user->user_email,
            'username' => $user->user_login,
            'plan_type' => $plan,
            'metadata' => [
                'display_name' => $user->display_name,
                'registered' => $user->user_registered
            ]
        ];

        return wp_remote_post($this->api_url . '/api/users/sync', [
            'headers' => [
                'X-API-Key' => $this->api_key,
                'Content-Type' => 'application/json'
            ],
            'body' => json_encode($data)
        ]);
    }

    // Obtener o crear token JWT
    private function get_user_token($user_id) {
        $token = get_user_meta($user_id, 'da_api_token', true);

        if (empty($token) || $this->is_token_expired($token)) {
            $token = $this->generate_token($user_id);
            update_user_meta($user_id, 'da_api_token', $token);
        }

        return $token;
    }
}
```

#### 5.2 Endpoints Backend a Actualizar
```python
# backend/app/api/endpoints/wordpress.py
from fastapi import APIRouter, Depends, HTTPException
from app.models.user import User
from app.core.auth import get_current_user

router = APIRouter()

@router.post("/sync-user")
async def sync_wordpress_user(
    wordpress_id: int,
    email: str,
    username: str,
    plan_type: str,
    metadata: dict = None,
    api_key: str = Header(...)
):
    """Sincronizar usuario desde WordPress"""
    # Verificar API key
    if api_key != settings.WORDPRESS_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")

    # Buscar o crear usuario
    user = await User.get_or_none(wordpress_id=wordpress_id)

    if user:
        # Actualizar
        user.email = email
        user.username = username
        user.plan_type = plan_type
        user.metadata = metadata
        await user.save()
    else:
        # Crear
        user = await User.create(
            wordpress_id=wordpress_id,
            email=email,
            username=username,
            plan_type=plan_type,
            metadata=metadata
        )

    return {"status": "success", "user_id": user.id}

@router.post("/webhook/subscription-updated")
async def subscription_webhook(
    event: dict,
    signature: str = Header(...)
):
    """Webhook desde WooCommerce cuando cambia una suscripción"""
    # Verificar firma
    if not verify_woo_signature(signature, event):
        raise HTTPException(status_code=403)

    user_id = event.get('user_id')
    new_plan = event.get('plan_type')

    # Actualizar plan en FastAPI
    user = await User.get_or_none(wordpress_id=user_id)
    if user:
        user.plan_type = new_plan
        await user.save()

    return {"status": "processed"}
```

### Entregables Fase 5
- ✅ Bridge WP ↔ FastAPI completo
- ✅ Sincronización de usuarios
- ✅ Proxy de generación de informes
- ✅ Webhooks configurados
- ✅ Autenticación JWT

---

## 📚 FASE 6: Documentación y Ayuda (Semana 6)

### Objetivos
- Documentar extensión WordPress
- Agregar ayuda contextual
- Actualizar sistema de ayuda existente
- Guías de administración

### Tareas

#### 6.1 Actualizar Sistema de Ayuda
```typescript
// Agregar a data/helpContent.ts
export const wordpressHelpSection: HelpSection = {
    id: 'wordpress-integration',
    title: 'Integración WordPress',
    icon: 'wordpress',
    description: 'Guía completa para usar el plugin de WordPress',
    category: 'advanced',
    steps: [
        {
            id: 'wp-install',
            title: 'Instalación del Plugin',
            description: `
## Instalar Decano Astrológico en WordPress

### Requisitos
- WordPress 6.0 o superior
- WooCommerce 7.0 o superior
- WooCommerce Subscriptions (para suscripciones)
- Stripe Payment Gateway

### Pasos de Instalación
1. Descargar el plugin desde el repositorio
2. Subir a WordPress (Plugins → Añadir nuevo → Subir)
3. Activar el plugin
4. Ir a Decano → Configuración
5. Configurar API URL y API Key
6. Configurar productos WooCommerce
            `,
            image: '/help/screenshots/wp-install.png'
        },
        {
            id: 'wp-configure',
            title: 'Configuración Inicial',
            description: `
## Configurar el Plugin

### Configuración de API
1. Ir a **Decano → Configuración → API**
2. Ingresar URL del backend: \`https://api.decano.com\`
3. Ingresar API Key (solicitar al administrador)
4. Probar conexión

### Configuración de Productos
El plugin crea automáticamente 3 productos:
- **Plan Gratuito** (€0/mes)
- **Plan Premium** (€29.99/mes)
- **Plan Enterprise** (€99.99/mes)

Puedes personalizar precios en **WooCommerce → Productos**
            `,
            image: '/help/screenshots/wp-config.png',
            tips: [
                'Prueba la conexión API antes de publicar',
                'Configura Stripe en modo test primero'
            ]
        },
        {
            id: 'wp-shortcodes',
            title: 'Usar Shortcodes',
            description: `
## Shortcodes Disponibles

### Generador de Informes
\`\`\`
[decano-report-generator]
\`\`\`

### Dashboard de Usuario
\`\`\`
[decano-user-dashboard]
\`\`\`

### Selector de Planes
\`\`\`
[decano-plans]
\`\`\`

### Historial de Informes
\`\`\`
[decano-report-history]
\`\`\`

### Ejemplo en Página
Crear una página "Mi Carta Astral" y añadir:
\`\`\`
[decano-report-generator plan_check="true"]
\`\`\`
            `,
            image: '/help/screenshots/wp-shortcodes.png'
        },
        {
            id: 'wp-admin-panel',
            title: 'Panel de Administración',
            description: `
## Gestionar desde WordPress

### Dashboard
- Ver estadísticas generales
- Informes generados
- Ingresos y suscripciones

### Usuarios
- Ver todos los usuarios
- Cambiar plan manualmente
- Ver informes de cada usuario

### Informes
- Ver todos los informes generados
- Descargar cualquier informe
- Eliminar informes antiguos

### Configuración
- API settings
- Email templates
- Límites personalizados
            `,
            image: '/help/screenshots/wp-admin.png'
        }
    ]
};
```

#### 6.2 Documentación del Plugin
```markdown
# wp-content/plugins/decano-astrologico/README.md

# Decano Astrológico - WordPress Plugin

Plugin de integración para el sistema de informes astrológicos personalizables.

## Características

- 🎨 Interfaz coherente con la aplicación React
- 💳 Integración completa con WooCommerce y Stripe
- 📊 Panel de administración avanzado
- 🔐 Control de acceso por plan de pago
- 📱 Totalmente responsive
- 🌍 Multiidioma (español, inglés)

## Instalación

[Ver guía completa de instalación]

## Configuración

[Ver guía de configuración]

## Shortcodes

[Ver documentación de shortcodes]

## API

[Ver documentación de API]

## Soporte

support@decano.com
```

### Entregables Fase 6
- ✅ Documentación completa del plugin
- ✅ Sección de ayuda WordPress agregada
- ✅ Guías de administración
- ✅ README y changelog
- ✅ Videos tutoriales (opcional)

---

## 🧪 FASE 7: Testing y Optimización (Semana 7)

### Objetivos
- Testing completo del plugin
- Optimización de rendimiento
- Seguridad
- Compatibilidad

### Tareas

#### 7.1 Testing Checklist
```markdown
## Frontend
- [ ] Generador de informes funciona correctamente
- [ ] Modal de upgrade aparece cuando corresponde
- [ ] Checkout de WooCommerce funciona
- [ ] Dashboard de usuario muestra datos correctos
- [ ] Responsive en móvil/tablet/desktop

## Backend
- [ ] API bridge funciona sin errores
- [ ] Sincronización WP → FastAPI correcta
- [ ] Webhooks de WooCommerce funcionan
- [ ] Límites de plan se respetan
- [ ] Tokens JWT válidos

## Pagos
- [ ] Stripe test mode funciona
- [ ] Stripe production mode funciona
- [ ] Suscripciones se activan correctamente
- [ ] Renovaciones automáticas
- [ ] Cancelaciones funcionan

## Admin
- [ ] Panel de admin accesible
- [ ] Estadísticas correctas
- [ ] Gestión de usuarios funciona
- [ ] Ver/descargar informes funciona
- [ ] Configuración se guarda correctamente

## Seguridad
- [ ] Sanitización de inputs
- [ ] Validación de nonces
- [ ] Permisos correctos (capabilities)
- [ ] Escapado de outputs
- [ ] API keys seguras
```

#### 7.2 Optimización
```php
// Caché de requests API
function da_get_cached_api_response($endpoint, $params = []) {
    $cache_key = 'da_api_' . md5($endpoint . serialize($params));
    $cached = get_transient($cache_key);

    if ($cached !== false) {
        return $cached;
    }

    $response = da_api_request($endpoint, $params);
    set_transient($cache_key, $response, 5 * MINUTE_IN_SECONDS);

    return $response;
}

// Lazy loading de componentes React
import { lazy, Suspense } from 'react';

const ReportGenerator = lazy(() => import('./components/WPReportGenerator'));

function App() {
    return (
        <Suspense fallback={<CosmicLoader />}>
            <ReportGenerator />
        </Suspense>
    );
}
```

### Entregables Fase 7
- ✅ Suite de tests completa
- ✅ Optimizaciones aplicadas
- ✅ Auditoría de seguridad
- ✅ Compatibilidad verificada
- ✅ Performance > 90

---

## 🚀 FASE 8: Deployment y Lanzamiento (Semana 8)

### Objetivos
- Preparar para producción
- Documentación final
- Lanzamiento

### Tareas

#### 8.1 Pre-deployment Checklist
```markdown
- [ ] Versión estable etiquetada (v1.0.0)
- [ ] README completo
- [ ] CHANGELOG actualizado
- [ ] Licencia incluida
- [ ] Assets compilados y optimizados
- [ ] Traduciones completadas
- [ ] Screenshots para WordPress.org
- [ ] Video demo preparado
```

#### 8.2 Deployment
```bash
# Build del frontend React
cd wp-frontend
npm run build

# Compilar CSS
npm run build:css

# Crear ZIP del plugin
cd ../
zip -r decano-astrologico-v1.0.0.zip decano-astrologico/ \
    -x "*/node_modules/*" \
    -x "*/.git/*" \
    -x "*/src/*"

# Subir a WordPress.org (si es público)
svn co https://plugins.svn.wordpress.org/decano-astrologico
# ... seguir proceso de WordPress.org
```

#### 8.3 Post-lanzamiento
- Monitor de errores (Sentry)
- Analytics de uso
- Feedback de usuarios
- Soporte técnico

### Entregables Fase 8
- ✅ Plugin en producción
- ✅ Documentación publicada
- ✅ Soporte activo
- ✅ Monitoreo configurado

---

## 📊 Cronograma Resumen

| Fase | Duración | Entregables Clave |
|------|----------|-------------------|
| 1. Fundamentos | 1 semana | Plugin base, WooCommerce configurado |
| 2. Frontend React | 1 semana | Componentes UI, Shortcodes |
| 3. Pagos | 1 semana | Stripe integrado, Control de límites |
| 4. Admin Panel | 1 semana | Dashboard completo |
| 5. Backend | 1 semana | API bridge, Sincronización |
| 6. Documentación | 1 semana | Ayuda completa, Guías |
| 7. Testing | 1 semana | Tests, Optimización, Seguridad |
| 8. Deployment | 1 semana | Lanzamiento en producción |

**Total: 8 semanas (2 meses)**

---

## 💰 Recursos Necesarios

### Desarrollo
- 1 Desarrollador Full-stack (PHP + React)
- 1 Desarrollador Backend (Python/FastAPI) - part-time
- 1 QA Tester - última semana

### Infraestructura
- Servidor WordPress (recomendado: WP Engine, Kinsta)
- Stripe account (production)
- SSL certificado
- CDN (opcional, recomendado para assets)

### Plugins Premium Requeridos
- WooCommerce Subscriptions (~$199/año)
- Stripe Payment Gateway (gratuito)

---

## ✅ Criterios de Éxito

1. **Funcionalidad**
   - ✅ Generación de informes funciona igual que en la app
   - ✅ Pagos procesados correctamente
   - ✅ Límites de plan respetados
   - ✅ Admin puede gestionar todo

2. **UX/UI**
   - ✅ Interfaz coherente con la app React
   - ✅ Responsive en todos los dispositivos
   - ✅ Tiempos de carga < 3s

3. **Seguridad**
   - ✅ Todas las entradas sanitizadas
   - ✅ API keys protegidas
   - ✅ Sin vulnerabilidades conocidas

4. **Documentación**
   - ✅ Guías completas para usuarios
   - ✅ Guías completas para admins
   - ✅ Código bien documentado

---

## 🔄 Mantenimiento Post-Lanzamiento

### Mensual
- Revisar logs de errores
- Actualizar dependencias
- Responder tickets de soporte

### Trimestral
- Auditoría de seguridad
- Optimizaciones de rendimiento
- Nuevas features según feedback

---

## 📞 Contacto y Soporte

**Desarrollo**: dev@decano.com
**Soporte**: support@decano.com
**Documentación**: https://docs.decano.com/wordpress
