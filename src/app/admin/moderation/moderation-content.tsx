'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import Link from 'next/link';
import {
  getMessages, deleteMessage, getPhotos, deletePhoto,
  getCommunityEvents, deleteEvent,
  type AdminMessage, type AdminPhoto, type AdminEvent,
} from '@/lib/admin-api';
import {
  MessageSquare, Image as ImageIcon, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, Tent,
} from 'lucide-react';

type Tab = 'messages' | 'photos' | 'community';

export function ModerationContent() {
  const token = useAdminToken();
  const [tab, setTab] = useState<Tab>('messages');

  // Messages state
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [msgTotal, setMsgTotal] = useState(0);
  const [msgPage, setMsgPage] = useState(1);

  // Photos state
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [photoTotal, setPhotoTotal] = useState(0);
  const [photoPage, setPhotoPage] = useState(1);

  // Community events state
  const [communityEvents, setCommunityEvents] = useState<AdminEvent[]>([]);
  const [communityTotal, setCommunityTotal] = useState(0);
  const [communityPage, setCommunityPage] = useState(1);

  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getMessages(token, { page: msgPage, limit: 20 });
      setMessages(res.messages);
      setMsgTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [token, msgPage]);

  const fetchPhotos = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getPhotos(token, { page: photoPage, limit: 20 });
      setPhotos(res.photos);
      setPhotoTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [token, photoPage]);

  const fetchCommunity = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await getCommunityEvents(token, { page: communityPage, limit: 20 });
      setCommunityEvents(res.events);
      setCommunityTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [token, communityPage]);

  useEffect(() => {
    if (tab === 'messages') fetchMessages();
    else if (tab === 'photos') fetchPhotos();
    else fetchCommunity();
  }, [tab, fetchMessages, fetchPhotos, fetchCommunity]);

  const handleDeleteMessage = async (id: string) => {
    if (!token || !confirm('Delete this message?')) return;
    await deleteMessage(token, id);
    fetchMessages();
  };

  const handleDeletePhoto = async (id: string) => {
    if (!token || !confirm('Delete this photo?')) return;
    await deletePhoto(token, id);
    fetchPhotos();
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase text-jet mb-6">Moderation</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-jet/5 rounded-lg p-1 w-fit">
        {[
          { key: 'messages' as Tab, label: 'Messages', icon: MessageSquare },
          { key: 'photos' as Tab, label: 'Photos', icon: ImageIcon },
          { key: 'community' as Tab, label: 'Community Events', icon: Tent },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-body transition-colors cursor-pointer ${
              tab === key ? 'bg-white text-jet font-medium shadow-sm' : 'text-jet/50 hover:text-jet'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="w-5 h-5 animate-spin text-jet/30" />
        </div>
      ) : tab === 'messages' ? (
        <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
          <div className="divide-y divide-jet/5">
            {messages.length === 0 ? (
              <div className="px-4 py-12 text-center font-body text-sm text-jet/40">No messages.</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-jet/[0.02]">
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm text-jet">{msg.content || '[image]'}</p>
                    <p className="font-body text-xs text-jet/40 mt-1">
                      Sender: {msg.senderId.slice(0, 8)}... &middot; Thread: {msg.threadId.slice(0, 8)}... &middot;{' '}
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleString('en-IN') : ''}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteMessage(msg.id)} className="p-1.5 rounded hover:bg-red-50 text-jet/30 hover:text-red-500 cursor-pointer shrink-0" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <Pagination page={msgPage} total={msgTotal} limit={20} onPageChange={setMsgPage} />
        </div>
      ) : tab === 'photos' ? (
        <>
          {photos.length === 0 ? (
            <div className="bg-white rounded-xl border border-jet/10 px-4 py-12 text-center font-body text-sm text-jet/40">
              No photos.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group bg-white rounded-xl border border-jet/10 overflow-hidden">
                  <img src={photo.imageUrl} alt={photo.caption || ''} className="w-full aspect-square object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-full bg-white/90 text-red-500 hover:bg-white cursor-pointer transition-all"
                      title="Delete photo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="px-3 py-2">
                    <p className="font-body text-xs text-jet/40 truncate">
                      {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString('en-IN') : ''} &middot; {photo.uploadedBy.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 bg-white rounded-xl border border-jet/10">
            <Pagination page={photoPage} total={photoTotal} limit={20} onPageChange={setPhotoPage} />
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl border border-jet/10 overflow-hidden">
          <div className="divide-y divide-jet/5">
            {communityEvents.length === 0 ? (
              <div className="px-4 py-12 text-center font-body text-sm text-jet/40">No community events.</div>
            ) : (
              communityEvents.map((evt) => (
                <div key={evt.id} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-jet/[0.02]">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/events/${evt.id}`} className="font-body text-sm text-jet font-medium hover:text-signal transition-colors">
                      {evt.title}
                    </Link>
                    <p className="font-body text-xs text-jet/40 mt-0.5">
                      {evt.locationName || '—'} &middot;{' '}
                      {evt.startTime ? new Date(evt.startTime).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} &middot;{' '}
                      Status: {evt.eventStatus || 'live'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Link href={`/admin/events/${evt.id}`} className="px-3 py-1.5 rounded-lg border border-jet/10 text-xs font-body text-jet/60 hover:bg-jet/5 transition-colors">
                      Review
                    </Link>
                    <button
                      onClick={async () => {
                        if (!token || !confirm(`Delete "${evt.title}"?`)) return;
                        await deleteEvent(token, evt.id);
                        fetchCommunity();
                      }}
                      className="p-1.5 rounded hover:bg-red-50 text-jet/30 hover:text-red-500 cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <Pagination page={communityPage} total={communityTotal} limit={20} onPageChange={setCommunityPage} />
        </div>
      )}
    </div>
  );
}

function Pagination({ page, total, limit, onPageChange }: { page: number; total: number; limit: number; onPageChange: (p: number) => void }) {
  const totalPages = Math.ceil(total / limit);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-jet/5">
      <span className="font-body text-xs text-jet/40">{total} total</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded hover:bg-jet/5 disabled:opacity-30 cursor-pointer">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-body text-xs text-jet/60">{page} / {totalPages || 1}</span>
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1.5 rounded hover:bg-jet/5 disabled:opacity-30 cursor-pointer">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
