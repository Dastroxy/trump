export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type SpecialSuit = Suit | 'none';

export type CardRank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | 'JOKER';

export interface Card {
  id: string; // unique identifier e.g. "hearts_A", "joker", "spades_2_special"
  suit: SpecialSuit;
  rank: CardRank;
  value: number; // For ranking within suit (2=2 ... 14=A, Joker=99)
  isJoker: boolean;
  isSpecialTwo?: boolean;
}

export type GamePhase =
  | 'LOBBY'
  | 'SEATING'
  | 'TEAM_REVEAL'
  | 'DEALING'
  | 'TRUMP_REVEAL'
  | 'BIDDING'
  | 'TRICK_PLAY'
  | 'TRICK_RESOLUTION'
  | 'GAME_SCORING'
  | 'MATCH_COMPLETE';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot?: boolean;
  seatIndex: number | null; // 0 to 5
  connected: boolean;
  lastActive: number;
}

export interface Team {
  id: number; // 1, 2, 3
  name: string;
  color: string;
  playerIds: [string, string];
  seats: [number, number];
}

export interface PlayedCard {
  playerId: string;
  playerSeat: number;
  playerName: string;
  card: Card;
  timestamp: number;
}

export interface Trick {
  trickNumber: number; // 1 to 9
  leaderSeat: number;
  ledSuit: Suit | null;
  cards: PlayedCard[];
  winnerSeat: number | null;
  winnerPlayerId: string | null;
  winningCard: Card | null;
}

export interface TeamScoreHistory {
  gameNumber: number;
  dealerSeat: number;
  trumpSuit: Suit;
  teamBids: Record<number, number>; // teamId -> combined bid
  playerBids: Record<string, number>; // playerId -> bid
  teamTricks: Record<number, number>; // teamId -> tricks won
  playerTricks: Record<string, number>; // playerId -> tricks won
  roundScores: Record<number, number>; // teamId -> score gained this round
  accumulatedScores: Record<number, number>; // teamId -> total score
  bagsEarned: Record<number, number>; // teamId -> bags earned this round
  totalBags: Record<number, number>; // teamId -> total bags
  nilResults: Record<string, 'SUCCESS' | 'FAILED' | 'NONE'>;
}

export interface GameSettings {
  playerCount: number; // 6 (extensible to 4 in future)
  winningScore: 100 | 150 | 200;
  bagsEnabled: boolean;
  nilBonusEnabled: boolean;
  jokerEnabled: true; // Always ON
  randomTwoEnabled: true; // Always ON
}

export interface GameRoomState {
  roomId: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Record<string, Player>;
  seats: (string | null)[]; // 6 seats: playerId or null
  teams: Team[];
  gameNumber: number;
  dealerSeat: number; // Rotates clockwise
  firstBidderSeat: number; // (dealerSeat + 1) % 6
  trumpSuit: Suit | null;
  specialTwo: Card | null; // The chosen 2 among 2S, 2H, 2D, 2C
  
  // Public player hand counts (clients only see their own private hands)
  handCounts: Record<string, number>;
  
  // Authoritative private hands (kept server-side)
  hands: Record<string, Card[]>;
  
  bids: Record<string, number | null>; // playerId -> bid (0 to 9)
  currentBidderSeat: number | null;
  
  currentTrick: Trick | null;
  currentTurnSeat: number | null;
  completedTricks: Trick[];
  
  // Scores across the match
  teamScores: Record<number, number>; // teamId -> score
  teamBags: Record<number, number>; // teamId -> bags (0 to 9)
  teamTricks: Record<number, number>; // teamId -> tricks won this game
  playerTricks: Record<string, number>; // playerId -> tricks won this game
  
  history: TeamScoreHistory[];
  winningTeamId: number | null;
  lastActionMessage?: string;
  updatedAt: number;
}

// Client-safe sanitized state (hides other players' cards)
export interface SanitizedClientState {
  roomId: string;
  phase: GamePhase;
  settings: GameSettings;
  players: Record<string, Player>;
  seats: (string | null)[];
  teams: Team[];
  gameNumber: number;
  dealerSeat: number;
  firstBidderSeat: number;
  trumpSuit: Suit | null;
  specialTwo: Card | null;
  handCounts: Record<string, number>;
  myHand: Card[]; // Only the requesting player's cards
  myPlayerId: string;
  mySeat: number | null;
  myTeamId: number | null;
  myTeammateSeat: number | null;
  bids: Record<string, number | null>;
  teamBids: Record<number, number | null>;
  currentBidderSeat: number | null;
  currentTrick: Trick | null;
  currentTurnSeat: number | null;
  teamScores: Record<number, number>;
  teamBags: Record<number, number>;
  teamTricks: Record<number, number>;
  playerTricks: Record<string, number>;
  history: TeamScoreHistory[];
  winningTeamId: number | null;
  lastActionMessage?: string;
  updatedAt: number;
}
