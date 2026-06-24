import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const PaperPlaneNotification = ({ trigger = false, title = '', onFinish }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger) {
      const timer0 = setTimeout(() => {
        setVisible(true);
      }, 0);
      const timer = setTimeout(() => {
        setVisible(false);
        if (onFinish) onFinish();
      }, 4000);
      return () => {
        clearTimeout(timer0);
        clearTimeout(timer);
      };
    }
  }, [trigger, onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: '-100vw', y: '100vh', scale: 0.2, rotate: 45 }}
          animate={{
            x: ['-50vw', '10vw', '75vw', '85vw'],
            y: ['70vh', '40vh', '15vh', '30px'],
            scale: [0.4, 0.8, 1.2, 0.5],
            rotate: [30, 15, -10, -45]
          }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 3.5, ease: 'easeInOut' }}
          className="fixed z-50 pointer-events-none"
          style={{ top: 0, left: 0 }}
        >
          <div className="relative flex flex-col items-center">
            {/* SVG Paper Plane with Cyan Neon Trail */}
            <svg 
              className="w-16 h-16 text-brand-cyan drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            
            {/* Floating text badge below plane */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="px-3 py-1.5 rounded-xl border border-brand-purple/30 bg-slate-900/90 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xl mt-2 whitespace-nowrap"
            >
              📬 Paper Plane Alert: {title || 'New Test Assigned'}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaperPlaneNotification;
