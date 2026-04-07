import { Prisma, Player, CardMaster } from "@prisma/client";
import { CardCode } from "../constants/game";
import { PlayerHandsMap } from "../types/types";
import { BadRequestError } from "../utils/errors";

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export async function buildBaseDeck(
  tx: Prisma.TransactionClient,
  cardVersion: string,
  expansions: string[],
): Promise<{
  baseDeck: string[];
  totalDF: number;
  cardMasters: CardMaster[];
}> {
  const basePackFilter =
    cardVersion === "good_and_evil"
      ? { expansion_pack: "good_and_evil" }
      : { expansion_pack: null };

  const cardMasters = await tx.cardMaster.findMany({
    where: {
      OR: [
        basePackFilter,
        ...(expansions.length > 0
          ? [{ expansion_pack: { in: expansions } }]
          : []),
      ],
    },
  });

  const totalDF =
    cardMasters.find((c) => c.card_code === CardCode.DEFUSE || c.card_code === CardCode.GVE_DEFUSE)
      ?.quantity_in_deck ?? 6;

  const baseDeck: string[] = [];

  for (const card of cardMasters) {
    const isEK = card.card_code === CardCode.EXPLODING_KITTEN || card.card_code === CardCode.GVE_EXPLODING_KITTEN;
    const isDF = card.card_code === CardCode.DEFUSE || card.card_code === CardCode.GVE_DEFUSE;
    const isIK = card.card_code === CardCode.IMPLODING_KITTEN;

    if (isEK || isDF || isIK) continue;

    for (let i = 0; i < card.quantity_in_deck; i++) {
      baseDeck.push(card.card_code);
    }
  }

  return { baseDeck: shuffleArray(baseDeck), totalDF, cardMasters };
}

export function dealCards(
  baseDeck: string[],
  players: Player[],
  dfCode: string,
  cardsPerHand = 4,
): { remainingDeck: string[]; hands: PlayerHandsMap } {
  const deck = [...baseDeck];
  const hands: PlayerHandsMap = {};

  for (const p of players) {
    hands[p.player_id] = [dfCode];
    for (let i = 0; i < cardsPerHand; i++) {
      const card = deck.pop();
      if (!card) throw new BadRequestError("Not enough cards in deck to deal");
      hands[p.player_id]!.push(card);
    }
  }

  return { remainingDeck: deck, hands };
}

export function finalizeDeck(
  remainingDeck: string[],
  playerCount: number,
  totalDF: number,
  dfCode: string,
  ekCode: string,
  expansions: string[],
): string[] {
  const deck = [...remainingDeck];

  const dfRemaining = totalDF - playerCount;
  for (let i = 0; i < dfRemaining; i++) {
    deck.push(dfCode);
  }

  const ekCount = playerCount - 1;
  for (let i = 0; i < ekCount; i++) {
    deck.push(ekCode);
  }

  if (expansions.includes("imploding_kittens")) {
    deck.push(CardCode.IMPLODING_KITTEN);
  }

  return shuffleArray(deck);
}
