import { useEffect, useState } from "react";

// Module-level cache — fetch ครั้งเดียวตลอด session
let cachedDescriptions: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

async function fetchDescriptions(): Promise<Record<string, string>> {
  if (cachedDescriptions) return cachedDescriptions;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/cards/descriptions")
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
  // ใช้ initializer function เพื่อดึง cache ตอนสร้าง state
  // ไม่ต้องเรียก setState synchronously ใน useEffect
  const [descriptions, setDescriptions] = useState<Record<string, string>>(
    () => cachedDescriptions ?? {}
  );

  useEffect(() => {
    // ถ้า cache พร้อมแล้วและ state ยังว่าง → ไม่ต้อง fetch ใหม่
    if (cachedDescriptions && Object.keys(descriptions).length === 0) {
      setDescriptions(cachedDescriptions);
      return;
    }
    if (cachedDescriptions) return;

    // fetch แล้ว setState ใน callback (async) — ไม่ใช่ synchronous ใน effect body
    fetchDescriptions().then((data) => {
      setDescriptions(data);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return descriptions;
}