'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle2, Clock, Search, FileText, TrendingUp, TrendingDown, UserCog, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getMinecraftHeadshot } from '@/lib/minecraft';
import Image from 'next/image';

interface Transaction {
  id: string;
  type: 'contract' | 'role_assignment' | 'trade' | 'release';
  playerId: string;
  teamId: string;
  fromUserId?: string;
  title: string;
  description?: string;
  contractOfferId?: number;
  contractPrice?: number;
  role?: string;
  previousRole?: string;
  status: 'pending' | 'completed' | 'rejected' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  seasonId?: string;
  player: {
    id: string;
    username: string;
    minecraftUsername?: string;
    minecraftUserId?: string;
    discordUsername?: string;
    avatarUrl?: string;
    coinWorth?: number;
  } | null;
  team: {
    id: string;
    name: string;
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
  } | null;
  fromUser?: {
    id: string;
    username: string;
    discordUsername?: string;
    avatarUrl?: string;
  } | null;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [seasons, setSeasons] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchSeasons();
    checkAdminStatus();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, typeFilter, seasonFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Fetch both contract offers and transactions
      const [contractsResponse, transactionsResponse] = await Promise.all([
        fetch('/api/contract-offers'),
        fetch('/api/transactions')
      ]);
      
      const contractOffers = await contractsResponse.json();
      const roleTransactions = await transactionsResponse.json();
      
      // Transform contract offers into transaction format
      const contractTransactions: Transaction[] = Array.isArray(contractOffers) 
        ? contractOffers.map((offer: any) => ({
            id: `contract-${offer.id}`,
            type: 'contract' as const,
            playerId: offer.playerId,
            teamId: offer.teamId,
            fromUserId: offer.franchiseOwnerId,
            title: 'Contract Offer',
            description: `Contract offer of ${offer.contractPrice.toLocaleString()} coins`,
            contractOfferId: offer.id,
            contractPrice: offer.contractPrice,
            status: offer.status === 'accepted' ? 'completed' : (offer.status === 'expired' ? 'cancelled' : offer.status),
            createdAt: offer.createdAt,
            completedAt: offer.acceptedAt,
            seasonId: offer.seasonId,
            player: offer.player,
            team: offer.team,
            fromUser: offer.franchiseOwner
          }))
        : [];
      
      // Combine both arrays
      const allTransactions = [
        ...contractTransactions,
        ...(Array.isArray(roleTransactions) ? roleTransactions : [])
      ];
      
      // Sort by created date (newest first)
      allTransactions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setTransactions(allTransactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Apply season filter
    if (seasonFilter !== 'all') {
      filtered = filtered.filter(t => {
        // For contract offers, check seasonId
        if (t.type === 'contract' && 'seasonId' in t) {
          return (t as any).seasonId === seasonFilter;
        }
        // For other transactions, also check seasonId if available
        if ('seasonId' in t) {
          return (t as any).seasonId === seasonFilter;
        }
        return false;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.player?.username?.toLowerCase().includes(searchLower) ||
        t.player?.discordUsername?.toLowerCase().includes(searchLower) ||
        t.team?.name?.toLowerCase().includes(searchLower) ||
        t.fromUser?.username?.toLowerCase().includes(searchLower) ||
        t.description?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredTransactions(filtered);
  };

  const fetchSeasons = async () => {
    try {
      const response = await fetch('/api/seasons');
      const data = await response.json();
      setSeasons(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch seasons:', error);
      setSeasons([]);
    }
  };

  const checkAdminStatus = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const session = await response.json();
      setIsAdmin(session?.user?.isAdmin || false);
    } catch (error) {
      console.error('Failed to check admin status:', error);
      setIsAdmin(false);
    }
  };

  const handleDelete = async (transactionId: string, transactionType: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const response = await fetch(`/api/transactions?id=${transactionId}&type=${transactionType}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      // Remove from local state
      setTransactions(prev => prev.filter(t => t.id !== transactionId));
      
      alert('Transaction deleted successfully');
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      alert('Failed to delete transaction');
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

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'contract') {
      const colorClass = transaction.status === 'pending' 
        ? 'text-yellow-500' 
        : transaction.status === 'rejected' 
        ? 'text-red-500' 
        : 'text-green-500';
      return <DollarSign className={`w-6 h-6 ${colorClass}`} />;
    } else if (transaction.type === 'role_assignment') {
      if (transaction.title === 'Promotion') {
        return <TrendingUp className="w-6 h-6 text-blue-500" />;
      } else if (transaction.title === 'Demotion') {
        return <TrendingDown className="w-6 h-6 text-orange-500" />;
      }
      return <UserCog className="w-6 h-6 text-purple-500" />;
    } else if (transaction.type === 'sign') {
      return <CheckCircle2 className="w-6 h-6 text-green-500" />;
    } else if (transaction.type === 'release') {
      return <TrendingDown className="w-6 h-6 text-orange-500" />;
    } else if (transaction.type === 'trade') {
      return <TrendingUp className="w-6 h-6 text-blue-500" />;
    } else if (transaction.type === 'demand') {
      return <Clock className="w-6 h-6 text-red-500" />;
    }
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  const getTransactionBadge = (transaction: Transaction) => {
    if (transaction.type === 'contract') {
      const colors = transaction.status === 'pending' 
        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
        : transaction.status === 'rejected' 
        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      return <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors}`}>Contract</span>;
    } else if (transaction.type === 'role_assignment') {
      if (transaction.title === 'Promotion') {
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Promotion</span>;
      } else if (transaction.title === 'Demotion') {
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Demotion</span>;
      }
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Role Change</span>;
    } else if (transaction.type === 'sign') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Signed</span>;
    } else if (transaction.type === 'release') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Released</span>;
    } else if (transaction.type === 'trade') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Traded</span>;
    } else if (transaction.type === 'demand') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Demand</span>;
    }
    return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400">{transaction.type}</span>;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Transactions
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View all player transactions including contracts, promotions, and role changes
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by player, team, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-mba-blue dark:focus:border-mba-blue"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-mba-blue dark:focus:border-mba-blue"
            >
              <option value="all">All Types</option>
              <option value="contract">Contracts</option>
              <option value="role_assignment">Role Changes</option>
              <option value="sign">Signings</option>
              <option value="trade">Trades</option>
              <option value="release">Releases</option>
              <option value="demand">Demands</option>
            </select>
          </div>

          {/* Season Filter */}
          <div className="relative">
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-mba-blue dark:focus:border-mba-blue"
            >
              <option value="all">All Seasons</option>
              {seasons.map((season) => (
                <option key={season.id} value={season.id}>
                  {season.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-mba-blue mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading transactions...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 border border-gray-200 dark:border-gray-700 text-center shadow-sm">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchTerm || typeFilter !== 'all' 
              ? 'Try adjusting your filters'
              : 'No transactions have been recorded yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-cyan-500/30 dark:hover:border-cyan-500/30 transition-all shadow-sm"
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                {/* Transaction Icon & Badge */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    {getTransactionIcon(transaction)}
                  </div>
                  {getTransactionBadge(transaction)}
                </div>

                {/* Player Info */}
                {transaction.player && (
                  <Link 
                    href={`/players/${transaction.player.id}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      <Image
                        src={getMinecraftHeadshot(transaction.player.minecraftUserId, 128)}
                        alt={transaction.player.username}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {transaction.player.username}
                      </h3>
                      {transaction.player.discordUsername && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          @{transaction.player.discordUsername}
                        </p>
                      )}
                    </div>
                  </Link>
                )}

                {/* Transaction Description */}
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white font-medium">
                    {transaction.description || transaction.title}
                  </p>
                  {transaction.contractPrice && (
                    <div className="flex items-center gap-2 mt-1">
                      <DollarSign className={`w-4 h-4 ${
                        transaction.status === 'pending' 
                          ? 'text-yellow-500' 
                          : transaction.status === 'rejected' 
                          ? 'text-red-500' 
                          : 'text-green-500'
                      }`} />
                      <span className={`text-lg font-bold ${
                        transaction.status === 'pending' 
                          ? 'text-yellow-500' 
                          : transaction.status === 'rejected' 
                          ? 'text-red-500' 
                          : 'text-green-500'
                      }`}>
                        {transaction.contractPrice.toLocaleString()} coins
                      </span>
                    </div>
                  )}
                </div>

                {/* Team Info */}
                {transaction.team && (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      {transaction.team.logo ? (
                        <Image
                          src={transaction.team.logo}
                          alt={transaction.team.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: transaction.team.primaryColor }}
                        >
                          {transaction.team.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {transaction.team.name}
                    </span>
                  </div>
                )}

                {/* Time & Status */}
                <div className="text-center min-w-[140px]">
                  <div className="flex items-center gap-2 justify-center mb-2">
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getTimeAgo(transaction.createdAt)}
                    </span>
                  </div>
                  
                  {/* Contract-specific status indicators */}
                  {transaction.type === 'contract' && transaction.status === 'pending' && (
                    canAcceptOffer(transaction.createdAt) ? (
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
                          {getTimeRemaining(transaction.createdAt)} left
                        </span>
                      </div>
                    )
                  )}
                  {transaction.status === 'completed' && transaction.type === 'contract' && (
                    <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accepted</span>
                    </div>
                  )}
                  {transaction.status === 'rejected' && (
                    <div className="flex items-center gap-1 text-red-500 text-sm font-medium">
                      <span>✗ Rejected</span>
                    </div>
                  )}
                  {transaction.status === 'completed' && transaction.type !== 'contract' && (
                    <div className="flex items-center gap-1 text-green-500 text-xs font-medium justify-center">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>

                {/* Admin Delete Button */}
                {isAdmin && (
                  <button
                    onClick={() => handleDelete(transaction.id, transaction.type)}
                    className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
