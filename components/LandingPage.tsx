import React, { useMemo, useState } from 'react';
import { ArrowRight, Mail, Phone, Sparkles } from 'lucide-react';
import { api } from '../services/api';

interface LandingPageProps {
  isAuthenticated: boolean;
  onGoToApp: () => void;
  onViewPlans: () => void;
  onViewServices: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  isAuthenticated,
  onGoToApp,
  onViewPlans,
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

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onGoToApp}
            className="flex items-center gap-2 text-white hover:text-indigo-200 transition-colors"
            aria-label={isAuthenticated ? 'Ir a la app' : 'Entrar'}
            title={isAuthenticated ? 'Ir a la app' : 'Entrar'}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="text-indigo-300" size={18} />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-wide">FRAKTAL</div>
              <div className="text-[11px] text-gray-400">Astrología sistémica</div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onViewPlans}
              className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 text-sm transition-colors"
            >
              Ver planes
            </button>
            <button
              type="button"
              onClick={onGoToApp}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors inline-flex items-center gap-2"
            >
              {isAuthenticated ? 'Ir a la app' : 'Entrar'}
              <ArrowRight size={16} />
            </button>
          </div>
        </header>

        <section className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
              Tu carta natal, con análisis profundo y accionable
            </h1>
            <p className="mt-5 text-gray-300 text-lg leading-relaxed">
              FRAKTAL combina cálculo astrológico preciso con un enfoque sistémico: claridad, síntesis y pasos prácticos.
              Empieza gratis y desbloquea informes completos con planes de suscripción.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onViewPlans}
                className="px-5 py-3 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold transition-all"
              >
                Ver planes y precios
              </button>
              <button
                type="button"
                onClick={onViewServices}
                className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold transition-colors"
              >
                Servicios profesionales
              </button>
            </div>

            {!isAuthenticated && (
              <div className="mt-4 text-xs text-gray-400">
                Para reservar servicios, primero inicia sesión.
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Freemium</div>
                <div className="mt-1 text-sm text-gray-200">Vista previa persuasiva para plan FREE</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-indigo-300 font-bold uppercase tracking-wider">PDF</div>
                <div className="mt-1 text-sm text-gray-200">Informe descargable para planes de pago</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/5 to-white/0 p-5">
            <div className="text-sm font-semibold text-white">Capturas</div>
            <div className="mt-4 grid grid-cols-1 gap-3">
              <img
                src="/screenshots/fraktal-01.svg"
                alt="Captura: flujo de análisis"
                className="w-full rounded-xl border border-white/10 bg-black/20"
                loading="lazy"
              />
              <img
                src="/screenshots/fraktal-02.svg"
                alt="Captura: informe y resultados"
                className="w-full rounded-xl border border-white/10 bg-black/20"
                loading="lazy"
              />
              <img
                src="/screenshots/fraktal-03.svg"
                alt="Captura: planes y suscripción"
                className="w-full rounded-xl border border-white/10 bg-black/20"
                loading="lazy"
              />
            </div>
            <div className="mt-3 text-[11px] text-gray-400">
              Estas imágenes son marcadores de posición. Reemplázalas por capturas reales cuando quieras.
            </div>
          </div>
        </section>

        <section className="mt-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Mail size={18} className="text-indigo-300" />
              Contacto
            </div>
            <p className="mt-2 text-sm text-gray-300">
              Cuéntame qué necesitas y te responderé lo antes posible.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider">Nombre</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider">Email</label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div className="hidden" aria-hidden="true">
                <label>Company</label>
                <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>

              <div>
                <label className="block text-xs text-indigo-300 mb-1.5 font-bold uppercase tracking-wider">Mensaje</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  rows={6}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:border-indigo-500 outline-none resize-y"
                  placeholder="Explícame tu caso: fecha/hora/lugar si aplica, objetivo, y qué esperas del análisis..."
                />
              </div>

              {sendError && (
                <div className="text-xs text-red-300 bg-red-900/20 p-2 rounded border border-red-500/20">
                  {sendError}
                </div>
              )}
              {sentOk && (
                <div className="text-xs text-emerald-300 bg-emerald-900/20 p-2 rounded border border-emerald-500/20">
                  Mensaje enviado correctamente.
                </div>
              )}

              <button
                type="submit"
                disabled={!canSend || isSending}
                className={`w-full px-5 py-3 rounded-xl font-semibold transition-all inline-flex items-center justify-center gap-2 ${
                  !canSend || isSending
                    ? 'bg-white/10 text-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {isSending ? 'Enviando…' : 'Enviar mensaje'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center gap-2 text-white font-semibold">
              <Phone size={18} className="text-indigo-300" />
              Respuesta y sesiones
            </div>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              Si necesitas un acompañamiento más directo, puedes reservar servicios profesionales desde la app.
              La disponibilidad y los precios aparecen en el catálogo.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={onViewServices}
                className="w-full px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold transition-colors"
              >
                Ver catálogo de servicios
              </button>
            </div>
            <div className="mt-3 text-[11px] text-gray-400">
              Nota: el acceso a servicios requiere iniciar sesión.
            </div>
          </div>
        </section>

        <footer className="mt-14 border-t border-white/10 pt-6 text-xs text-gray-400 flex items-center justify-between gap-4">
          <div>© {new Date().getFullYear()} FRAKTAL</div>
          <button type="button" onClick={onGoToApp} className="text-indigo-300 hover:text-indigo-200 transition-colors">
            {isAuthenticated ? 'Ir a la app' : 'Entrar'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
