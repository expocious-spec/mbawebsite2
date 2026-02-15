'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar } from 'lucide-react';

export default function GamesAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>([]);
  const [currentSeasonName, setCurrentSeasonName] = useState<string>('Preseason 1');
  const [loading, setLoading] = useState(false);

  // Form state
  const [homeTeamId, setHomeTeamId] = useState('');
  const [awayTeamId, setAwayTeamId] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'completed' | 'live'>('scheduled');
  const [homeScore, setHomeScore] = useState<number | string>(0);
  const [awayScore, setAwayScore] = useState<number | string>(0);
  const [season, setSeason] = useState<string>('Preseason 1');
  const [week, setWeek] = useState<number | string>('');
  const [isForfeit, setIsForfeit] = useState(false);
  const [forfeitWinner, setForfeitWinner] = useState<'home' | 'away'>('home');
  
  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'completed' | 'live'>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');

  // Fetch seasons
  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const res = await fetch('/api/seasons');
      if (res.ok) {
        const seasons = await res.json();
        const seasonNames = seasons.map((s: any) => s.name);
        setAvailableSeasons(seasonNames);
        
        const currentSeason = seasons.find((s: any) => s.isCurrent);
        if (currentSeason) {
          setCurrentSeasonName(currentSeason.name);
          setSeason(currentSeason.name);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  // Fetch games and teams on mount
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

  const filteredGames = [...games]
    .filter(game => {
      // Status filter
      if (statusFilter !== 'all' && game.status !== statusFilter) return false;
      
      // Season filter
      if (seasonFilter !== 'all' && game.season !== seasonFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const homeTeam = teams.find(t => t.id === game.homeTeamId);
        const awayTeam = teams.find(t => t.id === game.awayTeamId);
        const searchLower = searchQuery.toLowerCase();
        const matchesTeam = homeTeam?.name.toLowerCase().includes(searchLower) || 
                           awayTeam?.name.toLowerCase().includes(searchLower);
        const matchesDate = new Date(game.scheduledDate).toLocaleDateString().includes(searchQuery);
        return matchesTeam || matchesDate;
      }
      
      return true;
    })
    .sort((a, b) => 
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    );

  const handleSaveGame = async () => {
    if (!homeTeamId || !awayTeamId || !scheduledDate) {
      alert('Please fill in all required fields');
      return;
    }

    if (homeTeamId === awayTeamId) {
      alert('Home and away teams must be different');
      return;
    }

    setLoading(true);
    try {
      // Convert datetime-local value to ISO string
      // The input gives us local time, so we convert it to a proper ISO timestamp
      const dateTimeISO = new Date(scheduledDate).toISOString();
      
      const method = editingGame ? 'PUT' : 'POST';
      const response = await fetch('/api/games', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingGame && { id: editingGame.id }),
          homeTeamId,
          awayTeamId,
          scheduledDate: dateTimeISO,
          status,
          homeScore: homeScore ? parseInt(homeScore.toString()) : undefined,
          awayScore: awayScore ? parseInt(awayScore.toString()) : undefined,
          season,
          week: week ? parseInt(week.toString()) : undefined,
          isForfeit: status === 'completed' ? isForfeit : false,
          forfeitWinner: isForfeit ? forfeitWinner : undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Game save error:', data);
        alert('Error: ' + (data.error || data.message || 'Unknown error'));
        setLoading(false);
        return;
      }
      
      if (data.success) {
        alert(editingGame ? 'Game updated successfully!' : 'Game scheduled successfully!');
        await fetchGames();
        resetForm();
      } else {
        alert('Error: ' + (data.error || data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to save game:', error);
      alert('Failed to save game');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      const response = await fetch(`/api/games?id=${gameId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Game deleted successfully!');
        await fetchGames();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      alert('Failed to delete game');
    }
  };

  const resetForm = () => {
    setHomeTeamId('');
    setAwayTeamId('');
    setScheduledDate('');
    setStatus('scheduled');
    setHomeScore('');
    setAwayScore('');
    setSeason(currentSeasonName);
    setWeek('');
    setIsForfeit(false);
    setForfeitWinner('home');
    setShowForm(false);
    setEditingGame(null);
  };

  const openEditForm = (game: any) => {
    setEditingGame(game);
    setHomeTeamId(game.homeTeamId);
    setAwayTeamId(game.awayTeamId);
    // Format date for datetime-local input (yyyy-MM-ddTHH:mm)
    const date = new Date(game.scheduledDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    setScheduledDate(`${year}-${month}-${day}T${hours}:${minutes}`);
    setStatus(game.status);
    setHomeScore(game.homeScore?.toString() || '');
    setAwayScore(game.awayScore?.toString() || '');
    setSeason(game.season || currentSeasonName);
    setWeek(game.week?.toString() || '');
    setIsForfeit(game.isForfeit || false);
    setForfeitWinner(game.forfeitWinner || 'home');
    setShowForm(true);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      live: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      completed: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return badges[status as keyof typeof badges] || badges.scheduled;
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Game Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Schedule games, update scores, and manage the season
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Schedule Game</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingGame ? 'Edit Game' : 'Schedule New Game'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Home Team *
              </label>
              <select
                value={homeTeamId}
                onChange={(e) => setHomeTeamId(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="">Select home team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Away Team *
              </label>
              <select
                value={awayTeamId}
                onChange={(e) => setAwayTeamId(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="">Select away team...</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Date & Time (EST) *
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter time in Eastern Standard Time</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Season
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                {availableSeasons.map((seasonName) => (
                  <option key={seasonName} value={seasonName}>
                    {seasonName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Week (Optional)
              </label>
              <input
                type="number"
                value={week}
                onChange={(e) => setWeek(e.target.value)}
                placeholder="e.g., 1, 2, 3..."
                min="1"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave blank for games without a specific week</p>
            </div>

            {(status === 'live' || status === 'completed') && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Home Score
                  </label>
                  <input
                    type="number"
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="0"
                    disabled={isForfeit}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Away Score
                  </label>
                  <input
                    type="number"
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="0"
                    disabled={isForfeit}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </div>
                
                {status === 'completed' && (
                  <>
                    <div className="col-span-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isForfeit}
                          onChange={(e) => setIsForfeit(e.target.checked)}
                          className="w-4 h-4 text-mba-blue border-gray-300 rounded focus:ring-mba-blue"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Mark as Forfeit
                        </span>
                      </label>
                    </div>
                    
                    {isForfeit && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                          Forfeit Winner (Gets FFW)
                        </label>
                        <select
                          value={forfeitWinner}
                          onChange={(e) => setForfeitWinner(e.target.value as any)}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                        >
                          <option value="home">Home Team (FFW) - Away Team (FFL)</option>
                          <option value="away">Away Team (FFW) - Home Team (FFL)</option>
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          FFW = Forfeit Win, FFL = Forfeit Loss. This affects team records.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleSaveGame}
              disabled={loading}
              className="px-6 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (editingGame ? 'Update Game' : 'Schedule Game')}
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

      {/* Games List */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Scheduled Games</h3>
        
        {/* Search and Filter Bar */}
        <div className="flex gap-3 mb-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by team name or date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={seasonFilter}
            onChange={(e) => setSeasonFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
          >
            <option value="all">All Seasons</option>
            {availableSeasons.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>
      
      <div className="space-y-3">
        {filteredGames.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            {searchQuery || statusFilter !== 'all' ? 'No games match your search criteria.' : 'No games scheduled yet. Create your first game!'}
          </div>
        ) : (
          filteredGames.map((game) => (
            <div
              key={game.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-mba-blue dark:hover:border-mba-blue transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(game.scheduledDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(game.status)}`}>
                      {game.status.charAt(0).toUpperCase() + game.status.slice(1)}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                      {game.season || 'Season 1'}
                    </span>
                    {game.week && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                        Week {game.week}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {teams.find(t => t.id === game.homeTeamId)?.name || 'Unknown Team'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Home</div>
                      </div>
                      {game.homeScore !== null && game.homeScore !== undefined && game.awayScore !== null && game.awayScore !== undefined ? (
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {game.homeScore} - {game.awayScore}
                        </div>
                      ) : (
                        <div className="text-xl font-medium text-gray-400">vs</div>
                      )}
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {teams.find(t => t.id === game.awayTeamId)?.name || 'Unknown Team'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Away</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => openEditForm(game)}
                    className="p-2 text-mba-blue hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit game"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteGame(game.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Delete game"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

