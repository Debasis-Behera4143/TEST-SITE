
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

export const Card = ({
  children,
  className = '',
  hoverable = false,
  glowColor = 'none', // 'blue' | 'purple' | 'cyan' | 'pink' | 'none'
  onClick,
  tabIndex,
  ariaLabel,
  ...props
}) => {
  const { theme, reducedMotion } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  const cardBaseStyle = isDark ? 'glass-card-dark' : 'glass-card-light';
  
  const glowStyles = {
    blue: isDark ? 'shadow-[0_0_20px_rgba(14,165,233,0.15)] border-brand-blue/30' : 'shadow-[0_0_15px_rgba(14,165,233,0.1)] border-brand-blue/20',
    purple: isDark ? 'shadow-[0_0_20px_rgba(168,85,247,0.15)] border-brand-purple/30' : 'shadow-[0_0_15px_rgba(168,85,247,0.1)] border-brand-purple/20',
    cyan: isDark ? 'shadow-[0_0_20px_rgba(6,182,212,0.15)] border-brand-cyan/30' : 'shadow-[0_0_15px_rgba(6,182,212,0.1)] border-brand-cyan/20',
    pink: isDark ? 'shadow-[0_0_20px_rgba(236,72,153,0.15)] border-brand-pink/30' : 'shadow-[0_0_15px_rgba(236,72,153,0.1)] border-brand-pink/20',
    none: '',
  };

  const hoverAnimation = hoverable && !reducedMotion
    ? { y: -4, scale: 1.01, boxShadow: '0 12px 40px 0 rgba(168, 85, 247, 0.15)' }
    : {};

  const clickableProps = onClick ? {
    role: 'button',
    onClick,
    tabIndex: tabIndex ?? 0,
    'aria-label': ariaLabel,
    whileTap: reducedMotion ? {} : { scale: 0.99 }
  } : {};

  return (
    <motion.div
      className={`rounded-2xl p-6 ${cardBaseStyle} ${glowStyles[glowColor]} ${
        hoverable ? 'hover:border-brand-purple/30 transition-colors' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
      whileHover={hoverAnimation}
      {...clickableProps}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;
