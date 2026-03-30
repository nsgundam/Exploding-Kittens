import { prisma } from "../config/prisma";

// ─────────────────────────────────────────────
// FR-07-IK1: IK ใส่กองตอนเริ่มเกมในสถานะ face-down
//   → ik_face_up = false (default)
//   → ใส่ไว้ใน deck_order ปกติเลย
//   → startGame จัดการ insert IK เข้า baseDeck อยู่แล้ว
//   → ตรงนี้แค่ยืนยัน ik_face_up = false ตอนสร้าง DeckState
// ─────────────────────────────────────────────

export interface DrawIKResult {
    isFaceUp: boolean;         // true = ตายทันที, false = เลือกตำแหน่งใส่กลับ
    playerEliminated: boolean; // true เมื่อ faceUp = true
}

// ─────────────────────────────────────────────
// FR-07-IK2 + IK4: ตรวจสอบเมื่อผู้เล่นจั่วได้ IK
// ─────────────────────────────────────────────
export async function handleDrawIK(
    sessionId: string,
): Promise<DrawIKResult> {
    const deckState = await prisma.deckState.findUnique({
        where: { session_id: sessionId },
    });

    if (!deckState) throw new Error("DeckState not found");

    const isFaceUp = deckState.ik_face_up;

    if (isFaceUp) {
        // FR-07-IK4: หงายหน้า → ตายทันที ไม่ต้องทำอะไรกับ deck
        // (IK ถูก pop ออกมาจาก deck_order ใน drawCard แล้ว)
        return { isFaceUp: true, playerEliminated: true };
    }

    // FR-07-IK2: คว่ำหน้า → ผู้เล่นเลือกตำแหน่งใส่กลับ
    // (ยังไม่ insert กลับตรงนี้ รอ insertIKBack)
    return { isFaceUp: false, playerEliminated: false };
}

// ─────────────────────────────────────────────
// FR-07-IK2: ผู้เล่นเลือกตำแหน่งแล้วใส่ IK กลับ + เปลี่ยนเป็น face-up
// position: 0 = บนสุด, cards_remaining = ล่างสุด
// ─────────────────────────────────────────────
export async function insertIKBack(
    sessionId: string,
    position: number,
): Promise<void> {
    const deckState = await prisma.deckState.findUnique({
        where: { session_id: sessionId },
    });

    if (!deckState) throw new Error("DeckState not found");

    const deck = deckState.deck_order as string[];
    const maxPos = deck.length; // ใส่ที่ล่างสุดได้ = length (append)

    // clamp ตำแหน่ง
    const safePos = Math.max(0, Math.min(position, maxPos));

    // insert IK กลับที่ตำแหน่งที่เลือก
    // deck_order เรียงจาก bottom → top ดังนั้น index 0 = ล่างสุด
    // top card = deck[deck.length - 1]
    // position 0 = บนสุด → splice ที่ท้าย array
    // position maxPos = ล่างสุด → splice ที่ index 0
    const insertIndex = maxPos - safePos;
    const newDeck = [...deck];
    newDeck.splice(insertIndex, 0, "IK");

    await prisma.deckState.update({
        where: { session_id: sessionId },
        data: {
            deck_order: newDeck,
            cards_remaining: newDeck.length,
            ik_face_up: true, // FR-07-IK2: เปลี่ยนเป็น face-up หลัง insert กลับ
            last_updated: new Date(),
        },
    });
}

// ─────────────────────────────────────────────
// FR-07-IK3: เช็คว่า IK หงายหน้าอยู่บนสุดกองหรือไม่
// ใช้ broadcast แจ้งเตือน UI พิเศษ
// ─────────────────────────────────────────────
export async function isIKOnTop(sessionId: string): Promise<boolean> {
    const deckState = await prisma.deckState.findUnique({
        where: { session_id: sessionId },
    });

    if (!deckState) return false;

    const deck = deckState.deck_order as string[];
    if (!deckState.ik_face_up) return false;

    // top card = deck[deck.length - 1]
    return deck[deck.length - 1] === "IK";
}

// ─────────────────────────────────────────────
// Helper: ดึง ik_face_up status
// ─────────────────────────────────────────────
export async function getIKFaceUp(sessionId: string): Promise<boolean> {
    const deckState = await prisma.deckState.findUnique({
        where: { session_id: sessionId },
        select: { ik_face_up: true },
    });

    return deckState?.ik_face_up ?? false;
}