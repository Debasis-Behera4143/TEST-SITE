
import { useAuth } from '../../context/AuthContext';

export const Skeleton = ({
  variant = 'rect', // 'rect' | 'circle' | 'text'
  width,
  height,
  className = '',
  ...props
}) => {
  const { theme } = useAuth() || { theme: 'dark' };
  const isDark = theme === 'dark';

  const baseStyles = 'animate-pulse rounded';
  
  const themeStyles = isDark 
    ? 'bg-slate-800/60' 
    : 'bg-slate-200/80';

  const variantStyles = {
    rect: 'rounded-xl',
    circle: 'rounded-full',
    text: 'h-4 w-full rounded',
  };

  const style = {
    width: width || undefined,
    height: height || undefined,
  };

  return (
    <div
      className={`${baseStyles} ${themeStyles} ${variantStyles[variant]} ${className}`}
      style={style}
      {...props}
    />
  );
};

export default Skeleton;
