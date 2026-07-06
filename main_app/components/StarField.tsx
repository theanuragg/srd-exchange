'use client';
import { useRef, useEffect } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  color: string;
  angle: number; // initial angle for rotation
  distance: number; // distance from center
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const rotationRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isMobile = window.innerWidth < 768;
    const STAR_COUNT = isMobile ? 500 : 1000;
    const ROTATION_SPEED = (2 * Math.PI) / (240 * 60); // 1 full rotation every 240s at 60fps
    const PURPLE_CHANCE = 0.05;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      ctx!.scale(dpr, dpr);
      initStars();
    }

    function initStars() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const centerX = w / 2;
      const centerY = h / 2;
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY) * 1.2;

      starsRef.current = [];

      for (let i = 0; i < STAR_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * maxDist;
        const isPurple = Math.random() < PURPLE_CHANCE;

        starsRef.current.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          size: 0.5 + Math.random() * 1.5,
          opacity: 0.3 + Math.random() * 0.7,
          color: isPurple ? '#7B2FF7' : '#FFFFFF',
          angle,
          distance,
        });
      }
    }

    function draw() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const centerX = w / 2;
      const centerY = h / 2;

      ctx!.clearRect(0, 0, w, h);

      rotationRef.current += ROTATION_SPEED;

      for (const star of starsRef.current) {
        // Rotate around center
        const rotatedX = centerX + (star.distance * (Math.cos(star.angle + rotationRef.current)));
        const rotatedY = centerY + (star.distance * (Math.sin(star.angle + rotationRef.current)));

        // Cull off-screen stars
        if (rotatedX < -2 || rotatedX > w + 2 || rotatedY < -2 || rotatedY > h + 2) {
          continue;
        }

        ctx!.beginPath();
        ctx!.arc(rotatedX, rotatedY, star.size, 0, Math.PI * 2);
        ctx!.fillStyle = star.color;
        ctx!.globalAlpha = star.opacity;
        ctx!.fill();
      }

      ctx!.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
