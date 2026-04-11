'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import { getUsers, banUser, deleteUser, type AdminUser } from '@/lib/admin-api';
import { Search, ChevronLeft, ChevronRight, Ban, Trash2, RefreshCw } from 'lucide-react';

export function UsersTable() {
  const token = useAdminToken();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getUsers(token, { page, limit, search });
      setUsers(res.users);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / limit);

  const handleBan = async (id: string, name: string) => {
    if (!token || !confirm(`Ban "${name}"? They won't be able to log in.`)) return;
    await banUser(token, id);
    fetchUsers();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!token || !confirm(`Permanently delete "${name}" and all their data?`)) return;
    await deleteUser(token, id);
    fetchUsers();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase text-jet mb-6">Users</h1>

      {/* Search */}
      <div className="relative max-w-md mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jet/30" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-jet/10 bg-white font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/50"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-jet/10">
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">City</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Provider</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-jet/30 mx-auto" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-body text-sm text-jet/40">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-jet/5 hover:bg-jet/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.pictureUrl ? (
                          <img src={user.pictureUrl} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-jet/10 flex items-center justify-center text-xs font-medium text-jet">
                            {user.name[0]}
                          </div>
                        )}
                        <span className="font-body text-sm text-jet font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-jet/60">{user.email}</td>
                    <td className="px-4 py-3 font-body text-sm text-jet/60">{user.city || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-body font-medium ${
                        user.authProvider === 'banned' ? 'bg-red-50 text-red-600' :
                        user.authProvider === 'google' ? 'bg-blue-50 text-blue-600' :
                        'bg-jet/5 text-jet/60'
                      }`}>
                        {user.authProvider}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-jet/50 whitespace-nowrap">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {user.authProvider !== 'banned' && (
                          <button onClick={() => handleBan(user.id, user.name)} className="p-1.5 rounded hover:bg-yellow-50 text-jet/40 hover:text-yellow-600 cursor-pointer" title="Ban user">
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(user.id, user.name)} className="p-1.5 rounded hover:bg-red-50 text-jet/40 hover:text-red-500 cursor-pointer" title="Delete user">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-jet/5">
          <span className="font-body text-xs text-jet/40">{total} users</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="p-1.5 rounded hover:bg-jet/5 disabled:opacity-30 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-body text-xs text-jet/60">{page} / {totalPages || 1}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-jet/5 disabled:opacity-30 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
