import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { mockDb } from '../database/mockDb';
import { supabase, isLiveMode } from '../database/supabaseClient';

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Request browser push permissions
  const requestPushPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Trigger actual OS Browser Push Notification
  const triggerBrowserPush = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/favicon.ico', // fallback
          badge: '/favicon.ico'
        });
      } catch (err) {
        console.warn("Failed to trigger native Notification:", err);
      }
    }
  }, []);

  // Fetch all notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      if (isLiveMode && supabase) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setNotifications(data || []);
        setUnreadCount((data || []).filter(n => !n.is_read).length);
      } else {
        const data = await mockDb.getNotifications(user.id);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  }, [user]);

  // Mark as read
  const markAsRead = async (notifId) => {
    try {
      if (isLiveMode && supabase) {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notifId);
        if (error) throw error;
      } else {
        await mockDb.markNotificationRead(notifId);
      }
      // Optimistic update
      setNotifications(prev =>
        prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  // Delete notification
  const deleteNotification = async (notifId) => {
    try {
      if (isLiveMode && supabase) {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notifId);
        if (error) throw error;
      } else {
        await mockDb.deleteNotification(notifId);
      }
      setNotifications(prev => prev.filter(n => n.id !== notifId));
      setUnreadCount(prev => {
        const deleted = notifications.find(n => n.id === notifId);
        return deleted && !deleted.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  // Add new notification and trigger browser push
  const createNotification = useCallback(async (title, content, type = 'general') => {
    if (!user) return;
    try {
      const notifData = {
        id: `notif-${Date.now()}`,
        user_id: user.id,
        title,
        content,
        is_read: false,
        type,
        created_at: new Date().toISOString()
      };

      if (isLiveMode && supabase) {
        const { error } = await supabase
          .from('notifications')
          .insert(notifData);
        if (error) throw error;
      } else {
        const db = JSON.parse(localStorage.getItem("edutrack_mock_db"));
        db.notifications.unshift(notifData);
        localStorage.setItem("edutrack_mock_db", JSON.stringify(db));
      }

      // Refresh list
      setNotifications(prev => [notifData, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Trigger standard browser push
      triggerBrowserPush(title, content);
    } catch (err) {
      console.error("Error creating notification:", err);
    }
  }, [user, triggerBrowserPush]);

  // Initial fetch and polling for mock changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 0);

    // Simulating background notifications checking (every 12 seconds)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 12000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    createNotification,
    requestPushPermission
  };
};

export default useNotifications;
