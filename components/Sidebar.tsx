'use client';
import { cn } from '@/lib/utils';
import { BookOpenText, Home, Search, SquarePen, Settings, ChevronRight, ChevronLeft, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import React, { useState, type ReactNode } from 'react';
import Layout from './Layout';
import SettingsDialog from './SettingsDialog';

const VerticalIconContainer = ({ children, isSidebarOpen }: { children: ReactNode; isSidebarOpen: boolean }) => {
  return (
    <div
      className={cn(
        'flex flex-col gap-y-2 w-full mt-4 px-4',
        'items-center'
      )}
    >
      {children}
    </div>
  );
};

const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const segments = useSelectedLayoutSegments();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navLinks = [
    {
      icon: Home,
      href: '/',
      active: segments.length === 0 || segments.includes('c'),
      label: 'Home',
    },
    {
      icon: Search,
      href: '/discover',
      active: segments.includes('discover'),
      label: 'Discover',
    },
    {
      icon: BookOpenText,
      href: '/library',
      active: segments.includes('library'),
      label: 'Library',
    },
    {
      icon: LayoutGrid,  // Updated icon for Dashboard
      href: '/dashboard',
      active: segments.includes('dashboard'),
      label: 'Dashboard',
    },
  ];

  return (
    <div className="flex">
      {/* Sidebar */}
      <div
        className={cn(
          'relative fixed inset-y-0 z-50 flex flex-col justify-between overflow-y-auto bg-light-secondary dark:bg-dark-secondary px-2 py-8 transition-all duration-300',
          isSidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        {/* Logo Section */}
        <div
          className={cn(
            'flex gap-x-2 mb-4 w-full',
            isSidebarOpen ? 'items-center' : 'flex-col items-center'
          )}
        >
          <img
            src="/logo.png"
            alt="Logo"
            className={cn('transition-transform duration-150', isSidebarOpen ? 'w-25 h-12' : 'w-12 h-6')}
          />
          {isSidebarOpen ? (
            <SquarePen className="cursor-pointer text-6xl sidebar-color ml-4" />
          ) : (
            <SquarePen className="cursor-pointer text-6xl sidebar-color mt-6" />
          )}
        </div>

        {/* Sidebar Content */}
        <div className="flex flex-col flex-grow justify-start mt-20">
          <VerticalIconContainer isSidebarOpen={isSidebarOpen}>
            {navLinks.map((link, i) => (
              <Link
                key={i}
                href={link.href}
                className={cn(
                  'relative flex items-center gap-x-4 cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 duration-150 transition w-full py-2 rounded-lg',
                  link.active
                    ? 'sidebar-color'
                    : 'sidebar-color/70',
                  !isSidebarOpen ? 'justify-center' : ''
                )}
              >
                <link.icon className={cn('transition-transform duration-150 sidebar-color', !isSidebarOpen ? 'text-[10rem]' : 'text-6xl')} />
                {isSidebarOpen && (
                  <span className="text-sm font-medium sidebar-color">{link.label}</span>
                )}
                {link.active && (
                  <div className="absolute right-0 -mr-2 h-full w-1 rounded-l-lg bg-black dark:bg-white" />
                )}
              </Link>
            ))}
          </VerticalIconContainer>
        </div>

        {/* Settings Icon at the Bottom */}
        <div
          className={cn(
            'flex flex-col items-center absolute bottom-10 w-full transition-all duration-300',
            isSidebarOpen ? 'w-60' : 'w-16'
          )}
          style={{ right: isSidebarOpen ? '55px' : '2px' }}
        >
          <div
            className="flex justify-center cursor-pointer sidebar-color"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <Settings
              className={cn(
                'cursor-pointer transition-transform duration-150 sidebar-color',
                !isSidebarOpen ? 'text-[10rem] ' : 'text-6xl'
              )}
            />
            {isSidebarOpen && (
              <span className="ml-3 text-sm font-medium sidebar-color">Settings</span>
            )}
          </div>
          <SettingsDialog
            isOpen={isSettingsOpen}
            setIsOpen={setIsSettingsOpen}
          />
        </div>

        {/* Toggle Button */}
        <div
          className={cn(
            'absolute bottom-24 right-2 cursor-pointer transition-transform duration-300 sidebar-color',
            isSidebarOpen ? 'top-[calc(4rem_+_1rem)]' : ''
          )}
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <ChevronLeft className="sidebar-color" /> : <ChevronRight className="sidebar-color" />}
        </div>
      </div>

      {/* Content Area */}
      <div
        className="flex-grow transition-all duration-300"
        style={{
          marginLeft: isSidebarOpen ? '145px' : '16px',
        }}
      >
        <Layout>{children}</Layout>
      </div>
    </div>
  );
};

export default Sidebar;