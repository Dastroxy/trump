import React, { useMemo } from 'react';
import {
  Player,
  Team,
  Card,
  Suit,
  Trick,
  GamePhase,
} from '../engine/types.ts';
import { PlayerHand } from './PlayerHand.tsx';
import { CardView } from './CardView.tsx';
import { Avatar } from './Avatar.tsx';
import { SuitIcon } from '../utils/suitIcons.tsx';
import { Crown } from 'lucide-react';

interface GameplayViewProps {
  players: Record<string, Player>;
  teams: Team[];
  myPlayerId: string;
  myTeamId: string | null;
  phase: GamePhase;
  teamScores: Record<string, number>;
  teamBids: Record<string, number | null>;
  teamTricks: Record<string, number>;
  teamBags: Record<string, number>;
  bids: Record<string, number | null>;
  playerTricks: Record<string, number>;
  currentTurnSeat: number | null;
  currentBidderSeat: number | null;
  currentTrick: Trick | null;
  trumpSuit: Suit | null;
  lastActionMessage: string | null;
  myHand: Card[];
  isMyTurn: boolean;
  onPlayCard: (cardId: string) => void;
}

const SUIT_ORDER: Record<string, number> = {
  spades: 1,
  hearts: 2,
  clubs: 3,
  diamonds: 4,
  none: 5,
};

export const GameplayView: React.FC<GameplayViewProps> = ({
  players,
  teams,
  myPlayerId,
  myTeamId,
  phase,
  teamScores,
  teamBids,
  teamTricks,
  teamBags,
  bids,
  playerTricks,
  currentTurnSeat,
  currentBidderSeat,
  currentTrick,
  trumpSuit,
  lastActionMessage,
  myHand,
  isMyTurn,
  onPlayCard,
}) => {
  const playerList: Player[] = Object.values(players);
  const activePlayer = playerList.find((p: Player) =>
    phase === 'BIDDING'
      ? p.seatIndex === currentBidderSeat
      : p.seatIndex === currentTurnSeat
  );

  // Sorted hand for clean pip grouping & descending rank
  const sortedHand = useMemo(() => {
    return [...myHand].sort((a, b) => {
      const orderA = a.isJoker ? 0 : SUIT_ORDER[a.suit] ?? 9;
      const orderB = b.isJoker ? 0 : SUIT_ORDER[b.suit] ?? 9;
      if (orderA !== orderB) return orderA - orderB;
      return b.value - a.value;
    });
  }, [myHand]);

  // ----------------------------------------------------
  // PHASE: BIDDING
  // Cards on TOP of screen, followed by Teams Info showing total placed bids.
  // No waiting section. BiddingModal will pop up when it's the player's turn.
  // ----------------------------------------------------
  if (phase === 'BIDDING') {
    return (
      <div className="w-full flex-1 flex flex-col justify-start p-2 sm:p-4 max-w-4xl mx-auto select-none">
        {/* TOP OF SCREEN: DEALT CARDS (Organized, 100% Opaque, Zero Overlap) */}
        <div className="w-full bg-white border border-slate-300 rounded-2xl p-2.5 sm:p-3 shadow-xs mb-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-slate-900 tracking-wider">
                Your Hand ({sortedHand.length} Cards)
              </span>
              <span className="text-[10px] text-slate-500 font-medium hidden xs:inline">
                Inspect your cards to decide your bid
              </span>
            </div>

            {trumpSuit && (
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-xs font-bold text-slate-800">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Trump:</span>
                <SuitIcon suit={trumpSuit} size={13} />
                <span className="uppercase text-[11px]">{trumpSuit}</span>
              </div>
            )}
          </div>

          {/* Cards Container: No overlap, fully visible, crisp colored pips */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-full py-1">
            {sortedHand.map((card) => (
              <div key={card.id} className="transition-transform hover:scale-105">
                <CardView
                  card={card}
                  isLegal={true}
                  dimmed={false}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Action / Notification Banner */}
        {lastActionMessage && (
          <div className="w-full text-center text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200 py-1 px-3 rounded-full shadow-2xs mb-2 truncate">
            {lastActionMessage}
          </div>
        )}

        {/* TEAMS INFO SECTION: Shows Total Bids Placed & Member Statuses */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide">
              Teams & Bids Placed
            </h2>
            <div className="text-[11px] font-medium text-slate-500">
              Current Bidder:{' '}
              <strong className="text-blue-700 font-bold">
                {activePlayer?.name || 'Player'}
              </strong>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full">
            {teams.map((t) => {
              const score = teamScores[t.id] ?? 0;
              const isMyTeam = t.id === myTeamId;

              const p1 = players[t.playerIds[0]];
              const p2 = players[t.playerIds[1]];

              const b1 = p1 ? bids[p1.id] : null;
              const b2 = p2 ? bids[p2.id] : null;

              const placedBids = [b1, b2].filter(
                (b) => b !== null && b !== undefined
              ) as number[];
              const bothPlaced = placedBids.length === 2;
              const totalPlaced = placedBids.reduce((sum, b) => sum + b, 0);

              return (
                <div
                  key={t.id}
                  className={`p-3 rounded-2xl bg-white border-2 flex flex-col justify-between shadow-2xs transition-all ${
                    isMyTeam ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                  }`}
                >
                  {/* Team Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="font-black text-xs uppercase text-slate-800 tracking-tight">
                        {t.name}
                      </span>
                      {isMyTeam && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-600 text-white shadow-2xs">
                          YOU
                        </span>
                      )}
                    </div>

                    <span className="font-mono font-black text-xs text-slate-900">
                      {score} pts
                    </span>
                  </div>

                  {/* Total Team Bid Placed Badge */}
                  <div className="flex items-center justify-between text-xs font-mono mb-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <span className="text-slate-600 font-bold text-[11px]">TOTAL BID:</span>
                    <span className="font-mono font-black text-xs text-blue-700">
                      {bothPlaced
                        ? `${totalPlaced} Tricks`
                        : placedBids.length > 0
                        ? `${totalPlaced} (${placedBids.length}/2 placed)`
                        : 'Pending'}
                    </span>
                  </div>

                  {/* Both Team Members Status */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[p1, p2].map((p, idx) => {
                      if (!p) return null;
                      const isMe = p.id === myPlayerId;
                      const playerBid = bids[p.id];
                      const isBiddingNow = p.seatIndex === currentBidderSeat;

                      return (
                        <div
                          key={p.id || idx}
                          className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all ${
                            isBiddingNow
                              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300 shadow-2xs'
                              : isMe
                              ? 'bg-blue-50/60 border-blue-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="relative mb-1">
                            <Avatar avatarId={p.avatar} size="xs" />
                            {isBiddingNow && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            )}
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 truncate max-w-[85px] mb-1">
                            {p.name}
                          </span>

                          {/* Member Bid Status */}
                          {isBiddingNow ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold animate-pulse">
                              Bidding...
                            </span>
                          ) : playerBid !== null && playerBid !== undefined ? (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-bold font-mono">
                              {playerBid === 0 ? 'Nil' : `Bid: ${playerBid}`}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-mono">
                              Waiting
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // PHASES: TRICK_PLAY, TRICK_RESOLUTION, GAME_SCORING
  // Layout: Center cards on top, Player's Hand, Teams & info at the bottom
  // ----------------------------------------------------
  return (
    <div className="w-full flex-1 flex flex-col justify-start p-2 sm:p-4 max-w-4xl mx-auto select-none gap-2.5">
      {/* Action / Notification Pill */}
      {lastActionMessage && (
        <div className="w-full text-center text-xs font-semibold text-slate-700 bg-white/80 border border-slate-200 py-1 px-3 rounded-full shadow-2xs truncate">
          {lastActionMessage}
        </div>
      )}

      {/* TOP: Center Cards (Trick Mat Arena) */}
      <div className="w-full bg-white border border-slate-300 rounded-2xl p-2.5 sm:p-3.5 shadow-xs flex flex-col items-center">
        {/* Trick Header Bar: Clean, Minimal, Unclustered */}
        <div className="w-full flex items-center justify-between border-b border-slate-100 pb-1.5 mb-2 px-0.5">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-xs font-mono font-bold text-slate-800 tracking-wide">
              Trick {currentTrick?.trickNumber || 1}/9
            </span>
            {currentTrick?.ledSuit && (
              <div className="flex items-center gap-1 text-xs text-slate-700">
                <span className="text-slate-400 font-medium text-[11px]">Led:</span>
                <SuitIcon suit={currentTrick.ledSuit} size={14} />
                <span className="capitalize font-semibold text-slate-800">{currentTrick.ledSuit}</span>
              </div>
            )}
          </div>

          {trumpSuit && (
            <div className="flex items-center gap-1 text-xs text-slate-700">
              <span className="text-slate-400 font-medium text-[11px]">Trump:</span>
              <SuitIcon suit={trumpSuit} size={14} />
              <span className="capitalize font-semibold text-slate-800">{trumpSuit}</span>
            </div>
          )}
        </div>

        {/* Center Cards In Play */}
        <div className="w-full min-h-[105px] sm:min-h-[125px] flex items-center justify-center py-1">
          {currentTrick && currentTrick.cards.length > 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {currentTrick.cards.map((played, idx) => {
                const player = players[played.playerId];
                const isWinningCard = currentTrick.winningPlayerId === played.playerId;

                return (
                  <div
                    key={played.card.id || idx}
                    className="flex flex-col items-center relative"
                  >
                    {isWinningCard && (
                      <div className="absolute -top-2 flex items-center gap-0.5 bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-bold text-[9px] shadow-2xs z-20">
                        <Crown className="w-2.5 h-2.5" />
                        <span>WINNING</span>
                      </div>
                    )}
                    <CardView
                      card={played.card}
                      size="sm"
                      className={isWinningCard ? 'ring-3 ring-amber-400 shadow-md' : ''}
                    />
                    <div className="flex items-center gap-1 mt-1">
                      <Avatar avatarId={player?.avatar || 'avatar_1'} size="xs" />
                      <span className="text-[11px] font-bold text-slate-800 truncate max-w-[65px]">
                        {player?.name || 'Player'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-3">
              <div className="text-xs sm:text-sm font-bold text-slate-700">
                Waiting for {activePlayer?.name || 'player'} to lead trick {currentTrick?.trickNumber || 1}...
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Must follow led suit if held in hand
              </div>
            </div>
          )}
        </div>

        {/* Turn Status Indicator */}
        <div className="w-full pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-600">
            {isMyTurn ? (
              <strong className="text-blue-700 font-bold">Your turn to play!</strong>
            ) : (
              <span>
                Turn:{' '}
                <strong className="text-slate-800">
                  {activePlayer?.name || 'Player'}
                </strong>
              </span>
            )}
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            {currentTrick ? `${currentTrick.cards.length} / 6 Cards Played` : ''}
          </span>
        </div>
      </div>

      {/* MIDDLE: Player's Hand (Sorted by Pip Group & Order, Non-Overlapping) */}
      <PlayerHand
        hand={myHand}
        currentTrick={currentTrick}
        isMyTurn={isMyTurn}
        trumpSuit={trumpSuit}
        onPlayCard={onPlayCard}
      />

      {/* BOTTOM: Teams & Info (Scores, Bids, Tricks & Members) */}
      <div className="w-full pt-1 border-t border-slate-200/80">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 px-1">
          Teams & Scores
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 w-full">
          {teams.map((t) => {
            const score = teamScores[t.id] ?? 0;
            const tricks = teamTricks[t.id] ?? 0;
            const bid = teamBids[t.id];
            const bags = teamBags[t.id] ?? 0;
            const isMyTeam = t.id === myTeamId;

            const p1 = players[t.playerIds[0]];
            const p2 = players[t.playerIds[1]];

            return (
              <div
                key={t.id}
                className={`p-2.5 rounded-2xl bg-white border-2 flex flex-col justify-between shadow-2xs transition-all ${
                  isMyTeam ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200'
                }`}
              >
                {/* Team Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="font-black text-xs uppercase text-slate-800 tracking-tight">
                      {t.name}
                    </span>
                    {isMyTeam && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-600 text-white shadow-2xs">
                        YOU
                      </span>
                    )}
                  </div>

                  <span className="font-mono font-black text-xs text-slate-900">
                    {score} pts
                  </span>
                </div>

                {/* Team Bids & Tricks Summary */}
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 px-0.5 mb-1.5">
                  <span>
                    Tricks: <strong className="text-slate-900">{tricks}</strong> / {bid !== null && bid !== undefined ? bid : '?'}
                  </span>
                  {bags > 0 && (
                    <span className="text-amber-700 font-semibold">
                      {bags} bag{bags > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Both Team Members */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[p1, p2].map((p, idx) => {
                    if (!p) return null;
                    const isMe = p.id === myPlayerId;
                    const playerBid = bids[p.id];
                    const pTricks = playerTricks[p.id] ?? 0;
                    const isTurn = p.seatIndex === currentTurnSeat;

                    return (
                      <div
                        key={p.id || idx}
                        className={`p-1.5 rounded-xl border flex flex-col items-center text-center transition-all ${
                          isTurn
                            ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-300 shadow-2xs'
                            : isMe
                            ? 'bg-blue-50/60 border-blue-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="relative mb-0.5">
                          <Avatar avatarId={p.avatar} size="xs" />
                          {isTurn && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                          )}
                        </div>
                        <span className="text-[11px] font-bold text-slate-800 truncate max-w-[80px]">
                          {p.name}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 mt-0.5">
                          <span className="font-semibold text-slate-700">
                            {playerBid !== null && playerBid !== undefined
                              ? playerBid === 0
                                ? 'Nil'
                                : `Bid ${playerBid}`
                              : 'Bid ?'}
                          </span>
                          <span>•</span>
                          <span>{pTricks}tk</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
