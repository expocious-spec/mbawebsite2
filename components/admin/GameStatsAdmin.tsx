'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Plus, X, Search, Edit2, Trash2, Upload } from 'lucide-react';
import BulkGameStatsModal from './BulkGameStatsModal';

export default function GameStatsAdmin() {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [gameStats, setGameStats] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [editingStatId, setEditingStatId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedGameFilter, setSelectedGameFilter] = useState('');
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [gameSearchInput, setGameSearchInput] = useState('');
  const [gameSearch, setGameSearch] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [formData, setFormData] = useState({
    playerId: '',
    gameId: '',
    date: '',
    opponent: '',
    minutes: '',
    points: '',
    rebounds: '',
    assists: '',
    steals: '',
    blocks: '',
    turnovers: '',
    missesForced: '',
    fieldGoalsMade: '',
    fieldGoalsAttempted: '',
    threePointersMade: '',
    threePointersAttempted: '',
    possessionTime: '',
    result: 'W' as 'W' | 'L',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [playersRes, gamesRes, teamsRes] = await Promise.all([
        fetch('/api/players'),
        fetch('/api/games'),
        fetch('/api/teams')
      ]);
      const [playersData, gamesData, teamsData] = await Promise.all([
        playersRes.json(),
        gamesRes.json(),
        teamsRes.json()
      ]);
      setPlayers(playersData);
      setGames(gamesData);
      setTeams(teamsData);
      
      // Fetch all game stats
      await fetchGameStats();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchGameStats = async () => {
    try {
      const response = await fetch('/api/players/game-stats');
      if (!response.ok) {
        console.error('Failed to fetch game stats:', response.status);
        setGameStats([]);
        return;
      }
      const data = await response.json();
      // Ensure data is an array
      setGameStats(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching game stats:', error);
      setGameStats([]);
    }
  };

  const handlePasteStats = () => {
    if (!pasteText.trim()) return;

    try {
      // Parse the pasted text
      // New format: Jigglebutt67 | MIN 0:00 | PTS 0 | FG 0/0 | 3FG 0/0 | AST/PASS 0/0 | OREB 0 | DREB 0 | REB 0 | STL 0 | BLK 0 | TOV 0 | MISS-AG 0 | POSS 0s
      // Old format: ElfFoxy | Points: 12 | Assists: 3 | Rebounds: 14 | Steals: 0 | Turnovers: 3 | Possession: 120 sec | FG: 5/10 | 3FG: 2/5
      
      const extractValue = (text: string, key: string) => {
        const regex = new RegExp(`${key}[:\\s]+(\\d+)`, 'i');
        const match = text.match(regex);
        return match ? match[1] : '';
      };

      const extractTime = (text: string, key: string) => {
        // Format: MIN 0:00 (MM:SS)
        const regex = new RegExp(`${key}\\s+(\\d+):(\\d+)`, 'i');
        const match = text.match(regex);
        if (match) {
          const minutes = parseInt(match[1]);
          const seconds = parseInt(match[2]);
          return (minutes * 60 + seconds).toString();
        }
        return '0';
      };

      const extractPossession = (text: string) => {
        // New format: POSS 0s or old format: Possession: 120 sec
        const newFormat = text.match(/POSS\s+(\d+)s/i);
        if (newFormat) return newFormat[1];
        
        const oldFormat = text.match(/Possession[:\s]+(\d+)/i);
        return oldFormat ? oldFormat[1] : '';
      };

      const extractFraction = (text: string, key: string) => {
        const regex = new RegExp(`${key}[:\\s]*(\\d+)/(\\d+)`, 'i');
        const match = text.match(regex);
        return match ? { made: match[1], attempted: match[2] } : { attempted: '', made: '' };
      };

      const fg = extractFraction(pasteText, 'FG');
      const threeFg = extractFraction(pasteText, '3FG');

      setFormData(prev => ({
        ...prev,
        minutes: extractTime(pasteText, 'MIN'),
        points: extractValue(pasteText, 'PTS') || extractValue(pasteText, 'Points'),
        assists: extractValue(pasteText, 'AST') || extractValue(pasteText, 'Assists'),
        rebounds: extractValue(pasteText, 'REB') || extractValue(pasteText, 'Rebounds'),
        steals: extractValue(pasteText, 'STL') || extractValue(pasteText, 'Steals'),
        blocks: extractValue(pasteText, 'BLK') || extractValue(pasteText, 'Blocks'),
        turnovers: extractValue(pasteText, 'TOV') || extractValue(pasteText, 'Turnovers'),
        missesForced: extractValue(pasteText, 'MISS-AG'),
        possessionTime: extractPossession(pasteText),
        fieldGoalsAttempted: fg.attempted,
        fieldGoalsMade: fg.made,
        threePointersAttempted: threeFg.attempted,
        threePointersMade: threeFg.made,
      }));

      setPasteText('');
      alert('Stats imported successfully!');
    } catch (error) {
      console.error('Error parsing stats:', error);
      alert('Failed to parse stats. Please check the format.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Convert empty strings to 0 for numeric fields
      const dataToSubmit = {
        ...formData,
        minutes: Number(formData.minutes) || 0,
        points: Number(formData.points) || 0,
        rebounds: Number(formData.rebounds) || 0,
        assists: Number(formData.assists) || 0,
        steals: Number(formData.steals) || 0,
        blocks: Number(formData.blocks) || 0,
        turnovers: Number(formData.turnovers) || 0,
        missesForced: Number(formData.missesForced) || 0,
        fieldGoalsMade: Number(formData.fieldGoalsMade) || 0,
        fieldGoalsAttempted: Number(formData.fieldGoalsAttempted) || 0,
        threePointersMade: Number(formData.threePointersMade) || 0,
        threePointersAttempted: Number(formData.threePointersAttempted) || 0,
        possessionTime: Number(formData.possessionTime) || 0,
      };
      
      const method = editingStatId ? 'PUT' : 'POST';
      const body = editingStatId 
        ? JSON.stringify({ ...dataToSubmit, id: editingStatId })
        : JSON.stringify(dataToSubmit);
        
      const response = await fetch('/api/players/game-stats', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (response.ok) {
        alert(editingStatId ? 'Game stats updated successfully!' : 'Game stats added successfully!');
        setShowForm(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving game stats:', error);
      alert('Failed to save game stats');
    }
  };

  const handleDelete = async (statId: string) => {
    if (!confirm('Are you sure you want to delete these game stats? This will recalculate the player\'s averages.')) {
      return;
    }

    try {
      const response = await fetch(`/api/players/game-stats?id=${statId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Game stats deleted successfully!');
        fetchData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting game stats:', error);
      alert('Failed to delete game stats');
    }
  };

  const handleEdit = (stat: any) => {
    setEditingStatId(stat.id);
    setFormData({
      playerId: stat.playerId,
      gameId: stat.gameId || '',
      date: stat.date,
      opponent: stat.opponent,
      minutes: stat.minutes || 0,
      points: stat.points,
      rebounds: stat.rebounds,
      assists: stat.assists,
      steals: stat.steals,
      blocks: stat.blocks || 0,
      turnovers: stat.turnovers,
      missesForced: stat.missesForced || 0,
      fieldGoalsMade: stat.fieldGoalsMade,
      fieldGoalsAttempted: stat.fieldGoalsAttempted,
      threePointersMade: stat.threePointersMade,
      threePointersAttempted: stat.threePointersAttempted,
      possessionTime: stat.possessionTime || '',
      result: stat.result,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      playerId: '',
      gameId: '',
      date: '',
      opponent: '',
      minutes: '',
      points: '',
      rebounds: '',
      assists: '',
      steals: '',
      blocks: '',
      turnovers: '',
      missesForced: '',
      fieldGoalsMade: '',
      fieldGoalsAttempted: '',
      threePointersMade: '',
      threePointersAttempted: '',
      possessionTime: '',
      result: 'W',
    });
    setPlayerSearch('');
    setEditingStatId(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If game is selected, auto-fill date, opponent, and result
    if (name === 'gameId' && value) {
      const selectedGame = games.find(g => g.id === value);
      if (selectedGame) {
        const selectedPlayer = players.find(p => p.id === formData.playerId);
        const playerTeamId = selectedPlayer?.teamId;
        
        // Determine opponent and result
        const isHomeTeam = selectedGame.homeTeamId === playerTeamId;
        const opponentTeamId = isHomeTeam ? selectedGame.awayTeamId : selectedGame.homeTeamId;
        const opponentTeam = teams.find(t => t.id === opponentTeamId);
        
        const playerScore = isHomeTeam ? selectedGame.homeScore : selectedGame.awayScore;
        const opponentScore = isHomeTeam ? selectedGame.awayScore : selectedGame.homeScore;
        const result = playerScore > opponentScore ? 'W' : 'L';
        
        setFormData(prev => ({
          ...prev,
          gameId: value,
          date: selectedGame.scheduledDate.split('T')[0],
          opponent: opponentTeam?.name || '',
          result: selectedGame.status === 'completed' ? result : prev.result,
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: ['points', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 
               'fieldGoalsMade', 'fieldGoalsAttempted', 'threePointersMade', 
               'threePointersAttempted', 'possessionTime'].includes(name)
        ? value
        : value
    }));
  };

  // Filter players by search
  const filteredPlayers = players.filter(player => 
    player.displayName.toLowerCase().includes(playerSearch.toLowerCase()) ||
    player.minecraftUsername.toLowerCase().includes(playerSearch.toLowerCase())
  );

  // Get team name helper
  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown';
  };

  // Get team abbreviation helper
  const getTeamAbbr = (teamId: string) => {
    const team = teams.find(t => t.id === teamId);
    return team?.abbreviation || team?.name?.substring(0, 3).toUpperCase() || 'UNK';
  };

  const toggleGame = (gameId: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(gameId)) {
      newExpanded.delete(gameId);
    } else {
      newExpanded.add(gameId);
    }
    setExpandedGames(newExpanded);
  };

  // Group stats by game
  const statsByGame = (Array.isArray(gameStats) ? gameStats : []).reduce((acc, stat) => {
    const gameId = stat.gameId || 'no-game';
    if (!acc[gameId]) {
      acc[gameId] = [];
    }
    acc[gameId].push(stat);
    return acc;
  }, {} as Record<string, any[]>);

  const handleBulkSave = async (allStats: any[]) => {
    for (const stat of allStats) {
      try {
        const response = await fetch('/api/players/game-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(stat),
        });
        if (!response.ok) {
          console.error('Failed to save stat for player:', stat.playerId);
        }
      } catch (error) {
        console.error('Error saving bulk stats:', error);
      }
    }
    setShowBulkImport(false);
    fetchGameStats();
    alert(`Successfully imported ${allStats.length} player stats!`);
  };

  return (
    <div className="admin-page bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center text-gray-900 dark:text-white">
          <TrendingUp className="w-6 h-6 mr-2 text-mba-blue" />
          Game Stats
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => setShowBulkImport(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Import</span>
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Cancel' : 'Add Game Stats'}</span>
          </button>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkGameStatsModal
          onClose={() => setShowBulkImport(false)}
          onSave={handleBulkSave}
        />
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-6 mb-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Player Selection with Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Player * {formData.playerId && <span className="text-green-600">✓ Selected</span>}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search players by name or username..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                {filteredPlayers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">No players found</div>
                ) : (
                  filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, playerId: player.id }));
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                        formData.playerId === player.id
                          ? 'bg-mba-blue text-white hover:bg-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="font-medium">{player.displayName}</div>
                      <div className={`text-sm ${
                        formData.playerId === player.id
                          ? 'text-blue-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        @{player.minecraftUsername} • {getTeamAbbr(player.teamId)}
                      </div>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {filteredPlayers.length} player{filteredPlayers.length !== 1 ? 's' : ''} found • Click to select
              </p>
            </div>

            {/* Game Selection with Teams */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Game {formData.gameId && <span className="text-green-600">✓ Selected</span>}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search games by date, teams, or score..."
                  value={gameSearchInput}
                  onChange={(e) => setGameSearchInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                {(() => {
                  const selectedPlayer = players.find(p => p.id === formData.playerId);
                  const playerTeamId = selectedPlayer?.teamId;
                  
                  // Filter games to only show player's team games
                  let filteredGames = games.filter(g => 
                    playerTeamId && (g.homeTeamId === playerTeamId || g.awayTeamId === playerTeamId)
                  );
                  
                  // Filter out games where the player already has stats (unless we're editing)
                  if (formData.playerId && !editingStatId) {
                    const playerGameIds = gameStats
                      .filter(stat => stat.playerId === formData.playerId)
                      .map(stat => stat.gameId);
                    filteredGames = filteredGames.filter(game => !playerGameIds.includes(game.id));
                  }
                  
                  // Apply search filter
                  if (gameSearchInput) {
                    filteredGames = filteredGames.filter(game => {
                      const homeTeam = getTeamName(game.homeTeamId).toLowerCase();
                      const awayTeam = getTeamName(game.awayTeamId).toLowerCase();
                      const date = new Date(game.scheduledDate).toLocaleDateString().toLowerCase();
                      const searchLower = gameSearchInput.toLowerCase();
                      return homeTeam.includes(searchLower) || 
                             awayTeam.includes(searchLower) || 
                             date.includes(searchLower);
                    });
                  }
                  
                  // Sort by date (most recent first)
                  filteredGames.sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());
                  
                  if (!formData.playerId) {
                    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Select a player first</div>;
                  }
                  
                  if (filteredGames.length === 0) {
                    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No games found for this player's team</div>;
                  }
                  
                  return filteredGames.map((game) => {
                    const homeTeam = getTeamAbbr(game.homeTeamId);
                    const awayTeam = getTeamAbbr(game.awayTeamId);
                    const homeTeamFull = getTeamName(game.homeTeamId);
                    const awayTeamFull = getTeamName(game.awayTeamId);
                    const date = new Date(game.scheduledDate).toLocaleDateString();
                    const score = game.status === 'completed' ? ` ${game.awayScore}-${game.homeScore}` : '';
                    
                    return (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => {
                          handleChange({ 
                            target: { name: 'gameId', value: game.id } 
                          } as any);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                          formData.gameId === game.id
                            ? 'bg-mba-blue text-white hover:bg-blue-600'
                            : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                      >
                        <div className="font-medium">{date}: {awayTeam} @ {homeTeam}{score}</div>
                        <div className={`text-sm ${
                          formData.gameId === game.id
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {awayTeamFull} at {homeTeamFull} • {game.status}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Optional - auto-fills date, opponent, result • Click to select
              </p>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            {/* Opponent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Opponent *
              </label>
              <input
                type="text"
                name="opponent"
                value={formData.opponent}
                onChange={handleChange}
                required
                placeholder="Opponent team name"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            {/* Result */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Result *
              </label>
              <select
                name="result"
                value={formData.result}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="W">Win</option>
                <option value="L">Loss</option>
              </select>
            </div>
          </div>

          {/* Paste Stats Section */}
          {formData.playerId && formData.gameId && (
            <div className="border-t border-gray-300 dark:border-gray-600 pt-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Quick Import</h3>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Paste Stats
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Jigglebutt67 | MIN 5:30 | PTS 14 | FG 6/13 | 3FG 2/8 | AST/PASS 7/25 | OREB 3 | DREB 19 | REB 22 | STL 2 | BLK 5 | TOV 5 | MISS-AG 5 | POSS 246s"
                  rows={3}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handlePasteStats}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  Import Stats from Paste
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Paste stats in format: MIN 0:00 | PTS X | FG X/X | 3FG X/X | AST/PASS X/X | OREB X | DREB X | REB X | STL X | BLK X | TOV X | MISS-AG X | POSS Xs
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-300 dark:border-gray-600 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Minutes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minutes (seconds)
                </label>
                <input
                  type="number"
                  name="minutes"
                  value={formData.minutes}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 330 for 5:30"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Points
                </label>
                <input
                  type="number"
                  name="points"
                  value={formData.points}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Assists */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assists
                </label>
                <input
                  type="number"
                  name="assists"
                  value={formData.assists}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Rebounds */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rebounds
                </label>
                <input
                  type="number"
                  name="rebounds"
                  value={formData.rebounds}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Steals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Steals
                </label>
                <input
                  type="number"
                  name="steals"
                  value={formData.steals}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Blocks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Blocks
                </label>
                <input
                  type="number"
                  name="blocks"
                  value={formData.blocks}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Turnovers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Turnovers
                </label>
                <input
                  type="number"
                  name="turnovers"
                  value={formData.turnovers}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Misses Forced */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Misses Forced
                </label>
                <input
                  type="number"
                  name="missesForced"
                  value={formData.missesForced}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* Possession Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Possession Time
                </label>
                <input
                  type="number"
                  name="possessionTime"
                  value={formData.possessionTime}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* FG Attempted */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  FG Attempted
                </label>
                <input
                  type="number"
                  name="fieldGoalsAttempted"
                  value={formData.fieldGoalsAttempted}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* FG Made */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  FG Made
                </label>
                <input
                  type="number"
                  name="fieldGoalsMade"
                  value={formData.fieldGoalsMade}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* 3PT Attempted */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  3PT Attempted
                </label>
                <input
                  type="number"
                  name="threePointersAttempted"
                  value={formData.threePointersAttempted}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              {/* 3PT Made */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  3PT Made
                </label>
                <input
                  type="number"
                  name="threePointersMade"
                  value={formData.threePointersMade}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full px-6 py-3 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            {editingStatId ? 'Update Game Stats' : 'Add Game Stats'}
          </button>
        </form>
      )}

      {/* Existing Game Stats */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Existing Game Stats</h3>
        
        {/* Search for Games */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Games
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by team name or date..."
              value={gameSearch}
              onChange={(e) => setGameSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          {games
            .filter(game => {
              if (!gameSearch) return statsByGame[game.id]?.length > 0;
              const homeTeam = teams.find(t => t.id === game.homeTeamId);
              const awayTeam = teams.find(t => t.id === game.awayTeamId);
              const dateStr = new Date(game.scheduledDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              const searchLower = gameSearch.toLowerCase();
              return (
                statsByGame[game.id]?.length > 0 &&
                (homeTeam?.name.toLowerCase().includes(searchLower) ||
                 awayTeam?.name.toLowerCase().includes(searchLower) ||
                 dateStr.toLowerCase().includes(searchLower))
              );
            })
            .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
            .map((game) => {
              const homeTeam = teams.find(t => t.id === game.homeTeamId);
              const awayTeam = teams.find(t => t.id === game.awayTeamId);
              const gameStatsForGame = statsByGame[game.id] || [];
              const isExpanded = expandedGames.has(game.id);
              
              return (
                <div
                  key={game.id}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Game Header - Clickable */}
                  <button
                    onClick={() => toggleGame(game.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`px-3 py-1 rounded font-bold text-sm ${
                        game.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {game.status === 'completed' ? 'Final' : 'Scheduled'}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {awayTeam?.name || 'TBD'} @ {homeTeam?.name || 'TBD'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(game.scheduledDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                          {game.status === 'completed' && (
                            <span className="ml-3 font-semibold">
                              {game.awayScore} - {game.homeScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {gameStatsForGame.length} player{gameStatsForGame.length !== 1 ? 's' : ''}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Player Stats - Expandable */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                      <div className="p-4 space-y-3">
                        {gameStatsForGame.map((stat: any) => {
                          const player = players.find(p => p.id === stat.playerId);
                          return (
                            <div
                              key={stat.id}
                              className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`px-2 py-1 rounded font-bold text-sm ${
                                    stat.result === 'W' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                  }`}>
                                    {stat.result}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">
                                      {player?.displayName || 'Unknown Player'}
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {getTeamName(player?.teamId)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => handleEdit(stat)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(stat.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3 text-center text-sm">
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{stat.points}</div>
                                  <div className="text-xs text-gray-500">PTS</div>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{stat.rebounds}</div>
                                  <div className="text-xs text-gray-500">REB</div>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{stat.assists}</div>
                                  <div className="text-xs text-gray-500">AST</div>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{stat.steals}</div>
                                  <div className="text-xs text-gray-500">STL</div>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{stat.blocks || 0}</div>
                                  <div className="text-xs text-gray-500">BLK</div>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">{stat.turnovers}</div>
                                  <div className="text-xs text-gray-500">TOV</div>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">
                                    {stat.fieldGoalsMade}/{stat.fieldGoalsAttempted}
                                  </div>
                                  <div className="text-xs text-gray-500">FG</div>
                                </div>
                                <div>
                                  <div className="font-bold text-gray-900 dark:text-white">
                                    {stat.threePointersMade}/{stat.threePointersAttempted}
                                  </div>
                                  <div className="text-xs text-gray-500">3PT</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          
          {/* Stats without a game */}
          {statsByGame['no-game']?.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => toggleGame('no-game')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <div className="flex items-center space-x-4">
                  <div className="px-3 py-1 rounded font-bold text-sm bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                    Manual Entry
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      Stats Without Game Assignment
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Stats added manually without selecting a game
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {statsByGame['no-game'].length} stat{statsByGame['no-game'].length !== 1 ? 's' : ''}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${expandedGames.has('no-game') ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedGames.has('no-game') && (
                <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <div className="p-4 space-y-3">
                    {statsByGame['no-game'].map((stat: any) => {
                      const player = players.find(p => p.id === stat.playerId);
                      return (
                        <div
                          key={stat.id}
                          className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`px-2 py-1 rounded font-bold text-sm ${
                                stat.result === 'W' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                              }`}>
                                {stat.result}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {player?.displayName || 'Unknown Player'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  vs {stat.opponent} • {new Date(stat.date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(stat)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(stat.id)}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-8 gap-3 text-center text-sm">
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{stat.points}</div>
                              <div className="text-xs text-gray-500">PTS</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{stat.rebounds}</div>
                              <div className="text-xs text-gray-500">REB</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{stat.assists}</div>
                              <div className="text-xs text-gray-500">AST</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{stat.steals}</div>
                              <div className="text-xs text-gray-500">STL</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{stat.blocks || 0}</div>
                              <div className="text-xs text-gray-500">BLK</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">{stat.turnovers}</div>
                              <div className="text-xs text-gray-500">TOV</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {stat.fieldGoalsMade}/{stat.fieldGoalsAttempted}
                              </div>
                              <div className="text-xs text-gray-500">FG</div>
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white">
                                {stat.threePointersMade}/{stat.threePointersAttempted}
                              </div>
                              <div className="text-xs text-gray-500">3PT</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {Object.keys(statsByGame).length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              No game stats recorded yet. Add the first one above!
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 text-gray-600 dark:text-gray-400">
        <p className="mb-2">
          <strong>How it works:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Select a player and enter their stats for a specific game</li>
          <li>The system will automatically calculate and update their season averages</li>
          <li>All percentages (FG%, 3PT%) are calculated automatically</li>
          <li>Player stats on the stats page will update immediately</li>
        </ul>
      </div>
    </div>
  );
}

