"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { resolveAvatarSrc } from "@/lib/avatar";

// ── Types ──────────────────────────────────────────────────────────────────
export interface TargetedAttackAnimState {
  playedByDisplayName: string;
  targetDisplayName?: string;
  targetAvatarUrl?: string | null;
  targetSeat?: number | null;
  pendingAttacks?: number;
}

interface TargetedAttackAnimationProps {
  state: TargetedAttackAnimState | null;
  onComplete: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const TOTAL_MS = 2200;

// ── Seat colors ────────────────────────────────────────────────────────────
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
function easeOut5(t: number) { return 1 - Math.pow(1 - t, 5); }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function rnd(min: number, max: number) { return min + Math.random() * (max - min); }

// ── Particle types ─────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; col: string; }

// ── Draw card ─────────────────────────────────────────────────────────────
function drawCard(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, glowI: number, scale: number) {
  const x = cx - (w / 2) * scale;
  const y = cy - (h / 2) * scale;
  const rw = w * scale; const rh = h * scale; const r = 10 * scale;
  ctx.save();
  if (glowI > 0) { ctx.shadowColor = `rgba(249,115,22,${glowI})`; ctx.shadowBlur = 30 * glowI; }
  const grad = ctx.createLinearGradient(x, y, x + rw, y + rh);
  grad.addColorStop(0, "#7c2d12"); grad.addColorStop(0.5, "#9a3412"); grad.addColorStop(1, "#431407");
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + rw - r, y); ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
  ctx.lineTo(x + rw, y + rh - r); ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
  ctx.lineTo(x + r, y + rh); ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "rgba(249,115,22,0.6)"; ctx.lineWidth = 1.5 * scale; ctx.stroke();
  ctx.shadowBlur = 0;
  // inner border
  const ins = 6 * scale; const ir = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(x+ins+ir, y+ins); ctx.lineTo(x+rw-ins-ir, y+ins);
  ctx.quadraticCurveTo(x+rw-ins,y+ins, x+rw-ins,y+ins+ir);
  ctx.lineTo(x+rw-ins, y+rh-ins-ir); ctx.quadraticCurveTo(x+rw-ins,y+rh-ins, x+rw-ins-ir,y+rh-ins);
  ctx.lineTo(x+ins+ir, y+rh-ins); ctx.quadraticCurveTo(x+ins,y+rh-ins, x+ins,y+rh-ins-ir);
  ctx.lineTo(x+ins, y+ins+ir); ctx.quadraticCurveTo(x+ins,y+ins, x+ins+ir,y+ins);
  ctx.closePath(); ctx.strokeStyle = "rgba(249,115,22,0.25)"; ctx.lineWidth = scale; ctx.stroke();
  ctx.font = `bold ${28 * scale}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fed7aa"; ctx.shadowColor = "#f97316"; ctx.shadowBlur = 10 * scale;
  ctx.fillText("🎯", cx, cy); ctx.shadowBlur = 0; ctx.restore();
}

// ── Draw crosshair ─────────────────────────────────────────────────────────
function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  outerR: number, innerR: number,
  rot: number,
  alpha: number,
  lockPulse: number,   // 0–1, แดงสว่างตอน lock-on
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(cx, cy);
  ctx.rotate(rot);

  const col = lockPulse > 0
    ? `rgba(${Math.round(lerp(249, 239, lockPulse))},${Math.round(lerp(115, 68, lockPulse))},22,1)`
    : "rgba(249,115,22,1)";
  const glowCol = lockPulse > 0 ? "#ef4444" : "#fb923c";

  ctx.shadowColor = glowCol;
  ctx.shadowBlur = 12 + lockPulse * 16;
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.8;

  // outer circle
  ctx.beginPath(); ctx.arc(0, 0, outerR, 0, Math.PI * 2); ctx.stroke();

  // inner circle
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(0, 0, innerR, 0, Math.PI * 2); ctx.stroke();

  // center dot
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fillStyle = col; ctx.shadowBlur = 16; ctx.fill();

  // cross lines (gap around inner circle)
  const lineLen = 14;
  ctx.lineWidth = 1.8;
  ctx.shadowBlur = 8;
  const pairs: [number, number, number, number][] = [
    [0, -(outerR + lineLen), 0, -(outerR - 4)],
    [0,  (outerR - 4),       0,  (outerR + lineLen)],
    [-(outerR + lineLen), 0, -(outerR - 4), 0],
    [ (outerR - 4),       0,  (outerR + lineLen), 0],
  ];
  pairs.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  });

  // corner arc ticks
  ctx.lineWidth = 3;
  ctx.shadowBlur = 6;
  [0, 1, 2, 3].forEach((i) => {
    const ang = (i * Math.PI) / 2 + Math.PI / 4;
    ctx.beginPath();
    ctx.arc(0, 0, outerR, ang - 0.38, ang + 0.38);
    ctx.globalAlpha = alpha * (0.5 + lockPulse * 0.5);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  });

  ctx.restore();
}

// ── Draw target avatar ─────────────────────────────────────────────────────
function drawTargetAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  img: HTMLImageElement | null,
  displayName: string,
  color: string,
  hitIntensity: number,
) {
  ctx.save();
  if (hitIntensity > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, radius + 6 + hitIntensity * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239,68,68,${hitIntensity * 0.9})`;
    ctx.lineWidth = 2.5 + hitIntensity * 3;
    ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 18 * hitIntensity; ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip();
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = color + "44"; ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = color; ctx.font = `bold ${radius * 0.9}px sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(displayName.charAt(0).toUpperCase(), cx, cy);
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = hitIntensity > 0 ? `rgba(239,68,68,${0.5 + hitIntensity * 0.5})` : `${color}88`;
  ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
  ctx.save();
  ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillStyle = hitIntensity > 0 ? `rgba(255,150,100,${0.8 + hitIntensity * 0.2})` : "rgba(253,186,116,0.85)";
  ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 6;
  ctx.fillText(displayName.length > 10 ? displayName.slice(0, 9) + "…" : displayName, cx, cy + radius + 8);
  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────
export function TargetedAttackAnimation({ state, onComplete }: TargetedAttackAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const impactSpawnedRef = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopAnim = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }, []);

  // preload avatar
  useEffect(() => {
    const resolvedUrl = resolveAvatarSrc(state?.targetAvatarUrl ?? null);
    if (!resolvedUrl) { imgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {};
    img.onerror = () => {};
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
    particlesRef.current = [];
    impactSpawnedRef.current = false;

    const W = 560; const H = 300;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const CARD_CX = W * 0.20;
    const TARGET_CX = W * 0.78;
    const MID_Y = H / 2;

    // initial card burst sparks
    for (let i = 0; i < 28; i++) {
      const a = rnd(0, Math.PI * 2); const sp = rnd(1.5, 5);
      particlesRef.current.push({
        x: CARD_CX, y: MID_Y + rnd(-12, 12),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0.5, 2),
        life: rnd(0.4, 1.0), age: 0, size: rnd(1.5, 3.5),
        col: i % 3 === 0 ? "#fed7aa" : i % 3 === 1 ? "#fb923c" : "#fca5a5",
      });
    }

    startRef.current = performance.now();

    const safetyTimer = setTimeout(() => {
      stopAnim();
      if (!completedRef.current) { completedRef.current = true; onCompleteRef.current(); }
    }, TOTAL_MS + 300);

    const capturedTargetName = state.targetDisplayName ?? "?";
    const targetColor = SEAT_COLORS[state.targetSeat ?? 1] ?? "#e07b39";

    function frame(now: number) {
      if (!ctx) return;
      const t = clamp((now - startRef.current) / TOTAL_MS, 0, 1);

      ctx.clearRect(0, 0, W, H);

      // ── bg tint ────────────────────────────────────────────────────
      const bgA = t < 0.1 ? easeOut3(t / 0.1) * 0.5 : t > 0.8 ? (1 - (t - 0.8) / 0.2) * 0.5 : 0.5;
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.65);
      bg.addColorStop(0, `rgba(100,30,10,${bgA * 0.8})`);
      bg.addColorStop(0.5, `rgba(20,5,2,${bgA * 0.65})`);
      bg.addColorStop(1, `rgba(0,0,0,${bgA * 0.3})`);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // ── card pop-in then idle ──────────────────────────────────────
      const cardScale = t < 0.1 ? lerp(0.7, 1.06, easeOut5(t / 0.1))
        : t < 0.18 ? lerp(1.06, 0.97, easeOut3((t - 0.1) / 0.08))
        : 1 + Math.sin(t * 18) * 0.008;
      const cardGlow = t < 0.5 ? easeOut3(t / 0.5) : 1 - easeInOut((t - 0.5) / 0.5);
      drawCard(ctx, CARD_CX, MID_Y, 72, 104, cardGlow, cardScale);

      // ── crosshair zoom-in from far, travel to target, lock-on ─────
      // Phase 1 (t 0→0.45): zoom in from far right toward target
      // Phase 2 (t 0.45→0.65): settle + rotate 90° (lock-on)
      // Phase 3 (t 0.65→0.85): hold lock, pulse red
      // Phase 4 (t 0.85→1): fade out

      const chAlpha = t < 0.08 ? easeOut3(t / 0.08)
        : t > 0.88 ? 1 - (t - 0.88) / 0.12
        : 1;

      // scale: starts huge (zoom in effect), snaps to 1
      const chScale = t < 0.45
        ? lerp(2.8, 1.05, easeOut3(t / 0.45))
        : t < 0.52
          ? lerp(1.05, 0.95, easeOut3((t - 0.45) / 0.07))
          : 1;

      // rotation: slowly drifts, snaps 90° on lock
      const chRot = t < 0.55
        ? lerp(0, Math.PI * 0.08, t / 0.55)         // slight drift
        : lerp(Math.PI * 0.08, Math.PI * 0.5,        // snap to lock
            easeOut5(clamp((t - 0.55) / 0.12, 0, 1)));

      const outerR = 46 * chScale;
      const innerR = 26 * chScale;

      // lock pulse: bright red flash at lock moment
      const lockPulse = t > 0.62 && t < 0.82
        ? Math.sin(clamp((t - 0.62) / 0.20, 0, 1) * Math.PI)
        : 0;

      drawCrosshair(ctx, TARGET_CX, MID_Y, outerR, innerR, chRot, chAlpha, lockPulse);

      // ── shockwave ring at lock moment ──────────────────────────────
      if (t > 0.62 && t < 0.85) {
        const st = clamp((t - 0.62) / 0.23, 0, 1);
        ctx.beginPath(); ctx.arc(TARGET_CX, MID_Y, st * 90, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(239,68,68,${(1 - st) * 0.7})`; ctx.lineWidth = 2 + st * 3; ctx.stroke();
      }
      // second ring (delayed)
      if (t > 0.67 && t < 0.88) {
        const st2 = clamp((t - 0.67) / 0.21, 0, 1);
        ctx.beginPath(); ctx.arc(TARGET_CX, MID_Y, st2 * 75, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(251,146,60,${(1 - st2) * 0.5})`; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // ── target avatar ──────────────────────────────────────────────
      const hitIntensity = t > 0.62 && t < 0.82
        ? Math.sin(clamp((t - 0.62) / 0.20, 0, 1) * Math.PI) * 0.9
        : 0;
      const avScale = t < 0.06 ? easeOut3(t / 0.06) : 1;
      if (avScale > 0) {
        drawTargetAvatar(ctx, TARGET_CX, MID_Y, 40 * avScale, imgRef.current, capturedTargetName, targetColor, hitIntensity);
      }

      // ── laser beam from card to crosshair (during lock phase) ─────
      if (t > 0.58 && t < 0.88) {
        const lt = clamp((t - 0.58) / 0.30, 0, 1);
        const beamAlpha = lt < 0.2 ? lt / 0.2 : lt > 0.75 ? 1 - (lt - 0.75) / 0.25 : 1;
        const startX = CARD_CX + 36;
        const endX = TARGET_CX - outerR - 4;

        ctx.save();
        // outer glow
        ctx.strokeStyle = `rgba(239,68,68,${beamAlpha * 0.25})`;
        ctx.lineWidth = 8; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(startX, MID_Y); ctx.lineTo(endX, MID_Y); ctx.stroke();
        // core beam
        ctx.strokeStyle = `rgba(255,200,100,${beamAlpha * 0.85})`;
        ctx.lineWidth = 1.5; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(startX, MID_Y); ctx.lineTo(endX, MID_Y); ctx.stroke();
        ctx.restore();
      }

      // ── impact spark burst at lock moment ──────────────────────────
      if (t >= 0.63 && !impactSpawnedRef.current) {
        impactSpawnedRef.current = true;
        for (let i = 0; i < 22; i++) {
          const a = rnd(0, Math.PI * 2); const sp = rnd(1.5, 6);
          particlesRef.current.push({
            x: TARGET_CX, y: MID_Y + rnd(-20, 20),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            life: rnd(0.3, 0.8), age: 0, size: rnd(1.5, 3.5),
            col: i % 2 === 0 ? "#fbbf24" : "#ef4444",
          });
        }
      }

      // ── particles ─────────────────────────────────────────────────
      particlesRef.current.forEach((p) => {
        if (t < 0.05) return;
        p.age += 0.016; p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.97;
        const pa = clamp(1 - p.age / p.life, 0, 1);
        if (pa <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * pa, 0, Math.PI * 2);
        ctx.fillStyle = p.col; ctx.globalAlpha = pa * 0.85; ctx.fill(); ctx.globalAlpha = 1;
      });

      // ── fade out ───────────────────────────────────────────────────
      if (t > 0.82) {
        ctx.fillStyle = `rgba(0,0,0,${((t - 0.82) / 0.18) * 0.92})`; ctx.fillRect(0, 0, W, H);
      }

      if (t < 1) { rafRef.current = requestAnimationFrame(frame); }
      else {
        if (!completedRef.current) {
          completedRef.current = true;
          clearTimeout(safetyTimer);
          onCompleteRef.current();
        }
      }
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { stopAnim(); clearTimeout(safetyTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  return (
    <>
      <style>{`
        @keyframes ta-backdrop-in { from{opacity:0} to{opacity:1} }
        @keyframes ta-title-in {
          0%  { opacity:0; transform:translateY(14px) scale(0.82); }
          60% { opacity:1; transform:translateY(-4px) scale(1.06); }
          100%{ opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes ta-meta-in {
          0%  { opacity:0; transform:translateX(12px); }
          100%{ opacity:1; transform:translateX(0); }
        }
        @keyframes ta-count-pulse {
          0%,100%{ transform:scale(1); }
          50%    { transform:scale(1.2); }
        }
      `}</style>

      {/* dim backdrop */}
      <div style={{
        position:"fixed", inset:0, zIndex:4600,
        background:"rgba(2,0,8,0.80)", backdropFilter:"blur(7px)",
        animation:"ta-backdrop-in 0.22s ease", pointerEvents:"none",
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
            animation:"ta-title-in 0.42s cubic-bezier(0.34,1.56,0.64,1) both",
            fontFamily:"'Fredoka One', cursive",
          }}>
            <div style={{
              fontSize:"11px", letterSpacing:"0.18em", textTransform:"uppercase",
              color:"rgba(249,115,22,0.55)", marginBottom:"3px",
            }}>
              {state.playedByDisplayName} เล่น
            </div>
            <div style={{
              fontSize:"28px", fontWeight:900, letterSpacing:"0.06em",
              color:"#fed7aa", lineHeight:1,
              textShadow:"0 0 24px rgba(249,115,22,0.8), 0 0 52px rgba(249,115,22,0.35)",
            }}>
              TARGETED ATTACK!
            </div>
          </div>

          {/* canvas */}
          <canvas ref={canvasRef} style={{
            borderRadius:"16px", display:"block",
            width:"min(560px, 92vw)", height:"auto",
            aspectRatio:"560/300", maxWidth:"100%",
          }} />

          {/* target label + count badge */}
          <div style={{
            marginTop:"10px", display:"flex", alignItems:"center", gap:"10px",
            animation:"ta-meta-in 0.35s 0.25s ease both",
            fontFamily:"'Fredoka One', cursive",
          }}>
            {state.targetDisplayName && (
              <div style={{
                display:"flex", alignItems:"center", gap:"6px",
                padding:"5px 14px", borderRadius:"20px",
                background:"rgba(239,68,68,0.14)", border:"1px solid rgba(239,68,68,0.38)",
              }}>
                <span style={{ fontSize:"13px", color:"rgba(253,186,116,0.65)" }}>เป้าหมาย</span>
                <span style={{
                  fontSize:"14px", fontWeight:800, color:"#fed7aa",
                  textShadow:"0 0 10px rgba(249,115,22,0.6)",
                }}>
                  {state.targetDisplayName}
                </span>
              </div>
            )}
            {(state.pendingAttacks ?? 0) > 1 && (
              <div style={{
                display:"flex", alignItems:"center", gap:"5px",
                padding:"5px 14px", borderRadius:"20px",
                background:"rgba(239,68,68,0.2)", border:"1.5px solid rgba(239,68,68,0.5)",
                animation:"ta-count-pulse 0.55s 0.7s ease-in-out 2",
              }}>
                <span style={{ fontSize:"16px", color:"#fbbf24" }}>🎯</span>
                <span style={{
                  fontSize:"15px", fontWeight:900, color:"#fed7aa",
                  textShadow:"0 0 14px rgba(249,115,22,0.85)",
                }}>
                  ×{state.pendingAttacks} เทิร์น
                </span>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}