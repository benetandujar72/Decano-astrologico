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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="mystic-card max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Key className="text-yellow-400" size={24} />
              <h3 className="text-2xl font-bold text-white">Resetear Contraseña</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <div className="text-white font-semibold">{user.username}</div>
            <div className="text-gray-400 text-sm">{user.email}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mystic-input w-full"
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
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-all"
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
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'toggle_active':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'password_reset':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="mystic-card max-w-3xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <History className="text-purple-400" size={24} />
              <h3 className="text-2xl font-bold text-white">Historial de Auditoría</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 mb-6">
            <div className="text-white font-semibold">{user.username}</div>
            <div className="text-gray-400 text-sm">{user.email}</div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">
              Cargando historial...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No hay registros de auditoría para este usuario
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {new Date(log.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <div className="text-white text-sm mb-1">{log.details}</div>
                      <div className="text-gray-400 text-xs">
                        Por: <span className="text-indigo-400">{log.admin_user}</span> ({log.admin_email})
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
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
