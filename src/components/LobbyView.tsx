import React, { useState } from 'react';
import { Player, GameSettings } from '../engine/types.ts';
import { Copy, Check, Bot, Play, UserCheck, Settings as SettingsIcon } from 'lucide-react';
import { sound } from '../utils/sound.ts';
import { Avatar } from './Avatar.tsx';

interface LobbyViewProps {
  roomId: string;
  players: Record<string, Player>;
  settings: GameSettings;
  isHost: boolean;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onFillBots: () => void;
  onStartSeating: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  roomId,
  players,
  settings,
  isHost,
  onUpdateSettings,
  onFillBots,
  onStartSeating,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const playerList: Player[] = Object.values(players);
  const totalPlayers = playerList.length;
  const isFull = totalPlayers === 6;

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    sound.playCardSelect();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-6 flex flex-col items-center select-none">
      {/* Header Banner */}
      <div className="text-center mb-5 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
          Lobby
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          6-player trick-taking game • 3 partnership teams
        </p>

        {/* Room Code & Copy Share Link */}
        <div className="flex items-center justify-center gap-2.5 mt-3 sm:mt-4">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 font-mono text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 shadow-2xs">
            <span className="text-xs text-slate-500 font-sans font-semibold">CODE:</span>
            <span className="text-blue-700 tracking-wider font-extrabold">{roomId}</span>
          </div>

          <button
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-full mb-6">
        {/* Left 2 Cols: 6 Player Slots */}
        <div className="lg:col-span-2 bg-white border border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                Players Joined ({totalPlayers} / 6)
              </h2>
            </div>

            {isHost && !isFull && (
              <button
                onClick={() => {
                  sound.playCardSelect();
                  onFillBots();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Fill Empty With Bots</span>
              </button>
            )}
          </div>

          {/* 6 Player Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {Array.from({ length: 6 }).map((_, idx) => {
              const player = playerList[idx];
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center min-h-[105px] transition-all duration-200 ${
                    player
                      ? 'bg-slate-50 border-slate-300 shadow-2xs'
                      : 'bg-slate-100/60 border-dashed border-slate-300 text-slate-400'
                  }`}
                >
                  {player ? (
                    <>
                      <Avatar avatarId={player.avatar} size="md" className="mb-1.5" />
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[110px]">
                        {player.name}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        {player.isHost && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold">
                            HOST
                          </span>
                        )}
                        {player.isBot && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-300 font-bold">
                            BOT
                          </span>
                        )}
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-7 h-7 rounded-full border border-dashed border-slate-400 flex items-center justify-center mb-1 text-slate-400 text-xs font-bold">
                        {idx + 1}
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">Waiting...</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Match Settings */}
        <div className="bg-white border border-slate-300 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
              <SettingsIcon className="w-4 h-4 text-blue-600" />
              <h2 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wide">
                Game Settings
              </h2>
            </div>

            <div className="space-y-4 text-xs">
              {/* Winning Score */}
              <div>
                <label className="text-slate-600 block mb-1.5 font-bold">WINNING SCORE</label>
                <div className="grid grid-cols-3 gap-1.5 font-mono">
                  {([100, 150, 200] as const).map((score) => (
                    <button
                      key={score}
                      disabled={!isHost}
                      onClick={() => {
                        sound.playCardSelect();
                        onUpdateSettings({ winningScore: score });
                      }}
                      className={`py-1.5 rounded-lg border font-bold text-xs transition-colors ${
                        settings.winningScore === score
                          ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
                      } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bags Toggle */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <div className="font-bold text-slate-800">BAGS PENALTY</div>
                  <div className="text-[10px] text-slate-500">10 bags = -100 points</div>
                </div>
                <button
                  disabled={!isHost}
                  onClick={() => {
                    sound.playCardSelect();
                    onUpdateSettings({ bagsEnabled: !settings.bagsEnabled });
                  }}
                  className={`px-3 py-1 rounded-lg font-mono font-bold text-xs border transition-colors ${
                    settings.bagsEnabled
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-slate-100 border-slate-300 text-slate-600'
                  } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {settings.bagsEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Nil Bonus Toggle */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <div>
                  <div className="font-bold text-slate-800">NIL BONUS</div>
                  <div className="text-[10px] text-slate-500">0 bid: +/-100 points</div>
                </div>
                <button
                  disabled={!isHost}
                  onClick={() => {
                    sound.playCardSelect();
                    onUpdateSettings({ nilBonusEnabled: !settings.nilBonusEnabled });
                  }}
                  className={`px-3 py-1 rounded-lg font-mono font-bold text-xs border transition-colors ${
                    settings.nilBonusEnabled
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                      : 'bg-slate-100 border-slate-300 text-slate-600'
                  } ${!isHost ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  {settings.nilBonusEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Permanent Rules */}
              <div className="border-t border-slate-200 pt-3 space-y-1.5 text-[11px] font-mono text-slate-600">
                <div className="flex justify-between">
                  <span>JOKER:</span>
                  <span className="text-purple-700 font-bold">ALWAYS ON</span>
                </div>
                <div className="flex justify-between">
                  <span>SPECIAL 2:</span>
                  <span className="text-blue-700 font-bold">ALWAYS ON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Start Seating Action */}
          <div className="mt-5 pt-3 border-t border-slate-200">
            {isHost ? (
              <button
                disabled={!isFull}
                onClick={() => {
                  sound.playCardSelect();
                  onStartSeating();
                }}
                className={`w-full py-2.5 rounded-xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm transition-all ${
                  isFull
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25 cursor-pointer'
                    : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isFull ? 'START SEATING' : `WAITING FOR ${6 - totalPlayers} MORE`}</span>
              </button>
            ) : (
              <div className="text-center text-xs text-slate-500 font-mono italic py-2">
                Waiting for host to configure and start...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
