import React from 'react';
import { Suit, SpecialSuit } from '../engine/types.ts';

export function getSuitColorClass(suit: SpecialSuit): string {
  switch (suit) {
    case 'hearts':
      return 'text-red-600';
    case 'diamonds':
      return 'text-red-600';
    case 'spades':
      return 'text-black';
    case 'clubs':
      return 'text-black';
    case 'none':
    default:
      return 'text-purple-600';
  }
}

export function getSuitBgClass(suit: SpecialSuit): string {
  switch (suit) {
    case 'hearts':
      return 'bg-red-50 border-red-200 text-red-600';
    case 'diamonds':
      return 'bg-red-50 border-red-200 text-red-600';
    case 'spades':
      return 'bg-slate-100 border-slate-300 text-black';
    case 'clubs':
      return 'bg-slate-100 border-slate-300 text-black';
    case 'none':
    default:
      return 'bg-purple-50 border-purple-200 text-purple-700';
  }
}

interface SuitIconProps {
  suit: SpecialSuit;
  className?: string;
  size?: number;
}

export const SuitIcon: React.FC<SuitIconProps> = ({
  suit,
  className = '',
  size = 16,
}) => {
  const colorClass = getSuitColorClass(suit);

  if (suit === 'spades') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${colorClass} ${className} shrink-0`}
      >
        <path d="M12 2C11.5 2.8 5 9.5 5 14C5 17 7.5 18.5 10 18.5C11 18.5 11.7 18 12 17.5C12.3 18 13 18.5 14 18.5C16.5 18.5 19 17 19 14C19 9.5 12.5 2.8 12 2ZM13 18C13 19.5 14 21 16 22H8C10 21 11 19.5 11 18H13Z" />
      </svg>
    );
  }

  if (suit === 'hearts') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${colorClass} ${className} shrink-0`}
      >
        <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.27 2 8.5C2 5.41 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.08C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.41 22 8.5C22 12.27 18.6 15.36 13.45 20.03L12 21.35Z" />
      </svg>
    );
  }

  if (suit === 'diamonds') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${colorClass} ${className} shrink-0`}
      >
        <path d="M12 2L3.5 12L12 22L20.5 12Z" />
      </svg>
    );
  }

  if (suit === 'clubs') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`${colorClass} ${className} shrink-0`}
      >
        <circle cx="12" cy="7.5" r="4.2" />
        <circle cx="7.2" cy="13.8" r="4.2" />
        <circle cx="16.8" cy="13.8" r="4.2" />
        <circle cx="12" cy="12.5" r="2.5" />
        <path d="M11 14C11 16.5 9.5 20.5 7.5 22H16.5C14.5 20.5 13 16.5 13 14H11Z" />
      </svg>
    );
  }

  // Joker / None - Clean Court Jester Cap Icon
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={`${colorClass} ${className} shrink-0`}
    >
      <circle cx="5" cy="8" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="19" cy="8" r="1.5" />
      <path d="M5.5 9.5C5.5 12 7.5 14 10 14.5V17H14V14.5C16.5 14 18.5 12 18.5 9.5C18.5 8.5 18 8 18 8C17 11 14.5 11 12 5.5C9.5 11 7 11 6 8C6 8 5.5 8.5 5.5 9.5Z" />
      <path d="M7 18.5C7 18 7.5 17.5 8 17.5H16C16.5 17.5 17 18 17 18.5V19.5C17 20 16.5 20.5 16 20.5H8C7.5 20.5 7 20 7 19.5V18.5Z" />
    </svg>
  );
};
