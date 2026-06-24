import { useEffect, useRef, useState } from 'react';
import { Compass } from 'lucide-react';

export const MathSandbox = ({ theme }) => {
  const canvasRef = useRef(null);
  const [trigFrequency, setTrigFrequency] = useState(0.05);
  const [trigAmplitude, setTrigAmplitude] = useState(40);
  const [geometryAssembled, setGeometryAssembled] = useState(false);
  const [assembleProgress, setAssembleProgress] = useState(1.0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let angleX = 0.01;
    let angleY = 0.015;
    let waveOffset = 0;

    let vertices = [
      { x: -1, y: -1, z: -1 },
      { x: 1, y: -1, z: -1 },
      { x: 1, y: 1, z: -1 },
      { x: -1, y: 1, z: -1 },
      { x: -1, y: -1, z: 1 },
      { x: 1, y: -1, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: -1, y: 1, z: 1 }
    ];

    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth || 450;
      canvas.height = 260;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = (e.clientX - rect.left) / canvas.width - 0.5;
      mouseY = (e.clientY - rect.top) / canvas.height - 0.5;
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    const project = (v) => {
      const zoom = 50;
      const distance = 4;
      const x = v.x * zoom / (v.z + distance) + canvas.width / 4;
      const y = v.y * zoom / (v.z + distance) + canvas.height / 2.5;
      return { x, y };
    };

    const rotateX = (v, theta) => {
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      return {
        x: v.x,
        y: v.y * cos - v.z * sin,
        z: v.y * sin + v.z * cos
      };
    };

    const rotateY = (v, theta) => {
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      return {
        x: v.x * cos + v.z * sin,
        y: v.y,
        z: -v.x * sin + v.z * cos
      };
    };

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      waveOffset -= 0.05;

      // Draw Trigonometric wave (No slow shadows)
      ctx.save();
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      
      const waveStartX = canvas.width / 2;
      const waveStartY = canvas.height / 2.5;
      
      for (let x = 0; x < canvas.width / 2; x++) {
        const y = waveStartY + Math.sin(x * trigFrequency + waveOffset) * trigAmplitude;
        if (x === 0) ctx.moveTo(waveStartX + x, y);
        else ctx.lineTo(waveStartX + x, y);
      }
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.moveTo(waveStartX, waveStartY);
      ctx.lineTo(canvas.width, waveStartY);
      ctx.stroke();

      // Project and draw Cube (No slow shadows)
      angleX += mouseX * 0.05 + 0.005;
      angleY += mouseY * 0.05 + 0.008;

      let rotatedVertices = vertices.map(v => rotateX(rotateY(v, angleY), angleX));

      edges.forEach(([uIdx, vIdx]) => {
        const p1 = project(rotatedVertices[uIdx]);
        const p2 = project(rotatedVertices[vIdx]);

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      });

      rotatedVertices.forEach((v) => {
        const proj = project(v);
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw Geometry assembly at the bottom (Pyramid)
      if (geometryAssembled) {
        ctx.save();
        ctx.strokeStyle = 'rgba(236,72,153,0.85)';
        ctx.lineWidth = 2;
        
        const pyX = canvas.width / 2;
        const pyY = canvas.height - 40;
        
        ctx.beginPath();
        ctx.moveTo(pyX - 40, pyY);
        ctx.lineTo(pyX + 40, pyY);
        ctx.lineTo(pyX + 10, pyY - 20);
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#ec4899';

        ctx.beginPath();
        ctx.moveTo(pyX - 40, pyY);
        ctx.lineTo(pyX, pyY - (60 * assembleProgress));

        ctx.moveTo(pyX + 40, pyY);
        ctx.lineTo(pyX, pyY - (60 * assembleProgress));

        ctx.moveTo(pyX + 10, pyY - 20);
        ctx.lineTo(pyX, pyY - (60 * assembleProgress));
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [trigFrequency, trigAmplitude, geometryAssembled, assembleProgress, theme]);

  const triggerAssembly = () => {
    setGeometryAssembled(true);
    setAssembleProgress(0);
    
    let prog = 0;
    const interval = setInterval(() => {
      prog += 0.05;
      setAssembleProgress(prog);
      if (prog >= 1.0) {
        clearInterval(interval);
      }
    }, 30);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">Move mouse over left canvas to rotate the 3D dimensions!</span>
        <button
          onClick={triggerAssembly}
          className="px-3 py-1 rounded bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center gap-1"
        >
          <Compass className="h-3.5 w-3.5" /> Assemble pyramid
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <canvas ref={canvasRef} className="block cursor-move" />
      </div>

      <div className="grid grid-cols-2 gap-4 p-2 text-[10px] font-bold uppercase text-slate-400">
        <div className="space-y-1 text-left">
          <label>Wave Frequency</label>
          <input
            type="range"
            min="0.02"
            max="0.12"
            step="0.01"
            value={trigFrequency}
            onChange={(e) => setTrigFrequency(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-purple"
          />
        </div>

        <div className="space-y-1 text-left">
          <label>Wave Amplitude</label>
          <input
            type="range"
            min="10"
            max="60"
            step="5"
            value={trigAmplitude}
            onChange={(e) => setTrigAmplitude(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
        </div>
      </div>
    </div>
  );
};

export default MathSandbox;
