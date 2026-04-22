'use client';

import { useState } from 'react';
import { RefreshCw, Gamepad2, AlertTriangle, Send } from 'lucide-react';

export default function MinigamesAdmin() {
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error'; text: string; details?: any } | null>(null);

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset today\'s minigames? This will delete the current puzzle and all completion data for today. A new puzzle will be generated.')) {
      return;
    }

    setResetting(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/minigames/reset', {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Minigames reset successfully!',
        });
        
        // Force hard reload after 1.5 seconds to clear all caches
        setTimeout(() => {
          // Use hard reload to bypass cache
          window.location.href = window.location.href.split('#')[0];
          window.location.reload();
        }, 1500);
      } else {
        console.error('Reset failed:', data);
        setMessage({
          type: 'error',
          text: data.error || 'Failed to reset minigames',
        });
      }
    } catch (error) {
      console.error('Error resetting minigames:', error);
      setMessage({
        type: 'error',
        text: 'An error occurred while resetting minigames',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setWebhookMessage(null);

    try {
      const response = await fetch('/api/admin/minigames/test-webhook', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setWebhookMessage({
          type: 'success',
          text: data.message || 'Test webhook sent successfully!',
          details: data,
        });
      } else {
        setWebhookMessage({
          type: 'error',
          text: data.error || 'Failed to send test webhook',
          details: data,
        });
      }
    } catch (error) {
      console.error('Error testing webhook:', error);
      setWebhookMessage({
        type: 'error',
        text: 'An error occurred while testing the webhook',
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 mb-6">
        <Gamepad2 className="w-8 h-8 text-purple-500" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Minigames Administration</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Manage and test minigame functionality</p>
        </div>
      </div>

      {/* Reset Minigames Section */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 border-2 border-purple-200 dark:border-purple-800">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Reset Today's Minigames</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This will delete today's puzzle and all completion data. A new puzzle with different teams and stats will be 
              automatically generated. Open HoopGrids game pages will auto-refresh within 10 seconds.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-4 flex items-start space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Warning:</strong> This will clear all player completions and scores for today's puzzle. Use this only for testing purposes.
              </div>
            </div>

            <button
              onClick={handleReset}
              disabled={resetting}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                resetting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${resetting ? 'animate-spin' : ''}`} />
              <span>{resetting ? 'Resetting...' : 'Reset Minigames'}</span>
            </button>

            {message && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  message.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}
              >
                <p className="text-sm font-medium">{message.text}</p>
                {message.type === 'success' && (
                  <p className="text-xs mt-2 opacity-80">
                    ✨ Any open HoopGrids game pages will automatically refresh with the new puzzle within 10 seconds.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Discord Webhook Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Test Discord Bot Webhook</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Send a fake HoopGrids completion to your Discord bot to test the embed and notification system.
              Make sure DISCORD_BOT_API_URL is configured in your environment variables.
            </p>

            <button
              onClick={handleTestWebhook}
              disabled={testingWebhook}
              className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                testingWebhook
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              <Send className={`w-5 h-5 ${testingWebhook ? 'animate-pulse' : ''}`} />
              <span>{testingWebhook ? 'Sending...' : 'Send Test Webhook'}</span>
            </button>

            {webhookMessage && (
              <div
                className={`mt-4 p-4 rounded-lg border ${
                  webhookMessage.type === 'success'
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                }`}
              >
                <p className="text-sm font-medium mb-2">{webhookMessage.text}</p>
                
                {/* Show troubleshooting steps if available */}
                {webhookMessage.details?.troubleshooting && (
                  <div className="mt-3 p-3 bg-black/5 dark:bg-white/5 rounded">
                    <p className="text-xs font-semibold mb-2">🔧 Troubleshooting Steps:</p>
                    <ul className="text-xs space-y-1">
                      {webhookMessage.details.troubleshooting.map((step: string, i: number) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2">{i + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Show endpoint being called */}
                {webhookMessage.details?.endpoint && (
                  <div className="mt-2 text-xs">
                    <span className="font-semibold">Endpoint:</span> <code className="bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded">{webhookMessage.details.endpoint}</code>
                  </div>
                )}
                
                {webhookMessage.details && (
                  <details className="text-xs mt-3">
                    <summary className="cursor-pointer font-semibold mb-1">View Full Response</summary>
                    <pre className="mt-2 p-2 bg-black/10 dark:bg-white/10 rounded overflow-x-auto max-h-96">
                      {JSON.stringify(webhookMessage.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Testing Guidelines</h3>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span>Puzzles are generated using EST dates and rotate at midnight EST</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span>Each puzzle uses 3 random teams and 3 random stat criteria</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span>The system avoids repeating recently used teams and stats</span>
          </li>
          <li className="flex items-start">
            <span className="text-purple-500 mr-2">•</span>
            <span>After resetting, visit the HoopGrids page to see the new puzzle</span>
          </li>
        </ul>
      </div>

      {/* Current Time Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Current EST Time:</strong> {new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'long' })}
        </p>
        <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
          <strong>Current EST Date:</strong> {(() => {
            const estDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
            return `${estDate.getFullYear()}-${String(estDate.getMonth() + 1).padStart(2, '0')}-${String(estDate.getDate()).padStart(2, '0')}`;
          })()}
        </p>
      </div>
    </div>
  );
}
