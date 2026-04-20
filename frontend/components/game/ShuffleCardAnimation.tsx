"use client";

import React, { useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
export interface ShuffleAnimState {
  playedByDisplayName: string;
}

interface ShuffleCardAnimationProps {
  state: ShuffleAnimState | null;
  onComplete: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const TOTAL_MS = 2400;
const W = 560;
const H = 300;
const CX = W / 2;
const CY = H / 2;
const CARD_COUNT = 7;
const CW = 56;  // card width
const CH = 80;  // card height

// ── Theme — matches game deck card back ───────────────────────────────────
// card back gradient: #6b2f0e → #3d1505 → #1a0800
// border gold: #f5a623
// glow: rgba(245,166,35,...)
const CARD_DARKS  = ['#1a0800','#220e02','#2b1104','#3d1505','#4e1a06','#6b2f0e','#7a3610'];
const CARD_LIGHTS = ['#3d1505','#4e1a06','#6b2f0e','#7a3610','#8c4020','#a04e28','#b86030'];
const GOLD        = '#f5a623';
const GOLD_DIM    = 'rgba(245,166,35,0.55)';
const GOLD_GLOW   = 'rgba(245,166,35,';

// ── Math helpers ───────────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOut5(t: number) { return 1 - Math.pow(1 - t, 5); }
function easeInOut(t: number) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

// ── Particle ───────────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; col: string; }

// ── Draw one deck card (brown/gold theme) ──────────────────────────────────
function drawDeckCard(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  w: number, h: number,
  idx: number,
  alpha: number,
  rot: number,
  sx: number, sy: number,   // scaleX, scaleY
  glowI: number,
) {
  const dark  = CARD_DARKS[idx % CARD_DARKS.length];
  const light = CARD_LIGHTS[idx % CARD_LIGHTS.length];
  const r = 8;
  const hw = (w / 2) * sx;
  const hh = (h / 2) * sy;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.globalAlpha = alpha;

  if (glowI > 0) {
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = 18 * glowI;
  }

  const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  grad.addColorStop(0, light);
  grad.addColorStop(0.55, dark);
  grad.addColorStop(1, '#0a0400');

  // card body
  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh); ctx.lineTo(hw - r, -hh);
  ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
  ctx.lineTo(hw, hh - r); ctx.quadraticCurveTo(hw, hh, hw - r, hh);
  ctx.lineTo(-hw + r, hh); ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
  ctx.lineTo(-hw, -hh + r); ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // diagonal hatch pattern (like CardBack in DrawCardAnimation)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh); ctx.lineTo(hw - r, -hh);
  ctx.quadraticCurveTo(hw, -hh, hw, -hh + r);
  ctx.lineTo(hw, hh - r); ctx.quadraticCurveTo(hw, hh, hw - r, hh);
  ctx.lineTo(-hw + r, hh); ctx.quadraticCurveTo(-hw, hh, -hw, hh - r);
  ctx.lineTo(-hw, -hh + r); ctx.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = 'rgba(245,166,35,0.12)';
  ctx.lineWidth = 0.7;
  for (let i = -h; i < w + h; i += 7) {
    ctx.beginPath();
    ctx.moveTo(-hw + i, -hh);
    ctx.lineTo(-hw + i - h, hh);
    ctx.stroke();
  }
  ctx.restore();

  // inner inset border
  const ins = 4;
  ctx.beginPath();
  ctx.moveTo(-hw + ins + r, -hh + ins); ctx.lineTo(hw - ins - r, -hh + ins);
  ctx.quadraticCurveTo(hw - ins, -hh + ins, hw - ins, -hh + ins + r);
  ctx.lineTo(hw - ins, hh - ins - r); ctx.quadraticCurveTo(hw - ins, hh - ins, hw - ins - r, hh - ins);
  ctx.lineTo(-hw + ins + r, hh - ins); ctx.quadraticCurveTo(-hw + ins, hh - ins, -hw + ins, hh - ins - r);
  ctx.lineTo(-hw + ins, -hh + ins + r); ctx.quadraticCurveTo(-hw + ins, -hh + ins, -hw + ins + r, -hh + ins);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(245,166,35,0.22)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  ctx.restore();
}

// ── Draw vortex orbit ring ─────────────────────────────────────────────────
function drawVortexRing(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  r: number, alpha: number, rot: number,
  sides = 36,
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = GOLD_DIM;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = GOLD;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i <= sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    const wobble = r + Math.sin(a * 5 + rot * 6) * 6;
    const px = cx + Math.cos(a) * wobble;
    const py = cy + Math.sin(a) * wobble * 0.6;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

// ── Card state per phase ───────────────────────────────────────────────────
interface CardState {
  x: number; y: number; rot: number;
  alpha: number; sx: number; sy: number; glowI: number; idx: number;
}

function getCardState(i: number, t: number): CardState {
  const fanAngle = ((i / (CARD_COUNT - 1)) - 0.5) * Math.PI * 0.75;
  const fanR = 130;
  const fanX = CX + Math.cos(fanAngle) * fanR;
  const fanY = CY + Math.sin(fanAngle) * 28 - 18;
  const fanRot = ((i / (CARD_COUNT - 1)) - 0.5) * 0.75;

  if (t < 0.35) {
    // Phase 1: fan out with stagger
    const stagger = clamp((t - 0.03 * i) / 0.32, 0, 1);
    const sp = easeOut3(stagger);
    const scaleWobble = 1 + Math.sin(sp * Math.PI) * 0.06;
    return {
      x: lerp(CX, fanX, sp), y: lerp(CY, fanY, sp),
      rot: lerp(0, fanRot, sp), alpha: 1,
      sx: scaleWobble, sy: scaleWobble * 0.92, glowI: sp * 0.5, idx: i,
    };
  } else if (t < 0.65) {
    // Phase 2: swirl vortex
    const p = clamp((t - 0.35) / 0.30, 0, 1);
    const sp = easeInOut(p);
    const baseAngle = fanAngle + sp * Math.PI * (1.6 + i * 0.12);
    const r = lerp(fanR, 155, Math.sin(sp * Math.PI) * 0.6 + 0.4);
    const px = CX + Math.cos(baseAngle) * r;
    const py = CY + Math.sin(baseAngle) * r * 0.56;
    const rot = fanRot + sp * Math.PI * (2.2 + i * 0.18);
    const scaleW = 1 + Math.sin(sp * Math.PI * 2.5) * 0.07;
    return {
      x: px, y: py, rot, alpha: 1,
      sx: scaleW, sy: scaleW * 0.9, glowI: 0.3 + sp * 0.5, idx: i,
    };
  } else {
    // Phase 3: slam back to stack (shuffled order)
    const p = clamp((t - 0.65) / 0.35, 0, 1);
    const slam = easeOut5(p);
    const prevAngle = fanAngle + Math.PI * (1.6 + i * 0.12);
    const px = CX + Math.cos(prevAngle) * 155;
    const py = CY + Math.sin(prevAngle) * 155 * 0.56;
    const newI = (i * 3 + 2) % CARD_COUNT;
    const stackOff = (newI - (CARD_COUNT - 1) / 2) * 1.2;
    const scaleImpact = 1 + Math.sin((1 - p) * Math.PI) * 0.06;
    return {
      x: lerp(px, CX + stackOff, slam),
      y: lerp(py, CY, slam),
      rot: lerp(prevAngle + Math.PI * 2.5, 0, slam),
      alpha: 1,
      sx: scaleImpact, sy: scaleImpact * 0.92,
      glowI: (1 - slam) * 0.8,
      idx: i,
    };
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export function ShuffleCardAnimation({ state, onComplete }: ShuffleCardAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const vortexRotRef = useRef(0);
  const particleSpawnedRef = useRef(false);
  const slamSpawnedRef = useRef(false);
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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    completedRef.current = false;
    particlesRef.current = [];
    particleSpawnedRef.current = false;
    slamSpawnedRef.current = false;
    vortexRotRef.current = 0;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    startRef.current = performance.now();

    const safetyTimer = setTimeout(() => {
      stopAnim();
      if (!completedRef.current) { completedRef.current = true; onCompleteRef.current(); }
    }, TOTAL_MS + 300);

    const capturedName = state.playedByDisplayName;

    function spawnParticles(n: number, ox: number, oy: number, col: string) {
      for (let i = 0; i < n; i++) {
        const a = rnd(0, Math.PI * 2); const sp = rnd(1.8, 6);
        particlesRef.current.push({
          x: ox, y: oy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - rnd(0.5, 2.5),
          life: rnd(0.5, 1.2), age: 0, size: rnd(1.5, 4),
          col,
        });
      }
    }

    function frame(now: number) {
      if (!ctx) return;
      const t = clamp((now - startRef.current) / TOTAL_MS, 0, 1);
      vortexRotRef.current += 0.038;

      ctx.clearRect(0, 0, W, H);

      // ── bg radial tint ─────────────────────────────────────────────
      const bgA = t < 0.1 ? easeOut3(t / 0.1) * 0.5
        : t > 0.82 ? (1 - (t - 0.82) / 0.18) * 0.5 : 0.5;
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 220);
      bg.addColorStop(0, `rgba(90,40,8,${bgA * 0.75})`);
      bg.addColorStop(0.55, `rgba(30,12,2,${bgA * 0.6})`);
      bg.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // ── shockwave at slam impact ───────────────────────────────────
      if (t > 0.64 && t < 0.9) {
        [0, 0.04, 0.09].forEach((off, ii) => {
          const rt = clamp((t - 0.64 - off) / 0.26, 0, 1);
          if (rt <= 0) return;
          ctx.beginPath(); ctx.arc(CX, CY, rt * 170, 0, Math.PI * 2);
          ctx.strokeStyle = `${GOLD_GLOW}${(1 - rt) * (0.5 - ii * 0.12)})`;
          ctx.lineWidth = 2.5 - ii * 0.7; ctx.stroke();
        });
      }

      // ── vortex rings (during swirl) ────────────────────────────────
      if (t > 0.28 && t < 0.70) {
        const vt = clamp((t - 0.28) / 0.42, 0, 1);
        const vA = Math.sin(vt * Math.PI) * 0.75;
        const vR = lerp(55, 175, Math.sin(vt * Math.PI * 0.9));
        drawVortexRing(ctx, CX, CY, vR, vA, vortexRotRef.current, 42);
        drawVortexRing(ctx, CX, CY, vR * 0.62, vA * 0.45, vortexRotRef.current * 1.35 + 1.1, 28);
      }

      // ── particles ─────────────────────────────────────────────────
      if (t > 0.44 && t < 0.48 && !particleSpawnedRef.current) {
        particleSpawnedRef.current = true;
        for (let i = 0; i < 3; i++) {
          spawnParticles(7, CX + rnd(-70, 70), CY + rnd(-50, 50), GOLD);
        }
      }
      if (t > 0.65 && !slamSpawnedRef.current) {
        slamSpawnedRef.current = true;
        spawnParticles(24, CX, CY, GOLD);
        spawnParticles(10, CX, CY, '#fde68a');
        spawnParticles(8, CX, CY, '#fff8e1');
      }

      particlesRef.current.forEach(p => {
        p.age += 0.016; p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.vx *= 0.97;
        const pa = clamp(1 - p.age / p.life, 0, 1);
        if (pa <= 0) return;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * pa, 0, Math.PI * 2);
        ctx.fillStyle = p.col; ctx.globalAlpha = pa * 0.9; ctx.fill(); ctx.globalAlpha = 1;
      });

      // ── draw cards ────────────────────────────────────────────────
      // back-to-front during fan/swirl, front-to-back during slam
      const order = t < 0.65
        ? [...Array(CARD_COUNT).keys()]
        : [...Array(CARD_COUNT).keys()].reverse();

      order.forEach(i => {
        const s = getCardState(i, t);
        drawDeckCard(ctx, s.x, s.y, CW, CH, s.idx, s.alpha, s.rot, s.sx, s.sy, s.glowI);
      });

      // ── slam gold flash ────────────────────────────────────────────
      if (t > 0.65 && t < 0.82) {
        const ft = clamp((t - 0.65) / 0.17, 0, 1);
        const fa = Math.sin(ft * Math.PI) * 0.38;
        const fg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 130);
        fg.addColorStop(0, `${GOLD_GLOW}${fa})`);
        fg.addColorStop(0.5, `${GOLD_GLOW}${fa * 0.35})`);
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H);
      }

      // ── "SHUFFLED!" label ──────────────────────────────────────────
      const labelT = t > 0.70 ? easeOut3(clamp((t - 0.70) / 0.14, 0, 1)) : 0;
      if (labelT > 0) {
        const labelA = labelT * (t > 0.84 ? 1 - (t - 0.84) / 0.16 : 1);
        ctx.save();
        ctx.globalAlpha = labelA;
        ctx.font = '900 26px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillStyle = GOLD;
        ctx.shadowColor = GOLD; ctx.shadowBlur = 20;
        ctx.fillText('SHUFFLED!', CX, CY + 56);
        ctx.restore();
      }

      // ── player name ────────────────────────────────────────────────
      if (t > 0.05 && t < 0.90) {
        const nameA = easeOut3(clamp(t / 0.15, 0, 1)) * (t > 0.80 ? 1 - (t - 0.80) / 0.10 : 1);
        ctx.save();
        ctx.globalAlpha = nameA * 0.55;
        ctx.font = '500 11px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.fillStyle = GOLD;
        ctx.fillText(`${capturedName} เล่น Shuffle`, CX, CY - 64);
        ctx.restore();
      }

      // ── fade out ──────────────────────────────────────────────────
      if (t > 0.84) {
        ctx.fillStyle = `rgba(0,0,0,${((t - 0.84) / 0.16) * 0.94})`;
        ctx.fillRect(0, 0, W, H);
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
    return () => { stopAnim(); clearTimeout(safetyTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  return (
    <>
      <style>{`
        @keyframes sh-backdrop-in { from{opacity:0} to{opacity:1} }
        @keyframes sh-title-in {
          0%  { opacity:0; transform:translateY(12px) scale(0.85); }
          60% { opacity:1; transform:translateY(-3px) scale(1.05); }
          100%{ opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>

      {/* backdrop */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 4600,
        background: 'rgba(2,0,8,0.80)', backdropFilter: 'blur(7px)',
        animation: 'sh-backdrop-in 0.22s ease', pointerEvents: 'none',
      }} />

      {/* stage */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 4601,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>

          {/* title */}
          <div style={{
            marginBottom: '10px', textAlign: 'center',
            animation: 'sh-title-in 0.42s cubic-bezier(0.34,1.56,0.64,1) both',
            fontFamily: "'Fredoka One', cursive",
          }}>
            <div style={{
              fontSize: '11px', letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(245,166,35,0.5)', marginBottom: '3px',
            }}>
              {state.playedByDisplayName} เล่น
            </div>
            <div style={{
              fontSize: '28px', fontWeight: 900, letterSpacing: '0.06em',
              color: '#fde68a', lineHeight: 1,
              textShadow: '0 0 24px rgba(245,166,35,0.75), 0 0 52px rgba(245,166,35,0.3)',
            }}>
              SHUFFLE!
            </div>
          </div>

          {/* canvas */}
          <canvas ref={canvasRef} style={{
            borderRadius: '16px', display: 'block',
            width: 'min(560px, 92vw)', height: 'auto',
            aspectRatio: '560/300', maxWidth: '100%',
          }} />

        </div>
      </div>
    </>
  );
}