import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../database/supabaseClient';
import { 
  GraduationCap, ArrowRight, ShieldCheck, Mail, Lock, Sparkles, User, 
  AlertCircle, Sun, Moon, Zap, ZapOff, UserPlus, BookOpen, Key 
} from 'lucide-react';
import { ThreeBackground } from '../components/ThreeBackground';
import { LoginVault } from '../components/LoginVault';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, theme, toggleTheme, reducedMotion, toggleReducedMotion, user, isLiveMode } = useAuth() || {};

  // Form Mode: login | signup | forgot
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);

  // Tabs for Login: 'credentials' | 'regnumber'
  const [activeTab, setActiveTab] = useState('credentials');
  
  // Input fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [regNumber, setRegNumber] = useState('');

  // Conditional Registration Fields
  const [signUpRole, setSignUpRole] = useState('student'); // 'student' | 'teacher'
  const [className, setClassName] = useState('');

  const [department, setDepartment] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Vault breaking animation states
  const [showVault, setShowVault] = useState(false);
  const [vaultRedirectUrl, setVaultRedirectUrl] = useState('');
  const [selectedAnimationMode, setSelectedAnimationMode] = useState('cricket');

  // Redirect if logged in
  useEffect(() => {
    if (user && !showVault) {
      if (user.role === 'student') navigate('/student-dashboard');
      else if (user.role === 'teacher') navigate('/teacher-dashboard');

    }
  }, [user, navigate, showVault]);

  // Handle Login or Password Reset
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    if (isForgot) {
      // Forgot Password simulation or Supabase call
      try {
        if (isLiveMode && supabase) {
          const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
          if (resetErr) throw resetErr;
        }
        setMessage("Password reset instructions have been dispatched to your email address.");
        setIsForgot(false);
      } catch (err) {
        setError(err.message || "Failed to trigger password reset.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const { error: loginErr } = await login(
      activeTab === 'credentials' ? email : '',
      activeTab === 'credentials' ? password : '',
      activeTab === 'regnumber' ? regNumber : null
    );

    setSubmitting(false);
    if (loginErr) {
      setError(loginErr);
    } else {
      // Trigger Vault Unlock!
      const targetRole = activeTab === 'regnumber' 
        ? 'student' 
        : (email.includes('teacher') || email.includes('admin') ? 'teacher' : 'student');
      setVaultRedirectUrl(`/${targetRole}-dashboard`);
      setShowVault(true);
    }
  };

  // Handle Registration
  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);

    const extra = {};
    if (signUpRole === 'student') {
      extra.className = className;

    } else if (signUpRole === 'teacher') {
      extra.department = department;
    }

    const { error: signUpErr } = await signup(name, email, password, signUpRole, extra);
    setSubmitting(false);
    if (signUpErr) {
      setError(signUpErr);
    } else {
      setMessage("Registration successful! Unlocking vaults...");
      setVaultRedirectUrl(`/${signUpRole}-dashboard`);
      setShowVault(true);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    if (isLiveMode && supabase) {
      setSubmitting(true);
      const { error: oAuthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (oAuthErr) {
        setError(oAuthErr.message);
        setSubmitting(false);
      }
    } else {
      setError("Google Login is only available with a live Supabase backend. Please register a local account.");
    }
  };

  if (showVault) {
    return (
      <LoginVault 
        animationType={selectedAnimationMode} 
        onExplode={() => navigate(vaultRedirectUrl)} 
      />
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      <ThreeBackground active={true} />

      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setIsSignUp(false); setIsForgot(false); navigate('/'); }}>
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan text-white shadow-lg">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="font-display font-extrabold text-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-slate-400">
            EduTrack <span className="text-brand-cyan">AI</span>
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
              theme === 'dark' 
                ? 'bg-slate-900/60 border-white/10 text-brand-cyan hover:border-brand-cyan/40 hover:bg-slate-900' 
                : 'bg-white/60 border-black/10 text-brand-purple hover:border-brand-purple/40 hover:bg-white'
            }`}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            onClick={toggleReducedMotion}
            className={`p-2.5 rounded-xl border transition-all duration-300 cursor-pointer ${
              reducedMotion
                ? 'bg-slate-900/60 border-brand-pink/30 text-brand-pink hover:bg-slate-900 hover:border-brand-pink/60'
                : theme === 'dark'
                  ? 'bg-slate-900/60 border-white/10 text-brand-blue hover:border-brand-blue/40 hover:bg-slate-900'
                  : 'bg-white/60 border-black/10 text-brand-cyan hover:border-brand-cyan/40 hover:bg-white'
            }`}
            title={reducedMotion ? 'Enable Page Animations' : 'Disable Page Animations (Reduced Motion)'}
            aria-label={reducedMotion ? 'Enable Page Animations' : 'Disable Page Animations (Reduced Motion)'}
          >
            {reducedMotion ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5 animate-pulse" />}
          </button>
        </div>
      </header>

      <main className="relative z-10 flex-grow flex flex-col md:flex-row items-center justify-center gap-12 px-6 py-12 max-w-7xl mx-auto w-full">
        
        {/* Left Side: Premium Text Info & Database Connection status */}
        <div className="hidden md:flex flex-col text-left max-w-md">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold mb-6 w-fit ${
            isLiveMode 
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400' 
              : 'border-brand-cyan/20 bg-brand-cyan/10 text-brand-cyan'
          }`}>
            <ShieldCheck className="h-3.5 w-3.5 animate-pulse" />
            <span>{isLiveMode ? "Supabase Live Connection" : "Local Sandbox Environment"}</span>
          </div>

          <h2 className="font-display font-extrabold text-4xl leading-tight">
            {isSignUp 
              ? "Create Your Academic Account" 
              : "Step Into the Future of Academic Assessment"}
          </h2>
          <p className={`mt-4 text-sm font-light leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
            Experience high-definition grading templates, instant OCR evaluation simulations, and dynamic monthly scorecard generation with zero database configuration.
          </p>

          {/* Educational Connection Card (Informative & Premium) */}
          <div className={`mt-8 p-6 rounded-3xl border text-left ${
            theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
          }`}>
            <h4 className="text-sm font-bold flex items-center gap-1.5 mb-3 text-brand-purple">
              <Sparkles className="h-4 w-4 text-brand-cyan animate-pulse" />
              Onboarding Assistant
            </h4>
            <p className={`text-xs font-light leading-relaxed mb-4 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              EduTrack AI runs using actual database data only. To begin:
            </p>
            <ul className="space-y-2 text-xs font-light text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-brand-cyan font-bold">1.</span>
                <span>Select the **Register / Sign Up** option on the portal card.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-cyan font-bold">2.</span>
                <span>Create an **Admin (Teacher)** profile to upload exams.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-cyan font-bold">3.</span>
                <span>Create a **Student** profile to download papers and submit work.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Side: Floating Auth Card */}
        <div className={`w-full max-w-md p-8 rounded-3xl border transition-all ${
          theme === 'dark' ? 'glass-card-dark border-white/5 shadow-2xl' : 'glass-card-light border-black/5 shadow-xl'
        }`}>
          <h3 className={`text-2xl font-display font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {isForgot ? 'Reset Password' : isSignUp ? 'Create Account' : 'Sign In Portal'}
          </h3>
          <p className={`mt-2 text-xs font-light ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {isForgot 
              ? 'Specify your registration email address' 
              : isSignUp 
                ? 'Join your school smart exam portal' 
                : 'Secure academic gateway access'}
          </p>

          {/* Form Messages */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {message && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {/* Main Auth Form */}
          {isSignUp ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleSignUpSubmit} className="mt-6 space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-450">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                      theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-455">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@academy.com"
                    className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                      theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-455">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                      theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                    }`}
                  />
                </div>
              </div>

              {/* Role Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-455 block">Account Role</label>
                <div className="flex gap-2 bg-slate-950/20 p-1 rounded-xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setSignUpRole('student')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      signUpRole === 'student'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🎓 Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setSignUpRole('teacher')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                      signUpRole === 'teacher'
                        ? 'bg-slate-800 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    👩‍🏫 Teacher / Admin
                  </button>
                </div>
              </div>

              {/* Conditional inputs */}
              {signUpRole === 'student' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-455">Class/Grade</label>
                    <div className="relative">
                      <BookOpen className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                        placeholder="Grade 10-A"
                        className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                          theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                        }`}
                      />
                    </div>
                  </div>

                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-455">Department</label>
                  <div className="relative">
                    <BookOpen className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Science, Mathematics, etc."
                      className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                        theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                      }`}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-4 font-bold text-white bg-gradient-to-r from-brand-purple to-brand-cyan rounded-xl shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 disabled:opacity-50 mt-6"
              >
                {submitting ? 'Registering Account...' : 'Sign Up Now'}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          ) : (
            /* SIGN IN OR FORGOT PASSWORD FORM */
            <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-left">
              {isForgot ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@academy.com"
                      className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                        theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                      }`}
                    />
                  </div>
                </div>
              ) : activeTab === 'credentials' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter email address"
                        className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                          theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Password</label>
                      <button
                        type="button"
                        onClick={() => setIsForgot(true)}
                        className="text-xs font-semibold text-brand-cyan hover:underline"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full py-3.5 pl-11 pr-4 text-sm font-light rounded-xl ${
                          theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                        }`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Registration Number</label>
                  <div className="relative">
                    <User className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="REG-2026-XXX"
                      className={`w-full py-3.5 pl-11 pr-4 text-sm font-semibold tracking-wide rounded-xl uppercase ${
                        theme === 'dark' ? 'glass-input-dark' : 'glass-input-light'
                      }`}
                    />
                  </div>
                  <span className={`block text-[10px] ${theme === 'dark' ? 'text-slate-550' : 'text-slate-650'}`}>
                    Input registration numbers generated during student registration.
                  </span>
                </div>
              )}

              {!isForgot && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block text-left">Select Unlock Animation</label>
                  <div className="flex gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                    {['cricket', 'football', 'rocket', 'laser'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setSelectedAnimationMode(mode)}
                        className={`flex-1 py-1.5 text-[9px] font-extrabold rounded-lg capitalize transition-all ${
                          selectedAnimationMode === mode
                            ? 'bg-slate-850 text-white shadow-sm border border-white/10'
                            : 'text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        {mode === 'cricket' ? '🏏 Bat' : mode === 'football' ? '⚽ Kick' : mode === 'rocket' ? '🚀 Ship' : '⚡ Laser'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-4 font-bold text-white bg-gradient-to-r from-brand-purple to-brand-cyan rounded-xl shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 disabled:opacity-50 pt-1"
              >
                {submitting ? 'Authenticating...' : isForgot ? 'Request Reset' : 'Sign In Now'}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          )}

          {/* Social Sign-In (Google OAuth Router) */}
          {!isForgot && !isSignUp && (
            <div className="mt-6 space-y-4">
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-white/5"></div>
                <span className={`flex-shrink mx-4 text-[10px] uppercase font-bold tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>OR</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className={`w-full flex items-center justify-center gap-3 py-3 font-semibold rounded-xl border text-sm transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-white/5 bg-slate-900 hover:bg-slate-950 text-white'
                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.68 14.93 1 12 1 7.35 1 3.39 3.65 1.44 7.5l3.6 2.8C5.96 7.03 8.76 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.34H12v4.44h6.44c-.28 1.48-1.12 2.73-2.38 3.58l3.6 2.8c2.1-1.94 3.83-4.8 3.83-8.48z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.04 10.3c-.24-.72-.37-1.5-.37-2.3s.13-1.58.37-2.3L1.44 2.9C.52 4.73 0 6.8 0 9s.52 4.27 1.44 6.1l3.6-2.8z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.08 7.96-2.93l-3.6-2.8c-1.1.74-2.52 1.18-4.36 1.18-3.24 0-6.04-1.99-7.02-5.26l-3.6 2.8C3.39 20.35 7.35 23 12 23z"
                  />
                </svg>
                Sign In with Google
              </button>
            </div>
          )}

          {/* Quick toggle link */}
          <div className="mt-6 text-center text-xs">
            <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}>
              {isForgot 
                ? 'Back to ' 
                : isSignUp 
                  ? 'Already have an account? ' 
                  : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                if (isForgot) {
                  setIsForgot(false);
                } else {
                  setIsSignUp(!isSignUp);
                }
                setError('');
                setMessage('');
              }}
              className="font-bold text-brand-cyan hover:underline cursor-pointer"
            >
              {isForgot ? 'Sign In' : isSignUp ? 'Sign In' : 'Register / Sign Up'}
            </button>
          </div>

        </div>

      </main>

      <footer className="relative z-10 w-full border-t border-white/5 py-6 bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-light text-slate-500">
          <span>© 2026 EduTrack AI. Encrypted TLS Session.</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Live DB Connection Tunnel active
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Login;
