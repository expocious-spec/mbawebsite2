'use client';

import React, { useState, useEffect } from 'react';
import { Send, Search, Users, DollarSign, Calendar, CheckCircle2, Clock, Edit2, Trash2, X, Plus } from 'lucide-react';
import Image from 'next/image';
import { getMinecraftHeadshot } from '@/lib/minecraft';

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
    minecraftUserId?: string;
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
  const [teamSearch, setTeamSearch] = useState('');
  const [seasonSearch, setSeasonSearch] = useState('');

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
        // Find the owner player ID - try multiple matching strategies
        const ownerName = team.owner.toLowerCase();
        const ownerPlayer = players.find(p => 
          p.displayName?.toLowerCase() === ownerName ||
          p.username?.toLowerCase() === ownerName ||
          p.minecraftUsername?.toLowerCase() === ownerName ||
          p.discordUsername?.toLowerCase() === ownerName
        );
        if (ownerPlayer) {
          setSelectedOwner(ownerPlayer.id);
        } else {
          // Clear owner selection if not found
          setSelectedOwner('');
          console.warn(`Could not find owner player for team ${team.name} with owner name: ${team.owner}`);
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

  // Clear team selection when season changes
  useEffect(() => {
    if (selectedSeason && selectedTeam) {
      // Check if selected team is still valid for this season
      const selectedSeasonObj = seasons.find(s => s.id.toString() === selectedSeason);
      const selectedTeamObj = teams.find(t => t.id === selectedTeam);
      
      if (selectedSeasonObj && selectedTeamObj) {
        const isTeamInSeason = selectedTeamObj.seasons?.includes(selectedSeasonObj.name);
        if (!isTeamInSeason) {
          setSelectedTeam('');
          setSelectedOwner('');
        }
      }
    }
  }, [selectedSeason, selectedTeam, seasons, teams]);

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!selectedPlayer) {
      alert('Please select a player by clicking on a player in the search results.');
      return;
    }

    if (!selectedTeam) {
      alert('Please select a team by clicking on a team in the search results.');
      return;
    }

    if (!selectedOwner) {
      alert('Please select a franchise owner from the dropdown menu.');
      return;
    }

    if (!selectedSeason) {
      alert('Please select a season.');
      return;
    }

    if (!contractPrice || contractPrice < minContractPrice) {
      alert(`Contract price must be at least ${minContractPrice.toLocaleString()} coins.`);
      return;
    }

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
    setTeamSearch('');
    setSeasonSearch('');
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

    // Validate contract price
    const minPrice = editingOffer.player.coinWorth || 1000;
    if (!contractPrice || contractPrice < minPrice) {
      alert(`Contract price must be at least ${minPrice.toLocaleString()} coins.`);
      return;
    }

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contract Offers</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage contract offers from franchise owners to players</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showCreateForm ? 'Cancel' : 'Send Offer'}</span>
        </button>
      </div>

      {/* Create Offer Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateOffer} className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Selection with Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Player * {selectedPlayer && <span className="text-green-600 font-semibold">✓ Selected</span>}
                {!selectedPlayer && <span className="text-red-600 text-xs ml-2">(Click a player below to select)</span>}
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
                {(() => {
                  const filteredPlayers = players.filter(player => {
                    const search = playerSearch.toLowerCase();
                    return !search || 
                      player.displayName.toLowerCase().includes(search) ||
                      player.minecraftUsername.toLowerCase().includes(search) ||
                      player.discordUsername?.toLowerCase().includes(search);
                  });

                  if (filteredPlayers.length === 0) {
                    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No players found</div>;
                  }

                  return filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayer(player.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                        selectedPlayer === player.id
                          ? 'bg-mba-blue text-white hover:bg-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="font-medium">{player.displayName}</div>
                      <div className={`text-sm ${
                        selectedPlayer === player.id
                          ? 'text-blue-100'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        @{player.minecraftUsername} • {player.coinWorth ? `${player.coinWorth.toLocaleString()} coins` : 'No worth'}
                      </div>
                    </button>
                  ));
                })()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {players.filter(p => {
                  const search = playerSearch.toLowerCase();
                  return !search || 
                    p.displayName.toLowerCase().includes(search) ||
                    p.minecraftUsername.toLowerCase().includes(search) ||
                    p.discordUsername?.toLowerCase().includes(search);
                }).length} player{players.filter(p => {
                  const search = playerSearch.toLowerCase();
                  return !search || 
                    p.displayName.toLowerCase().includes(search) ||
                    p.minecraftUsername.toLowerCase().includes(search) ||
                    p.discordUsername?.toLowerCase().includes(search);
                }).length !== 1 ? 's' : ''} found • Click to select
              </p>
            </div>

            {/* Team Selection with Search */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team * {selectedTeam && <span className="text-green-600 font-semibold">✓ Selected</span>}
                {!selectedTeam && <span className="text-red-600 text-xs ml-2">(Click a team below)</span>}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                {(() => {
                  // Get selected season name
                  const selectedSeasonObj = seasons.find(s => s.id.toString() === selectedSeason);
                  const selectedSeasonName = selectedSeasonObj?.name;

                  let filteredTeams = teams.filter(team => {
                    // Filter by search term
                    const search = teamSearch.toLowerCase();
                    const matchesSearch = !search || 
                      team.name.toLowerCase().includes(search) ||
                      team.owner?.toLowerCase().includes(search);
                    
                    // Filter by selected season (only show teams assigned to this season)
                    const matchesSeason = !selectedSeasonName || 
                      (team.seasons && team.seasons.includes(selectedSeasonName));
                    
                    return matchesSearch && matchesSeason;
                  });

                  if (!selectedSeason) {
                    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">Select a season first</div>;
                  }

                  if (filteredTeams.length === 0) {
                    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No teams found for this season</div>;
                  }

                  return filteredTeams.map((team) => (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedTeam(team.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                        selectedTeam === team.id
                          ? 'bg-mba-blue text-white hover:bg-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="font-medium">{team.name}</div>
                      {team.owner && (
                        <div className={`text-sm ${
                          selectedTeam === team.id
                            ? 'text-blue-100'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          Owner: {team.owner}
                        </div>
                      )}
                    </button>
                  ));
                })()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {(() => {
                  const selectedSeasonObj = seasons.find(s => s.id.toString() === selectedSeason);
                  const selectedSeasonName = selectedSeasonObj?.name;
                  const count = teams.filter(t => {
                    const search = teamSearch.toLowerCase();
                    const matchesSearch = !search || 
                      t.name.toLowerCase().includes(search) ||
                      t.owner?.toLowerCase().includes(search);
                    const matchesSeason = !selectedSeasonName || 
                      (t.seasons && t.seasons.includes(selectedSeasonName));
                    return matchesSearch && matchesSeason;
                  }).length;
                  return `${count} team${count !== 1 ? 's' : ''} found${selectedSeasonName ? ` in ${selectedSeasonName}` : ''}`;
                })()}
              </p>
            </div>

            {/* Season Selection with Search */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Season * {selectedSeason && <span className="text-green-600 font-semibold">✓ Selected</span>}
                {!selectedSeason && <span className="text-red-600 text-xs ml-2">(Click a season below)</span>}
              </label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search seasons..."
                  value={seasonSearch}
                  onChange={(e) => setSeasonSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                {(() => {
                  const filteredSeasons = seasons.filter(season => {
                    const search = seasonSearch.toLowerCase();
                    return !search || season.name.toLowerCase().includes(search);
                  });

                  if (filteredSeasons.length === 0) {
                    return <div className="p-4 text-center text-gray-500 dark:text-gray-400">No seasons found</div>;
                  }

                  return filteredSeasons.map((season) => (
                    <button
                      key={season.id}
                      type="button"
                      onClick={() => setSelectedSeason(season.id.toString())}
                      className={`w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                        selectedSeason === season.id.toString()
                          ? 'bg-mba-blue text-white hover:bg-blue-600'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                      }`}
                    >
                      <div className="font-medium">
                        {season.name}
                        {season.isCurrent && (
                          <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                            selectedSeason === season.id.toString()
                              ? 'bg-green-500 text-white'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            Current
                          </span>
                        )}
                      </div>
                    </button>
                  ));
                })()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {seasons.filter(s => {
                  const search = seasonSearch.toLowerCase();
                  return !search || s.name.toLowerCase().includes(search);
                }).length} season{seasons.filter(s => {
                  const search = seasonSearch.toLowerCase();
                  return !search || s.name.toLowerCase().includes(search);
                }).length !== 1 ? 's' : ''} found
              </p>
            </div>

            {/* Franchise Owner Selection - Manual Override */}
            {selectedTeam && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Franchise Owner * {selectedOwner && <span className="text-green-600 font-semibold">✓ Auto-selected</span>}
                  {!selectedOwner && <span className="text-amber-600 text-xs ml-2">(Auto-select failed - please select manually)</span>}
                </label>
                <select
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Select franchise owner...</option>
                  {players.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.displayName} (@{player.minecraftUsername})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This should match the team owner. If not auto-selected correctly, choose manually.
                </p>
              </div>
            )}

            {/* Salary Cap Info */}
            {selectedTeam && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Team Salary Cap
                </label>
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
              </div>
            )}

            {/* Contract Price */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                Minimum: {minContractPrice.toLocaleString()} coins (player's current worth) • Increment by 250
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending Offer...' : 'Send Contract Offer'}
          </button>
        </form>
      )}

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by player, team, or owner..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-mba-blue"
        />
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {filteredOffers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Send className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No contract offers found</p>
          </div>
        ) : (
          filteredOffers.map(offer => (
            <div
              key={offer.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-mba-blue dark:hover:border-mba-blue transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Player Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    <Image
                      src={getMinecraftHeadshot(offer.player.minecraftUserId, 128)}
                      alt={offer.player.username}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {offer.player.username}
                    </h3>
                    {offer.player.discordUsername && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">@{offer.player.discordUsername}</p>
                    )}
                  </div>
                </div>

                {/* Team & Owner Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {offer.team.logo ? (
                        <Image
                          src={offer.team.logo}
                          alt={offer.team.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: offer.team.primaryColor }}
                        >
                          {offer.team.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-gray-900 dark:text-white font-medium">{offer.team.name}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Coach: {offer.franchiseOwner.username}
                  </p>
                </div>

                {/* Contract Price */}
                <div className="text-right">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {offer.contractPrice.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">coins</p>
                </div>

                {/* Time & Status */}
                <div className="text-right min-w-[140px]">
                  <div className="flex items-center gap-2 justify-end mb-2">
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{getTimeAgo(offer.createdAt)}</span>
                  </div>
                  {offer.status === 'pending' && (
                    canAcceptOffer(offer.createdAt) ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Can Accept</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-sm">
                        <Clock className="w-4 h-4" />
                        <span>Waiting Period</span>
                      </div>
                    )
                  )}
                  {offer.status === 'accepted' && (
                    <div className="text-green-600 dark:text-green-400 text-sm font-medium">✓ Accepted</div>
                  )}
                  {offer.status === 'rejected' && (
                    <div className="text-red-600 dark:text-red-400 text-sm font-medium">✗ Rejected</div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditOffer(offer)}
                    className="p-2 bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                    title="Edit offer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteOffer(offer.id)}
                    className="p-2 bg-red-100 dark:bg-red-500/20 hover:bg-red-200 dark:hover:bg-red-500/30 text-red-600 dark:text-red-400 rounded-lg transition-colors"
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
