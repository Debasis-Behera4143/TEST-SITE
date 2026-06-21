import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export const Button = ({
  children,
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  onClick,
  className = '',
  disabled = false,
  loading = false,
  icon: Icon = null,
  iconRight: IconRight = null,
  type = 'button',
  ariaLabel,
  tabIndex = 0,
  ...props
}) => {
  const { reducedMotion } = useAuth() || {};

  const baseStyles = 'inline-flex items-center justify-center font-semibold tracking-wide rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-brand-cyan disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
  };

  const variantStyles = {
    primary: 'bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] hover:shadow-[0_0_25px_rgba(14,165,233,0.5)] border border-white/10',
    secondary: 'glass-dark text-slate-100 hover:bg-white/10 hover:border-white/20 border border-white/10',
    success: 'bg-gradient-to-r from-emerald-500 to-brand-cyan text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] border border-white/10',
    danger: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] hover:shadow-[0_0_25px_rgba(244,63,94,0.5)] border border-white/10',
    ghost: 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent',
  };

  const hoverAnimation = reducedMotion
    ? {}
    : { scale: 1.02, y: -1 };
  
  const tapAnimation = reducedMotion
    ? {}
    : { scale: 0.98 };

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-busy={loading}
      tabIndex={tabIndex}
      whileHover={disabled || loading ? {} : hoverAnimation}
      whileTap={disabled || loading ? {} : tapAnimation}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        Icon && <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      <span>{children}</span>
      {!loading && IconRight && <IconRight className="w-4 h-4 shrink-0" aria-hidden="true" />}
    </motion.button>
  );
};

export default Button;
