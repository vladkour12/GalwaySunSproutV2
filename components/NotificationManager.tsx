import React, { useEffect, useState, useRef } from 'react';
import { Alert } from '../types';
import { Bell, BellOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationManagerProps {
  alerts: Alert[];
}

const NotificationManager: React.FC<NotificationManagerProps> = ({ alerts }) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [showPrompt, setShowPrompt] = useState(false);
  const notifiedIds = useRef<Set<string>>(new Set());

  // Check initial permission
  useEffect(() => {
    if (!('Notification' in window)) {
      console.log('This browser does not support desktop notification');
      return;
    }
    setPermission(Notification.permission);
    if (Notification.permission === 'default') {
        // Show prompt after a short delay to not be annoying immediately on load
        const timer = setTimeout(() => setShowPrompt(true), 2000);
        return () => clearTimeout(timer);
    }
  }, []);

  // Handle incoming alerts
  useEffect(() => {
    if (permission !== 'granted') return;

    alerts.forEach(alert => {
      // Only notify if we haven't seen this alert ID yet
      // We use a simple in-memory set, so refreshes will re-notify (which is usually desired for "overdue" things)
      // To persist across reloads, we'd need localStorage, but that might be annoying if the user saw it but didn't "dismiss" it in data.
      // For now, let's stick to session-based to avoid spam loops, but re-notify on page reload is fine.
      if (!notifiedIds.current.has(alert.id)) {
        
        // Don't notify for "routine" checks to avoid noise, only urgent/warning
        if (alert.type !== 'routine') {
            try {
                new Notification(`Farm Alert: ${alert.title}`, {
                    body: alert.message,
                    icon: '/vite.svg', // Assuming vite logo exists or fallback
                    tag: alert.id // Prevents duplicate notifications for same ID stacking up
                });
            } catch (e) {
                console.error("Notification failed", e);
            }
        }
        notifiedIds.current.add(alert.id);
      }
    });
  }, [alerts, permission]);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      if (result === 'granted') {
        new Notification('Notifications Enabled', {
            body: 'You will now receive alerts for overdue tasks.',
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  const dismissPrompt = () => {
      setShowPrompt(false);
  }

  if (permission !== 'default' || !showPrompt) return null;

  return (
    <AnimatePresence>
        {showPrompt && (
            <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-24 right-6 z-50 bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-teal-500/30 max-w-xs flex flex-col gap-3"
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-teal-400 font-bold">
                        <Bell className="w-5 h-5" />
                        <span>Enable Alerts?</span>
                    </div>
                    <button onClick={dismissPrompt} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <p className="text-sm text-slate-300">
                    Get notified when trays need harvesting, watering, or moving to the next stage.
                </p>
                <div className="flex gap-2">
                    <button 
                        onClick={requestPermission}
                        className="flex-1 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                    >
                        Allow
                    </button>
                    <button 
                        onClick={dismissPrompt}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 px-3 rounded-lg transition-colors"
                    >
                        Later
                    </button>
                </div>
            </motion.div>
        )}
    </AnimatePresence>
  );
};

export default NotificationManager;
