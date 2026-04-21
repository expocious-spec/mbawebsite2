'use client';

import { useEffect, useState } from 'react';

export default function MinigameTimer() {
  const [timeToNextPuzzle, setTimeToNextPuzzle] = useState('');

  useEffect(() => {
    const updateCountdown = () => {
      // Use UTC midnight for consistency with API
      const now = new Date();
      const tomorrow = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      ));
      
      const diff = tomorrow.getTime() - now.getTime();
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
          <p className="text-xs text-gray-500 mt-0.5">All minigames reset at midnight UTC</p>
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
