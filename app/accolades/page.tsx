'use client';

import { Award, Filter, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function AccoladesPage() {
  const [accolades, setAccolades] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accoladesRes, seasonsRes, playersRes] = await Promise.all([
        fetch('/api/accolades'),
        fetch('/api/seasons'),
        fetch('/api/players')
      ]);

      if (accoladesRes.ok && seasonsRes.ok && playersRes.ok) {
        const [accoladesData, seasonsData, playersData] = await Promise.all([
          accoladesRes.json(),
          seasonsRes.json(),
          playersRes.json()
        ]);

        setAccolades(accoladesData);
        setSeasons(seasonsData);
        setPlayers(playersData);

        // Set current season as default
        const currentSeason = seasonsData.find((s: any) => s.isCurrent);
        if (currentSeason) {
          setSelectedSeasons([currentSeason.id.toString()]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeason = (seasonId: string) => {
    setSelectedSeasons(prev => {
      if (prev.includes(seasonId)) {
        // Allow deselecting to show all seasons
        return prev.filter(id => id !== seasonId);
      } else {
        return [...prev, seasonId];
      }
    });
  };

  const getPlayerForAccolade = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const getSeasonForAccolade = (seasonId: number | null) => {
    if (!seasonId) return null;
    return seasons.find(s => s.id === seasonId);
  };

  // Filter accolades by selected seasons and search query
  const filteredAccolades = accolades.filter(accolade => {
    // If seasons are selected, filter by them
    if (selectedSeasons.length > 0) {
      if (!accolade.seasonId || !selectedSeasons.includes(accolade.seasonId.toString())) {
        return false;
      }
    }

    // Filter by search query
    if (searchQuery) {
      const player = getPlayerForAccolade(accolade.playerId);
      const season = getSeasonForAccolade(accolade.seasonId);
      const searchLower = searchQuery.toLowerCase();
      
      return (
        accolade.title.toLowerCase().includes(searchLower) ||
        (accolade.description || '').toLowerCase().includes(searchLower) ||
        (player?.displayName || '').toLowerCase().includes(searchLower) ||
        (season?.name || '').toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Group accolades by season
  const accoladesBySeason = filteredAccolades.reduce((acc: any, accolade: any) => {
    const seasonId = accolade.seasonId || 'no-season';
    if (!acc[seasonId]) {
      acc[seasonId] = [];
    }
    acc[seasonId].push(accolade);
    return acc;
  }, {});

  // Sort seasons (current first, then by ID descending)
  const sortedSeasonIds = Object.keys(accoladesBySeason).sort((a, b) => {
    if (a === 'no-season') return 1;
    if (b === 'no-season') return -1;
    
    const seasonA = seasons.find(s => s.id.toString() === a);
    const seasonB = seasons.find(s => s.id.toString() === b);
    
    if (seasonA?.isCurrent) return -1;
    if (seasonB?.isCurrent) return 1;
    
    return Number(b) - Number(a);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-mba-blue animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading accolades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center text-gray-900 dark:text-white">
              <Award className="w-10 h-10 mr-3 text-mba-blue" />
              Accolades
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Celebrating player achievements and honors
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search accolades, players, or seasons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-mba-blue focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Season Multi-Select */}
            <div className="relative">
              <button
                onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-mba-blue to-mba-red text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-mba-blue min-w-[180px] justify-between"
              >
                <Filter className="w-4 h-4" />
                <span>
                  {selectedSeasons.length === 0 
                    ? 'All Seasons' 
                    : selectedSeasons.length === 1 
                    ? seasons.find(s => s.id.toString() === selectedSeasons[0])?.name 
                    : `${selectedSeasons.length} Seasons`}
                </span>
                <span>▼</span>
              </button>
              {showSeasonDropdown && (
                <div className="absolute right-0 z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <button
                      onClick={() => setSelectedSeasons([])}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-sm text-gray-900 dark:text-white"
                    >
                      All Seasons
                    </button>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                  {seasons.map(season => (
                    <label
                      key={season.id}
                      className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSeasons.includes(season.id.toString())}
                        onChange={() => toggleSeason(season.id.toString())}
                        className="mr-3 w-4 h-4 text-mba-blue bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-mba-blue"
                      />
                      <span className="text-gray-900 dark:text-white">{season.name}</span>
                      {season.isCurrent && (
                        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Accolades by Season */}
      {filteredAccolades.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">No accolades found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedSeasonIds.map(seasonId => {
            const season = seasonId === 'no-season' ? null : getSeasonForAccolade(Number(seasonId));
            const seasonAccolades = accoladesBySeason[seasonId];

            return (
              <div key={seasonId} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white flex items-center">
                  {season ? season.name : 'No Season'}
                  {season?.isCurrent && (
                    <span className="ml-3 text-sm bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-full">
                      Current
                    </span>
                  )}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seasonAccolades.map((accolade: any) => {
                    const player = getPlayerForAccolade(accolade.playerId);
                    
                    return (
                      <Link
                        key={accolade.id}
                        href={`/players/${accolade.playerId}`}
                        className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:shadow-md transition-shadow"
                      >
                        {/* Player Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {player?.profilePicture ? (
                            <img
                              src={player.profilePicture}
                              alt={player.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-gray-400" />
                          )}
                        </div>

                        {/* Accolade Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white truncate">
                            {player?.displayName || 'Unknown Player'}
                          </div>
                          <div
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded text-sm font-medium text-white mt-1"
                            style={{ backgroundColor: accolade.color || '#FFD700' }}
                          >
                            {accolade.icon && <span>{accolade.icon}</span>}
                            <span>{accolade.title}</span>
                          </div>
                          {accolade.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {accolade.description}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
