// ============================================================
// Auth Middleware — Extract Player Token
// ============================================================

import { Request, Response, NextFunction } from "express";

/**
 * Declaration merging: add `playerToken` to Express Request.
 * This allows typed access to `req.playerToken` after the middleware runs.
 */
declare global {
  namespace Express {
    interface Request {
      playerToken?: string;
    }
  }
}

/**
 * Extracts `x-player-token` header and attaches it to `req.playerToken`.
 * Returns 401 if the header is missing.
 *
 * Replaces the duplicated `getPlayerToken` helper in both controllers.
 * Per AI Instructions Rule 2.2: "Always validate playerToken on the backend."
 */
export const extractPlayerToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers["x-player-token"];
  if (!token || typeof token !== "string") {
    res
      .status(401)
      .json({ message: "playerToken is required (send via x-player-token header)" });
    return;
  }
  req.playerToken = token;
  next();
};
