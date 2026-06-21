import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, X, BookOpen, Award, FileText } from 'lucide-react';
import { mockDb } from '../database/mockDb';
import { supabase, isLiveMode } from '../database/supabaseClient';

const typeIcon = (type) => {
  switch (type) {
    case 'new_test': return <BookOpen className="h-3.5 w-3.5 text-brand-cyan" />;
    case 'result': return <Award className="h-3.5 w-3.5 text-brand-purple" />;
    case 'submission_received': return <FileText className="h-3.5 w-3.5 text-emerald-400" />;
    default: return <Bell className="h-3.5 w-3.5 text-slate-400" />;
  }
};

const typeColor = (type) => {
  switch (type) {
    case 'new_test': return 'border-brand-cyan/20 bg-brand-cyan/5';
    case 'result': return 'border-brand-purple/20 bg-brand-purple/5';
    case 'submission_received': return 'border-emerald-500/20 bg-emerald-500/5';
    default: return 'border-white/5 bg-white/3';
  }
};

const timeAgo = (dateStr) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const NotificationBell = ({ userId, theme }) => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropRef = useRef(null);

  const unread = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await mockDb.getNotifications(userId);
      setNotifications(data || []);
    } catch (err) {
      console.error('NotificationBell fetch error:', err);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    const handleFocus = () => fetchNotifications();
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await mockDb.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Mark read error:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      await mockDb.markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Mark all read error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) fetchNotifications();
  };

  return (
    <div className="relative" ref={dropRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className={`relative p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
          theme === 'dark'
            ? 'bg-slate-900/60 border-white/10 text-slate-300 hover:border-brand-cyan/40 hover:text-brand-cyan'
            : 'bg-white/60 border-black/10 text-slate-600 hover:border-brand-purple/40 hover:text-brand-purple'
        }`}
        title="Notifications"
        aria-label={`Notifications ${unread > 0 ? `(${unread} unread)` : ''}`}
      >
        <Bell className={`h-5 w-5 ${unread > 0 ? 'animate-pulse' : ''}`} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-4.5 min-w-4.5 px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold flex items-center justify-center leading-none border-2 border-slate-950">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className={`absolute right-0 top-12 w-80 rounded-2xl border shadow-2xl z-50 overflow-hidden ${
          theme === 'dark'
            ? 'bg-slate-950/95 backdrop-blur-xl border-white/10'
            : 'bg-white/95 backdrop-blur-xl border-black/10 shadow-slate-200/50'
        }`}>
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-brand-cyan" />
              <span className="text-sm font-bold">Notifications</span>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                  {unread} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-brand-cyan transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-8 w-8 text-slate-600 mb-3" />
                <p className="text-sm font-semibold text-slate-400">No notifications yet</p>
                <p className="text-xs text-slate-600 mt-1">You'll be notified about tests and results here.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer transition-all border-b last:border-b-0 ${
                    theme === 'dark' ? 'border-white/5 hover:bg-white/3' : 'border-black/5 hover:bg-black/3'
                  } ${!n.is_read ? (theme === 'dark' ? 'bg-white/3' : 'bg-brand-cyan/3') : ''}`}
                >
                  {/* Icon */}
                  <div className={`shrink-0 mt-0.5 h-7 w-7 rounded-lg border flex items-center justify-center ${typeColor(n.type)}`}>
                    {typeIcon(n.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-xs font-semibold leading-tight line-clamp-1 ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-brand-cyan mt-1" />
                      )}
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-relaxed line-clamp-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                      {n.content}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
