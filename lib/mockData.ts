import { Player, Team, Game, Article } from "@/types";

// Mock Teams Data
export const teams: Team[] = [
  {
    id: '1',
    name: 'Chicago Bows',
    owner: 'posterizing',
    generalManager: 'TBD',
    headCoach: 'TBD',
    assistantCoaches: [],
    conference: 'Western',
    colors: {
      primary: '#C8102E',
      secondary: '#000000',
    },
  },
  {
    id: '2',
    name: 'Team 2',
    owner: 'Owner Name',
    generalManager: 'GM Name',
    headCoach: 'Coach Name',
    assistantCoaches: ['Assistant 1'],
    conference: 'Eastern',
    colors: {
      primary: '#1D428A',
      secondary: '#FFC72C',
    },
  },
];

// Mock Players Data
export const players: Player[] = [
  {
    id: '1',
    displayName: 'posterizing',
    minecraftUsername: 'trevonism',
    minecraftUserId: '123456',
    profilePicture: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-0000000000000000000000000000000000-Png/150/150/AvatarHeadshot/Png/noFilter',
    description: 'Entrepreneur, enthusiast, free-thinker.',
    discordUsername: 'trevonism',
    teamId: '1',
    roles: ['Player', 'Franchise Owner'],
    stats: {
      gamesPlayed: 1,
      points: 1.0,
      rebounds: 0.0,
      assists: 0.0,
      steals: 0.0,
      blocks: 0.0,
      turnovers: 0.0,
      fieldGoalsMade: 0,
      fieldGoalsAttempted: 0,
      fieldGoalPercentage: 0.0,
      threePointersMade: 0,
      threePointersAttempted: 0,
      threePointPercentage: 0.0,
      freeThrowsMade: 0,
      freeThrowsAttempted: 0,
      freeThrowPercentage: 0.0,
      fouls: 0,
      assistTurnoverRatio: 0.0,
      assistPercentage: 0.0,
      efficiency: 0.0,
    },
  },
];

// Mock Games Data
export const games: Game[] = [
  {
    id: '1',
    homeTeamId: '1',
    awayTeamId: '2',
    scheduledDate: '2025-12-28T19:00:00',
    status: 'scheduled',
    season: 0,
  },
  {
    id: '2',
    homeTeamId: '2',
    awayTeamId: '1',
    homeScore: 95,
    awayScore: 88,
    scheduledDate: '2025-12-20T19:00:00',
    status: 'completed',
    season: 0,
  },
];

// Mock Articles Data
export const articles: Article[] = [
  {
    id: '1',
    title: 'Welcome to Minecraft Basketball Association!',
    content: 'We are excited to announce the launch of the Minecraft Basketball Association. Stay tuned for more updates!',
    author: 'MBA Admin',
    publishedDate: '2025-12-25T12:00:00',
    excerpt: 'Welcome to the official Minecraft Basketball Association website.',
  },
  {
    id: '2',
    title: 'Season 0 Begins Soon',
    content: 'Get ready for an exciting season of basketball action. Our inaugural season kicks off next week!',
    author: 'MBA Admin',
    publishedDate: '2025-12-24T10:00:00',
    excerpt: 'Season 0 is just around the corner!',
  },
];

