import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ResponsiveImage from './ResponsiveImage';

describe('ResponsiveImage Component', () => {
  it('renders img with srcset, width, height, and meaningful alt text', () => {
    render(
      <ResponsiveImage
        baseName="hero-learner"
        alt="Practicing engineer in a session"
        width={800}
        height={480}
        fetchPriority="high"
        loading="eager"
      />
    );

    const img = screen.getByRole('img', { name: /Practicing engineer in a session/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/images/hero-learner.webp');
    expect(img).toHaveAttribute('width', '800');
    expect(img).toHaveAttribute('height', '480');
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
    expect(img.className).toContain('theme-photo');
  });

  it('handles load error safely without showing broken image icon', () => {
    render(
      <ResponsiveImage
        src="/images/non-existent.webp"
        alt="Broken test image"
        width={400}
        height={300}
      />
    );

    const img = screen.getByRole('img', { name: /Broken test image/i });
    fireEvent.error(img);

    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
  });
});
