"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// IKImplosionVoid — Implosion → Singularity → Explosion
//
// Phase 1  0–40%  : warp rings + particles sucked inward   (faster)
// Phase 2 40–55%  : singularity compression (peak)
// Phase 3 52–100% : void explosion rings + screen flash
//
// onDone() fires after animation ends → caller calls eliminatePlayer()
// ─────────────────────────────────────────────────────────────

interface IKImplosionVoidProps {
  active: boolean;
  onDone: () => void;
}

const TOTAL_MS = 1400; // ลดจาก 2200 → 1400ms (เร็วขึ้น ~37%)

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
function easeInQuad(t: number) { return t * t; }
function easeOutQuad(t: number) { return 1 - (1 - t) * (1 - t); }

interface Particle {
  ox: number; oy: number;
  x: number; y: number;
  size: number; hue: number; speed: number;
}

function buildParticles(cx: number, cy: number): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < 64; i++) {
    const ang = (i / 64) * Math.PI * 2 + rnd(-0.1, 0.1);
    const dist = rnd(55, 130);
    const ox = cx + Math.cos(ang) * dist;
    const oy = cy + Math.sin(ang) * dist;
    out.push({ ox, oy, x: ox, y: oy, size: rnd(1.5, 4.5), hue: rnd(260, 320), speed: rnd(0.7, 1.4) });
  }
  return out;
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  progress: number,
  particles: Particle[],
) {
  const cx = W / 2, cy = H / 2, p = progress;

  ctx.fillStyle = "rgba(5,1,15,0.22)";
  ctx.fillRect(0, 0, W, H);

  // ── Phase 1: IMPLOSION (0–0.40) ──────────────────────────
  if (p < 0.40) {
    const fp = p / 0.40;
    const eq = easeInQuad(fp);

    // warp rings contracting
    for (let r = 0; r < 6; r++) {
      const radius = lerp(160 - r * 22, 4, eq);
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(radius, 1), 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${275 + r * 8},90%,70%,${(0.35 + r * 0.08) * (1 - fp * 0.2)})`;
      ctx.lineWidth = lerp(2.5, 0.5, eq);
      ctx.stroke();
    }

    // distortion spokes
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const len = lerp(80, 6, eq);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * len * 1.5, cy + Math.sin(ang) * len * 1.5);
      ctx.lineTo(cx + Math.cos(ang) * 8, cy + Math.sin(ang) * 8);
      ctx.strokeStyle = `hsla(${290 + i * 6},80%,75%,${0.18 * fp})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // particles sucked inward
    particles.forEach((pt) => {
      pt.x = lerp(pt.ox, cx, eq * eq);
      pt.y = lerp(pt.oy, cy, eq * eq);
      const alpha = lerp(0.9, 0.2, fp);
      const size = Math.max(pt.size * lerp(1, 0.25, eq), 0.5);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${pt.hue},90%,75%,${alpha})`;
      ctx.fill();
      const gg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, size * 3);
      gg.addColorStop(0, `hsla(${pt.hue},90%,80%,${alpha * 0.4})`);
      gg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, size * 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // growing void
    const vr = easeInQuad(fp) * 55;
    const vg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(vr, 1));
    vg.addColorStop(0, "rgba(0,0,0,0.97)");
    vg.addColorStop(0.65, "rgba(20,0,50,0.85)");
    vg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vg;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(vr, 1), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(vr, 1), 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(280,100%,70%,${fp * 0.9})`;
    ctx.lineWidth = 3.5;
    ctx.stroke();
  }

  // ── Phase 2: SINGULARITY (0.38–0.56) ─────────────────────
  if (p >= 0.38 && p < 0.56) {
    const fp = (p - 0.38) / 0.18;
    const peakPulse = Math.sin(fp * Math.PI);
    const sr = lerp(55, 3, easeInQuad(fp));
    const sg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(sr, 1));
    sg.addColorStop(0, `rgba(255,255,255,${Math.min(fp * 5, 1)})`);
    sg.addColorStop(0.25, `rgba(220,100,255,${fp * 0.95})`);
    sg.addColorStop(0.6, `rgba(80,0,180,${fp * 0.6})`);
    sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(sr, 1), 0, Math.PI * 2);
    ctx.fill();
    if (peakPulse > 0.3) {
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(sr * 1.3, 1), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${peakPulse * 0.8})`;
      ctx.lineWidth = peakPulse * 8;
      ctx.stroke();
    }
  }

  // ── Phase 3: EXPLOSION OUTWARD (0.52–1.0) ────────────────
  if (p >= 0.52) {
    const fp = (p - 0.52) / 0.48;
    const eq = easeOutQuad(fp);

    // screen flash
    const flashA = Math.max(0, 0.92 - fp * fp * 3.5);
    if (flashA > 0) {
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.85);
      fg.addColorStop(0, `rgba(255,230,255,${flashA})`);
      fg.addColorStop(0.18, `rgba(180,0,255,${flashA * 0.75})`);
      fg.addColorStop(0.5, `rgba(60,0,120,${flashA * 0.35})`);
      fg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(0, 0, W, H);
    }

    // expanding rings
    for (let r = 0; r < 4; r++) {
      const rr = eq * W * (0.45 + r * 0.13);
      const ra = Math.max(0, 0.8 - fp * (1.1 + r * 0.18));
      if (ra <= 0) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${270 + r * 18},95%,${65 + r * 5}%,${ra})`;
      ctx.lineWidth = Math.max(0.5, 7 * (1 - fp) * (1 - r * 0.2));
      ctx.stroke();
    }

    // dark void
    const voidR = lerp(55, 22, fp);
    const vg2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, voidR);
    vg2.addColorStop(0, `rgba(0,0,0,${0.95 * (1 - fp * 0.6)})`);
    vg2.addColorStop(0.7, `rgba(15,0,35,${0.6 * (1 - fp)})`);
    vg2.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = vg2;
    ctx.beginPath();
    ctx.arc(cx, cy, voidR, 0, Math.PI * 2);
    ctx.fill();

    // particles flying out
    particles.forEach((pt) => {
      const ang = Math.atan2(pt.oy - cy, pt.ox - cx);
      const dist = eq * 160 * pt.speed;
      pt.x = cx + Math.cos(ang) * dist;
      pt.y = cy + Math.sin(ang) * dist;
      const alpha = Math.max(0, 1 - fp * 1.6);
      if (alpha <= 0) return;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * dist * 0.7, cy + Math.sin(ang) * dist * 0.7);
      ctx.lineTo(pt.x, pt.y);
      ctx.strokeStyle = `hsla(${pt.hue},85%,75%,${alpha * 0.5})`;
      ctx.lineWidth = pt.size * 0.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (1 - fp * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${pt.hue},90%,80%,${alpha})`;
      ctx.fill();
    });

    // residual purple glow
    const glowA = Math.max(0, 0.5 - fp * 0.6);
    if (glowA > 0) {
      const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.55);
      gg.addColorStop(0, `rgba(120,0,255,${glowA})`);
      gg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

// ── Main component ────────────────────────────────────────────
export function IKImplosionVoid({ active, onDone }: IKImplosionVoidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const ptRef     = useRef<Particle[]>([]);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const [active2, setActive2] = useState(false);
  const [shake, setShake] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) {
      setActive2(false);
      cancelAnimationFrame(rafRef.current);
      return;
    }
    setActive2(true);
  }, [active]);

  // useLayoutEffect fires AFTER DOM paint → offsetWidth is valid
  useLayoutEffect(() => {
    if (!active2) {
      setShake({ x: 0, y: 0 });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // fallback: use window size if offsetWidth is still 0
    const W = canvas.offsetWidth  || window.innerWidth;
    const H = canvas.offsetHeight || window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ptRef.current = buildParticles(W / 2, H / 2);
    const startTime = performance.now();

    // ── shake schedule (triggered at singularity + explosion) ──
    // ms → [shakeX, shakeY] offsets in px
    const shakeKeyframes: Array<[number, number, number]> = [
      // [timeMs, x, y]
      [TOTAL_MS * 0.42,  -10,  -6],
      [TOTAL_MS * 0.44,   12,   8],
      [TOTAL_MS * 0.46,  -14,  -5],
      [TOTAL_MS * 0.48,   10,   9],
      [TOTAL_MS * 0.50,  -8,   -4],
      [TOTAL_MS * 0.52,   18,  10],  // big hit at explosion
      [TOTAL_MS * 0.54,  -20,  -12],
      [TOTAL_MS * 0.56,   16,   8],
      [TOTAL_MS * 0.58,  -12,  -6],
      [TOTAL_MS * 0.60,   8,    4],
      [TOTAL_MS * 0.62,  -6,   -3],
      [TOTAL_MS * 0.65,   4,    2],
      [TOTAL_MS * 0.70,   0,    0],  // settle
    ];
    const shakeTimers: ReturnType<typeof setTimeout>[] = [];
    for (const [ms, x, y] of shakeKeyframes) {
      shakeTimers.push(setTimeout(() => setShake({ x, y }), ms));
    }

    function loop(now: number) {
      const progress = Math.min((now - startTime) / TOTAL_MS, 1);
      renderFrame(ctx!, W, H, progress, ptRef.current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        setTimeout(() => {
          setActive2(false);
          setShake({ x: 0, y: 0 });
          onDoneRef.current();
        }, 80);
      }
    }

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      shakeTimers.forEach(clearTimeout);
      setShake({ x: 0, y: 0 });
    };
  }, [active2]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 5000,
        pointerEvents: "none",
        background: active2 ? "rgba(3,0,10,0.88)" : "transparent",
        visibility: active2 ? "visible" : "hidden",
        // screen shake via transform on the whole overlay
        transform: `translate(${shake.x}px, ${shake.y}px)`,
        transition: "transform 0.04s linear",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%", display: "block" }}
      />
    </div>
  );
}