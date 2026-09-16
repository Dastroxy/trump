import React, { useState } from 'react';
import { Team, TeamScoreHistory, Player } from '../engine/types.ts';
import { ChevronRight, Award, Table, CheckCircle, XCircle } from 'lucide-react';
import { sound } from '../utils/sound.ts';
import { SuitIcon } from '../utils/suitIcons.tsx';

interface RoundScoringModalProps {
  gameNumber: number;
  teams: Team[];
  players: Record<string, Player>;
  teamScores: Record<number, number>;
  teamBags: Record<number, number>;
  historyEntry: TeamScoreHistory | undefined;
  history?: TeamScoreHistory[];
  isHost: boolean;
  onNextGame: () => void;
  winningScore: number;
}

const getVal = (record: Record<any, any> | undefined, id: number | string, fallback = 0): number => {
  if (!record) return fallback;
  if (record[id] !== undefined && record[id] !== null) return Number(record[id]);
  if (record[String(id)] !== undefined && record[String(id)] !== null) return Number(record[String(id)]);
  return fallback;
};

export const RoundScoringModal: React.FC<RoundScoringModalProps> = ({
  gameNumber,
  teams,
  players,
  teamScores,
  teamBags,
  historyEntry,
  history = [],
  isHost,
  onNextGame,
  winningScore,
}) => {
  const [showAllRounds, setShowAllRounds] = useState(false);
  const safeHistory = Array.isArray(history) ? history : [];
  const hasMultipleRounds = safeHistory.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs select-none overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="w-full max-w-2xl bg-white border border-slate-300 rounded-2xl shadow-xl p-4 sm:p-6 flex flex-col my-auto max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                Game {gameNumber} Completed
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                Target Score to Win: {winningScore} pts
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {historyEntry?.trumpSuit && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-full shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trump:</span>
                <SuitIcon suit={historyEntry.trumpSuit} size={15} />
                <span className="text-xs font-bold text-slate-800 capitalize">{historyEntry.trumpSuit}</span>
              </div>
            )}

            {hasMultipleRounds && (
              <button
                onClick={() => setShowAllRounds(!showAllRounds)}
                className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                  showAllRounds
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>{showAllRounds ? 'Current Round' : `All ${safeHistory.length} Rounds`}</span>
              </button>
            )}
          </div>
        </div>

        {/* View Mode: All Rounds Table or Current Round Card Grid */}
        {showAllRounds && hasMultipleRounds ? (
          <div className="mb-5 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase text-slate-600 tracking-wider">
                    <th className="py-2.5 px-3 text-center">Round</th>
                    <th className="py-2.5 px-3">Trump</th>
                    {teams.map((t) => (
                      <th key={t.id} className="py-2.5 px-3 border-l border-slate-200">
                        <span style={{ color: t.color }} className="font-black">
                          {t.name}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {safeHistory.map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center font-bold text-slate-700 bg-slate-50/50">
                        R{h.gameNumber || idx + 1}
                      </td>
                      <td className="py-2 px-3">
                        <div className="inline-flex items-center gap-1 font-bold text-slate-700 capitalize">
                          <SuitIcon suit={h.trumpSuit} size={13} />
                          <span className="text-[11px]">{h.trumpSuit}</span>
                        </div>
                      </td>
                      {teams.map((t) => {
                        const roundPts = getVal(h.roundScores, t.id, 0);
                        const cumScore = getVal(h.accumulatedScores, t.id, 0);
                        const teamBid = getVal(h.teamBids, t.id, 0);
                        const teamTricks = getVal(h.teamTricks, t.id, 0);
                        const isMade = teamTricks >= teamBid;

                        return (
                          <td key={t.id} className="py-2 px-3 border-l border-slate-100 text-[11px]">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-slate-500">
                                {teamTricks}/{teamBid} {isMade ? '✓' : '✗'}
                              </span>
                              <span
                                className={`font-bold ${
                                  roundPts >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {roundPts >= 0 ? `+${roundPts}` : roundPts}
                              </span>
                              <span className="text-slate-900 font-black">
                                ({cumScore}p)
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* 3 Teams Scoreboard for the round that just ended */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            {teams.map((team) => {
              const p1 = players[team.playerIds[0]];
              const p2 = players[team.playerIds[1]];
              const roundPts = getVal(historyEntry?.roundScores, team.id, 0);
              const teamBid = getVal(historyEntry?.teamBids, team.id, 0);
              const teamTricks = getVal(historyEntry?.teamTricks, team.id, 0);
              const totalScore = getVal(teamScores, team.id, 0);
              const bags = getVal(teamBags, team.id, 0);
              const isMade = teamTricks >= teamBid;

              return (
                <div
                  key={team.id}
                  className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span
                        style={{ color: team.color }}
                        className="font-extrabold text-sm uppercase tracking-wider"
                      >
                        {team.name}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {teamTricks} / {teamBid} Bids
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 truncate mb-2">
                      {p1?.name} & {p2?.name}
                    </div>

                    <div className="space-y-1 text-xs border-t border-slate-200/80 pt-2 font-mono">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Contract:</span>
                        <span className={`font-bold text-[11px] ${isMade ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isMade ? 'MADE' : 'FAILED (SET)'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Round Points:</span>
                        <span
                          className={`font-bold ${
                            roundPts >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {roundPts >= 0 ? `+${roundPts}` : roundPts}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">Current Bags:</span>
                        <span className="text-amber-700 font-bold">{bags} / 10</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">TOTAL:</span>
                    <span className="text-xl font-black font-mono text-slate-900">
                      {totalScore}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer / Next Game Action */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">
            Dealer rotates clockwise to next seat.
          </span>

          {isHost ? (
            <button
              onClick={() => {
                sound.playDeal();
                onNextGame();
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-xs tracking-wider uppercase shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation"
            >
              <span>Deal Next Game</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-xs text-slate-500 font-mono italic">
              Waiting for host to deal next game...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

