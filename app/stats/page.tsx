'use client';

import { Trophy, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';

type StatCategory = 'minutes' | 'points' | 'rebounds' | 'offensiveRebounds' | 'defensiveRebounds' | 'assists' | 'steals' | 'blocks' | 'turnovers' | 'missesForced' | 'possessionTime' | 'efficiency' | 'fgPercentage' | 'threeFgPercentage';
type StatMode = 'averages' | 'totals';

const statCategories = [
  { key: 'minutes' as StatCategory, label: 'Minutes', abbr: 'MIN' },
  { key: 'points' as StatCategory, label: 'Points', abbr: 'PTS' },
  { key: 'offensiveRebounds' as StatCategory, label: 'Offensive Rebounds', abbr: 'OREB' },
  { key: 'defensiveRebounds' as StatCategory, label: 'Defensive Rebounds', abbr: 'DREB' },
  { key: 'rebounds' as StatCategory, label: 'Rebounds', abbr: 'REB' },
  { key: 'assists' as StatCategory, label: 'Assists', abbr: 'AST' },
  { key: 'steals' as StatCategory, label: 'Steals', abbr: 'STL' },
  { key: 'blocks' as StatCategory, label: 'Blocks', abbr: 'BLK' },
  { key: 'turnovers' as StatCategory, label: 'Turnovers', abbr: 'TOV' },
  { key: 'missesForced' as StatCategory, label: 'Misses Forced', abbr: 'MISS-AG' },
  { key: 'possessionTime' as StatCategory, label: 'Possession Time', abbr: 'PT' },
  { key: 'fgPercentage' as StatCategory, label: 'Field Goal %', abbr: 'FG%' },
  { key: 'threeFgPercentage' as StatCategory, label: '3-Point %', abbr: '3FG%' },
  { key: 'efficiency' as StatCategory, label: 'Efficiency', abbr: 'EFF' },
];

export default function StatsPage() {
  const [selectedStat, setSelectedStat] = useState<StatCategory>('minutes');
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [statMode, setStatMode] = useState<StatMode>('averages');
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(['All-Time']);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['All-Time']);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);
  const playersPerPage = 10;

  useEffect(() => {
    fetchData();
    fetchSeasons();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSeasonDropdown && !target.closest('.relative')) {
        setShowSeasonDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSeasonDropdown]);

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
          setSelectedSeasons([currentSeason.name]);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const toggleSeason = (season: string) => {
    setSelectedSeasons(prev => {
      if (prev.includes(season)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== season);
      } else {
        return [...prev, season];
      }
    });
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
    // Check if "All-Time" is selected
    const isAllTime = selectedSeasons.includes('All-Time');
    
    if (isAllTime || selectedSeasons.length === 0) {
      // For All-Time, aggregate ALL game stats across all seasons
      if (!player.gameStats || player.gameStats.length === 0) {
        return {
          gamesPlayed: 0,
          points: 0,
          rebounds: 0,
          offensiveRebounds: 0,
          defensiveRebounds: 0,
          assists: 0,
          steals: 0,
          blocks: 0,
          turnovers: 0,
          possessionTime: 0,
          efficiency: 0,
          totalEfficiency: 0
        };
      }

      const gamesPlayed = player.gameStats.length;
      const totals = player.gameStats.reduce((acc: any, gs: any) => ({
        minutes: acc.minutes + (gs.minutes || 0),
        points: acc.points + (gs.points || 0),
        rebounds: acc.rebounds + (gs.rebounds || 0),
        offensiveRebounds: acc.offensiveRebounds + (gs.offensiveRebounds || gs.offensive_rebounds || 0),
        defensiveRebounds: acc.defensiveRebounds + (gs.defensiveRebounds || gs.defensive_rebounds || 0),
        assists: acc.assists + (gs.assists || 0),
        steals: acc.steals + (gs.steals || 0),
        blocks: acc.blocks + (gs.blocks || 0),
        turnovers: acc.turnovers + (gs.turnovers || 0),
        missesForced: acc.missesForced + (gs.missesForced || gs.misses_forced || 0),
        possessionTime: acc.possessionTime + (gs.possessionTime || gs.possession_time || 0),
        fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || gs.field_goals_made || 0),
        fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || gs.field_goals_attempted || 0),
        threePointersMade: acc.threePointersMade + (gs.threePointersMade || gs.three_pointers_made || 0),
        threePointersAttempted: acc.threePointersAttempted + (gs.threePointersAttempted || gs.three_pointers_attempted || 0),
      }), { minutes: 0, points: 0, rebounds: 0, offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, missesForced: 0, possessionTime: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0 });

      const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
      const efficiency = gamesPlayed > 0 ? (totals.points + totals.rebounds + totals.assists + totals.steals - missedFG - totals.turnovers) / gamesPlayed : 0;
      const fgPercentage = totals.fieldGoalsAttempted > 0 ? (totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100 : 0;
      const threeFgPercentage = totals.threePointersAttempted > 0 ? (totals.threePointersMade / totals.threePointersAttempted) * 100 : 0;

      return {
        gamesPlayed,
        minutes: gamesPlayed > 0 ? totals.minutes / gamesPlayed : 0,
        points: gamesPlayed > 0 ? totals.points / gamesPlayed : 0,
        rebounds: gamesPlayed > 0 ? totals.rebounds / gamesPlayed : 0,
        offensiveRebounds: gamesPlayed > 0 ? totals.offensiveRebounds / gamesPlayed : 0,
        defensiveRebounds: gamesPlayed > 0 ? totals.defensiveRebounds / gamesPlayed : 0,
        assists: gamesPlayed > 0 ? totals.assists / gamesPlayed : 0,
        steals: gamesPlayed > 0 ? totals.steals / gamesPlayed : 0,
        blocks: gamesPlayed > 0 ? totals.blocks / gamesPlayed : 0,
        turnovers: gamesPlayed > 0 ? totals.turnovers / gamesPlayed : 0,
        missesForced: gamesPlayed > 0 ? totals.missesForced / gamesPlayed : 0,
        possessionTime: gamesPlayed > 0 ? totals.possessionTime / gamesPlayed : 0,
        efficiency,
        totalEfficiency: efficiency,
        fgPercentage,
        threeFgPercentage,
        fieldGoalsMade: totals.fieldGoalsMade,
        fieldGoalsAttempted: totals.fieldGoalsAttempted,
        threePointersMade: totals.threePointersMade,
        threePointersAttempted: totals.threePointersAttempted,
      };
    }

    if (!player.gameStats || player.gameStats.length === 0) {
      return {
        gamesPlayed: 0,
        minutes: 0,
        points: 0,
        rebounds: 0,
        offensiveRebounds: 0,
        defensiveRebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        missesForced: 0,
        possessionTime: 0,
        efficiency: 0,
        totalEfficiency: 0,
        fgPercentage: 0,
        threeFgPercentage: 0
      };
    }

    // Filter gameStats by games in the selected seasons (multiple seasons)
    const seasonGames = games.filter(g => selectedSeasons.includes(g.season));
    const seasonGameIds = new Set(seasonGames.map(g => g.id));
    const seasonGameStats = player.gameStats.filter((gs: any) => seasonGameIds.has(gs.gameId));

    if (seasonGameStats.length === 0) {
      // No games in these seasons
      return {
        gamesPlayed: 0,
        minutes: 0,
        points: 0,
        rebounds: 0,
        offensiveRebounds: 0,
        defensiveRebounds: 0,
        assists: 0,
        steals: 0,
        blocks: 0,
        turnovers: 0,
        missesForced: 0,
        possessionTime: 0,
        efficiency: 0,
        totalEfficiency: 0,
        fgPercentage: 0,
        threeFgPercentage: 0
      };
    }

    // Calculate averages from season game stats
    const gamesPlayed = seasonGameStats.length;
    const totals = seasonGameStats.reduce((acc: any, gs: any) => ({
      minutes: acc.minutes + (gs.minutes || 0),
      points: acc.points + (gs.points || 0),
      rebounds: acc.rebounds + (gs.rebounds || 0),
      offensiveRebounds: acc.offensiveRebounds + (gs.offensiveRebounds || gs.offensive_rebounds || 0),
      defensiveRebounds: acc.defensiveRebounds + (gs.defensiveRebounds || gs.defensive_rebounds || 0),
      assists: acc.assists + (gs.assists || 0),
      steals: acc.steals + (gs.steals || 0),
      blocks: acc.blocks + (gs.blocks || 0),
      turnovers: acc.turnovers + (gs.turnovers || 0),
      missesForced: acc.missesForced + (gs.missesForced || gs.misses_forced || 0),
      possessionTime: acc.possessionTime + (gs.possessionTime || gs.possession_time || 0),
      fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || gs.field_goals_made || 0),
      fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || gs.field_goals_attempted || 0),
      threePointersMade: acc.threePointersMade + (gs.threePointersMade || gs.three_pointers_made || 0),
      threePointersAttempted: acc.threePointersAttempted + (gs.threePointersAttempted || gs.three_pointers_attempted || 0),
    }), { minutes: 0, points: 0, rebounds: 0, offensiveRebounds: 0, defensiveRebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, missesForced: 0, possessionTime: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0 });

    // Calculate efficiency: (PTS + REB + AST + STL - Missed FG - TOV) / GP
    const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
    const efficiency = gamesPlayed > 0 ? (totals.points + totals.rebounds + totals.assists + totals.steals - missedFG - totals.turnovers) / gamesPlayed : 0;
    const totalEfficiency = efficiency;
    const fgPercentage = totals.fieldGoalsAttempted > 0 ? (totals.fieldGoalsMade / totals.fieldGoalsAttempted) * 100 : 0;
    const threeFgPercentage = totals.threePointersAttempted > 0 ? (totals.threePointersMade / totals.threePointersAttempted) * 100 : 0;

    return {
      gamesPlayed,
      minutes: gamesPlayed > 0 ? totals.minutes / gamesPlayed : 0,
      points: gamesPlayed > 0 ? totals.points / gamesPlayed : 0,
      rebounds: gamesPlayed > 0 ? totals.rebounds / gamesPlayed : 0,
      offensiveRebounds: gamesPlayed > 0 ? totals.offensiveRebounds / gamesPlayed : 0,
      defensiveRebounds: gamesPlayed > 0 ? totals.defensiveRebounds / gamesPlayed : 0,
      assists: gamesPlayed > 0 ? totals.assists / gamesPlayed : 0,
      steals: gamesPlayed > 0 ? totals.steals / gamesPlayed : 0,
      blocks: gamesPlayed > 0 ? totals.blocks / gamesPlayed : 0,
      turnovers: gamesPlayed > 0 ? totals.turnovers / gamesPlayed : 0,
      missesForced: gamesPlayed > 0 ? totals.missesForced / gamesPlayed : 0,
      possessionTime: gamesPlayed > 0 ? totals.possessionTime / gamesPlayed : 0,
      efficiency,
      totalEfficiency,
      fgPercentage,
      threeFgPercentage,
      fieldGoalsMade: totals.fieldGoalsMade,
      fieldGoalsAttempted: totals.fieldGoalsAttempted,
      threePointersMade: totals.threePointersMade,
      threePointersAttempted: totals.threePointersAttempted,
    };
  };

  const getStatValue = (player: any, stat: StatCategory) => {
    const seasonStats = getPlayerSeasonStats(player);
    if (!seasonStats) return 0;
    
    // Percentages should not be multiplied by games played
    if (stat === 'fgPercentage' || stat === 'threeFgPercentage') {
      return seasonStats[stat] ?? 0;
    }
    if (statMode === 'totals') {
      return (seasonStats[stat] ?? 0) * seasonStats.gamesPlayed;
    }
    return seasonStats[stat] ?? 0;
  };

  const getLeaders = (stat: StatCategory) => {
    return [...players]
      .map(p => ({
        ...p,
        seasonStats: getPlayerSeasonStats(p)
      }))
      .filter(p => {
        // Basic filter: must have played at least one game
        if (p.seasonStats.gamesPlayed === 0) return false;
        
        return true;
      })
      .sort((a, b) => {
        // Percentages should not be multiplied by games played
        const isPercentage = stat === 'fgPercentage' || stat === 'threeFgPercentage';
        const aValue = (statMode === 'totals' && !isPercentage)
          ? a.seasonStats[stat] * a.seasonStats.gamesPlayed
          : a.seasonStats[stat];
        const bValue = (statMode === 'totals' && !isPercentage)
          ? b.seasonStats[stat] * b.seasonStats.gamesPlayed
          : b.seasonStats[stat];
        
        // Apply sort direction
        return sortDirection === 'desc' ? bValue - aValue : aValue - bValue;
      });
  };

  const handleColumnClick = (stat: StatCategory) => {
    if (selectedStat === stat) {
      // Toggle sort direction if clicking the same column
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc');
    } else {
      // New column selected, default to descending
      setSelectedStat(stat);
      setSortDirection('desc');
      setCurrentPage(1);
    }
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
        {/* Season Multi-Selector */}
        <div className="relative">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Seasons:</label>
          <div className="relative">
            <button
              onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-mba-blue min-w-[200px] text-left flex items-center justify-between"
            >
              <span className="truncate">
                {selectedSeasons.length === 1 ? selectedSeasons[0] : `${selectedSeasons.length} seasons selected`}
              </span>
              <span className="ml-2">▼</span>
            </button>
            {showSeasonDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {availableSeasons.map(season => (
                  <label
                    key={season}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeasons.includes(season)}
                      onChange={() => toggleSeason(season)}
                      className="mr-3 w-4 h-4 text-mba-blue bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-mba-blue"
                    />
                    <span className="text-gray-900 dark:text-white">{season}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Totals/Averages Toggle */}
        <div className="flex flex-col">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">View:</label>
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
                <th 
                  onClick={() => handleColumnClick('minutes')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'minutes' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'MIN' : 'MPG'}
                    </span>
                    {selectedStat === 'minutes' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('points')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'points' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'PTS' : 'PPG'}
                    </span>
                    {selectedStat === 'points' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('offensiveRebounds')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'offensiveRebounds' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'OREB' : 'ORPG'}
                    </span>
                    {selectedStat === 'offensiveRebounds' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('defensiveRebounds')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'defensiveRebounds' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'DREB' : 'DRPG'}
                    </span>
                    {selectedStat === 'defensiveRebounds' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('rebounds')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'rebounds' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'REB' : 'RPG'}
                    </span>
                    {selectedStat === 'rebounds' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('assists')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'assists' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'AST' : 'APG'}
                    </span>
                    {selectedStat === 'assists' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('steals')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'steals' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'STL' : 'SPG'}
                    </span>
                    {selectedStat === 'steals' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('blocks')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'blocks' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'BLK' : 'BPG'}
                    </span>
                    {selectedStat === 'blocks' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('turnovers')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'turnovers' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'TOV' : 'TPG'}
                    </span>
                    {selectedStat === 'turnovers' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('missesForced')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'missesForced' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'MISS-AG' : 'MFPG'}
                    </span>
                    {selectedStat === 'missesForced' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('possessionTime')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'possessionTime' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      {statMode === 'totals' ? 'PT' : 'PTPG'}
                    </span>
                    {selectedStat === 'possessionTime' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('fgPercentage')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'fgPercentage' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      FG%
                    </span>
                    {selectedStat === 'fgPercentage' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('threeFgPercentage')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'threeFgPercentage' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      3FG%
                    </span>
                    {selectedStat === 'threeFgPercentage' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
                </th>
                <th 
                  onClick={() => handleColumnClick('efficiency')}
                  className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors select-none"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span className={selectedStat === 'efficiency' ? 'text-mba-blue font-bold' : 'text-gray-600 dark:text-gray-400'}>
                      EFF
                    </span>
                    {selectedStat === 'efficiency' && (
                      <span className="text-mba-blue">{sortDirection === 'desc' ? '▼' : '▲'}</span>
                    )}
                  </div>
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
                      selectedStat === 'minutes' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(() => {
                        const totalMinutes = statMode === 'totals' 
                          ? (player.seasonStats.minutes || 0) * (player.seasonStats.gamesPlayed || 0)
                          : (player.seasonStats.minutes || 0);
                        const mins = Math.floor(totalMinutes / 60);
                        const secs = Math.round(totalMinutes % 60);
                        return `${mins}:${secs.toString().padStart(2, '0')}`;
                      })()}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'points' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.points || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.points || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'offensiveRebounds' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.offensiveRebounds || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.offensiveRebounds || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'defensiveRebounds' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.defensiveRebounds || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.defensiveRebounds || 0)).toFixed(1)}
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
                      selectedStat === 'missesForced' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.missesForced || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.missesForced || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'possessionTime' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(statMode === 'totals' 
                        ? (player.seasonStats.possessionTime || 0) * (player.seasonStats.gamesPlayed || 0)
                        : (player.seasonStats.possessionTime || 0)).toFixed(1)}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'fgPercentage' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(player.seasonStats.fgPercentage || 0).toFixed(1)}%
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-center ${
                      selectedStat === 'threeFgPercentage' ? 'font-bold text-mba-blue' : 'text-gray-900 dark:text-white'
                    }`}>
                      {(player.seasonStats.threeFgPercentage || 0).toFixed(1)}%
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
                  <td colSpan={16} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
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
          const isPercentage = category.key === 'fgPercentage' || category.key === 'threeFgPercentage';
          const value = topPlayer ? (topPlayer.seasonStats[category.key] || 0).toFixed(1) : '-';
          return (
            <div
              key={category.key}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 text-center shadow-sm"
            >
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{category.label} Leader</div>
              <div className="font-bold text-lg text-mba-blue">
                {value}{isPercentage && value !== '-' ? '%' : ''}
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

