"use client";

export const AVATAR_STYLES = [
  "adventurer",
  "avataaars",
  "bottts",
  "fun-emoji",
  "lorelei",
  "notionists",
  "personas",
  "pixel-art",
] as const;

const DICEBEAR_PREFIX = "dicebear";

export interface AvatarProfile {
  style: string;
  seed: string;
  value: string;
}

export function buildAvatarProfileValue(style: string, seed: string): string {
  return `${DICEBEAR_PREFIX}:${style}:${encodeURIComponent(seed)}`;
}

export function buildAvatarUrl(style: string, seed: string): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=transparent`;
}

export function parseAvatarProfileValue(value?: string | null): AvatarProfile | null {
  if (!value) return null;

  if (value.startsWith(`${DICEBEAR_PREFIX}:`)) {
    const [, style, ...seedParts] = value.split(":");
    const seed = decodeURIComponent(seedParts.join(":"));
    if (!style || !seed) return null;
    return {
      style,
      seed,
      value: buildAvatarProfileValue(style, seed),
    };
  }

  try {
    const url = new URL(value);
    if (url.hostname !== "api.dicebear.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    const style = parts[1];
    const seed = url.searchParams.get("seed");

    if (!style || !seed) return null;
    return {
      style,
      seed,
      value: buildAvatarProfileValue(style, seed),
    };
  } catch {
    return null;
  }
}

export function resolveAvatarSrc(value?: string | null): string | null {
  if (!value) return null;

  const parsed = parseAvatarProfileValue(value);
  if (parsed) {
    return buildAvatarUrl(parsed.style, parsed.seed);
  }

  return value;
}
