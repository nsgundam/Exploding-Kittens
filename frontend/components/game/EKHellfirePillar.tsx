"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// ─────────────────────────────────────────────────────────────
// EKHellfirePillar — Hellfire pillar explosion for EK
//
// Phase 1  0–35%  : ground glow builds + pillar shoots up
// Phase 2 30–70%  : full pillar + ember shower
// Phase 3 65–100% : pillar fades + smoke
//
// Screen shake fires at peak (35–65%)
// onDone() → caller applies bomb phase
// ─────────────────────────────────────────────────────────────

interface EKHellfirePillarProps {
  active: boolean;
  onDone: () => void;
}

const TOTAL_MS = 1500;

function rnd(a: number, b: number) { return a + Math.random() * (b - a); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function easeOutQuad(t: number) { return 1 - (1 - t) * (1 - t); }
function easeInQuad(t: number) { return t * t; }

interface Ember {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number; hue: number;
}

function buildEmbers(cx: number, H: number): Ember[] {
  const out: Ember[] = [];
  for (let i = 0; i < 55; i++) {
    out.push({
      x: cx + rnd(-25, 25),
      y: H,
      vx: rnd(-2.8, 2.8),
      vy: rnd(-5.5, -11),
      life: 1,
      maxLife: rnd(0.6, 1),
      size: rnd(1.5, 4.5),
      hue: rnd(10, 48),
    });
  }
  return out;
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  progress: number,
  embers: Ember[],
  dt: number,
) {
  const cx = W / 2;
  const p = progress;

  // trail fade — faster fade for more intensity
  ctx.fillStyle = "rgba(5,1,10,0.28)";
  ctx.fillRect(0, 0, W, H);

  // ── GROUND GLOW ──────────────────────────────────────────
  const glowIntensity = Math.min(p / 0.3, 1) * (1 - Math.max(0, (p - 0.75) / 0.25));
  if (glowIntensity > 0) {
    const gg = ctx.createRadialGradient(cx, H, 0, cx, H, W * 0.55);
    gg.addColorStop(0, `rgba(255,${Math.floor(140 + p * 80)},0,${0.65 * glowIntensity})`);
    gg.addColorStop(0.4, `rgba(200,40,0,${0.35 * glowIntensity})`);
    gg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, W, H);
  }

  // ── FIRE PILLAR ───────────────────────────────────────────
  if (p < 0.85) {
    const riseFp = Math.min(p / 0.35, 1);
    const fadeFp = p > 0.65 ? (p - 0.65) / 0.2 : 0;
    const pillarH = easeOutQuad(riseFp) * H * 1.08;
    const pillarAlpha = 1 - easeInQuad(fadeFp);

    for (let layer = 0; layer < 4; layer++) {
      const noise = Math.sin(p * 18 + layer * 1.4) * (8 + layer * 3) * riseFp;
      const baseW = lerp(8, 55 + layer * 12, riseFp * riseFp);

      const pg = ctx.createLinearGradient(cx, H, cx, H - pillarH);
      if (layer === 0) {
        pg.addColorStop(0, `rgba(255,255,210,${0.95 * pillarAlpha})`);
        pg.addColorStop(0.12, `rgba(255,170,0,${0.9 * pillarAlpha})`);
        pg.addColorStop(0.45, `rgba(230,55,0,${0.65 * pillarAlpha})`);
        pg.addColorStop(0.8, `rgba(120,15,0,${0.3 * pillarAlpha})`);
        pg.addColorStop(1, "rgba(0,0,0,0)");
      } else if (layer === 1) {
        pg.addColorStop(0, `rgba(255,210,60,${0.6 * pillarAlpha})`);
        pg.addColorStop(0.35, `rgba(200,60,0,${0.35 * pillarAlpha})`);
        pg.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        pg.addColorStop(0, `rgba(255,140,0,${(0.25 - layer * 0.04) * pillarAlpha})`);
        pg.addColorStop(0.5, `rgba(150,30,0,${0.1 * pillarAlpha})`);
        pg.addColorStop(1, "rgba(0,0,0,0)");
      }

      const halfW = baseW * (1 + layer * 0.55) + Math.abs(noise) * 0.4;
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.moveTo(cx - halfW, H);
      ctx.quadraticCurveTo(
        cx + noise * 0.6, H - pillarH * 0.55,
        cx - halfW * 0.28 + noise * 0.35, H - pillarH,
      );
      ctx.lineTo(cx + halfW * 0.28 + noise * 0.35, H - pillarH);
      ctx.quadraticCurveTo(
        cx + noise * 0.6, H - pillarH * 0.55,
        cx + halfW, H,
      );
      ctx.closePath();
      ctx.fill();
    }

    // inner white core
    if (riseFp > 0.15 && fadeFp < 0.8) {
      const coreH = pillarH * 0.35;
      const cg = ctx.createLinearGradient(cx, H, cx, H - coreH);
      cg.addColorStop(0, `rgba(255,255,255,${0.75 * pillarAlpha * (1 - fadeFp)})`);
      cg.addColorStop(0.6, `rgba(255,230,180,${0.3 * pillarAlpha * (1 - fadeFp)})`);
      cg.addColorStop(1, "rgba(0,0,0,0)");
      const coreW = lerp(4, 18, riseFp);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(cx - coreW, H);
      ctx.lineTo(cx - coreW * 0.3, H - coreH);
      ctx.lineTo(cx + coreW * 0.3, H - coreH);
      ctx.lineTo(cx + coreW, H);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── EMBERS ────────────────────────────────────────────────
  if (p > 0.08) {
    const spawnRate = Math.max(0, 1 - (p - 0.08) / 0.7);
    embers.forEach((e) => {
      // update
      e.x += e.vx * dt * 60;
      e.y += e.vy * dt * 60;
      e.vy += 0.12 * dt * 60; // gravity
      e.life -= 0.012 * dt * 60 * (1 + (1 - spawnRate));

      // respawn
      if (e.life <= 0) {
        if (p < 0.6) {
          e.x = cx + rnd(-30, 30);
          e.y = H - rnd(0, pillarHForEmbers(p, H) * 0.35);
          e.vx = rnd(-2.8, 2.8);
          e.vy = rnd(-5.5, -11);
          e.life = e.maxLife;
          e.size = rnd(1.5, 4.5);
        }
        return;
      }

      const alpha = Math.min(e.life, 1) * 0.9;
      // ember dot
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * e.life, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${e.hue},100%,${55 + e.life * 25}%,${alpha})`;
      ctx.fill();

      // glow
      const gg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size * 3.5);
      gg.addColorStop(0, `hsla(${e.hue},100%,70%,${alpha * 0.4})`);
      gg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // ── SMOKE ─────────────────────────────────────────────────
  if (p > 0.3) {
    const sp = (p - 0.3) / 0.7;
    for (let i = 0; i < 6; i++) {
      const sw = lerp(12, 70, sp) * (0.75 + i * 0.08);
      const sy = H * (0.45 - i * 0.07) - sp * H * 0.28;
      const smokeAlpha = 0.12 * sp * (1 - i * 0.14) * (1 - Math.max(0, (p - 0.8) / 0.2));
      if (smokeAlpha <= 0) continue;
      const sg = ctx.createRadialGradient(cx, sy, 0, cx, sy, sw);
      sg.addColorStop(0, `rgba(25,15,10,${smokeAlpha})`);
      sg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.arc(cx + Math.sin(p * 4 + i) * 14 * sp, sy, sw, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function pillarHForEmbers(p: number, H: number): number {
  return easeOutQuad(Math.min(p / 0.35, 1)) * H * 1.08;
}

// ── Main component ────────────────────────────────────────────
export function EKHellfirePillar({ active, onDone }: EKHellfirePillarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const embersRef = useRef<Ember[]>([]);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const [active2, setActive2] = useState(false);
  const [shake, setShake] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!active) { setActive2(false); cancelAnimationFrame(rafRef.current); return; }
    setActive2(true);
  }, [active]);

  useLayoutEffect(() => {
    if (!active2) { setShake({ x: 0, y: 0 }); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.offsetWidth || window.innerWidth;
    const H = canvas.offsetHeight || window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    embersRef.current = buildEmbers(W / 2, H);
    const startTime = performance.now();
    let lastTime = startTime;

    // ── shake schedule ──
    const shakeFrames: Array<[number, number, number]> = [
      [TOTAL_MS * 0.33,  -8,  -5],
      [TOTAL_MS * 0.36,  12,   7],
      [TOTAL_MS * 0.39, -14,  -8],
      [TOTAL_MS * 0.42,  16,  10],
      [TOTAL_MS * 0.45, -12,  -7],
      [TOTAL_MS * 0.48,  18,  11],  // peak
      [TOTAL_MS * 0.51, -16,  -9],
      [TOTAL_MS * 0.54,  10,   6],
      [TOTAL_MS * 0.57,  -8,  -5],
      [TOTAL_MS * 0.60,   5,   3],
      [TOTAL_MS * 0.64,   0,   0],  // settle
    ];
    const shakeTimers = shakeFrames.map(([ms, x, y]) =>
      setTimeout(() => setShake({ x, y }), ms)
    );

    function loop(now: number) {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const progress = Math.min((now - startTime) / TOTAL_MS, 1);
      renderFrame(ctx!, W, H, progress, embersRef.current, dt);
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
        background: active2 ? "rgba(4,1,8,0.90)" : "transparent",
        visibility: active2 ? "visible" : "hidden",
        transform: `translate(${shake.x}px, ${shake.y}px)`,
        transition: "transform 0.04s linear",
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}