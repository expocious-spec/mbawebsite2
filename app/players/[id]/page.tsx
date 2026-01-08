'use client';

import { User, Shield, Award, Users as UsersIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
// import EditProfile from '@/components/EditProfile'; // DISABLED - Profile editing removed

export default function PlayerProfilePage({ params }: { params: { id: string } }) {
  const [player, setPlayer] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { data: session } = useSession();

  useEffect(() => {
    fetchData();
  }, [params.id]);

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
      
      console.log('[PLAYER PAGE] Looking for player ID:', params.id);
      console.log('[PLAYER PAGE] Available players:', playersData.map((p: any) => ({ id: p.id, name: p.displayName })));
      
      const currentPlayer = playersData.find((p: any) => p.id === params.id);
      if (!currentPlayer) {
        console.error('[PLAYER PAGE] Player not found! ID:', params.id);
        console.error('[PLAYER PAGE] Total players in DB:', playersData.length);
        notFound();
      }
      
      setPlayer(currentPlayer);
      setTeam(teamsData.find((t: any) => t.id === currentPlayer.teamId));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Profile editing disabled
  // const handleProfileUpdate = async (updates: any) => {
  //   try {
  //     const response = await fetch(`/api/players/${params.id}`, {
  //       method: 'PATCH',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify(updates),
  //     });

  //     if (!response.ok) {
  //       const error = await response.json();
  //       throw new Error(error.error || 'Failed to update profile');
  //     }

  //     // Refresh player data
  //     await fetchData();
  //   } catch (error) {
  //     console.error('Error updating profile:', error);
  //     throw error;
  //   }
  // };

  // const isOwnProfile = session?.user.playerId === params.id;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!player) {
    notFound();
    return null;
  }

  // Calculate wins and losses from game stats
  const wins = player.gameStats?.filter((g: any) => g.result === 'W').length || 0;
  const losses = player.gameStats?.filter((g: any) => g.result === 'L').length || 0;
  
  // Use gameStats length for games played
  const actualGamesPlayed = player.gameStats?.length || 0;
    
  const winPercentage = actualGamesPlayed > 0 ? (wins / actualGamesPlayed * 100).toFixed(1) : '0.0';

  // Debug: Log first game stat to see what fields are available
  if (player.gameStats && player.gameStats.length > 0) {
    console.log('[PLAYER PROFILE] First game stat:', player.gameStats[0]);
    console.log('[PLAYER PROFILE] Available keys:', Object.keys(player.gameStats[0]));
  }

  // Calculate totals from game stats
  const totals = player.gameStats?.reduce((acc: any, game: any) => ({
    points: acc.points + (game.points || 0),
    rebounds: acc.rebounds + (game.rebounds || 0),
    assists: acc.assists + (game.assists || 0),
    steals: acc.steals + (game.steals || 0),
    turnovers: acc.turnovers + (game.turnovers || 0),
    fieldGoalsMade: acc.fieldGoalsMade + (game.field_goals_made || 0),
    fieldGoalsAttempted: acc.fieldGoalsAttempted + (game.field_goals_attempted || 0),
    threePointersMade: acc.threePointersMade + (game.three_pointers_made || 0),
    threePointersAttempted: acc.threePointersAttempted + (game.three_pointers_attempted || 0),
    possessionTime: acc.possessionTime + (game.possession_time || 0),
  }), {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    turnovers: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    possessionTime: 0,
  }) || {
    points: 0,
    rebounds: 0,
    assists: 0,
    steals: 0,
    turnovers: 0,
    fieldGoalsMade: 0,
    fieldGoalsAttempted: 0,
    threePointersMade: 0,
    threePointersAttempted: 0,
    possessionTime: 0,
  };
  
  // Calculate averages from totals
  const stats = {
    points: actualGamesPlayed > 0 ? totals.points / actualGamesPlayed : 0,
    rebounds: actualGamesPlayed > 0 ? totals.rebounds / actualGamesPlayed : 0,
    assists: actualGamesPlayed > 0 ? totals.assists / actualGamesPlayed : 0,
    steals: actualGamesPlayed > 0 ? totals.steals / actualGamesPlayed : 0,
    turnovers: actualGamesPlayed > 0 ? totals.turnovers / actualGamesPlayed : 0,
    possessionTime: actualGamesPlayed > 0 ? totals.possessionTime / actualGamesPlayed : 0,
    fieldGoalsMade: totals.fieldGoalsMade,
    fieldGoalsAttempted: totals.fieldGoalsAttempted,
    threePointersMade: totals.threePointersMade,
    threePointersAttempted: totals.threePointersAttempted,
    fieldGoalPercentage: totals.fieldGoalsAttempted > 0 ? (totals.fieldGoalsMade / totals.fieldGoalsAttempted * 100) : 0,
    threePointPercentage: totals.threePointersAttempted > 0 ? (totals.threePointersMade / totals.threePointersAttempted * 100) : 0,
  };

  // Calculate efficiency: (PTS + REB + AST + STL - Missed FG - TOV) / GP
  const missedFG = totals.fieldGoalsAttempted - totals.fieldGoalsMade;
  const efficiency = actualGamesPlayed > 0 
    ? (totals.points + totals.rebounds + totals.assists + totals.steals - missedFG - totals.turnovers) / actualGamesPlayed
    : 0;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Franchise Owner':
        return <Shield className="w-4 h-4 text-mba-blue" />;
      case 'General Manager':
        return <Award className="w-4 h-4 text-mba-blue" />;
      case 'Head Coach':
      case 'Assistant Coach':
        return <UsersIcon className="w-4 h-4 text-mba-blue" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Team-colored Banner */}
      {team && (
        <div 
          className="rounded-t-lg h-32 mb-[-4rem] relative z-0"
          style={{ 
            background: `linear-gradient(135deg, ${team.colors.primary} 0%, ${team.colors.secondary} 100%)` 
          }}
        />
      )}
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm relative z-10">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          {/* Profile Picture */}
          <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-white dark:border-gray-800">
            {player.profilePicture ? (
              <img
                src={player.profilePicture}
                alt={player.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-16 h-16 text-gray-400" />
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-minecraft mb-3 text-gray-900 dark:text-white leading-relaxed">{player.displayName}</h1>
            
            {/* Usernames */}
            <div className="space-y-1 mb-4">
              {player.minecraftUsername && (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">MINECRAFT</span>
                  <p className="text-sm font-minecraft text-gray-700 dark:text-gray-300">{player.minecraftUsername}</p>
                </div>
              )}
              {player.discordUsername && (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded">DISCORD</span>
                  <p className="text-sm font-minecraft text-gray-700 dark:text-gray-300">{player.discordUsername}</p>
                </div>
              )}
            </div>
            
            {player.description && (
              <p className="text-gray-700 dark:text-gray-300 mb-4">{player.description}</p>
            )}

            {/* Team */}
            {team && (
              <Link
                href="/branding"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg mb-4"
                style={{
                  backgroundColor: `${team.colors.primary}20`,
                  color: team.colors.primary,
                }}
              >
                <span className="font-semibold">{team.name}</span>
              </Link>
            )}

            {/* Roles */}
            <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-3">
              {player.roles.map((role: string) => (
                <div
                  key={role}
                  className="flex items-center space-x-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                >
                  {getRoleIcon(role)}
                  <span>{role}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Edit Profile Button - DISABLED */}
        {/* {isOwnProfile && (
          <div className="mt-6 flex justify-center md:justify-end">
            <EditProfile
              player={player}
              isOwnProfile={isOwnProfile}
              onSave={handleProfileUpdate}
            />
          </div>
        )} */}
      </div>

      {/* Record */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Record</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-mba-blue">{actualGamesPlayed}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Games Played</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-green-500">{wins}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Wins</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-red-500">{losses}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Losses</div>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-3xl font-bold text-mba-blue">{winPercentage}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Win %</div>
          </div>
        </div>
      </div>

      {/* Averages */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Averages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.points.toFixed(1)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">PTS</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rebounds.toFixed(1)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">REB</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.assists.toFixed(1)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">AST</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.steals.toFixed(1)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">STL</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.turnovers.toFixed(1)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">TOV</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{actualGamesPlayed > 0 ? (totals.possessionTime / actualGamesPlayed).toFixed(1) : '0.0'}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">PT</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{efficiency.toFixed(1)}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">EFF</div>
          </div>
        </div>
      </div>

      {/* Shooting Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Shooting Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Field Goals */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-900 dark:text-white">Field Goals</h3>
            <div className="text-center mb-2">
              <div className="text-3xl font-bold text-mba-blue">
                {stats.fieldGoalPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">FG%</div>
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {stats.fieldGoalsAttempted} / {stats.fieldGoalsMade}
              <div className="text-xs">FGA / FGM</div>
            </div>
          </div>

          {/* Three Pointers */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-center text-gray-900 dark:text-white">Three Pointers</h3>
            <div className="text-center mb-2">
              <div className="text-3xl font-bold text-mba-blue">
                {stats.threePointPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">3P%</div>
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {stats.threePointersAttempted} / {stats.threePointersMade}
              <div className="text-xs">3PA / 3PM</div>
            </div>
          </div>
        </div>
      </div>

      {/* Career Totals */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Career Totals</h2>
        
        {/* Main Stats */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Main Statistics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totals.points}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">PTS</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totals.rebounds}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">REB</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totals.assists}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">AST</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totals.steals}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">STL</div>
            </div>
            <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totals.turnovers}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">TOV</div>
            </div>
          </div>
        </div>

        {/* Shooting Totals */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Shooting Totals</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{totals.fieldGoalsMade}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">FGM</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{totals.fieldGoalsAttempted}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">FGA</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{totals.threePointersMade}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">3PM</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{totals.threePointersAttempted}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">3PA</div>
            </div>
          </div>
        </div>

        {/* Possession Time */}
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-700 dark:text-gray-300">Playing Time</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-4 bg-gradient-to-br from-mba-blue/10 to-mba-blue/20 dark:from-mba-blue/20 dark:to-mba-blue/10 rounded-lg border border-mba-blue/30">
              <div className="text-3xl font-bold text-mba-blue">{totals.possessionTime}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Total Possession Time</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-mba-blue/10 to-mba-blue/20 dark:from-mba-blue/20 dark:to-mba-blue/10 rounded-lg border border-mba-blue/30">
              <div className="text-3xl font-bold text-mba-blue">{actualGamesPlayed > 0 ? (totals.possessionTime / actualGamesPlayed).toFixed(1) : '0.0'}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Possession Time Per Game</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Advanced Statistics</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.turnovers > 0 ? (stats.assists / stats.turnovers).toFixed(1) : stats.assists.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">AST/TO Ratio</div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {efficiency.toFixed(1)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">EFF</div>
          </div>
        </div>
      </div>

      {/* Recent Games */}
      {player.gameStats && player.gameStats.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Recent Games</h2>
          <div className="space-y-3">
            {player.gameStats
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 10)
              .map((game: any) => (
                <Link
                  key={game.id}
                  href={`/games/${game.gameId}`}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-4">
                    <div className={`px-3 py-1 rounded font-bold ${
                      game.result === 'W' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {game.result}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">vs {game.opponent}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(game.date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3 text-center">
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{game.points}</div>
                      <div className="text-xs text-gray-500">PTS</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{game.rebounds}</div>
                      <div className="text-xs text-gray-500">REB</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{game.assists}</div>
                      <div className="text-xs text-gray-500">AST</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">{game.steals}</div>
                      <div className="text-xs text-gray-500">STL</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {game.field_goals_attempted}/{game.field_goals_made}
                      </div>
                      <div className="text-xs text-gray-500">FG</div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

