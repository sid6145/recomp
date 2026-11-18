import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AgenticTransition, CinematicTransition } from '../src/utils/motionPresets';
import { useHaptics, type UseHapticsReturn } from '../src/hooks/useHaptics';

function renderHookWithServer<T>(hookFn: () => T): T {
  let result: T;
  const TestComponent = () => {
    result = hookFn();
    return null;
  };
  renderToString(React.createElement(TestComponent));
  return result!;
}

describe('Design Tokens & Motion Presets', () => {
  it('exports AgenticTransition with spring physics (stiffness 400, damping 25)', () => {
    expect(AgenticTransition).toBeDefined();
    expect(AgenticTransition).toEqual({
      type: 'spring',
      stiffness: 400,
      damping: 25,
    });
  });

  it('exports CinematicTransition with 1.5s fluid cubic bezier curve', () => {
    expect(CinematicTransition).toBeDefined();
    expect(CinematicTransition).toEqual({
      duration: 1.5,
      ease: [0.16, 1, 0.3, 1],
    });
  });
});

describe('useHaptics Hook', () => {
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn().mockReturnValue(true);
    // Setup window and navigator mock
    // @ts-expect-error Mocking global window
    globalThis.window = globalThis;
    Object.defineProperty(globalThis.navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers exactly 10ms micro-tap on .tick()', () => {
    const haptics = renderHookWithServer(useHaptics);
    haptics.tick();
    expect(vibrateMock).toHaveBeenCalledWith(10);
  });

  it('triggers dynamic cardiac pulse on .heartbeat()', () => {
    const haptics = renderHookWithServer(useHaptics);
    haptics.heartbeat(0.8);
    expect(vibrateMock).toHaveBeenCalled();
    const args = vibrateMock.mock.calls[0][0];
    expect(Array.isArray(args)).toBe(true);
    expect(args.length).toBe(3); // [pulseA, pause, pulseB]
  });

  it('cancels vibration and clears timers on .cancel()', () => {
    const haptics = renderHookWithServer(useHaptics);
    haptics.cancel();
    expect(vibrateMock).toHaveBeenCalledWith(0);
  });
});
