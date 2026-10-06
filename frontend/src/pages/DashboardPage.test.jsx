import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import { getRecommendations } from '../services/recommendations';
import { listBookings } from '../services/mentors';

vi.mock('../services/recommendations', () => ({ getRecommendations: vi.fn() }));
vi.mock('../services/mentors', () => ({ listBookings: vi.fn() }));

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows ranked mentor reasons and the upcoming sessions empty state', async () => {
    getRecommendations.mockResolvedValue({
      source: 'ml',
      items: [{
        mentor: { id: 'mentor-id', name: 'Asha Rao', headline: 'Python mentor', pricePerHour: 900 },
        score: 0.82,
        reasons: ['Teaches Python', 'Within your budget'],
        overBudget: false
      }]
    });
    listBookings.mockResolvedValue([]);
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><DashboardPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
    expect(screen.getByText('Teaches Python')).toBeInTheDocument();
    expect(screen.getByText('Within your budget')).toBeInTheDocument();
    expect(screen.getByText('No upcoming sessions.')).toBeInTheDocument();
  });

  it('prompts learners with incomplete profiles to add goals and skills', async () => {
    getRecommendations.mockResolvedValue({ source: 'fallback', items: [], reason: 'PROFILE_INCOMPLETE' });
    listBookings.mockResolvedValue([]);
    render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><DashboardPage /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Tell us what you want to learn' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Complete profile/ })).toHaveAttribute('href', '/profile');
  });
});