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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-500/30">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-linear-to-r from-purple-900/50 to-indigo-900/50 sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-white">Reservar Servicio</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6 text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            /* Success State */
            <div className="text-center py-8">
              <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">¡Reserva Creada!</h3>
              <p className="text-gray-300 mb-6">
                Tu reserva ha sido creada exitosamente. ID: <span className="font-mono text-purple-400">{bookingId}</span>
              </p>
              <div className="bg-gray-800 rounded-xl p-4 mb-6">
                <p className="text-sm text-gray-400 mb-2">Próximos pasos:</p>
                <ul className="text-left text-gray-300 space-y-2 text-sm">
                  <li>• Revisa tu email para confirmar los detalles</li>
                  <li>• Completa el pago para confirmar tu reserva</li>
                  <li>• Recibirás un enlace de reunión una vez confirmada</li>
                </ul>
              </div>
              <button
                onClick={handleClose}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          ) : (
            /* Booking Form */
            <>
              {/* Service Info */}
              <div className="bg-gray-800 rounded-xl p-5 mb-6">
                <h3 className="text-xl font-bold text-white mb-3">{service.name}</h3>
                <div className="space-y-2 text-gray-300">
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
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Precio final:</span>
                    <div className="flex items-center gap-2">
                      {service.discounted_price && (
                        <span className="text-gray-500 line-through text-sm">
                          {service.base_price}€
                        </span>
                      )}
                      <span className="text-2xl font-bold text-white">
                        {finalPrice}€
                      </span>
                    </div>
                  </div>
                  {discount > 0 && (
                    <p className="text-green-400 text-sm mt-2">
                      Descuento del {discount}% aplicado
                    </p>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-900/30 border border-red-500 rounded-xl p-4 mb-6 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Preferred Date */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    <Calendar className="w-4 h-4 inline mr-2" />
                    Fecha Preferida (Opcional)
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Preferred Time */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Hora Preferida (Opcional)
                  </label>
                  <input
                    type="time"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Teléfono de Contacto (Opcional)
                  </label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="+34 666 777 888"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-gray-300 font-semibold mb-2">
                    Notas o Preguntas Específicas (Opcional)
                  </label>
                  <textarea
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    rows={4}
                    placeholder="Ej: Me gustaría enfocarme en mi carta solar y vocación profesional..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
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

                <p className="text-xs text-gray-500 text-center mt-4">
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
