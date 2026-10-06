import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ApprovalBanner from './ApprovalBanner';
import * as AuthContext from '../contexts/AuthContext';

describe('ApprovalBanner Component', () => {
  it('renders nothing for learners or unauthenticated users', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: 'learner' },
      profile: null
    });

    const { container } = render(
      <MemoryRouter>
        <ApprovalBanner />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders checklist for pending mentor with incomplete profile', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: 'mentor' },
      profile: {
        approvalStatus: 'pending',
        profileCompleteness: {
          isComplete: false,
          missing: [
            { key: 'headline', label: 'Professional headline', link: '/profile#headline' },
            { key: 'skills', label: 'At least one technical skill', link: '/profile#skills' }
          ]
        }
      }
    });

    render(
      <MemoryRouter>
        <ApprovalBanner />
      </MemoryRouter>
    );

    expect(screen.getByText(/finish your profile to be reviewed/i)).toBeInTheDocument();
    expect(screen.getByText('Professional headline')).toBeInTheDocument();
    expect(screen.getByText('At least one technical skill')).toBeInTheDocument();
  });

  it('renders waiting for approval message for pending mentor with complete profile', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: 'mentor' },
      profile: {
        approvalStatus: 'pending',
        headline: 'Staff Engineer',
        bio: 'Seasoned engineer',
        skills: ['React'],
        pricePerHour: 500,
        availability: [{ dayOfWeek: 1, startTime: '10:00', endTime: '11:00' }],
        profileCompleteness: {
          isComplete: true,
          missing: []
        }
      }
    });

    render(
      <MemoryRouter>
        <ApprovalBanner />
      </MemoryRouter>
    );

    expect(screen.getByText(/your profile is waiting for admin approval/i)).toBeInTheDocument();
    expect(screen.getByText(/learners cannot see your profile or book sessions yet/i)).toBeInTheDocument();
  });

  it('renders rejection notice with admin notes when rejected', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { role: 'mentor' },
      profile: {
        approvalStatus: 'rejected',
        rejectionReason: 'Please provide more details in your bio about system architecture experience.'
      }
    });

    render(
      <MemoryRouter>
        <ApprovalBanner />
      </MemoryRouter>
    );

    expect(screen.getByText(/profile review feedback: changes required/i)).toBeInTheDocument();
    expect(screen.getByText(/please provide more details in your bio/i)).toBeInTheDocument();
  });
});
