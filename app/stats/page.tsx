'use client';

import { Trophy, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

type StatCategory = 'points' | 'rebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'possessionTime' | 'efficiency';
type StatMode = 'averages' | 'totals';

const statCategories = [
  { key: 'points' as StatCategory, label: 'Points', abbr: 'PTS' },
  { key: 'rebounds' as StatCategory, label: 'Rebounds', abbr: 'REB' },
  { key: 'assists' as StatCategory, label: 'Assists', abbr: 'AST' },
  { key: 'steals' as StatCategory, label: 'Steals', abbr: 'STL' },
  { key: 'blocks' as StatCategory, label: 'Blocks', abbr: 'BLK' },
  { key: 'turnovers' as StatCategory, label: 'Turnovers', abbr: 'TOV' },
  { key: 'possessionTime' as StatCategory, label: 'Possession Time', abbr: 'PT' },
  { key: 'efficiency' as StatCategory, label: 'Efficiency', abbr: 'EFF' },
];

export default function StatsPage() {
  const [selectedStat, setSelectedStat] = useState<StatCategory>('points');
  const [statMode, setStatMode] = useState<StatMode>('averages');
  const [selectedSeason, setSelectedSeason] = useState<string>('All-Time');
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['All-Time']);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 10;

  useEffect(() => {
    fetchData();
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const res = await fetch('/api/seasons');
      if (res.ok) {
        const seasons = await res.json();
        const seasonNames = seasons.map((s: any) => s.name);
        
        // Always include All-Time
        if (!seasonNames.includes('All-Time')) {
          seasonNames.push('All-Time');
        }
        
        setAvailableSeasons(seasonNames);
        
        // Set current season as default
        const currentSeason = seasons.find((s: any) => s.isCurrent);
        if (currentSeason) {
          setSelectedSeason(currentSeason.name);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchData = async () => {
    try {
      const [playersRes, teamsRes, gamesRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/teams'),
        fetch('/api/games')
      ]);
      const [playersData, teamsData, gamesData] = await Promise.all([
        playersRes.json(),
        teamsRes.json(),
        gamesRes.json()
      ]);
      setPlayers(playersData);
      setTeams(teamsData);
      setGames(gamesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team || null;
  };

  // Calculate per-season stats from gameStats
  const getPlayerSeasonStats = (player: any) => {
    if (selectedSeason === 'All-Time' || !player.gameStats || player.gameStats.length === 0) {
      // Return cumulative stats for All-Time
      // Calculate efficiency from stats if not present
      const stats = player.stats || {};
      const missedFG = (stats.fieldGoalsAttempted || 0) - (stats.fieldGoalsMade || 0);
      const missedFT = (stats.freeThrowsAttempted || 0) - (stats.freeThrowsMade || 0);
      const efficiency = stats.gamesPlayed > 0 
        ? ((stats.points || 0) + (stats.rebounds || 0) + (stats.assists || 0) + (stats.steals || 0) + (stats.blocks || 0) - missedFG - missedFT - (stats.turnovers || 0)) / stats.gamesPlayed
        : 0;
      const totalEfficiency = efficiency;
      
      return {
        gamesPlayed: stats.gamesPlayed || 0,
        points: stats.points || 0,
        rebounds: stats.rebounds || 0,
        assists: stats.assists || 0,
        steals: stats.steals || 0,
        blocks: stats.blocks || 0,
        turnovers: stats.turnovers || 0,
        possessionTime: stats.possessionTime || 0,
        efficiency: stats.efficiency || efficiency,
        totalEfficiency
      };
    }

    // Filter gameStats by games in the selected season
    const seasonGames = games.filter(g => g.season === selectedSeason);
    const seasonGameIds = new Set(seasonGames.map(g => g.id));
    const seasonGameStats = player.gameStats.filter((gs: any) => seasonGameIds.has(gs.gameId));

    if (seasonGameStats.length === 0) {
      // No games in this season
      return {
        gamesPlayed: 0,
        points: 0,
        rebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        possessionTime: 0,
        efficiency: 0,
        totalEfficiency: 0
      };
    }

    // Calculate averages from season game stats
    const gamesPlayed = seasonGameStats.length;
    const totals = seasonGameStats.reduce((acc: any, gs: any) => ({
      points: acc.points + (gs.points || 0),
      rebounds: acc.rebounds + (gs.rebounds || 0),
      assists: acc.assists + (gs.assists || 0),
      steals: acc.steals + (gs.steals || 0),
      blocks: acc.blocks + (gs.blocks || 0),
      turnovers: acc.turnovers + (gs.turnovers || 0),
      possessionTime: acc.possessionTime + (gs.possessionTime || 0),
      fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || 0),
      fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || 0),
      freeThrowsMade: acc.freeThrowsMade + (gs.freeThrowsMade || 0),
      freeThrowsAttempted: acc.freeThrowsAttempted + (gs.freeThrowsAttempted || 0),
    }), { points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, possessionTime: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0 });

    // Calculate efficiency: (PTS + REB + AST + STL + BLK - Missed FG - Missed FT - TOV) / GP
    const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
    const missedFT = totals.freeThrowsAttempted - totals.freeThrowsMade;
    const efficiency = gamesPlayed > 0 ? (totals.points + totals.rebounds + totals.assists + totals.steals + totals.blocks - missedFG - missedFT - totals.turnovers) / gamesPlayed : 0;
    const totalEfficiency = efficiency;

    return {
      gamesPlayed,
      points: gamesPlayed > 0 ? totals.points / gamesPlayed : 0,
      rebounds: gamesPlayed > 0 ? totals.rebounds / gamesPlayed : 0,
      assists: gamesPlayed > 0 ? totals.assists / gamesPlayed : 0,
      steals: gamesPlayed > 0 ? totals.steals / gamesPlayed : 0,
      blocks: gamesPlayed > 0 ? totals.blocks / gamesPlayed : 0,
      turnovers: gamesPlayed > 0 ? totals.turnovers / gamesPlayed : 0,
      possessionTime: gamesPlayed > 0 ? totals.possessionTime / gamesPlayed : 0,
      efficiency,
      totalEfficiency,
    };
  };

  const getStatValue = (player: any, stat: StatCategory) => {
    const seasonStats = getPlayerSeasonStats(player);
    if (statMode === 'totals') {
      return seasonStats[stat] * seasonStats.gamesPlayed;
    }
    return seasonStats[stat];
  };

  const getLeaders = (stat: StatCategory) => {
    return [...players]
      .map(p => ({
        ...p,
        seasonStats: getPlayerSeasonStats(p)
      }))
      .filter(p => p.seasonStats.gamesPlayed > 0)
      .sort((a, b) => {
        const aValue = statMode === 'totals' 
          ? a.seasonStats[stat] * a.seasonStats.gamesPlayed
          : a.seasonStats[stat];
        const bValue = statMode === 'totals'
          ? b.seasonStats[stat] * b.seasonStats.gamesPlayed
          : b.seasonStats[stat];
        return bValue - aValue;
      });
  };

  const allLeaders = getLeaders(selectedStat);
  const totalPages = Math.ceil(allLeaders.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const leaders = allLeaders.slice(startIndex, endIndex);
  const selectedCategory = statCategories.find(c => c.key === selectedStat);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading stats...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center text-gray-900 dark:text-white">
          <Trophy className="w-10 h-10 mr-3 text-mba-blue" />
          League Leaders
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Top performers in the Minecraft Basketball Association</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Season Selector */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Season:</label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-mba-blue"
          >
            {availableSeasons.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
        </div>

        {/* Totals/Averages Toggle */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setStatMode('averages')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statMode === 'averages'
                ? 'bg-gradient-to-r from-mba-blue to-mba-red text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Averages
          </button>
          <button
            onClick={() => setStatMode('totals')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              statMode === 'totals'
                ? 'bg-gradient-to-r from-mba-blue to-mba-red text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
          >
            Totals
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex space-x-2 min-w-max">
          {statCategories.map((category) => (
            <button
              key={category.key}
              onClick={() => {
                setSelectedStat(category.key);
                setCurrentPage(1);
              }}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedStat === category.key
                  ? 'bg-mba-blue text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pagination Info */}
      {allLeaders.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, allLeaders.length)} of {allLeaders.length} players
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  #
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  GP
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {statMode === 'totals' ? 'PTS' : 'PPG'}
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {statMode === 'totals' ? 'REB' : 'RPG'}
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {statMode === 'totals' ? 'AST' : 'APG'}
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {statMode === 'totals' ? 'STL' : 'SPG'}
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {statMode === 'totals' ? 'BLK' : 'BPG'}
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {statMode === 'totals' ? 'TOV' : 'TPG'}
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  {statMode === 'totals' ? 'MIN' : 'MPG'}
                </th>
                <th className="px-4 py-4 text-center text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                  EFF
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaders.length > 0 ? (
                leaders.map((player, index) => {
                  const actualRank = startIndex + index + 1;
                  return (
                  <tr key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {actualRank === 1 && <Trophy className="w-5 h-5 text-yellow-500 mr-2" />}
                        {actualRank === 2 && <Trophy className="w-5 h-5 text-gray-400 mr-2" />}
                        {actualRank === 3 && <Trophy className="w-5 h-5 text-amber-600 mr-2" />}
                        <span className="font-medium text-gray-900 dark:text-white">{actualRank}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/players/${player.id}`}
                        className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                          {player.profilePicture ? (
                            <img
                              src={player.profilePicture}
                              alt={player.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                              {player.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {player.displayName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            @{player.minecraftUsername}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {(() => {
                        const team = getTeamName(player.teamId);
                        if (!team) {
                          return <span className="text-sm text-gray-600 dark:text-gray-400">FA</span>;
                        }
                        return (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded overflow-hidden flex items-center justify-center flex-shrink-0" style={{ backgroundColor: team.colors.primary }}>
                              {team.logo ? (
                                <Image
                                  src={team.logo}
                                  alt={team.name}
                                  width={24}
                                  height={24}
                                  className="object-cover"
                                />
                              ) : (
                                <span className="text-xs font-bold" style={{ color: team.colors.secondary }}>
                                  {team.name.charAt(0)}
                                </span>
                              )}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">{team.name}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center text-gray-900 dark:text-white">
                      {player.seasonStats.gamesPlayed || 0}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'points' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.points || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.points || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'rebounds' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.rebounds || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.rebounds || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'assists' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.assists || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.assists || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'steals' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.steals || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.steals || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'blocks' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.blocks || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.blocks || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'turnovers' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.turnovers || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.turnovers || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'possessionTime' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.possessionTime || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.possessionTime || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'efficiency' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.totalEfficiency || 0)
                        : (player.seasonStats.efficiency || 0)).toFixed(1)}
                    </td>
                  </tr>
                );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No player statistics available yet.</p>
                    <p className="text-sm mt-1">Stats will appear once games are played!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {allLeaders.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Additional Stats Info */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCategories.map((category) => {
          const topPlayer = getLeaders(category.key)[0];
          return (
            <div
              key={category.key}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center shadow-sm"
            >
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{category.label} Leader</div>
              <div className="font-bold text-lg text-mba-blue">
                {topPlayer ? (topPlayer.seasonStats[category.key] || 0).toFixed(1) : '-'}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {topPlayer ? topPlayer.displayName : 'N/A'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

