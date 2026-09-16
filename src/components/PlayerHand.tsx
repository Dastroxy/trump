import React, { useState, useMemo } from 'react';
import { Card, Suit, Trick } from '../engine/types.ts';
import { validateCardPlay } from '../engine/rules.ts';
import { CardView } from './CardView.tsx';
import { sound } from '../utils/sound.ts';
import { Play } from 'lucide-react';

interface PlayerHandProps {
  hand: Card[];
  currentTrick: Trick | null;
  isMyTurn: boolean;
  trumpSuit: Suit | null;
  onPlayCard: (cardId: string) => void;
}

const SUIT_ORDER: Record<string, number> = {
  spades: 1,
  hearts: 2,
  clubs: 3,
  diamonds: 4,
  none: 5,
};

export const PlayerHand: React.FC<PlayerHandProps> = ({
  hand,
  currentTrick,
  isMyTurn,
  trumpSuit,
  onPlayCard,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const trickNumber = currentTrick ? currentTrick.trickNumber : 1;
  const ledSuit = currentTrick ? currentTrick.ledSuit : null;

  // Sort hand by pip group (suit) and descending rank order within suit
  const sortedHand = useMemo(() => {
    return [...hand].sort((a, b) => {
      // Prioritize Joker or Trump if desired, or standard Spades -> Hearts -> Clubs -> Diamonds -> Joker
      const orderA = a.isJoker ? 0 : SUIT_ORDER[a.suit] ?? 9;
      const orderB = b.isJoker ? 0 : SUIT_ORDER[b.suit] ?? 9;

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // Inside same suit, sort by value descending (Ace -> King -> ... -> 2)
      return b.value - a.value;
    });
  }, [hand]);

  const handleCardClick = (card: Card) => {
    // Cannot interact if it's not player's turn
    if (!isMyTurn) return;

    // Check legality with engine rules
    const legality = validateCardPlay(card, hand, trickNumber, 9, ledSuit);
    if (!legality.isLegal) {
      return;
    }

    if (selectedCardId === card.id) {
      // SECOND TAP: Play the selected card!
      sound.playCardPlay();
      setSelectedCardId(null);
      onPlayCard(card.id);
    } else {
      // FIRST TAP: Select the card!
      sound.playCardSelect();
      setSelectedCardId(card.id);
    }
  };

  const selectedCard = sortedHand.find((c) => c.id === selectedCardId);

  return (
    <div className="w-full flex flex-col items-center select-none pb-2 pt-1 touch-manipulation">
      {/* Turn & Play Hint Bar */}
      <div className="min-h-[44px] flex items-center justify-center mb-1">
        {isMyTurn ? (
          selectedCard ? (
            <button
              onClick={() => {
                sound.playCardPlay();
                setSelectedCardId(null);
                onPlayCard(selectedCard.id);
              }}
              className="min-h-[44px] flex items-center gap-1.5 px-4 sm:px-6 py-2 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs sm:text-sm tracking-wide shadow-md shadow-blue-500/30 transition-all cursor-pointer touch-manipulation"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                TAP TO PLAY {selectedCard.isJoker ? 'JOKER' : `${selectedCard.rank} of ${selectedCard.suit.toUpperCase()}`}
              </span>
            </button>
          ) : (
            <div className="min-h-[40px] flex items-center px-4 py-1.5 rounded-full bg-white border border-blue-400 text-blue-700 text-xs sm:text-sm font-bold tracking-wide shadow-xs animate-pulse">
              YOUR TURN — TAP A CARD TO PLAY
            </div>
          )
        ) : (
          <div className="text-slate-500 text-xs font-semibold tracking-wider uppercase">
            Waiting for other players...
          </div>
        )}
      </div>

      {/* Hand Cards Container (Organized in suit groups without overlapping) */}
      <div className="flex flex-wrap items-center justify-center gap-1 xs:gap-1.5 sm:gap-2 px-1 sm:px-2 max-w-full py-1.5 touch-manipulation">
        {sortedHand.map((card) => {
          const legality = validateCardPlay(card, hand, trickNumber, 9, ledSuit);
          // Only dim illegal cards when it IS the player's turn to play; otherwise keep cards clear & opaque
          const isPlayable = isMyTurn && legality.isLegal;
          const isDimmed = isMyTurn && !legality.isLegal;
          const isSelected = selectedCardId === card.id;

          return (
            <div
              key={card.id}
              className={`transition-all duration-150 transform ${
                isSelected ? 'scale-105 z-30' : 'z-10'
              }`}
            >
              <CardView
                card={card}
                isSelected={isSelected}
                isLegal={isPlayable || !isMyTurn}
                dimmed={isDimmed}
                size="sm"
                onClick={() => handleCardClick(card)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
