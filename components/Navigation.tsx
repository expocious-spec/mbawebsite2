'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Users, Link2, TrendingUp, Calendar, Search, Shield, Sun, Moon, Trophy, Briefcase, Award, User, FileText, Settings } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useSession, signIn, signOut } from 'next-auth/react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/branding', label: 'Branding', icon: Users },
  { href: '/links', label: 'Links', icon: Link2 },
  { href: '/standings', label: 'Standings', icon: Trophy },
  // { href: '/rankings', label: 'Rankings', icon: Award },
  { href: '/stats', label: 'Stats', icon: TrendingUp },
  { href: '/games', label: 'Games', icon: Calendar },
  { href: '/players', label: 'Players', icon: Search },
  { href: '/transactions', label: 'Transactions', icon: FileText },
  { href: '/accolades', label: 'Accolades', icon: Award },
  { href: '/admin', label: 'Admin', icon: Shield },
];

export default function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { data: session, status } = useSession();

  // Debug logging
  console.log('[NAV DEBUG] Status:', status);
  console.log('[NAV DEBUG] Session:', session);
  console.log('[NAV DEBUG] Player ID:', session?.user?.playerId);

  return (
    <nav
      className="border-b-4 shadow-minecraft"
      style={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
    >
      <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between min-h-16 py-2">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative w-10 h-10">
                <Image
                  src="/logo.png"
                  alt="MBA Logo"
                  width={40}
                  height={40}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="font-minecraft text-sm text-gray-900 dark:text-white hidden sm:block">Minecraft Basketball Association</span>
            </Link>
          </div>
          
          <div className="flex items-center gap-1 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1 px-2 py-2 minecraft-button border-2 text-sm font-medium ${
                      isActive
                        ? 'bg-gradient-to-r from-mba-blue to-mba-red text-white border-blue-800'
                        : 'dark:text-gray-300 text-gray-700'
                    }`}
                    style={isActive ? undefined : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            
            <Link
              href="/settings"
              className={`ml-2 p-2 minecraft-button border-2 ${
                pathname === '/settings'
                  ? 'bg-gradient-to-r from-mba-blue to-mba-red text-white border-blue-800'
                  : 'dark:text-gray-300 text-gray-700'
              }`}
              style={pathname === '/settings' ? undefined : { backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

