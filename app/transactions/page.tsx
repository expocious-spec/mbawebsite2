'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, Calendar, CheckCircle2, Clock, Search, FileText, TrendingUp, TrendingDown, UserCog } from 'lucide-react';
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

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, searchTerm, typeFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/transactions');
      const data = await response.json();
      if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        console.error('Transactions data is not an array:', data);
        setTransactions([]);
      }
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

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.type === 'contract') {
      return <DollarSign className="w-6 h-6 text-green-500" />;
    } else if (transaction.type === 'role_assignment') {
      if (transaction.title === 'Promotion') {
        return <TrendingUp className="w-6 h-6 text-blue-500" />;
      } else if (transaction.title === 'Demotion') {
        return <TrendingDown className="w-6 h-6 text-orange-500" />;
      }
      return <UserCog className="w-6 h-6 text-purple-500" />;
    }
    return <FileText className="w-6 h-6 text-gray-500" />;
  };

  const getTransactionBadge = (transaction: Transaction) => {
    if (transaction.type === 'contract') {
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Contract</span>;
    } else if (transaction.type === 'role_assignment') {
      if (transaction.title === 'Promotion') {
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Promotion</span>;
      } else if (transaction.title === 'Demotion') {
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">Demotion</span>;
      }
      return <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">Role Change</span>;
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="trade">Trades</option>
              <option value="release">Releases</option>
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
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="text-lg font-bold text-green-500">
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

                {/* Time */}
                <div className="text-center min-w-[100px]">
                  <div className="flex items-center gap-2 justify-center">
                    <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {getTimeAgo(transaction.createdAt)}
                    </span>
                  </div>
                  {transaction.status === 'completed' && (
                    <div className="flex items-center gap-1 text-green-500 text-xs font-medium mt-1 justify-center">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
