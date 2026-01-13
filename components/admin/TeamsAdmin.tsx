'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Upload, X as XIcon } from 'lucide-react';
import { uploadImage } from '@/lib/supabase-storage';
import Image from 'next/image';

export default function TeamsAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#00A8E8');
  const [secondaryColor, setSecondaryColor] = useState('#0A0E27');
  const [owner, setOwner] = useState('');
  const [headCoach, setHeadCoach] = useState('');
  const [conference, setConference] = useState<'Western' | 'Eastern'>('Western');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Fetch teams on mount
  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveTeam = async () => {
    if (!teamName || !abbreviation) {
      alert('Please fill in team name and abbreviation');
      return;
    }

    setLoading(true);
    try {
      let logoUrl = editingTeam?.logo || '';
      
      // Upload logo if a new file was selected
      if (logoFile) {
        console.log('Uploading logo for team:', abbreviation);
        const uploadedUrl = await uploadImage(logoFile, 'team-logos', `team-${abbreviation.toLowerCase()}`);
        console.log('Upload result:', uploadedUrl);
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        } else {
          console.error('Upload failed - no URL returned');
        }
      }
      console.log('Final logo URL to save:', logoUrl);

      const method = editingTeam ? 'PUT' : 'POST';
      const response = await fetch('/api/teams', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingTeam && { id: editingTeam.id }),
          name: teamName,
          abbreviation,
          logo: logoUrl,
          primaryColor,
          secondaryColor,
          owner,
          headCoach,
          conference,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert(editingTeam ? 'Team updated successfully!' : 'Team created successfully!');
        await fetchTeams();
        resetForm();
      } else {
        const errorMsg = data.error || data.message || 'Unknown error';
        const details = data.details ? '\n\nDetails: ' + JSON.stringify(data.details) : '';
        alert('Error: ' + errorMsg + details);
      }
    } catch (error) {
      console.error('Failed to save team:', error);
      alert('Failed to save team');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure? This will affect all associated players and games.')) return;

    try {
      const response = await fetch(`/api/teams?id=${teamId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Team deleted successfully!');
        await fetchTeams();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to delete team:', error);
      alert('Failed to delete team');
    }
  };

  const resetForm = () => {
    setTeamName('');
    setAbbreviation('');
    setPrimaryColor('#00A8E8');
    setSecondaryColor('#0A0E27');
    setOwner('');
    setHeadCoach('');
    setConference('Western');
    setLogoFile(null);
    setLogoPreview('');
    setShowForm(false);
    setEditingTeam(null);
  };

  const openEditForm = (team: any) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setAbbreviation(team.abbreviation);
    setPrimaryColor(team.primaryColor || team.colors?.primary || '#00A8E8');
    setSecondaryColor(team.secondaryColor || team.colors?.secondary || '#0A0E27');
    setOwner(team.owner);
    setHeadCoach(team.headCoach);
    setConference(team.conference || 'Western');
    setLogoPreview(team.logo || '');
    setShowForm(true);
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Team Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create teams, assign owners and coaches, customize colors
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) resetForm();
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>New Team</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingTeam ? 'Edit Team' : 'Create New Team'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Logo Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Team Logo
              </label>
              <div className="flex items-center space-x-4">
                {logoPreview && (
                  <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-contain bg-gray-100 dark:bg-gray-800"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setLogoFile(null);
                        setLogoPreview('');
                      }}
                      className="absolute top-1 right-1 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <label className="cursor-pointer px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium text-gray-700 dark:text-gray-300 transition-colors flex items-center space-x-2">
                  <Upload className="w-4 h-4" />
                  <span>{logoPreview ? 'Change Logo' : 'Upload Logo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Team Name *
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Toronto Terror"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Abbreviation *
              </label>
              <input
                type="text"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value.toUpperCase())}
                placeholder="TOR"
                maxLength={3}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Primary Color
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer border-0 bg-transparent"
                  style={{ padding: 0 }}
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Secondary Color
              </label>
              <div className="flex space-x-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-16 h-10 rounded cursor-pointer border-0 bg-transparent"
                  style={{ padding: 0 }}
                />
                <input
                  type="text"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Owner
              </label>
              <input
                type="text"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="Owner name"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Head Coach
              </label>
              <input
                type="text"
                value={headCoach}
                onChange={(e) => setHeadCoach(e.target.value)}
                placeholder="Coach name"
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Conference *
              </label>
              <select
                value={conference}
                onChange={(e) => setConference(e.target.value as 'Western' | 'Eastern')}
                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
              >
                <option value="Western">Western Conference</option>
                <option value="Eastern">Eastern Conference</option>
              </select>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleSaveTeam}
              disabled={loading}
              className="px-6 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (editingTeam ? 'Update Team' : 'Create Team')}
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teams.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-gray-500 dark:text-gray-400">
            No teams yet. Create your first team!
          </div>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-mba-blue dark:hover:border-mba-blue transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: team.primaryColor }}
                  >
                    {team.abbreviation}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{team.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {team.players} players
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => openEditForm(team)}
                    className="p-2 text-mba-blue hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Owner:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{team.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Head Coach:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{team.headCoach}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Colors:</span>
                  <div className="flex space-x-2">
                    <div
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: team.primaryColor }}
                      title={team.primaryColor}
                    />
                    <div
                      className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                      style={{ backgroundColor: team.secondaryColor }}
                      title={team.secondaryColor}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

