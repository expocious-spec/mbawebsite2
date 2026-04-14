'use client';

import { User, Shield, Award, Users as UsersIcon, DollarSign, Calendar, CheckCircle2, Clock, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getMinecraftHeadshot } from '@/lib/minecraft';

type TabType = 'overview' | 'stats' | 'gamelog';

export default function PlayerProfilePage({ params }: { params: { id: string } }) {
  const [player, setPlayer] = useState<any>(null);
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(['All-Time']);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['All-Time']);
  const [games, setGames] = useState<any[]>([]);
  const [contractOffers, setContractOffers] = useState<any[]>([]);
  const [accolades, setAccolades] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { data: session } = useSession();

  useEffect(() => {
    fetchData();
    fetchSeasons();
    fetchContractOffers();
    fetchAccolades();
  }, [params.id]);

  const fetchSeasons = async () => {
    try {
      const [seasonsRes, gamesRes] = await Promise.all([
        fetch('/api/seasons'),
        fetch('/api/games')
      ]);
      if (seasonsRes.ok && gamesRes.ok) {
        const [seasons, gamesData] = await Promise.all([
          seasonsRes.json(),
          gamesRes.json()
        ]);
        setGames(gamesData);
        const seasonNames = seasons.map((s: any) => s.name);
        
        if (!seasonNames.includes('All-Time')) {
          seasonNames.push('All-Time');
        }
        
        setAvailableSeasons(seasonNames);
        
        const currentSeason = seasons.find((s: any) => s.isCurrent);
        if (currentSeason) {
          setSelectedSeasons([currentSeason.name]);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const fetchContractOffers = async () => {
    try {
      const response = await fetch(`/api/contract-offers?playerId=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setContractOffers(data.filter((offer: any) => offer.status === 'pending'));
      }
    } catch (error) {
      console.error('Error fetching contract offers:', error);
    }
  };

  const fetchAccolades = async () => {
    try {
      const response = await fetch(`/api/accolades?playerId=${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAccolades(data);
      }
    } catch (error) {
      console.error('Error fetching accolades:', error);
    }
  };

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
      
      const currentPlayer = playersData.find((p: any) => p.id === params.id);
      if (!currentPlayer) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-mba-dark flex items-center justify-center">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!player) {
    notFound();
    return null;
  }

  // Get game stats for selected season
  const getSeasonGameStats = () => {
    if (!player.gameStats) return [];
    
    const isAllTime = selectedSeasons.includes('All-Time');
    
    if (isAllTime || selectedSeasons.length === 0) {
      return player.gameStats;
    }
    
    const seasonGames = games.filter(g => selectedSeasons.includes(g.season));
    const seasonGameIds = new Set(seasonGames.map(g => g.id));
    return player.gameStats.filter((gs: any) => seasonGameIds.has(gs.gameId));
  };

  const seasonGameStats = getSeasonGameStats();

  // Calculate wins and losses
  const wins = seasonGameStats?.filter((g: any) => g.result === 'W').length || 0;
  const losses = seasonGameStats?.filter((g: any) => g.result === 'L').length || 0;
  const actualGamesPlayed = seasonGameStats?.length || 0;
  const winPercentage = actualGamesPlayed > 0 ? ((wins / actualGamesPlayed) * 100).toFixed(1) : '0.0';

  // Calculate season totals
  const seasonTotals = seasonGameStats?.reduce((acc: any, game: any) => ({
    points: acc.points + (game.points || 0),
    rebounds: acc.rebounds + (game.rebounds || 0),
    assists: acc.assists + (game.assists || 0),
    steals: acc.steals + (game.steals || 0),
    blocks: acc.blocks + (game.blocks || 0),
    turnovers: acc.turnovers + (game.turnovers || 0),
    offensiveRebounds: acc.offensiveRebounds + (game.offensive_rebounds || 0),
    defensiveRebounds: acc.defensiveRebounds + (game.defensive_rebounds || 0),
    fieldGoalsMade: acc.fieldGoalsMade + (game.field_goals_made || 0),
    fieldGoalsAttempted: acc.fieldGoalsAttempted + (game.field_goals_attempted || 0),
    threePointersMade: acc.threePointersMade + (game.three_pointers_made || 0),
    threePointersAttempted: acc.threePointersAttempted + (game.three_pointers_attempted || 0),
    minutes: acc.minutes + (game.minutes || 0),
  }), {
    points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0, 
    offensiveRebounds: 0, defensiveRebounds: 0,
    fieldGoalsMade: 0, fieldGoalsAttempted: 0,
    threePointersMade: 0, threePointersAttempted: 0,
    minutes: 0,
  }) || {
    points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0, turnovers: 0,
    offensiveRebounds: 0, defensiveRebounds: 0,
    fieldGoalsMade: 0, fieldGoalsAttempted: 0,
    threePointersMade: 0, threePointersAttempted: 0,
    minutes: 0,
  };
  
  // Calculate averages
  const stats = {
    points: actualGamesPlayed > 0 ? seasonTotals.points / actualGamesPlayed : 0,
    rebounds: actualGamesPlayed > 0 ? seasonTotals.rebounds / actualGamesPlayed : 0,
    assists: actualGamesPlayed > 0 ? seasonTotals.assists / actualGamesPlayed : 0,
    steals: actualGamesPlayed > 0 ? seasonTotals.steals / actualGamesPlayed : 0,
    blocks: actualGamesPlayed > 0 ? seasonTotals.blocks / actualGamesPlayed : 0,
    turnovers: actualGamesPlayed > 0 ? seasonTotals.turnovers / actualGamesPlayed : 0,
    offensiveRebounds: actualGamesPlayed > 0 ? seasonTotals.offensiveRebounds / actualGamesPlayed : 0,
    defensiveRebounds: actualGamesPlayed > 0 ? seasonTotals.defensiveRebounds / actualGamesPlayed : 0,
    minutes: actualGamesPlayed > 0 ? seasonTotals.minutes / actualGamesPlayed : 0,
    fieldGoalPercentage: seasonTotals.fieldGoalsAttempted > 0 ? (seasonTotals.fieldGoalsMade / seasonTotals.fieldGoalsAttempted * 100) : 0,
    threePointPercentage: seasonTotals.threePointersAttempted > 0 ? (seasonTotals.threePointersMade / seasonTotals.threePointersAttempted * 100) : 0,
  };

  // Determine star rating (5-star recruit)
  const starRating = 5; // You can calculate this based on player stats/value

  return (
    <div className="min-h-screen bg-white dark:bg-mba-dark">
      {/* Header Bar */}
      <div className="bg-gradient-to-r from-mba-blue to-mba-red py-3 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-white font-bold text-sm uppercase tracking-wider">MBA Athlete</span>
          <Link href={`/players/${params.id}`} className="text-white hover:text-gray-200 text-sm font-medium flex items-center gap-2">
            <User className="w-4 h-4" />
            PLAYER PROFILE
          </Link>
        </div>
      </div>

      {/* Main Profile Header */}
      <div className="bg-gray-900 dark:bg-black">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Player Image */}
            <div className="lg:col-span-3 flex justify-center">
              <div className="w-64 h-64 overflow-hidden bg-gray-800 border-4 border-gray-700">
                <Image
                  src={getMinecraftHeadshot(player.minecraftUserId, 512)}
                  alt={player.displayName}
                  width={256}
                  height={256}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Player Info */}
            <div className="lg:col-span-6 text-white space-y-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold mb-2">{player.displayName}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="px-3 py-1 bg-mba-blue text-white font-bold text-sm rounded">
                    LB {/* Position - you can make this dynamic */}
                  </span>
                  <span className="text-gray-400 text-sm">@{player.minecraftUsername || player.discordUsername}</span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="flex items-center gap-2">
                {[...Array(starRating)].map((_, i) => (
                  <Star key={i} className="w-6 h-6 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-yellow-400 font-bold ml-2">{starRating}-Star Recruit</span>
              </div>

              {/* Team Info */}
              {team && (
                <div className="flex items-center gap-3">
                  {team.logo && (
                    <Image src={team.logo} alt={team.name} width={32} height={32} className="w-8 h-8 object-contain" />
                  )}
                  <span className="text-lg font-semibold">{team.name}</span>
                </div>
              )}

              {/* Role Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-800 rounded text-sm">
                <User className="w-4 h-4" />
                <span>Player</span>
              </div>

              {/* Salary Cap Value */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-900/30 border border-green-700 rounded">
                <DollarSign className="w-5 h-5 text-green-400" />
                <div>
                  <div className="text-xs text-gray-400">Salary Cap Value</div>
                  <div className="text-lg font-bold text-green-400">${(player.coinWorth || 0).toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="lg:col-span-3 grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="text-center p-4 bg-gray-800 rounded">
                <div className="text-4xl font-bold text-blue-400">{actualGamesPlayed}</div>
                <div className="text-xs text-gray-400 uppercase mt-1">GP</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded">
                <div className="text-4xl font-bold text-green-400">{wins}</div>
                <div className="text-xs text-gray-400 uppercase mt-1">W</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded">
                <div className="text-4xl font-bold text-red-400">{losses}</div>
                <div className="text-xs text-gray-400 uppercase mt-1">L</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded">
                <div className="text-4xl font-bold text-yellow-400">{winPercentage}%</div>
                <div className="text-xs text-gray-400 uppercase mt-1">WIN%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-mba-blue text-mba-blue dark:text-mba-blue'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Overview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'stats'
                  ? 'border-mba-blue text-mba-blue dark:text-mba-blue'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                Statistics
              </div>
            </button>
            <button
              onClick={() => setActiveTab('gamelog')}
              className={`py-4 px-2 font-semibold border-b-2 transition-colors ${
                activeTab === 'gamelog'
                  ? 'border-mba-blue text-mba-blue dark:text-mba-blue'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Game Log
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Accolades Section */}
            {accolades.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4">
                  <Award className="w-6 h-6 text-yellow-500" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Accolades</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {accolades.map((accolade: any) => (
                    <div
                      key={accolade.id}
                      className="flex items-center gap-3 p-4 rounded-lg text-white shadow-md"
                      style={{ backgroundColor: accolade.color || '#FFD700' }}
                    >
                      {accolade.icon && <span className="text-2xl">{accolade.icon}</span>}
                      <div>
                        <div className="font-bold">{accolade.title}</div>
                        {accolade.season && <div className="text-sm opacity-90">{accolade.season}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!accolades.length && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
                <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No accolades yet</h3>
                <p className="text-gray-600 dark:text-gray-400">Keep playing to earn accolades!</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Season Averages */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Season Averages</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-mba-blue">{stats.points.toFixed(1)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase">PPG</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-mba-blue">{stats.rebounds.toFixed(1)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase">RPG</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-mba-blue">{stats.assists.toFixed(1)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase">APG</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-mba-blue">{stats.steals.toFixed(1)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase">SPG</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-mba-blue">{stats.blocks.toFixed(1)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase">BPG</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-3xl font-bold text-mba-blue">{stats.fieldGoalPercentage.toFixed(1)}%</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase">FG%</div>
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Detailed Statistics</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Minutes Per Game</span>
                  <span className="text-gray-900 dark:text-white font-bold">{stats.minutes.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Field Goal %</span>
                  <span className="text-gray-900 dark:text-white font-bold">{stats.fieldGoalPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">3-Point %</span>
                  <span className="text-gray-900 dark:text-white font-bold">{stats.threePointPercentage.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Offensive Rebounds</span>
                  <span className="text-gray-900 dark:text-white font-bold">{stats.offensiveRebounds.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Defensive Rebounds</span>
                  <span className="text-gray-900 dark:text-white font-bold">{stats.defensiveRebounds.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Turnovers Per Game</span>
                  <span className="text-gray-900 dark:text-white font-bold">{stats.turnovers.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gamelog' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Game Log</h2>
            {seasonGameStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Date</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Opponent</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Result</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">PTS</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">REB</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">AST</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">STL</th>
                      <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">BLK</th>
                    </tr>
                  </thead>
                  <tbody>
                    {seasonGameStats.map((game: any, index: number) => (
                      <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-2 text-sm text-gray-900 dark:text-white">
                          {new Date(game.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-900 dark:text-white">{game.opponent}</td>
                        <td className="py-3 px-2 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            game.result === 'W' 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {game.result}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center text-sm font-medium text-gray-900 dark:text-white">{game.points || 0}</td>
                        <td className="py-3 px-2 text-center text-sm font-medium text-gray-900 dark:text-white">{game.rebounds || 0}</td>
                        <td className="py-3 px-2 text-center text-sm font-medium text-gray-900 dark:text-white">{game.assists || 0}</td>
                        <td className="py-3 px-2 text-center text-sm font-medium text-gray-900 dark:text-white">{game.steals || 0}</td>
                        <td className="py-3 px-2 text-center text-sm font-medium text-gray-900 dark:text-white">{game.blocks || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No games played yet this season</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
