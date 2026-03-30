import { Router, Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

/**
 * GET /api/cards/descriptions
 * ดึง card_code + description ทุกใบจาก CardMaster
 */
router.get(
  "/descriptions",
  asyncHandler(async (_req: Request, res: Response) => {
    const cards = await prisma.cardMaster.findMany({
      select: { card_code: true, description: true },
    });

    const descriptions: Record<string, string> = {};
    for (const card of cards) {
      descriptions[card.card_code] = card.description;
    }

    res.status(200).json(descriptions);
  })
);

export default router;