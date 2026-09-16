import { generateDeck, dealCards } from './deck.ts';
import {
  validateCardPlay,
  determineTrickWinner,
  calculateRoundScores,
  getLegalCards,
} from './rules.ts';
import { Card, PlayedCard, Suit, Team } from './types.ts';

export interface TestCaseResult {
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: string;
}

export function runAllEngineTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestCaseResult[];
} {
  const results: TestCaseResult[] = [];

  function assert(
    category: string,
    name: string,
    condition: boolean,
    expected: string,
    actual: string,
    details?: string
  ) {
    results.push({
      category,
      name,
      passed: condition,
      expected,
      actual,
      details,
    });
  }

  // ========================================================
  // 1. DECK GENERATION & DEALING TESTS
  // ========================================================
  const { deck, specialTwo } = generateDeck();
  assert(
    'Deck Composition',
    'Deck has exactly 54 cards',
    deck.length === 54,
    '54 cards',
    `${deck.length} cards`
  );

  const jokerCount = deck.filter((c) => c.isJoker).length;
  assert(
    'Deck Composition',
    'Deck contains exactly 1 Joker',
    jokerCount === 1,
    '1 Joker',
    `${jokerCount} Jokers`
  );

  const specialTwos = deck.filter((c) => c.isSpecialTwo);
  assert(
    'Deck Composition',
    'Deck contains exactly 1 randomly selected special 2',
    specialTwos.length === 1 && specialTwo.rank === '2',
    '1 special 2',
    `${specialTwos.length} special 2s (${specialTwo.suit} of 2)`
  );

  const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6'];
  const hands = dealCards(deck, playerIds);
  const allDealtNine = playerIds.every((pid) => hands[pid].length === 9);
  assert(
    'Dealing',
    'Every player receives exactly 9 cards (54 cards / 6 players)',
    allDealtNine,
    '9 cards per player',
    allDealtNine ? '9 cards each' : 'Mismatch'
  );

  // ========================================================
  // 2. SEATING & OPPOSITE TEAMMATE TESTS
  // ========================================================
  const sampleTeams: Team[] = [
    { id: 1, name: 'Team 1', color: '#3b82f6', playerIds: ['p1', 'p4'], seats: [0, 3] },
    { id: 2, name: 'Team 2', color: '#10b981', playerIds: ['p2', 'p5'], seats: [1, 4] },
    { id: 3, name: 'Team 3', color: '#f59e0b', playerIds: ['p3', 'p6'], seats: [2, 5] },
  ];

  const oppositePairsValid =
    sampleTeams[0].seats[0] + 3 === sampleTeams[0].seats[1] &&
    sampleTeams[1].seats[0] + 3 === sampleTeams[1].seats[1] &&
    sampleTeams[2].seats[0] + 3 === sampleTeams[2].seats[1];

  assert(
    'Seating & Teams',
    'Opposite seats form teammates on hexagonal table (0-3, 1-4, 2-5)',
    oppositePairsValid,
    'Opposite seats pair exactly',
    'Seats: (0,3), (1,4), (2,5)'
  );

  // ========================================================
  // 3. DEALER ROTATION TESTS
  // ========================================================
  // Game 1: P1 (seat 0) -> First bidder: P2 (seat 1)
  // Game 2: P2 (seat 1) -> First bidder: P3 (seat 2)
  const dealerG1 = 0;
  const firstBidderG1 = (dealerG1 + 1) % 6;
  const dealerG2 = (dealerG1 + 1) % 6;
  const firstBidderG2 = (dealerG2 + 1) % 6;
  assert(
    'Dealer Rotation',
    'Dealer rotates clockwise, next seat bids first & leads trick 1',
    firstBidderG1 === 1 && dealerG2 === 1 && firstBidderG2 === 2,
    'G1 Dealer 0 -> First 1; G2 Dealer 1 -> First 2',
    `G1 Dealer ${dealerG1} -> First ${firstBidderG1}; G2 Dealer ${dealerG2} -> First ${firstBidderG2}`
  );

  // ========================================================
  // 4. STANDARD JOKER RESTRICTIONS
  // ========================================================
  const testJoker: Card = { id: 'joker_main', suit: 'none', rank: 'JOKER', value: 99, isJoker: true };
  const cardAceHearts: Card = { id: 'hearts_A', suit: 'hearts', rank: 'A', value: 14, isJoker: false };
  const cardKingHearts: Card = { id: 'hearts_K', suit: 'hearts', rank: 'K', value: 13, isJoker: false };
  const cardTwoSpades: Card = { id: 'spades_2', suit: 'spades', rank: '2', value: 2, isJoker: false };
  const cardTenHearts: Card = { id: 'hearts_10', suit: 'hearts', rank: '10', value: 10, isJoker: false };
  const cardEightHearts: Card = { id: 'hearts_8', suit: 'hearts', rank: '8', value: 8, isJoker: false };

  // Rule 1: Joker cannot lead any trick (cannot be the first card of any round)
  const leadHand = [testJoker, cardAceHearts, cardKingHearts];
  const jokerLeadCheck = validateCardPlay(testJoker, leadHand, 3, 9, null);
  assert(
    'Joker Rules',
    'Rule 1: Joker cannot be the first card of any round (cannot lead)',
    jokerLeadCheck.isLegal === false,
    'isLegal: false',
    `isLegal: ${jokerLeadCheck.isLegal} (${jokerLeadCheck.reason})`
  );

  // Rule 2: Joker cannot be played in the first round (Trick 1)
  const trick1Hand = [testJoker, cardKingHearts, cardTwoSpades];
  const jokerTrick1Check = validateCardPlay(testJoker, trick1Hand, 1, 9, 'diamonds');
  assert(
    'Joker Rules',
    'Rule 2: Joker cannot be played in the first round (Trick 1)',
    jokerTrick1Check.isLegal === false,
    'isLegal: false',
    `isLegal: ${jokerTrick1Check.isLegal} (${jokerTrick1Check.reason})`
  );

  // Rule 3: Joker is an eligible card anytime other than first round and first card of any round
  // (Even when holding cards of the led suit!)
  const jokerEligibleAnytimeHand = [testJoker, cardAceHearts, cardKingHearts];
  const jokerEligibleCheck = validateCardPlay(testJoker, jokerEligibleAnytimeHand, 4, 9, 'hearts');
  assert(
    'Joker Rules',
    'Rule 3: Joker is an eligible card anytime other than first round and first card of any round',
    jokerEligibleCheck.isLegal === true,
    'isLegal: true',
    `isLegal: ${jokerEligibleCheck.isLegal}`
  );

  // Follow-Suit rule: Non-Joker cards MUST follow suit if held
  const regularNonFollowHand = [testJoker, cardAceHearts, cardTwoSpades];
  const regularFollowSuitCheck = validateCardPlay(cardTwoSpades, regularNonFollowHand, 4, 9, 'hearts');
  assert(
    'Follow Suit',
    'Regular card must follow led suit if held, off-suit regular card is illegal',
    regularFollowSuitCheck.isLegal === false,
    'isLegal: false',
    `isLegal: ${regularFollowSuitCheck.isLegal} (${regularFollowSuitCheck.reason})`
  );

  // Normal Joker winning: In trick 4, void in hearts, Joker beats Ace of Hearts and Ace of Spades (trump)
  const regularTrickCards: PlayedCard[] = [
    { playerId: 'p1', playerSeat: 0, playerName: 'P1', card: cardAceHearts, timestamp: 1 },
    { playerId: 'p2', playerSeat: 1, playerName: 'P2', card: { id: 'spades_A', suit: 'spades', rank: 'A', value: 14, isJoker: false }, timestamp: 2 },
    { playerId: 'p3', playerSeat: 2, playerName: 'P3', card: testJoker, timestamp: 3 },
    { playerId: 'p4', playerSeat: 3, playerName: 'P4', card: cardKingHearts, timestamp: 4 },
    { playerId: 'p5', playerSeat: 4, playerName: 'P5', card: cardTenHearts, timestamp: 5 },
    { playerId: 'p6', playerSeat: 5, playerName: 'P6', card: cardEightHearts, timestamp: 6 },
  ];
  const regularWinner = determineTrickWinner(regularTrickCards, 'spades', 4);
  assert(
    'Joker Rules',
    'Normal Joker beats Trump and Led suit',
    regularWinner.winnerSeat === 2 && regularWinner.winningCard.isJoker,
    'Seat 2 with Joker wins',
    `Seat ${regularWinner.winnerSeat} with ${regularWinner.winningCard.rank}`
  );

  // ========================================================
  // 5. CRITICAL USER TEST: FINAL-CARD JOKER IN FINAL TRICK
  // ========================================================
  // "There is one edge case worth testing heavily: the final-card Joker in the final trick.
  // Your rule says it must auto-play but cannot win, so the engine should explicitly allow that play
  // even though the normal final-trick Joker restriction would otherwise prohibit it.
  // This should be covered by an automated game-engine test, not handled only in the UI."

  // 5a. Check validateCardPlay explicitly allows the final-card Joker in Trick 9
  const singleCardJokerHand = [testJoker]; // Only 1 card remaining in hand!
  const finalCardJokerCheck = validateCardPlay(testJoker, singleCardJokerHand, 9, 9, 'hearts');
  assert(
    'Final-Card Joker Edge Case',
    'Engine explicitly permits final-card Joker in Trick 9',
    finalCardJokerCheck.isLegal === true && finalCardJokerCheck.isAutoPlayFinalCardJoker === true,
    'isLegal: true, isAutoPlayFinalCardJoker: true',
    `isLegal: ${finalCardJokerCheck.isLegal}, isAutoPlay: ${finalCardJokerCheck.isAutoPlayFinalCardJoker}`
  );

  // 5b. Joker can be played even as lead card if it is the last card in the hand
  const finalCardJokerLeadCheck = validateCardPlay(testJoker, singleCardJokerHand, 9, 9, null);
  assert(
    'Final-Card Joker Edge Case',
    'Joker can lead if it is the last card in the hand',
    finalCardJokerLeadCheck.isLegal === true,
    'isLegal: true',
    `isLegal: ${finalCardJokerLeadCheck.isLegal}`
  );

  // 5b. Check getLegalCards includes the final-card Joker
  const legalCardsTrick9 = getLegalCards(singleCardJokerHand, 9, 9, 'hearts');
  assert(
    'Final-Card Joker Edge Case',
    'getLegalCards returns the final-card Joker so player is never blocked',
    legalCardsTrick9.length === 1 && legalCardsTrick9[0].isJoker,
    '1 legal card (Joker)',
    `${legalCardsTrick9.length} legal cards`
  );

  // 5c. EXACT USER SCENARIO TEST:
  // Trump = Spades
  // Cards played in Trick 9:
  // 10 Hearts (P1)
  // King Hearts (P2)
  // 2 Spades (P3)
  // 8 Hearts (P4)
  // Joker as final card (P5) -> marked as zero-value final joker
  // Ace Hearts (P6)
  // Expected Winner: P3 with 2 of Spades (Trump beats Hearts, Joker CANNOT win)
  const finalCardJokerZeroVal: Card = {
    ...testJoker,
    ...({ isZeroValueFinalJoker: true } as any),
  };

  const userScenarioCards: PlayedCard[] = [
    { playerId: 'p1', playerSeat: 0, playerName: 'P1', card: cardTenHearts, timestamp: 1 },
    { playerId: 'p2', playerSeat: 1, playerName: 'P2', card: cardKingHearts, timestamp: 2 },
    { playerId: 'p3', playerSeat: 2, playerName: 'P3', card: cardTwoSpades, timestamp: 3 }, // 2 of Spades (Trump)
    { playerId: 'p4', playerSeat: 3, playerName: 'P4', card: cardEightHearts, timestamp: 4 },
    { playerId: 'p5', playerSeat: 4, playerName: 'P5', card: finalCardJokerZeroVal, timestamp: 5 }, // Final-card Joker
    { playerId: 'p6', playerSeat: 5, playerName: 'P6', card: cardAceHearts, timestamp: 6 }, // Ace of Hearts
  ];

  const scenarioWinner = determineTrickWinner(userScenarioCards, 'spades', 9);

  assert(
    'Final-Card Joker Edge Case',
    'Final-card Joker has NO winning value; Trump (2 Spades) wins trick over Ace Hearts & Joker',
    scenarioWinner.winnerSeat === 2 && scenarioWinner.winningCard.id === 'spades_2',
    'Seat 2 (2 of Spades) wins trick',
    `Seat ${scenarioWinner.winnerSeat} (${scenarioWinner.winningCard.id}) won`
  );

  // 5d. Second check: No Trump played, highest led suit card wins, final-card Joker cannot win
  const noTrumpUserScenario: PlayedCard[] = [
    { playerId: 'p1', playerSeat: 0, playerName: 'P1', card: cardTenHearts, timestamp: 1 },
    { playerId: 'p2', playerSeat: 1, playerName: 'P2', card: cardKingHearts, timestamp: 2 },
    { playerId: 'p4', playerSeat: 3, playerName: 'P4', card: cardEightHearts, timestamp: 3 },
    { playerId: 'p5', playerSeat: 4, playerName: 'P5', card: finalCardJokerZeroVal, timestamp: 4 },
    { playerId: 'p6', playerSeat: 5, playerName: 'P6', card: cardAceHearts, timestamp: 5 },
  ];
  const noTrumpWinner = determineTrickWinner(noTrumpUserScenario, 'clubs', 9);
  assert(
    'Final-Card Joker Edge Case',
    'Final-card Joker cannot win non-trump trick; Ace of Hearts wins',
    noTrumpWinner.winnerSeat === 5 && noTrumpWinner.winningCard.id === 'hearts_A',
    'Seat 5 (Ace of Hearts) wins trick',
    `Seat ${noTrumpWinner.winnerSeat} (${noTrumpWinner.winningCard.id}) won`
  );

  // ========================================================
  // 6. SCORING & BAGS TESTS
  // ========================================================
  // Team 1: p1 bid 3, p4 bid 2 -> Team bid 5. Won 7 tricks.
  // With BAGS = ON: 50 points (contract) + 2 points (overtricks) = 52 points + 2 bags.
  const round1Scores = calculateRoundScores(
    sampleTeams,
    { p1: 3, p2: 1, p3: 1, p4: 2, p5: 1, p6: 1 },
    { p1: 4, p2: 1, p3: 0, p4: 3, p5: 1, p6: 0 },
    { 1: 0, 2: 0, 3: 0 },
    { 1: 0, 2: 0, 3: 0 },
    true, // bagsEnabled
    true, // nilBonusEnabled
    1,
    0,
    'spades'
  );
  assert(
    'Scoring & Bags',
    'Team bidding 5 and winning 7 tricks gets 52 points (50 contract + 2 extra tricks) + 2 bags',
    round1Scores.newTeamScores[1] === 52 && round1Scores.newTeamBags[1] === 2,
    'Score: 52, Bags: 2',
    `Score: ${round1Scores.newTeamScores[1]}, Bags: ${round1Scores.newTeamBags[1]}`
  );

  // 10-bag penalty test:
  // Starting with 9 bags, then gaining 2 more bags = 11 bags -> -100 points, remaining 1 bag
  const roundBagsPenalty = calculateRoundScores(
    sampleTeams,
    { p1: 3, p2: 1, p3: 1, p4: 2, p5: 1, p6: 1 },
    { p1: 4, p2: 1, p3: 0, p4: 3, p5: 1, p6: 0 },
    { 1: 100, 2: 0, 3: 0 },
    { 1: 9, 2: 0, 3: 0 }, // 9 accumulated bags
    true, // bagsEnabled
    true, // nilBonusEnabled
    2,
    1,
    'hearts'
  );
  // Team 1 gains 52 points (50 contract + 2 overtricks), but incurs -100 bag penalty = net -48 points. Total score 100 - 48 = 52. Bags = 11 - 10 = 1.
  assert(
    'Scoring & Bags',
    'Accumulating 10+ bags triggers -100 penalty and removes 10 bags',
    roundBagsPenalty.newTeamScores[1] === 52 && roundBagsPenalty.newTeamBags[1] === 1,
    'Score: 52, Bags: 1',
    `Score: ${roundBagsPenalty.newTeamScores[1]}, Bags: ${roundBagsPenalty.newTeamBags[1]}`
  );

  // ========================================================
  // 7. NIL BONUS TESTS
  // ========================================================
  // Player 1 bids Nil (0). Takes 0 tricks -> +100 points.
  const nilSuccess = calculateRoundScores(
    sampleTeams,
    { p1: 0, p2: 2, p3: 2, p4: 3, p5: 1, p6: 1 },
    { p1: 0, p2: 2, p3: 2, p4: 3, p5: 1, p6: 1 },
    { 1: 0, 2: 0, 3: 0 },
    { 1: 0, 2: 0, 3: 0 },
    false,
    true, // nilBonusEnabled
    1,
    0,
    'diamonds'
  );
  // Team 1: p1 (+100 for nil success) + p4 made contract of 3 (+30) = 130
  assert(
    'Nil Bonus',
    'Successful Nil (0 bid, 0 tricks) awards +100 points',
    nilSuccess.newTeamScores[1] === 130 && nilSuccess.historyEntry.nilResults['p1'] === 'SUCCESS',
    'Team 1: 130, Nil: SUCCESS',
    `Team 1: ${nilSuccess.newTeamScores[1]}, Nil: ${nilSuccess.historyEntry.nilResults['p1']}`
  );

  // Player 1 bids Nil (0). Takes 1 trick -> -100 points.
  const nilFailed = calculateRoundScores(
    sampleTeams,
    { p1: 0, p2: 2, p3: 2, p4: 3, p5: 1, p6: 1 },
    { p1: 1, p2: 2, p3: 1, p4: 3, p5: 1, p6: 1 },
    { 1: 0, 2: 0, 3: 0 },
    { 1: 0, 2: 0, 3: 0 },
    false,
    true, // nilBonusEnabled
    1,
    0,
    'diamonds'
  );
  // Team 1: p1 (-100 for failed nil) + p4 made contract of 3 (+30) = -70
  assert(
    'Nil Bonus',
    'Failed Nil (0 bid, 1+ tricks) incurs -100 points',
    nilFailed.newTeamScores[1] === -70 && nilFailed.historyEntry.nilResults['p1'] === 'FAILED',
    'Team 1: -70, Nil: FAILED',
    `Team 1: ${nilFailed.newTeamScores[1]}, Nil: ${nilFailed.historyEntry.nilResults['p1']}`
  );

  // ========================================================
  // 5. MULTI-ROUND MATCH ACCUMULATION & HISTORY TESTS
  // ========================================================
  // Round 1: Team 1 bids 5, wins 7 tricks (+52 pts)
  const round1 = calculateRoundScores(
    sampleTeams,
    { p1: 3, p2: 2, p3: 2, p4: 2, p5: 1, p6: 1 },
    { p1: 4, p2: 1, p3: 1, p4: 3, p5: 0, p6: 0 },
    { 1: 0, 2: 0, 3: 0 },
    { 1: 0, 2: 0, 3: 0 },
    true, // bagsEnabled
    true,
    1,
    0,
    'spades'
  );

  // Round 2: Team 1 bids 4, wins 4 tricks (+40 pts), using round 1 scores & bags
  const round2 = calculateRoundScores(
    sampleTeams,
    { p1: 2, p2: 2, p3: 2, p4: 2, p5: 1, p6: 1 },
    { p1: 2, p2: 2, p3: 2, p4: 2, p5: 1, p6: 0 },
    round1.newTeamScores,
    round1.newTeamBags,
    true,
    true,
    2,
    1,
    'hearts'
  );

  assert(
    'Multi-Round History',
    'Round 1 records accurate round score and accumulated score of 52',
    round1.historyEntry.roundScores[1] === 52 && round1.historyEntry.accumulatedScores[1] === 52,
    'Round 1: 52 pts, Accumulated: 52 pts',
    `Round 1: ${round1.historyEntry.roundScores[1]}, Accumulated: ${round1.historyEntry.accumulatedScores[1]}`
  );

  assert(
    'Multi-Round History',
    'Round 2 properly accumulates previous rounds score to 92 (52 + 40)',
    round2.historyEntry.roundScores[1] === 40 && round2.historyEntry.accumulatedScores[1] === 92,
    'Round 2: 40 pts, Accumulated: 92 pts',
    `Round 2: ${round2.historyEntry.roundScores[1]}, Accumulated: ${round2.historyEntry.accumulatedScores[1]}`
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
