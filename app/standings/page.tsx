'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, TrendingUp, TrendingDown } from 'lucide-react';

type ViewMode = 'overall' | 'western' | 'eastern';
type RecordType = 'overall' | 'conference';

interface TeamStanding {
  team: any;
  wins: number;
  losses: number;
  winPercentage: number;
  pointDifferential: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
}

export default function StandingsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('overall');
  const [recordType, setRecordType] = useState<RecordType>('overall');
  const [selectedSeason, setSelectedSeason] = useState<string>('All-Time');
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['All-Time']);
  const [teams, setTeams] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      const [teamsRes, gamesRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/games')
      ]);
      const [teamsData, gamesData] = await Promise.all([
        teamsRes.json(),
        gamesRes.json()
      ]);
      setTeams(teamsData);
      setGames(gamesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate standings for each team
  const calculateStandings = (conferenceFilter?: 'Western' | 'Eastern', seasonFilter?: string, recordTypeFilter?: RecordType): TeamStanding[] => {
    return teams.map(team => {
      // Get all completed games for this team
      let teamGames = games.filter(
        g => (g.homeTeamId === team.id || g.awayTeamId === team.id) && g.status === 'completed'
      );

      // Filter by season if not "All-Time"
      if (seasonFilter && seasonFilter !== 'All-Time') {
        teamGames = teamGames.filter(game => game.season === seasonFilter);
      }

      // If recordType is 'conference', only count games against teams in the same conference
      if (recordTypeFilter === 'conference') {
        teamGames = teamGames.filter(game => {
          const opponentId = game.homeTeamId === team.id ? game.awayTeamId : game.homeTeamId;
          const opponent = teams.find(t => t.id === opponentId);
          return opponent?.conference === team.conference;
        });
      }

      let wins = 0;
      let losses = 0;
      let pointsFor = 0;
      let pointsAgainst = 0;
      const recentResults: boolean[] = [];

      teamGames.forEach(game => {
        const isHome = game.homeTeamId === team.id;
        const teamScore = isHome ? (game.homeScore || 0) : (game.awayScore || 0);
        const opponentScore = isHome ? (game.awayScore || 0) : (game.homeScore || 0);

        pointsFor += teamScore;
        pointsAgainst += opponentScore;

        // Check if this is a forfeit game
        let teamWon = false;
        if (game.isForfeit && game.forfeitWinner) {
          // Award win/loss based on forfeit winner
          teamWon = (isHome && game.forfeitWinner === 'home') || (!isHome && game.forfeitWinner === 'away');
        } else {
          // Normal game - compare scores
          teamWon = teamScore > opponentScore;
        }

        if (teamWon) {
          wins++;
          recentResults.push(true);
        } else {
          losses++;
          recentResults.push(false);
        }
      });

      // Calculate streak
      let streak = '';
      if (recentResults.length > 0) {
        const lastResult = recentResults[recentResults.length - 1];
        let streakCount = 1;
        for (let i = recentResults.length - 2; i >= 0; i--) {
          if (recentResults[i] === lastResult) {
            streakCount++;
          } else {
            break;
          }
        }
        streak = (lastResult ? 'W' : 'L') + streakCount;
      } else {
        streak = '-';
      }

      const gamesPlayed = wins + losses;
      const winPercentage = gamesPlayed > 0 ? wins / gamesPlayed : 0;

      return {
        team,
        wins,
        losses,
        winPercentage,
        pointDifferential: pointsFor - pointsAgainst,
        pointsFor,
        pointsAgainst,
        streak,
      };
    });
  };

  // Filter standings based on view mode
  const getFilteredStandings = () => {
    let standings: TeamStanding[];
    
    // Calculate standings with recordType determining which games count
    standings = calculateStandings(undefined, selectedSeason, recordType);
    
    // Filter teams by conference for display only
    if (viewMode === 'western') {
      standings = standings.filter(s => s.team.conference === 'Western');
    } else if (viewMode === 'eastern') {
      standings = standings.filter(s => s.team.conference === 'Eastern');
    }

    // Sort by wins (descending), then by losses (ascending), then by point differential (descending)
    return standings.sort((a, b) => {
      // First priority: wins (more wins = higher rank)
      if (b.wins !== a.wins) return b.wins - a.wins;
      // Second priority: losses (fewer losses = higher rank)
      if (a.losses !== b.losses) return a.losses - b.losses;
      // Third priority: point differential (higher differential = higher rank)
      return b.pointDifferential - a.pointDifferential;
    });
  };

  const standings = getFilteredStandings();

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">Loading standings...</div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2">
            League Standings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Team records and conference rankings
          </p>
        </div>

        {/* Filters */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          {/* Season Filter */}
          <div className="w-full max-w-xs">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 text-center">
              Select Season
            </label>
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white shadow-sm"
            >
              {availableSeasons.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>

          {/* Record Type Filter */}
          <div className="w-full max-w-xs">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300 text-center">
              Record Type
            </label>
            <select
              value={recordType}
              onChange={(e) => setRecordType(e.target.value as RecordType)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white shadow-sm"
            >
              <option value="overall">Overall</option>
              <option value="conference">Conference</option>
            </select>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setViewMode('overall')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'overall'
                  ? 'bg-gradient-to-r from-mba-blue to-mba-red text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Overall
            </button>
            <button
              onClick={() => setViewMode('western')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'western'
                  ? 'bg-gradient-to-r from-mba-blue to-mba-red text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Western
            </button>
            <button
              onClick={() => setViewMode('eastern')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                viewMode === 'eastern'
                  ? 'bg-gradient-to-r from-mba-blue to-mba-red text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Eastern
            </button>
          </div>
        </div>

        {/* Standings Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    W
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    L
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Win %
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    PF
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    PA
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Diff
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Streak
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {standings.map((standing, index) => (
                  <tr
                    key={standing.team.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {index + 1}
                        </span>
                        {index === 0 && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/teams/${standing.team.id}`}
                        className="flex items-center space-x-3 group"
                      >
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                          style={{ backgroundColor: standing.team.colors.primary }}
                        >
                          {standing.team.logo ? (
                            <Image
                              src={standing.team.logo}
                              alt={standing.team.name}
                              width={40}
                              height={40}
                              className="object-cover"
                            />
                          ) : (
                            standing.team.name.substring(0, 3).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white group-hover:text-mba-blue dark:group-hover:text-blue-400">
                            {standing.team.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {standing.team.conference} Conference
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {standing.wins}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        {standing.losses}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {standing.winPercentage.toFixed(3)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {standing.pointsFor}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {standing.pointsAgainst}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {standing.pointDifferential > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                        ) : standing.pointDifferential < 0 ? (
                          <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                        ) : null}
                        <span className={`text-sm font-semibold ${
                          standing.pointDifferential > 0
                            ? 'text-green-600 dark:text-green-400'
                            : standing.pointDifferential < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {standing.pointDifferential > 0 ? '+' : ''}
                          {standing.pointDifferential}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`text-sm font-semibold ${
                        standing.streak.startsWith('W')
                          ? 'text-green-600 dark:text-green-400'
                          : standing.streak.startsWith('L')
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {standing.streak}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {standings.length === 0 && (
            <div className="text-center py-12 text-gray-600 dark:text-gray-400">
              No teams found for this conference.
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div><span className="font-semibold">W:</span> Wins</div>
            <div><span className="font-semibold">L:</span> Losses</div>
            <div><span className="font-semibold">Win %:</span> Win Percentage</div>
            <div><span className="font-semibold">PF:</span> Points For</div>
            <div><span className="font-semibold">PA:</span> Points Against</div>
            <div><span className="font-semibold">Diff:</span> Point Differential</div>
            <div><span className="font-semibold">Streak:</span> Current Win/Loss Streak</div>
          </div>
        </div>
      </div>
    </main>
  );
}

