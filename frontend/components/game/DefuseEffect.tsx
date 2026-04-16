"use client";

import React, { useEffect, useRef, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────
export interface DefuseEffectState {
  defuserDisplayName: string;
}

interface DefuseEffectProps {
  state: DefuseEffectState | null;
  onComplete: () => void;
}

// ── Constants ──────────────────────────────────────────────────────────────
const TOTAL_MS = 2600;
const ARM_PX   = 10; // half-arm length of each + cross

// ── Cross positions along all 4 edges ──
// [edgeXFrac, edgeYFrac, offsetXpx, offsetYpx]
const CROSS_DEFS: [number, number, number, number][] = [
  // top edge — 3 crosses
  [0.22, 0, 0, 18],
  [0.50, 0, 0, 18],
  [0.78, 0, 0, 18],
  // bottom edge — 3 crosses
  [0.22, 1, 0, -18],
  [0.50, 1, 0, -18],
  [0.78, 1, 0, -18],
  // left edge — 3 crosses
  [0, 0.28, 18, 0],
  [0, 0.50, 18, 0],
  [0, 0.72, 18, 0],
  // right edge — 3 crosses
  [1, 0.28, -18, 0],
  [1, 0.50, -18, 0],
  [1, 0.72, -18, 0],
];

// ── Math helpers ───────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function easeOut3(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeOut5(t: number) { return 1 - Math.pow(1 - t, 5); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rnd(a: number, b: number) { return a + Math.random() * (b - a); }

// ── Particle ───────────────────────────────────────────────────────────────
interface Particle { x: number; y: number; vx: number; vy: number; life: number; age: number; size: number; col: string; }

// ── Component ──────────────────────────────────────────────────────────────
export function DefuseEffect({ state, onComplete }: DefuseEffectProps) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const vCanvasRef    = useRef<HTMLCanvasElement>(null);  // vignette
  const pCanvasRef    = useRef<HTMLCanvasElement>(null);  // particles
  const scanlineRef   = useRef<HTMLDivElement>(null);
  const crossesRef    = useRef<{ h: HTMLDivElement; v: HTMLDivElement; wrap: HTMLDivElement }[]>([]);
  const edgeRefs      = useRef<HTMLDivElement[]>([]);
  const cornerRefs    = useRef<SVGSVGElement[]>([]);

  const rafRef        = useRef<number>(0);
  const startRef      = useRef<number>(0);
  const particlesRef  = useRef<Particle[]>([]);
  const pSpawnedRef   = useRef(false);
  const completedRef  = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const stopAnim = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
  }, []);

  // build canvas sizes
  const resize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const W = el.offsetWidth || window.innerWidth;
    const H = el.offsetHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    [vCanvasRef, pCanvasRef].forEach(ref => {
      const c = ref.current; if (!c) return;
      c.width = W * dpr; c.height = H * dpr;
      c.style.width = W + 'px'; c.style.height = H + 'px';
    });
    // position crosses
    crossesRef.current.forEach((cr, i) => {
      const [ex, ey, ox, oy] = CROSS_DEFS[i];
      const cx = ex * W + ox;
      const cy = ey * H + oy;
      cr.wrap.style.left = cx + 'px';
      cr.wrap.style.top  = cy + 'px';
    });
  }, []);

  // vignette draw
  const drawVignette = useCallback((alpha: number) => {
    const c = vCanvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const W = c.width / (window.devicePixelRatio || 1);
    const H = c.height / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, c.width, c.height);
    if (alpha <= 0) return;
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.14, W / 2, H / 2, H * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, `rgba(4,28,12,${alpha * 0.26})`);
    g.addColorStop(1, `rgba(0,68,24,${alpha * 0.70})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  // particle draw
  const drawParticles = useCallback(() => {
    const c = pCanvasRef.current; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    particlesRef.current.forEach(p => {
      p.age += 0.016; p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.vx *= 0.97;
      const a = Math.max(0, 1 - p.age / p.life);
      if (a <= 0) return;
      ctx.beginPath();
      ctx.arc(p.x * (window.devicePixelRatio || 1), p.y * (window.devicePixelRatio || 1),
        p.size * a * (window.devicePixelRatio || 1), 0, Math.PI * 2);
      ctx.fillStyle = p.col; ctx.globalAlpha = a * 0.88; ctx.fill(); ctx.globalAlpha = 1;
    });
    particlesRef.current = particlesRef.current.filter(p => p.age < p.life);
  }, []);

  const spawnParticles = useCallback(() => {
    const el = containerRef.current; if (!el) return;
    const W = el.offsetWidth, H = el.offsetHeight;
    CROSS_DEFS.forEach(([ex, ey, ox, oy]) => {
      const cx = ex * W + ox, cy = ey * H + oy;
      for (let i = 0; i < 6; i++) {
        const a = rnd(0, Math.PI * 2), sp = rnd(1.2, 4);
        particlesRef.current.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          col: Math.random() < 0.6 ? '#4ade80' : Math.random() < 0.5 ? '#86efac' : '#bbf7d0',
          size: 1.2 + Math.random() * 2.5, life: 0.4 + Math.random() * 0.7, age: 0,
        });
      }
    });
  }, []);

  useEffect(() => {
    if (!state) return;

    // wait one frame so DOM is mounted
    const initTimer = setTimeout(() => {
      resize();

      completedRef.current = false;
      particlesRef.current = [];
      pSpawnedRef.current = false;
      startRef.current = performance.now();

      const safetyTimer = setTimeout(() => {
        stopAnim();
        if (!completedRef.current) { completedRef.current = true; onCompleteRef.current(); }
      }, TOTAL_MS + 300);

      function frame(now: number) {
        const t = clamp((now - startRef.current) / TOTAL_MS, 0, 1);

        // ── vignette ─────────────────────────────────────────────
        const vA = t < 0.12 ? easeOut3(t / 0.12)
          : t > 0.80 ? (1 - (t - 0.80) / 0.20) : 1;
        drawVignette(vA);

        // ── edge strips ───────────────────────────────────────────
        const eA = t < 0.10 ? easeOut3(t / 0.10) : t > 0.82 ? (1 - (t - 0.82) / 0.18) : 1;
        edgeRefs.current.forEach(e => { e.style.opacity = String(eA); });

        // ── corner brackets ───────────────────────────────────────
        const cA = t < 0.12 ? easeOut3(t / 0.12) : t > 0.83 ? (1 - (t - 0.83) / 0.17) : 1;
        const cSlide = t < 0.12 ? lerp(18, 0, easeOut3(t / 0.12)) : 0;
        const transforms = [
          `translate(${-cSlide}px,${-cSlide}px)`,
          `scaleX(-1) translate(${-cSlide}px,${-cSlide}px)`,
          `scaleY(-1) translate(${-cSlide}px,${-cSlide}px)`,
          `scale(-1) translate(${-cSlide}px,${-cSlide}px)`,
        ];
        cornerRefs.current.forEach((c, i) => {
          c.style.opacity = String(cA);
          c.style.transform = transforms[i];
        });

        // ── scanline sweep ────────────────────────────────────────
        const sl = scanlineRef.current;
        const el = containerRef.current;
        if (sl && el) {
          if (t >= 0.08 && t < 0.46) {
            const st = (t - 0.08) / 0.38;
            sl.style.opacity = String((1 - Math.abs(st - 0.5) * 2.2) * 0.85);
            sl.style.top = (st * el.offsetHeight) + 'px';
          } else { sl.style.opacity = '0'; }
        }

        // ── crosses — staggered grow + glow pulse ─────────────────
        const crossFade = t > 0.80 ? 1 - (t - 0.80) / 0.20 : 1;
        crossesRef.current.forEach(({ h, v, wrap }, i) => {
          const delay = 0.12 + i * 0.022;
          const ct = clamp((t - delay) / 0.20, 0, 1);
          wrap.style.opacity = String(ct * crossFade);
          const arm = Math.round(easeOut5(ct) * ARM_PX);
          h.style.width  = (arm * 2) + 'px'; h.style.marginLeft = (-arm) + 'px';
          v.style.height = (arm * 2) + 'px'; v.style.marginTop  = (-arm) + 'px';
          const pulse = Math.sin(t * 18 + i * 0.8) * 0.35 + 0.65;
          const glow = `0 0 ${6 * pulse}px rgba(74,222,128,.95)`;
          h.style.boxShadow = glow; v.style.boxShadow = glow;
        });

        // ── particles at peak ─────────────────────────────────────
        if (t >= 0.32 && !pSpawnedRef.current) { pSpawnedRef.current = true; spawnParticles(); }
        drawParticles();

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
    }, 30);

    return () => { clearTimeout(initTimer); stopAnim(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 4700,
        pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      {/* vignette canvas */}
      <canvas ref={vCanvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* particle canvas */}
      <canvas ref={pCanvasRef} style={{ position: 'absolute', inset: 0 }} />

      {/* scanline */}
      <div
        ref={scanlineRef}
        style={{
          position: 'absolute', left: 0, right: 0, height: '2px', top: 0,
          background: 'linear-gradient(90deg,transparent,rgba(74,222,128,.65),transparent)',
          opacity: 0, zIndex: 5,
        }}
      />

      {/* edge strips */}
      {(['top','bottom','left','right'] as const).map((side, i) => (
        <div
          key={side}
          ref={el => { if (el) edgeRefs.current[i] = el; }}
          style={{
            position: 'absolute', opacity: 0, zIndex: 4,
            ...(side === 'top'    && { top: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent 4%,#4ade80 50%,transparent 96%)' }),
            ...(side === 'bottom' && { bottom: 0, left: 0, right: 0, height: '2px', background: 'linear-gradient(90deg,transparent 4%,#4ade80 50%,transparent 96%)' }),
            ...(side === 'left'   && { top: 0, bottom: 0, left: 0, width: '2px', background: 'linear-gradient(180deg,transparent 4%,#4ade80 50%,transparent 96%)' }),
            ...(side === 'right'  && { top: 0, bottom: 0, right: 0, width: '2px', background: 'linear-gradient(180deg,transparent 4%,#4ade80 50%,transparent 96%)' }),
          }}
        />
      ))}

      {/* corner brackets */}
      {([
        { cls: 'tl', transform: undefined },
        { cls: 'tr', transform: 'scaleX(-1)' },
        { cls: 'bl', transform: 'scaleY(-1)' },
        { cls: 'br', transform: 'scale(-1)' },
      ] as const).map(({ cls, transform }, i) => (
        <svg
          key={cls}
          ref={el => { if (el) cornerRefs.current[i] = el; }}
          viewBox="0 0 52 52"
          fill="none"
          style={{
            position: 'absolute', width: '52px', height: '52px', opacity: 0, zIndex: 6,
            ...(cls === 'tl' && { top: 0, left: 0 }),
            ...(cls === 'tr' && { top: 0, right: 0, transform: transform as string }),
            ...(cls === 'bl' && { bottom: 0, left: 0, transform: transform as string }),
            ...(cls === 'br' && { bottom: 0, right: 0, transform: transform as string }),
          }}
        >
          <path d="M3 24 L3 3 L24 3" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="3" cy="3" r="1.8" fill="#4ade80" />
        </svg>
      ))}

      {/* + crosses along edges */}
      {CROSS_DEFS.map(([, , ,], i) => (
        <div
          key={i}
          ref={el => {
            if (!el || crossesRef.current[i]) return;
            const h = el.querySelector<HTMLDivElement>('.df-cross-h')!;
            const v = el.querySelector<HTMLDivElement>('.df-cross-v')!;
            crossesRef.current[i] = { h, v, wrap: el };
          }}
          style={{
            position: 'absolute', zIndex: 7, opacity: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 0, height: 0,
            // positioned by resize()
          }}
        >
          <div className="df-cross-h" style={{
            position: 'absolute', height: '3px', width: 0,
            background: '#4ade80', borderRadius: '1px',
          }} />
          <div className="df-cross-v" style={{
            position: 'absolute', width: '3px', height: 0,
            background: '#4ade80', borderRadius: '1px',
          }} />
        </div>
      ))}
    </div>
  );
}