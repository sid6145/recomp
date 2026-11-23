import React, { useState, useCallback } from 'react';
import { useHaptics } from '../hooks/useHaptics';

export interface BrandLogoProps {
  variant?: 'icon-only' | 'horizontal' | 'app-icon';
  animate?: boolean;
  interactive?: boolean;
  size?: number;
  className?: string;
  onClick?: () => void;
}

/**
 * Official Material Design 3 (Material You) Brand Logo for Recomp
 *
 * Geometry & Rigging Specification:
 * - ViewBox: 0 0 100 100
 * - Elbow Pivot: Exact coordinates (38, 44) with overlapping circular joint (r=5.5)
 * - Shoulder Pivot: Exact coordinates (45, 38)
 * - Three segmented progress arcs in M3 semantic tokens:
 *     - Track / Secondary Container: var(--md-secondary-container)
 *     - Primary Calorie Arc: var(--md-primary)
 *     - Protein / Tertiary Arc: var(--md-tertiary)
 * - Stylized Flexing Figure in var(--md-primary) & var(--md-secondary)
 * - Micro-flex animation on tap/hover with 450ms M3 spring
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'icon-only',
  animate = false,
  interactive = false,
  size,
  className = '',
  onClick,
}) => {
  const [isFlexing, setIsFlexing] = useState(false);
  const haptics = useHaptics();

  const handleInteraction = useCallback(() => {
    if (!interactive && !onClick) return;
    haptics.tick();
    setIsFlexing(true);
    setTimeout(() => setIsFlexing(false), 460);
    onClick?.();
  }, [interactive, onClick, haptics]);

  const defaultSize = variant === 'horizontal' ? 32 : variant === 'app-icon' ? 64 : 40;
  const dimension = size ?? defaultSize;

  const animationClass = animate ? 'recomp-entrance' : isFlexing ? 'recomp-flexing' : '';

  const svgContent = (
    <svg
      viewBox="0 0 100 100"
      width={dimension}
      height={dimension}
      className={`recomp-brand-svg shrink-0 overflow-visible select-none ${animationClass}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Recomp Logo"
    >
      <defs>
        <style>{`
          .recomp-brand-svg {
            display: inline-block;
          }
          /* GPU-composited transform group setups */
          .recomp-ring-arc {
            transform-origin: 50px 50px;
          }
          .recomp-torso {
            transform-origin: 52px 52px;
          }
          .recomp-bicep {
            transform-origin: 45px 38px;
          }
          .recomp-forearm {
            transform-origin: 38px 44px;
          }

          /* Cold Launch Entrance Animation (750ms M3 Emphasized Decelerate) */
          .recomp-entrance .recomp-ring-arc-1 {
            stroke-dasharray: 45 100;
            stroke-dashoffset: 45;
            animation: recomp-ring-sweep-1 750ms cubic-bezier(0.05, 0.7, 0.1, 1) forwards;
          }
          .recomp-entrance .recomp-ring-arc-2 {
            stroke-dasharray: 28 100;
            stroke-dashoffset: 28;
            animation: recomp-ring-sweep-2 750ms cubic-bezier(0.05, 0.7, 0.1, 1) forwards 60ms;
          }
          .recomp-entrance .recomp-ring-arc-3 {
            stroke-dasharray: 18 100;
            stroke-dashoffset: 18;
            animation: recomp-ring-sweep-3 750ms cubic-bezier(0.05, 0.7, 0.1, 1) forwards 120ms;
          }
          .recomp-entrance .recomp-forearm {
            animation: recomp-arm-curl 750ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          }
          .recomp-entrance .recomp-bicep {
            animation: recomp-bicep-swell 750ms cubic-bezier(0.05, 0.7, 0.1, 1) forwards;
          }
          .recomp-entrance .recomp-torso {
            animation: recomp-torso-lift 750ms cubic-bezier(0.2, 0, 0, 1) forwards;
          }

          /* Interactive Micro-Flex Animation (450ms M3 Snappy Spring) */
          .recomp-flexing .recomp-forearm {
            animation: recomp-micro-curl 450ms cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .recomp-flexing .recomp-bicep {
            animation: recomp-micro-swell 450ms cubic-bezier(0.2, 0, 0, 1);
          }
          .recomp-flexing .recomp-torso {
            animation: recomp-micro-lift 450ms cubic-bezier(0.2, 0, 0, 1);
          }

          @keyframes recomp-ring-sweep-1 {
            0% { stroke-dashoffset: 45; opacity: 0; }
            30% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes recomp-ring-sweep-2 {
            0% { stroke-dashoffset: 28; opacity: 0; }
            30% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }
          @keyframes recomp-ring-sweep-3 {
            0% { stroke-dashoffset: 18; opacity: 0; }
            30% { opacity: 1; }
            100% { stroke-dashoffset: 0; opacity: 1; }
          }

          @keyframes recomp-arm-curl {
            0% { transform: rotate(28deg); }
            65% { transform: rotate(-7deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes recomp-bicep-swell {
            0% { transform: scale(1, 1); }
            60% { transform: scale(1.07, 1.20); }
            100% { transform: scale(1.03, 1.12); }
          }
          @keyframes recomp-torso-lift {
            0% { transform: translateY(1px); }
            55% { transform: translateY(-1.5px); }
            100% { transform: translateY(0px); }
          }

          @keyframes recomp-micro-curl {
            0% { transform: rotate(0deg); }
            45% { transform: rotate(-10deg); }
            80% { transform: rotate(3deg); }
            100% { transform: rotate(0deg); }
          }
          @keyframes recomp-micro-swell {
            0% { transform: scale(1.03, 1.12); }
            45% { transform: scale(1.10, 1.25); }
            100% { transform: scale(1.03, 1.12); }
          }
          @keyframes recomp-micro-lift {
            0% { transform: translateY(0); }
            45% { transform: translateY(-1.5px); }
            100% { transform: translateY(0); }
          }

          @media (prefers-reduced-motion: reduce) {
            .recomp-ring-arc-1,
            .recomp-ring-arc-2,
            .recomp-ring-arc-3,
            .recomp-forearm,
            .recomp-bicep,
            .recomp-torso {
              animation: none !important;
              transform: none !important;
              stroke-dashoffset: 0 !important;
            }
          }
        `}</style>
      </defs>

      {/* 1. App Icon Squircle Backdrop (Only in variant="app-icon") */}
      {variant === 'app-icon' && (
        <rect
          width="100"
          height="100"
          rx="28"
          fill="var(--md-surface-container, #1c211e)"
          className="transition-colors duration-300"
        />
      )}

      {/* 2. Outer Calorie & Macro Progress Ring (3 Segmented Arcs with Rounded Caps) */}
      <g className="recomp-rings" fill="none" strokeWidth="5.5" strokeLinecap="round">
        {/* Arc 1: Primary Calorie Arc (Sweeps around right/top: ~45% length) */}
        <circle
          cx="50"
          cy="50"
          r="41"
          pathLength="100"
          stroke="var(--md-primary, #1e6b52)"
          strokeDasharray="45 100"
          strokeDashoffset="0"
          transform="rotate(-90 50 50)"
          className="recomp-ring-arc recomp-ring-arc-1 transition-colors duration-300"
        />

        {/* Arc 2: Carbs & Base Track Arc (Sweeps around bottom: ~28% length) */}
        <circle
          cx="50"
          cy="50"
          r="41"
          pathLength="100"
          stroke="var(--md-secondary-container, #cee9da)"
          strokeDasharray="28 100"
          strokeDashoffset="0"
          transform="rotate(82 50 50)"
          className="recomp-ring-arc recomp-ring-arc-2 transition-colors duration-300"
        />

        {/* Arc 3: Protein / Tertiary Arc (Sweeps around top-left: ~18% length) */}
        <circle
          cx="50"
          cy="50"
          r="41"
          pathLength="100"
          stroke="var(--md-tertiary, #3e6374)"
          strokeDasharray="18 100"
          strokeDashoffset="0"
          transform="rotate(195 50 50)"
          className="recomp-ring-arc recomp-ring-arc-3 transition-colors duration-300"
        />
      </g>

      {/* 3. Stylized Flexing Figure Group */}
      <g className="recomp-figure">
        {/* Torso & Core */}
        <g className="recomp-torso">
          {/* Base Torso Pill */}
          <rect
            x="44"
            y="37"
            width="17"
            height="27"
            rx="8.5"
            fill="var(--md-primary, #1e6b52)"
            className="transition-colors duration-300"
          />
          {/* Subtle Secondary Tonal Shading on Torso */}
          <path
            d="M 52 38 Q 60 44 60 55 L 60 62 Q 57 64 53 64 Z"
            fill="var(--md-secondary, #4c6358)"
            opacity="0.32"
          />

          {/* Supporting Right Arm on Hip (Relaxed Stadium Pill) */}
          <path
            d="M 60 41 Q 68 47 67 54 Q 66 59 61 57"
            fill="none"
            stroke="var(--md-primary, #1e6b52)"
            strokeWidth="5"
            strokeLinecap="round"
            className="transition-colors duration-300"
          />

          {/* Material 3 Geometric Head */}
          <circle
            cx="52.5"
            cy="24"
            r="8.5"
            fill="var(--md-primary, #1e6b52)"
            className="transition-colors duration-300"
          />
          {/* Subtle Head Tonal Specular Cheek/Jaw Layer */}
          <path
            d="M 52.5 16 A 8.5 8.5 0 0 1 60 27 Q 56 26 52.5 24 Z"
            fill="var(--md-secondary, #4c6358)"
            opacity="0.35"
          />
        </g>

        {/* Articulated Bicep & Arm Rigging */}
        <g className="recomp-arm-group">
          {/* Upper Arm & Bicep Peak (Anchored at Shoulder Pivot: 45, 38) */}
          <g className="recomp-bicep">
            {/* Upper Arm Segment */}
            <path
              d="M 45 37 L 38 44"
              stroke="var(--md-primary, #1e6b52)"
              strokeWidth="9"
              strokeLinecap="round"
              className="transition-colors duration-300"
            />
            {/* Bicep Muscle Peak (Swelling Arc on Upper Arm Contour) */}
            <path
              d="M 46 34 Q 40 37 38 43"
              fill="none"
              stroke="var(--md-primary, #1e6b52)"
              strokeWidth="4"
              strokeLinecap="round"
              className="transition-colors duration-300"
            />
          </g>

          {/* Forearm & Clenched Fist (Anchored Strictly at Elbow Pivot: 38, 44) */}
          <g className="recomp-forearm">
            {/* Overlapping Elbow Ball Joint (Exact radius 5.5 at 38, 44 for Zero Gap) */}
            <circle
              cx="38"
              cy="44"
              r="5.5"
              fill="var(--md-primary, #1e6b52)"
              className="transition-colors duration-300"
            />

            {/* Forearm Body (Reaches upward toward clenched fist) */}
            <path
              d="M 38 44 L 38 29"
              stroke="var(--md-secondary, #4c6358)"
              strokeWidth="8.5"
              strokeLinecap="round"
              className="transition-colors duration-300"
            />

            {/* Forearm Primary Highlight Strip */}
            <path
              d="M 36.5 42 L 36.5 30"
              stroke="var(--md-primary, #1e6b52)"
              strokeWidth="3"
              strokeLinecap="round"
              className="transition-colors duration-300"
            />

            {/* Clenched Fist Capsule */}
            <rect
              x="32.5"
              y="22"
              width="11"
              height="10.5"
              rx="5"
              fill="var(--md-primary, #1e6b52)"
              className="transition-colors duration-300"
            />
            {/* Knuckle & Thumb Accent */}
            <circle
              cx="40.5"
              cy="25"
              r="2.5"
              fill="var(--md-secondary-container, #cee9da)"
              className="transition-colors duration-300"
            />
          </g>
        </g>
      </g>
    </svg>
  );

  if (variant === 'horizontal') {
    return (
      <div
        onClick={handleInteraction}
        onMouseEnter={() => {
          if (interactive) {
            setIsFlexing(true);
            setTimeout(() => setIsFlexing(false), 460);
          }
        }}
        className={`inline-flex items-center gap-2.5 select-none ${
          interactive ? 'cursor-pointer active:scale-95 transition-transform duration-150 m3-state-layer rounded-full py-1 px-1.5' : ''
        } ${className}`}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        title={interactive ? 'Recomp — Tap to flex!' : 'Recomp'}
      >
        {svgContent}
        <span className="font-display text-[22px] font-bold tracking-tight text-[var(--md-on-surface)] leading-none">
          Recomp
        </span>
      </div>
    );
  }

  if (interactive) {
    return (
      <button
        type="button"
        onClick={handleInteraction}
        onMouseEnter={() => {
          setIsFlexing(true);
          setTimeout(() => setIsFlexing(false), 460);
        }}
        className={`inline-flex items-center justify-center p-1 rounded-full cursor-pointer active:scale-95 transition-transform duration-150 m3-state-layer ${className}`}
        title="Recomp — Tap to flex!"
        aria-label="Recomp Brand Logo"
      >
        {svgContent}
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {svgContent}
    </div>
  );
};
