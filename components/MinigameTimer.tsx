'use client';

import { useEffect, useState } from 'react';

export default function MinigameTimer() {
  const [timeToNextPuzzle, setTimeToNextPuzzle] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      // Use EST midnight for consistency with API
      const now = new Date();
      
      // Get current time in EST
      const estNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // Get tomorrow at midnight EST
      const tomorrow = new Date(estNow);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      // Convert back to UTC for calculation
      const estOffset = new Date().getTimezoneOffset() * 60000;
      const tomorrowEST = new Date(tomorrow.toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const diff = tomorrowEST.getTime() - estNow.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
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
