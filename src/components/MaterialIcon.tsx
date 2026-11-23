import React from 'react';

export interface MaterialIconProps {
  name: string;
  filled?: boolean;
  className?: string;
  size?: number | string;
}

export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  filled = false,
  className = '',
  size = 24,
}) => {
  const sizeStyle = typeof size === 'number' ? `${size}px` : size;
  return (
    <span
      className={`material-symbols-rounded select-none leading-none inline-flex items-center justify-center shrink-0 ${filled ? 'filled' : ''} ${className}`}
      data-fill={filled ? '1' : '0'}
      style={{
        fontSize: sizeStyle,
        width: sizeStyle,
        height: sizeStyle,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' 500, 'GRAD' 0, 'opsz' 24`,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};
