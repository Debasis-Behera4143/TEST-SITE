import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ChemistrySandbox = ({ theme }) => {
  const canvasRef = useRef(null);
  const [reactionMsg, setReactionMsg] = useState('Select and click elements to synthesize a chemical compound!');
  const [selectedAtoms, setSelectedAtoms] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let bubbles = [];
    let angle = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth || 450;
      canvas.height = 240;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const delta = 0.03;
      angle += delta;

      // Beaker Left
      ctx.fillStyle = theme === 'dark' ? 'rgba(30, 41, 59, 0.45)' : 'rgba(255, 255, 255, 0.65)';
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 2.5;
      
      ctx.beginPath();
      ctx.moveTo(10, 240);
      ctx.lineTo(10, 180);
      ctx.lineTo(25, 170);
      ctx.lineTo(25, 150);
      ctx.lineTo(35, 150);
      ctx.lineTo(35, 170);
      ctx.lineTo(50, 180);
      ctx.lineTo(50, 240);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.beginPath();
      ctx.moveTo(12, 240);
      ctx.lineTo(12, 195);
      ctx.lineTo(48, 195);
      ctx.lineTo(48, 240);
      ctx.closePath();
      ctx.fill();

      if (Math.random() < 0.12) {
        bubbles.push({
          x: 20 + Math.random() * 20,
          y: 190,
          radius: 1.5 + Math.random() * 3,
          speedY: 1 + Math.random() * 1.2,
          color: 'rgba(168, 85, 247, 0.6)'
        });
      }

      // Orbiting Atoms
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Nucleus (No slow shadows)
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 13, 0, Math.PI * 2);
      ctx.fill();

      // Orbit rings
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 80, 25, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, 80, 25, -Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();

      // Revolving electrons
      const eX1 = centerX + Math.cos(angle) * 80 * Math.cos(Math.PI / 4) - Math.sin(angle) * 25 * Math.sin(Math.PI / 4);
      const eY1 = centerY + Math.cos(angle) * 80 * Math.sin(Math.PI / 4) + Math.sin(angle) * 25 * Math.cos(Math.PI / 4);
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(eX1, eY1, 4.5, 0, Math.PI * 2);
      ctx.fill();

      const eX2 = centerX + Math.cos(-angle * 1.3) * 80 * Math.cos(-Math.PI / 4) - Math.sin(-angle * 1.3) * 25 * Math.sin(-Math.PI / 4);
      const eY2 = centerY + Math.cos(-angle * 1.3) * 80 * Math.sin(-Math.PI / 4) + Math.sin(-angle * 1.3) * 25 * Math.cos(-Math.PI / 4);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(eX2, eY2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Bubbles
      bubbles.forEach((b, idx) => {
        b.y -= b.speedY;
        b.x += Math.sin(b.y / 10) * 0.5;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        if (b.y < 0) {
          bubbles.splice(idx, 1);
        }
      });

      // Floating reactant atoms
      // Sodium
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(80, centerY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Na⁺', 80, centerY + 3);

      // Chlorine
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(canvas.width - 80, centerY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Cl⁻', canvas.width - 80, centerY + 3);

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [theme]);

  const handleAtomsClick = (atom) => {
    const list = [...selectedAtoms];
    if (list.includes(atom)) return;

    list.push(atom);
    setSelectedAtoms(list);

    if (list.length === 1) {
      setReactionMsg(`Selected ${atom === 'Na' ? 'Sodium (Na⁺)' : 'Chlorine (Cl⁻)'}. Select the other element to synthesize!`);
    } else if (list.length === 2) {
      setReactionMsg("Reaction Triggered! Na⁺ + Cl⁻ ➔ NaCl (Table Salt) 🧪💥");
      
      confetti({
        particleCount: 100,
        spread: 60,
        colors: ['#3b82f6', '#10b981', '#ffffff']
      });

      setTimeout(() => {
        setSelectedAtoms([]);
        setReactionMsg("Synthesized NaCl Salt crystals successfully! Select reactant elements to start another reaction.");
      }, 3500);
    }
  };

  return (
    <div className="space-y-4 text-left">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">Click elements below to fuse and synthesize compounds:</span>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <canvas ref={canvasRef} className="block" />
        
        <div className="absolute top-[40%] left-[65px] flex flex-col items-center">
          <button
            onClick={() => handleAtomsClick('Na')}
            disabled={selectedAtoms.includes('Na')}
            className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all shadow ${
              selectedAtoms.includes('Na') ? 'bg-blue-600 text-white' : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-blue-400'
            }`}
          >
            FUSE Na⁺
          </button>
        </div>

        <div className="absolute top-[40%] right-[65px] flex flex-col items-center">
          <button
            onClick={() => handleAtomsClick('Cl')}
            disabled={selectedAtoms.includes('Cl')}
            className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all shadow ${
              selectedAtoms.includes('Cl') ? 'bg-emerald-600 text-white' : 'bg-slate-900 border border-white/10 text-slate-300 hover:border-emerald-400'
            }`}
          >
            FUSE Cl⁻
          </button>
        </div>
      </div>

      <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 text-xs text-slate-300 flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-brand-purple shrink-0 animate-pulse" />
        <span>{reactionMsg}</span>
      </div>

      <div className="grid grid-cols-5 gap-2 pt-2 text-center text-[10px] font-bold">
        {[
          { symbol: 'H', name: 'Hydrogen', type: 'nonmetal', color: 'border-cyan-500 bg-cyan-500/10 text-cyan-400' },
          { symbol: 'He', name: 'Helium', type: 'noble', color: 'border-purple-500 bg-purple-500/10 text-purple-400' },
          { symbol: 'Li', name: 'Lithium', type: 'alkali', color: 'border-pink-500 bg-pink-500/10 text-pink-400' },
          { symbol: 'Be', name: 'Beryllium', type: 'alkaline', color: 'border-yellow-500 bg-yellow-500/10 text-yellow-400' },
          { symbol: 'B', name: 'Boron', type: 'metalloid', color: 'border-orange-500 bg-orange-500/10 text-orange-400' }
        ].map((el, i) => (
          <div key={i} className={`p-2 rounded-lg border hover:scale-105 transition-all cursor-pointer ${el.color}`}>
            <span className="block text-sm">{el.symbol}</span>
            <span className="text-[7px] font-light block mt-0.5">{el.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChemistrySandbox;
