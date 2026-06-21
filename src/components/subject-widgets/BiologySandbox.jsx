import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';

export const BiologySandbox = ({ theme }) => {
  const canvasRef = useRef(null);
  const [pulseRate, setPulseRate] = useState(72);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let animationFrameId;
    let angle = 0;
    let neuronNodes = [];
    const nodeCount = 12; // Reduced node count for speed
    let ecgX = 0;
    let ecgPoints = [];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth || 450;
      canvas.height = 280;
      
      neuronNodes = [];
      for (let i = 0; i < nodeCount; i++) {
        neuronNodes.push({
          x: 40 + Math.random() * (canvas.width - 80),
          y: 40 + Math.random() * (canvas.height - 120),
          radius: 2.5 + Math.random() * 2.5,
          pulse: 0,
          connections: []
        });
      }

      for (let i = 0; i < nodeCount; i++) {
        for (let j = i + 1; j < nodeCount; j++) {
          const dx = neuronNodes[i].x - neuronNodes[j].x;
          const dy = neuronNodes[i].y - neuronNodes[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 85) {
            neuronNodes[i].connections.push(j);
          }
        }
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
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      angle += 0.02;

      // Draw DNA double-helix
      const dnaCenterX = 60;
      const dnaStartY = 20;
      const dnaEndY = canvas.height - 80;
      const helixWidth = 26;
      const rungs = 10; // Reduced rungs count for performance

      for (let i = 0; i < rungs; i++) {
        const t = i / (rungs - 1);
        const y = dnaStartY + t * (dnaEndY - dnaStartY);
        
        const theta = angle + t * Math.PI * 4;
        const xOffset = Math.sin(theta) * helixWidth;
        const zOffset = Math.cos(theta);

        const xA = dnaCenterX + xOffset;
        const xB = dnaCenterX - xOffset;

        ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(xA, y);
        ctx.lineTo(xB, y);
        ctx.stroke();

        const radA = zOffset > 0 ? 5 : 3.5;
        const radB = zOffset < 0 ? 5 : 3.5;

        ctx.fillStyle = zOffset > 0 ? '#06b6d4' : '#0891b2';
        ctx.beginPath();
        ctx.arc(xA, y, radA, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = zOffset < 0 ? '#ec4899' : '#be185d';
        ctx.beginPath();
        ctx.arc(xB, y, radB, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Neurons (No slow shadow effects)
      neuronNodes.forEach((node) => {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 30 && Math.random() < 0.15) {
          node.pulse = 1.0;
        }

        ctx.fillStyle = node.pulse > 0.15 ? '#06b6d4' : (theme === 'dark' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.25)');
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (node.pulse * 1.5), 0, Math.PI * 2);
        ctx.fill();

        node.connections.forEach((targetIdx) => {
          const target = neuronNodes[targetIdx];
          
          ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();

          if (node.pulse > 0.1) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            const sparkX = node.x + (target.x - node.x) * (1 - node.pulse);
            const sparkY = node.y + (target.y - node.y) * (1 - node.pulse);
            ctx.lineTo(sparkX, sparkY);
            ctx.stroke();
          }
        });

        node.pulse *= 0.94;
      });

      // ECG wave line at the bottom
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();

      const waveY = canvas.height - 40;
      ecgX += 2.5; // faster scan
      if (ecgX > canvas.width) {
        ecgX = 0;
        ecgPoints = [];
      }

      let currentHeight = 0;
      const cyclePos = ecgX % 80;
      if (cyclePos > 30 && cyclePos < 35) {
        currentHeight = -10;
      } else if (cyclePos >= 35 && cyclePos < 40) {
        currentHeight = 35;
      } else if (cyclePos >= 40 && cyclePos < 45) {
        currentHeight = -25;
      } else if (cyclePos >= 55 && cyclePos < 65) {
        currentHeight = 8;
      }

      ecgPoints.push({ x: ecgX, y: waveY - currentHeight });
      if (ecgPoints.length > 1) {
        ctx.moveTo(ecgPoints[0].x, ecgPoints[0].y);
        for (let i = 1; i < ecgPoints.length; i++) {
          ctx.lineTo(ecgPoints[i].x, ecgPoints[i].y);
        }
      }
      ctx.stroke();

      if (ecgPoints.length > 0) {
        const last = ecgPoints[ecgPoints.length - 1];
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(last.x, last.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
      if (canvas) canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [pulseRate, theme]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400">Hover nodes on the right to fire electric neural signals!</span>
        <span className="text-emerald-400 font-bold flex items-center gap-1">
          Pulse Rate: {pulseRate} BPM
        </span>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-slate-950/40">
        <canvas ref={canvasRef} className="block cursor-pointer" />
      </div>

      <div className="p-2 text-[10px] uppercase font-bold text-slate-400 text-left space-y-1">
        <label>ECG Pulse Rate (BPM Adjust): {pulseRate}</label>
        <input
          type="range"
          min="60"
          max="120"
          step="1"
          value={pulseRate}
          onChange={(e) => setPulseRate(parseInt(e.target.value))}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>
    </div>
  );
};

export default BiologySandbox;
