'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import {
  getEvents,
  updateEvent,
  deleteEvent,
  type AdminEvent,
} from '@/lib/admin-api';
import Link from 'next/link';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
  X,
  Check,
  RefreshCw,
  Plus,
} from 'lucide-react';

const DISTANCE_OPTIONS = ['3K', '5K', '10K', '15K', 'HM', 'M', '50K', '65K', '100K', 'Ultra'];

export function EventsTable() {
  const token = useAdminToken();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<AdminEvent>>({});

  const fetchEvents = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getEvents(token, { page, limit, search, source: sourceFilter });
      setEvents(res.events);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search, sourceFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const totalPages = Math.ceil(total / limit);

  const handleDelete = async (id: string, title: string) => {
    if (!token || !confirm(`Delete "${title}"?`)) return;
    await deleteEvent(token, id);
    fetchEvents();
  };

  const startEdit = (event: AdminEvent) => {
    setEditingId(event.id);
    setEditData({ ...event });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!token || !editingId) return;
    await updateEvent(token, editingId, {
      title: editData.title,
      description: editData.description,
      locationName: editData.locationName,
      distanceCategories: editData.distanceCategories,
      isFeatured: editData.isFeatured,
      eventStatus: editData.eventStatus,
    });
    setEditingId(null);
    fetchEvents();
  };

  const toggleTag = (tag: string) => {
    const current = editData.distanceCategories || [];
    setEditData({
      ...editData,
      distanceCategories: current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag],
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold uppercase text-jet">Events</h1>
        <Link
          href="/admin/events/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-signal text-white text-sm font-body font-medium hover:bg-signal/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Event
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-jet/30" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-jet/10 bg-white font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/50"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 rounded-lg border border-jet/10 bg-white font-body text-sm text-jet focus:outline-none cursor-pointer"
        >
          <option value="">All Sources</option>
          <option value="indiarunning">IndiaRunning</option>
          <option value="townscript">Townscript</option>
          <option value="citywoofer">CityWoofer</option>
          <option value="endorphin">Community</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-jet/10">
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Source</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">City</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Updated</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Tags</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-body text-xs font-medium text-jet/50 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin text-jet/30 mx-auto" />
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center font-body text-sm text-jet/40">
                    No events found.
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-jet/5 hover:bg-jet/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      {editingId === event.id ? (
                        <input
                          value={editData.title || ''}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          className="w-full px-2 py-1 rounded border border-jet/20 font-body text-sm"
                        />
                      ) : (
                        <Link href={`/admin/events/${event.id}`} className="font-body text-sm text-jet hover:text-signal line-clamp-1 transition-colors">
                          {event.title}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-body font-medium bg-jet/5 text-jet/60 capitalize">
                        {event.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-jet/60">{event.locationName || '—'}</td>
                    <td className="px-4 py-3 font-body text-xs text-jet/50 whitespace-nowrap">
                      {event.startTime ? new Date(event.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-jet/50 whitespace-nowrap">
                      {event.updatedAt ? new Date(event.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {editingId === event.id ? (
                        <div className="flex flex-wrap gap-1">
                          {DISTANCE_OPTIONS.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => toggleTag(tag)}
                              className={`px-2 py-0.5 rounded text-xs font-body cursor-pointer transition-colors ${
                                (editData.distanceCategories || []).includes(tag)
                                  ? 'bg-signal text-white'
                                  : 'bg-jet/5 text-jet/40 hover:bg-jet/10'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {event.distanceCategories.map((tag) => (
                            <span key={tag} className="px-2 py-0.5 rounded text-xs font-body bg-signal/10 text-signal font-medium">
                              {tag}
                            </span>
                          ))}
                          {event.distanceCategories.length === 0 && (
                            <span className="text-xs font-body text-jet/30">—</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-body font-medium ${
                        event.eventStatus === 'live' ? 'bg-green-50 text-green-600' :
                        event.eventStatus === 'offline' ? 'bg-yellow-50 text-yellow-600' :
                        'bg-jet/5 text-jet/40'
                      }`}>
                        {event.eventStatus || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {editingId === event.id ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit} className="p-1.5 rounded hover:bg-green-50 text-green-600 cursor-pointer" title="Save">
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-jet/5 text-jet/40 cursor-pointer" title="Cancel">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(event)} className="p-1.5 rounded hover:bg-jet/5 text-jet/40 cursor-pointer" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(event.id, event.title)} className="p-1.5 rounded hover:bg-red-50 text-jet/40 hover:text-red-500 cursor-pointer" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-jet/5">
          <span className="font-body text-xs text-jet/40">{total} events</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded hover:bg-jet/5 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-body text-xs text-jet/60">
              {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded hover:bg-jet/5 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
