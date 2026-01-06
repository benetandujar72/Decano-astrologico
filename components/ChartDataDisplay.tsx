/**
 * Componente para mostrar datos de carta astral con información completa de timezone
 */
import React from 'react';
import { MapPin, Clock, Globe, Calendar } from 'lucide-react';

interface ChartDataDisplayProps {
  cartaCompleta: any;  // Datos de ephemeris del backend
  compacto?: boolean;  // Modo compacto para mostrar menos detalles
}

const ChartDataDisplay: React.FC<ChartDataDisplayProps> = ({ cartaCompleta, compacto = false }) => {
  if (!cartaCompleta || !cartaCompleta.datos_entrada) {
    return null;
  }

  const datos = cartaCompleta.datos_entrada;

  // Formatear latitud/longitud con dirección
  const formatCoord = (lat: number, lon: number) => {
    const toDegMin = (value: number) => {
      const abs = Math.abs(value);
      const totalMinutes = Math.round(abs * 60);
      const d = Math.floor(totalMinutes / 60);
      const m = totalMinutes % 60;
      return `${d}°${m.toString().padStart(2, '0')}′`;
    };

    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'O';
    return `${toDegMin(lat)} ${latDir}, ${toDegMin(lon)} ${lonDir}`;
  };

  if (compacto) {
    // Modo compacto: Una sola línea
    return (
      <div className="flex items-center gap-4 text-xs text-slate-600 font-mono border border-slate-200 rounded-lg px-4 py-2 bg-white">
        <span className="text-slate-900">
          {datos.fecha_local} {datos.hora_local}
        </span>
        <span className="text-green-700">
          ({datos.offset_utc_legible})
          {datos.dst_activo && <span className="text-amber-700 ml-1">DST</span>}
        </span>
        <span className="text-slate-600">
          {formatCoord(datos.latitud, datos.longitud)}
        </span>
      </div>
    );
  }

  // Modo completo: Grid con toda la información
  return (
    <div className="md-card rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Globe size={20} className="text-slate-700" />
        Datos de Nacimiento
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fecha y Hora Local */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <Calendar size={18} className="text-slate-700 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-slate-600 uppercase tracking-wide mb-1">Fecha Local</div>
              <div className="text-slate-900 font-mono text-lg font-semibold">
                {datos.fecha_local}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock size={18} className="text-slate-700 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-slate-600 uppercase tracking-wide mb-1">Hora Local</div>
              <div className="text-slate-900 font-mono text-lg font-semibold">
                {datos.hora_local}
                <span className="text-green-700 ml-3 text-base">
                  {datos.offset_utc_legible}
                </span>
                {datos.dst_activo && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-50 text-amber-800 text-xs rounded-full border border-amber-200">
                    Horario de Verano
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ubicación */}
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-slate-700 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-slate-600 uppercase tracking-wide mb-1">Ubicación</div>
              <div className="text-slate-900 font-mono text-sm">
                {formatCoord(datos.latitud, datos.longitud)}
              </div>
              <div className="text-slate-600 text-xs mt-1 font-mono">
                Lat: {datos.latitud.toFixed(6)} | Lon: {datos.longitud.toFixed(6)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Globe size={18} className="text-slate-700 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs text-slate-600 uppercase tracking-wide mb-1">Zona Horaria</div>
              <div className="text-slate-900 font-mono text-sm">
                {datos.zona_horaria}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fecha UTC (menos prominente) */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-600">Fecha UTC (para cálculos astronómicos):</span>
          <span className="text-slate-600 font-mono">{datos.fecha_utc}</span>
        </div>
      </div>

      {/* Nota explicativa */}
      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900 leading-relaxed">
          <span className="font-semibold">ℹ️ Nota:</span> Los cálculos astrológicos usan la hora{' '}
          <span className="font-mono">{datos.hora_local}</span> en tu ubicación local{' '}
          ({datos.offset_utc_legible}). La hora UTC se muestra solo como referencia técnica.
        </p>
      </div>
    </div>
  );
};

export default ChartDataDisplay;
