'use client';

import { useTheme, Theme } from '@/components/ThemeProvider';
import { Palette, Settings as SettingsIcon, Sun, Moon, Circle } from 'lucide-react';
import { useState } from 'react';

const themes: { value: Theme; label: string; icon: React.ReactNode; description: string; preview: string }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: <Sun className="w-6 h-6" />,
    description: 'Clean and bright theme',
    preview: 'bg-gray-100 text-gray-900'
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <Moon className="w-6 h-6" />,
    description: 'Easy on the eyes with dark grays',
    preview: 'bg-[#0A0E27] text-gray-100'
  },
  {
    value: 'black',
    label: 'True Black',
    icon: <Circle className="w-6 h-6 fill-current" />,
    description: 'Soft black for OLED displays',
    preview: 'bg-[#0B0F14] text-gray-200'
  },
  {
    value: 'blue',
    label: 'Ocean Blue',
    icon: <Circle className="w-6 h-6 fill-current text-blue-400" />,
    description: 'Deep blue tones',
    preview: 'bg-[#0A1628] text-blue-100'
  },
  {
    value: 'red',
    label: 'Crimson Red',
    icon: <Circle className="w-6 h-6 fill-current text-red-400" />,
    description: 'Dark red atmosphere',
    preview: 'bg-[#1A0A0A] text-red-100'
  },
  {
    value: 'green',
    label: 'Forest Green',
    icon: <Circle className="w-6 h-6 fill-current text-green-400" />,
    description: 'Nature-inspired green',
    preview: 'bg-[#0A1A0F] text-green-100'
  },
];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(true);

  const handleMouseEnter = (value: Theme) => {
    // Preview the theme on hover without saving
    document.documentElement.classList.remove('dark', 'black', 'blue', 'red', 'green');
    if (value !== 'light') {
      document.documentElement.classList.add(value);
    }
  };

  const handleMouseLeave = () => {
    // Revert to the saved theme on mouse leave
    document.documentElement.classList.remove('dark', 'black', 'blue', 'red', 'green');
    if (theme !== 'light') {
      document.documentElement.classList.add(theme);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-mba-dark">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="w-8 h-8 text-mba-blue dark:text-mba-red" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Customize your MBA experience</p>
        </div>

        {/* Theme Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-6 h-6 text-mba-blue dark:text-mba-red" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Theme</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => setTheme(themeOption.value)}
                onMouseEnter={() => handleMouseEnter(themeOption.value)}
                onMouseLeave={handleMouseLeave}
                className={`
                  minecraft-card p-4 text-left transition-all
                  ${theme === themeOption.value
                    ? 'border-mba-blue dark:border-mba-red bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-mba-blue dark:hover:border-mba-red'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded ${theme === themeOption.value ? 'bg-mba-blue dark:bg-mba-red text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                    {themeOption.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{themeOption.label}</h3>
                    {theme === themeOption.value && (
                      <span className="text-xs text-mba-blue dark:text-mba-red font-semibold">Active</span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {themeOption.description}
                </p>
                <div className={`${themeOption.preview} p-3 minecraft-border border-2 border-gray-400`}>
                  <div className="text-xs font-semibold mb-1">Preview</div>
                  <div className="text-xs opacity-75">This is how text will look</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Other Settings */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Preferences</h2>
          
          <div className="minecraft-card p-6 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Notifications</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive updates about games and transactions
                </p>
              </div>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`
                  relative inline-flex h-8 w-14 items-center rounded-full transition-colors
                  ${showNotifications ? 'bg-mba-blue' : 'bg-gray-300 dark:bg-gray-600'}
                `}
              >
                <span
                  className={`
                    inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                    ${showNotifications ? 'translate-x-7' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">Data & Privacy</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Your data is stored locally and synced with Supabase
                </p>
                <a
                  href="/privacy"
                  className="text-sm text-mba-blue dark:text-mba-red hover:underline"
                >
                  View Privacy Policy →
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="minecraft-card p-6 border-gray-300 dark:border-gray-600 bg-gradient-to-r from-blue-50 to-red-50 dark:from-blue-900/20 dark:to-red-900/20">
          <h3 className="font-bold text-gray-900 dark:text-white mb-2">About MBA Website</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Minecraft Basketball Association - The premier basketball league in Minecraft
          </p>
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Version 2.0</span>
            <span>•</span>
            <span>Built with Next.js & Supabase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
