import React from 'react';
import { BottomNav, type BottomNavProps } from './BottomNav';

export type NavigationTab = 'diary' | 'search' | 'recipe' | 'goal';

export interface CommandBarProps extends BottomNavProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (query: string) => void;
}

/**
 * CommandBar: Re-exports BottomNav for backwards compatibility and test assertions.
 */
export const CommandBar: React.FC<CommandBarProps> = (props) => {
  return <BottomNav {...props} />;
};
