import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import StatusPage from './pages/StatusPage';
import LegalPage from './pages/LegalPage';
import NotFoundPage from './pages/NotFoundPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import MentorBrowsePage from './pages/MentorBrowsePage';
import MentorDetailPage from './pages/MentorDetailPage';
import AdminMentorsPage from './pages/AdminMentorsPage';
import CheckoutPage from './pages/CheckoutPage';
import SessionsPage from './pages/SessionsPage';
import MentorEarningsPage from './pages/MentorEarningsPage';
import DashboardPage from './pages/DashboardPage';
import VideoRoomPage from './pages/VideoRoomPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<AuthPage mode="login" />} />
              <Route path="register" element={<AuthPage mode="register" />} />
              <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="dashboard" element={<ProtectedRoute roles={['learner']}><DashboardPage /></ProtectedRoute>} />
              <Route path="mentors" element={<ProtectedRoute><MentorBrowsePage /></ProtectedRoute>} />
              <Route path="mentors/:id" element={<ProtectedRoute><MentorDetailPage /></ProtectedRoute>} />
              <Route path="admin/mentors" element={<ProtectedRoute roles={['admin']}><AdminMentorsPage /></ProtectedRoute>} />
              <Route path="checkout/:bookingId" element={<ProtectedRoute roles={['learner']}><CheckoutPage /></ProtectedRoute>} />
              <Route path="sessions" element={<ProtectedRoute roles={['learner', 'mentor']}><SessionsPage /></ProtectedRoute>} />
              <Route path="session/:bookingId" element={<ProtectedRoute roles={['learner', 'mentor']}><VideoRoomPage /></ProtectedRoute>} />
              <Route path="earnings" element={<ProtectedRoute roles={['mentor']}><MentorEarningsPage /></ProtectedRoute>} />
              <Route path="status" element={<StatusPage />} />
              <Route path="terms" element={<LegalPage />} />
              <Route path="privacy" element={<LegalPage />} />
              <Route path="refund-policy" element={<LegalPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
