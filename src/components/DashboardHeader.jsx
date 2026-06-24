import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Zap, ZapOff, LogOut } from 'lucide-react';

export const DashboardHeader = ({
  roleLabel = '',
  roleColorClass = 'text-brand-purple bg-brand-purple/20 border-brand-purple/40',
  statsContainer = null,
  subtitle = null,
  nameSuffix = null,
  notificationSlot = null,
}) => {
  const { user, logout, theme, toggleTheme, reducedMotion, toggleReducedMotion } = useAuth() || {};

  if (!user) return null;

  return (
    <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 mb-8 transition-colors ${
      theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
    }`}>
      {/* Left Profile Info */}
      <div className="flex items-center gap-4 w-full md:w-auto">
        <img
          src={user.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`}
          alt={`${user.name}'s avatar`}
          className="h-16 w-16 rounded-2xl bg-indigo-500/20 shadow-md border border-white/10 shrink-0 select-none"
        />
        <div className="text-left min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display font-extrabold text-2xl tracking-tight truncate max-w-[180px] sm:max-w-xs">{user.name}</h2>
            {nameSuffix}
            {roleLabel && (
              <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold shrink-0 ${roleColorClass}`}>
                {roleLabel}
              </span>
            )}
          </div>
          {subtitle ? (
            subtitle
          ) : (
            <p className={`text-xs font-light mt-1 truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {user.email}
            </p>
          )}
        </div>
      </div>

      {/* Middle/Stats Section */}
      {statsContainer && (
        <div className="w-full md:w-auto flex flex-wrap justify-start md:justify-end gap-4 md:gap-6 border-t border-b border-white/5 py-4 md:py-0 md:border-none">
          {statsContainer}
        </div>
      )}

      {/* Right Action Settings Panel */}
      <div className="flex items-center justify-end gap-3 w-full md:w-auto shrink-0">
        {/* Notification Bell slot */}
        {notificationSlot}
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
            theme === 'dark'
              ? 'bg-slate-900/60 border-white/10 text-brand-cyan hover:border-brand-cyan/40 hover:bg-slate-900'
              : 'bg-white/60 border-slate-200 text-brand-purple hover:border-brand-purple/40 hover:bg-white'
          }`}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Reduced Motion Toggle Button */}
        <button
          onClick={toggleReducedMotion}
          className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
            reducedMotion
              ? 'bg-slate-900/60 border-brand-pink/30 text-brand-pink hover:bg-slate-900 hover:border-brand-pink/60'
              : theme === 'dark'
                ? 'bg-slate-900/60 border-white/10 text-brand-blue hover:border-brand-blue/40 hover:bg-slate-900'
                : 'bg-white/60 border-slate-200 text-brand-cyan hover:border-brand-cyan/40 hover:bg-white'
          }`}
          title={reducedMotion ? 'Enable Page Animations' : 'Disable Page Animations (Reduced Motion)'}
          aria-label={reducedMotion ? 'Enable Page Animations' : 'Disable Page Animations (Reduced Motion)'}
        >
          {reducedMotion ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5 animate-pulse" />}
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
            theme === 'dark'
              ? 'border-white/5 bg-slate-950/40 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 text-slate-400'
              : 'border-slate-200 bg-white/60 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-600 text-slate-600'
          }`}
          title="Sign Out"
          aria-label="Sign Out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default DashboardHeader;
