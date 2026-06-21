import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | 'full'
  showCloseButton = true,
  ariaLabelledBy = 'modal-title',
  ...props
}) => {
  const { theme, reducedMotion } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  // Handle escape key press to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-5xl',
    full: 'max-w-full m-4 h-[calc(100vh-2rem)]',
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = reducedMotion
    ? {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
      }
    : {
        hidden: { opacity: 0, scale: 0.95, y: 15 },
        visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 350 } },
        exit: { opacity: 0, scale: 0.95, y: 15, transition: { duration: 0.2 } },
      };

  const modalContent = (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/60 backdrop-blur-md">
        {/* Backdrop for click outside */}
        <motion.div
          className="absolute inset-0 cursor-default"
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={backdropVariants}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal Window */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={ariaLabelledBy}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={modalVariants}
          className={`relative w-full z-10 rounded-2xl border p-6 flex flex-col ${
            sizeStyles[size]
          } ${
            isDark
              ? 'glass-dark border-white/10 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
              : 'glass-light border-slate-200 text-slate-800 shadow-[0_20px_50px_rgba(31,38,135,0.08)]'
          }`}
          {...props}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              {title && (
                <h3
                  id={ariaLabelledBy}
                  className="text-xl font-bold font-display bg-gradient-to-r from-brand-blue via-brand-purple to-brand-cyan bg-clip-text text-transparent"
                >
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isDark
                      ? 'border-white/10 hover:bg-white/5 text-slate-400 hover:text-white'
                      : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
                  }`}
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto max-h-[70vh] pr-1">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
