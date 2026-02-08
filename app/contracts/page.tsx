'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle2, Clock, Search, FileText } from 'lucide-react';
import Link from 'next/link';
import { getMinecraftHeadshot } from '@/lib/minecraft';
import Image from 'next/image';

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

export default function ContractsPage() {
  const [offers, setOffers] = useState<ContractOffer[]>([]);
  const [filteredOffers, setFilteredOffers] = useState<ContractOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchOffers();
  }, []);

  useEffect(() => {
    filterOffers();
  }, [offers, searchTerm, statusFilter]);

  const fetchOffers = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const filterOffers = () => {
    let filtered = [...offers];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(offer => offer.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.player?.username?.toLowerCase().includes(searchLower) ||
        offer.player?.discordUsername?.toLowerCase().includes(searchLower) ||
        offer.team?.name?.toLowerCase().includes(searchLower) ||
        offer.franchiseOwner?.username?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredOffers(filtered);
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

  const getTimeRemaining = (createdAt: string) => {
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours >= 12) {
      return null; // Can accept now
    }
    
    const remainingMs = (12 * 60 * 60 * 1000) - diffMs;
    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${remainingHours}h ${remainingMinutes}m`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Contract Offers
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all contract offers from franchise owners to players
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by player, team, or coach..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-mba-blue dark:focus:border-mba-blue"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-mba-blue dark:focus:border-mba-blue"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mba-blue mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading contract offers...</p>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Contract Offers Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'No contract offers have been sent yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-cyan-500/30 dark:hover:border-cyan-500/30 transition-all shadow-sm"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                {/* Player Info */}
                <Link 
                  href={`/players/${offer.player.id}`}
                  className="flex items-center gap-4 flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    <Image
                      src={getMinecraftHeadshot(offer.player.minecraftUserId, 128)}
                      alt={offer.player.username}
                      width={56}
                      height={56}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {offer.player.username}
                    </h3>
                    {offer.player.discordUsername && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        @{offer.player.discordUsername}
                      </p>
                    )}
                    {offer.player.coinWorth && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Current Worth: {offer.player.coinWorth.toLocaleString()} coins
                      </p>
                    )}
                  </div>
                </Link>

                {/* Arrow */}
                <div className="hidden lg:block text-gray-400">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>

                {/* Team & Coach Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                    {offer.team.logo ? (
                      <Image
                        src={offer.team.logo}
                        alt={offer.team.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-white font-bold text-xl"
                        style={{ backgroundColor: offer.team.primaryColor }}
                      >
                        {offer.team.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {offer.team.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Coach: {offer.franchiseOwner.username}
                    </p>
                  </div>
                </div>

                {/* Contract Details */}
                <div className="flex flex-col sm:flex-row items-center gap-4 lg:gap-6">
                  {/* Contract Price */}
                  <div className="text-center">
                    <div className="flex items-center gap-2 justify-center mb-1">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <span className="text-2xl font-bold text-green-500">
                        {offer.contractPrice.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">coins</p>
                  </div>

                  {/* Time & Status */}
                  <div className="text-center min-w-[140px]">
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getTimeAgo(offer.createdAt)}
                      </span>
                    </div>
                    {offer.status === 'pending' && (
                      canAcceptOffer(offer.createdAt) ? (
                        <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Eligible</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 text-yellow-500 text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            <span>Wait Period</span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {getTimeRemaining(offer.createdAt)} left
                          </span>
                        </div>
                      )
                    )}
                    {offer.status === 'accepted' && (
                      <div className="text-green-500 text-sm font-medium">✓ Accepted</div>
                    )}
                    {offer.status === 'rejected' && (
                      <div className="text-red-500 text-sm font-medium">✗ Rejected</div>
                    )}
                    {offer.status === 'expired' && (
                      <div className="text-gray-500 text-sm font-medium">Expired</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
