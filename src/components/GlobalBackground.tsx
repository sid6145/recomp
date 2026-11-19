import React from 'react';
import { m } from 'framer-motion';

/**
 * GlobalBackground Component
 *
 * Implements the "Dark-Luxury Biometric" environment:
 * Layer 1: Tactical Grid - 1px white grid at exactly 3% opacity on bg-neutral-950.
 * Layer 2: Breathing Ambient Mesh - 3 GPU-accelerated motion blobs simulating a 12-15s resting breathing cycle.
 * Layer 3: Matte Noise Texture - SVG feTurbulence grain with mix-blend-overlay to eliminate gradient banding.
 *
 * Sits fixed behind all content (z-[-1]), with pointer-events-none and transform-gpu for 60fps mobile performance.
 */
export const GlobalBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none select-none bg-neutral-950"
    >
      {/* ============================================================ */}
      {/* LAYER 1: BASE & TACTICAL GRID (rgba(255,255,255,0.03))       */}
      {/* ============================================================ */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Subtle vignette mask to soften outer grid edges */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'radial-gradient(circle at 50% 35%, transparent 20%, rgba(10, 10, 10, 0.75) 85%)',
        }}
      />

      {/* ============================================================ */}
      {/* LAYER 2: THE BREATHING AMBIENT MESH (Framer Motion Blobs)    */}
      {/* ============================================================ */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Blob 1: Deep Oceanic Blue (Top-Left) */}
        <m.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.22, 0.15],
            x: [0, 25, 0],
            y: [0, -15, 0],
          }}
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute -top-32 -left-24 w-[520px] h-[520px] sm:w-[700px] sm:h-[700px] rounded-full bg-blue-900/20 blur-[130px] transform-gpu will-change-transform"
        />

        {/* Blob 2: Deep Amethyst / Purple (Top-Right) */}
        <m.div
          animate={{
            scale: [1.15, 1, 1.15],
            opacity: [0.18, 0.12, 0.18],
            x: [0, -20, 0],
            y: [0, 20, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 1.5,
          }}
          className="absolute -top-20 -right-24 w-[480px] h-[480px] sm:w-[650px] sm:h-[650px] rounded-full bg-purple-900/15 blur-[150px] transform-gpu will-change-transform"
        />

        {/* Blob 3: Deep Biometric Emerald Matrix (Mid-Bottom Center) */}
        <m.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.10, 0.18, 0.10],
            x: [0, 15, 0],
            y: [0, 15, 0],
          }}
          transition={{
            duration: 13,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 3,
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[420px] h-[420px] sm:w-[580px] sm:h-[580px] rounded-full bg-emerald-950/20 blur-[140px] transform-gpu will-change-transform"
        />
      </div>

      {/* ============================================================ */}
      {/* LAYER 3: MATTE NOISE TEXTURE (SVG feTurbulence)             */}
      {/* ============================================================ */}
      <svg
        className="absolute inset-0 w-full h-full opacity-30 mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="biometric-noise-filter">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#biometric-noise-filter)" />
      </svg>
    </div>
  );
};
