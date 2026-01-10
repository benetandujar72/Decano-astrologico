import React, { useState, useEffect } from 'react';
import { FileText, Plus, User } from 'lucide-react';
import { wpApi } from '@/services/wpApi';
import ReportGenerationWizard from './ReportGenerationWizard';
import type { UserPlan, Profile, ReportType } from '@/types';

interface ReportGeneratorProps {
  planCheck?: string;
  showUpgrade?: string;
}

export default function ReportGenerator({ planCheck = 'true', showUpgrade = 'true' }: ReportGeneratorProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profilesData, typesData, planData] = await Promise.all([
          wpApi.getProfiles(),
          wpApi.getReportTypes(),
          wpApi.getUserPlan()
        ]);

        setProfiles(profilesData.profiles || []);
        setReportTypes(typesData.report_types || []);
        setUserPlan(planData);

        // Seleccionar primer perfil y tipo por defecto
        if (profilesData.profiles && profilesData.profiles.length > 0) {
          setSelectedProfile(profilesData.profiles[0]);
        }
        if (typesData.report_types && typesData.report_types.length > 0) {
          setSelectedReportType(typesData.report_types[0].id);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleStartGeneration = () => {
    if (!selectedProfile) {
      alert('Por favor selecciona un perfil');
      return;
    }

    // Verificar límites del plan si planCheck está activado
    if (planCheck === 'true' && userPlan) {
      const { usage, limits } = userPlan;
      if (limits.max_reports_per_month > 0 && usage.this_month >= limits.max_reports_per_month) {
        if (showUpgrade === 'true') {
          alert(`Has alcanzado el límite de ${limits.max_reports_per_month} informes de tu plan ${userPlan.tier}. Mejora tu plan para continuar.`);
          window.location.href = '/planes'; // Redirigir a página de planes
        } else {
          alert(`Has alcanzado el límite de informes de tu plan.`);
        }
        return;
      }
    }

    setShowWizard(true);
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg p-6">
        <p className="text-white">Cargando...</p>
      </div>
    );
  }

  // Preparar carta_data del perfil seleccionado
  const cartaData = selectedProfile ? {
    nombre: selectedProfile.nombre,
    fecha_nacimiento: selectedProfile.fecha_nacimiento,
    hora_nacimiento: selectedProfile.hora_nacimiento,
    lugar_nacimiento: selectedProfile.lugar_nacimiento,
    latitud: selectedProfile.latitud,
    longitud: selectedProfile.longitud,
    timezone: selectedProfile.timezone
  } : null;

  return (
    <div className="bg-slate-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-8 h-8 text-indigo-400" />
        <div>
          <h2 className="text-2xl font-semibold text-white">Generador de Informes</h2>
          <p className="text-slate-400 text-sm">Crea informes astrológicos detallados</p>
        </div>
      </div>

      {/* Información del plan */}
      {userPlan && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Plan actual</p>
              <p className="text-lg font-semibold text-white capitalize">{userPlan.tier}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Informes este mes</p>
              <p className="text-lg font-semibold text-white">
                {userPlan.usage.this_month}
                {userPlan.limits.max_reports_per_month > 0 && (
                  <span className="text-slate-400"> / {userPlan.limits.max_reports_per_month}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selector de perfil */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          <User className="w-4 h-4 inline mr-2" />
          Selecciona un perfil
        </label>
        <select
          value={selectedProfile?.id || ''}
          onChange={(e) => {
            const profile = profiles.find(p => p.id === e.target.value);
            setSelectedProfile(profile || null);
          }}
          className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Selecciona un perfil...</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.nombre} - {new Date(profile.fecha_nacimiento).toLocaleDateString()}
            </option>
          ))}
        </select>
      </div>

      {/* Selector de tipo de informe */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Tipo de informe
        </label>
        <select
          value={selectedReportType}
          onChange={(e) => setSelectedReportType(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {reportTypes.map((type) => (
            <option key={type.id} value={type.id}>
              {type.name}
            </option>
          ))}
        </select>
      </div>

      {/* Botón de generación */}
      <button
        onClick={handleStartGeneration}
        disabled={!selectedProfile}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Generar Informe
      </button>

      {/* Wizard de generación */}
      {showWizard && cartaData && (
        <ReportGenerationWizard
          cartaData={cartaData}
          nombre={selectedProfile!.nombre}
          reportType={selectedReportType}
          onComplete={(sessionId) => {
            setShowWizard(false);
            // Mostrar mensaje de éxito o redirigir al dashboard
            alert('Informe generado correctamente. ID de sesión: ' + sessionId);
          }}
          onClose={() => setShowWizard(false)}
        />
      )}
    </div>
  );
}
