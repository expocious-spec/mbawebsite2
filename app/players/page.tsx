'use client';

import { Search, User, Star } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function PlayersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playersRes, teamsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/teams')
      ]);
      const [playersData, teamsData] = await Promise.all([
        playersRes.json(),
        teamsRes.json()
      ]);
      setPlayers(playersData);
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = players.filter(player =>
    player.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.minecraftUsername.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center text-gray-900 dark:text-white">
          <Search className="w-10 h-10 mr-3 text-mba-blue" />
          Player Search
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Find and view player profiles</p>
      </div>

      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by display name or Minecraft username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue transition-colors text-gray-900 dark:text-white shadow-sm"
          />
        </div>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPlayers.length > 0 ? (
          filteredPlayers.map((player) => {
            const team = teams.find(t => t.id === player.teamId);
            const starRating = player.starRating ?? 0;
            const playerLevel = player.playerLevel ?? 'mba';
            const starTitle = playerLevel === 'mba' ? 'Player' : 'Recruit';
            
            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-mba-blue dark:hover:border-mba-blue transition-all transform hover:scale-105 shadow-sm"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {player.profilePicture ? (
                      <img
                        src={player.profilePicture}
                        alt={player.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg truncate text-gray-900 dark:text-white">{player.displayName}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">@{player.minecraftUsername}</p>
                  </div>
                </div>

                {/* Star Rating */}
                {starRating > 0 && (
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(starRating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                    <span className="text-yellow-400 font-bold text-sm ml-1">{starRating}-Star {starTitle}</span>
                  </div>
                )}

                {/* Team Badge */}
                {team && (
                  <div className="mb-3">
                    <div
                      className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${team.colors.primary}20`,
                        color: team.colors.primary,
                      }}
                    >
                      <span>{team.name}</span>
                    </div>
                  </div>
                )}

                {/* Roles */}
                {player.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {player.roles.map((role: string) => (
                      <span
                        key={role}
                        className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}

                {/* Salary Cap Worth */}
                <div className="mb-2 flex items-center justify-between px-2">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Cap Value:</span>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">
                    ${(player.coinWorth || 0).toLocaleString()}
                  </span>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">PTS</div>
                    <div className="font-bold text-gray-900 dark:text-white">{player.stats.points.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">REB</div>
                    <div className="font-bold text-gray-900 dark:text-white">{player.stats.rebounds.toFixed(1)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600 dark:text-gray-400">AST</div>
                    <div className="font-bold text-gray-900 dark:text-white">{player.stats.assists.toFixed(1)}</div>
                  </div>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center text-gray-500 dark:text-gray-400 shadow-sm">
            <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No players found</p>
            <p className="text-sm mt-1">
              {searchQuery
                ? 'Try a different search term'
                : 'Players will appear here once they are added'}
            </p>
          </div>
        )}
      </div>

      {/* Player Count */}
      {filteredPlayers.length > 0 && (
        <div className="mt-6 text-center text-gray-600 dark:text-gray-400 text-sm">
          Showing {filteredPlayers.length} of {players.length} players
        </div>
      )}
    </div>
  );
}

