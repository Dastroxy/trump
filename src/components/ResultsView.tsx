import React, { useState, useEffect } from 'react';
import { Team, TeamScoreHistory, Player } from '../engine/types.ts';
import { Trophy, ArrowLeft, Award, Table, Layers, CheckCircle, XCircle } from 'lucide-react';
import { sound } from '../utils/sound.ts';
import { SuitIcon } from '../utils/suitIcons.tsx';

interface ResultsViewProps {
  winningTeamId: number | null;
  teams: Team[];
  players: Record<string, Player>;
  teamScores: Record<number, number>;
  history: TeamScoreHistory[];
  winningScoreTarget: number;
  onReturnHome: () => void;
}

// Helper to safely extract numeric values whether keys are numbers or strings
const getVal = (record: Record<any, any> | undefined, id: number | string, fallback = 0): number => {
  if (!record) return fallback;
  if (record[id] !== undefined && record[id] !== null) return Number(record[id]);
  if (record[String(id)] !== undefined && record[String(id)] !== null) return Number(record[String(id)]);
  return fallback;
};

export const ResultsView: React.FC<ResultsViewProps> = ({
  winningTeamId,
  teams = [],
  players = {},
  teamScores = {},
  history = [],
  winningScoreTarget,
  onReturnHome,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'table' | 'cards'>('both');

  useEffect(() => {
    sound.playVictory();
  }, []);

  const safeHistory = Array.isArray(history) ? history : [];

  // Compute mathematically accurate final points for each team
  const getAccurateFinalScore = (teamId: number): number => {
    if (safeHistory.length > 0) {
      const lastEntry = safeHistory[safeHistory.length - 1];
      if (lastEntry.accumulatedScores) {
        const acc = getVal(lastEntry.accumulatedScores, teamId, NaN);
        if (!isNaN(acc)) return acc;
      }
      return safeHistory.reduce((sum, h) => sum + getVal(h.roundScores, teamId, 0), 0);
    }
    return getVal(teamScores, teamId, 0);
  };

  const getTeamBags = (teamId: number): number => {
    if (safeHistory.length > 0) {
      const lastEntry = safeHistory[safeHistory.length - 1];
      if (lastEntry.totalBags) {
        return getVal(lastEntry.totalBags, teamId, 0);
      }
    }
    return 0;
  };

  // Sort teams so winning team / highest score is first
  const sortedTeams = [...teams].sort((a, b) => {
    const scoreA = getAccurateFinalScore(a.id);
    const scoreB = getAccurateFinalScore(b.id);
    return scoreB - scoreA;
  });

  const actualWinnerId = winningTeamId ?? (sortedTeams.length > 0 ? sortedTeams[0].id : null);
  const winningTeam = teams.find((t) => t.id === actualWinnerId);

  // Helper to find dealer player's name
  const getDealerName = (dealerSeat: number): string => {
    const playerAtSeat = (Object.values(players) as Player[]).find((p) => p.seatIndex === dealerSeat);
    return playerAtSeat?.name || `Seat ${dealerSeat + 1}`;
  };

  return (
    <div className="w-full flex-1 max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-8 select-none animate-in fade-in duration-300 flex flex-col gap-6">
      {/* Hero Victory Banner */}
      <div className="w-full bg-white rounded-3xl border border-slate-300 shadow-sm p-6 sm:p-8 text-center flex flex-col items-center relative overflow-hidden">
        {/* Accent bar at top with winner's team color */}
        <div
          className="absolute top-0 left-0 right-0 h-2"
          style={{ backgroundColor: winningTeam?.color || '#d97706' }}
        />

        <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-300 text-amber-500 flex items-center justify-center mb-2 shadow-sm">
          <Trophy className="w-8 h-8" />
        </div>

        <span className="text-xs font-mono font-bold tracking-widest text-amber-600 uppercase mb-1">
          Match Champions
        </span>
        <h1
          style={{ color: winningTeam?.color || '#d97706' }}
          className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-1"
        >
          {winningTeam ? winningTeam.name : 'Victory'}
        </h1>

        {winningTeam && (
          <p className="text-sm text-slate-600 font-semibold mb-3">
            {players[winningTeam.playerIds[0]]?.name} & {players[winningTeam.playerIds[1]]?.name}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-mono text-slate-600 bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-full shadow-2xs">
          <span>Target: <strong className="text-slate-900 font-bold">{winningScoreTarget} pts</strong></span>
          <span>•</span>
          <span className="text-blue-700 font-bold">
            {safeHistory.length} Round{safeHistory.length !== 1 ? 's' : ''} Played
          </span>
          <span>•</span>
          <span>Winning Score: <strong className="text-slate-900 font-bold">{getAccurateFinalScore(actualWinnerId ?? 1)} pts</strong></span>
        </div>
      </div>

      {/* Section 1: Final Standings & Cumulative Points Podium */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-700">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Final Match Standings</span>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview & Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3 h-3" />
              <span>Score Sheet</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Round Cards</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {sortedTeams.map((t, index) => {
            const score = getAccurateFinalScore(t.id);
            const isWinner = t.id === actualWinnerId;
            const bags = getTeamBags(t.id);
            const p1 = players[t.playerIds[0]];
            const p2 = players[t.playerIds[1]];

            return (
              <div
                key={t.id}
                className={`p-4 sm:p-5 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                  isWinner
                    ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-300 shadow-md'
                    : 'bg-white border-slate-300 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="font-bold text-sm text-slate-900 uppercase tracking-tight">
                        {t.name}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                        isWinner
                          ? 'bg-amber-500 text-slate-950 shadow-2xs'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {isWinner ? 'WINNER' : `#${index + 1}`}
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 font-medium mb-3">
                    {p1?.name} & {p2?.name}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/80 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-mono">
                    {bags} bag{bags !== 1 ? 's' : ''}
                  </span>
                  <div className="text-right">
                    <span className="font-mono font-black text-2xl text-slate-900 leading-none">
                      {score}
                    </span>
                    <span className="text-xs font-mono text-slate-400 ml-1">pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2A: Complete Score Sheet Matrix Table */}
      {(viewMode === 'both' || viewMode === 'table') && (
        <div className="w-full bg-white rounded-3xl border border-slate-300 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                All Rounds Score Sheet ({safeHistory.length} Round{safeHistory.length !== 1 ? 's' : ''})
              </h2>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Target: {winningScoreTarget} pts to win
            </span>
          </div>

          {safeHistory.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 font-medium font-mono">
              No round history recorded for this match.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600 tracking-wider">
                    <th className="py-3 px-3.5 text-center w-16">Round</th>
                    <th className="py-3 px-3 w-28">Trump</th>
                    <th className="py-3 px-3 w-32">Dealer</th>
                    {teams.map((t) => (
                      <th
                        key={t.id}
                        className="py-3 px-3.5 border-l border-slate-200"
                        style={{ borderTopColor: t.color }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="font-black text-slate-900">{t.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {safeHistory.map((h, rIdx) => {
                    const roundNum = h.gameNumber || rIdx + 1;
                    return (
                      <tr key={rIdx} className="hover:bg-slate-50/60 transition-colors">
                        {/* Round Number */}
                        <td className="py-3 px-3.5 text-center font-bold text-slate-900 bg-slate-50/40">
                          R{roundNum}
                        </td>

                        {/* Trump Suit */}
                        <td className="py-3 px-3">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs font-bold text-slate-800 capitalize">
                            <SuitIcon suit={h.trumpSuit} size={14} />
                            <span>{h.trumpSuit}</span>
                          </div>
                        </td>

                        {/* Dealer */}
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          {getDealerName(h.dealerSeat)} (S{h.dealerSeat + 1})
                        </td>

                        {/* Teams Performance in this Round */}
                        {teams.map((t) => {
                          const roundScore = getVal(h.roundScores, t.id, 0);
                          const cumScore = getVal(h.accumulatedScores, t.id, 0);
                          const teamBid = getVal(h.teamBids, t.id, 0);
                          const teamTricks = getVal(h.teamTricks, t.id, 0);
                          const bagsEarned = getVal(h.bagsEarned, t.id, 0);
                          const isMade = teamTricks >= teamBid;

                          return (
                            <td key={t.id} className="py-3 px-3.5 border-l border-slate-100">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-slate-500 text-[11px]">
                                    Bid <strong>{teamBid}</strong> • Won <strong>{teamTricks}</strong>
                                  </span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                                      roundScore > 0
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : roundScore < 0
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {roundScore >= 0 ? `+${roundScore}` : roundScore}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                                  <span>
                                    {isMade ? (
                                      <span className="text-emerald-700 font-semibold inline-flex items-center gap-0.5">
                                        <CheckCircle className="w-3 h-3 inline" /> Made
                                        {bagsEarned > 0 ? ` (+${bagsEarned}b)` : ''}
                                      </span>
                                    ) : (
                                      <span className="text-rose-700 font-semibold inline-flex items-center gap-0.5">
                                        <XCircle className="w-3 h-3 inline" /> Set
                                      </span>
                                    )}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    Total: {cumScore} pts
                                  </span>
                                </div>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/90 border-t-2 border-slate-300 font-mono font-black text-slate-900">
                    <td colSpan={3} className="py-3 px-4 uppercase text-[11px] tracking-wider text-slate-700">
                      Final Totals After {safeHistory.length} Round{safeHistory.length !== 1 ? 's' : ''}
                    </td>
                    {teams.map((t) => {
                      const finalScore = getAccurateFinalScore(t.id);
                      const bags = getTeamBags(t.id);
                      const isWinner = t.id === actualWinnerId;

                      return (
                        <td
                          key={t.id}
                          className={`py-3 px-3.5 border-l border-slate-300 ${
                            isWinner ? 'bg-amber-100/60' : ''
                          }`}
                        >
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs text-slate-500 font-normal">
                              {bags} bag{bags !== 1 ? 's' : ''}
                            </span>
                            <span className="text-base text-slate-950 font-black">
                              {finalScore} pts {isWinner ? '👑' : ''}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Section 2B: Detailed Round-by-Round Breakdown Cards */}
      {(viewMode === 'both' || viewMode === 'cards') && (
        <div className="w-full bg-white rounded-3xl border border-slate-300 shadow-xs p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-black uppercase tracking-wider text-slate-800">
              Detailed Round-by-Round Analytics ({safeHistory.length} Round{safeHistory.length !== 1 ? 's' : ''})
            </div>
          </div>

          {safeHistory.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500 font-medium">
              No round history recorded yet.
            </div>
          ) : (
            <div className="space-y-4">
              {safeHistory.map((h, rIdx) => {
                const roundNum = h.gameNumber || rIdx + 1;
                return (
                  <div
                    key={rIdx}
                    className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs"
                  >
                    {/* Round Header with Trump Suit & Dealer Info */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xs font-black uppercase text-slate-900 font-mono">
                          Round {roundNum}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          Dealer: <strong>{getDealerName(h.dealerSeat)}</strong> (Seat {h.dealerSeat + 1})
                        </span>
                      </div>

                      {/* Trump Suit Banner */}
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-2xs text-xs font-bold text-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-500">Trump:</span>
                        <SuitIcon suit={h.trumpSuit} size={15} />
                        <span className="uppercase text-[11px] font-black tracking-wide">{h.trumpSuit}</span>
                      </div>
                    </div>

                    {/* 3 Teams Performance in this Round */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {teams.map((t) => {
                        const roundScore = getVal(h.roundScores, t.id, 0);
                        const cumScore = getVal(h.accumulatedScores, t.id, 0);
                        const teamBid = getVal(h.teamBids, t.id, 0);
                        const teamTricks = getVal(h.teamTricks, t.id, 0);
                        const bagsEarned = getVal(h.bagsEarned, t.id, 0);
                        const p1 = players[t.playerIds[0]];
                        const p2 = players[t.playerIds[1]];
                        const nil1 = p1 ? h.nilResults?.[p1.id] : undefined;
                        const nil2 = p2 ? h.nilResults?.[p2.id] : undefined;
                        const isMade = teamTricks >= teamBid;

                        const b1 = p1 ? getVal(h.playerBids, p1.id, 0) : 0;
                        const b2 = p2 ? getVal(h.playerBids, p2.id, 0) : 0;
                        const tk1 = p1 ? getVal(h.playerTricks, p1.id, 0) : 0;
                        const tk2 = p2 ? getVal(h.playerTricks, p2.id, 0) : 0;

                        return (
                          <div
                            key={t.id}
                            className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col justify-between shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: t.color }}
                                  />
                                  <span className="font-bold text-xs text-slate-800 uppercase truncate max-w-[120px]">
                                    {t.name}
                                  </span>
                                </div>

                                {/* Round Score Pill */}
                                <span
                                  className={`text-[11px] font-mono font-black px-2 py-0.5 rounded-md ${
                                    roundScore > 0
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : roundScore < 0
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {roundScore >= 0 ? `+${roundScore}` : roundScore}
                                </span>
                              </div>

                              {/* Contract Bid vs Tricks Won */}
                              <div className="text-xs font-mono text-slate-700 flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5 mb-2 border border-slate-200">
                                <span>Bid: <strong>{teamBid}</strong></span>
                                <span>Won: <strong>{teamTricks}</strong></span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  isMade ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {isMade ? 'MADE' : 'SET'}
                                </span>
                              </div>

                              {/* Player-level Bid and Trick counts */}
                              <div className="text-[11px] font-mono text-slate-500 mb-2 space-y-0.5 bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                                <div className="flex justify-between">
                                  <span className="truncate max-w-[90px]">{p1?.name || 'P1'}:</span>
                                  <span>Bid {b1} • Won {tk1}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="truncate max-w-[90px]">{p2?.name || 'P2'}:</span>
                                  <span>Bid {b2} • Won {tk2}</span>
                                </div>
                              </div>

                              {/* Nil Status if any */}
                              {(nil1 === 'SUCCESS' || nil1 === 'FAILED' || nil2 === 'SUCCESS' || nil2 === 'FAILED') && (
                                <div className="text-[11px] font-mono mb-1.5 text-slate-600">
                                  {nil1 === 'SUCCESS' && <span className="text-emerald-600 block font-bold">✓ {p1?.name} Nil (+100)</span>}
                                  {nil1 === 'FAILED' && <span className="text-rose-600 block font-bold">✗ {p1?.name} Nil Failed (-100)</span>}
                                  {nil2 === 'SUCCESS' && <span className="text-emerald-600 block font-bold">✓ {p2?.name} Nil (+100)</span>}
                                  {nil2 === 'FAILED' && <span className="text-rose-600 block font-bold">✗ {p2?.name} Nil Failed (-100)</span>}
                                </div>
                              )}

                              {bagsEarned > 0 && (
                                <div className="text-[11px] font-mono text-amber-700 mb-1.5 font-medium">
                                  +{bagsEarned} bag{bagsEarned !== 1 ? 's' : ''} earned
                                </div>
                              )}
                            </div>

                            {/* Cumulative Total at Round End */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
                              <span>Total After R{roundNum}:</span>
                              <span className="font-bold text-slate-900">{cumScore} pts</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 3: Return to Lobby Action Button */}
      <div className="w-full flex justify-center py-2 pb-8">
        <button
          onClick={onReturnHome}
          className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md hover:shadow-lg touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Lobby</span>
        </button>
      </div>
    </div>
  );
};


