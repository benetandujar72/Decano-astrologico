/**
 * Formulario de datos de nacimiento con geocodificación automática
 * Diseñado para usuarios Free y Premium
 */

import React, { useState, useEffect } from 'react';
import { MapPin, Loader2, CheckCircle, AlertCircle, Search } from 'lucide-react';
import './BirthDataForm.css';

interface BirthData {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place_city: string;
  birth_place_country: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

interface GeocodeResult {
  latitude: number;
  longitude: number;
  formatted_address: string;
  city: string;
  country: string;
  timezone: string;
  display_name: string;
}

interface BirthDataFormProps {
  initialData?: Partial<BirthData>;
  onSubmit?: (data: BirthData) => void;
  onCancel?: () => void;
  submitButtonText?: string;
  isLoading?: boolean;
  redirectAfter?: string;
}

export const BirthDataForm: React.FC<BirthDataFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  submitButtonText = 'Generar Mi Informe Gratuito',
  isLoading = false,
  redirectAfter
}) => {
  const [formData, setFormData] = useState<BirthData>({
    name: initialData?.name || '',
    birth_date: initialData?.birth_date || '',
    birth_time: initialData?.birth_time || '',
    birth_place_city: initialData?.birth_place_city || '',
    birth_place_country: initialData?.birth_place_country || '',
    latitude: initialData?.latitude || null,
    longitude: initialData?.longitude || null,
    timezone: initialData?.timezone || 'UTC+0'
  });

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [geocodeSuccess, setGeocodeSuccess] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-geocodificar cuando se introducen ciudad y país
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.birth_place_city && formData.birth_place_country && !formData.latitude) {
        handleGeocode();
      }
    }, 1500); // Esperar 1.5s después de que el usuario pare de escribir

    return () => clearTimeout(timer);
  }, [formData.birth_place_city, formData.birth_place_country]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Si cambia la ciudad/país, limpiar coordenadas para volver a geocodificar
    if (name === 'birth_place_city' || name === 'birth_place_country') {
      setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
      setGeocodeSuccess(false);
    }
  };

  const handleGeocode = async () => {
    if (!formData.birth_place_city || !formData.birth_place_country) {
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);
    setGeocodeSuccess(false);

    try {
      // Llamar al backend de WordPress que proxy al backend Python
      const response = await fetch('/wp-json/decano/v1/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': (window as any).wpApiSettings?.nonce || ''
        },
        body: JSON.stringify({
          city: formData.birth_place_city,
          country: formData.birth_place_country
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener coordenadas');
      }

      const result: GeocodeResult = await response.json();

      setFormData(prev => ({
        ...prev,
        latitude: result.latitude,
        longitude: result.longitude,
        timezone: result.timezone,
        birth_place_city: result.city, // Actualizar con el nombre correcto
        birth_place_country: result.country
      }));

      setGeocodeSuccess(true);

      // Auto-ocultar mensaje de éxito después de 3s
      setTimeout(() => setGeocodeSuccess(false), 3000);

    } catch (error: any) {
      console.error('[BirthDataForm] Error geocodificando:', error);
      setGeocodeError(error.message || 'No se pudo encontrar la ubicación');
    } finally {
      setIsGeocoding(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    if (!formData.birth_date) {
      newErrors.birth_date = 'La fecha de nacimiento es obligatoria';
    }

    if (!formData.birth_time) {
      newErrors.birth_time = 'La hora de nacimiento es obligatoria';
    }

    if (!formData.birth_place_city.trim()) {
      newErrors.birth_place_city = 'La ciudad es obligatoria';
    }

    if (!formData.birth_place_country.trim()) {
      newErrors.birth_place_country = 'El país es obligatorio';
    }

    if (!formData.latitude || !formData.longitude) {
      newErrors.coordinates = 'No se pudieron obtener las coordenadas. Por favor, verifica el lugar.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Si hay callback personalizado, usarlo
    if (onSubmit) {
      onSubmit(formData);
      return;
    }

    // Comportamiento por defecto: generar informe Free
    setIsGenerating(true);
    setErrors({});

    try {
      console.log('[BirthDataForm] Generando informe gratuito...', formData);

      // Obtener configuración de WordPress
      const wpConfig = (window as any).decanoSettings || {};
      const restUrl = wpConfig.restUrl || '/wp-json/';
      const nonce = wpConfig.restNonce || '';

      // Preparar datos para envío
      const email = formData.name.toLowerCase().replace(/\s+/g, '.') + '@temp.decano.local';

      const payload = {
        name: formData.name,
        email: email, // TODO: Añadir campo email al formulario
        birth_date: formData.birth_date,
        birth_time: formData.birth_time,
        birth_city: formData.birth_place_city,
        birth_country: formData.birth_place_country,
        latitude: formData.latitude,
        longitude: formData.longitude,
        timezone: formData.timezone
      };

      console.log('[BirthDataForm] Llamando a WordPress API:', restUrl + 'decano/v1/generate-free-report');

      // Llamar al endpoint de WordPress
      const response = await fetch(restUrl + 'decano/v1/generate-free-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': nonce
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al generar el informe');
      }

      const result = await response.json();
      console.log('[BirthDataForm] Informe iniciado:', result);

      // Redirigir al visualizador con el session_id
      if (result.viewer_url) {
        window.location.href = result.viewer_url;
      } else if (result.session_id) {
        // Fallback si no hay viewer_url
        window.location.href = `/tu-informe-gratis/?session_id=${result.session_id}`;
      } else if (redirectAfter) {
        window.location.href = redirectAfter;
      }
    } catch (error: any) {
      console.error('[BirthDataForm] Error generando informe:', error);
      setErrors({
        submit: error.message || 'Error al generar el informe. Por favor, inténtalo de nuevo.'
      });
      setIsGenerating(false);
    }
  };

  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  return (
    <form className="birth-data-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2 className="form-title">Datos de Nacimiento</h2>
        <p className="form-description">
          Introduce tus datos natales para generar tu informe astrológico personalizado
        </p>
      </div>

      <div className="form-body">
        {/* Nombre */}
        <div className="form-group">
          <label htmlFor="name" className="form-label">
            Nombre completo
            <span className="required">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Tu nombre completo"
            className={`form-input ${errors.name ? 'error' : ''}`}
            disabled={isLoading}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        {/* Fecha y Hora en Grid */}
        <div className="form-grid">
          {/* Fecha de nacimiento */}
          <div className="form-group">
            <label htmlFor="birth_date" className="form-label">
              Fecha de nacimiento
              <span className="required">*</span>
            </label>
            <input
              type="date"
              id="birth_date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleInputChange}
              max={getTodayDate()}
              className={`form-input ${errors.birth_date ? 'error' : ''}`}
              disabled={isLoading}
            />
            {errors.birth_date && <span className="error-message">{errors.birth_date}</span>}
          </div>

          {/* Hora de nacimiento */}
          <div className="form-group">
            <label htmlFor="birth_time" className="form-label">
              Hora de nacimiento
              <span className="required">*</span>
            </label>
            <input
              type="time"
              id="birth_time"
              name="birth_time"
              value={formData.birth_time}
              onChange={handleInputChange}
              className={`form-input ${errors.birth_time ? 'error' : ''}`}
              disabled={isLoading}
            />
            {errors.birth_time && <span className="error-message">{errors.birth_time}</span>}
          </div>
        </div>

        {/* Lugar de nacimiento */}
        <div className="form-section">
          <div className="section-header">
            <MapPin className="section-icon" />
            <h3 className="section-title">Lugar de Nacimiento</h3>
          </div>

          <div className="form-grid">
            {/* Ciudad */}
            <div className="form-group">
              <label htmlFor="birth_place_city" className="form-label">
                Ciudad
                <span className="required">*</span>
              </label>
              <input
                type="text"
                id="birth_place_city"
                name="birth_place_city"
                value={formData.birth_place_city}
                onChange={handleInputChange}
                placeholder="ej. Barcelona"
                className={`form-input ${errors.birth_place_city ? 'error' : ''}`}
                disabled={isLoading}
              />
              {errors.birth_place_city && <span className="error-message">{errors.birth_place_city}</span>}
            </div>

            {/* País */}
            <div className="form-group">
              <label htmlFor="birth_place_country" className="form-label">
                País
                <span className="required">*</span>
              </label>
              <input
                type="text"
                id="birth_place_country"
                name="birth_place_country"
                value={formData.birth_place_country}
                onChange={handleInputChange}
                placeholder="ej. España"
                className={`form-input ${errors.birth_place_country ? 'error' : ''}`}
                disabled={isLoading}
              />
              {errors.birth_place_country && <span className="error-message">{errors.birth_place_country}</span>}
            </div>
          </div>

          {/* Botón manual de geocodificación */}
          {formData.birth_place_city && formData.birth_place_country && !formData.latitude && (
            <button
              type="button"
              onClick={handleGeocode}
              disabled={isGeocoding}
              className="geocode-button"
            >
              {isGeocoding ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  Buscando coordenadas...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Buscar coordenadas
                </>
              )}
            </button>
          )}

          {/* Estado de geocodificación */}
          {isGeocoding && (
            <div className="geocode-status loading">
              <Loader2 className="animate-spin" size={18} />
              <span>Obteniendo coordenadas automáticamente...</span>
            </div>
          )}

          {geocodeSuccess && formData.latitude && formData.longitude && (
            <div className="geocode-status success">
              <CheckCircle size={18} />
              <div className="status-content">
                <span className="status-title">Coordenadas obtenidas correctamente</span>
                <span className="status-details">
                  Lat: {formData.latitude.toFixed(4)}, Lon: {formData.longitude.toFixed(4)}
                  {formData.timezone && ` • ${formData.timezone}`}
                </span>
              </div>
            </div>
          )}

          {geocodeError && (
            <div className="geocode-status error">
              <AlertCircle size={18} />
              <div className="status-content">
                <span className="status-title">Error al obtener coordenadas</span>
                <span className="status-details">{geocodeError}</span>
                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  className="manual-coords-toggle"
                >
                  {showManualCoords ? 'Ocultar' : 'Introducir'} coordenadas manualmente
                </button>
              </div>
            </div>
          )}

          {errors.coordinates && (
            <div className="form-error-box">
              <AlertCircle size={18} />
              <span>{errors.coordinates}</span>
            </div>
          )}

          {/* Coordenadas manuales (solo si hay error) */}
          {showManualCoords && (
            <div className="manual-coords">
              <p className="manual-coords-hint">
                Puedes encontrar las coordenadas en{' '}
                <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer">
                  Google Maps
                </a>
              </p>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="latitude" className="form-label">Latitud</label>
                  <input
                    type="number"
                    id="latitude"
                    name="latitude"
                    value={formData.latitude || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      latitude: parseFloat(e.target.value) || null
                    }))}
                    placeholder="41.3874"
                    step="0.0001"
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="longitude" className="form-label">Longitud</label>
                  <input
                    type="number"
                    id="longitude"
                    name="longitude"
                    value={formData.longitude || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      longitude: parseFloat(e.target.value) || null
                    }))}
                    placeholder="2.1686"
                    step="0.0001"
                    className="form-input"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isLoading || isGenerating}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || isGeocoding || isGenerating}
        >
          {(isLoading || isGenerating) ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Generando tu informe...
            </>
          ) : (
            submitButtonText
          )}
        </button>
      </div>

      {/* Error de envío */}
      {errors.submit && (
        <div className="form-error">
          <AlertCircle size={18} />
          <span>{errors.submit}</span>
        </div>
      )}
    </form>
  );
};

export default BirthDataForm;
