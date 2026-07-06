'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Premium custom cursor — desktop only.
 * - Outer ring: purple glow that scales on hover over interactive elements
 * - Inner dot: precise center mark with soft trail
 * Disabled on touch devices and on (prefers-reduced-motion: reduce).
 */
export default function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isTouch || reduced || !isDesktop) return;
    setEnabled(true);

    document.documentElement.classList.add('has-custom-cursor');

    const hues = ['cursor-hue-purple', 'cursor-hue-red', 'cursor-hue-green'];
    let hueIdx = 0;
    document.documentElement.classList.add(hues[0]);
    const hueTimer = window.setInterval(() => {
      document.documentElement.classList.remove(hues[hueIdx]);
      hueIdx = (hueIdx + 1) % hues.length;
      document.documentElement.classList.add(hues[hueIdx]);
    }, 10000);

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const move = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const interactive = t.closest('a, button, [role="button"], input, textarea, select, label, summary, [data-cursor="hover"]');
      ringRef.current?.classList.toggle('cursor-ring--hover', !!interactive);
    };

    const down = () => ringRef.current?.classList.add('cursor-ring--down');
    const up = () => ringRef.current?.classList.remove('cursor-ring--down');
    const leave = () => {
      ringRef.current?.classList.add('cursor-hidden');
      dotRef.current?.classList.add('cursor-hidden');
    };
    const enter = () => {
      ringRef.current?.classList.remove('cursor-hidden');
      dotRef.current?.classList.remove('cursor-hidden');
    };

    window.addEventListener('mousemove', move, { passive: true });
    window.addEventListener('mouseover', over, { passive: true });
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    document.addEventListener('mouseleave', leave);
    document.addEventListener('mouseenter', enter);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(hueTimer);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseover', over);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      document.removeEventListener('mouseleave', leave);
      document.removeEventListener('mouseenter', enter);
      document.documentElement.classList.remove('has-custom-cursor');
      hues.forEach((h) => document.documentElement.classList.remove(h));
    };
  }, []);

  if (!enabled) return null;

  return (
    <>
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
