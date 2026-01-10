import React, { useState, useEffect } from 'react';
import { FileText, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { wpApi } from '@/services/wpApi';
import type { UserPlan, ReportSession } from '@/types';

export default function UserDashboard() {
  const [reports, setReports] = useState<ReportSession[]>([]);
  const [plan, setPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [reportsData, planData] = await Promise.all([
          wpApi.listReports(),
          wpApi.getUserPlan()
        ]);
        setReports(reportsData.sessions || []);
        setPlan(planData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-white">Cargando dashboard...</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'failed':
        return 'bg-red-500/20 text-red-400';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400';
      case 'stalled':
        return 'bg-yellow-500/20 text-yellow-400';
      default:
        return 'bg-amber-500/20 text-amber-400';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente',
      'processing': 'Procesando',
      'completed': 'Completado',
      'failed': 'Error',
      'stalled': 'Estancado'
    };
    return statusMap[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-6 h-6 text-indigo-400" />
            <h3 className="text-slate-400">Informes Este Mes</h3>
          </div>
          <p className="text-3xl font-bold text-white">{plan?.usage?.this_month || 0}</p>
          {plan?.limits?.max_reports_per_month && plan.limits.max_reports_per_month > 0 && (
            <p className="text-sm text-slate-400 mt-1">
              de {plan.limits.max_reports_per_month}
            </p>
          )}
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <h3 className="text-slate-400">Plan Actual</h3>
          </div>
          <p className="text-2xl font-bold text-white capitalize">{plan?.tier || 'Free'}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            <h3 className="text-slate-400">Total Informes</h3>
          </div>
          <p className="text-3xl font-bold text-white">{reports.length}</p>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Informes Recientes</h3>
        {reports.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No hay informes generados aún</p>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 10).map((report) => (
              <div
                key={report.session_id}
                className="flex items-center justify-between py-3 border-b border-slate-700 last:border-0"
              >
                <div className="flex-1">
                  <p className="text-white font-medium">{report.nombre || 'Sin nombre'}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(report.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                    {report.report_type && (
                      <p className="text-sm text-slate-400">{report.report_type}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {report.status === 'completed' && (
                    <a
                      href={wpApi.getDownloadUrl(report.session_id)}
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                      download
                    >
                      Descargar
                    </a>
                  )}
                  <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(report.status)}`}>
                    {getStatusText(report.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
