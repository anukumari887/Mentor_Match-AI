import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  IllustrationSearchMatch,
  IllustrationCalendarSlots,
  IllustrationVideoConnect,
  EmptyStateMentorSearch,
  EmptyStateSessions,
  EmptyStateProfileIncomplete,
  EmptyStateReviews,
  EmptyStateEarnings,
  EmptyStateComplaints,
  EmptyState404,
  EmptyStateNetworkError
} from './Illustrations';

describe('Illustrations Components', () => {
  it('renders all How It Works step illustrations with aria-hidden="true"', () => {
    const { container: c1 } = render(<IllustrationSearchMatch />);
    const { container: c2 } = render(<IllustrationCalendarSlots />);
    const { container: c3 } = render(<IllustrationVideoConnect />);

    expect(c1.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(c2.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(c3.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders all 8 empty and error state illustrations properly', () => {
    const components = [
      EmptyStateMentorSearch,
      EmptyStateSessions,
      EmptyStateProfileIncomplete,
      EmptyStateReviews,
      EmptyStateEarnings,
      EmptyStateComplaints,
      EmptyState404,
      EmptyStateNetworkError
    ];

    components.forEach((Comp) => {
      const { container } = render(<Comp />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
