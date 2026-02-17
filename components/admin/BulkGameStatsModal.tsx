'use client';

import { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, AlertCircle } from 'lucide-react';

interface BulkGameStatsModalProps {
  onClose: () => void;
  onSave: (allStats: any[]) => void;
}

interface ParsedPlayerStat {
  username: string;
  playerId?: string;
  minutes: number;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  turnovers: number;
  missesForced: number;
  fgm: number;
  fga: number;
  tpm: number;
  tpa: number;
  possessionTime: number;
}

export default function BulkGameStatsModal({ onClose, onSave }: BulkGameStatsModalProps) {
  const [games, setGames] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [date, setDate] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [parsedStats, setParsedStats] = useState<ParsedPlayerStat[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchGames();
    fetchTeams();
    fetchPlayers();
  }, []);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      setGames(data);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const extractStat = (line: string, statName: string): number => {
    // New format: PTS 0, REB 0, etc. (with space)
    const newFormatRegex = new RegExp(`${statName}\\s+(\\d+(?:\\.\\d+)?)`, 'i');
    const newMatch = line.match(newFormatRegex);
    if (newMatch) return parseFloat(newMatch[1]);
    
    // Old format: Points: 0, Rebounds: 0, etc. (with colon)
    const oldFormatRegex = new RegExp(`${statName}:\\s*(\\d+(?:\\.\\d+)?)`, 'i');
    const oldMatch = line.match(oldFormatRegex);
    return oldMatch ? parseFloat(oldMatch[1]) : 0;
  };

  const extractTime = (line: string, key: string): number => {
    // Format: MIN 0:00 (MM:SS) - convert to seconds
    const regex = new RegExp(`${key}\\s+(\\d+):(\\d+)`, 'i');
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const extractPossession = (line: string): number => {
    // New format: POSS 0s
    const newFormat = line.match(/POSS\\s+(\\d+)s/i);
    if (newFormat) return parseInt(newFormat[1]);
    
    // Old format: Possession: 120 sec
    const oldFormat = line.match(/Possession[:\\s]+(\\d+)/i);
    return oldFormat ? parseInt(oldFormat[1]) : 0;
  };

  const extractFraction = (line: string, statName: string): { made: number; attempted: number } => {
    // Both formats use the same pattern: FG: 0/0 or FG 0/0
    const regex = new RegExp(`${statName}[:\\s]*(\\d+)/(\\d+)`, 'i');
    const match = line.match(regex);
    return match ? { made: parseInt(match[1]), attempted: parseInt(match[2]) } : { made: 0, attempted: 0 };
  };

  const extractAssists = (line: string): number => {
    // New format: AST/PASS 6/15 - extract just the first number (assists)
    const astPassMatch = line.match(/AST\/PASS\s+(\d+)\/(\d+)/i);
    if (astPassMatch) return parseInt(astPassMatch[1]);
    
    // Fallback to regular AST format
    return extractStat(line, 'AST') || extractStat(line, 'Assists');
  };

  const parseBulkStats = () => {
    setProcessing(true);
    const newErrors: string[] = [];
    const stats: ParsedPlayerStat[] = [];

    const lines = bulkText.split('\n');

    for (const line of lines) {
      // Skip empty lines, team headers, team totals, and MVP markers
      if (!line.trim() || 
          line.includes('===') || 
          line.includes('TEAM TOTALS') || 
          line.includes('GAME MVP') ||
          line.includes(':PH_')) {
        continue;
      }

      // Check if line contains player stats (has username followed by |)
      if (line.includes('|')) {
        const parts = line.split('|');
        const username = parts[0].trim();

        // Skip if username is empty or looks like a total
        if (!username || username.toLowerCase().includes('total')) {
          continue;
        }

        // Extract stats (support both new and old formats)
        const fg = extractFraction(line, 'FG');
        const threeFg = extractFraction(line, '3FG');

        // Calculate total rebounds from OREB + DREB if both present, otherwise use REB
        const oreb = extractStat(line, 'OREB');
        const dreb = extractStat(line, 'DREB');
        const totalReb = (oreb || dreb) ? oreb + dreb : (extractStat(line, 'REB') || extractStat(line, 'Rebounds'));

        const playerStat: ParsedPlayerStat = {
          username,
          minutes: extractTime(line, 'MIN'),
          points: extractStat(line, 'PTS') || extractStat(line, 'Points'),
          assists: extractAssists(line),
          rebounds: totalReb,
          steals: extractStat(line, 'STL') || extractStat(line, 'Steals'),
          blocks: extractStat(line, 'BLK') || extractStat(line, 'Blocks'),
          turnovers: extractStat(line, 'TOV') || extractStat(line, 'Turnovers'),
          missesForced: extractStat(line, 'MISS-AG'),
          possessionTime: extractPossession(line),
          fgm: fg.made,
          fga: fg.attempted,
          tpm: threeFg.made,
          tpa: threeFg.attempted,
        };

        // Try to match player by minecraft username
        const matchedPlayer = players.find(p => 
          p.minecraftUsername?.toLowerCase() === username.toLowerCase()
        );

        if (matchedPlayer) {
          playerStat.playerId = matchedPlayer.id;
        } else {
          newErrors.push(`Could not find player: ${username}`);
        }

        stats.push(playerStat);
      }
    }

    setErrors(newErrors);
    setParsedStats(stats);
    setProcessing(false);
  };

  const handleSaveAll = async () => {
    if (!selectedGameId && !date) {
      alert('Please select a game or enter a date');
      return;
    }

    const validStats = parsedStats.filter(stat => stat.playerId);

    if (validStats.length === 0) {
      alert('No valid player stats to save');
      return;
    }

    const allGameStats = validStats.map(stat => ({
      id: `${Date.now()}-${stat.playerId}`,
      playerId: stat.playerId,
      gameId: selectedGameId || `game-${Date.now()}`,
      date: date || new Date().toISOString(),
      opponent: '', // Will be filled by parent component based on game
      result: 'W' as 'W' | 'L',
      minutes: stat.minutes,
      points: stat.points,
      rebounds: stat.rebounds,
      assists: stat.assists,
      steals: stat.steals,
      blocks: stat.blocks,
      turnovers: stat.turnovers,
      missesForced: stat.missesForced,
      fieldGoalsMade: stat.fgm,
      fieldGoalsAttempted: stat.fga,
      threePointersMade: stat.tpm,
      threePointersAttempted: stat.tpa,
      possessionTime: stat.possessionTime,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      fouls: 0,
    }));

    onSave(allGameStats);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bulk Import Game Stats
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Paste formatted stats for multiple players
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Game Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Select Game (Optional)
              </label>
              <select
                value={selectedGameId}
                onChange={(e) => {
                  setSelectedGameId(e.target.value);
                  const game = games.find(g => g.id === e.target.value);
                  if (game) {
                    setDate(game.scheduledDate.split('T')[0]);
                  }
                }}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="">Manual Entry</option>
                {games.map(game => {
                  const homeTeam = teams.find(t => t.id === game.homeTeamId);
                  const awayTeam = teams.find(t => t.id === game.awayTeamId);
                  const matchup = homeTeam && awayTeam ? `${awayTeam.name} @ ${homeTeam.name}` : 'TBD';
                  return (
                    <option key={game.id} value={game.id}>
                      {new Date(game.scheduledDate).toLocaleDateString()} - {matchup} ({game.status})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Bulk Text Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Paste Stats (New Format: username | MIN 0:00 | PTS X | ...)
            </label>
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={`=== Atlanta Hawks ===
Jigglebutt67 | MIN 0:00 | PTS 0 | FG 0/0 | 3FG 0/0 | AST/PASS 0/0 | OREB 0 | DREB 0 | REB 0 | STL 0 | BLK 0 | TOV 0 | MISS-AG 0 | POSS 0s
player2 | MIN 12:30 | PTS 24 | FG 10/18 | 3FG 4/9 | AST/PASS 6/15 | OREB 2 | DREB 5 | REB 7 | STL 3 | BLK 1 | TOV 2 | MISS-AG 5 | POSS 245s
=== Chicago Bulls ===
player3 | MIN 15:00 | PTS 18 | FG 7/14 | 3FG 2/5 | AST/PASS 4/10 | OREB 1 | DREB 3 | REB 4 | STL 2 | BLK 0 | TOV 1 | MISS-AG 3 | POSS 180s`}
              rows={10}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white font-mono text-sm"
            />
          </div>

          {/* Parse Button */}
          <div className="mb-6">
            <button
              onClick={parseBulkStats}
              disabled={!bulkText.trim() || processing}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              {processing ? 'Parsing...' : 'Parse Stats'}
            </button>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">
                    Errors Found ({errors.length})
                  </h4>
                  <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                    {errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Parsed Stats Preview */}
          {parsedStats.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Parsed Stats ({parsedStats.length} players)
              </h3>
              <div className="max-h-96 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-700 dark:text-gray-300">Player</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">PTS</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">REB</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">AST</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">STL</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">BLK</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">TO</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">FG</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">3PT</th>
                      <th className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedStats.map((stat, i) => (
                      <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                        <td className="px-3 py-2 text-gray-900 dark:text-white font-medium">{stat.username}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.points}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.rebounds}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.assists}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.steals}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.blocks}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.turnovers}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.fgm}/{stat.fga}</td>
                        <td className="px-3 py-2 text-center text-gray-900 dark:text-white">{stat.tpm}/{stat.tpa}</td>
                        <td className="px-3 py-2 text-center">
                          {stat.playerId ? (
                            <span className="text-green-600 dark:text-green-400 text-xs">✓ Matched</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400 text-xs">✗ Not Found</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={parsedStats.length === 0 || parsedStats.every(s => !s.playerId)}
              className="px-6 py-2 bg-mba-blue hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              Save {parsedStats.filter(s => s.playerId).length} Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
