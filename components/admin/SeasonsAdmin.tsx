'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Calendar } from 'lucide-react';

interface Season {
  id: string;
  name: string;
  displayOrder: number;
  isCurrent: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export default function SeasonsAdmin() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    displayOrder: 0,
    isCurrent: false,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchSeasons();
  }, []);

  const fetchSeasons = async () => {
    try {
      const res = await fetch('/api/seasons');
      if (res.ok) {
        const data = await res.json();
        // Ensure data is an array
        if (Array.isArray(data)) {
          setSeasons(data);
        } else {
          console.error('Seasons API returned non-array:', data);
          setSeasons([]);
        }
      } else {
        console.error('Failed to fetch seasons:', res.status);
        setSeasons([]);
      }
    } catch (error) {
      console.error('Error fetching seasons:', error);
      setSeasons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingId ? `/api/seasons/${editingId}` : '/api/seasons';
      const method = editingId ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchSeasons();
        resetForm();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to save season');
      }
    } catch (error) {
      console.error('Error saving season:', error);
      alert('Failed to save season');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this season? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/seasons/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        await fetchSeasons();
      } else {
        // Check if the error is due to teams being assigned
        if (res.status === 400 && data.affectedTeams) {
          const teamNames = data.affectedTeams.map((t: any) => t.name).join(', ');
          const shouldRemove = confirm(
            `This season is assigned to ${data.affectedTeams.length} team(s): ${teamNames}.\n\n` +
            `Would you like to remove this season from all teams and then delete it?\n\n` +
            `Click OK to remove from teams and delete, or Cancel to abort.`
          );
          
          if (shouldRemove) {
            // Get the season name first
            const season = seasons.find(s => s.id === id);
            if (!season) {
              alert('Season not found');
              return;
            }
            
            // Remove from teams
            const removeRes = await fetch(`/api/seasons/${id}/remove-from-teams`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ seasonName: season.name }),
            });
            
            if (removeRes.ok) {
              // Try deleting again
              const deleteRes = await fetch(`/api/seasons/${id}`, { method: 'DELETE' });
              if (deleteRes.ok) {
                await fetchSeasons();
                alert('Season removed from teams and deleted successfully');
              } else {
                alert('Failed to delete season after removing from teams');
              }
            } else {
              alert('Failed to remove season from teams');
            }
          }
        } else {
          alert(data.error || 'Failed to delete season');
        }
      }
    } catch (error) {
      console.error('Error deleting season:', error);
      alert('Failed to delete season');
    }
  };

  const handleEdit = (season: Season) => {
    setEditingId(season.id);
    setFormData({
      name: season.name,
      displayOrder: season.displayOrder,
      isCurrent: season.isCurrent,
      startDate: season.startDate || '',
      endDate: season.endDate || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      displayOrder: 0,
      isCurrent: false,
      startDate: '',
      endDate: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading seasons...</div>;
  }

  return (
    <div className="admin-page">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Seasons</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Season</span>
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {editingId ? 'Edit Season' : 'Add New Season'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Season Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  placeholder="e.g., Season 1, Preseason 1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Display Order *
                </label>
                <input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  placeholder="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in dropdowns</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isCurrent"
                checked={formData.isCurrent}
                onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
                className="w-4 h-4 text-mba-blue border-gray-300 rounded focus:ring-mba-blue"
              />
              <label htmlFor="isCurrent" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Set as current season (will unset other seasons)
              </label>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>{editingId ? 'Update' : 'Create'} Season</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Seasons List */}
      <div className="space-y-3">
        {seasons.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No seasons yet. Add your first season to get started!</p>
          </div>
        ) : (
          seasons.map((season) => (
            <div
              key={season.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{season.name}</h3>
                  {season.isCurrent && (
                    <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                      Current
                    </span>
                  )}
                  <span className="text-sm text-gray-500">Order: {season.displayOrder}</span>
                </div>
                {(season.startDate || season.endDate) && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {season.startDate && new Date(season.startDate).toLocaleDateString()} 
                    {season.startDate && season.endDate && ' - '}
                    {season.endDate && new Date(season.endDate).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(season)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(season.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Seasons are automatically displayed in dropdown menus across the site (stats page, games page, etc.). 
          The "All-Time" option is always included by default.
        </p>
      </div>
    </div>
  );
}

