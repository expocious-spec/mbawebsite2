'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Users, Link2, TrendingUp, Calendar, Search, Shield, Sun, Moon, Trophy, Briefcase, Award, User } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useSession, signIn } from 'next-auth/react';

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/branding', label: 'Branding', icon: Users },
  { href: '/links', label: 'Links', icon: Link2 },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/rankings', label: 'Rankings', icon: Award },
  { href: '/stats', label: 'Stats', icon: TrendingUp },
  { href: '/games', label: 'Games', icon: Calendar },
  { href: '/players', label: 'Players', icon: Search },
  { href: '/staff', label: 'Staff', icon: Briefcase },
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
    <nav className="bg-white dark:bg-mba-dark border-b border-gray-200 dark:border-gray-800 shadow-sm">
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
              <span className="font-minecraft text-sm text-gray-900 dark:text-white hidden sm:block">MBA</span>
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
                    className={`flex items-center gap-1 px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-mba-blue text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            
            {/* User Profile/Login Section */}
            {status === "authenticated" && session?.user?.playerId && session?.user?.minecraftUsername ? (
              <Link
                href={`/players/${session.user.playerId}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ml-2"
              >
                {session.user.profilePicture ? (
                  <img
                    src={session.user.profilePicture}
                    alt={session.user.minecraftUsername}
                    className="w-8 h-8 rounded-lg object-cover border-2 border-gray-300 dark:border-gray-600"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                )}
                <span className="font-minecraft text-xs text-gray-900 dark:text-white max-w-[150px] truncate">
                  {session.user.minecraftUsername}
                </span>
              </Link>
            ) : status !== "authenticated" ? (
              <button
                onClick={() => signIn("discord", { callbackUrl: '/' })}
                disabled={status === "loading"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-mba-blue text-white hover:bg-blue-700 transition-colors shadow-sm ml-2 disabled:opacity-50"
              >
                <User className="w-4 h-4" />
                <span className="whitespace-nowrap">Log In</span>
              </button>
            ) : null}
            
            <button
              onClick={toggleTheme}
              className="ml-2 p-2 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

