'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export default function MinigamesPage() {
  const { data: session } = useSession();
  const [hoopgridsCompleted, setHoopgridsCompleted] = useState(false);

  useEffect(() => {
    const checkHoopgridsStatus = async () => {
      if (!session?.user?.id) return;
      
      try {
        // Get today's puzzle
        const puzzleRes = await fetch('/api/minigames/hoopgrids/daily');
        const puzzleData = await puzzleRes.json();
        
        if (puzzleData.id) {
          // Check if completed
          const completionRes = await fetch(`/api/minigames/hoopgrids/completion?puzzleId=${puzzleData.id}&userId=${session.user.id}`);
          const completionData = await completionRes.json();
          setHoopgridsCompleted(completionData.completed || false);
        }
      } catch (error) {
        console.error('Error checking hoopgrids status:', error);
      }
    };

    checkHoopgridsStatus();
  }, [session?.user?.id]);
  const games = [
    {
      id: 'hoopgrids',
      title: 'HoopGrids',
      description: 'Daily grid puzzle - guess players matching team and stat criteria',
      emoji: '🏀',
      href: '/minigames/hoopgrids',
      available: true,
    },
    {
      id: 'trivia',
      title: 'MBA Trivia',
      description: 'Test your knowledge of MBA history and stats',
      emoji: '❓',
      href: '/minigames/trivia',
      available: false,
    },
    {
      id: 'bracket-challenge',
      title: 'Bracket Challenge',
      description: 'Predict playoff outcomes and compete with others',
      emoji: '🏆',
      href: '/minigames/bracket',
      available: false,
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">🎮 MBA Minigames</h1>
          <p className="text-xl text-gray-400">
            Test your knowledge and have fun with these interactive games
          </p>
        </div>

        {/* Games Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => {
            const isCompleted = game.id === 'hoopgrids' && hoopgridsCompleted;
            
            return (
              <div key={game.id} className="relative">
                {game.available ? (
                  <div className="block p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-gray-700 hover:border-blue-500 transition-all">
                    <div className="text-6xl mb-4">{game.emoji}</div>
                    <h2 className="text-2xl font-bold mb-2">{game.title}</h2>
                    <p className="text-gray-400">{game.description}</p>
                    
                    {isCompleted ? (
                      <div className="mt-4 flex gap-3">
                        <Link 
                          href={game.href}
                          className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                          View Grid
                        </Link>
                        <div className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold flex items-center gap-2">
                          <span>✓</span>
                          <span className="hidden sm:inline">Done</span>
                        </div>
                      </div>
                    ) : (
                      <Link 
                        href={game.href}
                        className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Play Now →
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border-2 border-gray-700 opacity-50">
                    <div className="text-6xl mb-4">{game.emoji}</div>
                    <h2 className="text-2xl font-bold mb-2">{game.title}</h2>
                    <p className="text-gray-400">{game.description}</p>
                    <div className="mt-4 inline-block px-4 py-2 bg-gray-600 text-gray-300 rounded-lg font-semibold">
                      Coming Soon
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Section */}
        <div className="mt-16 p-8 bg-gray-800 rounded-xl border border-gray-700">
          <h2 className="text-2xl font-bold mb-4">🏀 How It Works</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span><strong>Daily Challenges:</strong> New puzzles and games every day</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span><strong>Track Your Progress:</strong> Your scores and stats are saved</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span><strong>Compete:</strong> See how you stack up against other MBA fans</span>
            </li>
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              <span><strong>Learn:</strong> Discover new facts about MBA players and teams</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
