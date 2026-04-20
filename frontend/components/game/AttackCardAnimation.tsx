"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { resolveAvatarSrc } from "@/lib/avatar";

// ── Types ──────────────────────────────────────────────────────────────────
export interface AttackAnimState {
  playedByDisplayName: string;
  targetDisplayName?: string;
  targetAvatarUrl?: string | null;  // รูป avatar ของเป้าหมาย
  targetSeat?: number | null;        // seat number สำหรับเลือกสี
  pendingAttacks?: number;
}

interface AttackCardAnimationProps {
  state: AttackAnimState | null;
  onComplete: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const TOTAL_MS = 1800;

// ── Seat colors (เหมือน PlayerAvatar) ─────────────────────────────────────
const SEAT_COLORS: Record<number, string> = {
  1: "#e07b39",
  2: "#c0392b",
  3: "#8e44ad",
  4: "#2980b9",
  5: "#27ae60",
};

// ── Math helpers ───────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function rnd(min: number, max: number) { return min + Math.random() * (max - min); }

// ── Particle / bolt types ──────────────────────────────────────────────────
interface Spark { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; col: string; }
interface BoltSeg { x1: number; y1: number; x2: number; y2: number; }
interface LightningBolt { segs: BoltSeg[]; spawnTime: number; color: string; width: number; originY: number; }

// ── Generate jagged lightning ──────────────────────────────────────────────
function makeLightning(x1: number, y1: number, x2: number, y2: number, roughness = 26, splits = 9): BoltSeg[] {
  const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
  const dx = (x2 - x1) / splits;
  const dy = (y2 - y1) / splits;
  for (let i = 1; i < splits; i++) {
    pts.push({ x: x1 + dx * i + rnd(-roughness * 0.4, roughness * 0.4), y: y1 + dy * i + rnd(-roughness, roughness) });
  }
  pts.push({ x: x2, y: y2 });
  const segs: BoltSeg[] = [];
  for (let i = 0; i < pts.length - 1; i++) segs.push({ x1: pts[i].x, y1: pts[i].y, x2: pts[i + 1].x, y2: pts[i + 1].y });
  return segs;
}

// ── Draw card ─────────────────────────────────────────────────────────────
function drawCard(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, glowI: number, shakeX: number, scale: number) {
  const x = cx - (w / 2) * scale + shakeX;
  const y = cy - (h / 2) * scale;
  const rw = w * scale; const rh = h * scale; const r = 10 * scale;
  ctx.save();
  if (glowI > 0) { ctx.shadowColor = `rgba(251,146,60,${glowI * 0.9})`; ctx.shadowBlur = 28 * glowI; }
  const grad = ctx.createLinearGradient(x, y, x + rw, y + rh);
  grad.addColorStop(0, "#7f1d1d"); grad.addColorStop(0.5, "#991b1b"); grad.addColorStop(1, "#450a0a");
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + rw - r, y); ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
  ctx.lineTo(x + rw, y + rh - r); ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
  ctx.lineTo(x + r, y + rh); ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "rgba(251,146,60,0.5)"; ctx.lineWidth = 1.5 * scale; ctx.stroke();
  ctx.shadowBlur = 0;
  const inset = 6 * scale; const ir = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(x + inset + ir, y + inset); ctx.lineTo(x + rw - inset - ir, y + inset);
  ctx.quadraticCurveTo(x + rw - inset, y + inset, x + rw - inset, y + inset + ir);
  ctx.lineTo(x + rw - inset, y + rh - inset - ir);
  ctx.quadraticCurveTo(x + rw - inset, y + rh - inset, x + rw - inset - ir, y + rh - inset);
  ctx.lineTo(x + inset + ir, y + rh - inset);
  ctx.quadraticCurveTo(x + inset, y + rh - inset, x + inset, y + rh - inset - ir);
  ctx.lineTo(x + inset, y + inset + ir); ctx.quadraticCurveTo(x + inset, y + inset, x + inset + ir, y + inset);
  ctx.closePath(); ctx.strokeStyle = "rgba(251,146,60,0.2)"; ctx.lineWidth = scale; ctx.stroke();
  ctx.font = `bold ${30 * scale}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fde68a"; ctx.shadowColor = "#f97316"; ctx.shadowBlur = 12 * scale;
  ctx.fillText("⚡", cx + shakeX, cy); ctx.shadowBlur = 0; ctx.restore();
}

// ── Draw lightning bolt ────────────────────────────────────────────────────
function drawLightningBolt(ctx: CanvasRenderingContext2D, bolt: LightningBolt, alpha: number) {
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.shadowColor = bolt.color; ctx.shadowBlur = 20;
  ctx.strokeStyle = bolt.color; ctx.lineWidth = bolt.width * 2.8; ctx.globalAlpha = alpha * 0.28;
  ctx.beginPath();
  bolt.segs.forEach((s, i) => { if (i === 0) ctx.moveTo(s.x1, s.y1); else ctx.lineTo(s.x2, s.y2); });
  ctx.stroke();
  ctx.shadowBlur = 6; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = bolt.width; ctx.globalAlpha = alpha * 0.92;
  ctx.beginPath();
  bolt.segs.forEach((s, i) => { if (i === 0) ctx.moveTo(s.x1, s.y1); else ctx.lineTo(s.x2, s.y2); });
  ctx.stroke(); ctx.restore();
}

// ── Draw target avatar on canvas ───────────────────────────────────────────
function drawTargetAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  img: HTMLImageElement | null,
  displayName: string,
  color: string,
  hitIntensity: number,  // 0–1 แสดง hit flash
) {
  ctx.save();

  // hit flash ring
  if (hitIntensity > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 8 + hitIntensity * 12, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,100,60,${hitIntensity * 0.9})`;
    ctx.lineWidth = 3 + hitIntensity * 4;
    ctx.shadowColor = "#ef4444";
    ctx.shadowBlur = 20 * hitIntensity;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // avatar circle clip
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (img && img.complete && img.naturalWidth > 0) {
    // draw actual avatar image
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    // fallback: colored circle + initial letter
    ctx.fillStyle = color + "44";
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = color;
    ctx.font = `bold ${radius * 0.9}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(displayName.charAt(0).toUpperCase(), cx, cy);
  }

  ctx.restore();

  // border ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = hitIntensity > 0
    ? `rgba(239,68,68,${0.5 + hitIntensity * 0.5})`
    : `${color}88`;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  // name label below avatar
  ctx.save();
  ctx.font = `bold 13px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = hitIntensity > 0 ? `rgba(255,150,100,${0.8 + hitIntensity * 0.2})` : "rgba(252,165,165,0.85)";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 6;
  ctx.fillText(displayName.length > 10 ? displayName.slice(0, 9) + "…" : displayName, cx, cy + radius + 8);
  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────
export function AttackCardAnimation({ state, onComplete }: AttackCardAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const sparksRef = useRef<Spark[]>([]);
  const boltsRef = useRef<LightningBolt[]>([]);
  const impactSpawnedRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imgLoadedRef = useRef(false);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  // keep ref in sync without adding onComplete to effect deps
  onCompleteRef.current = onComplete;

  const stopAnim = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }, []);

  // preload avatar image — resolve dicebear/raw URL before loading
  useEffect(() => {
    const rawUrl = state?.targetAvatarUrl ?? null;
    const resolvedUrl = resolveAvatarSrc(rawUrl);
    if (!resolvedUrl) { imgRef.current = null; imgLoadedRef.current = false; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { imgLoadedRef.current = true; };
    img.onerror = () => { imgLoadedRef.current = false; };
    img.src = resolvedUrl;
    imgRef.current = img;
  }, [state?.targetAvatarUrl]);

  useEffect(() => {
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    completedRef.current = false;

    // ── Fixed canvas dimensions (avoids offsetWidth=0 on first render) ───
    const W = 560;
    const H = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // ── layout x-positions ────────────────────────────────────────────────
    const CARD_CX = W * 0.22;
    const TARGET_CX = W * 0.80;
    const MID_Y = H / 2;

    // ── init particles ────────────────────────────────────────────────────
    sparksRef.current = [];
    boltsRef.current = [];
    impactSpawnedRef.current = false;

    ([
      { spawnTime: 0.07, originY: MID_Y - 20, width: 2.6, color: "#fde68a" },
      { spawnTime: 0.17, originY: MID_Y + 4,  width: 2.0, color: "#fb923c" },
      { spawnTime: 0.26, originY: MID_Y + 22, width: 1.4, color: "#fbbf24" },
    ] as const).forEach((def) => {
      boltsRef.current.push({
        segs: makeLightning(CARD_CX + 36, def.originY, TARGET_CX - 44, def.originY),
        spawnTime: def.spawnTime, color: def.color, width: def.width, originY: def.originY,
      });
    });

    for (let i = 0; i < 38; i++) {
      const angle = rnd(0, Math.PI * 2); const speed = rnd(2.5, 8.5);
      sparksRef.current.push({
        x: CARD_CX, y: MID_Y + rnd(-18, 18),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - rnd(0.5, 2.5),
        life: rnd(0.5, 1.3), age: 0, size: rnd(1.5, 4),
        col: i % 3 === 0 ? "#fde68a" : i % 3 === 1 ? "#fb923c" : "#fca5a5",
      });
    }

    startRef.current = performance.now();

    // safety net: always call onComplete after TOTAL_MS + 300ms
    // in case RAF loop silently fails (e.g. tab hidden, canvas error)
    const safetyTimer = setTimeout(() => {
      stopAnim();
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    }, TOTAL_MS + 300);

    // capture state values into locals so frame closure never sees null
    const capturedTargetName = state.targetDisplayName ?? "?";
    const targetColor = SEAT_COLORS[state.targetSeat ?? 1] ?? "#e07b39";

    function frame(now: number) {
      if (!ctx) return;
      const t = clamp((now - startRef.current) / TOTAL_MS, 0, 1);

      ctx.clearRect(0, 0, W, H);

      // bg tint
      const bgA = t < 0.12 ? easeOut3(t / 0.12) * 0.55 : t > 0.78 ? (1 - (t - 0.78) / 0.22) * 0.55 : 0.55;
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.7);
      bg.addColorStop(0, `rgba(120,20,20,${bgA * 0.75})`);
      bg.addColorStop(0.5, `rgba(25,4,4,${bgA * 0.6})`);
      bg.addColorStop(1, `rgba(0,0,0,${bgA * 0.28})`);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // shockwave rings from card
      [0, 0.05, 0.12].forEach((off, i) => {
        const rt = clamp(t / 0.38 - off, 0, 1);
        if (rt <= 0) return;
        ctx.beginPath(); ctx.arc(CARD_CX, MID_Y, rt * 120, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(249,115,22,${(1 - rt) * (0.5 - i * 0.12)})`; ctx.lineWidth = 2.5 - i * 0.7; ctx.stroke();
      });

      // card
      const shakeAmp = t < 0.28 ? easeOut3(t / 0.28) * 7 : (1 - easeOut3((t - 0.28) / 0.72)) * 3.5;
      const shakeX = Math.sin(t * 115) * shakeAmp;
      const cardScale = t < 0.11 ? lerp(0.82, 1.09, easeOut3(t / 0.11)) : t < 0.2 ? lerp(1.09, 0.97, easeOut3((t - 0.11) / 0.09)) : 1 + Math.sin(t * 24) * 0.01;
      const glowI = t < 0.5 ? easeOut3(t / 0.5) : 1 - easeInOut((t - 0.5) / 0.5);
      drawCard(ctx, CARD_CX, MID_Y, 72, 104, glowI, shakeX, cardScale);

      // bolts (re-randomize per frame for flicker)
      boltsRef.current.forEach((bolt) => {
        const bt = clamp((t - bolt.spawnTime) / 0.30, 0, 1);
        if (bt <= 0) return;
        bolt.segs = makeLightning(CARD_CX + shakeX + 36, bolt.originY, TARGET_CX - 44, bolt.originY, 24, 9);
        const bA = bt < 0.35 ? bt / 0.35 : bt < 0.68 ? 1 : 1 - (bt - 0.68) / 0.32;
        drawLightningBolt(ctx, bolt, bA * 0.9);
      });

      // energy streak
      if (t > 0.07 && t < 0.58) {
        const st = clamp((t - 0.07) / 0.51, 0, 1);
        const sx = lerp(CARD_CX + 36, TARGET_CX - 44, easeOut3(st));
        const sa = st < 0.55 ? 1 : 1 - (st - 0.55) / 0.45;
        ctx.save();
        const sg = ctx.createLinearGradient(CARD_CX + 36, 0, sx, 0);
        sg.addColorStop(0, "rgba(251,146,60,0)");
        sg.addColorStop(0.6, `rgba(253,224,71,${sa * 0.55})`);
        sg.addColorStop(1, `rgba(255,255,255,${sa * 0.85})`);
        ctx.strokeStyle = sg; ctx.lineWidth = 2; ctx.shadowColor = "#fb923c"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(CARD_CX + 36, MID_Y); ctx.lineTo(sx, MID_Y); ctx.stroke(); ctx.restore();
      }

      // target avatar + hit flash
      const hitIntensity = t > 0.22 && t < 0.65 ? Math.sin(clamp((t - 0.22) / 0.43, 0, 1) * Math.PI) : 0;
      const avatarScale = t < 0.08 ? easeOut3(t / 0.08) : 1;
      const avatarRadius = 40 * avatarScale;
      if (avatarScale > 0) {
        drawTargetAvatar(ctx, TARGET_CX, MID_Y, avatarRadius, imgRef.current, capturedTargetName, targetColor, hitIntensity);
      }

      // impact flash glow behind avatar
      const impT = clamp((t - 0.20) / 0.20, 0, 1);
      if (impT > 0 && impT < 1) {
        const ia = Math.sin(impT * Math.PI) * 0.55;
        const ig = ctx.createRadialGradient(TARGET_CX, MID_Y, 0, TARGET_CX, MID_Y, 80);
        ig.addColorStop(0, `rgba(255,240,120,${ia})`);
        ig.addColorStop(0.4, `rgba(251,146,60,${ia * 0.45})`);
        ig.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = ig; ctx.fillRect(0, 0, W, H);
      }

      // impact spark burst (once)
      if (t >= 0.22 && !impactSpawnedRef.current) {
        impactSpawnedRef.current = true;
        for (let i = 0; i < 26; i++) {
          const a = rnd(-Math.PI * 0.65, Math.PI * 0.65); const sp = rnd(2, 7.5);
          sparksRef.current.push({
            x: TARGET_CX - 44, y: MID_Y + rnd(-22, 22),
            vx: -Math.abs(Math.cos(a)) * sp, vy: Math.sin(a) * sp,
            life: rnd(0.4, 1.0), age: 0, size: rnd(1.5, 3.5),
            col: i % 2 === 0 ? "#fde68a" : "#fb923c",
          });
        }
      }

      // sparks
      sparksRef.current.forEach((s) => {
        if (t < 0.06) return;
        s.age += 0.016; s.x += s.vx; s.y += s.vy; s.vy += 0.15; s.vx *= 0.97;
        const sa = clamp(1 - s.age / s.life, 0, 1);
        if (sa <= 0) return;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * sa, 0, Math.PI * 2);
        ctx.fillStyle = s.col; ctx.globalAlpha = sa * 0.88; ctx.fill(); ctx.globalAlpha = 1;
      });

      // fade out
      if (t > 0.80) {
        ctx.fillStyle = `rgba(0,0,0,${((t - 0.80) / 0.20) * 0.92})`; ctx.fillRect(0, 0, W, H);
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        if (!completedRef.current) {
          completedRef.current = true;
          clearTimeout(safetyTimer);
          onCompleteRef.current();
        }
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      stopAnim();
      clearTimeout(safetyTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  return (
    <>
      <style>{`
        @keyframes atk-backdrop-in { from{opacity:0} to{opacity:1} }
        @keyframes atk-title-in {
          0%  { opacity:0; transform:translateY(14px) scale(0.82); }
          60% { opacity:1; transform:translateY(-4px) scale(1.06); }
          100%{ opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes atk-meta-in {
          0%  { opacity:0; transform:translateX(12px); }
          100%{ opacity:1; transform:translateX(0); }
        }
        @keyframes atk-count-pulse {
          0%,100%{ transform:scale(1); }
          50%    { transform:scale(1.2); }
        }
      `}</style>

      {/* dim backdrop */}
      <div style={{
        position:"fixed", inset:0, zIndex:4600,
        background:"rgba(2,0,8,0.80)", backdropFilter:"blur(7px)",
        animation:"atk-backdrop-in 0.22s ease", pointerEvents:"none",
      }} />

      {/* stage */}
      <div style={{
        position:"fixed", inset:0, zIndex:4601,
        display:"flex", alignItems:"center", justifyContent:"center",
        pointerEvents:"none",
      }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>

          {/* title */}
          <div style={{
            marginBottom:"10px", textAlign:"center",
            animation:"atk-title-in 0.42s cubic-bezier(0.34,1.56,0.64,1) both",
            fontFamily:"'Fredoka One', cursive",
          }}>
            <div style={{
              fontSize:"11px", letterSpacing:"0.18em", textTransform:"uppercase",
              color:"rgba(251,146,60,0.5)", marginBottom:"3px",
            }}>
              {state.playedByDisplayName} เล่น
            </div>
            <div style={{
              fontSize:"28px", fontWeight:900, letterSpacing:"0.06em",
              color:"#fca5a5", lineHeight:1,
              textShadow:"0 0 24px rgba(239,68,68,0.75), 0 0 52px rgba(239,68,68,0.3)",
            }}>
              ATTACK!
            </div>
          </div>

          {/* canvas — fixed logical size, CSS scales it down on small screens */}
          <canvas ref={canvasRef} style={{
            borderRadius:"16px", display:"block",
            width:"min(560px, 92vw)", height:"auto",
            aspectRatio:"560/300",
            maxWidth:"100%",
          }} />

          {/* count badge */}
          {(state.pendingAttacks ?? 0) > 1 && (
            <div style={{
              marginTop:"10px",
              display:"flex", alignItems:"center", gap:"5px",
              padding:"5px 16px", borderRadius:"20px",
              background:"rgba(239,68,68,0.2)", border:"1.5px solid rgba(239,68,68,0.5)",
              animation:"atk-meta-in 0.35s 0.2s ease both, atk-count-pulse 0.55s 0.6s ease-in-out 2",
              fontFamily:"'Fredoka One', cursive",
            }}>
              <span style={{ fontSize:"16px", color:"#fde68a" }}>⚡</span>
              <span style={{
                fontSize:"15px", fontWeight:900, color:"#fca5a5",
                textShadow:"0 0 14px rgba(239,68,68,0.8)",
              }}>
                ×{state.pendingAttacks} เทิร์น
              </span>
            </div>
          )}

        </div>
      </div>
    </>
  );
}