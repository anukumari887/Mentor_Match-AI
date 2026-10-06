import React, { useState } from 'react';

/**
 * ResponsiveImage: High-performance, self-hosted responsive image component.
 * Features:
 * - WebP multi-resolution srcset with sizes
 * - Explicit width & height to prevent Cumulative Layout Shift (CLS)
 * - Native loading="lazy" (or eager with fetchpriority="high" for hero)
 * - Soft theme-token placeholder while loading
 * - OnError fallback so broken images never show an ugly broken file icon
 * - Theme-photo dimming to prevent glare in dark and midnight themes
 */
export default function ResponsiveImage({
  baseName,
  src,
  alt = '',
  width,
  height,
  sizes = '(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px',
  loading = 'lazy',
  fetchPriority = 'auto',
  className = '',
  containerClassName = '',
  rounded = 'rounded-md'
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // If baseName provided, auto-construct the WebP responsive srcset
  const webpSrcSet = baseName
    ? `/images/${baseName}-400.webp 400w, /images/${baseName}-800.webp 800w, /images/${baseName}-1200.webp 1200w`
    : undefined;

  const defaultSrc = src || (baseName ? `/images/${baseName}.webp` : '');

  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-surface-raised border border-border text-ink-muted text-xs ${rounded} ${containerClassName}`}
        style={{ width: width ? `${width}px` : '100%', height: height ? `${height}px` : 'auto', aspectRatio: width && height ? `${width}/${height}` : undefined }}
      >
        <span className="sr-only">Image unavailable</span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-surface-raised border border-border/70 ${rounded} ${containerClassName}`}
      style={{
        aspectRatio: width && height ? `${width}/${height}` : undefined
      }}
    >
      <picture>
        {webpSrcSet && (
          <source
            type="image/webp"
            srcSet={webpSrcSet}
            sizes={sizes}
          />
        )}
        <img
          src={defaultSrc}
          alt={alt}
          width={width}
          height={height}
          loading={loading}
          decoding="async"
          fetchpriority={fetchPriority}
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`theme-photo h-full w-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-90'
          } ${className}`}
        />
      </picture>
    </div>
  );
}
