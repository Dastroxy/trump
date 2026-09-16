import React, { useState } from 'react';
import { Play, LogIn, Sparkles } from 'lucide-react';
import { sound } from '../utils/sound.ts';
import { AVATAR_PRESETS } from './Avatar.tsx';

interface HomeViewProps {
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  selectedAvatar: string;
  onSelectAvatar: (avatar: string) => void;
  onHostGame: () => void;
  onJoinGame: (code: string) => void;
  onOpenEngineTests?: () => void;
  errorMessage?: string | null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  playerName,
  onPlayerNameChange,
  selectedAvatar,
  onSelectAvatar,
  onHostGame,
  onJoinGame,
  errorMessage,
}) => {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    sound.playCardSelect();
    onJoinGame(joinCode.trim().toUpperCase());
  };

  const handleHost = () => {
    if (!playerName.trim()) return;
    sound.playCardSelect();
    onHostGame();
  };

  return (
    <div className="w-full min-h-[calc(100dvh-3.5rem)] flex flex-col items-center justify-center p-3 sm:p-6 select-none relative">
      <div className="w-full max-w-md bg-white border border-slate-300 rounded-3xl shadow-sm p-5 sm:p-8 flex flex-col items-center z-10">
        {/* Brand Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-mono font-bold tracking-widest text-slate-600 uppercase">
            6-Player Trick-Taking Game
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 uppercase tracking-tight text-center mb-6">
          Trump
        </h1>

        {errorMessage && (
          <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs text-center font-medium">
            {errorMessage}
          </div>
        )}

        {/* Player Name Field */}
        <div className="w-full mb-4">
          <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Player Name
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => onPlayerNameChange(e.target.value)}
            placeholder="Enter your name"
            maxLength={18}
            className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-base sm:text-sm font-semibold focus:outline-none focus:border-blue-500 transition-colors shadow-2xs touch-manipulation"
          />
        </div>

        {/* Actual Avatar Selector */}
        <div className="w-full mb-5">
          <label className="block text-xs font-mono font-bold text-slate-700 mb-2 uppercase tracking-wider">
            Select Your Avatar
          </label>
          <div className="grid grid-cols-4 gap-2">
            {AVATAR_PRESETS.map((av) => {
              const isSelected =
                selectedAvatar === av.id ||
                (selectedAvatar === 'av-1' && av.id === 'av-crown') ||
                (selectedAvatar === 'av-2' && av.id === 'av-ghost') ||
                (selectedAvatar === 'av-3' && av.id === 'av-flame') ||
                (selectedAvatar === 'av-4' && av.id === 'av-bot') ||
                (selectedAvatar === 'av-5' && av.id === 'av-skull') ||
                (selectedAvatar === 'av-6' && av.id === 'av-cat');
              const Icon = av.icon;

              return (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    sound.playCardSelect();
                    onSelectAvatar(av.id);
                  }}
                  className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-all duration-150 cursor-pointer min-h-[64px] touch-manipulation active:scale-95 ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title={av.label}
                >
                  <div
                    className={`w-9 h-9 rounded-full bg-gradient-to-br ${av.gradient} flex items-center justify-center shadow-2xs mb-1`}
                  >
                    <Icon className={`w-4 h-4 ${av.iconColor} drop-shadow-xs`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 truncate max-w-full">
                    {av.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action 1: Host Game */}
        <button
          onClick={handleHost}
          disabled={!playerName.trim()}
          className={`w-full min-h-[48px] py-3 rounded-xl font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm transition-all mb-3 touch-manipulation active:scale-[0.99] ${
            playerName.trim()
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 cursor-pointer'
              : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>HOST GAME</span>
        </button>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">OR JOIN WITH CODE</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Action 2: Join Game Form */}
        <form onSubmit={handleJoinSubmit} className="w-full mt-1 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="6-DIGIT CODE"
              maxLength={6}
              className="flex-1 px-3 sm:px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 text-base sm:text-sm font-mono font-bold tracking-widest text-center uppercase focus:outline-none focus:border-blue-500 transition-colors shadow-2xs touch-manipulation"
            />
            <button
              type="submit"
              disabled={!joinCode.trim() || !playerName.trim()}
              className={`min-h-[44px] px-5 rounded-xl font-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 transition-all touch-manipulation active:scale-95 ${
                joinCode.trim() && playerName.trim()
                  ? 'bg-slate-800 hover:bg-slate-900 text-white cursor-pointer shadow-xs'
                  : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>JOIN</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
