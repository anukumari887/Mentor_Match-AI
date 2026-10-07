import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import ApprovalBanner from './ApprovalBanner';
import VerificationBanner from './VerificationBanner';
import ChatNotificationListener from './ChatNotificationListener';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg text-ink transition-colors">
      <Navbar />
      <VerificationBanner />
      <ApprovalBanner />
      <ChatNotificationListener />
      <main id="main-content" className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
