import React, { useMemo, useState } from 'react';
import { ArrowRight, Mail, Phone, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface LandingPageProps {
  isAuthenticated: boolean;
  onGoToApp: () => void;
  onRequireAuth: () => void;
  onViewServices: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated,
  onGoToApp,
  onRequireAuth,
  onViewServices,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot

  const [isSending, setIsSending] = useState(false);
  const [sentOk, setSentOk] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const canSend = useMemo(() => {
    return name.trim().length >= 2 && email.trim().length >= 5 && message.trim().length >= 10;
  }, [name, email, message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || isSending) return;

    setIsSending(true);
    setSendError(null);
    setSentOk(false);

    try {
      await api.sendContactMessage({ name: name.trim(), email: email.trim(), message: message.trim(), company: company.trim() || undefined });
      setSentOk(true);
      setName('');
      setEmail('');
      setMessage('');
      setCompany('');
    } catch (err: any) {
      setSendError(err?.message || 'Error enviando el mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const services = useMemo(() => {
    return [
      {
        service_id: 'srv_phone_60',
        name: 'Consulta Telefónica (60 min)',
        description: 'Consulta astrológica personalizada por teléfono con Jon Landeta.',
        duration_minutes: 60,
        base_price: 120,
        category: 'consultation',
      },
      {
        service_id: 'srv_online_60',
        name: 'Consulta Online (60 min)',
        description: 'Sesión de análisis astrológico vía videollamada (Zoom/Google Meet).',
        duration_minutes: 60,
        base_price: 150,
        category: 'consultation',
      },
      {
        service_id: 'srv_in_person_90',
        name: 'Consulta Presencial (90 min)',
        description: 'Sesión presencial de análisis astrológico profundo (a convenir).',
        duration_minutes: 90,
        base_price: 250,
        category: 'consultation',
      },
      {
        service_id: 'srv_training_foundation',
        name: 'Programa de Formación - Nivel Fundamentos',
        description: 'Curso intensivo de fundamentos de astrología (metodología Jon Landeta).',
        duration_minutes: 1200,
        base_price: 890,
        category: 'training',
      },
      {
        service_id: 'srv_therapy_60',
        name: 'Sesión de Terapia/Coaching (60 min)',
        description: 'Sesión integrando astrología psicológica y coaching.',
        duration_minutes: 60,
        base_price: 180,
        category: 'therapy',
      },
      {
        service_id: 'srv_chart_report',
        name: 'Carta Personalizada (Informe PDF)',
        description: 'Informe escrito y personalizado a partir de tu carta natal.',
        duration_minutes: 45,
        base_price: 99,
        category: 'consultation',
      },
    ];
  }, []);

  const handleReserve = () => {
    if (!isAuthenticated) {
      onRequireAuth();
      return;
    }
    onViewServices();
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onGoToApp}
            className="flex items-center gap-2 text-slate-900 hover:text-blue-700 transition-colors"
            aria-label={isAuthenticated ? 'Ir a la app' : 'Entrar'}
            title={isAuthenticated ? 'Ir a la app' : 'Entrar'}
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center">
              <Sparkles className="text-blue-700" size={18} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">FRAKTAL</div>
              <div className="text-[11px] text-slate-600">Astrología sistémica</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onGoToApp}
              className="md-button px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center gap-2"
            >
              {isAuthenticated ? 'Ir a la app' : 'Entrar'}
              <ArrowRight size={16} />
            </button>
          </div>
        </header>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight">
              Tu carta natal, con análisis profundo y accionable
            </h1>
            <p className="mt-5 text-slate-700 text-lg leading-relaxed">
              FRAKTAL combina cálculo astrológico preciso con un enfoque sistémico: claridad, síntesis y pasos prácticos.
              La landing es pública. Para usar la app o reservar, necesitas validación de usuario.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReserve}
                className="md-button px-5 py-3 rounded-xl font-semibold transition-all"
              >
                Servicios de Jon Landeta
              </button>
              <button
                type="button"
                onClick={handleReserve}
                className="md-button md-button--secondary px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                Ver catálogo de servicios
              </button>
            </div>

            {!isAuthenticated && (
              <div className="mt-4 text-xs text-slate-600">
                Para reservar servicios, primero inicia sesión.
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="md-card md-card--flat rounded-xl p-4">
                <div className="text-xs text-blue-700 font-bold uppercase tracking-wider">Freemium</div>
                <div className="mt-1 text-sm text-slate-700">Vista previa persuasiva para plan FREE</div>
              </div>
              <div className="md-card md-card--flat rounded-xl p-4">
                <div className="text-xs text-blue-700 font-bold uppercase tracking-wider">PDF</div>
                <div className="mt-1 text-sm text-slate-700">Informe descargable para planes de pago</div>
              </div>
            </div>

            <div className="mt-8 md-card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-blue-700 font-bold uppercase tracking-wider">Servicios</div>
                  <div className="text-slate-900 font-semibold">Catálogo público (preview)</div>
                </div>
                <button
                  type="button"
                  onClick={handleReserve}
                  className="md-button px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Reservar
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <div key={svc.service_id} className="md-card md-card--flat rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-slate-900 font-semibold">{svc.name}</div>
                        <div className="mt-1 text-xs text-slate-600">{svc.description}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-600">Desde</div>
                        <div className="text-sm text-slate-900 font-bold">€{svc.base_price}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-600">
                        {svc.duration_minutes ? `${svc.duration_minutes} min` : 'Duración a convenir'}
                      </div>
                      <button
                        type="button"
                        onClick={handleReserve}
                        className="text-xs text-indigo-300 hover:text-indigo-200 transition-colors"
                      >
                        Reservar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-[11px] text-gray-400">
                El catálogo completo y la reserva están disponibles tras iniciar sesión.
              </div>
            </div>
          </div>

          <div className="md-card md-card--flat rounded-2xl p-5">
            <div className="text-sm font-semibold text-slate-900">Capturas</div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <img
                src="/screenshots/fraktal-01.svg"
                alt="Captura: flujo de análisis"
                className="w-full rounded-xl border border-slate-200 bg-white"
                loading="lazy"
              />
              <img
                src="/screenshots/fraktal-02.svg"
                alt="Captura: informe y resultados"
                className="w-full rounded-xl border border-slate-200 bg-white"
                loading="lazy"
              />
              <img
                src="/screenshots/fraktal-03.svg"
                alt="Captura: servicios y reservas"
                className="w-full rounded-xl border border-slate-200 bg-white"
                loading="lazy"
              />
            </div>
            <div className="mt-3 text-[11px] text-slate-600">
              Estas imágenes son marcadores de posición. Reemplázalas por capturas reales cuando quieras.
            </div>
          </div>
        </section>

        <section className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="md-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Mail size={18} className="text-slate-700" />
              Contacto
            </div>
            <p className="mt-2 text-sm text-slate-700">
              Cuéntame qué necesitas y te responderé lo antes posible.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1.5 font-bold uppercase tracking-wider">Nombre</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="md-input w-full rounded-lg px-4 py-3"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1.5 font-bold uppercase tracking-wider">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    className="md-input w-full rounded-lg px-4 py-3"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div className="hidden" aria-hidden="true">
                <label>Company</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1.5 font-bold uppercase tracking-wider">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  rows={6}
                  className="md-input w-full rounded-lg px-4 py-3 resize-y"
                  placeholder="Explícame tu caso: fecha/hora/lugar si aplica, objetivo, y qué esperas del análisis..."
                />
              </div>

              {sendError && (
                <div className="md-alert md-alert--error text-xs p-2 rounded">
                  {sendError}
                </div>
              )}
              {sentOk && (
                <div className="md-alert md-alert--success text-xs p-2 rounded">
                  Mensaje enviado correctamente.
                </div>
              )}

              <button
                type="submit"
                disabled={!canSend || isSending}
                className={`md-button w-full px-5 py-3 rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                  !canSend || isSending ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSending ? 'Enviando…' : 'Enviar mensaje'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <div className="md-card rounded-2xl p-6">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Phone size={18} className="text-slate-700" />
              Respuesta y sesiones
            </div>
            <p className="mt-2 text-sm text-slate-700 leading-relaxed">
              Si necesitas un acompañamiento más directo, puedes reservar servicios profesionales desde la app.
              La disponibilidad y los precios aparecen en el catálogo.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={handleReserve}
                className="md-button md-button--secondary w-full px-5 py-3 rounded-xl font-semibold transition-colors"
              >
                Ver catálogo de servicios
              </button>
            </div>
            <div className="mt-3 text-[11px] text-slate-600">
              Nota: el acceso a servicios requiere iniciar sesión.
            </div>
          </div>
        </section>

        <footer className="mt-14 border-t border-slate-200 pt-6 text-xs text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} FRAKTAL</div>
          <div className="flex items-center gap-6">
            <button 
              type="button" 
              onClick={onViewServices} 
              className="text-slate-600 hover:text-blue-700 transition-colors font-medium"
            >
              Contratar Servicios de Jon Landeta
            </button>
            <button type="button" onClick={onGoToApp} className="text-blue-700 hover:text-blue-900 transition-colors">
              {isAuthenticated ? 'Ir a la app' : 'Entrar'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
