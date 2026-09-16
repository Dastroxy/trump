import { generateDeck, dealCards, shuffleDeck } from './deck.ts';
import {
  validateCardPlay,
  determineTrickWinner,
  calculateRoundScores,
  getLegalCards,
} from './rules.ts';
import {
  Card,
  GamePhase,
  GameRoomState,
  GameSettings,
  PlayedCard,
  Player,
  SanitizedClientState,
  Suit,
  Team,
  Trick,
} from './types.ts';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

export type RoomUpdateListener = (roomId: string) => void;
let globalRoomUpdateListener: RoomUpdateListener | null = null;

export function setRoomUpdateListener(listener: RoomUpdateListener | null): void {
  globalRoomUpdateListener = listener;
}

export function triggerRoomUpdate(roomId: string): void {
  if (globalRoomUpdateListener) {
    try {
      globalRoomUpdateListener(roomId);
    } catch {}
  }
}

export function createGameRoom(
  roomId: string,
  host: { id: string; name: string; avatar: string },
  customSettings?: Partial<GameSettings>
): GameRoomState {
  const hostPlayer: Player = {
    id: host.id,
    name: host.name,
    avatar: host.avatar,
    isHost: true,
    isBot: false,
    seatIndex: null,
    connected: true,
    lastActive: Date.now(),
  };

  const settings: GameSettings = {
    playerCount: 6,
    winningScore: 100,
    bagsEnabled: true,
    nilBonusEnabled: true,
    jokerEnabled: true,
    randomTwoEnabled: true,
    ...customSettings,
  };

  return {
    roomId,
    phase: 'LOBBY',
    settings,
    players: { [host.id]: hostPlayer },
    seats: [null, null, null, null, null, null],
    teams: [],
    gameNumber: 1,
    dealerSeat: 0,
    firstBidderSeat: 1,
    trumpSuit: null,
    specialTwo: null,
    handCounts: {},
    hands: {},
    bids: {},
    currentBidderSeat: null,
    currentTrick: null,
    currentTurnSeat: null,
    completedTricks: [],
    teamScores: { 1: 0, 2: 0, 3: 0 },
    teamBags: { 1: 0, 2: 0, 3: 0 },
    teamTricks: { 1: 0, 2: 0, 3: 0 },
    playerTricks: {},
    history: [],
    winningTeamId: null,
    lastActionMessage: 'Room created. Waiting for players to join.',
    updatedAt: Date.now(),
  };
}

export function joinGameRoom(
  room: GameRoomState,
  playerData: { id: string; name: string; avatar: string }
): { success: boolean; error?: string } {
  // Check if player is reconnecting
  if (room.players[playerData.id]) {
    room.players[playerData.id].connected = true;
    room.players[playerData.id].lastActive = Date.now();
    room.lastActionMessage = `${room.players[playerData.id].name} reconnected.`;
    room.updatedAt = Date.now();
    return { success: true };
  }

  // If new player, verify room not full
  const playerCount = Object.keys(room.players).length;
  if (playerCount >= 6) {
    return { success: false, error: 'Room is already full (6 players maximum)' };
  }

  if (room.phase !== 'LOBBY' && room.phase !== 'SEATING') {
    return { success: false, error: 'Game has already started' };
  }

  const newPlayer: Player = {
    id: playerData.id,
    name: playerData.name,
    avatar: playerData.avatar,
    isHost: false,
    isBot: false,
    seatIndex: null,
    connected: true,
    lastActive: Date.now(),
  };

  room.players[playerData.id] = newPlayer;
  room.lastActionMessage = `${newPlayer.name} joined the lobby.`;
  room.updatedAt = Date.now();
  return { success: true };
}

export function updateGameSettings(
  room: GameRoomState,
  requesterId: string,
  newSettings: Partial<GameSettings>
): { success: boolean; error?: string } {
  if (room.phase !== 'LOBBY') {
    return { success: false, error: 'Settings are locked after game begins' };
  }
  if (!room.players[requesterId]?.isHost) {
    return { success: false, error: 'Only the host can modify game settings' };
  }

  room.settings = {
    ...room.settings,
    ...newSettings,
    jokerEnabled: true, // Always true
    randomTwoEnabled: true, // Always true
  };
  room.updatedAt = Date.now();
  return { success: true };
}

export function fillRemainingSeatsWithBots(room: GameRoomState): { success: boolean } {
  const botNames = ['Orion', 'Lyra', 'Atlas', 'Vesper', 'Cygnus', 'Nova'];
  const botAvatars = ['bot-1', 'bot-2', 'bot-3', 'bot-4', 'bot-5', 'bot-6'];

  let botIndex = 1;
  while (Object.keys(room.players).length < 6) {
    const botId = `bot_${Date.now()}_${botIndex}`;
    const name = botNames[botIndex - 1] || `Bot ${botIndex}`;
    const avatar = botAvatars[botIndex - 1] || 'bot-1';

    room.players[botId] = {
      id: botId,
      name: `${name} (AI)`,
      avatar,
      isHost: false,
      isBot: true,
      seatIndex: null,
      connected: true,
      lastActive: Date.now(),
    };
    botIndex++;
  }

  room.lastActionMessage = 'Filled remaining seats with AI players.';
  room.updatedAt = Date.now();
  return { success: true };
}

export function selectPlayerSeat(
  room: GameRoomState,
  playerId: string,
  seatIndex: number
): { success: boolean; error?: string } {
  if (seatIndex < 0 || seatIndex > 5) {
    return { success: false, error: 'Invalid seat index (must be 0 to 5)' };
  }

  const player = room.players[playerId];
  if (!player) {
    return { success: false, error: 'Player not in room' };
  }

  // If seat is occupied by someone else
  if (room.seats[seatIndex] && room.seats[seatIndex] !== playerId) {
    return { success: false, error: 'Seat is already occupied' };
  }

  // Clear previous seat if any
  if (player.seatIndex !== null) {
    room.seats[player.seatIndex] = null;
  }

  room.seats[seatIndex] = playerId;
  player.seatIndex = seatIndex;
  room.updatedAt = Date.now();

  // If all 6 seats are taken, auto-seat bots if any weren't seated
  return { success: true };
}

export function autoAssignUnseatedBots(room: GameRoomState) {
  const unseatedBots = Object.values(room.players).filter(
    (p) => p.isBot && p.seatIndex === null
  );

  for (const bot of unseatedBots) {
    const emptySeat = room.seats.findIndex((s) => s === null);
    if (emptySeat !== -1) {
      room.seats[emptySeat] = bot.id;
      bot.seatIndex = emptySeat;
    }
  }
  room.updatedAt = Date.now();
}

/**
 * Forms the 3 teams based on opposite seats:
 * Seat 0 (P1) <-> Seat 3 (P4) = Team 1
 * Seat 1 (P2) <-> Seat 4 (P5) = Team 2
 * Seat 2 (P3) <-> Seat 5 (P6) = Team 3
 */
export function initializeTeams(room: GameRoomState): boolean {
  for (let i = 0; i < 6; i++) {
    if (!room.seats[i]) return false;
  }

  room.teams = [
    {
      id: 1,
      name: 'Team 1',
      color: '#38bdf8', // Sky Blue
      playerIds: [room.seats[0]!, room.seats[3]!],
      seats: [0, 3],
    },
    {
      id: 2,
      name: 'Team 2',
      color: '#34d399', // Emerald
      playerIds: [room.seats[1]!, room.seats[4]!],
      seats: [1, 4],
    },
    {
      id: 3,
      name: 'Team 3',
      color: '#fbbf24', // Amber
      playerIds: [room.seats[2]!, room.seats[5]!],
      seats: [2, 5],
    },
  ];

  return true;
}

/**
 * Starts a new game round:
 * - Generates 54-card deck (52 + 1 Joker + 1 random 2)
 * - Shuffles server-side
 * - Selects a trump suit randomly
 * - Deals 9 cards to each player, starting clockwise from the dealer
 * - Sets first bidder to (dealerSeat + 1) % 6
 */
export function startNewGameRound(room: GameRoomState): void {
  // Generate deck
  const { deck, specialTwo } = generateDeck();
  const shuffled = shuffleDeck(deck);
  room.specialTwo = specialTwo;

  // Choose trump suit (random among 4 suits)
  room.trumpSuit = SUITS[Math.floor(Math.random() * SUITS.length)];

  // Order of players starting clockwise from dealer
  const orderSeats: number[] = [];
  for (let i = 1; i <= 6; i++) {
    orderSeats.push((room.dealerSeat + i) % 6);
  }
  const orderedPlayerIds = orderSeats.map((s) => room.seats[s]!);

  // Deal 9 cards each
  room.hands = dealCards(shuffled, orderedPlayerIds);

  // Update public hand counts
  room.handCounts = {};
  for (const pid of orderedPlayerIds) {
    room.handCounts[pid] = room.hands[pid].length; // 9
  }

  // Reset round state
  room.bids = {};
  for (const pid of orderedPlayerIds) {
    room.bids[pid] = null;
  }
  room.firstBidderSeat = (room.dealerSeat + 1) % 6;
  room.currentBidderSeat = room.firstBidderSeat;

  room.currentTrick = null;
  room.currentTurnSeat = null;
  room.completedTricks = [];
  room.teamTricks = { 1: 0, 2: 0, 3: 0 };
  room.playerTricks = {};
  for (const pid of orderedPlayerIds) {
    room.playerTricks[pid] = 0;
  }

  room.phase = 'BIDDING';
  const firstPlayerName = room.players[room.seats[room.firstBidderSeat]!]?.name;
  room.lastActionMessage = `Game ${room.gameNumber} dealt. Trump is ${room.trumpSuit.toUpperCase()}. ${firstPlayerName} bids first.`;
  room.updatedAt = Date.now();

  // If first bidder is a bot, trigger bot bid
  checkAndTriggerBotBid(room);
}

/**
 * Handles a player's bid (0-9)
 */
export function submitPlayerBid(
  room: GameRoomState,
  playerId: string,
  bid: number
): { success: boolean; error?: string } {
  if (room.phase !== 'BIDDING') {
    return { success: false, error: 'Not currently in bidding phase' };
  }

  const expectedPlayerId = room.seats[room.currentBidderSeat!];
  if (playerId !== expectedPlayerId) {
    return { success: false, error: 'Not your turn to bid' };
  }

  if (bid < 0 || bid > 9) {
    return { success: false, error: 'Bid must be between 0 and 9' };
  }

  if (bid === 0 && !room.settings.nilBonusEnabled) {
    return { success: false, error: 'Nil bids are disabled in host settings' };
  }

  room.bids[playerId] = bid;
  const playerName = room.players[playerId]?.name;

  // Check if all 6 players have bid
  const allBid = room.seats.every((pid) => pid && room.bids[pid] !== null);

  if (allBid) {
    // Start Trick 1!
    room.phase = 'TRICK_PLAY';
    const leaderSeat = room.firstBidderSeat;
    room.currentTurnSeat = leaderSeat;
    room.currentTrick = {
      trickNumber: 1,
      leaderSeat,
      ledSuit: null,
      cards: [],
      winnerSeat: null,
      winnerPlayerId: null,
      winningCard: null,
    };
    const leaderName = room.players[room.seats[leaderSeat]!]?.name;
    room.lastActionMessage = `All bids placed. Trick 1 begins! ${leaderName} leads.`;
    room.updatedAt = Date.now();

    // Check if leader must auto-play final card Joker or if leader is bot
    checkTurnAutomations(room);
  } else {
    // Advance bidder clockwise
    room.currentBidderSeat = (room.currentBidderSeat! + 1) % 6;
    const nextPlayerName = room.players[room.seats[room.currentBidderSeat]!]?.name;
    room.lastActionMessage = `${playerName} bid ${bid}. Waiting for ${nextPlayerName}.`;
    room.updatedAt = Date.now();

    checkAndTriggerBotBid(room);
  }

  return { success: true };
}

/**
 * Executes a card play from the active player.
 */
export function playPlayerCard(
  room: GameRoomState,
  playerId: string,
  cardId: string
): { success: boolean; error?: string } {
  if (room.phase !== 'TRICK_PLAY') {
    return { success: false, error: 'Not in trick play phase' };
  }

  if (room.currentTurnSeat === null) {
    return { success: false, error: 'No active turn' };
  }

  const activePlayerId = room.seats[room.currentTurnSeat];
  if (playerId !== activePlayerId) {
    return { success: false, error: 'Not your turn to play a card' };
  }

  const hand = room.hands[playerId] || [];
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  if (cardIndex === -1) {
    return { success: false, error: 'Card not found in your hand' };
  }

  const card = hand[cardIndex];
  const trick = room.currentTrick!;

  // Validate legality using rules engine
  const validity = validateCardPlay(
    card,
    hand,
    trick.trickNumber,
    9,
    trick.ledSuit
  );

  if (!validity.isLegal) {
    return { success: false, error: validity.reason || 'Illegal card play' };
  }

  // Remove card from player hand
  hand.splice(cardIndex, 1);
  room.handCounts[playerId] = hand.length;

  // Check if this was a final-card Joker play!
  // "The final-card Joker has NO winning value. It cannot win the trick.
  // It should be treated as a no-value card for trick-winner calculation."
  const isFinalCardJoker = card.isJoker && validity.isAutoPlayFinalCardJoker;
  const playedCardObj: Card = isFinalCardJoker
    ? { ...card, ...({ isZeroValueFinalJoker: true } as any) }
    : card;

  // Set led suit if this is the first card of the trick
  if (trick.cards.length === 0) {
    trick.ledSuit = card.suit as Suit;
  }

  const playerObj = room.players[playerId];
  const playedEntry: PlayedCard = {
    playerId,
    playerSeat: room.currentTurnSeat,
    playerName: playerObj.name,
    card: playedCardObj,
    timestamp: Date.now(),
  };
  trick.cards.push(playedEntry);

  const cardDisplayName = card.isJoker ? 'JOKER' : `${card.rank} of ${card.suit}`;
  room.lastActionMessage = `${playerObj.name} played ${cardDisplayName}.`;
  room.updatedAt = Date.now();

  // If trick has all 6 cards, resolve trick!
  if (trick.cards.length === 6) {
    resolveCurrentTrick(room);
  } else {
    // Advance turn clockwise
    room.currentTurnSeat = (room.currentTurnSeat + 1) % 6;
    room.updatedAt = Date.now();
    checkTurnAutomations(room);
  }

  return { success: true };
}

/**
 * Resolves the 6-card trick, determines winner, awards tricks,
 * and either proceeds to next trick or round scoring.
 */
export function resolveCurrentTrick(room: GameRoomState): void {
  const trick = room.currentTrick!;
  room.phase = 'TRICK_RESOLUTION';

  // Determine winner with rules engine
  const { winnerSeat, winnerPlayerId, winningCard } = determineTrickWinner(
    trick.cards,
    room.trumpSuit!,
    trick.trickNumber
  );

  trick.winnerSeat = winnerSeat;
  trick.winnerPlayerId = winnerPlayerId;
  trick.winningCard = winningCard;

  // Find winner team
  const winningPlayer = room.players[winnerPlayerId];
  const winnerTeam = room.teams.find((t) => t.playerIds.includes(winnerPlayerId));
  if (winnerTeam) {
    room.teamTricks[winnerTeam.id] = (room.teamTricks[winnerTeam.id] || 0) + 1;
  }
  room.playerTricks[winnerPlayerId] = (room.playerTricks[winnerPlayerId] || 0) + 1;

  const winCardName = winningCard.isJoker
    ? 'Joker'
    : `${winningCard.rank} of ${winningCard.suit}`;
  room.lastActionMessage = `${winningPlayer.name} won Trick ${trick.trickNumber} with ${winCardName}!`;
  room.completedTricks.push(trick);
  room.updatedAt = Date.now();

  // After a brief display, start next trick or round score
  // We can automatically advance or allow client animation timeout
  // For authoritative state, we schedule / set up next trick state
  setTimeout(() => {
    if (room.phase === 'TRICK_RESOLUTION') {
      advanceTrickOrFinishRound(room);
      triggerRoomUpdate(room.roomId);
      checkTurnAutomations(room);
    }
  }, 1600);
}

/**
 * Advances a trick in resolution to the next trick or finishes the round.
 */
export function advanceTrickOrFinishRound(room: GameRoomState): boolean {
  if (room.phase !== 'TRICK_RESOLUTION' || !room.currentTrick) return false;
  const trick = room.currentTrick;
  const winnerSeat = trick.winnerSeat!;
  const winnerPlayerId = trick.winnerPlayerId!;
  const winningPlayer = room.players[winnerPlayerId];

  if (trick.trickNumber < 9) {
    // Start next trick
    const nextTrickNumber = trick.trickNumber + 1;
    room.phase = 'TRICK_PLAY';
    room.currentTurnSeat = winnerSeat;
    room.currentTrick = {
      trickNumber: nextTrickNumber,
      leaderSeat: winnerSeat,
      ledSuit: null,
      cards: [],
      winnerSeat: null,
      winnerPlayerId: null,
      winningCard: null,
    };
    room.lastActionMessage = `Trick ${nextTrickNumber} of 9. ${winningPlayer?.name || 'Winner'} leads.`;
    room.updatedAt = Date.now();
    return true;
  } else {
    // All 9 tricks complete -> GAME_SCORING!
    finishGameRound(room);
    return true;
  }
}

/**
 * Finishes the 9 tricks, calculates scores, and checks for match winner.
 */
export function finishGameRound(room: GameRoomState): void {
  room.phase = 'GAME_SCORING';

  const playerBidsNum: Record<string, number> = {};
  for (const [pid, b] of Object.entries(room.bids)) {
    playerBidsNum[pid] = b ?? 0;
  }

  const { newTeamScores, newTeamBags, historyEntry } = calculateRoundScores(
    room.teams,
    playerBidsNum,
    room.playerTricks,
    room.teamScores,
    room.teamBags,
    room.settings.bagsEnabled,
    room.settings.nilBonusEnabled,
    room.gameNumber,
    room.dealerSeat,
    room.trumpSuit!
  );

  room.teamScores = newTeamScores;
  room.teamBags = newTeamBags;
  room.history.push(historyEntry);

  // Check winning condition
  const target = room.settings.winningScore;
  const eligibleWinners = room.teams.filter(
    (t) => (room.teamScores[t.id] || 0) >= target
  );

  if (eligibleWinners.length > 0) {
    // Find team with highest score
    eligibleWinners.sort(
      (a, b) => (room.teamScores[b.id] || 0) - (room.teamScores[a.id] || 0)
    );
    // Check for clear winner (not tied)
    if (
      eligibleWinners.length === 1 ||
      (room.teamScores[eligibleWinners[0].id] || 0) >
        (room.teamScores[eligibleWinners[1].id] || 0)
    ) {
      room.phase = 'MATCH_COMPLETE';
      room.winningTeamId = eligibleWinners[0].id;
      room.lastActionMessage = `Match complete! ${eligibleWinners[0].name} wins with ${room.teamScores[eligibleWinners[0].id]} points!`;
      room.updatedAt = Date.now();
      triggerRoomUpdate(room.roomId);
      return;
    }
  }

  room.lastActionMessage = `Game ${room.gameNumber} completed. Ready for next game.`;
  room.updatedAt = Date.now();
  triggerRoomUpdate(room.roomId);
}

/**
 * Transitions to the next game in the match:
 * Rotates dealer clockwise: (dealerSeat + 1) % 6
 */
export function advanceToNextGame(
  room: GameRoomState,
  requesterId: string
): { success: boolean; error?: string } {
  if (room.phase !== 'GAME_SCORING') {
    return { success: false, error: 'Cannot start next game right now' };
  }

  if (!room.players[requesterId]?.isHost) {
    return { success: false, error: 'Only the host can advance to the next game' };
  }

  room.gameNumber += 1;
  room.dealerSeat = (room.dealerSeat + 1) % 6; // Clockwise dealer rotation!
  startNewGameRound(room);
  return { success: true };
}

/**
 * Checks if the current turn player:
 * 1. Has only 1 card and it is the Joker -> MUST AUTO-PLAY!
 * 2. Is a bot -> Bot plays automatically!
 */
export function checkTurnAutomations(room: GameRoomState): void {
  if (room.phase !== 'TRICK_PLAY' || room.currentTurnSeat === null) {
    return;
  }

  const playerId = room.seats[room.currentTurnSeat];
  if (!playerId) return;

  const player = room.players[playerId];
  const hand = room.hands[playerId] || [];

  // 1. FINAL-CARD JOKER AUTOMATIC PLAY:
  // "If the Joker is the player's final remaining card in their hand, the Joker is automatically played
  // when their turn arrives. This automatic play overrides the normal restriction that prevents the Joker
  // from being played in the final trick. However: The final-card Joker has NO winning value."
  if (hand.length === 1 && hand[0].isJoker) {
    setTimeout(() => {
      // Verify turn has not moved
      if (room.phase === 'TRICK_PLAY' && room.currentTurnSeat === player.seatIndex) {
        playPlayerCard(room, playerId, hand[0].id);
        triggerRoomUpdate(room.roomId);
      }
    }, 450);
    return;
  }

  // 2. AI Bot automation
  if (player.isBot) {
    setTimeout(() => {
      if (room.phase === 'TRICK_PLAY' && room.currentTurnSeat === player.seatIndex) {
        const legalCards = getLegalCards(
          hand,
          room.currentTrick!.trickNumber,
          9,
          room.currentTrick!.ledSuit
        );
        if (legalCards.length > 0) {
          // Play a sensible card (lowest legal card)
          legalCards.sort((a, b) => a.value - b.value);
          playPlayerCard(room, playerId, legalCards[0].id);
          triggerRoomUpdate(room.roomId);
        }
      }
    }, 600);
  }
}

/**
 * Bot bidding automation
 */
function checkAndTriggerBotBid(room: GameRoomState): void {
  if (room.phase !== 'BIDDING' || room.currentBidderSeat === null) return;

  const playerId = room.seats[room.currentBidderSeat];
  if (!playerId) return;

  const player = room.players[playerId];
  if (player && player.isBot) {
    setTimeout(() => {
      if (room.phase === 'BIDDING' && room.currentBidderSeat === player.seatIndex) {
        // Estimate bid: count high cards and trump
        const hand = room.hands[playerId] || [];
        const trump = room.trumpSuit;
        let estimated = 0;
        for (const c of hand) {
          if (c.isJoker) estimated += 1;
          else if (c.suit === trump && c.value >= 11) estimated += 1;
          else if (c.value === 14) estimated += 1;
        }
        const minBid = room.settings.nilBonusEnabled ? 0 : 1;
        const bid = Math.max(minBid, Math.min(4, estimated));
        submitPlayerBid(room, playerId, bid);
        triggerRoomUpdate(room.roomId);
      }
    }, 500);
  }
}

/**
 * Evaluates whether an automated action (bot bid, bot play, or auto-play final Joker) is pending.
 */
export function getBotAction(room: GameRoomState): { type: 'bid'; playerId: string; bid: number } | { type: 'play'; playerId: string; cardId: string } | null {
  if (room.phase === 'BIDDING' && room.currentBidderSeat !== null) {
    const playerId = room.seats[room.currentBidderSeat];
    if (playerId && room.players[playerId]?.isBot) {
      const hand = room.hands[playerId] || [];
      const trump = room.trumpSuit;
      let estimated = 0;
      for (const c of hand) {
        if (c.isJoker) estimated += 1;
        else if (c.suit === trump && c.value >= 11) estimated += 1;
        else if (c.value === 14) estimated += 1;
      }
      const minBid = room.settings.nilBonusEnabled ? 0 : 1;
      const bid = Math.max(minBid, Math.min(4, estimated));
      return { type: 'bid', playerId, bid };
    }
  }

  if (room.phase === 'TRICK_PLAY' && room.currentTurnSeat !== null && room.currentTrick) {
    const playerId = room.seats[room.currentTurnSeat];
    if (playerId) {
      const player = room.players[playerId];
      const hand = room.hands[playerId] || [];

      // 1. Final-card Joker automatic play
      if (hand.length === 1 && hand[0].isJoker) {
        return { type: 'play', playerId, cardId: hand[0].id };
      }

      // 2. Bot turn
      if (player?.isBot) {
        const legalCards = getLegalCards(
          hand,
          room.currentTrick.trickNumber,
          9,
          room.currentTrick.ledSuit
        );
        if (legalCards.length > 0) {
          legalCards.sort((a, b) => a.value - b.value);
          return { type: 'play', playerId, cardId: legalCards[0].id };
        }
      }
    }
  }

  return null;
}

/**
 * Sanitizes room state so that clients only receive their own hand,
 * and never see opponents' hidden cards!
 */
export function sanitizeStateForPlayer(
  room: GameRoomState,
  playerId: string
): SanitizedClientState {
  const player = room.players[playerId];
  const mySeat = player?.seatIndex ?? null;

  let myTeamId: number | null = null;
  let myTeammateSeat: number | null = null;

  if (mySeat !== null && room.teams.length === 3) {
    const team = room.teams.find((t) => t.seats.includes(mySeat));
    if (team) {
      myTeamId = team.id;
      myTeammateSeat = team.seats[0] === mySeat ? team.seats[1] : team.seats[0];
    }
  }

  // Combined team bids
  const teamBids: Record<number, number | null> = {};
  for (const team of room.teams) {
    const [p1, p2] = team.playerIds;
    const b1 = room.bids[p1];
    const b2 = room.bids[p2];
    if (b1 !== null && b1 !== undefined && b2 !== null && b2 !== undefined) {
      teamBids[team.id] = b1 + b2;
    } else {
      teamBids[team.id] = null;
    }
  }

  return {
    roomId: room.roomId,
    phase: room.phase,
    settings: room.settings,
    players: room.players,
    seats: room.seats,
    teams: room.teams,
    gameNumber: room.gameNumber,
    dealerSeat: room.dealerSeat,
    firstBidderSeat: room.firstBidderSeat,
    trumpSuit: room.trumpSuit,
    specialTwo: room.specialTwo,
    handCounts: room.handCounts,
    myHand: room.hands[playerId] || [], // ONLY this player's private hand!
    myPlayerId: playerId,
    mySeat,
    myTeamId,
    myTeammateSeat,
    bids: room.bids,
    teamBids,
    currentBidderSeat: room.currentBidderSeat,
    currentTrick: room.currentTrick,
    currentTurnSeat: room.currentTurnSeat,
    teamScores: room.teamScores,
    teamBags: room.teamBags,
    teamTricks: room.teamTricks,
    playerTricks: room.playerTricks,
    history: room.history,
    winningTeamId: room.winningTeamId,
    lastActionMessage: room.lastActionMessage,
    updatedAt: room.updatedAt,
  };
}
