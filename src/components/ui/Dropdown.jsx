import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown } from 'lucide-react';

export const Dropdown = React.forwardRef(({
  label,
  error,
  options = [], // [{ value, label }]
  className = '',
  id,
  required = false,
  ...props
}, ref) => {
  const { theme } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  const selectClass = isDark ? 'glass-input-dark' : 'glass-input-light';
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
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full py-2.5 pl-4 pr-10 appearance-none bg-slate-900 cursor-pointer ${selectClass} ${
            error
              ? 'border-rose-500/70 focus:border-rose-500 focus:ring-rose-500/20'
              : ''
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className={isDark ? 'bg-[#0d0e18] text-slate-100' : 'bg-white text-slate-800'}
            >
              {opt.label}
            </option>
          ))}
        </select>
        <div className={`absolute right-3.5 flex items-center justify-center pointer-events-none ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
      {error && (
        <span id={`${id}-error`} className={errorClass} role="alert">
          {error}
        </span>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;
