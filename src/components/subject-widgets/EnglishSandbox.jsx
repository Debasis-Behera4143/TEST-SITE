import React, { useEffect, useRef, useState } from 'react';
import { Book } from 'lucide-react';

export const EnglishSandbox = ({ theme }) => {
  const canvasRef = useRef(null);
  const [activeQuote, setActiveQuote] = useState("KNOWLEDGE IS POWER");
  const [hoveredWord, setHoveredWord] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let particles = [];
    let bookOpenRatio = 0.0;
    let targetBookOpenRatio = 0.0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth || 450;
      canvas.height = 240;
      initLetters();
    };

    const initLetters = () => {
      particles = [];
      const word = activeQuote;
      const letterWidth = 16;
      const startX = (canvas.width - word.length * letterWidth) / 2;
      const targetY = 180;

      for (let i = 0; i < word.length; i++) {
        const char = word[i];
        if (char === ' ') continue;

        particles.push({
          char,
          x: Math.random() * canvas.width,
          y: -30 - Math.random() * 100,
          targetX: startX + i * letterWidth,
          targetY,
          vx: 0,
          vy: 0,
          gravity: 0.15 + Math.random() * 0.1,
          bounce: 0.4 + Math.random() * 0.2,
          resting: false
        });
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let mouseX = -1000;
    let mouseY = -1000;
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;

      const bookX = canvas.width / 2;
      const bookY = 70;
      const dx = mouseX - bookX;
      const dy = mouseY - bookY;
      if (Math.sqrt(dx*dx + dy*dy) < 80) {
        targetBookOpenRatio = 1.0;
        setHoveredWord(true);
      } else {
        targetBookOpenRatio = 0.0;
        setHoveredWord(false);
      }
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bookOpenRatio += (targetBookOpenRatio - bookOpenRatio) * 0.1;

      // Draw Opening Book (No slow shadows)
      const bookX = canvas.width / 2;
      const bookY = 80;
      const bookWidth = 70;
      const bookHeight = 50;

      ctx.save();
      ctx.strokeStyle = '#ec4899';
      ctx.lineWidth = 3;

      // Cover binder
      ctx.beginPath();
      ctx.moveTo(bookX, bookY - bookHeight / 2);
      ctx.lineTo(bookX, bookY + bookHeight / 2);
      ctx.stroke();

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = theme === 'dark' ? '#f1f5f9' : '#1e293b';
      ctx.fillStyle = theme === 'dark' ? 'rgba(30,41,59,0.9)' : 'rgba(255,255,255,0.95)';
      
      // Left Page
      ctx.beginPath();
      ctx.moveTo(bookX, bookY - bookHeight / 2);
      ctx.bezierCurveTo(
        bookX - bookWidth * 0.4 * bookOpenRatio, bookY - bookHeight * 0.6,
        bookX - bookWidth * 0.8 * bookOpenRatio, bookY - bookHeight * 0.4,
        bookX - bookWidth * bookOpenRatio, bookY - bookHeight * 0.3
      );
      ctx.lineTo(bookX - bookWidth * bookOpenRatio, bookY + bookHeight * 0.2);
      ctx.bezierCurveTo(
        bookX - bookWidth * 0.8 * bookOpenRatio, bookY + bookHeight * 0.1,
        bookX - bookWidth * 0.4 * bookOpenRatio, bookY + bookHeight * 0.4,
        bookX, bookY + bookHeight / 2
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right Page
      ctx.beginPath();
      ctx.moveTo(bookX, bookY - bookHeight / 2);
      ctx.bezierCurveTo(
        bookX + bookWidth * 0.4 * bookOpenRatio, bookY - bookHeight * 0.6,
        bookX + bookWidth * 0.8 * bookOpenRatio, bookY - bookHeight * 0.4,
        bookX + bookWidth * bookOpenRatio, bookY - bookHeight * 0.3
      );
      ctx.lineTo(bookX + bookWidth * bookOpenRatio, bookY + bookHeight * 0.2);
      ctx.bezierCurveTo(
        bookX + bookWidth * 0.8 * bookOpenRatio, bookY + bookHeight * 0.1,
        bookX + bookWidth * 0.4 * bookOpenRatio, bookY + bookHeight * 0.4,
        bookX, bookY + bookHeight / 2
      );
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();

      // Animate Letters
      particles.forEach((p) => {
        if (!p.resting) {
          p.vy += p.gravity;
          p.y += p.vy;
          p.x += (p.targetX - p.x) * 0.05;

          if (p.y > p.targetY) {
            p.y = p.targetY;
            p.vy = -p.vy * p.bounce;
            if (Math.abs(p.vy) < 0.2) {
              p.resting = true;
            }
          }
        } else {
          p.x += (p.targetX - p.x) * 0.1;
          p.y += (p.targetY - p.y) * 0.1;
        }

        ctx.fillStyle = theme === 'dark' ? '#06b6d4' : '#0891b2';
        ctx.font = 'bold 15px Fira Code';
        ctx.textAlign = 'center';
        ctx.fillText(p.char, p.x, p.y);
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeQuote, theme]);

  const swapQuote = (q) => {
    setActiveQuote(q);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">Hover mouse over the book to open pages!</span>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <canvas ref={canvasRef} className="block cursor-pointer" />
      </div>

      <div className="p-4 rounded-xl border border-pink-500/10 bg-pink-500/5 text-xs text-slate-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Book className="h-4.5 w-4.5 text-brand-pink" />
          {hoveredWord ? 'Reading active quotes...' : 'Hover book to read details'}
        </span>
        <div className="flex gap-1">
          {["KNOWLEDGE IS POWER", "EDU TRACK AI"].map((q, i) => (
            <button
              key={i}
              onClick={() => swapQuote(q)}
              className="px-2 py-1 rounded bg-slate-900 border border-white/10 text-[9px] hover:border-brand-pink text-slate-300"
            >
              Quote {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EnglishSandbox;
