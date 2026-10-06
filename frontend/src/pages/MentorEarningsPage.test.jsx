import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MentorEarningsPage from './MentorEarningsPage';
import { getMentorEarnings } from '../services/payments';

vi.mock('../services/payments', () => ({ getMentorEarnings: vi.fn() }));

describe('MentorEarningsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('formats stored paise totals as rupees', async () => {
    getMentorEarnings.mockResolvedValue({ earned: 42500, paidOut: 0, balance: 42500, recent: [] });
    render(<MentorEarningsPage />);

    expect((await screen.findAllByText('Rs. 425')).length).toBeGreaterThan(0);
    expect(screen.getByText('Completed, paid sessions will appear here.')).toBeInTheDocument();
  });
});