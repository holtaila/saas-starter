'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Users, Settings, Shield, Activity, Menu, Bot, Phone, PhoneCall, Target, Home } from 'lucide-react';

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    // Core functionality
    { href: '/dashboard', icon: Home, label: 'Dashboard', section: 'main' },
    { href: '/dashboard/agents', icon: Bot, label: 'Agents', section: 'main' },
    { href: '/dashboard/phone-numbers', icon: Phone, label: 'Phone Numbers', section: 'main' },
    { href: '/dashboard/calls', icon: PhoneCall, label: 'Calls', section: 'main' },
    { href: '/dashboard/campaigns', icon: Target, label: 'Campaigns', section: 'main' },
    // Settings & Management
    { href: '/dashboard/general', icon: Settings, label: 'Settings', section: 'settings' },
    { href: '/dashboard/security', icon: Shield, label: 'Security', section: 'settings' },
    { href: '/dashboard/activity', icon: Activity, label: 'Activity Log', section: 'settings' }
  ];

  const mainNavItems = navItems.filter(item => item.section === 'main');
  const settingsNavItems = navItems.filter(item => item.section === 'settings');

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <span className="font-medium">Dashboard</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            {/* Main Navigation */}
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <Link key={item.href} href={item.href} passHref>
                  <Button
                    variant={pathname === item.href ? 'secondary' : 'ghost'}
                    className={`shadow-none w-full justify-start ${
                      pathname === item.href ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => setIsSidebarOpen(false)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Settings Section */}
            <div className="mt-8">
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Settings
                </h3>
              </div>
              <div className="space-y-1">
                {settingsNavItems.map((item) => (
                  <Link key={item.href} href={item.href} passHref>
                    <Button
                      variant={pathname === item.href ? 'secondary' : 'ghost'}
                      className={`shadow-none w-full justify-start ${
                        pathname === item.href ? 'bg-gray-100' : ''
                      }`}
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
