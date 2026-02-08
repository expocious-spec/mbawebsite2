'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface AddGameStatsModalProps {
  playerId: string;
  playerName: string;
  onClose: () => void;
  onSave: (gameStats: any) => void;
}

export default function AddGameStatsModal({ playerId, playerName, onClose, onSave }: AddGameStatsModalProps) {
  const [games, setGames] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [opponent, setOpponent] = useState('');
  const [result, setResult] = useState<'W' | 'L'>('W');
  const [date, setDate] = useState('');
  
  // Stats
  const [points, setPoints] = useState('0');
  const [rebounds, setRebounds] = useState('0');
  const [assists, setAssists] = useState('0');
  const [steals, setSteals] = useState('0');
  const [blocks, setBlocks] = useState('0');
  const [turnovers, setTurnovers] = useState('0');
  const [fgm, setFgm] = useState('0');
  const [fga, setFga] = useState('0');
  const [tpm, setTpm] = useState('0');
  const [tpa, setTpa] = useState('0');
  const [ftm, setFtm] = useState('0');
  const [fta, setFta] = useState('0');
  const [fouls, setFouls] = useState('0');

  useEffect(() => {
    fetchGames();
    fetchTeams();
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

  const handleSave = () => {
    const gameStats = {
      id: Date.now().toString(),
      playerId,
      gameId: selectedGameId || `game-${Date.now()}`,
      date: date || new Date().toISOString(),
      opponent,
      result,
      points: parseFloat(points) || 0,
      rebounds: parseFloat(rebounds) || 0,
      assists: parseFloat(assists) || 0,
      steals: parseFloat(steals) || 0,
      blocks: parseFloat(blocks) || 0,
      turnovers: parseFloat(turnovers) || 0,
      fieldGoalsMade: parseInt(fgm) || 0,
      fieldGoalsAttempted: parseInt(fga) || 0,
      threePointersMade: parseInt(tpm) || 0,
      threePointersAttempted: parseInt(tpa) || 0,
      freeThrowsMade: parseInt(ftm) || 0,
      freeThrowsAttempted: parseInt(fta) || 0,
      fouls: parseInt(fouls) || 0,
    };

    onSave(gameStats);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Add Game Stats for {playerName}
          </h2>
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

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Opponent
              </label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Team name"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Result
              </label>
              <select
                value={result}
                onChange={(e) => setResult(e.target.value as 'W' | 'L')}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="W">Win</option>
                <option value="L">Loss</option>
              </select>
            </div>
          </div>

          {/* Stats Grid */}
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Game Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Points</label>
              <input
                type="number"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Rebounds</label>
              <input
                type="number"
                value={rebounds}
                onChange={(e) => setRebounds(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Assists</label>
              <input
                type="number"
                value={assists}
                onChange={(e) => setAssists(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Steals</label>
              <input
                type="number"
                value={steals}
                onChange={(e) => setSteals(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Blocks</label>
              <input
                type="number"
                value={blocks}
                onChange={(e) => setBlocks(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Turnovers</label>
              <input
                type="number"
                value={turnovers}
                onChange={(e) => setTurnovers(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">FGM</label>
              <input
                type="number"
                value={fgm}
                onChange={(e) => setFgm(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">FGA</label>
              <input
                type="number"
                value={fga}
                onChange={(e) => setFga(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">3PM</label>
              <input
                type="number"
                value={tpm}
                onChange={(e) => setTpm(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">3PA</label>
              <input
                type="number"
                value={tpa}
                onChange={(e) => setTpa(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">FTM</label>
              <input
                type="number"
                value={ftm}
                onChange={(e) => setFtm(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">FTA</label>
              <input
                type="number"
                value={fta}
                onChange={(e) => setFta(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">Fouls</label>
              <input
                type="number"
                value={fouls}
                onChange={(e) => setFouls(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              Add Game Stats
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

