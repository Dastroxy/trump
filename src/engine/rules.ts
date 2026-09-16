import { Card, PlayedCard, Suit, TeamScoreHistory, Team } from './types.ts';

export interface LegalityResult {
  isLegal: boolean;
  reason?: string;
  isAutoPlayFinalCardJoker?: boolean;
}

/**
 * Validates whether a specific card is legal to play given the current game context.
 *
 * Joker Rules:
 * 1. Joker is an eligible card anytime other than the first round (Trick 1) and first card of any round (cannot lead).
 * 2. Joker can always be played if it is the last card in the hand (even if leading or in the final round).
 * 3. Standard non-Joker cards must follow suit if the player holds cards of the led suit.
 */
export function validateCardPlay(
  card: Card,
  playerHand: Card[],
  trickNumber: number,
  totalTricks: number, // 9 for 6-player
  ledSuit: Suit | null
): LegalityResult {
  // Check that the player actually possesses this card
  const ownsCard = playerHand.some((c) => c.id === card.id);
  if (!ownsCard) {
    return { isLegal: false, reason: 'Card not in hand' };
  }

  const isFinalCard = playerHand.length === 1;
  const isLeading = ledSuit === null;

  // JOKER RULES:
  // "joker is an eligible card anytime other than first round and first card of any round.
  // and joker can be played if its the last card in the hand."
  if (card.isJoker) {
    // 1. "and joker can be played if its the last card in the hand."
    // If the Joker is the player's last remaining card, it is ALWAYS legal to play
    // (even as the first card of a trick/round).
    if (isFinalCard) {
      return {
        isLegal: true,
        isAutoPlayFinalCardJoker: true,
        reason: 'Final-card Joker: played as the last card in hand (zero winning value)',
      };
    }

    // 2. "other than first round" (Trick 1)
    if (trickNumber === 1) {
      return { isLegal: false, reason: 'Joker cannot be played in the first round' };
    }

    // 3. "and first card of any round" (cannot lead any trick)
    if (isLeading) {
      return { isLegal: false, reason: 'Joker cannot be the first card of any round (cannot lead)' };
    }

    // Otherwise: Joker is an eligible card anytime!
    // Player does NOT need to follow suit to play the Joker.
    return { isLegal: true };
  }

  // REGULAR CARDS:
  // FOLLOW-SUIT RULE:
  // If not leading, and player has card(s) matching ledSuit, they MUST follow suit.
  if (!isLeading && ledSuit) {
    const hasLedSuit = playerHand.some((c) => !c.isJoker && c.suit === ledSuit);
    if (hasLedSuit && card.suit !== ledSuit) {
      return { isLegal: false, reason: `Must follow suit (${ledSuit})` };
    }
  }

  return { isLegal: true };
}

/**
 * Returns a list of all legal cards in the player's hand.
 */
export function getLegalCards(
  playerHand: Card[],
  trickNumber: number,
  totalTricks: number,
  ledSuit: Suit | null
): Card[] {
  return playerHand.filter((card) => {
    return validateCardPlay(card, playerHand, trickNumber, totalTricks, ledSuit).isLegal;
  });
}

/**
 * Determines the winner of a trick according to the official rules:
 *
 * 1. Standard Joker: Beats all other cards, including Trump.
 * 2. FINAL-CARD JOKER EXCEPTION:
 *    If a Joker was played as the player's final remaining card, it has NO winning value.
 *    It cannot win the trick. It is treated as having zero rank/value.
 * 3. Trump: Highest trump card wins if no regular Joker was played.
 * 4. Led Suit: Highest card of the led suit wins if no trump and no regular Joker.
 * 5. Rank ordering: A (14) > K (13) > Q (12) > J (11) > 10..2.
 */
export function determineTrickWinner(
  playedCards: PlayedCard[],
  trumpSuit: Suit,
  _trickNumber: number
): {
  winnerSeat: number;
  winnerPlayerId: string;
  winningCard: Card;
} {
  if (playedCards.length === 0) {
    throw new Error('Cannot determine winner of empty trick');
  }

  const ledSuit = playedCards[0].card.suit as Suit;

  // 1. Check for standard Joker (a Joker that was NOT played as a final card)
  // A played card with isSpecialFinalCardJoker has NO winning value.
  const winningJokerPlay = playedCards.find(
    (p) => p.card.isJoker && !(p.card as any).isZeroValueFinalJoker
  );

  if (winningJokerPlay) {
    return {
      winnerSeat: winningJokerPlay.playerSeat,
      winnerPlayerId: winningJokerPlay.playerId,
      winningCard: winningJokerPlay.card,
    };
  }

  // 2. Check for Trump cards (excluding zero-value cards if any)
  const trumpPlays = playedCards.filter(
    (p) => !p.card.isJoker && p.card.suit === trumpSuit
  );

  if (trumpPlays.length > 0) {
    // Find highest value trump
    let highestTrump = trumpPlays[0];
    for (let i = 1; i < trumpPlays.length; i++) {
      if (trumpPlays[i].card.value > highestTrump.card.value) {
        highestTrump = trumpPlays[i];
      }
    }
    return {
      winnerSeat: highestTrump.playerSeat,
      winnerPlayerId: highestTrump.playerId,
      winningCard: highestTrump.card,
    };
  }

  // 3. Follow-suit highest card (excluding zero-value final Jokers)
  const ledSuitPlays = playedCards.filter(
    (p) => !p.card.isJoker && p.card.suit === ledSuit
  );

  if (ledSuitPlays.length > 0) {
    let highestLed = ledSuitPlays[0];
    for (let i = 1; i < ledSuitPlays.length; i++) {
      if (ledSuitPlays[i].card.value > highestLed.card.value) {
        highestLed = ledSuitPlays[i];
      }
    }
    return {
      winnerSeat: highestLed.playerSeat,
      winnerPlayerId: highestLed.playerId,
      winningCard: highestLed.card,
    };
  }

  // 4. Fallback (e.g., if led by final-card Joker or all played cards were off-suit/discarded)
  // Highest non-zero-value card wins; if none, the first played card
  const validNonZeroPlays = playedCards.filter(
    (p) => !(p.card as any).isZeroValueFinalJoker
  );
  if (validNonZeroPlays.length > 0) {
    let highestPlay = validNonZeroPlays[0];
    for (let i = 1; i < validNonZeroPlays.length; i++) {
      if (validNonZeroPlays[i].card.value > highestPlay.card.value) {
        highestPlay = validNonZeroPlays[i];
      }
    }
    return {
      winnerSeat: highestPlay.playerSeat,
      winnerPlayerId: highestPlay.playerId,
      winningCard: highestPlay.card,
    };
  }

  return {
    winnerSeat: playedCards[0].playerSeat,
    winnerPlayerId: playedCards[0].playerId,
    winningCard: playedCards[0].card,
  };
}

/**
 * Calculates round scores for each of the 3 teams:
 *
 * Scoring Rules:
 * - Nil Bonus (if enabled):
 *   - Player who bid 0 and won 0 tricks: +100 points
 *   - Player who bid 0 and won 1+ tricks: -100 points
 * - Team Contract (for non-nil bids):
 *   - Combined team bid vs combined team tricks (or non-nil bidder's share)
 *   - If Team Tricks >= Team Bid:
 *     - Score: Team Bid * 10
 *     - Overtricks: (Team Tricks - Team Bid)
 *     - If bags enabled: add overtricks as bags
 *       - If bags reach 10+: -100 points and subtract 10 bags
 *   - If Team Tricks < Team Bid:
 *     - Score: - (Team Bid * 10)
 *     - No bags added
 */
export function calculateRoundScores(
  teams: Team[],
  playerBids: Record<string, number>,
  playerTricks: Record<string, number>,
  currentTeamScores: Record<number, number>,
  currentTeamBags: Record<number, number>,
  bagsEnabled: boolean,
  nilBonusEnabled: boolean,
  gameNumber: number,
  dealerSeat: number,
  trumpSuit: Suit
): {
  newTeamScores: Record<number, number>;
  newTeamBags: Record<number, number>;
  historyEntry: TeamScoreHistory;
} {
  const newTeamScores = { ...currentTeamScores };
  const newTeamBags = { ...currentTeamBags };

  const teamBids: Record<number, number> = {};
  const teamTricks: Record<number, number> = {};
  const roundScores: Record<number, number> = {};
  const bagsEarned: Record<number, number> = {};
  const nilResults: Record<string, 'SUCCESS' | 'FAILED' | 'NONE'> = {};

  for (const team of teams) {
    const [p1Id, p2Id] = team.playerIds;
    const bid1 = playerBids[p1Id] ?? 0;
    const bid2 = playerBids[p2Id] ?? 0;
    const tricks1 = playerTricks[p1Id] ?? 0;
    const tricks2 = playerTricks[p2Id] ?? 0;

    const tTricks = tricks1 + tricks2;
    teamTricks[team.id] = tTricks;

    let teamRoundPoints = 0;
    let teamRoundBags = 0;

    const p1IsNil = nilBonusEnabled && bid1 === 0;
    const p2IsNil = nilBonusEnabled && bid2 === 0;

    // Nil evaluation
    if (p1IsNil) {
      if (tricks1 === 0) {
        teamRoundPoints += 100;
        nilResults[p1Id] = 'SUCCESS';
      } else {
        teamRoundPoints -= 100;
        nilResults[p1Id] = 'FAILED';
      }
    } else {
      nilResults[p1Id] = 'NONE';
    }

    if (p2IsNil) {
      if (tricks2 === 0) {
        teamRoundPoints += 100;
        nilResults[p2Id] = 'SUCCESS';
      } else {
        teamRoundPoints -= 100;
        nilResults[p2Id] = 'FAILED';
      }
    } else {
      nilResults[p2Id] = 'NONE';
    }

    // Contract calculation
    if (p1IsNil && p2IsNil) {
      // Both bid Nil - contract points are strictly from Nil outcomes
      teamBids[team.id] = 0;
    } else if (p1IsNil || p2IsNil) {
      // One player bid Nil, other bid a normal contract
      const contractBid = p1IsNil ? bid2 : bid1;
      const partnerTricks = p1IsNil ? tricks2 : tricks1;
      teamBids[team.id] = contractBid;

      if (partnerTricks >= contractBid) {
        const over = partnerTricks - contractBid;
        teamRoundPoints += contractBid * 10 + over;
        if (bagsEnabled) {
          teamRoundBags += over;
        }
      } else {
        teamRoundPoints -= contractBid * 10;
      }
    } else {
      // Standard partnership contract
      const combinedBid = bid1 + bid2;
      teamBids[team.id] = combinedBid;

      if (tTricks >= combinedBid) {
        const over = tTricks - combinedBid;
        teamRoundPoints += combinedBid * 10 + over;
        if (bagsEnabled) {
          teamRoundBags += over;
        }
      } else {
        teamRoundPoints -= combinedBid * 10;
      }
    }

    // Apply bags and 10-bag penalty
    if (bagsEnabled && teamRoundBags > 0) {
      bagsEarned[team.id] = teamRoundBags;
      let totalBags = (newTeamBags[team.id] || 0) + teamRoundBags;
      if (totalBags >= 10) {
        teamRoundPoints -= 100; // -100 points penalty
        totalBags -= 10;
      }
      newTeamBags[team.id] = totalBags;
    } else {
      bagsEarned[team.id] = 0;
      newTeamBags[team.id] = newTeamBags[team.id] || 0;
    }

    roundScores[team.id] = teamRoundPoints;
    newTeamScores[team.id] = (newTeamScores[team.id] || 0) + teamRoundPoints;
  }

  const historyEntry: TeamScoreHistory = {
    gameNumber,
    dealerSeat,
    trumpSuit,
    teamBids,
    playerBids: { ...playerBids },
    teamTricks,
    playerTricks: { ...playerTricks },
    roundScores,
    accumulatedScores: { ...newTeamScores },
    bagsEarned,
    totalBags: { ...newTeamBags },
    nilResults,
  };

  return {
    newTeamScores,
    newTeamBags,
    historyEntry,
  };
}
