/**
 * Modal para reservar un servicio profesional
 */
import React, { useState } from 'react';
import { X, Calendar, Clock, Euro, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface Service {
  service_id: string;
  name: string;
  description: string;
  service_type: string;
  duration_minutes: number;
  base_price: number;
  discounted_price?: number;
  platform?: string;
  location?: string;
}

interface ServiceBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service;
  discount: number;
}

const ServiceBookingModal: React.FC<ServiceBookingModalProps> = ({
  isOpen,
  onClose,
  service,
  discount
}) => {
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('fraktal_token');

  const finalPrice = service.discounted_price || service.base_price;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/professional-services/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          service_id: service.service_id,
          preferred_date: preferredDate || undefined,
          preferred_time: preferredTime || undefined,
          user_notes: userNotes || undefined,
          user_phone: userPhone || undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al crear reserva');
      }

      const data = await response.json();
      setBookingId(data.booking?.booking_id);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error creating booking:', err);
      setError(err.message || 'Error al crear reserva');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setPreferredDate('');
    setPreferredTime('');
    setUserNotes('');
    setUserPhone('');
    setError(null);
    setSuccess(false);
    setBookingId(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md-backdrop p-4">
      <div className="md-modal rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50/60 sticky top-0 z-10">
          <h2 className="text-2xl font-semibold text-slate-900">Reservar servicio</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6 text-slate-700" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-2">¡Reserva creada!</h3>
              <p className="text-slate-700 mb-6">
                Tu reserva ha sido creada exitosamente. ID: <span className="font-mono text-blue-700">{bookingId}</span>
              </p>
              <div className="md-card md-card--flat rounded-xl p-4 mb-6">
                <p className="text-sm text-slate-600 mb-2">Próximos pasos:</p>
                <ul className="text-left text-slate-700 space-y-2 text-sm">
                  <li>• Revisa tu email para confirmar los detalles</li>
                  <li>• Completa el pago para confirmar tu reserva</li>
                  <li>• Recibirás un enlace de reunión una vez confirmada</li>
                </ul>
              </div>
              <button
                onClick={handleClose}
                className="md-button px-8 py-3 rounded-xl font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            /* Booking Form */
            <>
              {/* Service Info */}
              <div className="md-card md-card--flat rounded-xl p-5 mb-6">
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{service.name}</h3>
                <div className="space-y-2 text-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{service.duration_minutes} minutos</span>
                  </div>
                  {service.platform && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Plataforma: {service.platform}</span>
                    </div>
                  )}
                  {service.location && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm">Ubicación: {service.location}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Precio final:</span>
                    <div className="flex items-center gap-2">
                      {service.discounted_price && (
                        <span className="text-slate-600 line-through text-sm">
                          {service.base_price}€
                        </span>
                      )}
                      <span className="text-2xl font-bold text-slate-900">
                        {finalPrice}€
                      </span>
                    </div>
                  </div>
                  {discount > 0 && (
                    <p className="text-green-700 text-sm mt-2">
                      Descuento del {discount}% aplicado
                    </p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="md-alert md-alert--error mb-6 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Preferred Date */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Fecha Preferida (Opcional)
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="md-input w-full rounded-xl px-4 py-3"
                  />
                </div>

                {/* Preferred Time */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Hora Preferida (Opcional)
                  </label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="md-input w-full rounded-xl px-4 py-3"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-2">
                    Teléfono de Contacto (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+34 666 777 888"
                    className="md-input w-full rounded-xl px-4 py-3"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-slate-700 font-semibold mb-2">
                    Notas o Preguntas Específicas (Opcional)
                  </label>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    rows={4}
                    placeholder="Ej: Me gustaría enfocarme en mi carta solar y vocación profesional..."
                    className="md-input w-full rounded-xl px-4 py-3 resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="md-button md-button--secondary flex-1 px-6 py-3 rounded-xl font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="md-button flex-1 px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Creando reserva...</span>
                      </>
                    ) : (
                      <>
                        <Euro className="w-5 h-5" />
                        <span>Crear Reserva ({finalPrice}€)</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-600 text-center mt-4">
                  Al crear la reserva, serás redirigido al proceso de pago para confirmar tu cita
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceBookingModal;
