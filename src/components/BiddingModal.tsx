import React, { useState } from 'react';
import { sound } from '../utils/sound.ts';
import { Check, Eye, Maximize2 } from 'lucide-react';

interface BiddingModalProps {
  nilBonusEnabled: boolean;
  onConfirmBid: (bid: number) => void;
  myTeammateBid: number | null | undefined;
  myTeammateName: string | null;
}

export const BiddingModal: React.FC<BiddingModalProps> = ({
  nilBonusEnabled,
  onConfirmBid,
  myTeammateBid,
  myTeammateName,
}) => {
  const [selectedBid, setSelectedBid] = useState<number>(nilBonusEnabled ? 0 : 1);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const bidsOptions = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleSelect = (b: number) => {
    if (b === 0 && !nilBonusEnabled) return;
    setSelectedBid(b);
    sound.playCardSelect();
  };

  const handleConfirm = () => {
    sound.playBidConfirm();
    onConfirmBid(selectedBid);
  };

  // Minimized floating action bar allowing full visibility of cards and table
  if (isMinimized) {
    return (
      <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 select-none animate-in slide-in-from-bottom-3 duration-200 w-[calc(100%-1.5rem)] max-w-sm sm:w-auto">
        <div className="bg-slate-900/95 text-white border border-slate-700 backdrop-blur-md rounded-2xl shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between sm:justify-start gap-2 sm:gap-3 touch-manipulation">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider hidden xs:inline">
              Bidding
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-900/80 text-blue-200 border border-blue-700/60">
              Bid: {selectedBid === 0 ? 'Nil' : selectedBid}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                sound.playCardSelect();
                setIsMinimized(false);
              }}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer shadow-sm touch-manipulation"
              title="Reopen bidding window"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Bid</span>
            </button>
            <button
              onClick={handleConfirm}
              className="min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm touch-manipulation"
              title={`Confirm bid of ${selectedBid}`}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Confirm</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs select-none cursor-pointer pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          sound.playCardSelect();
          setIsMinimized(true);
        }
      }}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl p-4 sm:p-6 flex flex-col items-center cursor-default max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Minimize / Check Cards Button */}
        <div className="w-full flex items-center justify-between mb-1">
          <span className="text-[11px] font-mono font-bold tracking-widest text-blue-600 uppercase">
            Your Turn to Bid
          </span>
          <button
            onClick={() => {
              sound.playCardSelect();
              setIsMinimized(true);
            }}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 active:scale-95 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer touch-manipulation min-h-[36px]"
            title="Minimize window to inspect your cards"
          >
            <Eye className="w-3.5 h-3.5 text-slate-500" />
            <span>Check Cards</span>
          </button>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-1">
          Place Your Bid
        </h2>
        <p className="text-xs text-slate-500 text-center mb-4">
          Predict how many of the 9 tricks you will win this round.
        </p>

        {/* Teammate info */}
        {myTeammateName && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Teammate ({myTeammateName}):</span>
            <span className="font-mono font-bold text-slate-900">
              {myTeammateBid !== null && myTeammateBid !== undefined
                ? `Bid ${myTeammateBid}`
                : 'Thinking...'}
            </span>
          </div>
        )}

        {/* 0-9 Bid Buttons Grid */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full mb-4">
          {bidsOptions.map((num) => {
            const isSelected = selectedBid === num;
            const isZeroDisabled = num === 0 && !nilBonusEnabled;

            return (
              <button
                key={num}
                disabled={isZeroDisabled}
                onClick={() => handleSelect(num)}
                className={`
                  min-h-[44px] h-11 sm:h-12 rounded-xl font-mono text-base font-bold transition-all duration-150 flex flex-col items-center justify-center cursor-pointer touch-manipulation active:scale-95
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-105 ring-2 ring-blue-400'
                      : isZeroDisabled
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }
                `}
              >
                <span>{num}</span>
                {num === 0 && (
                  <span className="text-[8px] font-sans uppercase -mt-0.5 tracking-tighter">
                    Nil
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Nil hint if 0 is selected */}
        {selectedBid === 0 && nilBonusEnabled && (
          <div className="w-full mb-3 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-[11px] text-center font-medium">
            Nil: 0 tricks awards +100 pts. Taking 1+ tricks penalizes -100 pts.
          </div>
        )}

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full min-h-[48px] py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-extrabold text-sm tracking-wide shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>CONFIRM BID: {selectedBid}</span>
        </button>
      </div>
    </div>
  );
};
