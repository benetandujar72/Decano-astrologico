/**
 * Content for Users Tab with advanced features
 * This will be integrated into AdminDashboard
 */

// FILTERS AND SEARCH BAR
<div className="flex flex-wrap items-center gap-3 mb-6">
  <div className="relative flex-1 min-w-[200px]">
    <input
      type="text"
      placeholder="Buscar usuarios..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && fetchUsers()}
      className="mystic-input pl-10 pr-4 w-full"
    />
    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
  </div>

  {/* Filters */}
  <select
    value={roleFilter}
    onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
    className="mystic-input"
  >
    <option value="">Todos los roles</option>
    <option value="admin">Admin</option>
    <option value="user">Usuario</option>
  </select>

  <select
    value={activeFilter}
    onChange={(e) => { setActiveFilter(e.target.value); setCurrentPage(1); }}
    className="mystic-input"
  >
    <option value="">Todos los estados</option>
    <option value="true">Activos</option>
    <option value="false">Inactivos</option>
  </select>

  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    className="mystic-input"
  >
    <option value="created_at">Fecha creación</option>
    <option value="username">Nombre usuario</option>
    <option value="email">Email</option>
    <option value="role">Rol</option>
  </select>

  <button
    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
    className="px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
    title={`Orden: ${sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}`}
  >
    {sortOrder === 'asc' ? '↑' : '↓'}
  </button>

  <button
    onClick={() => setShowCreateUser(true)}
    className="mystic-button flex items-center gap-2"
  >
    <Plus size={18} />
    Nuevo Usuario
  </button>
</div>

{/* Stats */}
<div className="bg-white/5 rounded-lg p-4 mb-4">
  <div className="text-sm text-gray-400">
    Mostrando {users.length} de {totalUsers} usuarios | Página {currentPage} de {totalPages}
  </div>
</div>

{/* USER LIST */}
{users.length === 0 ? (
  <div className="text-center py-12 text-gray-400">
    No se encontraron usuarios
  </div>
) : (
  <div className="space-y-3">
    {users.map((user) => (
      <div key={user._id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
              {user.username[0].toUpperCase()}
            </div>
            <div>
              <div className="text-white font-semibold flex items-center gap-2">
                {user.username}
                {!user.active && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                    INACTIVO
                  </span>
                )}
              </div>
              <div className="text-gray-400 text-sm">{user.email}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              user.role === 'admin'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}>
              {user.role.toUpperCase()}
            </span>

            {/* Action Buttons */}
            <button
              onClick={() => handleViewAuditLogs(user)}
              className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
              title="Ver historial"
            >
              <History size={18} />
            </button>

            <button
              onClick={() => handleToggleActive(user)}
              className={`p-2 transition-colors ${
                user.active
                  ? 'text-gray-400 hover:text-orange-400'
                  : 'text-gray-400 hover:text-green-400'
              }`}
              title={user.active ? 'Desactivar usuario' : 'Activar usuario'}
            >
              {user.active ? <UserX size={18} /> : <UserCheck size={18} />}
            </button>

            <button
              onClick={() => handleResetPasswordClick(user)}
              className="p-2 text-gray-400 hover:text-yellow-400 transition-colors"
              title="Resetear contraseña"
            >
              <Key size={18} />
            </button>

            <button
              onClick={() => handleEditUser(user)}
              className="p-2 text-gray-400 hover:text-indigo-400 transition-colors"
              title="Editar usuario"
            >
              <Edit size={18} />
            </button>

            <button
              onClick={() => handleDeleteUser(user)}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
              title="Eliminar usuario"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

{/* PAGINATION */}
{totalPages > 1 && (
  <div className="flex items-center justify-center gap-2 mt-6">
    <button
      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
      disabled={currentPage === 1}
      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <ChevronLeft size={18} />
      Anterior
    </button>

    <div className="flex items-center gap-1">
      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        let pageNum;
        if (totalPages <= 5) {
          pageNum = i + 1;
        } else if (currentPage <= 3) {
          pageNum = i + 1;
        } else if (currentPage >= totalPages - 2) {
          pageNum = totalPages - 4 + i;
        } else {
          pageNum = currentPage - 2 + i;
        }

        return (
          <button
            key={pageNum}
            onClick={() => setCurrentPage(pageNum)}
            className={`px-3 py-2 rounded-lg transition-all ${
              currentPage === pageNum
                ? 'mystic-button'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            {pageNum}
          </button>
        );
      })}
    </div>

    <button
      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
      disabled={currentPage === totalPages}
      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      Siguiente
      <ChevronRight size={18} />
    </button>
  </div>
)}
