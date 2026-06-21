import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

export const RocketSubmission = ({ trigger = false, onFinish }) => {
  const [visible, setVisible] = useState(false);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    if (trigger) {
      setVisible(true);
      setShowStatus(false);
      
      // Animate steps
      const statusTimer = setTimeout(() => {
        setShowStatus(true);
        // Trigger large confetti burst
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }, 1500);

      const endTimer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 4500);

      return () => {
        clearTimeout(statusTimer);
        clearTimeout(endTimer);
      };
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md">
          {/* Stars particles backdrop */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,41,59,0.3)_0%,transparent_70%)] pointer-events-none" />

          {/* Rocket Liftoff Frame */}
          {!showStatus ? (
            <motion.div
              initial={{ y: '80vh', scale: 0.6 }}
              animate={{ y: '-100vh', scale: 1.2 }}
              transition={{ duration: 1.8, ease: 'easeIn' }}
              className="relative flex flex-col items-center"
            >
              {/* Rocket icon */}
              <Rocket className="h-20 w-20 text-brand-pink fill-brand-pink drop-shadow-[0_0_20px_rgba(236,72,153,0.8)] rotate-0" />
              
              {/* Rocket Flame / Smoke particles */}
              <div className="w-6 h-24 bg-gradient-to-t from-transparent via-orange-500 to-yellow-300 rounded-full blur-sm -mt-2 animate-pulse" />
              <div className="flex gap-1.5 mt-2">
                {[1,2,3].map(i => (
                  <span key={i} className="h-4 w-4 rounded-full bg-slate-500/30 animate-ping" />
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6 max-w-md p-8 rounded-3xl border border-brand-cyan/20 bg-slate-900/60 glass-card-dark text-white z-10"
            >
              <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg">
                <ShieldCheck className="h-10 w-10" />
              </div>

              <div className="space-y-2">
                <h3 className="font-display font-extrabold text-2xl tracking-wider text-brand-cyan uppercase animate-pulse">
                  Mission Accomplished
                </h3>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  Your exam answer sheet has successfully left orbit and landed in the teacher's grading ledger!
                </p>
              </div>

              <div className="p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-[10px] uppercase font-bold tracking-widest text-brand-purple">
                Status: Pending AI OCR Scanning
              </div>
            </motion.div>
          )}

          {/* Skip button */}
          <button
            onClick={() => {
              setVisible(false);
              if (onFinish) onFinish();
            }}
            className="absolute bottom-12 px-6 py-2 rounded-xl bg-slate-900/60 border border-white/10 text-xs text-slate-500 font-semibold"
          >
            Skip Animation
          </button>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RocketSubmission;
