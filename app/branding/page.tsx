'use client';

import { Users, Shield, Award } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

type ConferenceFilter = 'all' | 'Western' | 'Eastern';

export default function BrandingPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [conferenceFilter, setConferenceFilter] = useState<ConferenceFilter>('all');
  const [selectedSeasons, setSelectedSeasons] = useState<string[]>(['All-Time']);
  const [availableSeasons, setAvailableSeasons] = useState<string[]>(['All-Time']);
  const [showSeasonDropdown, setShowSeasonDropdown] = useState(false);

  useEffect(() => {
    fetchTeams();
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const res = await fetch('/api/seasons');
      if (res.ok) {
        const seasons = await res.json();
        const seasonNames = seasons.map((s: any) => s.name);
        
        // Always include All-Time
        if (!seasonNames.includes('All-Time')) {
          seasonNames.push('All-Time');
        }
        
        setAvailableSeasons(seasonNames);
        
        // Set current season as default
        const currentSeason = seasons.find((s: any) => s.isCurrent);
        if (currentSeason) {
          setSelectedSeasons([currentSeason.name]);
        }
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
    }
  };

  const toggleSeason = (season: string) => {
    setSelectedSeasons(prev => {
      if (prev.includes(season)) {
        // Don't allow deselecting if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== season);
      } else {
        return [...prev, season];
      }
    });
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSeasonDropdown && !target.closest('.season-dropdown')) {
        setShowSeasonDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSeasonDropdown]);

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      setTeams(data);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter teams by conference
  const filteredTeams = teams.filter(team => {
    if (conferenceFilter === 'all') return true;
    return team.conference === conferenceFilter;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center text-gray-600 dark:text-gray-400">Loading teams...</div>
      </div>
    );
  }
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">Branding</h1>
        <p className="text-gray-600 dark:text-gray-400">Meet the teams and leadership of the Minecraft Basketball Association</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Conference Filter */}
        <div className="flex space-x-2">
          <button
            onClick={() => setConferenceFilter('all')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              conferenceFilter === 'all'
                ? 'bg-mba-blue text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'
            }`}
          >
            All Teams
          </button>
          <button
            onClick={() => setConferenceFilter('Western')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              conferenceFilter === 'Western'
                ? 'bg-mba-red text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-gray-700 border border-red-300 dark:border-gray-600'
            }`}
          >
            Western Conference
          </button>
          <button
            onClick={() => setConferenceFilter('Eastern')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              conferenceFilter === 'Eastern'
                ? 'bg-mba-blue text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700 border border-blue-300 dark:border-gray-600'
            }`}
          >
            Eastern Conference
          </button>
        </div>

        {/* Season Multi-Selector */}
        <div className="season-dropdown">
          <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Seasons:</label>
          <div className="relative">
            <button
              onClick={() => setShowSeasonDropdown(!showSeasonDropdown)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-mba-blue min-w-[200px] text-left flex items-center justify-between"
            >
              <span className="truncate">
                {selectedSeasons.length === 1 ? selectedSeasons[0] : `${selectedSeasons.length} seasons selected`}
              </span>
              <span className="ml-2">▼</span>
            </button>
            {showSeasonDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {availableSeasons.map(season => (
                  <label
                    key={season}
                    className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSeasons.includes(season)}
                      onChange={() => toggleSeason(season)}
                      className="mr-3 w-4 h-4 text-mba-blue bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-mba-blue"
                    />
                    <span className="text-gray-900 dark:text-white">{season}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredTeams.map((team) => (
          <Link
            key={team.id}
            href={`/teams/${team.id}`}
            className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-mba-blue dark:hover:border-mba-blue transition-colors shadow-sm cursor-pointer"
          >
            {/* Team Header */}
            <div className="flex items-center space-x-4 mb-6">
              <div
                className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold overflow-hidden"
                style={{
                  backgroundColor: team.colors.primary,
                  color: team.colors.secondary,
                }}
              >
                {team.logo ? (
                  <Image
                    src={team.logo}
                    alt={team.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                ) : (
                  team.name.charAt(0)
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{team.name}</h2>
                <div className="flex items-center space-x-2 mt-1">
                  {/* Conference Badge */}
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${
                    team.conference === 'Eastern' ? 'bg-mba-blue' : 'bg-mba-red'
                  }`}>
                    {team.conference} Conference
                  </span>
                  {/* Team Colors */}
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: team.colors.primary }}
                    />
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: team.colors.secondary }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Team Leadership */}
            <div className="space-y-4">
              {/* Owner */}
              {team.owner && (
                <div className="flex items-start space-x-3">
                  <Shield className="w-5 h-5 text-mba-blue mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Franchise Owner</div>
                    <div className="font-medium text-gray-900 dark:text-white">{team.owner}</div>
                  </div>
                </div>
              )}

              {/* General Manager */}
              {team.generalManager && (
                <div className="flex items-start space-x-3">
                  <Award className="w-5 h-5 text-mba-blue mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">General Manager</div>
                    <div className="font-medium text-gray-900 dark:text-white">{team.generalManager}</div>
                  </div>
                </div>
              )}

              {/* Head Coach */}
              {team.headCoach && (
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-mba-blue mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Head Coach</div>
                    <div className="font-medium text-gray-900 dark:text-white">{team.headCoach}</div>
                  </div>
                </div>
              )}

              {/* Assistant Coaches */}
              {team.assistantCoaches.length > 0 && (
                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-mba-blue mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Assistant Coaches</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {team.assistantCoaches.join(', ')}
                    </div>
                  </div>
                </div>
              )}

              {/* Seasons */}
              {team.seasons && team.seasons.length > 0 && (
                <div className="flex items-start space-x-3">
                  <Award className="w-5 h-5 text-mba-blue mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Seasons</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {team.seasons.join(', ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* Add Team Button (for admins) */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          More teams coming soon! Stay tuned for updates.
        </p>
      </div>
    </div>
  );
}

