'use client';

import React, { useState, useEffect } from 'react';
import { Award, Search, Plus, Trash2, Users, CheckCircle, Edit2 } from 'lucide-react';

interface Accolade {
  id: number;
  seasonId?: number;
  title: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: string;
}

interface Assignment {
  id: number;
  playerId: string;
  minecraftUserId: string;
  minecraftUsername: string;
  awardedDate: string;
}

export default function AccoladesAdmin() {
  const [accolades, setAccolades] = useState<Accolade[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingMode, setEditingMode] = useState(false);
  const [selectedAccolade, setSelectedAccolade] = useState<Accolade | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  // Form state
  const [selectedSeason, setSelectedSeason] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#FFD700');
  const [icon, setIcon] = useState('');

  // Preset colors
  const presetColors = [
    { name: 'Gold', value: '#FFD700' },
    { name: 'Silver', value: '#C0C0C0' },
    { name: 'Bronze', value: '#CD7F32' },
    { name: 'Red', value: '#FF4444' },
    { name: 'Blue', value: '#4444FF' },
    { name: 'Green', value: '#44FF44' },
    { name: 'Purple', value: '#9B59B6' },
    { name: 'Orange', value: '#FF8C00' },
  ];

  useEffect(() => {
    fetchAccolades();
    fetchPlayers();
    fetchSeasons();
  }, []);

  const fetchAccolades = async () => {
    try {
      const response = await fetch('/api/accolades');
      const data = await response.json();
      if (Array.isArray(data)) {
        setAccolades(data);
      } else {
        setAccolades([]);
      }
    } catch (error) {
      console.error('Failed to fetch accolades:', error);
      setAccolades([]);
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

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      const data = await response.json();
      setSeasons(data);
      // Auto-select current season
      const currentSeason = data.find((s: any) => s.isCurrent);
      if (currentSeason) {
        setSelectedSeason(currentSeason.id.toString());
      }
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
    }
  };

  const fetchAssignments = async (accoladeId: number) => {
    try {
      const response = await fetch(`/api/accolades/${accoladeId}`);
      const data = await response.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      setAssignments([]);
    }
  };

  const handleCreateAccolade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/accolades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: selectedSeason ? parseInt(selectedSeason) : null,
          title,
          description,
          color,
          icon,
          playerIds: selectedPlayerIds.length > 0 ? selectedPlayerIds : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create accolade');
      }

      alert(`Accolade created successfully!${selectedPlayerIds.length > 0 ? ` Assigned to ${selectedPlayerIds.length} player(s).` : ''}`);
      setShowCreateForm(false);
      resetForm();
      fetchAccolades();
    } catch (error: any) {
      alert(error.message || 'Failed to create accolade');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPlayers = async () => {
    if (!selectedAccolade || selectedPlayerIds.length === 0) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/accolades/${selectedAccolade.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: selectedPlayerIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign players');
      }

      alert(`Assigned accolade to ${selectedPlayerIds.length} player(s)!`);
      fetchAssignments(selectedAccolade.id);
      setSelectedPlayerIds([]);
    } catch (error: any) {
      alert(error.message || 'Failed to assign players');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (accoladeId: number, playerId: string, playerName: string) => {
    if (!confirm(`Remove accolade from ${playerName}?`)) return;

    try {
      const response = await fetch(`/api/accolades/${accoladeId}?playerId=${playerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove assignment');
      }

      alert('Assignment removed successfully!');
      fetchAssignments(accoladeId);
    } catch (error) {
      alert('Failed to remove assignment');
      console.error(error);
    }
  };

  const handleDeleteAccolade = async (id: number) => {
    if (!confirm('Are you sure you want to delete this accolade? This will remove it from all assigned players.')) return;

    try {
      const response = await fetch(`/api/accolades?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete accolade');
      }

      alert('Accolade deleted successfully!');
      fetchAccolades();
    } catch (error) {
      alert('Failed to delete accolade');
      console.error(error);
    }
  };

  const handleManageAccolade = (accolade: Accolade) => {
    setSelectedAccolade(accolade);
    setEditingMode(false);
    setShowAssignModal(true);
    fetchAssignments(accolade.id);
    setSelectedPlayerIds([]);
    // Populate form fields for potential editing
    setTitle(accolade.title);
    setDescription(accolade.description || '');
    setColor(accolade.color);
    setIcon(accolade.icon || '');
    setSelectedSeason(accolade.seasonId?.toString() || '');
  };

  const handleUpdateAccolade = async () => {
    if (!selectedAccolade) return;

    setLoading(true);
    try {
      const response = await fetch('/api/accolades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAccolade.id,
          seasonId: selectedSeason ? parseInt(selectedSeason) : null,
          title,
          description,
          color,
          icon,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update accolade');
      }

      alert('Accolade updated successfully!');
      setEditingMode(false);
      fetchAccolades();
      // Update the selected accolade with new values
      setSelectedAccolade({
        ...selectedAccolade,
        title,
        description,
        color,
        icon,
        seasonId: selectedSeason ? parseInt(selectedSeason) : undefined,
      });
    } catch (error: any) {
      alert(error.message || 'Failed to update accolade');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedSeason('');
    setTitle('');
    setDescription('');
    setColor('#FFD700');
    setIcon('');
    setPlayerSearch('');
    setSelectedPlayerIds([]);
    // Re-select current season
    const currentSeason = seasons.find((s: any) => s.isCurrent);
    if (currentSeason) {
      setSelectedSeason(currentSeason.id.toString());
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const filteredAccolades = accolades.filter(accolade => {
    const searchLower = searchTerm.toLowerCase();
    return accolade.title.toLowerCase().includes(searchLower);
  });

  const getAvailablePlayers = () => {
    const assignedPlayerIds = assignments.map(a => a.playerId);
    return players.filter(player => {
      const search = playerSearch.toLowerCase();
      const matchesSearch = !search || 
        player.displayName.toLowerCase().includes(search) ||
        player.minecraftUsername.toLowerCase().includes(search) ||
        player.discordUsername?.toLowerCase().includes(search);
      const notAssigned = !assignedPlayerIds.includes(player.id);
      return matchesSearch && notAssigned;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Accolades & Awards</h2>
          <p className="text-gray-400 mt-1">Create accolades and assign them to multiple players</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Accolade
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 max-w-2xl w-full border border-yellow-500/20 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">Create New Accolade</h3>
            
            <form onSubmit={handleCreateAccolade} className="space-y-4">
              {/* Season Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Season
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="">No Season (Lifetime Achievement)</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name} {season.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Season 5 Champion"
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Badge Color
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {presetColors.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className={`px-3 py-2 rounded-lg border-2 transition-all ${
                        color === preset.value 
                          ? 'border-yellow-500 scale-105' 
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                      style={{ backgroundColor: preset.value }}
                    >
                      <span className="text-white text-xs font-semibold text-shadow">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                />
              </div>

              {/* Icon/Emoji */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon/Emoji (Optional)
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="e.g., 🏆, 👑, ⭐, 🥇"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* Preview */}
              {title && (
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <p className="text-xs text-gray-400 mb-2">Preview:</p>
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {icon && <span>{icon}</span>}
                    <span>{title}</span>
                  </div>
                </div>
              )}

              {/* Optional: Assign to Players Now */}
              <div className="border-t border-slate-700 pt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Assign to Players (Optional)
                </label>
                <p className="text-xs text-gray-400 mb-3">
                  You can assign players now, or do it later by managing the accolade.
                </p>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full px-3 py-2 mb-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
                <div className="max-h-48 overflow-y-auto bg-slate-800/50 rounded-lg border border-slate-700 p-2">
                  {players
                    .filter(player => {
                      const search = playerSearch.toLowerCase();
                      return !search || 
                        player.displayName.toLowerCase().includes(search) ||
                        player.minecraftUsername.toLowerCase().includes(search) ||
                        player.discordUsername?.toLowerCase().includes(search);
                    })
                    .map(player => (
                      <label
                        key={player.id}
                        className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlayerIds.includes(player.id)}
                          onChange={() => togglePlayerSelection(player.id)}
                          className="w-4 h-4 rounded border-slate-600 text-yellow-500 focus:ring-yellow-500"
                        />
                        <span className="text-white text-sm">
                          {player.displayName}
                          {player.discordUsername && (
                            <span className="text-gray-400 ml-2">@{player.discordUsername}</span>
                          )}
                        </span>
                      </label>
                    ))}
                </div>
                {selectedPlayerIds.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    {selectedPlayerIds.length} player(s) selected
                  </p>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Accolade'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage/Assign Modal */}
      {showAssignModal && selectedAccolade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 max-w-3xl w-full border border-yellow-500/20 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Manage Accolade</h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedAccolade(null);
                  setSelectedPlayerIds([]);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Accolade Info/Edit */}
            <div className="mb-6">
              {!editingMode ? (
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="flex items-start justify-between mb-2">
                    <div 
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold text-white"
                      style={{ backgroundColor: selectedAccolade.color }}
                    >
                      {selectedAccolade.icon && <span>{selectedAccolade.icon}</span>}
                      <span>{selectedAccolade.title}</span>
                    </div>
                    <button
                      onClick={() => setEditingMode(true)}
                      className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                      title="Edit accolade"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedAccolade.description && (
                    <p className="text-gray-400 text-sm mt-2">{selectedAccolade.description}</p>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    {seasons.find(s => s.id === selectedAccolade.seasonId)?.name || 'Lifetime Achievement'}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-800/50 rounded-lg border border-yellow-500/30 space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-semibold">Edit Accolade</h4>
                    <button
                      onClick={() => setEditingMode(false)}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Season Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Season
                    </label>
                    <select
                      value={selectedSeason}
                      onChange={(e) => setSelectedSeason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    >
                      <option value="">No Season (Lifetime Achievement)</option>
                      {seasons.map(season => (
                        <option key={season.id} value={season.id}>
                          {season.name} {season.isCurrent ? '(Current)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Badge Color
                    </label>
                    <div className="grid grid-cols-4 gap-2 mb-2">
                      {presetColors.map(preset => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setColor(preset.value)}
                          className={`px-2 py-1 rounded-lg border-2 transition-all ${
                            color === preset.value 
                              ? 'border-yellow-500 scale-105' 
                              : 'border-slate-700 hover:border-slate-600'
                          }`}
                          style={{ backgroundColor: preset.value }}
                        >
                          <span className="text-white text-xs font-semibold text-shadow">
                            {preset.name}
                          </span>
                        </button>
                      ))}
                    </div>
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-full h-8 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Icon/Emoji */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Icon/Emoji (Optional)
                    </label>
                    <input
                      type="text"
                      value={icon}
                      onChange={(e) => setIcon(e.target.value)}
                      placeholder="e.g., 🏆, 👑, ⭐, 🥇"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                    />
                  </div>

                  {/* Preview */}
                  {title && (
                    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                      <p className="text-xs text-gray-400 mb-2">Preview:</p>
                      <div 
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: color }}
                      >
                        {icon && <span>{icon}</span>}
                        <span>{title}</span>
                      </div>
                    </div>
                  )}

                  {/* Update Button */}
                  <button
                    onClick={handleUpdateAccolade}
                    disabled={loading || !title}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:opacity-50 text-white py-2 rounded-lg transition-all"
                  >
                    {loading ? 'Updating...' : 'Update Accolade'}
                  </button>
                </div>
              )}
            </div>

            {/* Currently Assigned Players */}
            <div className="mb-6">
              <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigned Players ({assignments.length})
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {assignments.length === 0 ? (
                  <p className="text-gray-400 text-sm py-4 text-center">
                    No players assigned yet
                  </p>
                ) : (
                  assignments.map(assignment => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://mc-heads.net/avatar/${assignment.minecraftUserId}/32`}
                          alt={assignment.minecraftUsername}
                          className="w-8 h-8 rounded"
                        />
                        <div>
                          <div className="text-white text-sm font-medium">
                            {assignment.minecraftUsername}
                          </div>
                          <div className="text-gray-400 text-xs">
                            {new Date(assignment.awardedDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveAssignment(selectedAccolade.id, assignment.playerId, assignment.minecraftUsername)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Remove assignment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Assign More Players */}
            <div className="border-t border-slate-700 pt-4">
              <h4 className="text-white font-semibold mb-3">Assign to More Players</h4>
              <input
                type="text"
                placeholder="Search players..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-full px-3 py-2 mb-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
              />
              <div className="max-h-64 overflow-y-auto bg-slate-800/50 rounded-lg border border-slate-700 p-2 mb-4">
                {getAvailablePlayers().map(player => (
                  <label
                    key={player.id}
                    className="flex items-center gap-3 p-2 hover:bg-slate-700/50 rounded cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPlayerIds.includes(player.id)}
                      onChange={() => togglePlayerSelection(player.id)}
                      className="w-4 h-4 rounded border-slate-600 text-yellow-500 focus:ring-yellow-500"
                    />
                    <img
                      src={`https://mc-heads.net/avatar/${player.minecraftUserId}/24`}
                      alt={player.minecraftUsername}
                      className="w-6 h-6 rounded"
                    />
                    <span className="text-white text-sm">
                      {player.displayName}
                      {player.discordUsername && (
                        <span className="text-gray-400 ml-2">@{player.discordUsername}</span>
                      )}
                    </span>
                  </label>
                ))}
                {getAvailablePlayers().length === 0 && (
                  <p className="text-gray-400 text-sm py-4 text-center">
                    {assignments.length > 0 ? 'All players have been assigned' : 'No players found'}
                  </p>
                )}
              </div>
              {selectedPlayerIds.length > 0 && (
                <button
                  onClick={handleAssignPlayers}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {loading ? 'Assigning...' : `Assign to ${selectedPlayerIds.length} Player(s)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search accolades by title..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Accolades List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredAccolades.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
            <Award className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No accolades found</p>
          </div>
        ) : (
          filteredAccolades.map(accolade => (
            <div
              key={accolade.id}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-5 border border-slate-700 hover:border-yellow-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div 
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold text-white mb-2"
                    style={{ backgroundColor: accolade.color }}
                  >
                    {accolade.icon && <span>{accolade.icon}</span>}
                    <span>{accolade.title}</span>
                  </div>
                  {accolade.description && (
                    <p className="text-gray-400 text-sm mb-2">{accolade.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    {seasons.find(s => s.id === accolade.seasonId)?.name || 'Lifetime Achievement'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleManageAccolade(accolade)}
                    className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
                    title="Manage assignments"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteAccolade(accolade.id)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete accolade"
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
