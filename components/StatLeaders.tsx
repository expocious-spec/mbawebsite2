'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy } from 'lucide-react';

type LeaderEntry = {
  playerId: string;
  username: string;
  minecraftUsername?: string;
  avatarUrl?: string;
  teamName?: string;
  [key: string]: any;
};

type StatConfig = {
  key: string;
  label: string;
  statKey: string;
  color: string;         // Tailwind text color
  borderColor: string;   // Tailwind border color
  bgColor: string;       // Tailwind bg color (leader card)
  isPercent?: boolean;
};

const STAT_CONFIGS: StatConfig[] = [
  {
    key: 'ppg',
    label: 'PPG LEADERS',
    statKey: 'ppg',
    color: 'text-orange-400',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  {
    key: 'rpg',
    label: 'RPG LEADERS',
    statKey: 'rpg',
    color: 'text-purple-400',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    key: 'apg',
    label: 'APG LEADERS',
    statKey: 'apg',
    color: 'text-blue-400',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'spg',
    label: 'SPG LEADERS',
    statKey: 'spg',
    color: 'text-green-400',
    borderColor: 'border-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    key: 'fgpct',
    label: 'FG% LEADERS',
    statKey: 'fgpct',
    color: 'text-yellow-400',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-500/10',
    isPercent: true,
  },
];

function PlayerAvatar({ entry }: { entry: LeaderEntry }) {
  const src = entry.avatarUrl;
  if (!src) {
    return (
      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-400 text-xs font-bold flex-shrink-0">
        {entry.username?.charAt(0).toUpperCase()}
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={entry.username}
      width={40}
      height={40}
      className="w-10 h-10 rounded-full object-cover flex-shrink-0 bg-gray-300 dark:bg-gray-700"
      onError={(e) => {
        (e.target as HTMLImageElement).src =
          `https://ui-avatars.com/api/?name=${encodeURIComponent(entry.username)}&size=40&background=374151&color=9ca3af&bold=true`;
      }}
    />
  );
}

function formatStat(value: number, isPercent?: boolean) {
  if (isPercent) return `${value.toFixed(1)}%`;
  return value % 1 === 0 ? `${value}.0` : value.toFixed(1);
}

function StatSection({
  config,
  leaders,
}: {
  config: StatConfig;
  leaders: LeaderEntry[];
}) {
  const leader = leaders[0];
  const rest = leaders.slice(1);
  const leaderValue = leader ? leader[config.statKey] ?? 0 : 0;

  return (
    <div className="mb-1">
      {/* Section header */}
      <div className={`flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:${config.bgColor} border-l-4 ${config.borderColor}`}>
        <span className={`text-xs font-bold tracking-widest ${config.color}`}>{config.label}</span>
        <span className={`text-sm font-bold ${config.color}`}>
          {formatStat(leaderValue, config.isPercent)}
        </span>
      </div>

      {/* League Leader */}
      {leader && (
        <Link href={`/players/${leader.playerId}`}>
          <div className={`flex items-center gap-3 px-3 py-3 bg-gray-50 dark:${config.bgColor} border-b border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:brightness-110 transition-all`}>
            <PlayerAvatar entry={leader} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-900 dark:text-white text-sm truncate">{leader.username}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">League Leader</div>
            </div>
            <span className={`text-2xl font-black ${config.color} tabular-nums`}>
              {formatStat(leaderValue, config.isPercent)}
            </span>
          </div>
        </Link>
      )}

      {/* Ranks 2–5 */}
      {rest.map((entry, i) => (
        <Link key={entry.playerId} href={`/players/${entry.playerId}`}>
          <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700/30 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
            <span className="text-xs text-gray-500 dark:text-gray-500 w-4 text-center flex-shrink-0">{i + 2}</span>
            <PlayerAvatar entry={entry} />
            <span className="flex-1 text-sm text-gray-900 dark:text-gray-200 truncate">{entry.username}</span>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
              {formatStat(entry[config.statKey] ?? 0, config.isPercent)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function StatLeaders({ seasonId }: { seasonId?: string | null }) {
  const [leaderboards, setLeaderboards] = useState<Record<string, LeaderEntry[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const seasonParam = seasonId ? `&seasonId=${seasonId}` : '';
    Promise.all(
      STAT_CONFIGS.map(cfg =>
        fetch(`/api/stats/leaderboard?stat=${cfg.key}&limit=5${seasonParam}`)
          .then(r => r.json())
          .then(data => [cfg.key, data] as [string, LeaderEntry[]])
          .catch(() => [cfg.key, []] as [string, LeaderEntry[]])
      )
    ).then(results => {
      setLeaderboards(Object.fromEntries(results));
      setLoading(false);
    });
  }, [seasonId]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
          <span className="font-bold text-gray-900 dark:text-white text-sm tracking-wide">LEADERS</span>
        </div>
        <Link href="/stats" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          View All Stats →
        </Link>
      </div>

      {loading ? (
        <div className="p-6 text-center text-gray-600 dark:text-gray-500 text-sm">Loading leaders...</div>
      ) : (
        <div>
          {STAT_CONFIGS.map(cfg => (
            <StatSection
              key={cfg.key}
              config={cfg}
              leaders={leaderboards[cfg.key] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
