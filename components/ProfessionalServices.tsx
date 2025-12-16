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
  Euro,
  Lock,
  CheckCircle,
  AlertCircle,
  Tag
} from 'lucide-react';
import ServiceBookingModal from './ServiceBookingModal';

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
  message?: string;
}

const ProfessionalServices: React.FC = () => {
  const [catalogData, setCatalogData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
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
    if (!catalogData?.has_access) {
      alert('Actualiza tu plan a PREMIUM o ENTERPRISE para acceder a estos servicios');
      return;
    }

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
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Servicios Profesionales de Jon Landeta
        </h1>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          Servicios especializados en astrología psicológica, formación y desarrollo personal
        </p>

        {/* Access Badge */}
        {catalogData && (
          <div className="mt-6 inline-flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-full px-6 py-3">
            {catalogData.has_access ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">
                  Plan {catalogData.plan_name} - Descuento {catalogData.discount}%
                </span>
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-yellow-400" />
                <span className="text-gray-300">{catalogData.message}</span>
              </>
            )}
          </div>
        )}
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
        {catalogData?.services.map((service) => (
          <div
            key={service.service_id}
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 hover:border-purple-500 transition-all hover:shadow-xl hover:shadow-purple-500/20"
          >
            {/* Service Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-600/20 rounded-xl text-purple-400">
                {getServiceIcon(service.service_type)}
              </div>
              <span className="px-3 py-1 bg-gray-800 text-gray-300 text-xs rounded-full">
                {getCategoryLabel(service.category)}
              </span>
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
              {service.discounted_price ? (
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
                      <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
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
              disabled={!catalogData?.has_access}
              className={`w-full py-3 rounded-xl font-semibold transition-all ${
                catalogData?.has_access
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {catalogData?.has_access ? 'Reservar Ahora' : 'Requiere PREMIUM+'}
            </button>
          </div>
        ))}
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
    </div>
  );
};

export default ProfessionalServices;
