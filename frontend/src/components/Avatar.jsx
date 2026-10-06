import React from 'react';

/**
 * Computes a stable hash from any string to pick a deterministic palette index (0-7).
 */
function getPaletteIndex(name = '') {
  let hash = 0;
  const str = String(name).trim();
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 8;
}

/**
 * Extracts clean, deterministic 2-letter initials.
 */
function getInitials(name = '') {
  const trimmed = String(name).trim();
  if (!trimmed) return 'MM';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/**
 * Reusable deterministic initials avatar.
 * Matches all 6 themes without showing photos of strangers or stock clichés.
 */
export default function Avatar({
  name = '',
  size = 'md',
  shape = 'rounded',
  className = '',
  title = ''
}) {
  const initials = getInitials(name);
  const paletteIndex = getPaletteIndex(name);

  const sizeClasses = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-xs sm:text-sm',
    lg: 'h-14 w-14 text-lg sm:text-xl',
    xl: 'h-20 w-20 text-2xl'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    rounded: 'rounded',
    square: 'rounded-none'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;
  const selectedShape = shapeClasses[shape] || shapeClasses.rounded;
  const paletteClass = `avatar-palette-${paletteIndex}`;

  return (
    <div
      aria-label={name ? `${name}'s avatar` : 'User avatar'}
      className={`inline-flex shrink-0 items-center justify-center font-serif font-bold select-none border border-current/25 shadow-xs transition-colors ${selectedSize} ${selectedShape} ${paletteClass} ${className}`}
      role="img"
      title={title || name}
    >
      <span>{initials}</span>
    </div>
  );
}
