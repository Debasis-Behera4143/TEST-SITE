import { useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';

export const PhysicsSandbox = ({ theme }) => {
  const canvasRef = useRef(null);
  const [gravity, setGravity] = useState(0.5); // Acceleration
  const [bounciness, setBounciness] = useState(0.75); // Restitution
  const [ballMass, setBallMass] = useState(20); // Ball Radius

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    
    // Physics Ball object
    let ball = {
      x: canvas.width / 2,
      y: 50,
      vx: 2,
      vy: 0,
      radius: ballMass,
      color: '#06b6d4'
    };

    // Floating Formulas as physical obstacle blocks
    let formulas = [
      { text: 'F = ma', x: 80, y: 180, width: 90, height: 40, angle: 0, targetAngle: 0, color: '#a855f7' },
      { text: 'E = mc²', x: 260, y: 220, width: 100, height: 40, angle: 0, targetAngle: 0, color: '#ec4899' },
      { text: 'p = mv', x: 170, y: 300, width: 90, height: 40, angle: 0, targetAngle: 0, color: '#3b82f6' }
    ];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth || 450;
      canvas.height = 360;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const updatePhysics = () => {
      // Apply Gravity
      ball.vy += gravity;
      
      // Apply velocities
      ball.x += ball.vx;
      ball.y += ball.vy;

      // Collision with walls
      if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.vx = -ball.vx * bounciness;
      }
      if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.vx = -ball.vx * bounciness;
      }

      // Collision with floor
      if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.vy = -ball.vy * bounciness;
        ball.vx *= 0.98;
      }
      // Collision with ceiling
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * bounciness;
      }

      // Collision with Floating Formulas
      formulas.forEach((f) => {
        const closestX = Math.max(f.x, Math.min(ball.x, f.x + f.width));
        const closestY = Math.max(f.y, Math.min(ball.y, f.y + f.height));

        const distanceX = ball.x - closestX;
        const distanceY = ball.y - closestY;
        const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

        if (distanceSquared < (ball.radius * ball.radius)) {
          const distance = Math.sqrt(distanceSquared) || 1;
          const overlap = ball.radius - distance;
          
          const normalX = distanceX / distance;
          const normalY = distanceY / distance;

          ball.x += normalX * overlap;
          ball.y += normalY * overlap;

          const dotProduct = (ball.vx * normalX) + (ball.vy * normalY);
          ball.vx = (ball.vx - 2 * dotProduct * normalX) * bounciness;
          ball.vy = (ball.vy - 2 * dotProduct * normalY) * bounciness;

          f.targetAngle = (Math.random() - 0.5) * 0.4;
          f.y += normalY * 10;
        }

        f.angle += (f.targetAngle - f.angle) * 0.08;
        f.targetAngle *= 0.95;
        
        const baseOffset = f.text === 'F = ma' ? 180 : (f.text === 'E = mc²' ? 220 : 300);
        f.y += (baseOffset - f.y) * 0.05;
      });
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw vector Grid
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw formula blocks (No slow CPU shadows)
      formulas.forEach((f) => {
        ctx.save();
        ctx.translate(f.x + f.width / 2, f.y + f.height / 2);
        ctx.rotate(f.angle);

        ctx.fillStyle = theme === 'dark' ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = f.color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-f.width / 2, -f.height / 2, f.width, f.height, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = theme === 'dark' ? '#f1f5f9' : '#1e293b';
        ctx.font = 'bold 13px Fira Code';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.text, 0, 0);
        
        ctx.restore();
      });

      // Draw metallic bouncing ball (Radial gradient without shadowBlur)
      ctx.save();
      const grad = ctx.createRadialGradient(
        ball.x - ball.radius / 3, 
        ball.y - ball.radius / 3, 
        ball.radius / 10, 
        ball.x, 
        ball.y, 
        ball.radius
      );
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#22d3ee');
      grad.addColorStop(1, '#0891b2');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const loop = () => {
      updatePhysics();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    const handleCanvasClick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const dx = clickX - ball.x;
      const dy = clickY - ball.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;

      ball.vx = (dx / dist) * 12;
      ball.vy = (dy / dist) * 12;
    };
    canvas.addEventListener('click', handleCanvasClick);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [gravity, bounciness, ballMass, theme]);

  const handleReset = () => {
    setGravity(0.5);
    setBounciness(0.75);
    setBallMass(20);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">Click sandbox to throw the gravity ball!</span>
        <button 
          onClick={handleReset}
          className="p-1 rounded bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <canvas ref={canvasRef} className="block cursor-crosshair" />
      </div>

      <div className="grid grid-cols-3 gap-4 text-[10px] uppercase font-bold text-slate-400 p-2">
        <div className="space-y-1 text-left">
          <label>Gravity ({gravity}g)</label>
          <input 
            type="range" 
            min="0.1" 
            max="1.5" 
            step="0.1" 
            value={gravity} 
            onChange={(e) => setGravity(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
        </div>
        
        <div className="space-y-1 text-left">
          <label>Bouncy ({Math.round(bounciness*100)}%)</label>
          <input 
            type="range" 
            min="0.3" 
            max="0.95" 
            step="0.05" 
            value={bounciness} 
            onChange={(e) => setBounciness(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-purple"
          />
        </div>

        <div className="space-y-1 text-left">
          <label>Ball Mass ({ballMass}kg)</label>
          <input 
            type="range" 
            min="10" 
            max="35" 
            step="1" 
            value={ballMass} 
            onChange={(e) => setBallMass(parseInt(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-brand-pink"
          />
        </div>
      </div>
    </div>
  );
};

export default PhysicsSandbox;
