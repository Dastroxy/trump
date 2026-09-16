import { Card, CardRank, Suit } from './types.ts';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: { rank: CardRank; value: number }[] = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
  { rank: 'A', value: 14 },
];

/**
 * Creates the exact 54-card deck:
 * 52 standard cards
 * + 1 Joker
 * + 1 randomly selected special 2 (from 2S, 2H, 2D, 2C)
 */
export function generateDeck(): { deck: Card[]; specialTwo: Card } {
  const cards: Card[] = [];

  // 1. 52 Standard Cards
  for (const suit of SUITS) {
    for (const r of RANKS) {
      cards.push({
        id: `${suit}_${r.rank}`,
        suit,
        rank: r.rank,
        value: r.value,
        isJoker: false,
      });
    }
  }

  // 2. 1 Joker
  const joker: Card = {
    id: 'joker_main',
    suit: 'none',
    rank: 'JOKER',
    value: 99,
    isJoker: true,
  };
  cards.push(joker);

  // 3. 1 Randomly Selected Special 2 (from 2 of Spades, Hearts, Diamonds, Clubs)
  const candidateSuits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const chosenSuit = candidateSuits[Math.floor(Math.random() * candidateSuits.length)];
  const specialTwo: Card = {
    id: `${chosenSuit}_2_special`,
    suit: chosenSuit,
    rank: '2',
    value: 2,
    isJoker: false,
    isSpecialTwo: true,
  };
  cards.push(specialTwo);

  return {
    deck: cards,
    specialTwo,
  };
}

/**
 * Fisher-Yates shuffle algorithm for cryptographically sound or high-entropy randomization
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Deals 9 cards to each of the 6 players (total 54 cards).
 * Cards are dealt clockwise beginning with the player immediately clockwise from the dealer.
 */
export function dealCards(
  shuffledDeck: Card[],
  playerIdsInOrder: string[]
): Record<string, Card[]> {
  const hands: Record<string, Card[]> = {};
  for (const pid of playerIdsInOrder) {
    hands[pid] = [];
  }

  // 54 cards, 6 players = 9 cards each
  const totalCards = shuffledDeck.length; // 54
  const numPlayers = playerIdsInOrder.length; // 6

  for (let i = 0; i < totalCards; i++) {
    const playerIndex = i % numPlayers;
    const pid = playerIdsInOrder[playerIndex];
    hands[pid].push(shuffledDeck[i]);
  }

  // Sort hands for readability: Suit then rank
  const suitOrder: Record<string, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3, none: 4 };
  for (const pid of playerIdsInOrder) {
    hands[pid].sort((a, b) => {
      if (a.isJoker) return 1;
      if (b.isJoker) return -1;
      const sDiff = (suitOrder[a.suit] ?? 0) - (suitOrder[b.suit] ?? 0);
      if (sDiff !== 0) return sDiff;
      return b.value - a.value;
    });
  }

  return hands;
}
