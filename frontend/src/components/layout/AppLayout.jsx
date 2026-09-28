import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.jsx';
import { MobileBottomNav } from './MobileBottomNav.jsx';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-pamoja-surface text-pamoja-ink">
      <Navbar />
      <main className="mx-auto max-w-pamoja px-4 pb-24 pt-6 sm:px-6 md:pt-8 lg:px-12 lg:pb-12 lg:pt-8">
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  );
};
