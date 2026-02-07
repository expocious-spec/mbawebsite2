'use client';

import React, { useState, useEffect } from 'react';
import { Send, Search, Users, DollarSign, Calendar, CheckCircle2, Clock } from 'lucide-react';

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
  const [franchiseOwners, setFranchiseOwners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [selectedOwner, setSelectedOwner] = useState('');
  const [contractPrice, setContractPrice] = useState<number>(1000);
  const [minContractPrice, setMinContractPrice] = useState<number>(1000);

  useEffect(() => {
    fetchOffers();
    fetchPlayers();
    fetchTeams();
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

  // Auto-select team when owner is selected
  useEffect(() => {
    if (selectedOwner) {
      const owner = franchiseOwners.find(o => o.id === selectedOwner);
      if (owner) {
        setSelectedTeam(owner.teamId);
      }
    }
  }, [selectedOwner, franchiseOwners]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/contract-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayer,
          teamId: selectedTeam,
          franchiseOwnerId: selectedOwner,
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
    setContractPrice(1000);
    setMinContractPrice(1000);
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 max-w-2xl w-full border border-cyan-500/20">
            <h3 className="text-xl font-bold text-white mb-4">Send Contract Offer</h3>
            
            <form onSubmit={handleCreateOffer} className="space-y-4">
              {/* Player Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Player *
                </label>
                <select
                  value={selectedPlayer}
                  onChange={(e) => setSelectedPlayer(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select a player...</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>
                      {player.displayName} {player.discordUsername ? `(@${player.discordUsername})` : ''} 
                      {player.coinWorth ? ` - ${player.coinWorth} coins` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Franchise Owner Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Franchise Owner *
                </label>
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select franchise owner...</option>
                  {franchiseOwners.map(owner => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name} - {owner.teamName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Team (Auto-selected) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => setSelectedTeam(e.target.value)}
                  disabled
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-400 cursor-not-allowed"
                >
                  <option value="">Auto-selected from owner</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
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
                    onChange={(e) => setContractPrice(parseInt(e.target.value) || minContractPrice)}
                    min={minContractPrice}
                    step="100"
                    required
                    className="w-full pl-10 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Minimum: {minContractPrice} coins (player's current worth)
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-2 rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Send Offer'}
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
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
