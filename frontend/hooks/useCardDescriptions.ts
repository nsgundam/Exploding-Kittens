import { useEffect, useState } from "react";

// Module-level cache — fetch ครั้งเดียวตลอด session
let cachedDescriptions: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

async function fetchDescriptions(): Promise<Record<string, string>> {
  if (cachedDescriptions) return cachedDescriptions;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/cards/descriptions`)
    .then((res) => res.json())
    .then((data) => {
      cachedDescriptions = data as Record<string, string>;
      fetchPromise = null;
      return cachedDescriptions;
    })
    .catch(() => {
      fetchPromise = null;
      return {} as Record<string, string>;
    });

  return fetchPromise;
}

export function useCardDescriptions(): Record<string, string> {
  const [descriptions, setDescriptions] = useState<Record<string, string>>(
    cachedDescriptions ?? {}
  );

  useEffect(() => {
    if (cachedDescriptions) {
      setDescriptions(cachedDescriptions);
      return;
    }
    fetchDescriptions().then(setDescriptions);
  }, []);

  return descriptions;
}