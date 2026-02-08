'use client';

import React, { useState, useEffect } from 'react';
import { Send, Search, Users, DollarSign, Calendar, CheckCircle2, Clock, Edit2, Trash2, X } from 'lucide-react';

interface ContractOffer {
  id: number;
  playerId: string;
  teamId: string;
  franchiseOwnerId: string;
  contractPrice: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  player: {
    id: string;
    username: string;
    avatarUrl?: string;
    discordUsername?: string;
    coinWorth?: number;
  };
  team: {
    id: string;
    name: string;
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
  };
  franchiseOwner: {
    id: string;
    username: string;
    avatarUrl?: string;
    discordUsername?: string;
  };
}

export default function ContractOffersAdmin() {
  const [offers, setOffers] = useState<ContractOffer[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [franchiseOwners, setFranchiseOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<ContractOffer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [playerSearch, setPlayerSearch] = useState('');

  // Form state
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [contractPrice, setContractPrice] = useState<number>(1000);
  const [minContractPrice, setMinContractPrice] = useState<number>(1000);
  const [teamSalaryCap, setTeamSalaryCap] = useState<number>(19000);
  const [teamCurrentSpend, setTeamCurrentSpend] = useState<number>(0);

  useEffect(() => {
    fetchOffers();
    fetchPlayers();
    fetchTeams();
    fetchSeasons();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/contract-offers');
      const data = await response.json();
      // Ensure data is an array
      if (Array.isArray(data)) {
        setOffers(data);
      } else {
        console.error('Contract offers data is not an array:', data);
        setOffers([]);
      }
    } catch (error) {
      console.error('Failed to fetch contract offers:', error);
      setOffers([]);
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

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      setTeams(data);
      
      // Extract franchise owners from teams
      const owners: any[] = [];
      data.forEach((team: any) => {
        if (team.owner) {
          const ownerData = players.find(p => p.displayName === team.owner);
          if (ownerData && !owners.find(o => o.id === ownerData.id)) {
            owners.push({
              id: ownerData.id,
              name: team.owner,
              teamId: team.id,
              teamName: team.name,
            });
          }
        }
      });
      setFranchiseOwners(owners);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
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

  // Update franchise owners when players or teams change
  useEffect(() => {
    if (teams.length > 0 && players.length > 0) {
      const owners: any[] = [];
      teams.forEach((team: any) => {
        if (team.owner) {
          const ownerData = players.find((p: any) => p.displayName === team.owner);
          if (ownerData && !owners.find(o => o.id === ownerData.id)) {
            owners.push({
              id: ownerData.id,
              name: team.owner,
              teamId: team.id,
              teamName: team.name,
            });
          }
        }
      });
      setFranchiseOwners(owners);
    }
  }, [teams, players]);

  // Update minimum contract price and team when player is selected
  useEffect(() => {
    if (selectedPlayer) {
      const player = players.find(p => p.id === selectedPlayer);
      if (player) {
        const minPrice = player.coinWorth || 1000;
        setMinContractPrice(minPrice);
        if (contractPrice < minPrice) {
          setContractPrice(minPrice);
        }
      }
    }
  }, [selectedPlayer, players]);

  // Auto-select owner when team is selected
  useEffect(() => {
    if (selectedTeam) {
      const team = teams.find(t => t.id === selectedTeam);
      if (team && team.owner) {
        // Find the owner player ID from their display name
        const ownerPlayer = players.find(p => p.displayName === team.owner);
        if (ownerPlayer) {
          setSelectedOwner(ownerPlayer.id);
        }
      }
    }
  }, [selectedTeam, teams, players]);

  // Calculate team salary cap usage when team is selected
  useEffect(() => {
    if (selectedTeam && players.length > 0) {
      const team = teams.find(t => t.id === selectedTeam);
      if (team) {
        setTeamSalaryCap(team.salaryCap || 19000);
        // Calculate current team spend
        const teamPlayers = players.filter(p => p.teamId === selectedTeam);
        const currentSpend = teamPlayers.reduce((sum, p) => sum + (p.coinWorth || 0), 0);
        setTeamCurrentSpend(currentSpend);
      }
    }
  }, [selectedTeam, teams, players]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate salary cap
    const availableCap = teamSalaryCap - teamCurrentSpend;
    if (contractPrice > availableCap) {
      alert(`Contract exceeds team salary cap! Available: ${availableCap.toLocaleString()} coins (Team Cap: ${teamSalaryCap.toLocaleString()}, Current Spend: ${teamCurrentSpend.toLocaleString()})`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/contract-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer,
          teamId: selectedTeam,
          franchiseOwnerId: selectedOwner,
          seasonId: selectedSeason ? parseInt(selectedSeason) : null,
          contractPrice: contractPrice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create offer');
      }

      alert('Contract offer created successfully!');
      setShowCreateForm(false);
      resetForm();
      fetchOffers();
    } catch (error: any) {
      alert(error.message || 'Failed to create contract offer');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedPlayer('');
    setSelectedTeam('');
    setSelectedOwner('');
    setSelectedSeason('');
    setContractPrice(1000);
    setMinContractPrice(1000);
    setPlayerSearch('');
    setTeamSalaryCap(19000);
    setTeamCurrentSpend(0);
    setEditingOffer(null);
    // Re-select current season
    const currentSeason = seasons.find((s: any) => s.isCurrent);
    if (currentSeason) {
      setSelectedSeason(currentSeason.id.toString());
    }
  };

  const handleEditOffer = (offer: ContractOffer) => {
    setEditingOffer(offer);
    setContractPrice(offer.contractPrice);
    setShowEditForm(true);
  };

  const handleUpdateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/contract-offers/${editingOffer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractPrice: contractPrice,
          status: editingOffer.status,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update offer');
      }

      alert('Contract offer updated successfully!');
      setShowEditForm(false);
      resetForm();
      fetchOffers();
    } catch (error: any) {
      alert(error.message || 'Failed to update contract offer');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offerId: number) => {
    if (!confirm('Are you sure you want to delete this contract offer?')) {
      return;
    }

    try {
      const response = await fetch(`/api/contract-offers/${offerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete offer');
      }

      alert('Contract offer deleted successfully!');
      fetchOffers();
    } catch (error: any) {
      alert(error.message || 'Failed to delete contract offer');
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const canAcceptOffer = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return diffHours >= 12;
  };

  const filteredOffers = offers.filter(offer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      offer.player.username.toLowerCase().includes(searchLower) ||
      offer.player.discordUsername?.toLowerCase().includes(searchLower) ||
      offer.team.name.toLowerCase().includes(searchLower) ||
      offer.franchiseOwner.username.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Contract Offers</h2>
          <p className="text-gray-400 mt-1">Manage contract offers from franchise owners to players</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all"
        >
          <Send className="w-4 h-4" />
          Send Offer
        </button>
      </div>

      {/* Create Offer Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Send Contract Offer</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            
            <form onSubmit={handleCreateOffer} className="p-6 space-y-4">
              {/* Player Selection with Search */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Player * {selectedPlayer && (
                    <span className="ml-2 text-blue-500 dark:text-cyan-400 font-bold">
                      ✓ {players.find(p => p.id === selectedPlayer)?.displayName}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Search players..."
                  value={playerSearch}
                  onChange={(e) => setPlayerSearch(e.target.value)}
                  className="w-full px-4 py-2 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  required
                  size={8}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white player-select"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#3b82f6 #e5e7eb'
                  }}
                >
                  <option value="" disabled>Select a player...</option>
                  {players
                    .filter(player => {
                      const search = playerSearch.toLowerCase();
                      return !search || 
                        player.displayName.toLowerCase().includes(search) ||
                        player.minecraftUsername.toLowerCase().includes(search) ||
                        player.discordUsername?.toLowerCase().includes(search);
                    })
                    .map(player => (
                      <option 
                        key={player.id} 
                        value={player.id}
                        className={selectedPlayer === player.id ? 'bg-blue-500 font-bold' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                      >
                        {player.displayName} {player.discordUsername ? `(@${player.discordUsername})` : ''} 
                        {player.coinWorth ? ` - ${player.coinWorth.toLocaleString()} coins` : ''}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {players.filter(p => {
                    const search = playerSearch.toLowerCase();
                    return !search || 
                      p.displayName.toLowerCase().includes(search) ||
                      p.minecraftUsername.toLowerCase().includes(search) ||
                      p.discordUsername?.toLowerCase().includes(search);
                  }).length} players shown
                </p>
                <style jsx>{`
                  .player-select option:checked {
                    background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%) !important;
                    font-weight: bold !important;
                  }
                `}</style>
              </div>

              {/* Season Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Season *
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => setSelectedSeason(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                >
                  <option value="">Select season...</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>
                      {season.name} {season.isCurrent ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Selection */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Team *
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                >
                  <option value="">Select team...</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} {team.owner ? `(${team.owner})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Cap Info */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Team Salary Cap
                </label>
                {selectedTeam && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Team Salary Cap:</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{teamSalaryCap.toLocaleString()} coins</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Current Spend:</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{teamCurrentSpend.toLocaleString()} coins</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-300 dark:border-gray-600">
                      <span className="text-gray-600 dark:text-gray-400">Available:</span>
                      <span className={`font-bold ${(teamSalaryCap - teamCurrentSpend) >= contractPrice ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {(teamSalaryCap - teamCurrentSpend).toLocaleString()} coins
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Contract Price */}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Contract Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <input
                    type="number"
                    value={contractPrice}
                    onChange={(e) => setContractPrice(parseInt(e.target.value) || minContractPrice)}
                    min={minContractPrice}
                    step="250"
                    required
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum: {minContractPrice.toLocaleString()} coins (player's current worth)
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-mba-blue hover:bg-blue-600 text-white py-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {loading ? 'Sending Offer...' : 'Send Contract Offer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    resetForm();
                  }}
                  className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all font-medium"
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
          placeholder="Search by player, team, or owner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 rounded-lg border border-slate-700">
            <Send className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No contract offers found</p>
          </div>
        ) : (
          filteredOffers.map(offer => (
            <div
              key={offer.id}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-lg p-6 border border-slate-700 hover:border-cyan-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Player Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                    {offer.player.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {offer.player.username}
                    </h3>
                    {offer.player.discordUsername && (
                      <p className="text-sm text-gray-400">@{offer.player.discordUsername}</p>
                    )}
                  </div>
                </div>

                {/* Team & Owner Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: offer.team.primaryColor }}
                    />
                    <span className="text-white font-medium">{offer.team.name}</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Coach: {offer.franchiseOwner.username}
                  </p>
                </div>

                {/* Contract Price */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <span className="text-2xl font-bold text-green-400">
                      {offer.contractPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">coins</p>
                </div>

                {/* Time & Status */}
                <div className="text-right min-w-[140px]">
                  <div className="flex items-center gap-2 justify-end mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">{getTimeAgo(offer.createdAt)}</span>
                  </div>
                  {offer.status === 'pending' && (
                    canAcceptOffer(offer.createdAt) ? (
                      <div className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Can Accept</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Waiting Period</span>
                      </div>
                    )
                  )}
                  {offer.status === 'accepted' && (
                    <div className="text-green-400 text-sm font-medium">✓ Accepted</div>
                  )}
                  {offer.status === 'rejected' && (
                    <div className="text-red-400 text-sm font-medium">✗ Rejected</div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditOffer(offer)}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                    title="Edit offer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Delete offer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Offer Modal */}
      {showEditForm && editingOffer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 max-w-md w-full border border-cyan-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Edit Contract Offer</h3>
              <button
                onClick={() => {
                  setShowEditForm(false);
                  resetForm();
                }}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleUpdateOffer} className="space-y-4">
              {/* Player Info (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Player</label>
                <div className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-400">
                  {editingOffer.player.username}
                </div>
              </div>

              {/* Team Info (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Team</label>
                <div className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-gray-400">
                  {editingOffer.team.name}
                </div>
              </div>

              {/* Contract Price */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Contract Price *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={contractPrice}
                    onChange={(e) => setContractPrice(parseInt(e.target.value) || 0)}
                    min={editingOffer.player.coinWorth || 1000}
                    step="100"
                    required
                    className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum: {(editingOffer.player.coinWorth || 1000).toLocaleString()} coins
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Status</label>
                <select
                  value={editingOffer.status}
                  onChange={(e) => setEditingOffer({ ...editingOffer, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
