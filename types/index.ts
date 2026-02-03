// Type definitions for the MBA Basketball League website

// Bot Integration: Main user type (uses discord-{id} format)
export interface User {
  id: string; // Format: 'discord-{discord_id}'
  username: string;
  email?: string;
  avatarUrl?: string;
  minecraftUsername?: string;
  minecraftUserId?: string;
  teamId?: string;
  description?: string;
  discordUsername?: string;
  roles?: string[];
  stars?: number; // Player star rating (1-5)
  coinWorth?: number; // Player coin worth for salary cap
  createdAt: string;
  updatedAt: string;
}

// Bot Integration: Season type
export interface Season {
  id: number;
  guildId: string;
  seasonName: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

// Bot Integration: Player season stats (aggregated by bot)
export interface PlayerSeasonStats {
  id: number;
  playerId: string; // discord-{id}
  seasonId: number;
  guildId: string;
  gamesPlayed: number;
  totalPoints: number;
  totalRebounds: number;
  totalAssists: number;
  totalSteals: number;
  totalBlocks: number;
  totalTurnovers: number;
  // Calculated averages
  ppg?: number;
  rpg?: number;
  apg?: number;
  spg?: number;
  bpg?: number;
}

// Legacy player type (for backward compatibility)
export interface Player {
  id: string;
  displayName: string;
  minecraftUsername: string;
  minecraftUserId: string;
  profilePicture: string;
  description?: string;
  discordUsername?: string;
  teamId?: string;
  roles: PlayerRole[];
  stats: PlayerStats;
  gameStats?: GameStats[];
}

export interface GameStats {
  id: string;
  playerId: string;
  gameId: string;
  date: string;
  opponent: string;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  threePointersMade: number;
  threePointersAttempted: number;
  possessionTime: number;
  result: 'W' | 'L';
}

export interface Player {
  id: string;
  displayName: string;
  minecraftUsername: string;
  minecraftUserId: string;
  profilePicture: string;
  description?: string;
  discordUsername?: string;
  teamId?: string;
  roles: PlayerRole[];
  stats: PlayerStats;
  gameStats?: GameStats[];
}

export interface PlayerStats {
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fieldGoalsMade: number;
  fieldGoalsAttempted: number;
  fieldGoalPercentage: number;
  threePointersMade: number;
  threePointersAttempted: number;
  threePointPercentage: number;
  freeThrowsMade: number;
  freeThrowsAttempted: number;
  freeThrowPercentage: number;
  fouls: number;
  assistTurnoverRatio: number;
  assistPercentage: number;
  efficiency: number;
}

export type PlayerRole = 
  | 'Player'
  | 'Franchise Owner'
  | 'General Manager'
  | 'Head Coach'
  | 'Assistant Coach';

export interface Team {
  id: string;
  guildId?: string; // Bot integration
  name: string;
  logo?: string;
  teamLogoUrl?: string; // Bot field
  teamLogoEmoji?: string; // Bot field
  teamRoleId?: string; // Bot field (Discord role)
  owner?: string;
  generalManager?: string;
  headCoach?: string;
  assistantCoaches: string[];
  conference: 'Western' | 'Eastern'; // Western and Eastern conferences
  wins?: number; // Bot integration
  losses?: number; // Bot integration
  salaryCap?: number; // Team salary cap limit (default 19000)
  seasons?: string[]; // Seasons this team is assigned to (e.g., ['Season 6', 'Season 7'])
  colors: {
    primary: string;
    secondary: string;
  };
  createdAt?: string;
}

export interface Game {
  id: string | number;
  guildId?: string; // Bot integration
  seasonId?: number; // Bot integration
  homeTeamId: string;
  awayTeamId: string;
  team1Id?: string; // Bot uses team1/team2
  team2Id?: string;
  homeScore?: number;
  awayScore?: number;
  team1Score?: number; // Bot field
  team2Score?: number; // Bot field
  winnerId?: string; // Bot field
  scheduledDate: string;
  playedAt?: string; // Bot field
  status: 'scheduled' | 'live' | 'completed';
  season: number;
  recordedBy?: string; // Bot field
  vodUrl?: string; // Bot field
  notes?: string; // Bot field
}

export interface Article {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string;
  coverImage?: string;
  excerpt?: string;
}
