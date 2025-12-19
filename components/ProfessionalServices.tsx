/**
 * Catálogo de servicios profesionales de Jon Landeta
 * Muestra servicios disponibles con precios y descuentos por plan
 */
import React, { useState, useEffect } from 'react';
import {
  Phone,
  Video,
  MapPin,
  GraduationCap,
  Heart,
  Clock,
  CheckCircle,
  AlertCircle,
  Tag,
  Sparkles,
  Star,
  ArrowLeft
} from 'lucide-react';
import ServiceBookingModal from './ServiceBookingModal';
import AstrologyDemo from './AstrologyDemo';

interface Service {
  service_id: string;
  name: string;
  description: string;
  service_type: string;
  category: string;
  duration_minutes: number;
  base_price: number;
  discounted_price?: number;
  savings?: number;
  discount_percentage?: number;
  currency: string;
  platform?: string;
  location?: string;
  includes?: string[];
  prerequisites?: string[];
}

interface CatalogResponse {
  services: Service[];
  has_access: boolean;
  discount: number;
  plan_name?: string;
  subscription_tier?: string;
  subscription_status?: string;
  subscription_end_date?: string | null;
  is_admin?: boolean;
}

interface ProfessionalServicesProps {
  onBack?: () => void;
}

const ProfessionalServices: React.FC<ProfessionalServicesProps> = ({ onBack }) => {
  const [catalogData, setCatalogData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('fraktal_token');

  useEffect(() => {
    fetchCatalog();
  }, [categoryFilter]);

  const fetchCatalog = async () => {
    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_URL}/professional-services/catalog`);
      if (categoryFilter) {
        url.searchParams.append('category', categoryFilter);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar catálogo');
      }

      const data = await response.json();
      setCatalogData(data);
    } catch (err: any) {
      console.error('Error fetching catalog:', err);
      setError(err.message || 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'phone_consultation':
        return <Phone className="w-6 h-6" />;
      case 'online_consultation':
        return <Video className="w-6 h-6" />;
      case 'in_person_consultation':
        return <MapPin className="w-6 h-6" />;
      case 'training_program':
        return <GraduationCap className="w-6 h-6" />;
      case 'therapy_session':
        return <Heart className="w-6 h-6" />;
      default:
        return <CheckCircle className="w-6 h-6" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      consultation: 'Consulta',
      training: 'Formación',
      therapy: 'Terapia'
    };
    return labels[category] || category;
  };

  const handleBookService = (service: Service) => {
    setSelectedService(service);
    setShowBookingModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500 rounded-xl p-6 flex items-center gap-3">
        <AlertCircle className="w-6 h-6 text-red-400" />
        <p className="text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="relative text-center mb-12">
        {onBack && (
          <button 
            onClick={onBack}
            className="absolute left-0 top-0 p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors"
            title="Volver"
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-4xl font-bold text-white mb-4">
          Servicios Profesionales de Jon Landeta
        </h1>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Acompañamiento terapéutico y astrológico-psicológico: presencial, online o en formato de carta personalizada.
        </p>

        {/* Disclaimer */}
        <div className="mt-6 max-w-3xl mx-auto bg-amber-900/20 border border-amber-500/30 rounded-2xl p-5 text-left">
          <p className="text-amber-200 font-semibold mb-2">Aviso importante</p>
          <p className="text-amber-100/80 text-sm">
            La información compartida tiene fines de orientación y desarrollo personal. Para cuestiones clínicas, diagnósticos o
            decisiones de salud, debe ser valorada y seguida por un profesional cualificado.
          </p>
        </div>

        {/* FREE DEMO CTA - Destacado */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="relative bg-linear-to-r from-green-900/40 via-emerald-900/40 to-teal-900/40 border-2 border-green-500/50 rounded-3xl p-8 overflow-hidden shadow-2xl">
            {/* Background effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-400/50 rounded-full px-4 py-2 mb-4">
                <Star className="w-5 h-5 text-green-400" />
                <span className="text-green-300 font-bold text-sm">100% GRATUITO</span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 flex items-center justify-center gap-3">
                <Sparkles className="w-8 h-8 text-green-400" />
                Prueba tu Demo Astrológica Gratis
              </h2>

              <p className="text-gray-200 text-lg mb-6 max-w-2xl mx-auto">
                Descubre una interpretación básica de tu carta natal con tu Sol, Luna y Ascendente.
                <span className="block mt-2 text-green-300 font-semibold">Sin coste · Sin compromiso · Resultados inmediatos</span>
              </p>

              <button
                onClick={() => setShowDemoModal(true)}
                className="inline-flex items-center gap-3 bg-linear-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold text-lg px-8 py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg hover:shadow-green-500/50"
              >
                <Sparkles className="w-6 h-6" />
                <span>Generar Mi Demo Gratis</span>
              </button>

              <p className="mt-4 text-gray-400 text-sm">
                Solo necesitas tu fecha, hora y lugar de nacimiento
              </p>
            </div>
          </div>
        </div>

        {/* Subscription summary (read-only) */}
        {catalogData && (
          <div className="mt-6 inline-flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-full px-6 py-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-white">
              {catalogData.is_admin && <span className="text-purple-400 font-bold">[ADMIN] </span>}
              Suscripción: {catalogData.subscription_tier?.toUpperCase() || 'FREE'} ({catalogData.subscription_status || 'inactive'})
              {typeof catalogData.discount === 'number' && catalogData.discount > 0 ? ` · Descuento ${catalogData.discount}%` : ''}
            </span>
          </div>
        )}

        {/* Modalities */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-5xl mx-auto">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <p className="text-white font-bold mb-2">Presencial</p>
            <p className="text-gray-300 text-sm">Sesiones profundas, trabajo práctico y seguimiento. Ideal si buscas proceso y contención.</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <p className="text-white font-bold mb-2">Online</p>
            <p className="text-gray-300 text-sm">Videollamada (Zoom/Meet). Flexible y eficaz para acompañamiento terapéutico y lectura guiada.</p>
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <p className="text-white font-bold mb-2">Carta personalizada</p>
            <p className="text-gray-300 text-sm">Informe PDF con claves, recomendaciones y plan de acción. Perfecto si prefieres formato escrito.</p>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-3 mb-8 justify-center flex-wrap">
        <button
          onClick={() => setCategoryFilter(null)}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            categoryFilter === null
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setCategoryFilter('consultation')}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            categoryFilter === 'consultation'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Consultas
        </button>
        <button
          onClick={() => setCategoryFilter('training')}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            categoryFilter === 'training'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Formación
        </button>
        <button
          onClick={() => setCategoryFilter('therapy')}
          className={`px-6 py-2 rounded-full font-semibold transition-colors ${
            categoryFilter === 'therapy'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          Terapia
        </button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalogData?.services.map((service) => {
          const isContactService = service.service_type === 'contact_jon';
          const isTrainingService = service.service_type === 'training_program';
          const isFree = service.base_price === 0;

          return (
          <div
            key={service.service_id}
            className={`bg-gray-900 border rounded-2xl p-6 transition-all hover:shadow-xl ${
              isContactService
                ? 'border-green-500 hover:border-green-400 hover:shadow-green-500/20'
                : isTrainingService
                ? 'border-blue-500 hover:border-blue-400 hover:shadow-blue-500/20'
                : 'border-gray-700 hover:border-purple-500 hover:shadow-purple-500/20'
            }`}
          >
            {/* Service Header */}
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${
                isContactService
                  ? 'bg-green-600/20 text-green-400'
                  : isTrainingService
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'bg-purple-600/20 text-purple-400'
              }`}>
                {getServiceIcon(service.service_type)}
              </div>
              <div className="flex gap-2">
                {isFree && (
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 text-xs rounded-full font-bold">
                    GRATIS
                  </span>
                )}
                <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full">
                  {getCategoryLabel(service.category)}
                </span>
              </div>
            </div>

            {/* Service Name */}
            <h3 className="text-xl font-bold text-white mb-2">{service.name}</h3>

            {/* Description */}
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">
              {service.description}
            </p>

            {/* Duration & Location/Platform */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-gray-300 text-sm">
                <Clock className="w-4 h-4" />
                <span>{service.duration_minutes} minutos</span>
              </div>
              {service.platform && (
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <Video className="w-4 h-4" />
                  <span>{service.platform}</span>
                </div>
              )}
              {service.location && (
                <div className="flex items-center gap-2 text-gray-300 text-sm">
                  <MapPin className="w-4 h-4" />
                  <span>{service.location}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mb-4">
              {isFree ? (
                <div className="text-3xl font-bold text-green-400">
                  GRATIS
                </div>
              ) : service.discounted_price ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-white">
                      {service.discounted_price}€
                    </span>
                    <span className="text-lg text-gray-500 line-through">
                      {service.base_price}€
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Tag className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-semibold">
                      Ahorras {service.savings}€ ({service.discount_percentage}% descuento)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-3xl font-bold text-white">
                  {service.base_price}€
                </div>
              )}
            </div>

            {/* Includes */}
            {service.includes && service.includes.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 mb-2">Incluye:</p>
                <ul className="space-y-1">
                  {service.includes.slice(0, 3).map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                  {service.includes.length > 3 && (
                    <li className="text-xs text-purple-400">
                      +{service.includes.length - 3} más...
                    </li>
                  )}
                </ul>
              </div>
            )}

            {/* Book Button */}
            <button
              onClick={() => handleBookService(service)}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                isContactService
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : isTrainingService
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
              }`}
            >
              {isContactService ? 'Contactar Ahora' : 'Reservar Ahora'}
            </button>
          </div>
          );
        })}
      </div>

      {/* No services message */}
      {catalogData?.services.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No hay servicios disponibles en esta categoría</p>
        </div>
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <ServiceBookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedService(null);
          }}
          service={selectedService}
          discount={catalogData?.discount || 0}
        />
      )}

      {/* Astrology Demo Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDemoModal(false)}
              className="absolute top-4 right-4 z-10 bg-gray-900/80 hover:bg-gray-800 text-white p-2 rounded-full transition-colors"
              aria-label="Cerrar demo"
            >
              <span className="text-2xl leading-none">×</span>
            </button>
            <AstrologyDemo />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalServices;
