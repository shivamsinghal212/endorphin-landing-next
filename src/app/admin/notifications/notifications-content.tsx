'use client';

import { useEffect, useState } from 'react';
import { useAdminToken } from '@/lib/use-admin-token';
import { broadcastNotification, getQueueStatus } from '@/lib/admin-api';
import { Bell, Send, RefreshCw } from 'lucide-react';

export function NotificationsContent() {
  const token = useAdminToken();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [city, setCity] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [queue, setQueue] = useState<{ pending: number; processed: number } | null>(null);

  useEffect(() => {
    if (!token) return;
    getQueueStatus(token).then(setQueue);
  }, [token]);

  const handleSend = async () => {
    if (!token || !title.trim() || !body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await broadcastNotification(token, {
        title: title.trim(),
        body: body.trim(),
        city: city.trim() || undefined,
      });
      setResult(`Sent to ${res.recipientCount} users`);
      setTitle('');
      setBody('');
      setCity('');
    } catch (e) {
      setResult('Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold uppercase text-jet mb-6">Notifications</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Broadcast form */}
        <div className="bg-white rounded-xl border border-jet/10 p-6">
          <h2 className="font-display text-sm font-semibold uppercase text-jet/70 mb-4 flex items-center gap-2">
            <Send className="w-4 h-4" />
            Send Broadcast
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="New events in your city!"
                className="w-full px-3 py-2.5 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/50"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">Body</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Check out 5 new races this weekend..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/50 resize-none"
              />
            </div>
            <div>
              <label className="block font-body text-xs font-medium text-jet/60 mb-1.5">
                City <span className="text-jet/30">(optional — leave empty for all users)</span>
              </label>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full px-3 py-2.5 rounded-lg border border-jet/10 font-body text-sm text-jet placeholder:text-jet/30 focus:outline-none focus:border-signal/50"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-signal text-white text-sm font-body font-medium hover:bg-signal/90 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending...' : 'Send Notification'}
            </button>

            {result && (
              <p className={`font-body text-sm text-center ${result.includes('Failed') ? 'text-red-500' : 'text-green-600'}`}>
                {result}
              </p>
            )}
          </div>
        </div>

        {/* Queue status */}
        <div className="bg-white rounded-xl border border-jet/10 p-6">
          <h2 className="font-display text-sm font-semibold uppercase text-jet/70 mb-4 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Queue Status
          </h2>

          {queue ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-jet/5">
                <span className="font-body text-sm text-jet/60">Pending</span>
                <span className={`font-body text-lg font-semibold ${queue.pending > 0 ? 'text-yellow-600' : 'text-jet'}`}>
                  {queue.pending}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-body text-sm text-jet/60">Processed</span>
                <span className="font-body text-lg font-semibold text-green-600">{queue.processed}</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-20">
              <RefreshCw className="w-5 h-5 animate-spin text-jet/30" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
