import React from "react";
import { getCardConfig } from "@/types/cards";

// ── Card Description Map (จาก cards.ts seed data) ────────────
const CARD_DESCRIPTIONS: Record<string, string> = {
  // Classic
  EK: "ถ้าจั่วใบนี้และไม่มี Defuse คุณแพ้เกม ต้องแสดงทันที",
  DF: "ใช้เพื่อหยุดการระเบิด แล้วใส่ Exploding Kitten กลับในสำรับตำแหน่งที่ต้องการ",
  AT: "จบเทิร์นโดยไม่จั่วไพ่ ผู้เล่นถัดไปต้องเล่น 2 เทิร์น (stack ได้)",
  SK: "จบเทิร์นโดยไม่จั่วไพ่ ถ้าใช้ตอบ Attack จะหักได้แค่ 1 เทิร์น",
  SF: "ดูไพ่ 3 ใบบนสุดของสำรับแบบลับ ไม่เปลี่ยนลำดับ",
  SH: "สับสำรับใหม่แบบสุ่ม",
  NP: "หยุด action ใดก็ได้ ยกเว้น Exploding Kitten และ Defuse เล่นได้ทุกเวลา",
  FV: "บังคับผู้เล่นคนอื่นให้ส่งไพ่ 1 ใบให้คุณ (ผู้ถูกเลือกเป็นคนเลือกใบที่ให้)",
  CAT_TACO: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น",
  CAT_MELON: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น",
  CAT_BEARD: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น",
  CAT_RAINBOW: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น",
  CAT_POTATO: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น",
  // Imploding Kittens
  IK: "จั่วใบนี้ face up — ตายทันที ไม่มี Defuse ช่วยได้ และ Nope ก็ไม่ได้ผล",
  RV: "กลับทิศทางการเล่น และจบเทิร์นโดยไม่จั่วไพ่ ถ้ามี 2 คนทำหน้าที่เหมือน Skip",
  DB: "จบเทิร์นโดยจั่วไพ่จากล่างสุดของสำรับแทนบนสุด",
  TA: "จบเทิร์นโดยไม่จั่วไพ่ และเลือกผู้เล่นที่ต้องเล่น 2 เทิร์น (stack ได้)",
  FC: "ใช้แทน cat card ใดก็ได้ในการทำ combo ใช้เป็นการ์ด action อื่นไม่ได้",
  AF: "ดูไพ่ 3 ใบบนสุดแบบลับ แล้วจัดเรียงลำดับใหม่ได้ตามต้องการ",
  // Good vs Evil
  GVE_EK: "ถ้าจั่วใบนี้และไม่มี Defuse คุณแพ้เกม ต้องแสดงทันที",
  GVE_DF: "ใช้เพื่อหยุดการระเบิด แล้วใส่ Exploding Kitten กลับในสำรับตำแหน่งที่ต้องการ",
  GVE_NP: "หยุด action ใดก็ได้ ยกเว้น Exploding Kitten, Devilcat และ Defuse เล่นได้ทุกเวลา",
  GVE_AT: "จบเทิร์นโดยไม่จั่วไพ่ ผู้เล่นถัดไปต้องเล่น 2 เทิร์น (stack ได้)",
  GVE_TA: "จบเทิร์นโดยไม่จั่วไพ่ และเลือกผู้เล่นที่ต้องเล่น 2 เทิร์น (stack ได้)",
  GVE_SH: "สับสำรับใหม่แบบสุ่ม",
  GVE_RF: "เปิดไพ่ 3 ใบบนสุดให้ผู้เล่นทุกคนเห็น แล้วคืนกลับโดยไม่เปลี่ยนลำดับ",
  GVE_FV: "บังคับผู้เล่นคนอื่นให้ส่งไพ่ 1 ใบให้คุณ (ผู้ถูกเลือกเป็นคนเลือกใบที่ให้)",
  GVE_RH: "จั่วไพ่จากล่างสุด แล้วเลือกเก็บไว้หรือวางคืนบนสุดของสำรับ จบเทิร์น",
  GVE_AG: "เริ่ม Armageddon — แจก Godcat/Devilcat ให้ผู้เล่น ใช้ได้เมื่อ Godcat อยู่บน Playmat",
  GVE_GC: "การ์ดทรงพลังที่สุด ใช้แทนการ์ดใดก็ได้ ยกเว้น Nope หลังเล่นให้วางคืน Playmat",
  GVE_DC: "ผู้ที่ได้ Devilcat ใน Armageddon ต้องใช้ Defuse หรือตาย ห้ามใส่กลับสำรับ",
  GVE_FC: "ใช้แทน cat card ใดก็ได้ในการทำ combo ใช้เป็นการ์ด action อื่นไม่ได้",
  GVE_MC: "ไพ่แมว ใช้คู่ 2 ใบเพื่อขโมยไพ่สุ่มจากผู้เล่นคนอื่น",
};

interface CardProps {
  cardCode: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function Card({
  cardCode,
  selected = false,
  disabled = false,
  onClick,
  className = "",
}: CardProps) {
  const config = getCardConfig(cardCode);
  const description =
    CARD_DESCRIPTIONS[cardCode] ??
    CARD_DESCRIPTIONS[cardCode.replace(/^GVE_/, "")] ??
    "";

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`
        group relative w-22 h-32 rounded-xl border-[3px] flex flex-col items-center justify-center p-2
        transition-all duration-300 shadow-md bg-white select-none
        ${disabled ? "opacity-50 cursor-not-allowed grayscale-50" : "cursor-pointer hover:-translate-y-4 hover:shadow-xl hover:z-10"}
        ${selected ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] -translate-y-2" : "border-gray-800"}
        ${className}
      `}
      style={{
        background: `linear-gradient(135deg, ${config.color}20 0%, #ffffff 100%)`,
        borderColor: selected ? undefined : config.color,
      }}
    >
      <div className="absolute top-1 left-1.5 text-xs font-bold text-gray-800">
        {cardCode.replace(/^GVE_/, "")}
      </div>
      <div className="text-4xl mb-1 filter drop-shadow-md transition-transform duration-300 hover:scale-110">
        {config.emoji}
      </div>
      <div
        className="w-full text-center font-bold text-[9px] uppercase leading-tight font-bungee"
        style={{ color: config.color }}
      >
        {config.label}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-black/5 to-transparent rounded-b-lg pointer-events-none" />

      {/* ── TOOLTIP ── แสดงตอน hover */}
      {description && (
        <div
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-[999]
                     opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ width: "160px" }}
        >
          <div
            className="rounded-xl px-3 py-2 text-center text-[11px] leading-snug font-medium"
            style={{
              background: "rgba(10,5,20,0.92)",
              border: `1px solid ${config.color}66`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${config.color}22`,
              color: "#f0e6d0",
              fontFamily: "'Fredoka One', cursive",
            }}
          >
            {description}
          </div>
          {/* Arrow */}
          <div
            className="mx-auto w-2 h-2 rotate-45 -mt-1"
            style={{
              background: "rgba(10,5,20,0.92)",
              border: `1px solid ${config.color}66`,
              borderTop: "none",
              borderLeft: "none",
            }}
          />
        </div>
      )}
    </div>
  );
}