'use client';

import React, { useState, useEffect } from 'react';
import { Tv, Plus, Edit2, Trash2, Radio } from 'lucide-react';

export default function LiveStreamAdmin() {
  const [showForm, setShowForm] = useState(false);
  const [streams, setStreams] = useState<any[]>([]);
  const [activeStream, setActiveStream] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [twitchChannel, setTwitchChannel] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    fetchStreams();
  }, []);

  const fetchStreams = async () => {
    try {
      const res = await fetch('/api/live-stream');
      const data = await res.json();
      if (data.stream) {
        setActiveStream(data.stream);
      }
    } catch (error) {
      console.error('Failed to fetch stream:', error);
    }
  };

  const handleStartStream = async () => {
    if (!twitchChannel || !title) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/live-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          twitchChannel: twitchChannel.trim(),
          title: title.trim(),
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Live stream started!');
        await fetchStreams();
        resetForm();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to start stream:', error);
      alert('Failed to start stream');
    } finally {
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    if (!activeStream) return;
    if (!confirm('Stop the live stream?')) return;

    setLoading(true);
    try {
      const res = await fetch('/api/live-stream', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeStream.id,
          isLive: false,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        alert('Stream stopped!');
        setActiveStream(null);
        await fetchStreams();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to stop stream:', error);
      alert('Failed to stop stream');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTwitchChannel('');
    setTitle('');
    setShowForm(false);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Stream Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage live Twitch streams displayed on the homepage
          </p>
        </div>
      </div>

      {/* Active Stream Display */}
      {activeStream && (
        <div className="mb-6 p-6 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Radio className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100">
                  LIVE NOW
                </h3>
              </div>
              <p className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {activeStream.title}
              </p>
              <p className="text-gray-700 dark:text-gray-300">
                Channel: <span className="font-mono font-semibold">{activeStream.twitch_channel}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Started: {new Date(activeStream.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleStopStream}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Stopping...' : 'Stop Stream'}
            </button>
          </div>
        </div>
      )}

      {/* Start Stream Form */}
      {!activeStream && (
        <>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-mba-blue hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Start Live Stream</span>
            </button>
          ) : (
            <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Start New Live Stream
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Twitch Channel Name *
                  </label>
                  <input
                    type="text"
                    value={twitchChannel}
                    onChange={(e) => setTwitchChannel(e.target.value)}
                    placeholder="e.g., minecraftbasketball"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white font-mono"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Just the channel name, not the full URL
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Stream Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., EBA Season 1 Finals - Game 3"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-mba-blue text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleStartStream}
                  disabled={loading}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Radio className="w-4 h-4" />
                  {loading ? 'Starting...' : 'Go Live'}
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
        </>
      )}

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <Tv className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
              How It Works
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Only one stream can be live at a time</li>
              <li>• The live stream will appear on the homepage with a Twitch embed</li>
              <li>• Visitors can watch directly on the site or click to open Twitch</li>
              <li>• Remember to stop the stream when it's over</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

