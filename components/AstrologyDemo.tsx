/**
 * Componente de Demo de Informe Astrológico
 * Permite a los usuarios generar una pequeña demo con sus datos
 */
import React, { useState } from 'react';
import { Sparkles, Calendar, MapPin, Clock, AlertCircle, Download, Mail } from 'lucide-react';

interface DemoData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: string;
  longitude: string;
}

interface DemoReport {
  sun_sign: string;
  moon_sign: string;
  ascendant: string;
  summary: string;
  key_traits: string[];
}

const AstrologyDemo: React.FC = () => {
  const [step, setStep] = useState<'form' | 'generating' | 'result'>('form');
  const [demoData, setDemoData] = useState<DemoData>({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    latitude: '',
    longitude: ''
  });
  const [demoReport, setDemoReport] = useState<DemoReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const handleInputChange = (field: keyof DemoData, value: string) => {
    setDemoData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!demoData.name || !demoData.birthDate) {
      setError('Por favor completa al menos tu nombre y fecha de nacimiento');
      return false;
    }
    return true;
  };

  const generateDemo = async () => {
    if (!validateForm()) return;

    setStep('generating');
    setError(null);

    try {
      const token = localStorage.getItem('fraktal_token');

      // Preparar datos para el backend
      const chartData = {
        name: demoData.name,
        birth_date: demoData.birthDate,
        birth_time: demoData.birthTime || '12:00', // Usar mediodía si no se proporciona
        birth_place: demoData.birthPlace || 'Madrid, España',
        latitude: demoData.latitude || '40.4168',
        longitude: demoData.longitude || '-3.7038',
        is_demo: true // Marcar como demo
      };

      // Llamar al endpoint de generación de carta natal
      const response = await fetch(`${API_URL}/charts/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(chartData)
      });

      if (!response.ok) {
        throw new Error('Error al generar la carta natal');
      }

      const chartResult = await response.json();

      // Extraer información para la demo
      const planets = chartResult.planets || [];
      const sun = planets.find((p: any) => p.name === 'Sun');
      const moon = planets.find((p: any) => p.name === 'Moon');
      const ascendant = chartResult.houses?.[0]; // Primera casa = Ascendente

      // Función para obtener el signo zodiacal desde los grados
      const getZodiacSign = (degrees: number): string => {
        const signs = [
          'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
          'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis'
        ];
        const signIndex = Math.floor(degrees / 30);
        return signs[signIndex] || 'Desconocido';
      };

      const demoReport: DemoReport = {
        sun_sign: sun ? getZodiacSign(sun.longitude) : 'Calculando...',
        moon_sign: moon ? getZodiacSign(moon.longitude) : 'Calculando...',
        ascendant: ascendant ? getZodiacSign(ascendant.longitude) : 'Calculando...',
        summary: `Basado en tu fecha de nacimiento (${new Date(demoData.birthDate).toLocaleDateString()}), tu Sol está en ${sun ? getZodiacSign(sun.longitude) : '...'}, lo que indica tu esencia central y propósito de vida. Tu Luna en ${moon ? getZodiacSign(moon.longitude) : '...'} revela tus necesidades emocionales y tu mundo interior. ${ascendant ? `Con ${getZodiacSign(ascendant.longitude)} ascendente, proyectas esta energía al mundo exterior.` : ''}\n\nEste es un análisis preliminar. Para una interpretación completa y personalizada que considere todos los aspectos planetarios, casas y tránsitos actuales, te recomendamos contactar con Jon Landeta.`,
        key_traits: [
          `Energía ${sun ? getZodiacSign(sun.longitude) : 'solar'} que define tu identidad y expresión personal`,
          `Mundo emocional ${moon ? getZodiacSign(moon.longitude) : 'lunar'} que guía tus reacciones y necesidades afectivas`,
          `${ascendant ? getZodiacSign(ascendant.longitude) : 'Ascendente'} como máscara social y primera impresión que causas`,
          'Potencial único revelado en la configuración completa de tu carta natal'
        ]
      };

      setDemoReport(demoReport);
      setStep('result');
    } catch (err) {
      console.error('Error generando demo:', err);
      setError('Error al generar la demo. Por favor verifica tus datos e intenta de nuevo.');
      setStep('form');
    }
  };

  const resetDemo = () => {
    setStep('form');
    setDemoData({
      name: '',
      birthDate: '',
      birthTime: '',
      birthPlace: '',
      latitude: '',
      longitude: ''
    });
    setDemoReport(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/20 rounded-full mb-4">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Demo de Informe Astrológico</h1>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Descubre una vista previa de tu perfil astrológico. Introduce tus datos para generar una pequeña muestra.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-amber-400 shrink-0 mt-1" />
          <div>
            <h3 className="text-amber-200 font-semibold mb-2">Aviso Importante</h3>
            <p className="text-amber-100/80 text-sm mb-2">
              Esta demo es solo una muestra simplificada con fines informativos. Los datos astrológicos requieren
              interpretación profesional para su correcto entendimiento.
            </p>
            <p className="text-amber-100/80 text-sm">
              Para un análisis completo y personalizado, te recomendamos contactar con un astrólogo profesional.
            </p>
          </div>
        </div>
      </div>

      {/* Form Step */}
      {step === 'form' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-purple-400" />
            Tus Datos de Nacimiento
          </h2>

          <div className="space-y-6">
            {/* Nombre */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Nombre <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={demoData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                placeholder="Tu nombre"
              />
            </div>

            {/* Fecha de Nacimiento */}
            <div>
              <label htmlFor="birth-date" className="block text-white font-semibold mb-2">
                Fecha de Nacimiento <span className="text-red-400">*</span>
              </label>
              <input
                id="birth-date"
                type="date"
                value={demoData.birthDate}
                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                aria-required="true"
              />
            </div>

            {/* Hora de Nacimiento (Opcional) */}
            <div>
              <label htmlFor="birth-time" className="block text-white font-semibold mb-2">
                Hora de Nacimiento <span className="text-gray-400 text-sm">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <input
                  id="birth-time"
                  type="time"
                  value={demoData.birthTime}
                  onChange={(e) => handleInputChange('birthTime', e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                  aria-label="Hora de nacimiento"
                />
              </div>
              <p className="text-gray-400 text-sm mt-1">
                La hora exacta permite un análisis más preciso del ascendente
              </p>
            </div>

            {/* Lugar de Nacimiento (Opcional) */}
            <div>
              <label className="block text-white font-semibold mb-2">
                Lugar de Nacimiento <span className="text-gray-400 text-sm">(Opcional)</span>
              </label>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={demoData.birthPlace}
                  onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 outline-none transition-all"
                  placeholder="Ciudad, País"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border border-red-500 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={generateDemo}
              className="w-full py-4 bg-linear-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
            >
              <Sparkles className="w-5 h-5 inline mr-2" />
              Generar Demo de Informe
            </button>
          </div>
        </div>
      )}

      {/* Generating Step */}
      {step === 'generating' && (
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Generando tu demo...</h2>
          <p className="text-gray-300">Calculando posiciones planetarias y aspectos astrológicos</p>
        </div>
      )}

      {/* Result Step */}
      {step === 'result' && demoReport && (
        <div className="space-y-6">
          {/* Report Card */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                Hola, {demoData.name} ✨
              </h2>
              <p className="text-gray-300">Aquí está tu vista previa astrológica</p>
            </div>

            {/* Signos Principales */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-linear-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">☀️</div>
                <h3 className="text-white font-bold mb-1">Sol</h3>
                <p className="text-orange-300 text-xl font-semibold">{demoReport.sun_sign}</p>
              </div>
              <div className="bg-linear-to-br from-blue-500/20 to-indigo-600/20 border border-blue-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">🌙</div>
                <h3 className="text-white font-bold mb-1">Luna</h3>
                <p className="text-blue-300 text-xl font-semibold">{demoReport.moon_sign}</p>
              </div>
              <div className="bg-linear-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">⬆️</div>
                <h3 className="text-white font-bold mb-1">Ascendente</h3>
                <p className="text-purple-300 text-xl font-semibold">{demoReport.ascendant}</p>
              </div>
            </div>

            {/* Resumen */}
            <div className="bg-white/5 rounded-xl p-6 mb-6">
              <h3 className="text-white font-bold text-lg mb-3">Resumen General</h3>
              <p className="text-gray-300 leading-relaxed">{demoReport.summary}</p>
            </div>

            {/* Rasgos Clave */}
            <div className="bg-white/5 rounded-xl p-6">
              <h3 className="text-white font-bold text-lg mb-4">Rasgos Clave</h3>
              <ul className="space-y-3">
                {demoReport.key_traits.map((trait, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-300">
                    <span className="text-purple-400 shrink-0">✦</span>
                    <span>{trait}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Disclaimer en resultados */}
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-6">
            <h3 className="text-amber-200 font-semibold mb-2">⚠️ Recuerda</h3>
            <p className="text-amber-100/80 text-sm mb-3">
              Esta es una interpretación básica y generalizada. Un análisis astrológico completo requiere
              la interpretación de un profesional cualificado que considere todos los aspectos de tu carta natal.
            </p>
            <p className="text-amber-100/80 text-sm font-semibold">
              Para decisiones importantes sobre tu vida, salud o bienestar, consulta siempre con profesionales
              especializados.
            </p>
          </div>

          {/* Call to Action */}
          <div className="bg-linear-to-r from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg mb-2">
                  ¿Quieres un análisis completo y personalizado?
                </h3>
                <p className="text-gray-300 text-sm">
                  Contacta con Jon Landeta para recibir un informe profesional detallado
                  con interpretación personalizada de tu carta natal.
                </p>
              </div>
              <button
                type="button"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap"
                onClick={() => {
                  window.location.href = '#/professional-services';
                }}
              >
                <Mail className="w-5 h-5 inline mr-2" />
                Contactar Ahora
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <button
              type="button"
              onClick={resetDemo}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all"
            >
              Nueva Demo
            </button>
            <button
              type="button"
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-all"
            >
              <Download className="w-5 h-5 inline mr-2" />
              Descargar PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AstrologyDemo;
