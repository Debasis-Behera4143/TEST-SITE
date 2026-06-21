import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';
import Button from './Button';

export const EmptyState = ({
  icon: Icon = Sparkles,
  title = 'No records found',
  description = 'There is nothing to display here right now.',
  actionLabel = null,
  onAction = null,
  className = '',
  iconColorClass = 'text-brand-purple border-brand-purple/20 bg-brand-purple/10',
  ...props
}) => {
  const { theme } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border ${
        isDark ? 'bg-slate-900/20 border-white/5' : 'bg-slate-50 border-slate-100'
      } ${className}`}
      {...props}
    >
      {/* Icon Ring */}
      <div className={`p-4 rounded-2xl border mb-4 shrink-0 shadow-sm ${iconColorClass}`}>
        <Icon className="w-8 h-8 shrink-0" aria-hidden="true" />
      </div>

      {/* Info Texts */}
      <h4 className="text-base font-bold font-display tracking-wide mb-1.5 select-none">
        {title}
      </h4>
      <p className={`text-xs max-w-sm mb-5 leading-relaxed font-sans ${
        isDark ? 'text-slate-400' : 'text-slate-500'
      }`}>
        {description}
      </p>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
