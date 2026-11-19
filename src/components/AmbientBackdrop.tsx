import React, { useEffect, useRef, useState } from 'react';
import { useMomentum } from '../context/MomentumContext';

interface Mote {
  x: number;
  y: number;
  size: number;
  speedY: number;
  baseAlpha: number;
  currentAlpha: number;
  fadeSpeed: number;
  colorType: 'emerald' | 'teal' | 'amber';
}

/**
 * AmbientBackdrop Component (src/components/AmbientBackdrop.tsx)
 *
 * Implements the 4-tier stepped atmosphere ladder:
 * - 1.0x (Standby):  Renders nothing (zero GPU overhead).
 * - 1.5x (Ignition): Faint, static top-center radial emerald glow (opacity-40).
 * - 2.0x (Velocity): Dual slow-drifting radial aurora blobs (emerald #10b981 + cyan #06b6d4, <12% opacity).
 * - 3.0x (Overdrive): Full luminous Aurora + lightweight GPU-accelerated <canvas> micro-motes.
 * - data-unstable="true": Shifts accents from calm emerald to tense amber-emerald pulse.
 * - Reactive Surge: Accelerates motes upward & boosts opacity for 600ms on triggerEnergyPulse().
 * - Battery Guard & Frame Stability: Automatically pauses requestAnimationFrame loop when document.hidden === true
 *   or while user is actively scrolling or typing in Food Search.
 * - Non-blocking: Strict pointer-events-none across all layers.
 */
export const AmbientBackdrop: React.FC = () => {
  const { momentumTier, isOverdrive, isUnstable, lastPulseTime } = useMomentum();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const surgeUntilRef = useRef<number>(0);

  // Check prefers-reduced-motion media query
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // React to reactive surge trigger
  useEffect(() => {
    if (lastPulseTime > 0) {
      surgeUntilRef.current = performance.now() + 600;
    }
  }, [lastPulseTime]);

  // Listen to custom window event as well
  useEffect(() => {
    const handlePulseEvent = () => {
      surgeUntilRef.current = performance.now() + 600;
    };
    window.addEventListener('momentum-energy-pulse', handlePulseEvent);
    return () => window.removeEventListener('momentum-energy-pulse', handlePulseEvent);
  }, []);

  // Canvas Micro-Motes Animation Loop (Overdrive Only)
  useEffect(() => {
    if (!isOverdrive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let isVisible = !document.hidden;
    let isScrolling = false;
    let isTyping = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    let typingTimer: ReturnType<typeof setTimeout> | null = null;

    let logicalWidth = window.innerWidth;
    let logicalHeight = window.innerHeight;

    const resize = () => {
      if (!canvas) return;
      const isMobile = window.innerWidth < 768;
      // Cap DPR: 1 on mobile, max 1.5 on desktop
      const dpr = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      logicalWidth = window.innerWidth;
      logicalHeight = window.innerHeight;

      canvas.width = Math.floor(logicalWidth * dpr);
      canvas.height = Math.floor(logicalHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Mobile: 12 motes; Desktop: 28 motes
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 12 : 28;
    const motes: Mote[] = [];
    const colors: Array<'emerald' | 'teal' | 'amber'> = isUnstable
      ? ['emerald', 'amber', 'amber']
      : ['emerald', 'teal', 'emerald'];

    for (let i = 0; i < count; i++) {
      motes.push({
        x: Math.random() * (logicalWidth || 800),
        y: Math.random() * (logicalHeight || 600),
        size: 1.0 + Math.random() * 1.5,
        speedY: 0.35 + Math.random() * 0.45,
        baseAlpha: 0.08 + Math.random() * 0.18,
        currentAlpha: 0.08 + Math.random() * 0.18,
        fadeSpeed: (0.003 + Math.random() * 0.005) * (Math.random() > 0.5 ? 1 : -1),
        colorType: colors[i % colors.length],
      });
    }

    // If reduced motion is requested, render static motes once without animation loop
    if (prefersReducedMotion) {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.shadowBlur = 0;
      for (const m of motes) {
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
        if (isUnstable && (m.colorType === 'amber' || Math.random() > 0.6)) {
          ctx.fillStyle = `rgba(245, 158, 11, ${m.baseAlpha})`;
        } else if (m.colorType === 'teal') {
          ctx.fillStyle = `rgba(6, 182, 212, ${m.baseAlpha})`;
        } else {
          ctx.fillStyle = `rgba(16, 185, 129, ${m.baseAlpha})`;
        }
        ctx.fill();
      }
      return () => {
        window.removeEventListener('resize', resize);
      };
    }

    const handleVisibility = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        lastTime = performance.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Frame-saver: Pause animation loop while scrolling
    const onScroll = () => {
      isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
        lastTime = performance.now();
      }, 150);
    };

    // Frame-saver: Pause animation loop while typing in Food Search or inputs
    const onInput = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        isTyping = true;
        if (typingTimer) clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          isTyping = false;
          lastTime = performance.now();
        }, 300);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('input', onInput, { passive: true });

    let lastTime = performance.now();

    const render = (now: number) => {
      animFrameId = requestAnimationFrame(render);
      // Skip updates when document is hidden or user is scrolling/typing
      if (!isVisible || document.hidden || isScrolling || isTyping) {
        lastTime = now;
        return;
      }

      const dt = Math.min(now - lastTime, 100);
      lastTime = now;

      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
      ctx.shadowBlur = 0;

      const isSurging = now < surgeUntilRef.current;
      const speedMultiplier = isSurging ? 2.8 : 1.0;
      const alphaBoost = isSurging ? 0.35 : 0;

      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];

        // Move upward
        m.y -= m.speedY * (dt / 16.67) * speedMultiplier;

        // Wrap around at top
        if (m.y < -10) {
          m.y = logicalHeight + 5;
          m.x = Math.random() * logicalWidth;
        }

        // Alpha fade oscillation
        m.currentAlpha += m.fadeSpeed;
        if (m.currentAlpha > m.baseAlpha + 0.1) {
          m.fadeSpeed = -Math.abs(m.fadeSpeed);
        } else if (m.currentAlpha < m.baseAlpha - 0.05 || m.currentAlpha < 0.02) {
          m.fadeSpeed = Math.abs(m.fadeSpeed);
        }

        const renderAlpha = Math.min(0.85, m.currentAlpha + alphaBoost);

        // Crisp solid/alpha circles only (zero radial shadow/blur draws inside loop)
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * (isSurging ? 1.3 : 1.0), 0, Math.PI * 2);

        if (isUnstable && (m.colorType === 'amber' || Math.random() > 0.6)) {
          ctx.fillStyle = `rgba(245, 158, 11, ${renderAlpha})`;
        } else if (m.colorType === 'teal') {
          ctx.fillStyle = `rgba(6, 182, 212, ${renderAlpha})`;
        } else {
          ctx.fillStyle = `rgba(16, 185, 129, ${renderAlpha})`;
        }

        ctx.fill();
      }
    };

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('input', onInput);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (scrollTimer) clearTimeout(scrollTimer);
      if (typingTimer) clearTimeout(typingTimer);
    };
  }, [isOverdrive, isUnstable, prefersReducedMotion]);

  // 1.0x (Standby): Renders nothing (zero GPU overhead)
  if (momentumTier <= 1.0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid="ambient-backdrop"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none"
    >
      {/* 1.5x (Ignition): Faint, static top-center radial emerald glow (opacity-40) */}
      {momentumTier === 1.5 && (
        <div
          className="absolute inset-0 opacity-40 transition-opacity duration-700 ease-out"
          style={{
            background:
              'radial-gradient(ellipse 65% 35% at 50% 0%, rgba(16, 185, 129, 0.12), transparent 70%)',
          }}
        />
      )}

      {/* 2.0x (Velocity): Two slow-drifting radial aurora blobs (emerald #10b981 + cyan #06b6d4, <12% opacity) */}
      {momentumTier === 2.0 && (
        <div className="absolute inset-0 transition-opacity duration-700 ease-out">
          <div
            className="absolute -top-32 -left-20 w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.11] transform-gpu will-change-transform md:animate-spin-slow"
            style={{
              background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
              animationDuration: '20s',
            }}
          />
          <div
            className="absolute -top-24 -right-20 w-[550px] h-[550px] rounded-full blur-[140px] opacity-[0.10] transform-gpu will-change-transform md:animate-spin-slow"
            style={{
              background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
              animationDuration: '24s',
              animationDirection: 'reverse',
            }}
          />
        </div>
      )}

      {/* 3.0x (Overdrive): Full Luminous Aurora + <canvas> Micro-Motes */}
      {isOverdrive && (
        <div className="absolute inset-0 transition-opacity duration-700 ease-out">
          {/* Top Aurora Radial Mesh (switches to tense amber-emerald when unstable) */}
          <div
            className="absolute inset-0 transition-all duration-700 ease-out"
            style={{
              background: isUnstable
                ? 'radial-gradient(ellipse 85% 50% at 50% -10%, rgba(245, 158, 11, 0.20), rgba(16, 185, 129, 0.10) 45%, transparent 75%)'
                : 'radial-gradient(ellipse 85% 50% at 50% -10%, rgba(16, 185, 129, 0.22), rgba(6, 182, 212, 0.10) 45%, transparent 80%)',
            }}
          />

          {/* Drifting Ambient Blobs (GPU transform animated on desktop, static on mobile) */}
          <div
            className={`absolute -top-24 left-1/4 w-[500px] h-[500px] rounded-full blur-[130px] opacity-[0.12] transform-gpu will-change-transform md:animate-spin-slow ${
              isUnstable ? 'bg-amber-500/20' : 'bg-emerald-500/20'
            }`}
            style={{ animationDuration: '18s' }}
          />

          <div
            className="absolute -top-20 right-1/4 w-[450px] h-[450px] rounded-full blur-[130px] opacity-[0.10] transform-gpu will-change-transform md:animate-spin-slow"
            style={{
              background: isUnstable
                ? 'radial-gradient(circle, #f59e0b 0%, transparent 70%)'
                : 'radial-gradient(circle, #06b6d4 0%, transparent 70%)',
              animationDuration: '22s',
              animationDirection: 'reverse',
            }}
          />

          {/* Micro-Dot Telemetry Grid */}
          <div className="absolute inset-0 opacity-[0.035] bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

          {/* Lightweight <canvas> Micro-Motes (Always mounts in Overdrive) */}
          <canvas
            ref={canvasRef}
            data-testid="motes-canvas"
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ pointerEvents: 'none' }}
          />
        </div>
      )}
    </div>
  );
};
