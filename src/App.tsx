/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SanitizedClientState, GameSettings } from './engine/types.ts';
import { Header } from './components/Header.tsx';
import { HomeView } from './components/HomeView.tsx';
import { LobbyView } from './components/LobbyView.tsx';
import { SeatingView } from './components/SeatingView.tsx';
import { GameplayView } from './components/GameplayView.tsx';
import { BiddingModal } from './components/BiddingModal.tsx';
import { RoundScoringModal } from './components/RoundScoringModal.tsx';
import { ResultsView } from './components/ResultsView.tsx';
import { EngineTestModal } from './components/EngineTestModal.tsx';
import { sound } from './utils/sound.ts';
import { gameService } from './services/gameService.ts';

function getOrCreatePlayerId(): string {
  let pid = localStorage.getItem('hexatrump_pid');
  if (!pid) {
    pid = 'p_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem('hexatrump_pid', pid);
  }
  return pid;
}

export default function App() {
  const [playerId] = useState<string>(getOrCreatePlayerId);
  const [playerName, setPlayerName] = useState<string>('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>(() => {
    return localStorage.getItem('trump_avatar') || localStorage.getItem('hexatrump_avatar') || 'av-crown';
  });

  const [clientState, setClientState] = useState<SanitizedClientState | null>(null);
  const [connected, setConnected] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [engineTestModalOpen, setEngineTestModalOpen] = useState<boolean>(false);

  const roomUnsubscribeRef = useRef<(() => void) | null>(null);

  // Sync player profile to localStorage
  const handlePlayerNameChange = (name: string) => {
    setPlayerName(name);
    localStorage.setItem('trump_pname', name);
  };

  const handleSelectAvatar = (avatar: string) => {
    setSelectedAvatar(avatar);
    localStorage.setItem('trump_avatar', avatar);
  };

  // Real-time room subscription helper
  const connectToRoom = useCallback(
    (roomId: string) => {
      if (roomUnsubscribeRef.current) {
        roomUnsubscribeRef.current();
        roomUnsubscribeRef.current = null;
      }

      const unsub = gameService.subscribeToRoom(
        roomId,
        playerId,
        (state) => {
          setClientState(state);
          setConnected(true);
        },
        (isConnected) => {
          setConnected(isConnected);
        }
      );
      roomUnsubscribeRef.current = unsub;
    },
    [playerId]
  );

  // Auto-reconnect if URL has room query or localStorage has saved room
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || localStorage.getItem('hexatrump_last_room');

    if (roomParam) {
      const sanitizedRoom = roomParam.trim().toUpperCase();
      gameService.getRoomState(sanitizedRoom, playerId).then((data) => {
        if (data) {
          setClientState(data);
          localStorage.setItem('hexatrump_last_room', sanitizedRoom);
          connectToRoom(sanitizedRoom);
        }
      }).catch(() => {});
    }

    return () => {
      if (roomUnsubscribeRef.current) {
        roomUnsubscribeRef.current();
        roomUnsubscribeRef.current = null;
      }
    };
  }, [playerId, connectToRoom]);

  // Host Game
  const handleHostGame = async () => {
    try {
      setErrorMessage(null);
      const effectiveName = playerName.trim() || 'Host';
      const result = await gameService.hostGame(
        playerId,
        effectiveName,
        selectedAvatar
      );
      setClientState(result.state);
      localStorage.setItem('hexatrump_last_room', result.roomId);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('room', result.roomId);
      window.history.pushState({}, '', newUrl.toString());
      connectToRoom(result.roomId);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to host game');
    }
  };

  // Join Game
  const handleJoinGame = async (code: string) => {
    try {
      setErrorMessage(null);
      const effectiveName = playerName.trim() || 'Player';
      const state = await gameService.joinGame(
        code,
        playerId,
        effectiveName,
        selectedAvatar
      );
      setClientState(state);
      localStorage.setItem('hexatrump_last_room', code);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('room', code);
      window.history.pushState({}, '', newUrl.toString());
      connectToRoom(code);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not join room');
    }
  };

  // Settings update
  const handleUpdateSettings = async (newSettings: Partial<GameSettings>) => {
    if (!clientState) return;
    try {
      await gameService.updateSettings(clientState.roomId, playerId, newSettings);
    } catch (err: any) {
      console.error('Settings update error:', err);
    }
  };

  // Fill remaining seats with Bots
  const handleFillBots = async () => {
    if (!clientState) return;
    try {
      await gameService.fillBots(clientState.roomId, playerId);
    } catch (err: any) {
      console.error('Fill bots error:', err);
    }
  };

  // Start Seating Phase
  const handleStartSeating = async () => {
    if (!clientState) return;
    try {
      await gameService.startSeating(clientState.roomId, playerId);
    } catch (err: any) {
      console.error('Start seating error:', err);
    }
  };

  // Select Seat
  const handleSelectSeat = async (seatIndex: number) => {
    if (!clientState) return;
    try {
      await gameService.selectSeat(clientState.roomId, playerId, seatIndex);
    } catch (err: any) {
      console.error('Select seat error:', err);
    }
  };

  // Start Game (from Team Reveal)
  const handleStartGame = async () => {
    if (!clientState) return;
    try {
      await gameService.startGame(clientState.roomId, playerId);
    } catch (err: any) {
      console.error('Start game error:', err);
    }
  };

  // Submit Bid
  const handleSubmitBid = async (bid: number) => {
    if (!clientState) return;
    try {
      await gameService.submitBid(clientState.roomId, playerId, bid);
    } catch (err: any) {
      console.error('Submit bid error:', err);
    }
  };

  // Play Card (Confirmed second tap)
  const handlePlayCard = async (cardId: string) => {
    if (!clientState) return;
    try {
      await gameService.playCard(clientState.roomId, playerId, cardId);
    } catch (err: any) {
      console.error('Play card error:', err);
    }
  };

  // Next Game (from Round Scoring)
  const handleNextGame = async () => {
    if (!clientState) return;
    try {
      await gameService.nextGame(clientState.roomId, playerId);
    } catch (err: any) {
      console.error('Next game error:', err);
    }
  };

  // Return to Home
  const handleReturnHome = () => {
    if (roomUnsubscribeRef.current) {
      roomUnsubscribeRef.current();
      roomUnsubscribeRef.current = null;
    }
    setClientState(null);
    localStorage.removeItem('hexatrump_last_room');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.delete('room');
    window.history.pushState({}, '', newUrl.toString());
  };

  const isHost = clientState?.players[playerId]?.isHost ?? false;
  const isMyTurn =
    clientState?.phase === 'TRICK_PLAY' &&
    clientState?.currentTurnSeat !== null &&
    clientState?.seats[clientState.currentTurnSeat] === playerId;

  const isMyBiddingTurn =
    clientState?.phase === 'BIDDING' &&
    clientState?.currentBidderSeat !== null &&
    clientState?.seats[clientState.currentBidderSeat] === playerId;

  // Teammate details for bidding
  const myTeammatePlayer =
    clientState && clientState.myTeammateSeat !== null
      ? clientState.players[clientState.seats[clientState.myTeammateSeat] || '']
      : null;
  const myTeammateBid = myTeammatePlayer ? clientState?.bids[myTeammatePlayer.id] : null;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans antialiased overflow-x-hidden">
      {/* Persistent Header */}
      <Header
        roomId={clientState?.roomId || ''}
        trumpSuit={clientState?.trumpSuit ?? null}
        currentTrickNumber={clientState?.currentTrick?.trickNumber ?? null}
        phase={clientState?.phase || 'LOBBY'}
        onOpenEngineTests={() => {
          sound.playCardSelect();
          setEngineTestModalOpen(true);
        }}
        connected={connected}
      />

      {/* Main Content Area */}
      <main
        className={`flex-1 flex flex-col items-center relative ${
          clientState?.phase === 'MATCH_COMPLETE'
            ? 'justify-start overflow-y-auto w-full py-4 sm:py-6'
            : 'justify-center'
        }`}
      >
        {/* Phase 0: Home / Landing Screen */}
        {!clientState && (
          <HomeView
            playerName={playerName}
            onPlayerNameChange={handlePlayerNameChange}
            selectedAvatar={selectedAvatar}
            onSelectAvatar={handleSelectAvatar}
            onHostGame={handleHostGame}
            onJoinGame={handleJoinGame}
            onOpenEngineTests={() => setEngineTestModalOpen(true)}
            errorMessage={errorMessage}
          />
        )}

        {/* Phase 1: Lobby */}
        {clientState && clientState.phase === 'LOBBY' && (
          <LobbyView
            roomId={clientState.roomId}
            players={clientState.players}
            settings={clientState.settings}
            isHost={isHost}
            onUpdateSettings={handleUpdateSettings}
            onFillBots={handleFillBots}
            onStartSeating={handleStartSeating}
          />
        )}

        {/* Phase 2: Seating & Team Reveal */}
        {clientState &&
          (clientState.phase === 'SEATING' || clientState.phase === 'TEAM_REVEAL') && (
            <SeatingView
              players={clientState.players}
              seats={clientState.seats}
              teams={clientState.teams}
              myPlayerId={playerId}
              isHost={isHost}
              onSelectSeat={handleSelectSeat}
              onStartGame={handleStartGame}
              isTeamReveal={clientState.phase === 'TEAM_REVEAL'}
            />
          )}

        {/* Phase 3, 4, 5: Bidding, Trick Play, Resolution & Round Scoring */}
        {clientState &&
          (clientState.phase === 'BIDDING' ||
            clientState.phase === 'TRICK_PLAY' ||
            clientState.phase === 'TRICK_RESOLUTION' ||
            clientState.phase === 'GAME_SCORING') && (
            <>
              <GameplayView
                players={clientState.players}
                teams={clientState.teams}
                myPlayerId={playerId}
                myTeamId={clientState.myTeamId}
                phase={clientState.phase}
                teamScores={clientState.teamScores}
                teamBids={clientState.teamBids}
                teamTricks={clientState.teamTricks}
                teamBags={clientState.teamBags}
                bids={clientState.bids}
                playerTricks={clientState.playerTricks}
                currentTurnSeat={clientState.currentTurnSeat}
                currentBidderSeat={clientState.currentBidderSeat}
                currentTrick={clientState.currentTrick}
                trumpSuit={clientState.trumpSuit}
                lastActionMessage={clientState.lastActionMessage}
                myHand={clientState.myHand}
                isMyTurn={isMyTurn}
                onPlayCard={handlePlayCard}
              />

              {/* Bidding Modal popup */}
              {isMyBiddingTurn && (
                <BiddingModal
                  nilBonusEnabled={clientState.settings.nilBonusEnabled}
                  onConfirmBid={handleSubmitBid}
                  myTeammateBid={myTeammateBid}
                  myTeammateName={myTeammatePlayer?.name || null}
                />
              )}

              {/* Round Scoring Modal popup */}
              {clientState.phase === 'GAME_SCORING' && (
                <RoundScoringModal
                  gameNumber={clientState.gameNumber}
                  teams={clientState.teams}
                  players={clientState.players}
                  teamScores={clientState.teamScores}
                  teamBags={clientState.teamBags}
                  historyEntry={clientState.history[clientState.history.length - 1]}
                  history={clientState.history}
                  isHost={isHost}
                  onNextGame={handleNextGame}
                  winningScore={clientState.settings.winningScore}
                />
              )}
            </>
          )}

        {/* Phase 6: Match Complete - Dedicated Full Results Page */}
        {clientState && clientState.phase === 'MATCH_COMPLETE' && (
          <ResultsView
            winningTeamId={clientState.winningTeamId}
            teams={clientState.teams}
            players={clientState.players}
            teamScores={clientState.teamScores}
            history={clientState.history}
            winningScoreTarget={clientState.settings.winningScore}
            onReturnHome={handleReturnHome}
          />
        )}
      </main>

      {/* Engine Automated Test Suite Modal */}
      {engineTestModalOpen && (
        <EngineTestModal onClose={() => setEngineTestModalOpen(false)} />
      )}
    </div>
  );
}
