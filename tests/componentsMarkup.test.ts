import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AnimatedCounter } from '../src/components/AnimatedCounter';
import { FoodSearchResultCell } from '../src/components/FoodSearchResultCell';
import { CommandBar } from '../src/components/CommandBar';
import { DailyMetabolicSummary } from '../src/components/DailyMetabolicSummary';
import type { FoodItem } from '../src/db/db';
import { Provider } from 'react-redux';
import { store } from '../src/store/store';

describe('Component Architecture & Design Tokens', () => {
  it('AnimatedCounter renders with monospace font and tabular-nums class', () => {
    const html = renderToString(React.createElement(AnimatedCounter, { value: 2450 }));
    expect(html).toContain('font-mono');
    expect(html).toContain('tabular-nums');
    expect(html).toContain('2,450');
  });

  it('FoodSearchResultCell renders 3-tier Bento architecture with strict typography and macro strip', () => {
    const mockFood: FoodItem = {
      id: 1,
      name: 'Paneer Tikka',
      baseMacrosPer100g: {
        calories: 260,
        protein: 18,
        carbs: 6,
        fats: 19,
      },
      servings: [{ unit: '100g', weightInGrams: 100 }],
    };

    const html = renderToString(
      React.createElement(FoodSearchResultCell, {
        food: mockFood,
        onSelect: vi.fn(),
      })
    );

    // Tier 1: Food name (sans-serif, truncated)
    expect(html).toContain('Paneer Tikka');
    expect(html).toContain('font-sans');

    // Tier 2: Large glowing calories (#00FF41, font-mono, tabular-nums)
    expect(html).toContain('260');
    expect(html).toContain('kcal');
    expect(html).toContain('font-mono');
    expect(html).toContain('tabular-nums');
    expect(html).toContain('text-[#00FF41]');

    // Tier 3: Macro pill strip [ P: 18g ] [ C: 6g ] [ F: 19g ] in text-neutral-500
    expect(html).toContain('[ P:');
    expect(html).toContain('[ C:');
    expect(html).toContain('[ F:');
    expect(html).toContain('text-neutral-500');
    expect(html).toContain('18g');
    expect(html).toContain('6g');
    expect(html).toContain('19g');
  });

  it('CommandBar renders AI Food Search input, dock tabs, and SOS trigger', () => {
    const html = renderToString(
      React.createElement(CommandBar, {
        activeTab: 'diary',
        onTabChange: vi.fn(),
        onOpenSOS: vi.fn(),
        searchQuery: '',
      })
    );

    expect(html).toContain('AI Food Search');
    expect(html).toContain('Diary');
    expect(html).toContain('Search');
    expect(html).toContain('Recipe');
    expect(html).toContain('Goal');
    expect(html).toContain('Floating Navigation Dock');
  });

  it('DailyMetabolicSummary renders with View Telemetry button and 3D perspective setup', () => {
    const html = renderToString(
      React.createElement(
        Provider,
        { store },
        React.createElement(DailyMetabolicSummary, {
          remainingCalories: 650,
          totalConsumed: 1750,
          totalProtein: 140,
          totalCarbs: 180,
          totalFats: 50,
          targetCalories: 2400,
          status: 'deficit',
        })
      )
    );

    expect(html).toContain('Daily Calorie Diary');
    expect(html).toContain('View Telemetry');
    expect(html).toContain('650');
    expect(html).toContain('text-[#00FF41]');
    expect(html).toContain('52-Week Longitudinal Matrix');
  });
});
