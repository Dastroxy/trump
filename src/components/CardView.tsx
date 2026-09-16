import React from 'react';
import { Card } from '../engine/types.ts';
import { SuitIcon, getSuitColorClass } from '../utils/suitIcons.tsx';
import { Crown } from 'lucide-react';

interface CardViewProps {
  card?: Card;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isLegal?: boolean;
  dimmed?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  isSelected = false,
  isLegal = true,
  dimmed = false,
  size = 'md',
  onClick,
  className = '',
}) => {
  // Dimension sizing
  const sizeClasses = {
    xs: 'w-8 h-12 text-[10px] rounded-md p-1',
    sm: 'w-11 h-16 sm:w-13 sm:h-18 text-xs rounded-lg p-1',
    md: 'w-14 h-21 sm:w-16 sm:h-24 text-sm rounded-xl p-1.5',
    lg: 'w-18 h-26 sm:w-22 sm:h-32 text-base rounded-xl p-2',
  }[size];

  if (isFaceDown || !card) {
    return (
      <div
        className={`${sizeClasses} bg-blue-900 border-2 border-blue-700 shadow-md relative overflow-hidden flex items-center justify-center select-none ${className}`}
      >
        <div className="absolute inset-1 rounded-sm border border-blue-400/40 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:6px_6px] flex items-center justify-center">
          <div className="w-5 h-7 rounded border border-blue-300/50 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rotate-45 bg-blue-400/60" />
          </div>
        </div>
      </div>
    );
  }

  // Joker Card: Clean design with crown symbol and "Joker" in the middle
  if (card.isJoker) {
    return (
      <div
        id={`card-${card.id}`}
        onClick={isLegal && !dimmed ? onClick : undefined}
        className={`
          ${sizeClasses}
          relative select-none transition-all duration-200
          border-2 flex flex-col items-center justify-center text-center
          bg-white border-amber-400 shadow-xs
          ${
            isSelected
              ? '-translate-y-3 ring-3 ring-blue-600 ring-offset-2 ring-offset-slate-100 shadow-xl shadow-blue-500/30 z-30'
              : dimmed
              ? 'opacity-40 grayscale contrast-75 cursor-not-allowed z-0'
              : isLegal && onClick
              ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer z-10'
              : 'z-10'
          }
          ${className}
        `}
      >
        <Crown
          className={`text-amber-500 shrink-0 drop-shadow-xs ${
            size === 'xs'
              ? 'w-3.5 h-3.5 mb-0.5'
              : size === 'sm'
              ? 'w-5 h-5 mb-1'
              : size === 'lg'
              ? 'w-8 h-8 mb-1.5'
              : 'w-6 h-6 mb-1'
          }`}
        />
        <span
          className={`font-black uppercase tracking-wider text-slate-900 leading-none ${
            size === 'xs'
              ? 'text-[7px]'
              : size === 'sm'
              ? 'text-[10px]'
              : size === 'lg'
              ? 'text-sm'
              : 'text-xs'
          }`}
        >
          Joker
        </span>
      </div>
    );
  }

  const suitColor = getSuitColorClass(card.suit);

  return (
    <div
      id={`card-${card.id}`}
      onClick={isLegal && !dimmed ? onClick : undefined}
      className={`
        ${sizeClasses}
        relative select-none transition-all duration-200
        border-2 flex flex-col justify-between
        bg-white border-slate-300 shadow-xs
        ${
          isSelected
            ? '-translate-y-3 ring-3 ring-blue-600 ring-offset-2 ring-offset-slate-100 shadow-xl shadow-blue-500/30 z-30'
            : dimmed
            ? 'opacity-40 grayscale contrast-75 cursor-not-allowed z-0'
            : isLegal && onClick
            ? 'hover:-translate-y-1 hover:shadow-md cursor-pointer z-10'
            : 'z-10'
        }
        ${className}
      `}
    >
      {/* Top rank and mini suit */}
      <div className={`flex items-center justify-between font-black leading-none ${suitColor}`}>
        <span className="tracking-tighter text-xs sm:text-sm font-mono font-bold">
          {card.rank}
        </span>
        <SuitIcon suit={card.suit} size={size === 'xs' ? 9 : size === 'sm' ? 11 : 13} />
      </div>

      {/* Center artwork */}
      <div className="my-auto flex flex-col items-center justify-center">
        <div className="drop-shadow-xs">
          <SuitIcon suit={card.suit} size={size === 'xs' ? 16 : size === 'sm' ? 18 : 24} />
        </div>

        {/* Special 2 badge if applicable */}
        {card.isSpecialTwo && (
          <span className="absolute bottom-1 right-1 text-[8px] bg-blue-600 text-white px-1 py-0.2 rounded font-mono font-bold tracking-widest shadow-2xs">
            2★
          </span>
        )}
      </div>

      {/* Bottom inverted rank and mini suit */}
      <div className={`flex items-center justify-between font-black leading-none rotate-180 ${suitColor}`}>
        <span className="tracking-tighter text-xs sm:text-sm font-mono font-bold">
          {card.rank}
        </span>
        <SuitIcon suit={card.suit} size={size === 'xs' ? 9 : size === 'sm' ? 11 : 13} />
      </div>
    </div>
  );
};
