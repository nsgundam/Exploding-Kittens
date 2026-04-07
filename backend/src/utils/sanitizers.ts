import { CardHand } from "@prisma/client";
import { SanitizedCardHand } from "../types/types";

/**
 * Sanitize card hands for anti-cheat (NFR-03, AI Rule 2.3).
 * Each player only sees their own cards; others see empty array + card_count.
 */
export function sanitizeCardHands(
  cardHands: CardHand[],
  viewerPlayerId: string | undefined
): SanitizedCardHand[] {
  return cardHands.map((hand) => {
    if (viewerPlayerId && hand.player_id === viewerPlayerId) {
      return {
        ...hand,
        cards: (hand.cards ?? []) as string[],
      };
    }
    return {
      ...hand,
      cards: [],
    };
  });
}

/**
 * Sanitizes the output of a combo card play before public broadcast.
 * Completely obscures the stolen card and hand arrays from non-involved players.
 */
export function getPublicComboResult(result: any) {
  return {
    ...result,
    stolenCard: undefined,
    thiefHand: undefined,
    targetHand: undefined,
    robbedFromToken: undefined,
  };
}
