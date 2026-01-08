'use client';

import { useEffect, useState } from 'react';
import { notFound, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Calendar, Trophy, Users } from 'lucide-react';

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [game, setGame] = useState<any>(null);
  const [homeTeam, setHomeTeam] = useState<any>(null);
  const [awayTeam, setAwayTeam] = useState<any>(null);
  const [gameStats, setGameStats] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [gamesRes, teamsRes, gameStatsRes, playersRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/teams'),
        fetch('/api/players/game-stats'),
        fetch('/api/players')
      ]);

      const [gamesData, teamsData, gameStatsData, playersData] = await Promise.all([
        gamesRes.json(),
        teamsRes.json(),
        gameStatsRes.json(),
        playersRes.json()
      ]);

      const currentGame = gamesData.find((g: any) => g.id === params.id);
      if (!currentGame) {
        notFound();
      }

      setGame(currentGame);
      setHomeTeam(teamsData.find((t: any) => t.id === currentGame.homeTeamId));
      setAwayTeam(teamsData.find((t: any) => t.id === currentGame.awayTeamId));
      setPlayers(playersData);
      
      // Filter game stats for this specific game
      const filteredStats = gameStatsData.filter((gs: any) => gs.gameId === currentGame.id);
      setGameStats(filteredStats);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!game || !homeTeam || !awayTeam) {
    notFound();
  }

  const homeWon = game.homeScore > game.awayScore;
  const awayWon = game.awayScore > game.homeScore;

  // Get player stats for each team
  const homePlayerStats = gameStats
    .filter(gs => {
      const player = players.find(p => p.id === gs.playerId);
      return player?.teamId === homeTeam.id;
    })
    .map(gs => ({
      ...gs,
      player: players.find(p => p.id === gs.playerId)
    }))
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  const awayPlayerStats = gameStats
    .filter(gs => {
      const player = players.find(p => p.id === gs.playerId);
      return player?.teamId === awayTeam.id;
    })
    .map(gs => ({
      ...gs,
      player: players.find(p => p.id === gs.playerId)
    }))
    .sort((a, b) => (b.points || 0) - (a.points || 0));

  // Calculate team totals
  const calculateTeamTotals = (stats: any[]) => {
    return stats.reduce((acc, gs) => ({
      points: acc.points + (gs.points || 0),
      rebounds: acc.rebounds + (gs.rebounds || 0),
      assists: acc.assists + (gs.assists || 0),
      steals: acc.steals + (gs.steals || 0),
      blocks: acc.blocks + (gs.blocks || 0),
      turnovers: acc.turnovers + (gs.turnovers || 0),
      fieldGoalsMade: acc.fieldGoalsMade + (gs.fieldGoalsMade || 0),
      fieldGoalsAttempted: acc.fieldGoalsAttempted + (gs.fieldGoalsAttempted || 0),
      threePointersMade: acc.threePointersMade + (gs.threePointersMade || 0),
      threePointersAttempted: acc.threePointersAttempted + (gs.threePointersAttempted || 0),
      freeThrowsMade: acc.freeThrowsMade + (gs.freeThrowsMade || 0),
      freeThrowsAttempted: acc.freeThrowsAttempted + (gs.freeThrowsAttempted || 0),
    }), {
      points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
      fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0,
      threePointersAttempted: 0, freeThrowsMade: 0, freeThrowsAttempted: 0
    });
  };

  const homeTotals = calculateTeamTotals(homePlayerStats);
  const awayTotals = calculateTeamTotals(awayPlayerStats);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Link 
        href="/games"
        className="inline-flex items-center space-x-2 text-mba-blue hover:text-blue-600 dark:text-blue-400 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Schedule</span>
      </Link>

      {/* Game Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 mb-6 shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Game Info */}
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {new Date(game.scheduledDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              game.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              game.status === 'live' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
              'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              {game.status === 'completed' ? 'Final' : game.status === 'live' ? 'Live' : 'Scheduled'}
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              {game.season}
            </span>
          </div>
        </div>

        {/* Score */}
        <div className="grid grid-cols-3 gap-8 items-center">
          {/* Away Team */}
          <div className="text-center">
            <Link href={`/teams/${awayTeam.id}`} className="block hover:opacity-80 transition-opacity">
              <div className="w-24 h-24 mx-auto mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {awayTeam.logo ? (
                  <Image src={awayTeam.logo} alt={awayTeam.name} width={96} height={96} className="object-contain" />
                ) : (
                  <Trophy className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{awayTeam.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Away</p>
            </Link>
          </div>

          {/* Score */}
          <div className="text-center">
            {game.status === 'completed' || game.status === 'live' ? (
              <>
                <div className="flex items-center justify-center space-x-4">
                  <div className={`text-6xl font-bold ${awayWon ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    {game.awayScore}
                  </div>
                  <div className="text-3xl text-gray-400">-</div>
                  <div className={`text-6xl font-bold ${homeWon ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    {game.homeScore}
                  </div>
                </div>
                {game.isForfeit && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">Forfeit</p>
                )}
              </>
            ) : (
              <div className="text-xl text-gray-400 dark:text-gray-500">vs</div>
            )}
          </div>

          {/* Home Team */}
          <div className="text-center">
            <Link href={`/teams/${homeTeam.id}`} className="block hover:opacity-80 transition-opacity">
              <div className="w-24 h-24 mx-auto mb-4 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {homeTeam.logo ? (
                  <Image src={homeTeam.logo} alt={homeTeam.name} width={96} height={96} className="object-contain" />
                ) : (
                  <Trophy className="w-12 h-12 text-gray-400" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{homeTeam.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Home</p>
            </Link>
          </div>
        </div>
      </div>

      {/* Box Score */}
      {(game.status === 'completed' || game.status === 'live') && gameStats.length > 0 && (
        <>
          {/* Away Team Box Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-mba-blue" />
              {awayTeam.name} Box Score
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Player</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">PT</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">PTS</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">REB</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">AST</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">STL</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">BLK</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">FG</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">3P</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">FT</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">TOV</th>
                  </tr>
                </thead>
                <tbody>
                  {awayPlayerStats.map((stat) => (
                    <tr key={stat.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-2">
                        <Link href={`/players/${stat.playerId}`} className="text-mba-blue hover:text-blue-600 dark:text-blue-400 font-medium">
                          {stat.player?.displayName || 'Unknown'}
                        </Link>
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.possessionTime || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white font-semibold">{stat.points || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.rebounds || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.assists || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.steals || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.blocks || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                        {stat.fieldGoalsMade || 0}/{stat.fieldGoalsAttempted || 0}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                        {stat.threePointersMade || 0}/{stat.threePointersAttempted || 0}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                        {stat.freeThrowsMade || 0}/{stat.freeThrowsAttempted || 0}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.turnovers || 0}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="py-3 px-2 text-gray-900 dark:text-white">Team Totals</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">-</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{awayTotals.points}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{awayTotals.rebounds}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{awayTotals.assists}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{awayTotals.steals}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{awayTotals.blocks}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                      {awayTotals.fieldGoalsMade}/{awayTotals.fieldGoalsAttempted}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                      {awayTotals.threePointersMade}/{awayTotals.threePointersAttempted}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                      {awayTotals.freeThrowsMade}/{awayTotals.freeThrowsAttempted}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{awayTotals.turnovers}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Home Team Box Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-mba-blue" />
              {homeTeam.name} Box Score
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Player</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">PT</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">PTS</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">REB</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">AST</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">STL</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">BLK</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">FG</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">3P</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">FT</th>
                    <th className="text-center py-3 px-2 text-sm font-semibold text-gray-700 dark:text-gray-300">TOV</th>
                  </tr>
                </thead>
                <tbody>
                  {homePlayerStats.map((stat) => (
                    <tr key={stat.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-2">
                        <Link href={`/players/${stat.playerId}`} className="text-mba-blue hover:text-blue-600 dark:text-blue-400 font-medium">
                          {stat.player?.displayName || 'Unknown'}
                        </Link>
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.possessionTime || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white font-semibold">{stat.points || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.rebounds || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.assists || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.steals || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.blocks || 0}</td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                        {stat.fieldGoalsMade || 0}/{stat.fieldGoalsAttempted || 0}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                        {stat.threePointersMade || 0}/{stat.threePointersAttempted || 0}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                        {stat.freeThrowsMade || 0}/{stat.freeThrowsAttempted || 0}
                      </td>
                      <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{stat.turnovers || 0}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 dark:bg-gray-700 font-bold">
                    <td className="py-3 px-2 text-gray-900 dark:text-white">Team Totals</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">-</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{homeTotals.points}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{homeTotals.rebounds}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{homeTotals.assists}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{homeTotals.steals}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{homeTotals.blocks}</td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                      {homeTotals.fieldGoalsMade}/{homeTotals.fieldGoalsAttempted}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                      {homeTotals.threePointersMade}/{homeTotals.threePointersAttempted}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white text-sm">
                      {homeTotals.freeThrowsMade}/{homeTotals.freeThrowsAttempted}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">{homeTotals.turnovers}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* No Stats Message */}
      {(game.status === 'completed' || game.status === 'live') && gameStats.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">No player statistics available for this game yet.</p>
        </div>
      )}
    </div>
  );
}

