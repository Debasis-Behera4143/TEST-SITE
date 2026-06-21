import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Input = React.forwardRef(({
  label,
  error,
  icon: Icon = null,
  iconRight: IconRight = null,
  className = '',
  id,
  type = 'text',
  required = false,
  ...props
}, ref) => {
  const { theme } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  const inputClass = isDark ? 'glass-input-dark' : 'glass-input-light';
  const labelClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const errorClass = 'text-rose-500 text-xs font-semibold mt-1.5';

  return (
    <div className="w-full flex flex-col align-start text-left">
      {label && (
        <label
          htmlFor={id}
          className={`text-sm font-medium mb-1.5 select-none ${labelClass}`}
        >
          {label}
          {required && <span className="text-brand-pink ml-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className={`absolute left-3.5 flex items-center justify-center pointer-events-none ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <Icon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type={type}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full py-2.5 ${Icon ? 'pl-11' : 'pl-4'} ${
            IconRight ? 'pr-11' : 'pr-4'
          } ${inputClass} ${
            error
              ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
              : ''
          } ${className}`}
          {...props}
        />
        {IconRight && (
          <div className={`absolute right-3.5 flex items-center justify-center pointer-events-none ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <IconRight className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
