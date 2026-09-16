import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  advanceToNextGame,
  autoAssignUnseatedBots,
  createGameRoom,
  fillRemainingSeatsWithBots,
  initializeTeams,
  joinGameRoom,
  playPlayerCard,
  sanitizeStateForPlayer,
  selectPlayerSeat,
  setRoomUpdateListener,
  startNewGameRound,
  submitPlayerBid,
  updateGameSettings,
} from './src/engine/engine.ts';
import { runAllEngineTests } from './src/engine/engine.test.ts';
import { GameRoomState } from './src/engine/types.ts';

const PORT = 3000;

// In-memory authoritative rooms store
const rooms: Record<string, GameRoomState> = {};

// SSE connections: roomId -> map of playerId -> Response
const roomSubscribers: Record<string, Map<string, Response>> = {};

function notifySubscribers(roomId: string) {
  const room = rooms[roomId];
  if (!room) return;

  const subscribers = roomSubscribers[roomId];
  if (!subscribers) return;

  for (const [playerId, res] of subscribers.entries()) {
    try {
      const sanitized = sanitizeStateForPlayer(room, playerId);
      res.write(`data: ${JSON.stringify(sanitized)}\n\n`);
    } catch {
      subscribers.delete(playerId);
    }
  }
}

// Connect engine asynchronous event notifications directly to real-time subscribers
setRoomUpdateListener((roomId) => {
  notifySubscribers(roomId);
});

// Helper to generate 6-character room codes
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Automated Engine Tests endpoint
  app.get('/api/engine/test', (_req, res) => {
    try {
      const testReport = runAllEngineTests();
      res.json(testReport);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create Room
  app.post('/api/rooms', (req: Request, res: Response) => {
    const { hostId, hostName, hostAvatar, settings } = req.body;
    if (!hostId || !hostName) {
      res.status(400).json({ error: 'Missing host information' });
      return;
    }

    let code = generateRoomCode();
    while (rooms[code]) {
      code = generateRoomCode();
    }

    const newRoom = createGameRoom(
      code,
      { id: hostId, name: hostName, avatar: hostAvatar || 'avatar-1' },
      settings
    );
    rooms[code] = newRoom;

    res.json({
      roomId: code,
      state: sanitizeStateForPlayer(newRoom, hostId),
    });
  });

  // Get Room State
  app.get('/api/rooms/:roomId', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const playerId = (req.query.playerId as string) || '';
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    res.json(sanitizeStateForPlayer(room, playerId));
  });

  // Join Room
  app.post('/api/rooms/:roomId/join', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { playerId, name, avatar } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const result = joinGameRoom(room, {
      id: playerId,
      name,
      avatar: avatar || 'avatar-1',
    });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, playerId));
  });

  // Update Settings (Host Only)
  app.post('/api/rooms/:roomId/settings', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { requesterId, settings } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const result = updateGameSettings(room, requesterId, settings);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, requesterId));
  });

  // Fill remaining slots with AI Bots
  app.post('/api/rooms/:roomId/fill-bots', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { requesterId } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (!room.players[requesterId]?.isHost) {
      res.status(403).json({ error: 'Only host can fill with bots' });
      return;
    }

    fillRemainingSeatsWithBots(room);
    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, requesterId));
  });

  // Start Seating Phase
  app.post('/api/rooms/:roomId/start-seating', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { requesterId } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (!room.players[requesterId]?.isHost) {
      res.status(403).json({ error: 'Only host can start seating' });
      return;
    }

    const pCount = Object.keys(room.players).length;
    if (pCount < 6) {
      res.status(400).json({ error: 'Need 6 players to start seating' });
      return;
    }

    room.phase = 'SEATING';
    room.lastActionMessage = 'Choose your seats around the table!';
    room.updatedAt = Date.now();

    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, requesterId));
  });

  // Select Seat
  app.post('/api/rooms/:roomId/seat', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { playerId, seatIndex } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const result = selectPlayerSeat(room, playerId, seatIndex);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    // Auto-assign any unseated bots
    autoAssignUnseatedBots(room);

    // If all 6 seats filled, form teams
    const allSeated = room.seats.every((s) => s !== null);
    if (allSeated && room.teams.length === 0) {
      initializeTeams(room);
      room.phase = 'TEAM_REVEAL';
      room.lastActionMessage = 'Teams formed based on opposite seats! Ready to deal.';
      room.updatedAt = Date.now();
    }

    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, playerId));
  });

  // Start Game / Deal (Host confirms from Team Reveal)
  app.post('/api/rooms/:roomId/start-game', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { requesterId } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    if (!room.players[requesterId]?.isHost) {
      res.status(403).json({ error: 'Only host can start the game' });
      return;
    }

    startNewGameRound(room);
    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, requesterId));
  });

  // Submit Bid
  app.post('/api/rooms/:roomId/bid', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { playerId, bid } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const result = submitPlayerBid(room, playerId, bid);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, playerId));
  });

  // Play Card
  app.post('/api/rooms/:roomId/play', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { playerId, cardId } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const result = playPlayerCard(room, playerId, cardId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, playerId));
  });

  // Advance to Next Game (Host Only)
  app.post('/api/rooms/:roomId/next-game', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const { requesterId } = req.body;
    const room = rooms[roomId];

    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const result = advanceToNextGame(room, requesterId);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    notifySubscribers(roomId);
    res.json(sanitizeStateForPlayer(room, requesterId));
  });

  // SSE Stream for Instant Real-Time Synchronization
  app.get('/api/rooms/:roomId/events', (req: Request, res: Response) => {
    const roomId = req.params.roomId.toUpperCase();
    const playerId = (req.query.playerId as string) || '';

    const room = rooms[roomId];
    if (!room) {
      res.status(404).send('Room not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    if (!roomSubscribers[roomId]) {
      roomSubscribers[roomId] = new Map();
    }
    roomSubscribers[roomId].set(playerId, res);

    // Send initial state immediately
    const sanitized = sanitizeStateForPlayer(room, playerId);
    res.write(`data: ${JSON.stringify(sanitized)}\n\n`);

    req.on('close', () => {
      roomSubscribers[roomId]?.delete(playerId);
      if (roomSubscribers[roomId]?.size === 0) {
        delete roomSubscribers[roomId];
      }
    });
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HexaTrump Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
