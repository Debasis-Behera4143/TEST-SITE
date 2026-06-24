import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, BrainCircuit, BarChart3, BellRing, Sparkles, ArrowRight, ShieldCheck, Sun, Moon, Zap, ZapOff } from 'lucide-react';
import { ThreeBackground } from '../components/ThreeBackground';
import { useAuth } from '../context/AuthContext';

export const LandingPage = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme, reducedMotion, toggleReducedMotion } = useAuth() || {};
  
  // Custom counting animation state
  const [stats, setStats] = useState({
    students: 0,
    tests: 0,
    average: 0,
    teachers: 0
  });

  useEffect(() => {
    const duration = 2000;
    const steps = 50;
    const intervalTime = duration / steps;
    let step = 0;

    const targetStats = {
      students: 1240,
      tests: 450,
      average: 84.5,
      teachers: 48
    };

    const timer = setInterval(() => {
      step++;
      setStats({
        students: Math.min(Math.round((targetStats.students / steps) * step), targetStats.students),
        tests: Math.min(Math.round((targetStats.tests / steps) * step), targetStats.tests),
        average: parseFloat(Math.min((targetStats.average / steps) * step, targetStats.average).toFixed(1)),
        teachers: Math.min(Math.round((targetStats.teachers / steps) * step), targetStats.teachers)
      });

      if (step >= steps) {
        clearInterval(timer);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, []);

  const handleLoginRedirect = (role) => {
    navigate(`/login?role=${role}`);
  };

  return (
    <div className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden transition-colors duration-500`}>
      {/* 3D Glass Objects Canvas Background */}
      <ThreeBackground active={true} />

      {/* Aurora Layer Overlay */}
      <div className="absolute inset-0 bg-transparent pointer-events-none z-0"></div>

      {/* Header Navigation */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-cyan text-white shadow-lg neon-glow-purple">
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
          
          <button
            onClick={() => navigate('/login')}
            className={`px-5 py-2.5 font-semibold rounded-xl border transition-all duration-300 cursor-pointer ${
              theme === 'dark'
                ? 'bg-slate-900/60 border-white/10 text-white hover:bg-white hover:text-slate-950 hover:border-white'
                : 'bg-white/80 border-slate-200 text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900'
            }`}
          >
            Quick Portal
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-grow flex flex-col justify-center items-center px-6 py-12 max-w-7xl mx-auto text-center">
        
        {/* Glow Chip Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-semibold uppercase tracking-wider mb-6 ${
            theme === 'dark' 
              ? 'bg-brand-purple/10 border-brand-purple/30 text-brand-purple' 
              : 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan'
          }`}
        >
          <Sparkles className="h-3 w-3 animate-pulse" />
          <span>Futuristic Smart Portal 3D v1.2</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="font-display font-extrabold text-5xl md:text-7xl tracking-tight leading-tight max-w-4xl"
        >
          <span className="bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 bg-clip-text text-transparent dark:from-white dark:via-slate-200 dark:to-slate-400">
            EduTrack <span className="bg-gradient-to-r from-brand-cyan via-brand-purple to-brand-pink bg-clip-text text-transparent neon-glow-cyan">AI</span>
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`mt-6 text-lg md:text-xl max-w-2xl font-light leading-relaxed ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Smart Exam Management, Evaluation, Analytics and Student Growth Platform. Powered by deterministic OCR scanning and dynamic insights.
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex flex-wrap justify-center gap-4 w-full"
        >
          <button
            onClick={() => handleLoginRedirect('student')}
            className="group flex items-center gap-2 px-8 py-4 font-bold text-white bg-gradient-to-r from-brand-cyan to-brand-blue rounded-2xl shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-1"
          >
            Student Entrance
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          
          <button
            onClick={() => handleLoginRedirect('teacher')}
            className="group flex items-center gap-2 px-8 py-4 font-bold text-white bg-gradient-to-r from-brand-purple to-brand-pink rounded-2xl shadow-lg hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-1"
          >
            Teacher Entrance
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>


        </motion.div>

        {/* Live Counters */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-20 w-full max-w-5xl"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <p className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Total Students</p>
              <h3 className="mt-2 text-3xl md:text-4xl font-display font-extrabold text-brand-cyan">{stats.students}+</h3>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <p className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Exams Evaluated</p>
              <h3 className="mt-2 text-3xl md:text-4xl font-display font-extrabold text-brand-purple">{stats.tests}+</h3>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <p className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Average Grade</p>
              <h3 className="mt-2 text-3xl md:text-4xl font-display font-extrabold text-brand-pink">{stats.average}%</h3>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <p className={`text-sm uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Active Educators</p>
              <h3 className="mt-2 text-3xl md:text-4xl font-display font-extrabold text-slate-900 dark:text-white">{stats.teachers}+</h3>
            </div>

          </div>
        </motion.section>

        {/* Feature Grid */}
        <section className="mt-24 w-full max-w-5xl">
          <h2 className={`text-3xl font-display font-extrabold mb-12 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Designed for Modern Academic Growth
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className={`p-8 text-left rounded-3xl border animate-float ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <div className="h-12 w-12 rounded-2xl bg-brand-cyan/20 text-brand-cyan flex items-center justify-center mb-6">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>AI OCR Grading Assistant</h4>
              <p className={`mt-3 text-sm font-light leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Scan student handwritten script sheets and compare answers against standard marking keys to extract immediate grading suggestions and personalized highlights.
              </p>
            </div>

            <div className={`p-8 text-left rounded-3xl border animate-float-slow ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <div className="h-12 w-12 rounded-2xl bg-brand-purple/20 text-brand-purple flex items-center justify-center mb-6">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Granular Subject Analytics</h4>
              <p className={`mt-3 text-sm font-light leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Visual dashboards for students and teachers that plot progress curves, highlight strong skills, and flags chapters requiring immediate remediation.
              </p>
            </div>

            <div className={`p-8 text-left rounded-3xl border animate-float-fast ${
              theme === 'dark' ? 'glass-card-dark border-white/5' : 'glass-card-light border-black/5'
            }`}>
              <div className="h-12 w-12 rounded-2xl bg-brand-pink/20 text-brand-pink flex items-center justify-center mb-6">
                <BellRing className="h-6 w-6" />
              </div>
              <h4 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Unified Notification Center</h4>
              <p className={`mt-3 text-sm font-light leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                Seamless alert system integrating local browser push reminders, automated event triggers, and simulated email templates dispatched automatically.
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-white/5 py-8 mt-12 bg-slate-950/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-light">
          <span className={theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}>
            © 2026 EduTrack AI Portal. Built for Premium Smart Evaluation.
          </span>
          <div className="flex gap-6">
            <span className={`inline-flex items-center gap-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Supabase PostgreSQL RLS Enabled
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
