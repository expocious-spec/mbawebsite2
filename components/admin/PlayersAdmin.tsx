'use client';

import React, { useState, useEffect } from 'react';
import { Search, Edit2, Trash2, Plus, UserPlus, TrendingUp } from 'lucide-react';
import AddGameStatsModal from './AddGameStatsModal';

export default function PlayersAdmin() {
  const [showImportForm, setShowImportForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>('');
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGameStatsModal, setShowGameStatsModal] = useState(false);
  const [gameStatsPlayer, setGameStatsPlayer] = useState<any>(null);

  // Form state
  const [minecraftUsername, setMinecraftUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [teamId, setTeamId] = useState('');
  const [roles, setRoles] = useState<string[]>(['Player']);
  const [showStats, setShowStats] = useState(false);
  
  // Stats state
  const [gamesPlayed, setGamesPlayed] = useState('0');
  const [points, setPoints] = useState('0');
  const [rebounds, setRebounds] = useState('0');
  const [assists, setAssists] = useState('0');
  const [steals, setSteals] = useState('0');
  const [blocks, setBlocks] = useState('0');
  const [turnovers, setTurnovers] = useState('0');

  // Fetch players and teams on mount
  useEffect(() => {
    fetchPlayers();
    fetchTeams();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      const data = await response.json();
      setPlayers(data);
    } catch (error) {
      console.error('Failed to fetch players:', error);
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

  const filteredPlayers = players.filter(p => {
    const matchesSearch = p.minecraftUsername.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.discordUsername && p.discordUsername.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesTeam = !teamFilter || p.teamId === teamFilter;
    
    return matchesSearch && matchesTeam;
  });

  const handleImportPlayer = async () => {
    if (!minecraftUsername) {
      alert('Please enter a Minecraft username');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          minecraftUsername,
          discordUsername,
          teamId,
          roles,
          stats: {
            gamesPlayed: parseInt(gamesPlayed) || 0,
            points: parseFloat(points) || 0,
            rebounds: parseFloat(rebounds) || 0,
            assists: parseFloat(assists) || 0,
            steals: parseFloat(steals) || 0,
            blocks: parseFloat(blocks) || 0,
            turnovers: parseFloat(turnovers) || 0,
          },
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Player imported successfully!');
        await fetchPlayers();
        resetForm();
      } else {
        alert(data.error || 'Failed to import player');
      }
    } catch (error) {
      alert('Failed to import player');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlayer = async () => {
    if (!selectedPlayer) return;

    setLoading(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPlayer.id,
          username: displayName,
          minecraftUsername,
          discordUsername,
          teamId,
          roles,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Player updated successfully!');
        await fetchPlayers();
        resetForm();
      } else {
        alert(data.error || 'Failed to update player');
      }
    } catch (error) {
      alert('Failed to update player');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/users?id=${playerId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Player deleted successfully!');
        await fetchPlayers();
      } else {
        alert(data.error || 'Failed to delete player');
      }
    } catch (error) {
      alert('Failed to delete player');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMinecraftUsername('');
    setDisplayName('');
    setDiscordUsername('');
    setTeamId('');
    setRoles(['Player']);
    setGamesPlayed('0');
    setPoints('0');
    setRebounds('0');
    setAssists('0');
    setSteals('0');
    setBlocks('0');
    setTurnovers('0');
    setShowStats(false);
    setShowImportForm(false);
    setShowEditForm(false);
    setSelectedPlayer(null);
  };

  const openEditForm = (player: any) => {
    setSelectedPlayer(player);
    setMinecraftUsername(player.minecraftUsername);
    setDisplayName(player.displayName);
    setDiscordUsername(player.discordUsername || '');
    setTeamId(player.teamId || '');
    setRoles(player.roles || ['Player']);
    setGamesPlayed(player.stats?.gamesPlayed?.toString() || '0');
    setPoints(player.stats?.points?.toString() || '0');
    setRebounds(player.stats?.rebounds?.toString() || '0');
    setAssists(player.stats?.assists?.toString() || '0');
    setSteals(player.stats?.steals?.toString() || '0');
    setBlocks(player.stats?.blocks?.toString() || '0');
    setTurnovers(player.stats?.turnovers?.toString() || '0');
    setShowEditForm(true);
    setShowImportForm(false);
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Player Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Import players from Minecraft, assign teams, and manage roster
          </p>
        </div>
        <button
          onClick={() => {
            if (showImportForm) {
              resetForm();
            } else {
              setShowImportForm(true);
              setShowEditForm(false);
            }
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          <span>Import Player</span>
        </button>
      </div>

      {/* Import/Edit Form */}
      {(showImportForm || showEditForm) && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {showEditForm ? 'Edit Player' : 'Import New Player'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Minecraft Username *
              </label>
              <input
                type="text"
                value={minecraftUsername}
                onChange={(e) => setMinecraftUsername(e.target.value)}
                placeholder="Enter Minecraft username"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
              {!showEditForm && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Display name and profile will be fetched automatically
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Player display name"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Discord Username
              </label>
              <input
                type="text"
                value={discordUsername}
                onChange={(e) => setDiscordUsername(e.target.value)}
                placeholder="username#1234"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Team
              </label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="">Select team...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Roles
              </label>
              <div className="space-y-2">
                {['Player', 'Franchise Owner', 'General Manager', 'Head Coach', 'Assistant Coach'].map((role) => (
                  <label key={role} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={roles.includes(role)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setRoles([...roles, role]);
                        } else {
                          setRoles(roles.filter(r => r !== role));
                        }
                      }}
                      className="w-4 h-4 text-mba-blue bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 rounded focus:ring-mba-blue"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{role}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowStats(!showStats)}
              className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-mba-blue dark:hover:text-mba-blue font-medium"
            >
              <span>{showStats ? '▼' : '▶'}</span>
              <span>Player Statistics (Optional)</span>
            </button>
            
            {showStats && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Games Played
                  </label>
                  <input
                    type="number"
                    value={gamesPlayed}
                    onChange={(e) => setGamesPlayed(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Points (PPG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Rebounds (RPG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={rebounds}
                    onChange={(e) => setRebounds(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Assists (APG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={assists}
                    onChange={(e) => setAssists(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Steals (SPG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={steals}
                    onChange={(e) => setSteals(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Blocks (BPG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={blocks}
                    onChange={(e) => setBlocks(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Turnovers (TPG)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={turnovers}
                    onChange={(e) => setTurnovers(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 mt-6">\n            <button
              onClick={showEditForm ? handleUpdatePlayer : handleImportPlayer}
              disabled={loading}
              className="px-6 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (showEditForm ? 'Update Player' : 'Import Player')}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search players by Minecraft or Discord username..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
          />
        </div>
        <div className="sm:w-64">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
          >
            <option value="">All Teams</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Players List */}
      <div className="space-y-3">
        {filteredPlayers.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No players found matching your search' : 'No players yet. Import your first player!'}
          </div>
        ) : (
          filteredPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-mba-blue dark:hover:border-mba-blue transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{player.displayName || player.minecraftUsername}</h3>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-sm text-gray-500 dark:text-gray-400">@{player.minecraftUsername}</span>
                      {player.discordUsername && (
                        <>
                          <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">{player.discordUsername}</span>
                        </>
                      )}
                      {player.teamId && (
                        <>
                          <span className="text-sm text-gray-500 dark:text-gray-400">•</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {teams.find(t => t.id === player.teamId)?.name || 'Unknown Team'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setGameStatsPlayer(player);
                    setShowGameStatsModal(true);
                  }}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Add game stats"
                >
                  <TrendingUp className="w-5 h-5" />
                </button>
                <button
                  onClick={() => openEditForm(player)}
                  className="p-2 text-mba-blue hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Edit player"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDeletePlayer(player.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Delete player"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Game Stats Modal */}
      {showGameStatsModal && gameStatsPlayer && (
        <AddGameStatsModal
          playerId={gameStatsPlayer.id}
          playerName={gameStatsPlayer.displayName || gameStatsPlayer.minecraftUsername}
          onClose={() => {
            setShowGameStatsModal(false);
            setGameStatsPlayer(null);
          }}
          onSave={async (gameStats) => {
            try {
              const response = await fetch('/api/players/game-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(gameStats),
              });

              const data = await response.json();
              
              if (data.success) {
                alert('Game stats added successfully!');
                await fetchPlayers();
                setShowGameStatsModal(false);
                setGameStatsPlayer(null);
              } else {
                alert('Error: ' + data.message);
              }
            } catch (error) {
              console.error('Failed to add game stats:', error);
              alert('Failed to add game stats');
            }
          }}
        />
      )}
    </div>
  );
}

