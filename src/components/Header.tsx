import React, { useState } from 'react';
import { Copy, Check, Link as LinkIcon } from 'lucide-react';
import { GamePhase, Suit } from '../engine/types.ts';
import { sound } from '../utils/sound.ts';

interface HeaderProps {
  roomId: string;
  trumpSuit?: Suit | null;
  currentTrickNumber?: number | null;
  phase?: GamePhase;
  onOpenEngineTests?: () => void;
  connected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedCode(true);
    sound.playCardSelect();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    sound.playCardSelect();
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <header className="h-14 px-3 sm:px-6 bg-slate-100 border-b border-slate-300 flex items-center justify-between text-slate-800 z-40 select-none shadow-xs">
      {/* Left: Room Code & Link */}
      <div className="flex items-center gap-2 sm:gap-3">
        {roomId ? (
          <div className="flex items-center bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs gap-1.5 shadow-2xs">
            <span className="text-slate-500 font-mono text-[11px] font-bold">ROOM</span>
            <span className="font-mono font-bold text-slate-900 tracking-wider">{roomId}</span>
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              className="text-slate-500 hover:text-slate-800 transition-colors p-0.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCopyLink}
              title="Copy Game Link"
              className="text-slate-500 hover:text-blue-600 transition-colors p-0.5 cursor-pointer ml-0.5 border-l border-slate-200 pl-1"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <LinkIcon className="w-3.5 h-3.5" />}
            </button>
          </div>
        ) : (
          <div className="w-1" />
        )}
      </div>

      {/* Right side: kept minimal and clean as requested */}
      <div className="flex items-center" />
    </header>
  );
};
