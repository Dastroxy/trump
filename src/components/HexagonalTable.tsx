import React from 'react';
import { Player, Team, Trick, Suit, PlayedCard } from '../engine/types.ts';
import { CardView } from './CardView.tsx';
import { Avatar } from './Avatar.tsx';

interface HexagonalTableProps {
  players: Record<string, Player>;
  seats: (string | null)[];
  teams: Team[];
  myPlayerId: string;
  dealerSeat: number;
  currentTurnSeat: number | null;
  currentBidderSeat: number | null;
  bids: Record<string, number | null>;
  playerTricks: Record<string, number>;
  currentTrick: Trick | null;
  trumpSuit: Suit | null;
  onSeatSelect?: (seatIndex: number) => void;
  isSeatingPhase?: boolean;
}

export const HexagonalTable: React.FC<HexagonalTableProps> = ({
  players,
  seats,
  teams,
  myPlayerId,
  dealerSeat,
  currentTurnSeat,
  currentBidderSeat,
  bids,
  playerTricks,
  currentTrick,
  onSeatSelect,
  isSeatingPhase = false,
}) => {
  // Hexagonal seat positions in order around table (0 to 5)
  // 0: Top (P1)
  // 1: Top-Right (P2)
  // 2: Bottom-Right (P3)
  // 3: Bottom (P4) - Opposite 0
  // 4: Bottom-Left (P5) - Opposite 1
  // 5: Top-Left (P6) - Opposite 2
  const seatPositions = [
    { top: '4%', left: '50%', transform: 'translate(-50%, 0)' }, // Seat 0 (P1)
    { top: '24%', right: '4%', transform: 'translate(0, 0)' }, // Seat 1 (P2)
    { bottom: '24%', right: '4%', transform: 'translate(0, 0)' }, // Seat 2 (P3)
    { bottom: '4%', left: '50%', transform: 'translate(-50%, 0)' }, // Seat 3 (P4)
    { bottom: '24%', left: '4%', transform: 'translate(0, 0)' }, // Seat 4 (P5)
    { top: '24%', left: '4%', transform: 'translate(0, 0)' }, // Seat 5 (P6)
  ];

  const getTeamForSeat = (seatIndex: number): Team | undefined => {
    return teams.find((t) => t.seats.includes(seatIndex));
  };

  return (
    <div className="relative w-full max-w-4xl aspect-[4/3] sm:aspect-[16/11] mx-auto p-4 flex items-center justify-center select-none">
      {/* Table Surface with Hexagonal / Circular Felt styling */}
      <div className="absolute inset-4 sm:inset-8 rounded-[48px] border-2 border-slate-700/60 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 shadow-[inset_0_0_80px_rgba(0,0,0,0.8),0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Subtle felt texture and rings */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15)_0,transparent_70%)]" />
        <div className="absolute inset-8 rounded-[36px] border border-slate-800/40 pointer-events-none" />
        <div className="absolute inset-16 rounded-[24px] border border-cyan-500/10 pointer-events-none" />

        {/* Opposite Team Connection Lines */}
        {teams.length === 3 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            {/* Team 1: Seat 0 to Seat 3 */}
            <line x1="50%" y1="12%" x2="50%" y2="88%" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 4" />
            {/* Team 2: Seat 1 to Seat 4 */}
            <line x1="88%" y1="30%" x2="12%" y2="70%" stroke="#34d399" strokeWidth="1" strokeDasharray="4 4" />
            {/* Team 3: Seat 2 to Seat 5 */}
            <line x1="88%" y1="70%" x2="12%" y2="30%" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        )}
      </div>

      {/* Center Trick Arena */}
      <div className="relative z-20 w-64 sm:w-80 h-44 sm:h-52 rounded-2xl bg-slate-900/80 border border-slate-700/80 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center p-3">
        {currentTrick && currentTrick.cards.length > 0 ? (
          <div className="w-full h-full flex flex-col justify-between">
            {/* Led Suit and Trick Header */}
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-1 w-full">
              <span>LED: <strong className="text-slate-200 uppercase">{currentTrick.ledSuit || '—'}</strong></span>
              <span>CARDS: {currentTrick.cards.length} / 6</span>
            </div>

            {/* Played Cards in Trick */}
            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 my-1 overflow-x-auto py-1">
              {currentTrick.cards.map((pCard: PlayedCard, idx: number) => {
                const isWinningCard = currentTrick.winningCard?.id === pCard.card.id;
                return (
                  <div
                    key={`${pCard.card.id}-${idx}`}
                    className={`flex flex-col items-center transition-transform duration-300 ${
                      isWinningCard ? 'scale-110 -translate-y-1' : ''
                    }`}
                  >
                    <CardView card={pCard.card} size="sm" isLegal={true} />
                    <span className="text-[10px] font-medium text-slate-400 truncate max-w-[50px] mt-0.5">
                      {pCard.playerName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Winner banner on trick resolution */}
            {currentTrick.winnerPlayerId && (
              <div className="w-full text-center text-xs py-0.5 font-bold rounded bg-cyan-950/80 border border-cyan-500/50 text-cyan-300">
                {players[currentTrick.winnerPlayerId]?.name} TAKES TRICK
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-500 text-xs font-mono">
            <div className="w-8 h-8 rounded-full border border-slate-700 flex items-center justify-center mb-1.5 opacity-60">
              <div className="w-2 h-2 rounded-full bg-cyan-400/50" />
            </div>
            <span>TRICK CENTER</span>
          </div>
        )}
      </div>

      {/* 6 Seating Nodes around the Table */}
      {seatPositions.map((pos, seatIndex) => {
        const playerId = seats[seatIndex];
        const player = playerId ? players[playerId] : null;
        const isMySeat = playerId === myPlayerId;
        const isDealer = dealerSeat === seatIndex;
        const isActiveTurn = currentTurnSeat === seatIndex;
        const isActiveBidder = currentBidderSeat === seatIndex;
        const team = getTeamForSeat(seatIndex);
        const bid = player ? bids[player.id] : null;
        const tricks = player ? playerTricks[player.id] || 0 : 0;

        return (
          <div
            key={`seat-${seatIndex}`}
            style={pos}
            className="absolute z-30 flex flex-col items-center"
          >
            {/* Seat Container */}
            <div
              onClick={() => isSeatingPhase && !player && onSeatSelect?.(seatIndex)}
              className={`
                relative p-2 rounded-xl transition-all duration-300
                flex flex-col items-center min-w-[84px] sm:min-w-[105px]
                ${
                  player
                    ? 'bg-slate-900/90 border border-slate-700/90 shadow-lg'
                    : isSeatingPhase
                    ? 'bg-slate-900/50 border-2 border-dashed border-cyan-500/40 hover:border-cyan-400 hover:bg-slate-800/80 cursor-pointer'
                    : 'bg-slate-950/40 border border-slate-800/50 opacity-50'
                }
                ${
                  isActiveTurn
                    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_16px_rgba(251,191,36,0.3)] animate-pulse'
                    : isActiveBidder
                    ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950'
                    : ''
                }
              `}
            >
              {/* Dealer Button Badge */}
              {isDealer && (
                <div
                  title="Current Dealer"
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-md border border-amber-300"
                >
                  D
                </div>
              )}

              {/* Team Pill if assigned */}
              {team && (
                <div
                  style={{ backgroundColor: `${team.color}25`, borderColor: team.color, color: team.color }}
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border mb-1"
                >
                  {team.name}
                </div>
              )}

              {/* Player Avatar or Empty Seat */}
              {player ? (
                <div className="flex flex-col items-center">
                  <Avatar
                    avatarId={player.avatar}
                    size="sm"
                    className={`sm:w-10 sm:h-10 ${
                      isMySeat ? 'ring-2 ring-cyan-400 shadow-cyan-400/50' : ''
                    }`}
                  />

                  <span className="text-xs font-semibold text-slate-200 mt-1 truncate max-w-[80px] sm:max-w-[100px]">
                    {player.name} {isMySeat && '(You)'}
                  </span>

                  {/* Bid and Trick counter */}
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono">
                    {bid !== null && bid !== undefined && (
                      <span className="text-amber-400 font-bold">BID: {bid}</span>
                    )}
                    {tricks > 0 && (
                      <span className="text-emerald-400 font-bold">W: {tricks}</span>
                    )}
                  </div>
                </div>
              ) : isSeatingPhase ? (
                <div className="flex flex-col items-center py-1">
                  <span className="text-xs font-mono font-bold text-cyan-400">SEAT {seatIndex + 1}</span>
                  <span className="text-[10px] text-slate-400">Tap to Sit</span>
                </div>
              ) : (
                <span className="text-[11px] font-mono text-slate-500 py-1">Seat {seatIndex + 1}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
