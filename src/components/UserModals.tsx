/**
 * Modals for User Management
 * ResetPassword and AuditLogs modals
 */
import React, { useState, useEffect } from 'react';
import { Key, History } from 'lucide-react';

interface ResetPasswordModalProps {
  user: any;
  onClose: () => void;
  onReset: (password: string) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ user, onClose, onReset }) => {
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length >= 4) {
      onReset(newPassword);
    }
  };

  return (
    <div className="fixed inset-0 md-backdrop flex items-center justify-center z-50 p-4">
      <div className="md-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Key className="text-amber-700" size={22} />
              <h3 className="text-xl font-semibold text-slate-900">Resetear contraseña</h3>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors" aria-label="Cerrar">
              ✕
            </button>
          </div>

          <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4">
            <div className="text-slate-900 font-semibold">{user.username}</div>
            <div className="text-slate-600 text-sm">{user.email}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="md-input w-full"
                required
                minLength={4}
                placeholder="Mínimo 4 caracteres"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="md-button md-button--secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="md-button"
                disabled={newPassword.length < 4}
              >
                Resetear Contraseña
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface AuditLogsModalProps {
  user: any;
  onClose: () => void;
}

export const AuditLogsModal: React.FC<AuditLogsModalProps> = ({ user, onClose }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('fraktal_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/admin/audit-logs/user/${user._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'delete_user':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'toggle_active':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'password_reset':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      default:
        return 'text-blue-800 bg-blue-50 border-blue-200';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'delete_user': 'Usuario Eliminado',
      'toggle_active': 'Estado Cambiado',
      'password_reset': 'Contraseña Reseteada',
      'create_user': 'Usuario Creado',
      'update_user': 'Usuario Actualizado'
    };
    return labels[action] || action;
  };

  return (
    <div className="fixed inset-0 md-backdrop flex items-center justify-center z-50 p-4">
      <div className="md-card max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <History className="text-slate-700" size={22} />
              <h3 className="text-xl font-semibold text-slate-900">Historial de auditoría</h3>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-900 transition-colors" aria-label="Cerrar">
              ✕
            </button>
          </div>

          <div className="border border-slate-200 bg-slate-50 rounded-lg p-4 mb-6">
            <div className="text-slate-900 font-semibold">{user.username}</div>
            <div className="text-slate-600 text-sm">{user.email}</div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-600">
              Cargando historial...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-slate-600">
              No hay registros de auditoría para este usuario
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border border-slate-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {new Date(log.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <div className="text-slate-900 text-sm mb-1">{log.details}</div>
                      <div className="text-slate-600 text-xs">
                        Por: <span className="text-blue-700 font-medium">{log.admin_user}</span> ({log.admin_email})
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="md-button md-button--secondary"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
