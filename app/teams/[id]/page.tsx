'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Users, Trophy, TrendingUp, DollarSign } from 'lucide-react';
import { useEffect, useState } from 'react';
// import TeamWall from '@/components/TeamWall'; // DISABLED - Team wall removed

export default function TeamPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<any>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [teamGames, setTeamGames] = useState<any[]>([]);
  const [upcomingGames, setUpcomingGames] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamStaff, setTeamStaff] = useState<any[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<string>('All-Time');
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['All-Time']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    fetchSeasons();
  }, [params.id]);

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
      const [teamsRes, playersRes, gamesRes, staffRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/players'),
        fetch('/api/games'),
        fetch(`/api/team-staff?teamId=${params.id}`)
      ]);
      const [teamsData, playersData, gamesData, staffData] = await Promise.all([
        teamsRes.json(),
        playersRes.json(),
        gamesRes.json(),
        staffRes.json()
      ]);
      
      const currentTeam = teamsData.find((t: any) => t.id === params.id);
      if (!currentTeam) {
        notFound();
      }
      
      setTeam(currentTeam);
      setTeams(teamsData);
      setTeamPlayers(playersData.filter((p: any) => p.teamId === currentTeam.id));
      setTeamStaff(staffData || []);
      
      // Filter completed games and sort by date (most recent first)
      let filteredGames = gamesData.filter(
        (g: any) => (g.homeTeamId === currentTeam.id || g.awayTeamId === currentTeam.id) && g.status === 'completed'
      );
      setTeamGames(filteredGames.sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()));
      
      // Filter upcoming games and sort by date (soonest first)
      let upcomingFiltered = gamesData.filter(
        (g: any) => (g.homeTeamId === currentTeam.id || g.awayTeamId === currentTeam.id) && g.status === 'scheduled'
      );
      setUpcomingGames(upcomingFiltered.sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 dark:text-gray-400">Loading...</div>
        </div>
      </main>
    );
  }

  if (!team) {
    notFound();
  }

  // Filter games by season
  const filteredGamesBySeason = selectedSeason === 'All-Time' 
    ? teamGames 
    : teamGames.filter(game => game.season === selectedSeason);

  // Calculate team record
  const wins = filteredGamesBySeason.filter(game => {
    const isHome = game.homeTeamId === team.id;
    
    // Check forfeit first
    if (game.isForfeit && game.forfeitWinner) {
      return (isHome && game.forfeitWinner === 'home') || (!isHome && game.forfeitWinner === 'away');
    }
    
    // Normal game
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const opponentScore = isHome ? game.awayScore : game.homeScore;
    return teamScore && opponentScore && teamScore > opponentScore;
  }).length;

  const losses = filteredGamesBySeason.filter(game => {
    const isHome = game.homeTeamId === team.id;
    
    // Check forfeit first
    if (game.isForfeit && game.forfeitWinner) {
      return (isHome && game.forfeitWinner === 'away') || (!isHome && game.forfeitWinner === 'home');
    }
    
    // Normal game
    const teamScore = isHome ? game.homeScore : game.awayScore;
    const opponentScore = isHome ? game.awayScore : game.homeScore;
    return teamScore && opponentScore && teamScore < opponentScore;
  }).length;

  // Calculate point differential
  const pointDifferential = filteredGamesBySeason.reduce((diff, game) => {
    const isHome = game.homeTeamId === team.id;
    const teamScore = isHome ? (game.homeScore || 0) : (game.awayScore || 0);
    const opponentScore = isHome ? (game.awayScore || 0) : (game.homeScore || 0);
    return diff + (teamScore - opponentScore);
  }, 0);

  // Calculate scoring averages
  const gamesPlayed = wins + losses;
  const totalPointsFor = filteredGamesBySeason.reduce((total, game) => {
    const isHome = game.homeTeamId === team.id;
    const teamScore = isHome ? (game.homeScore || 0) : (game.awayScore || 0);
    return total + teamScore;
  }, 0);
  
  const totalPointsAgainst = filteredGamesBySeason.reduce((total, game) => {
    const isHome = game.homeTeamId === team.id;
    const opponentScore = isHome ? (game.awayScore || 0) : (game.homeScore || 0);
    return total + opponentScore;
  }, 0);

  const avgPointsFor = gamesPlayed > 0 ? (totalPointsFor / gamesPlayed).toFixed(1) : '0.0';
  const avgPointsAgainst = gamesPlayed > 0 ? (totalPointsAgainst / gamesPlayed).toFixed(1) : '0.0';

  // Calculate salary cap usage
  const totalCapSpent = teamPlayers.reduce((sum, player) => sum + (player.coinWorth || 0), 0);
  const salaryCap = team.salaryCap || 19000;
  const capRemaining = salaryCap - totalCapSpent;
  const capPercentage = (totalCapSpent / salaryCap) * 100;

  // Get game IDs from filtered games by season
  const seasonGameIds = new Set(filteredGamesBySeason.map(game => game.id));

  // Helper function to filter player stats by season
  const getSeasonStats = (player: any) => {
    if (!player.gameStats) return [];
    return player.gameStats.filter((stat: any) => seasonGameIds.has(stat.gameId));
  };

  // Get stat leaders from gameStats (filtered by season)
  const getStatLeader = (stat: 'points' | 'rebounds' | 'assists') => {
    if (teamPlayers.length === 0) return null;
    return teamPlayers.reduce((leader, player) => {
      const seasonStats = getSeasonStats(player);
      const playerTotal = seasonStats.reduce((total: number, game: any) => total + (game[stat] || 0), 0);
      const playerAvg = seasonStats.length > 0 ? playerTotal / seasonStats.length : 0;
      
      const leaderSeasonStats = getSeasonStats(leader);
      const leaderTotal = leaderSeasonStats.reduce((total: number, game: any) => total + (game[stat] || 0), 0);
      const leaderAvg = leaderSeasonStats.length > 0 ? leaderTotal / leaderSeasonStats.length : 0;
      
      return playerAvg > leaderAvg ? player : leader;
    });
  };

  // Get possession time leader from game stats (filtered by season)
  const getMinutesLeader = () => {
    if (teamPlayers.length === 0) return null;
    return teamPlayers.reduce((leader, player) => {
      const seasonStats = getSeasonStats(player);
      const playerMinutes = seasonStats.reduce((total: number, game: any) => total + (game.possessionTime || 0), 0);
      
      const leaderSeasonStats = getSeasonStats(leader);
      const leaderMinutes = leaderSeasonStats.reduce((total: number, game: any) => total + (game.possessionTime || 0), 0);
      
      return playerMinutes > leaderMinutes ? player : leader;
    });
  };

  // Get efficiency leader from game stats (filtered by season)
  const getEfficiencyLeader = () => {
    if (teamPlayers.length === 0) return null;
    return teamPlayers.reduce((leader, player) => {
      const calculateEfficiency = (p: any) => {
        const seasonStats = getSeasonStats(p);
        if (seasonStats.length === 0) return 0;
        const totals = seasonStats.reduce((acc: any, gs: any) => ({
          points: acc.points + (gs.points || 0),
          rebounds: acc.rebounds + (gs.rebounds || 0),
          assists: acc.assists + (gs.assists || 0),
          steals: acc.steals + (gs.steals || 0),
          turnovers: acc.turnovers + (gs.turnovers || 0),
          fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || 0),
          fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || 0)
        }), { points: 0, rebounds: 0, assists: 0, steals: 0, turnovers: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0 });
        const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
        return (totals.points + totals.rebounds + totals.assists + totals.steals - missedFG - totals.turnovers) / seasonStats.length;
      };
      return calculateEfficiency(player) > calculateEfficiency(leader) ? player : leader;
    });
  };

  const pointsLeader = getStatLeader('points');
  const reboundsLeader = getStatLeader('rebounds');
  const assistsLeader = getStatLeader('assists');
  const minutesLeader = getMinutesLeader();
  const efficiencyLeader = getEfficiencyLeader();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link 
          href="/branding"
          className="inline-flex items-center space-x-2 text-mba-blue hover:text-blue-600 dark:text-blue-400 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Teams</span>
        </Link>

        {/* Team Header */}
        <div 
          className="rounded-xl p-8 mb-8 text-white shadow-lg"
          style={{ 
            background: `linear-gradient(135deg, ${team.colors.primary} 0%, ${team.colors.secondary} 100%)` 
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              {/* Team Logo */}
              <div className="w-24 h-24 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                {team.logo ? (
                  <Image
                    src={team.logo}
                    alt={team.name}
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                ) : (
                  <div className="text-4xl font-bold">{team.name.charAt(0)}</div>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{team.name}</h1>
                <p className="text-xl opacity-90">{team.conference} Conference</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold">{wins}-{losses}</div>
              <div className="text-sm opacity-90 mt-1">{selectedSeason} Record</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
            {['Franchise Owner', 'Head Coach', 'Assistant Coach', 'General Manager'].map((role) => {
              const staffMembers = teamStaff.filter((s: any) => s.role === role);
              return (
                <div key={role}>
                  <div className="text-sm opacity-75">{role}</div>
                  {staffMembers.length > 0 ? (
                    staffMembers.map((staff: any) => (
                      <div key={staff.id} className="font-semibold">
                        {staff.player?.username || 'Unknown'}
                      </div>
                    ))
                  ) : (
                    <div className="font-semibold">TBD</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Season Filter */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Select Season
          </label>
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
          >
            {availableSeasons.map((season) => (
              <option key={season} value={season}>
                {season}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Salary Cap Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-2 border-green-200 dark:border-green-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <DollarSign className="w-6 h-6 mr-2 text-green-600 dark:text-green-400" />
                Salary Cap Status
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">Cap Space</span>
                  <span className={`text-2xl font-bold ${capRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    ${(capRemaining / 1000).toFixed(2)}k
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full transition-all ${capPercentage > 100 ? 'bg-red-500' : capPercentage > 90 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(capPercentage, 100)}%` }}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Spent</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${(totalCapSpent / 1000).toFixed(2)}k
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Salary Cap</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${(salaryCap / 1000).toFixed(2)}k
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Usage</div>
                    <div className={`text-lg font-bold ${capPercentage > 100 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                      {capPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Team Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Trophy className="w-6 h-6 mr-2 text-mba-blue" />
                Team Statistics
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{wins}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Wins</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600 dark:text-red-400">{losses}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Losses</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{avgPointsFor}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">PPG</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{avgPointsAgainst}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Opp PPG</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <div className={`text-3xl font-bold ${pointDifferential >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {pointDifferential >= 0 ? '+' : ''}{pointDifferential}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Point Diff</div>
                </div>
              </div>
            </div>

            {/* Stat Leaders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrendingUp className="w-6 h-6 mr-2 text-mba-blue" />
                Team Leaders
              </h2>
              
              {teamPlayers.length > 0 ? (
                <div className="space-y-4">
                  {pointsLeader && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                          {pointsLeader.profilePicture ? (
                            <img
                              src={pointsLeader.profilePicture}
                              alt={pointsLeader.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {pointsLeader.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {pointsLeader.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Points Leader</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-mba-blue">
                        {(() => {
                          const seasonStats = getSeasonStats(pointsLeader);
                          const total = seasonStats.reduce((sum: number, game: any) => sum + (game.points || 0), 0);
                          const avg = seasonStats.length > 0 ? total / seasonStats.length : 0;
                          return avg.toFixed(1);
                        })()}
                      </div>
                    </div>
                  )}

                  {reboundsLeader && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                          {reboundsLeader.profilePicture ? (
                            <img
                              src={reboundsLeader.profilePicture}
                              alt={reboundsLeader.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {reboundsLeader.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {reboundsLeader.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Rebounds Leader</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-mba-blue">
                        {(() => {
                          const seasonStats = getSeasonStats(reboundsLeader);
                          const total = seasonStats.reduce((sum: number, game: any) => sum + (game.rebounds || 0), 0);
                          const avg = seasonStats.length > 0 ? total / seasonStats.length : 0;
                          return avg.toFixed(1);
                        })()}
                      </div>
                    </div>
                  )}

                  {assistsLeader && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                          {assistsLeader.profilePicture ? (
                            <img
                              src={assistsLeader.profilePicture}
                              alt={assistsLeader.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {assistsLeader.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {assistsLeader.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Assists Leader</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-mba-blue">
                        {(() => {
                          const seasonStats = getSeasonStats(assistsLeader);
                          const total = seasonStats.reduce((sum: number, game: any) => sum + (game.assists || 0), 0);
                          const avg = seasonStats.length > 0 ? total / seasonStats.length : 0;
                          return avg.toFixed(1);
                        })()}
                      </div>
                    </div>
                  )}

                  {minutesLeader && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                          {minutesLeader.profilePicture ? (
                            <img
                              src={minutesLeader.profilePicture}
                              alt={minutesLeader.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {minutesLeader.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {minutesLeader.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Possession Time Leader</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-mba-blue">
                        {(() => {
                          const seasonStats = getSeasonStats(minutesLeader);
                          const total = seasonStats.reduce((sum: number, game: any) => sum + (game.possessionTime || 0), 0);
                          const avg = seasonStats.length > 0 ? total / seasonStats.length : 0;
                          return avg.toFixed(1);
                        })()}
                      </div>
                    </div>
                  )}

                  {efficiencyLeader && getSeasonStats(efficiencyLeader).length > 0 && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex-shrink-0">
                          {efficiencyLeader.profilePicture ? (
                            <img
                              src={efficiencyLeader.profilePicture}
                              alt={efficiencyLeader.displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              {efficiencyLeader.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {efficiencyLeader.displayName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">Efficiency Leader</div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-mba-blue">
                        {(() => {
                          const seasonStats = getSeasonStats(efficiencyLeader);
                          const totals = seasonStats.reduce((acc: any, gs: any) => ({
                            points: acc.points + (gs.points || 0),
                            rebounds: acc.rebounds + (gs.rebounds || 0),
                            assists: acc.assists + (gs.assists || 0),
                            steals: acc.steals + (gs.steals || 0),
                            turnovers: acc.turnovers + (gs.turnovers || 0),
                            fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || 0),
                            fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || 0)
                          }), { points: 0, rebounds: 0, assists: 0, steals: 0, turnovers: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0 });
                          const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
                          return ((totals.points + totals.rebounds + totals.assists + totals.steals - missedFG - totals.turnovers) / seasonStats.length).toFixed(1);
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No players on this team yet.</p>
              )}
            </div>

            {/* Upcoming Games */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Upcoming Games</h2>
              
              {upcomingGames.length > 0 ? (
                <div className="space-y-3">
                  {upcomingGames.slice(0, 5).map((game) => {
                    const isHome = game.homeTeamId === team.id;
                    const opponent = teams.find(t => t.id === (isHome ? game.awayTeamId : game.homeTeamId));

                    return (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="px-3 py-1 rounded-full text-sm font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {isHome ? 'HOME' : 'AWAY'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {isHome ? 'vs' : '@'} {opponent?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(game.scheduledDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No upcoming games scheduled.</p>
              )}
            </div>

            {/* Recent Games */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Recent Games</h2>
              
              {teamGames.length > 0 ? (
                <div className="space-y-3">
                  {teamGames.slice(0, 10).map((game) => {
                    const isHome = game.homeTeamId === team.id;
                    const opponent = teams.find(t => t.id === (isHome ? game.awayTeamId : game.homeTeamId));
                    const teamScore = isHome ? game.homeScore : game.awayScore;
                    const opponentScore = isHome ? game.awayScore : game.homeScore;
                    const won = teamScore && opponentScore && teamScore > opponentScore;

                    return (
                      <div
                        key={game.id}
                        className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                            won 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {won ? 'W' : 'L'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {isHome ? 'vs' : '@'} {opponent?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(game.scheduledDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {teamScore} - {opponentScore}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No games played yet.</p>
              )}
            </div>
          </div>

          {/* Right Column - Roster */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Users className="w-6 h-6 mr-2 text-mba-blue" />
                Roster ({teamPlayers.length})
              </h2>
              
              {teamPlayers.length > 0 ? (
                <div className="space-y-3">
                  {teamPlayers.map((player) => (
                    <Link
                      key={player.id}
                      href={`/players/${player.id}`}
                      className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <img
                        src={player.profilePicture}
                        alt={player.displayName}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {player.displayName}
                          </span>
                          {player.roles?.includes('Rookie') && (
                            <span className="px-2 py-0.5 text-xs font-bold bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                              ROOKIE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-400">
                            {(() => {
                              const seasonStats = getSeasonStats(player);
                              const total = seasonStats.reduce((sum: number, game: any) => sum + (game.points || 0), 0);
                              const avg = seasonStats.length > 0 ? total / seasonStats.length : 0;
                              return avg.toFixed(1);
                            })()} PPG
                          </span>
                          <span className="text-gray-500 dark:text-gray-500">•</span>
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            ${(player.coinWorth ?? 1000).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No players on roster.</p>
              )}
            </div>
          </div>
        </div>

        {/* Team Wall Section - DISABLED */}
        {/* <div className="mt-8">
          <TeamWall teamId={team.id} />
        </div> */}
      </div>
    </main>
  );
}

