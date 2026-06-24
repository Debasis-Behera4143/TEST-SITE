import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export const Notification = ({
  type = 'info', // 'success' | 'info' | 'warning' | 'error'
  title,
  message,
  onClose,
  inline = true,
  className = '',
  ...props
}) => {
  const { theme, reducedMotion } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-brand-blue shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  };

  const borderColors = {
    success: isDark ? 'border-emerald-500/20 bg-emerald-500/10 text-slate-200' : 'border-emerald-500/30 bg-emerald-50 text-slate-800',
    info: isDark ? 'border-brand-blue/20 bg-brand-blue/10 text-slate-200' : 'border-brand-blue/30 bg-sky-50 text-slate-800',
    warning: isDark ? 'border-amber-500/20 bg-amber-500/10 text-slate-200' : 'border-amber-500/30 bg-amber-50 text-slate-800',
    error: isDark ? 'border-rose-500/20 bg-rose-500/10 text-slate-200' : 'border-rose-500/30 bg-rose-50 text-slate-800',
  };

  const notificationVariants = reducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        hidden: inline ? { opacity: 0, height: 0 } : { opacity: 0, y: -20, scale: 0.95 },
        visible: inline
          ? { opacity: 1, height: 'auto', transition: { duration: 0.3 } }
          : { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 350 } },
        exit: inline
          ? { opacity: 0, height: 0, transition: { duration: 0.2 } }
          : { opacity: 0, y: -20, scale: 0.95, transition: { duration: 0.2 } },
      };

  return (
    <motion.div
      variants={notificationVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      role="alert"
      className={`rounded-xl border p-4 flex gap-3 ${inline ? 'w-full' : 'fixed top-4 right-4 z-50 max-w-md shadow-lg backdrop-blur-md'} ${borderColors[type]} ${className}`}
      {...props}
    >
      <div className="mt-0.5">{icons[type]}</div>
      <div className="flex-1 text-left">
        {title && <h5 className="font-semibold text-sm leading-tight mb-1 select-none font-display">{title}</h5>}
        {message && <p className="text-xs opacity-90 leading-relaxed font-sans">{message}</p>}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer self-start"
          aria-label="Close alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
};

export default Notification;
