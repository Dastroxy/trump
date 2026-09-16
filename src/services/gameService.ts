import { doc, getDoc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { db, ensureAuth } from '../firebase';
import {
  advanceToNextGame,
  advanceTrickOrFinishRound,
  autoAssignUnseatedBots,
  createGameRoom,
  fillRemainingSeatsWithBots,
  getBotAction,
  initializeTeams,
  joinGameRoom,
  playPlayerCard,
  sanitizeStateForPlayer,
  selectPlayerSeat,
  startNewGameRound,
  submitPlayerBid,
  updateGameSettings,
} from '../engine/engine';
import { GameRoomState, GameSettings, SanitizedClientState } from '../engine/types';

// Helper to remove any undefined fields before sending to Firestore
function cleanForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Helper to generate 6-character room codes
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Active coordinator timer references
const automationTimers: Record<string, NodeJS.Timeout> = {};

function clearRoomTimers(roomId: string) {
  if (automationTimers[roomId]) {
    clearTimeout(automationTimers[roomId]);
    delete automationTimers[roomId];
  }
}

/**
 * Checks whether this client should act as the authoritative coordinator for bot moves
 * and trick advancement. Primary coordinator is the host; fallback is the lowest-indexed connected human seat.
 */
function isClientCoordinator(room: GameRoomState, myPlayerId: string): boolean {
  const host = Object.values(room.players).find((p) => p.isHost && !p.isBot);
  if (host) {
    return host.id === myPlayerId;
  }
  // Fallback: first non-bot human player in seats or players list
  const firstHuman = Object.values(room.players).find((p) => !p.isBot);
  return firstHuman ? firstHuman.id === myPlayerId : false;
}

/**
 * Executes a Firestore atomic room mutation safely, with fallback to local API if needed.
 */
async function mutateRoomFirestore(
  roomId: string,
  mutateFn: (room: GameRoomState) => { success: boolean; error?: string }
): Promise<GameRoomState> {
  await ensureAuth();
  const roomRef = doc(db, 'rooms', roomId.toUpperCase());

  return await runTransaction(db, async (txn) => {
    const snap = await txn.get(roomRef);
    if (!snap.exists()) {
      throw new Error('Room not found');
    }
    const room = snap.data() as GameRoomState;
    const result = mutateFn(room);
    if (!result.success) {
      throw new Error(result.error || 'Action failed');
    }
    room.updatedAt = Date.now();
    txn.set(roomRef, cleanForFirestore(room));
    return room;
  });
}

export const gameService = {
  /**
   * Host a new game room
   */
  async hostGame(
    hostId: string,
    hostName: string,
    hostAvatar: string,
    settings?: Partial<GameSettings>
  ): Promise<{ roomId: string; state: SanitizedClientState }> {
    try {
      await ensureAuth();
      const code = generateRoomCode();
      const room = createGameRoom(
        code,
        { id: hostId, name: hostName, avatar: hostAvatar || 'avatar-1' },
        settings
      );

      const roomRef = doc(db, 'rooms', code);
      await setDoc(roomRef, cleanForFirestore(room));

      return {
        roomId: code,
        state: sanitizeStateForPlayer(room, hostId),
      };
    } catch (firestoreErr) {
      console.warn('Firestore host failed, trying backend API fallback:', firestoreErr);
      // Fallback to Express backend if running
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostId, hostName, hostAvatar, settings }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create room');
      }
      return await res.json();
    }
  },

  /**
   * Join an existing game room
   */
  async joinGame(
    roomId: string,
    playerId: string,
    name: string,
    avatar: string
  ): Promise<SanitizedClientState> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await ensureAuth();
      const updatedRoom = await mutateRoomFirestore(cleanRoomId, (room) => {
        return joinGameRoom(room, {
          id: playerId,
          name,
          avatar: avatar || 'avatar-1',
        });
      });
      return sanitizeStateForPlayer(updatedRoom, playerId);
    } catch (firestoreErr: any) {
      if (firestoreErr?.message === 'Room not found' || firestoreErr?.message?.includes('not found')) {
        throw new Error('Room not found. Please check the code.');
      }
      console.warn('Firestore join failed, trying backend API fallback:', firestoreErr);
      const res = await fetch(`/api/rooms/${cleanRoomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, name, avatar }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not join room');
      }
      return await res.json();
    }
  },

  /**
   * Fetch current room state once
   */
  async getRoomState(roomId: string, playerId: string): Promise<SanitizedClientState | null> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await ensureAuth();
      const snap = await getDoc(doc(db, 'rooms', cleanRoomId));
      if (snap.exists()) {
        const room = snap.data() as GameRoomState;
        return sanitizeStateForPlayer(room, playerId);
      }
    } catch {}

    // Fallback
    try {
      const res = await fetch(`/api/rooms/${cleanRoomId}?playerId=${playerId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {}

    return null;
  },

  /**
   * Real-time subscription to room changes
   */
  subscribeToRoom(
    roomId: string,
    playerId: string,
    onUpdate: (state: SanitizedClientState) => void,
    onConnectionChange?: (connected: boolean) => void
  ): () => void {
    const cleanRoomId = roomId.trim().toUpperCase();
    let isSubscribed = true;
    let sseSource: EventSource | null = null;

    // Try Firestore onSnapshot
    const roomRef = doc(db, 'rooms', cleanRoomId);
    const unsubscribeFirestore = onSnapshot(
      roomRef,
      (snapshot) => {
        if (!isSubscribed) return;
        if (snapshot.exists()) {
          onConnectionChange?.(true);
          const room = snapshot.data() as GameRoomState;
          const sanitized = sanitizeStateForPlayer(room, playerId);
          onUpdate(sanitized);

          // Handle automations (trick advance, bot bids, bot cards, final-card Joker)
          this.handleRoomAutomations(room, playerId);
        } else {
          onConnectionChange?.(false);
        }
      },
      (err) => {
        console.warn('Firestore snapshot error, trying SSE fallback:', err);
        if (!isSubscribed) return;

        // Fallback to Server-Sent Events
        try {
          sseSource = new EventSource(`/api/rooms/${cleanRoomId}/events?playerId=${playerId}`);
          sseSource.onopen = () => onConnectionChange?.(true);
          sseSource.onmessage = (evt) => {
            try {
              const data = JSON.parse(evt.data);
              onUpdate(data);
              onConnectionChange?.(true);
            } catch {}
          };
          sseSource.onerror = () => onConnectionChange?.(false);
        } catch {}
      }
    );

    return () => {
      isSubscribed = false;
      clearRoomTimers(cleanRoomId);
      unsubscribeFirestore();
      if (sseSource) {
        sseSource.close();
      }
    };
  },

  /**
   * Coordinates bot moves, trick resolution transitions, and final-card Joker plays.
   */
  handleRoomAutomations(room: GameRoomState, myPlayerId: string) {
    const cleanRoomId = room.roomId;
    clearRoomTimers(cleanRoomId);

    // 1. Trick Resolution Advancement
    if (room.phase === 'TRICK_RESOLUTION') {
      if (isClientCoordinator(room, myPlayerId)) {
        automationTimers[cleanRoomId] = setTimeout(async () => {
          try {
            await mutateRoomFirestore(cleanRoomId, (r) => {
              if (r.phase === 'TRICK_RESOLUTION') {
                advanceTrickOrFinishRound(r);
                return { success: true };
              }
              return { success: false, error: 'Not in resolution phase' };
            });
          } catch (e) {
            console.error('Failed to advance trick resolution:', e);
          }
        }, 1600);
      }
      return;
    }

    // 2. Automated Action (Bot Bid, Bot Card, or Final-Card Joker)
    const botAction = getBotAction(room);
    if (!botAction) return;

    // If final-card Joker for this player, auto-play it after brief delay
    if (botAction.type === 'play' && botAction.playerId === myPlayerId) {
      automationTimers[cleanRoomId] = setTimeout(async () => {
        try {
          await this.playCard(cleanRoomId, myPlayerId, botAction.cardId);
        } catch (e) {
          console.error('Failed to auto-play final Joker:', e);
        }
      }, 450);
      return;
    }

    // If it's a bot's turn, the room coordinator triggers it
    if (isClientCoordinator(room, myPlayerId)) {
      if (botAction.type === 'bid') {
        automationTimers[cleanRoomId] = setTimeout(async () => {
          try {
            await this.submitBid(cleanRoomId, botAction.playerId, botAction.bid);
          } catch (e) {
            console.error('Failed to submit bot bid:', e);
          }
        }, 600);
      } else if (botAction.type === 'play') {
        automationTimers[cleanRoomId] = setTimeout(async () => {
          try {
            await this.playCard(cleanRoomId, botAction.playerId, botAction.cardId);
          } catch (e) {
            console.error('Failed to play bot card:', e);
          }
        }, 700);
      }
    }
  },

  /**
   * Update game settings (Host only)
   */
  async updateSettings(
    roomId: string,
    requesterId: string,
    settings: Partial<GameSettings>
  ): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        return updateGameSettings(room, requesterId, settings);
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId, settings }),
      });
    }
  },

  /**
   * Fill empty lobby slots with AI Bots
   */
  async fillBots(roomId: string, requesterId: string): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        if (!room.players[requesterId]?.isHost) {
          return { success: false, error: 'Only host can fill with bots' };
        }
        fillRemainingSeatsWithBots(room);
        return { success: true };
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/fill-bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId }),
      });
    }
  },

  /**
   * Start Seating phase
   */
  async startSeating(roomId: string, requesterId: string): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        if (!room.players[requesterId]?.isHost) {
          return { success: false, error: 'Only host can start seating' };
        }
        const pCount = Object.keys(room.players).length;
        if (pCount < 6) {
          return { success: false, error: 'Need 6 players to start seating' };
        }
        room.phase = 'SEATING';
        room.lastActionMessage = 'Choose your seats around the table!';
        return { success: true };
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/start-seating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId }),
      });
    }
  },

  /**
   * Select a seat at the hexagonal table
   */
  async selectSeat(roomId: string, playerId: string, seatIndex: number): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        const result = selectPlayerSeat(room, playerId, seatIndex);
        if (!result.success) return result;

        autoAssignUnseatedBots(room);

        const allSeated = room.seats.every((s) => s !== null);
        if (allSeated && room.teams.length === 0) {
          initializeTeams(room);
          room.phase = 'TEAM_REVEAL';
          room.lastActionMessage = 'Teams formed based on opposite seats! Ready to deal.';
        }
        return { success: true };
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/seat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, seatIndex }),
      });
    }
  },

  /**
   * Start Game Round (Deals cards and reveals trump)
   */
  async startGame(roomId: string, requesterId: string): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        if (!room.players[requesterId]?.isHost) {
          return { success: false, error: 'Only host can start the game' };
        }
        startNewGameRound(room);
        return { success: true };
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/start-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId }),
      });
    }
  },

  /**
   * Submit a bid
   */
  async submitBid(roomId: string, playerId: string, bid: number): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        return submitPlayerBid(room, playerId, bid);
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, bid }),
      });
    }
  },

  /**
   * Play a card
   */
  async playCard(roomId: string, playerId: string, cardId: string): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        return playPlayerCard(room, playerId, cardId);
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardId }),
      });
    }
  },

  /**
   * Advance to the next game round in the match
   */
  async nextGame(roomId: string, requesterId: string): Promise<void> {
    const cleanRoomId = roomId.trim().toUpperCase();
    try {
      await mutateRoomFirestore(cleanRoomId, (room) => {
        return advanceToNextGame(room, requesterId);
      });
    } catch {
      await fetch(`/api/rooms/${cleanRoomId}/next-game`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId }),
      });
    }
  },
};
