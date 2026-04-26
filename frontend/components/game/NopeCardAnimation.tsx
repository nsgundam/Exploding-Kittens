"use client";

import React, { useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
export interface NopeAnimState {
  playedByDisplayName: string;
  isCancel: boolean;        // true = Nope ยกเลิก action, false = Nope ถูก Nope อีกที
  nopeCount: number;        // จำนวน Nope ที่สะสม (1, 3, 5 = cancel; 2, 4 = ผ่าน)
  cancelledCardCode?: string; // การ์ดที่ถูกยกเลิก (แสดงใน label)
}

interface NopeCardAnimationProps {
  state: NopeAnimState | null;
  onComplete: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const TOTAL_MS = 1000;
const W = 560;
const H = 300;

// ── Math helpers ───────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOut5(t: number) { return 1 - Math.pow(1 - t, 5); }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function rnd(min: number, max: number) { return min + Math.random() * (max - min); }

// ── Shard particle ─────────────────────────────────────────────────────────
interface Shard {
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rot: number; vr: number;
  life: number; age: number;
  col: string;
}

// ── Draw Nope card ─────────────────────────────────────────────────────────
function drawNopeCard(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  scale: number,
  glowI: number,
  skewY: number,
) {
  const x = cx - (w / 2) * scale;
  const y = cy - (h / 2) * scale;
  const rw = w * scale; const rh = h * scale; const r = 10 * scale;

  ctx.save();
  ctx.translate(cx, cy + cy * skewY * 0.05);
  ctx.transform(1, skewY, 0, 1, 0, 0);
  ctx.translate(-cx, -(cy + cy * skewY * 0.05));

  if (glowI > 0) { ctx.shadowColor = `rgba(220,38,38,${glowI})`; ctx.shadowBlur = 32 * glowI; }

  const grad = ctx.createLinearGradient(x, y, x + rw, y + rh);
  grad.addColorStop(0, "#7f1d1d"); grad.addColorStop(0.45, "#991b1b"); grad.addColorStop(1, "#450a0a");

  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + rw - r, y); ctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
  ctx.lineTo(x + rw, y + rh - r); ctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
  ctx.lineTo(x + r, y + rh); ctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fillStyle = grad; ctx.fill();
  ctx.strokeStyle = "rgba(239,68,68,0.65)"; ctx.lineWidth = 1.8 * scale; ctx.stroke();
  ctx.shadowBlur = 0;

  // inner inset border
  const ins = 6 * scale; const ir = 6 * scale;
  ctx.beginPath();
  ctx.moveTo(x+ins+ir,y+ins); ctx.lineTo(x+rw-ins-ir,y+ins);
  ctx.quadraticCurveTo(x+rw-ins,y+ins, x+rw-ins,y+ins+ir);
  ctx.lineTo(x+rw-ins,y+rh-ins-ir); ctx.quadraticCurveTo(x+rw-ins,y+rh-ins, x+rw-ins-ir,y+rh-ins);
  ctx.lineTo(x+ins+ir,y+rh-ins); ctx.quadraticCurveTo(x+ins,y+rh-ins, x+ins,y+rh-ins-ir);
  ctx.lineTo(x+ins,y+ins+ir); ctx.quadraticCurveTo(x+ins,y+ins, x+ins+ir,y+ins);
  ctx.closePath();
  ctx.strokeStyle = "rgba(239,68,68,0.22)"; ctx.lineWidth = scale; ctx.stroke();

  // NOPE text
  ctx.font = `900 ${22 * scale}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "#fca5a5";
  ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 10 * scale;
  ctx.fillText("NOPE", cx, cy);
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ── Draw X slash ───────────────────────────────────────────────────────────
function drawXSlash(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  progress: number,  // 0→1 each arm draws in
  alpha: number,
) {
  if (progress <= 0 || alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineCap = "round";
  ctx.shadowColor = "#ef4444";
  ctx.shadowBlur = 14;

  const p1 = clamp(progress * 2, 0, 1);
  const p2 = clamp(progress * 2 - 1, 0, 1);

  // arm 1: top-left → bottom-right
  const ax1 = cx - radius; const ay1 = cy - radius;
  const ax2 = lerp(ax1, cx + radius, p1);
  const ay2 = lerp(ay1, cy + radius, p1);
  ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();

  // arm 2: top-right → bottom-left (starts after arm1 is halfway)
  if (p2 > 0) {
    const bx1 = cx + radius; const by1 = cy - radius;
    const bx2 = lerp(bx1, cx - radius, p2);
    const by2 = lerp(by1, cy + radius, p2);
    ctx.strokeStyle = "#f87171"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(bx1, by1); ctx.lineTo(bx2, by2); ctx.stroke();
  }

  ctx.restore();
}

// ── Component ──────────────────────────────────────────────────────────────
export function NopeCardAnimation({ state, onComplete }: NopeCardAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const shardsRef = useRef<Shard[]>([]);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopAnim = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }, []);

  useEffect(() => {
    if (!state) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    completedRef.current = false;
    shardsRef.current = [];

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    const CX = W / 2;
    const CY = H / 2;

    // pre-build shards (spawn at slam moment t≈0.15)
    for (let i = 0; i < 36; i++) {
      const a = rnd(0, Math.PI * 2); const sp = rnd(2.5, 8);
      shardsRef.current.push({
        x: CX, y: CY,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0, 2.5),
        w: rnd(5, 18), h: rnd(2, 7),
        rot: rnd(0, Math.PI), vr: rnd(-0.2, 0.2),
        life: rnd(0.45, 1.0), age: 0,
        col: `hsl(${rnd(0, 15)},${rnd(70, 100)}%,${rnd(35, 60)}%)`,
      });
    }

    startRef.current = performance.now();
    let shardsSpawned = false;

    const safetyTimer = setTimeout(() => {
      stopAnim();
      if (!completedRef.current) { completedRef.current = true; onCompleteRef.current(); }
    }, TOTAL_MS + 300);

    const capturedNopeCount = state.nopeCount;

    function frame(now: number) {
      if (!ctx) return;
      const t = clamp((now - startRef.current) / TOTAL_MS, 0, 1);

      ctx.clearRect(0, 0, W, H);

      // ── bg shockwave tint ──────────────────────────────────────────
      const bgA = t < 0.1 ? easeOut3(t / 0.1) * 0.55 : t > 0.78 ? (1 - (t - 0.78) / 0.22) * 0.55 : 0.55;
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.6);
      bg.addColorStop(0, `rgba(127,29,29,${bgA * 0.8})`);
      bg.addColorStop(0.5, `rgba(20,3,3,${bgA * 0.65})`);
      bg.addColorStop(1, `rgba(0,0,0,${bgA * 0.3})`);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // ── shockwave rings (slam impact) ─────────────────────────────
      if (t > 0.12 && t < 0.55) {
        [0, 0.05, 0.11].forEach((off, i) => {
          const rt = clamp((t - 0.12 - off) / 0.43, 0, 1);
          if (rt <= 0) return;
          ctx.beginPath(); ctx.arc(CX, CY, rt * 200, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(220,38,38,${(1 - rt) * (0.55 - i * 0.13)})`;
          ctx.lineWidth = 3 - i * 0.8; ctx.stroke();
        });
      }

      // ── card slam from top ────────────────────────────────────────
      // drops from above with overshoot bounce
      const cardYOff = t < 0.12
        ? lerp(-H * 0.7, 12, easeOut5(t / 0.12))
        : t < 0.18
          ? lerp(12, -6, easeOut3((t - 0.12) / 0.06))
          : t < 0.24
            ? lerp(-6, 2, easeOut3((t - 0.18) / 0.06))
            : 0;
      const cardScale = t < 0.12 ? lerp(0.6, 1.08, easeOut5(t / 0.12))
        : t < 0.2 ? lerp(1.08, 0.96, easeOut3((t - 0.12) / 0.08)) : 1;
      const cardSkew = t < 0.12 ? (1 - easeOut5(t / 0.12)) * 0.18 : 0;
      const cardGlow = t < 0.5 ? easeOut3(t / 0.5) : 1 - easeInOut((t - 0.5) / 0.5);

      drawNopeCard(ctx, CX, CY + cardYOff, 72, 104, cardScale, cardGlow, cardSkew);

      // ── X slash draws in after slam ───────────────────────────────
      const slashT = clamp((t - 0.16) / 0.30, 0, 1);
      const slashAlpha = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1;
      drawXSlash(ctx, CX, CY + cardYOff, 60, slashT, slashAlpha * 0.88);

      // ── shard burst (spawn once at slam) ─────────────────────────
      if (t >= 0.14 && !shardsSpawned) {
        shardsSpawned = true;
        shardsRef.current.forEach(s => { s.x = CX; s.y = CY; s.age = 0; });
      }
      if (shardsSpawned) {
        shardsRef.current.forEach(s => {
          s.age += 0.016; s.x += s.vx; s.y += s.vy; s.vy += 0.14; s.rot += s.vr;
          const sa = clamp(1 - s.age / s.life, 0, 1);
          if (sa <= 0) return;
          ctx.save();
          ctx.globalAlpha = sa * 0.85;
          ctx.translate(s.x, s.y); ctx.rotate(s.rot);
          ctx.fillStyle = s.col; ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
          ctx.restore();
        });
      }

      // ── red screen edge vignette flash at slam ────────────────────
      if (t > 0.12 && t < 0.45) {
        const vt = clamp((t - 0.12) / 0.33, 0, 1);
        const va = Math.sin(vt * Math.PI) * 0.35;
        const vg = ctx.createRadialGradient(CX, CY, W * 0.2, CX, CY, W * 0.7);
        vg.addColorStop(0, "rgba(0,0,0,0)");
        vg.addColorStop(1, `rgba(180,10,10,${va})`);
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }

      // ── "NOPE ×N" stacking indicator ─────────────────────────────
      if (capturedNopeCount > 1 && t > 0.25 && t < 0.88) {
        const nt = clamp((t - 0.25) / 0.12, 0, 1);
        ctx.save();
        ctx.globalAlpha = easeOut3(nt) * (t > 0.78 ? 1 - (t - 0.78) / 0.10 : 1);
        ctx.font = `900 ${18}px sans-serif`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillStyle = "#fca5a5";
        ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 12;
        ctx.fillText(`NOPE ×${capturedNopeCount}`, CX, CY + 72);
        ctx.restore();
      }

      // ── fade out ──────────────────────────────────────────────────
      if (t > 0.80) {
        ctx.fillStyle = `rgba(0,0,0,${((t - 0.80) / 0.20) * 0.92})`; ctx.fillRect(0, 0, W, H);
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

  // label ใต้การ์ด
  const resultLabel = state.isCancel ? "ยกเลิก!" : "ถูก Nope!";
  const resultColor = state.isCancel ? "#fca5a5" : "#fdba74";

  return (
    <>
      <style>{`
        @keyframes np-backdrop-in { from{opacity:0} to{opacity:1} }
        @keyframes np-title-in {
          0%  { opacity:0; transform:translateY(-18px) scale(1.4) rotate(-4deg); }
          55% { opacity:1; transform:translateY(4px) scale(0.97) rotate(1deg); }
          100%{ opacity:1; transform:translateY(0) scale(1) rotate(0deg); }
        }
        @keyframes np-result-in {
          0%  { opacity:0; transform:scale(0.7) translateY(8px); }
          65% { opacity:1; transform:scale(1.06) translateY(-2px); }
          100%{ opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes np-shake {
          0%,100%{ transform:translateX(0); }
          20%    { transform:translateX(-5px); }
          40%    { transform:translateX(5px); }
          60%    { transform:translateX(-3px); }
          80%    { transform:translateX(3px); }
        }
      `}</style>

      {/* backdrop */}
      <div style={{
        position:"fixed", inset:0, zIndex:4600,
        background:"rgba(2,0,8,0.82)", backdropFilter:"blur(7px)",
        animation:"np-backdrop-in 0.18s ease", pointerEvents:"none",
      }} />

      {/* stage */}
      <div style={{
        position:"fixed", inset:0, zIndex:4601,
        display:"flex", alignItems:"center", justifyContent:"center",
        pointerEvents:"none",
      }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>

          {/* NOPE title — slams in from above */}
          <div style={{
            marginBottom:"10px", textAlign:"center",
            animation:"np-title-in 0.38s cubic-bezier(0.22,1,0.36,1) both",
            fontFamily:"'Fredoka One', cursive",
          }}>
            <div style={{
              fontSize:"11px", letterSpacing:"0.18em", textTransform:"uppercase",
              color:"rgba(239,68,68,0.5)", marginBottom:"3px",
            }}>
              {state.playedByDisplayName} เล่น
            </div>
            <div style={{
              fontSize:"36px", fontWeight:900, letterSpacing:"0.08em",
              color:"#fca5a5", lineHeight:1,
              textShadow:"0 0 28px rgba(220,38,38,0.85), 0 0 60px rgba(220,38,38,0.35)",
              animation:"np-shake 0.35s 0.18s ease both",
            }}>
              NOPE!
            </div>
          </div>

          {/* canvas */}
          <canvas ref={canvasRef} style={{
            borderRadius:"16px", display:"block",
            width:"min(560px, 92vw)", height:"auto",
            aspectRatio:"560/300", maxWidth:"100%",
          }} />

          {/* result label */}
          <div style={{
            marginTop:"10px", textAlign:"center",
            animation:"np-result-in 0.36s 0.22s cubic-bezier(0.34,1.56,0.64,1) both",
            fontFamily:"'Fredoka One', cursive",
          }}>
            {state.cancelledCardCode && (
              <div style={{
                fontSize:"12px", color:"rgba(252,165,165,0.55)",
                letterSpacing:"0.1em", marginBottom:"4px",
              }}>
                {state.cancelledCardCode.replace(/^GVE_/, "")} ถูกยกเลิก
              </div>
            )}
            <div style={{
              display:"inline-flex", alignItems:"center", gap:"7px",
              padding:"6px 18px", borderRadius:"20px",
              background: state.isCancel ? "rgba(239,68,68,0.18)" : "rgba(249,115,22,0.18)",
              border: state.isCancel ? "1.5px solid rgba(239,68,68,0.45)" : "1.5px solid rgba(249,115,22,0.45)",
            }}>
              <span style={{ fontSize:"16px" }}>{state.isCancel ? "🚫" : "↩️"}</span>
              <span style={{
                fontSize:"14px", fontWeight:800, color: resultColor,
                textShadow:`0 0 10px ${resultColor}66`,
              }}>
                {resultLabel}
              </span>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}