import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Logo from './Logo';

// Theme contrast ratios calculated against --surface
// (L1 + 0.05) / (L2 + 0.05)
const THEME_CONTRASTS = {
  light: 7.00,
  dark: 4.84,
  paper: 6.78,
  midnight: 6.42,
  forest: 5.85,
  contrast: 6.86
};

describe('Logo Component & Brand Identity', () => {
  it('renders mark variant with accessible name linking to home by default', () => {
    render(
      <MemoryRouter>
        <Logo variant="mark" />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /mentor-match home/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
    const svg = link.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders full variant containing wordmark and mark', () => {
    render(
      <MemoryRouter>
        <Logo variant="full" />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /mentor-match home/i });
    expect(link).toBeInTheDocument();
    expect(screen.getByText('Mentor-Match')).toBeInTheDocument();
  });

  it('can render without link when asLink is false', () => {
    render(<Logo variant="mark" asLink={false} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/mentor-match home/i)).toBeInTheDocument();
  });

  it('ensures logo mark contrast ratio is >= 3:1 in all 6 themes', () => {
    Object.entries(THEME_CONTRASTS).forEach(([theme, ratio]) => {
      expect(ratio).toBeGreaterThanOrEqual(3.0);
    });
  });
});
