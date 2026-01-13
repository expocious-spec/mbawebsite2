'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Users, Trophy, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
// import TeamWall from '@/components/TeamWall'; // DISABLED - Team wall removed

export default function TeamPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<any>(null);
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [teamGames, setTeamGames] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
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
      const [teamsRes, playersRes, gamesRes] = await Promise.all([
        fetch('/api/teams'),
        fetch('/api/players'),
        fetch('/api/games')
      ]);
      const [teamsData, playersData, gamesData] = await Promise.all([
        teamsRes.json(),
        playersRes.json(),
        gamesRes.json()
      ]);
      
      const currentTeam = teamsData.find((t: any) => t.id === params.id);
      if (!currentTeam) {
        notFound();
      }
      
      setTeam(currentTeam);
      setTeams(teamsData);
      setTeamPlayers(playersData.filter((p: any) => p.teamId === currentTeam.id));
      
      // Filter games and sort by date
      let filteredGames = gamesData.filter(
        (g: any) => (g.homeTeamId === currentTeam.id || g.awayTeamId === currentTeam.id) && g.status === 'completed'
      );
      
      setTeamGames(filteredGames.sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()));
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

  // Get stat leaders from gameStats
  const getStatLeader = (stat: 'points' | 'rebounds' | 'assists') => {
    if (teamPlayers.length === 0) return null;
    return teamPlayers.reduce((leader, player) => {
      const playerTotal = player.gameStats?.reduce((total: number, game: any) => total + (game[stat] || 0), 0) || 0;
      const playerAvg = player.gameStats && player.gameStats.length > 0 ? playerTotal / player.gameStats.length : 0;
      const leaderTotal = leader.gameStats?.reduce((total: number, game: any) => total + (game[stat] || 0), 0) || 0;
      const leaderAvg = leader.gameStats && leader.gameStats.length > 0 ? leaderTotal / leader.gameStats.length : 0;
      return playerAvg > leaderAvg ? player : leader;
    });
  };

  // Get possession time leader from game stats
  const getMinutesLeader = () => {
    if (teamPlayers.length === 0) return null;
    return teamPlayers.reduce((leader, player) => {
      const playerMinutes = player.gameStats?.reduce((total: number, game: any) => total + (game.possessionTime || 0), 0) || 0;
      const leaderMinutes = leader.gameStats?.reduce((total: number, game: any) => total + (game.possessionTime || 0), 0) || 0;
      return playerMinutes > leaderMinutes ? player : leader;
    });
  };

  // Get efficiency leader from game stats
  const getEfficiencyLeader = () => {
    if (teamPlayers.length === 0) return null;
    return teamPlayers.reduce((leader, player) => {
      const calculateEfficiency = (p: any) => {
        if (!p.gameStats || p.gameStats.length === 0) return 0;
        const totals = p.gameStats.reduce((acc: any, gs: any) => ({
          points: acc.points + (gs.points || 0),
          rebounds: acc.rebounds + (gs.rebounds || 0),
          assists: acc.assists + (gs.assists || 0),
          steals: acc.steals + (gs.steals || 0),
          turnovers: acc.turnovers + (gs.turnovers || 0),
          fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || 0),
          fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || 0)
        }), { points: 0, rebounds: 0, assists: 0, steals: 0, turnovers: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0 });
        const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
        return (totals.points + totals.rebounds + totals.assists + totals.steals - missedFG - totals.turnovers) / p.gameStats.length;
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
            <div>
              <div className="text-sm opacity-75">Owner</div>
              <div className="font-semibold">{team.owner || 'TBD'}</div>
            </div>
            <div>
              <div className="text-sm opacity-75">General Manager</div>
              <div className="font-semibold">{team.generalManager || 'TBD'}</div>
            </div>
            <div>
              <div className="text-sm opacity-75">Head Coach</div>
              <div className="font-semibold">{team.headCoach || 'TBD'}</div>
            </div>
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
                          const total = pointsLeader.gameStats?.reduce((sum: number, game: any) => sum + (game.points || 0), 0) || 0;
                          const avg = pointsLeader.gameStats && pointsLeader.gameStats.length > 0 ? total / pointsLeader.gameStats.length : 0;
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
                          const total = reboundsLeader.gameStats?.reduce((sum: number, game: any) => sum + (game.rebounds || 0), 0) || 0;
                          const avg = reboundsLeader.gameStats && reboundsLeader.gameStats.length > 0 ? total / reboundsLeader.gameStats.length : 0;
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
                          const total = assistsLeader.gameStats?.reduce((sum: number, game: any) => sum + (game.assists || 0), 0) || 0;
                          const avg = assistsLeader.gameStats && assistsLeader.gameStats.length > 0 ? total / assistsLeader.gameStats.length : 0;
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
                          const total = minutesLeader.gameStats?.reduce((sum: number, game: any) => sum + (game.possessionTime || 0), 0) || 0;
                          const avg = minutesLeader.gameStats && minutesLeader.gameStats.length > 0 ? total / minutesLeader.gameStats.length : 0;
                          return avg.toFixed(1);
                        })()}
                      </div>
                    </div>
                  )}

                  {efficiencyLeader && efficiencyLeader.gameStats && efficiencyLeader.gameStats.length > 0 && (
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
                          const totals = efficiencyLeader.gameStats.reduce((acc: any, gs: any) => ({
                            points: acc.points + (gs.points || 0),
                            rebounds: acc.rebounds + (gs.rebounds || 0),
                            assists: acc.assists + (gs.assists || 0),
                            steals: acc.steals + (gs.steals || 0),
                            turnovers: acc.turnovers + (gs.turnovers || 0),
                            fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || 0),
                            fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || 0)
                          }), { points: 0, rebounds: 0, assists: 0, steals: 0, turnovers: 0, fieldGoalsMade: 0, fieldGoalsAttempted: 0 });
                          const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
                          return ((totals.points + totals.rebounds + totals.assists + totals.steals - missedFG - totals.turnovers) / efficiencyLeader.gameStats.length).toFixed(1);
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">No players on this team yet.</p>
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
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {player.displayName}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {(() => {
                            const total = player.gameStats?.reduce((sum: number, game: any) => sum + (game.points || 0), 0) || 0;
                            const avg = player.gameStats && player.gameStats.length > 0 ? total / player.gameStats.length : 0;
                            return avg.toFixed(1);
                          })()} PPG
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

