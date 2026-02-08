'use client';

import { useState } from 'react';
import { Shield, UserPlus, Users, Calendar, FileText, LogOut, TrendingUp, Award, Settings, Tv, Send } from 'lucide-react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { PlayersAdmin, TeamsAdmin, GamesAdmin, ArticlesAdmin, GameStatsAdmin, AccoladesAdmin, LiveStreamAdmin, ContractOffersAdmin } from '@/components/admin';
import SeasonsAdmin from '@/components/admin/SeasonsAdmin';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<'players' | 'teams' | 'games' | 'articles' | 'gamestats' | 'accolades' | 'seasons' | 'livestream' | 'contracts'>('players');

  // Show loading state while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-mba-blue animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated OR not a Discord admin
  if (!session || !session.user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-mba-light to-gray-100 dark:from-mba-dark dark:to-gray-900">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 text-center shadow-xl">
            <Shield className="w-20 h-20 mx-auto mb-6 text-mba-blue" />
            <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Admin Access Required</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              {session && !session.user.isAdmin ? 'You do not have admin access. Please sign in with an authorized Discord account.' : 'Sign in with Discord to access the admin dashboard'}
            </p>
            <button
              onClick={() => signIn('discord')}
              className="w-full px-6 py-4 bg-[#5865F2] hover:bg-[#4752C4] rounded-lg font-medium transition-colors flex items-center justify-center space-x-3 text-white"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Sign in with Discord</span>
            </button>
            <p className="text-sm text-gray-500 mt-6">
              Only authorized Discord users can access this area
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center text-gray-900 dark:text-white">
              <Shield className="w-10 h-10 mr-3 text-mba-blue" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Manage players, teams, games, and content</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500 dark:text-gray-400">Signed in as</div>
              <div className="font-medium text-gray-900 dark:text-white">{session.user.name}</div>
            </div>
            {session.user.image && (
              <img
                src={session.user.image}
                alt={session.user.name || 'User'}
                className="w-10 h-10 rounded-full"
              />
            )}
            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex space-x-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('players')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'players'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <UserPlus className="w-5 h-5" />
          <span>Players</span>
        </button>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'teams'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Teams</span>
        </button>
        <button
          onClick={() => setActiveTab('games')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'games'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Games</span>
        </button>
        <button
          onClick={() => setActiveTab('articles')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'articles'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <FileText className="w-5 h-5" />
          <span>Articles</span>
        </button>
        <button
          onClick={() => setActiveTab('gamestats')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'gamestats'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span>Game Stats</span>
        </button>
        <button
          onClick={() => setActiveTab('accolades')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'accolades'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Award className="w-5 h-5" />
          <span>Accolades</span>
        </button>
        <button
          onClick={() => setActiveTab('seasons')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'seasons'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Settings className="w-5 h-5" />
          <span>Seasons</span>
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'contracts'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Send className="w-5 h-5" />
          <span>Contracts</span>
        </button>
        <button
          onClick={() => setActiveTab('livestream')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            activeTab === 'livestream'
              ? 'bg-mba-blue text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Tv className="w-5 h-5" />
          <span>Live Stream</span>
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
        {activeTab === 'players' && <PlayersAdmin />}
        {activeTab === 'teams' && <TeamsAdmin />}
        {activeTab === 'games' && <GamesAdmin />}
        {activeTab === 'articles' && <ArticlesAdmin />}
        {activeTab === 'gamestats' && <GameStatsAdmin />}
        {activeTab === 'accolades' && <AccoladesAdmin />}
        {activeTab === 'seasons' && <SeasonsAdmin />}
        {activeTab === 'contracts' && <ContractOffersAdmin />}
        {activeTab === 'livestream' && <LiveStreamAdmin />}
      </div>
    </div>
  );
}

