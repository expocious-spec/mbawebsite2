'use client';

import React, { useState, useEffect } from 'react';
import { Award, Search, Plus, Trash2, User } from 'lucide-react';

interface Accolade {
  id: number;
  playerId: string;
  seasonId?: number;
  title: string;
  description?: string;
  color: string;
  icon?: string;
  awardedDate: string;
  player: {
    id: string;
    username: string;
    avatarUrl?: string;
    discordUsername?: string;
  };
  season?: {
    id: number;
    name: string;
    isActive: boolean;
  };
}

export default function AccoladesAdmin() {
  const [accolades, setAccolades] = useState<Accolade[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

  // Form state
  const [selectedPlayer, setSelectedPlayer] = useState('');
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

  const handleCreateAccolade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/accolades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer,
          seasonId: selectedSeason ? parseInt(selectedSeason) : null,
          title,
          description,
          color,
          icon,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create accolade');
      }

      alert('Accolade created successfully!');
      setShowCreateForm(false);
      resetForm();
      fetchAccolades();
    } catch (error: any) {
      alert(error.message || 'Failed to create accolade');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccolade = async (id: number) => {
    if (!confirm('Are you sure you want to delete this accolade?')) return;

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

  const resetForm = () => {
    setSelectedPlayer('');
    setSelectedSeason('');
    setTitle('');
    setDescription('');
    setColor('#FFD700');
    setIcon('');
    setPlayerSearch('');
    // Re-select current season
    const currentSeason = seasons.find((s: any) => s.isCurrent);
    if (currentSeason) {
      setSelectedSeason(currentSeason.id.toString());
    }
  };

  const filteredAccolades = accolades.filter(accolade => {
    const searchLower = searchTerm.toLowerCase();
    return (
      accolade.title.toLowerCase().includes(searchLower) ||
      accolade.player?.username?.toLowerCase().includes(searchLower) ||
      accolade.season?.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Accolades & Awards</h2>
          <p className="text-gray-400 mt-1">Manage player accolades and season awards</p>
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
              {/* Player Selection with Search */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Player *
                </label>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full px-3 py-2 mb-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                />
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  required
                  size={6}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="">Select a player...</option>
                  {players
                    .filter(player => {
                      const search = playerSearch.toLowerCase();
                      return !search || 
                        player.displayName.toLowerCase().includes(search) ||
                        player.minecraftUsername.toLowerCase().includes(search) ||
                        player.discordUsername?.toLowerCase().includes(search);
                    })
                    .map(player => (
                      <option key={player.id} value={player.id}>
                        {player.displayName} {player.discordUsername ? `(@${player.discordUsername})` : ''}
                      </option>
                    ))}
                </select>
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
                  placeholder="e.g., Season 5 Finals Champion"
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

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search accolades by title, player, or season..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
        />
      </div>

      {/* Accolades List */}
      <div className="space-y-3">
        {filteredAccolades.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
            <Award className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No accolades found</p>
          </div>
        ) : (
          filteredAccolades.map(accolade => (
            <div
              key={accolade.id}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-5 border border-slate-700 hover:border-yellow-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  {/* Player Info */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {accolade.player?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-semibold">
                        {accolade.player?.username}
                      </span>
                      {accolade.player?.discordUsername && (
                        <span className="text-gray-400 text-sm">
                          @{accolade.player.discordUsername}
                        </span>
                      )}
                    </div>
                    <div 
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-semibold text-white mb-2"
                      style={{ backgroundColor: accolade.color }}
                    >
                      {accolade.icon && <span>{accolade.icon}</span>}
                      <span>{accolade.title}</span>
                    </div>
                    {accolade.description && (
                      <p className="text-gray-400 text-sm">{accolade.description}</p>
                    )}
                    <div className="text-xs text-gray-500 mt-2">
                      {accolade.season?.name || 'Lifetime Achievement'} • {new Date(accolade.awardedDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteAccolade(accolade.id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                  title="Delete accolade"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
