import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar from './Avatar';

describe('Avatar Component', () => {
  it('extracts two-letter initials correctly from multi-word names', () => {
    render(<Avatar name="Asha Rao" />);
    expect(screen.getByText('AR')).toBeInTheDocument();
  });

  it('extracts two-letter initials correctly from single-word names', () => {
    render(<Avatar name="Admin" />);
    expect(screen.getByText('AD')).toBeInTheDocument();
  });

  it('uses default fallback initials when name is missing', () => {
    render(<Avatar name="" />);
    expect(screen.getByText('MM')).toBeInTheDocument();
  });

  it('assigns the same deterministic palette class to identical names', () => {
    const { container: c1 } = render(<Avatar name="Siddharth Mehta" />);
    const { container: c2 } = render(<Avatar name="Siddharth Mehta" />);
    const class1 = c1.firstChild.className;
    const class2 = c2.firstChild.className;
    expect(class1).toBe(class2);
  });

  it('includes accessible role="img" and aria-label', () => {
    render(<Avatar name="Pooja Sharma" />);
    const avatar = screen.getByRole('img', { name: "Pooja Sharma's avatar" });
    expect(avatar).toBeInTheDocument();
  });
});
