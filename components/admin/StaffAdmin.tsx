'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Users, Pencil, Save, X } from 'lucide-react';

interface StaffMember {
  id: string;
  player_id: string;
  role: string;
  created_at: string;
}

interface Player {
  id: string;
  displayName: string;
  minecraftUsername: string;
  minecraftUserId: number;
  profilePicture: string;
}

const ALL_ROLES = [
  // Commissioners & Executives
  'Commissioner',
  'Executive',
  'Director',
  'Chief Operating Officer',
  // Game Hosts & Streamers
  'Game Host',
  'Streamer',
  'Game Official',
  // GFX Designers & Asset Designers
  'Asset Designer',
  'GFX Designer',
  // League Staff
  'League Staff',
  'League Op. Coordinator',
  'Analytics Dept. Lead'
];

export default function StaffAdmin() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [staffRes, playersRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/players')
      ]);

      const staffData = await staffRes.json();
      const playersData = await playersRes.json();

      setStaff(staffData);
      setPlayers(playersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlayerId || !selectedRole) {
      alert('Please select a player and role');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          role: selectedRole
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Staff member added successfully!');
        setShowForm(false);
        setSelectedPlayerId('');
        setSelectedRole('');
        fetchData();
      } else {
        alert('Failed to add staff member');
      }
    } catch (error) {
      console.error('Error adding staff:', error);
      alert('Failed to add staff member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/staff?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Staff member removed successfully!');
        fetchData();
      } else {
        alert('Failed to remove staff member');
      }
    } catch (error) {
      console.error('Error removing staff:', error);
      alert('Failed to remove staff member');
    }
  };

  const handleEditStaff = (member: StaffMember) => {
    setEditingId(member.id);
    setEditingRole(member.role);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRole('');
  };

  const handleUpdateStaff = async (id: string) => {
    if (!editingRole) {
      alert('Please select a role');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          role: editingRole
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Staff member updated successfully!');
        setEditingId(null);
        setEditingRole('');
        fetchData();
      } else {
        alert('Failed to update staff member');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      alert('Failed to update staff member');
    } finally {
      setLoading(false);
    }
  };

  const getPlayerById = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  const filteredPlayers = players.filter(player => {
    if (!searchQuery) return true;
    const nameMatch = player.displayName?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false;
    const idMatch = player.minecraftUserId?.toString()?.includes(searchQuery) ?? false;
    return nameMatch || idMatch;
  });

  const groupedStaff = staff.reduce((acc: any, member) => {
    if (!acc[member.role]) {
      acc[member.role] = [];
    }
    acc[member.role].push(member);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <Users className="mr-2" />
          Staff Management
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Staff Member
        </button>
      </div>

      {/* Add Staff Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Add Staff Member
          </h3>
          <form onSubmit={handleAddStaff} className="space-y-4">
            {/* Player Search */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Search Player
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Player Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Select Player
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                {filteredPlayers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    {players.length === 0 ? 'Loading players...' : 'No players found'}
                  </div>
                ) : (
                  filteredPlayers.map(player => (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        selectedPlayerId === player.id ? 'bg-blue-50 dark:bg-blue-900' : ''
                      }`}
                    >
                      {player.profilePicture ? (
                        <img
                          src={player.profilePicture}
                          alt={player.displayName || 'Player'}
                          className="w-10 h-10 rounded-full mr-3 object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full mr-3 bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                          {player.displayName?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-gray-900 dark:text-white font-medium">{player.displayName || 'Unknown'}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">@{player.minecraftUsername}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                Select Role
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Choose a role...</option>
                {ALL_ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Adding...' : 'Add Staff Member'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedPlayerId('');
                  setSelectedRole('');
                  setSearchQuery('');
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Staff List by Role */}
      <div className="space-y-4">
        {Object.entries(groupedStaff).map(([role, members]: [string, any]) => (
          <div key={role} className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {role} ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((member: StaffMember) => {
                const player = getPlayerById(member.player_id);
                if (!player) return null;
                const isEditing = editingId === member.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {player.profilePicture ? (
                        <img
                          src={player.profilePicture}
                          alt={player.displayName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold">
                          {player.displayName?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1">
                        <span className="text-gray-900 dark:text-white font-medium">
                          {player.displayName}
                        </span>
                        {isEditing && (
                          <div className="mt-2">
                            <select
                              value={editingRole}
                              onChange={(e) => setEditingRole(e.target.value)}
                              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:bg-gray-600 dark:text-white text-sm"
                            >
                              <option value="">Choose a role...</option>
                              {ALL_ROLES.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleUpdateStaff(member.id)}
                            disabled={loading}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center"
                          >
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors flex items-center"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditStaff(member)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center"
                          >
                            <Pencil className="w-4 h-4 mr-1" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemoveStaff(member.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {staff.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No staff members added yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Click "Add Staff Member" to get started
          </p>
        </div>
      )}
    </div>
  );
}

