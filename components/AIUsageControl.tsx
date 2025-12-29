/**
 * Componente de control de tokens y gasto de IA para administradores
 * Sistema de trazabilidad forense
 */
import React, { useState, useEffect } from 'react';
import { Brain, Zap, DollarSign, TrendingUp, Calendar, User, Filter, Download, RefreshCw, AlertCircle, History } from 'lucide-react';

interface AIUsageStats {
  total_actions: number;
  total_tokens: number;
  total_cost_usd: number;
  by_action_type: Record<string, { count: number; tokens: number; cost: number }>;
  by_user: Record<string, { user_name: string; count: number; tokens: number; cost: number }>;
  by_date: Record<string, { count: number; tokens: number; cost: number }>;
}

interface AIUsageRecord {
  _id: string;
  user_id: string;
  user_name: string;
  action_type: string;
  model_used: string;
  prompt_tokens: number;
  response_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  session_id?: string;
  module_id?: string;
  chart_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
}

const AIUsageControl: React.FC = () => {
  const [stats, setStats] = useState<AIUsageStats | null>(null);
  const [history, setHistory] = useState<AIUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedActionType, setSelectedActionType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const token = localStorage.getItem('fraktal_token');

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedUserId) params.append('user_id', selectedUserId);
      if (selectedActionType) params.append('action_type', selectedActionType);

      const response = await fetch(`${API_URL}/admin/ai-usage/stats?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || `Error HTTP ${response.status}: ${response.statusText}`;
        console.error('[AIUsageControl] Error obteniendo stats:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('[AIUsageControl] Error en fetchStats:', err);
      setError(err.message || 'Error obteniendo estadísticas');
    }
  };

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedUserId) params.append('user_id', selectedUserId);
      if (selectedActionType) params.append('action_type', selectedActionType);
      params.append('limit', pageSize.toString());
      params.append('skip', ((currentPage - 1) * pageSize).toString());

      const response = await fetch(`${API_URL}/admin/ai-usage/history?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.records || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.detail || `Error HTTP ${response.status}: ${response.statusText}`;
        console.error('[AIUsageControl] Error obteniendo history:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('[AIUsageControl] Error en fetchHistory:', err);
      setError(err.message || 'Error obteniendo historial');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        setError('No hay token de autenticación');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([fetchStats(), fetchHistory()]);
      } catch (err) {
        console.error('[AIUsageControl] Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [startDate, endDate, selectedUserId, selectedActionType, currentPage]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 6
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-ES').format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES');
  };

  const getActionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'report_module_generation': 'Generación de Módulo',
      'full_report_generation': 'Generación de Informe Completo',
      'expert_chat': 'Chat con Experto',
      'demo_chat': 'Demo Chat',
      'welcome_message': 'Mensaje de Bienvenida'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
        <span className="ml-3 text-gray-300">Cargando estadísticas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-400" />
            Control de Tokens y Gasto de IA
          </h2>
          <p className="text-gray-400 text-sm mt-1">Trazabilidad forense completa de uso de IA</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            Promise.all([fetchStats(), fetchHistory()]).finally(() => setLoading(false));
          }}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-semibold">Error</span>
          </div>
          <p className="text-red-300">{error}</p>
          <p className="text-red-400 text-xs mt-2">
            Revisa la consola del navegador (F12) para más detalles
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Fecha Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Usuario</label>
            <input
              type="text"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              placeholder="ID de usuario"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tipo de Acción</label>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              <option value="">Todos</option>
              <option value="report_module_generation">Generación de Módulo</option>
              <option value="full_report_generation">Informe Completo</option>
              <option value="expert_chat">Chat Experto</option>
              <option value="demo_chat">Demo Chat</option>
              <option value="welcome_message">Mensaje Bienvenida</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estadísticas Generales */}
      {!loading && !error && stats && stats.total_actions > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-lg p-6 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-5 h-5 text-purple-400" />
              <span className="text-xs text-gray-400">Total Acciones</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(stats.total_actions)}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-lg p-6 border border-blue-500/30">
            <div className="flex items-center justify-between mb-2">
              <Brain className="w-5 h-5 text-blue-400" />
              <span className="text-xs text-gray-400">Total Tokens</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatNumber(stats.total_tokens)}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatNumber(Math.round(stats.total_tokens / 1000))}K tokens
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 rounded-lg p-6 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              <span className="text-xs text-gray-400">Costo Total</span>
            </div>
            <p className="text-3xl font-bold text-white">{formatCurrency(stats.total_cost_usd)}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-lg p-6 border border-orange-500/30">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <span className="text-xs text-gray-400">Costo Promedio</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {stats.total_actions > 0
                ? formatCurrency(stats.total_cost_usd / stats.total_actions)
                : formatCurrency(0)}
            </p>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay datos */}
      {!loading && !error && stats && stats.total_actions === 0 && (
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-8 text-center">
          <Brain className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No hay datos de uso de IA aún</h3>
          <p className="text-gray-300 mb-4">
            Los registros aparecerán aquí después de que se generen informes usando el sistema de generación paso a paso.
          </p>
          <p className="text-gray-400 text-sm">
            Cada vez que se genera un módulo de informe, se registra automáticamente el uso de tokens y el costo estimado.
          </p>
        </div>
      )}

      {/* Estadísticas Generales */}
      {!loading && !error && stats && stats.total_actions > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-400" />
            Por Tipo de Acción
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.by_action_type).map(([type, data]) => (
              <div key={type} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-white font-semibold">{getActionTypeLabel(type)}</p>
                  <p className="text-xs text-gray-400">{data.count} acciones</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold">{formatNumber(data.tokens)} tokens</p>
                  <p className="text-xs text-green-400">{formatCurrency(data.cost)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial Detallado */}
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <History className="w-5 h-5 text-purple-400" />
          Historial de Uso (Trazabilidad Forense)
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-3 text-gray-300">Cargando historial...</span>
          </div>
        ) : error ? (
          <p className="text-red-400 text-center py-8">{error}</p>
        ) : history.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No hay registros para mostrar. Los registros aparecerán aquí después de generar informes.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Fecha/Hora</th>
                  <th className="text-left py-2 px-3 text-gray-400">Usuario</th>
                  <th className="text-left py-2 px-3 text-gray-400">Acción</th>
                  <th className="text-left py-2 px-3 text-gray-400">Modelo</th>
                  <th className="text-right py-2 px-3 text-gray-400">Tokens</th>
                  <th className="text-right py-2 px-3 text-gray-400">Costo</th>
                  <th className="text-left py-2 px-3 text-gray-400">Request ID</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record) => (
                  <tr key={record._id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-2 px-3 text-gray-300">{formatDate(record.created_at)}</td>
                    <td className="py-2 px-3">
                      <div>
                        <p className="text-white">{record.user_name}</p>
                        <p className="text-xs text-gray-500">{record.user_id.substring(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                        {getActionTypeLabel(record.action_type)}
                      </span>
                      {record.module_id && (
                        <p className="text-xs text-gray-500 mt-1">Módulo: {record.module_id}</p>
                      )}
                    </td>
                    <td className="py-2 px-3 text-gray-300 text-xs">{record.model_used}</td>
                    <td className="py-2 px-3 text-right text-gray-300">
                      <div>
                        <p className="text-white">{formatNumber(record.total_tokens)}</p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(record.prompt_tokens)} + {formatNumber(record.response_tokens)}
                        </p>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-green-400 font-semibold">
                      {formatCurrency(record.estimated_cost_usd)}
                    </td>
                    <td className="py-2 px-3 text-gray-500 text-xs font-mono">
                      {record.request_id?.substring(0, 12)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="text-gray-400">Página {currentPage}</span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={history.length < pageSize}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIUsageControl;
