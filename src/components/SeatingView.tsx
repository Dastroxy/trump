import React from 'react';
import { Player, Team } from '../engine/types.ts';
import { sound } from '../utils/sound.ts';
import { Avatar } from './Avatar.tsx';
import { Play, Check, Users } from 'lucide-react';

interface SeatingViewProps {
  players: Record<string, Player>;
  seats: (string | null)[];
  teams: Team[];
  myPlayerId: string;
  isHost: boolean;
  onSelectSeat: (seatIndex: number) => void;
  onStartGame: () => void;
  isTeamReveal: boolean;
}

export const SeatingView: React.FC<SeatingViewProps> = ({
  players,
  seats,
  teams,
  myPlayerId,
  isHost,
  onSelectSeat,
  onStartGame,
  isTeamReveal,
}) => {
  const allSeated = seats.every((s) => s !== null);
  const myPlayer = players[myPlayerId];
  const mySeat = myPlayer?.seatIndex ?? null;

  const handleSeatClick = (seatIndex: number) => {
    sound.playCardSelect();
    onSelectSeat(seatIndex);
  };

  // Pair mapping: Seat i pairs with (i + 3) % 6
  const getPartnerSeatNumber = (seatIndex: number) => ((seatIndex + 3) % 6) + 1;
  const getTeamIndex = (seatIndex: number) => (seatIndex % 3) + 1;

  return (
    <div className="w-full max-w-3xl mx-auto p-3 sm:p-6 flex flex-col items-center select-none">
      {/* Instructions / Status Banner */}
      <div className="text-center mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
          {isTeamReveal ? 'Teams Confirmed' : 'Choose Your Seat'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
          {isTeamReveal
            ? 'Opposite seats are paired together into 3 partnership teams of 2 players.'
            : mySeat !== null
            ? `You are seated in Seat ${mySeat + 1}. Waiting for all players to take a seat.`
            : 'Tap any open seat to take your place at the table.'}
        </p>
      </div>

      {/* Seating Cards Grid: Clean & Mobile-Optimized */}
      {!isTeamReveal && (
        <div className="w-full mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {seats.map((playerId, seatIndex) => {
              const player = playerId ? players[playerId] : null;
              const isMySeat = player?.id === myPlayerId;
              const teamNum = getTeamIndex(seatIndex);
              const partnerSeat = getPartnerSeatNumber(seatIndex);

              return (
                <div
                  key={seatIndex}
                  onClick={() => {
                    if (!player || isMySeat) {
                      handleSeatClick(seatIndex);
                    }
                  }}
                  className={`
                    p-3.5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-between min-h-[140px] text-center
                    ${
                      isMySeat
                        ? 'bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-300'
                        : player
                        ? 'bg-white border-slate-200 shadow-2xs'
                        : 'bg-white border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer shadow-2xs'
                    }
                  `}
                >
                  {/* Seat Header */}
                  <div className="w-full flex items-center justify-between text-[11px] font-bold">
                    <span className="font-mono text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      SEAT {seatIndex + 1}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Pairs with Seat {partnerSeat}
                    </span>
                  </div>

                  {/* Seat Occupant */}
                  <div className="my-2 flex flex-col items-center">
                    {player ? (
                      <>
                        <Avatar avatarId={player.avatar} size="md" className="mb-1" />
                        <span className="text-xs font-bold text-slate-900 truncate max-w-[120px]">
                          {player.name}
                        </span>
                        {isMySeat ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white mt-1 shadow-2xs">
                            YOU
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 mt-1">
                            Team {teamNum}
                          </span>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center py-1">
                        <div className="w-10 h-10 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 mb-1">
                          <Users className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-blue-600">
                          Tap to Sit
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Team Tag */}
                  <div className="w-full pt-1.5 border-t border-slate-100 text-[10px] font-semibold text-slate-400">
                    Team {teamNum} Partnership
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 text-center text-xs font-semibold text-slate-500">
            Seats Occupied: {seats.filter(Boolean).length} / 6
          </div>
        </div>
      )}

      {/* Team Reveal Cards: Clean 3 Team Cards */}
      {isTeamReveal && (
        <div className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {teams.map((t) => {
              const p1 = players[t.playerIds[0]];
              const p2 = players[t.playerIds[1]];
              const isMyTeam = t.playerIds.includes(myPlayerId);

              return (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl bg-white border-2 flex flex-col items-center text-center shadow-xs transition-all ${
                    isMyTeam
                      ? 'border-blue-600 ring-2 ring-blue-300'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="font-black text-sm uppercase text-slate-900">
                      {t.name}
                    </span>
                    {isMyTeam && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                        YOUR TEAM
                      </span>
                    )}
                  </div>

                  {/* Two Team Members */}
                  <div className="w-full grid grid-cols-2 gap-2 my-1">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                      <Avatar avatarId={p1?.avatar || 'avatar_1'} size="sm" className="mb-1" />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[90px]">
                        {p1?.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Seat {(p1?.seatIndex ?? 0) + 1}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                      <Avatar avatarId={p2?.avatar || 'avatar_2'} size="sm" className="mb-1" />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[90px]">
                        {p2?.name}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        Seat {(p2?.seatIndex ?? 0) + 1}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-500 font-medium mt-2">
                    Opposite Seats {(p1?.seatIndex ?? 0) + 1} & {(p2?.seatIndex ?? 0) + 1}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Host Start Game button */}
          <div className="flex justify-center">
            {isHost ? (
              <button
                onClick={() => {
                  sound.playDeal();
                  onStartGame();
                }}
                className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm tracking-wider uppercase shadow-md shadow-blue-500/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Deal Cards & Start Game 1</span>
              </button>
            ) : (
              <div className="text-xs text-slate-500 font-semibold italic py-2">
                Waiting for host to deal cards...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
