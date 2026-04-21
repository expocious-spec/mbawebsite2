'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import MinigameTimer from '@/components/MinigameTimer';

export default function MinigamesPage() {
  const { data: session } = useSession();
  const [hoopgridsCompleted, setHoopgridsCompleted] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

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

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch('/api/minigames/hoopgrids/leaderboard');
        const data = await res.json();
        setLeaderboard(data.leaderboard || []);
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, []);
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
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4">🎮 MBA Minigames</h1>
          <p className="text-xl text-gray-400">
            Test your knowledge and have fun with these interactive games
          </p>
        </div>

        {/* Timer */}
        <div className="mb-8">
          <MinigameTimer />
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

        {/* HoopGrids Daily Leaderboard */}
        <div className="mt-16">
          <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-t-xl p-6">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <span>🏆</span>
              <span>Today's HoopGrids Leaderboard</span>
            </h2>
            <p className="text-yellow-100 mt-2">Lowest rarity score wins • Resets daily at midnight</p>
          </div>
          
          <div className="bg-gray-800 rounded-b-xl border-2 border-gray-700 border-t-0 overflow-hidden">
            {loadingLeaderboard ? (
              <div className="p-8 text-center text-gray-400">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-2xl font-bold text-white mb-2">No completions yet today!</h3>
                <p className="text-gray-400">Be the first to complete today's HoopGrid and claim the top spot.</p>
              </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-900 border-b border-gray-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Rank</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Player</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Rarity Score</th>
                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {leaderboard.slice(0, 10).map((entry) => {
                        const isCurrentUser = session?.user?.id === entry.userId;
                        const minutes = Math.floor((entry.completionTime || 0) / 60);
                        const seconds = (entry.completionTime || 0) % 60;
                        
                        return (
                          <tr 
                            key={entry.userId} 
                            className={`${isCurrentUser ? 'bg-blue-600/20 border-l-4 border-l-blue-500' : 'hover:bg-gray-700/50'} transition-colors`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {entry.rank === 1 && <span className="text-2xl">🥇</span>}
                                {entry.rank === 2 && <span className="text-2xl">🥈</span>}
                                {entry.rank === 3 && <span className="text-2xl">🥉</span>}
                                {entry.rank > 3 && (
                                  <span className="text-lg font-bold text-gray-400">#{entry.rank}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {entry.profilePicture ? (
                                  <img 
                                    src={entry.profilePicture} 
                                    alt={entry.displayName}
                                    className="w-10 h-10 rounded-lg"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                                    <span className="text-xl">👤</span>
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-white flex items-center gap-2">
                                    {entry.displayName}
                                    {isCurrentUser && (
                                      <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">You</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="inline-flex items-center gap-1">
                                <span className="text-lg font-bold text-yellow-400">{entry.rarityScore.toFixed(1)}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center text-gray-300 hidden sm:table-cell">
                              {minutes}:{seconds.toString().padStart(2, '0')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
              
            {leaderboard.length > 10 && (
              <div className="p-4 bg-gray-900 text-center text-gray-400 text-sm border-t border-gray-700">
                Showing top 10 of {leaderboard.length} players
              </div>
            )}
          </div>
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
