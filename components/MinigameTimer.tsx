'use client';

import { useEffect, useState, useRef } from 'react';

export default function MinigameTimer() {
  const [timeToNextPuzzle, setTimeToNextPuzzle] = useState('');
  const hasReloadedRef = useRef(false);

  useEffect(() => {
    const updateCountdown = () => {
      // Get current time in EST timezone
      const now = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
        minute: '2-digit',
        second: '2-digit'
      });
      
      const parts = formatter.formatToParts(now);
      const year = parseInt(parts.find(p => p.type === 'year')!.value);
      const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // JS months are 0-indexed
      const day = parseInt(parts.find(p => p.type === 'day')!.value);
      const hour = parseInt(parts.find(p => p.type === 'hour')!.value);
      const minute = parseInt(parts.find(p => p.type === 'minute')!.value);
      const second = parseInt(parts.find(p => p.type === 'second')!.value);
      
      // Create a date object representing current EST time
      const estNow = new Date(year, month, day, hour, minute, second);
      
      // Get tomorrow at midnight EST
      const tomorrowMidnight = new Date(year, month, day + 1, 0, 0, 0);
      
      // Calculate difference in milliseconds
      const diff = tomorrowMidnight.getTime() - estNow.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      // Check if we've hit midnight (within 2 seconds to account for timing)
      if (diff <= 2000 && !hasReloadedRef.current) {
        hasReloadedRef.current = true;
        console.log('[MinigameTimer] Midnight reached! Reloading page for new puzzle...');
        setTimeout(() => {
          window.location.reload();
        }, 1000); // Wait 1 second to ensure new puzzle is generated
      }
      
      setTimeToNextPuzzle(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-lg p-4 border border-purple-500/20">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-400">Next Daily Reset</h3>
          <p className="text-xs text-gray-500 mt-0.5">All minigames reset at midnight EST</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            {timeToNextPuzzle}
          </div>
        </div>
      </div>
    </div>
  );
}
